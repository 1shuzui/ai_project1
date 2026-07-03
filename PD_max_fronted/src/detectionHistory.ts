import {
  parseLinkedRuleChecksField,
  type DetectionHistoryApiRecord,
  type FeedbackJudgment,
  type RuleChecksData,
  type V3ResultItem,
} from './api/detect'

export type HistoryPayload = {
  result?: V3ResultItem | null
  multi?: V3ResultItem[]
  error_msg?: string | null
}

export type DetectionHistoryEntry = {
  id: string
  savedAt: string
  taskId: string
  fileName: string
  imageUrl: string
  /** 图片创建时间（取自文件 lastModified），格式 "YYYY-MM-DD HH:MM:SS" */
  imageCreatedAt?: string | null
  /** 批次号，格式 YYYYMMDD+序号（如 202601021） */
  batch?: string | null
  payload: HistoryPayload
  status: 'COMPLETED' | 'FAILED'
  mode?: string
  /** 规则检测（辅助核查）结果，可与 AI 检测同 task 关联 */
  ruleCheck?: RuleChecksData | null
  /** 标注状态：correct / wrong / suspicious / null（未标注） */
  feedbackStatus?: FeedbackJudgment | null
}

export function historyEntryHasAi(entry: DetectionHistoryEntry): boolean {
  return !!(entry.payload.result || entry.payload.multi?.length)
}

export function historyEntryHasRule(entry: DetectionHistoryEntry): boolean {
  return !!entry.ruleCheck
}

export function historyEntryKindLabel(entry: DetectionHistoryEntry): string {
  const ai = historyEntryHasAi(entry)
  const rule = historyEntryHasRule(entry)
  if (ai && rule) return 'AI+规则'
  if (ai) return 'AI'
  if (rule) return '规则'
  return ''
}

const RULE_HISTORY_MODES = new Set([
  'rule_checks',
  'rule_pixel_overlap',
  'rule_timestamp',
])

/** 同一次检测里，规则记录与 AI 记录的最大时间差（毫秒） */
const PAIR_MAX_MS = 30_000

/** 仅按时间邻近兜底配对时的更严格窗口 */
const PAIR_FALLBACK_MAX_MS = 10_000

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isRuleHistoryMode(mode: string | undefined): boolean {
  return RULE_HISTORY_MODES.has(String(mode ?? '').trim().toLowerCase())
}

/** 侧边栏仅展示 AI 主检测记录，规则记录合并到对应条目 */
export function isPrimaryHistoryMode(mode: string | undefined): boolean {
  return !isRuleHistoryMode(mode)
}

function isAsyncV3HistoryMode(mode: string | undefined): boolean {
  return String(mode ?? '').trim().toLowerCase() === 'async_v3'
}

/** 已有同 task_id 的 async_v3 时，不单独展示附属 rule_checks 行 */
export function shouldShowHistoryItem(
  entry: DetectionHistoryEntry,
  all: DetectionHistoryEntry[],
): boolean {
  if (!isRuleHistoryMode(entry.mode)) return true
  if (!isValidTaskId(entry.taskId)) return true
  return !all.some(
    (x) => isAsyncV3HistoryMode(x.mode) && isValidTaskId(x.taskId) && x.taskId === entry.taskId,
  )
}

function parseHistoryTime(iso: string): number {
  const t = Date.parse(String(iso ?? '').replace(' ', 'T'))
  return Number.isFinite(t) ? t : 0
}

/** 排除 null / 占位符 "string" 等无效 task_id */
function isValidTaskId(taskId: string | undefined | null): boolean {
  const s = String(taskId ?? '').trim()
  if (!s || s === 'string' || s === 'null' || s === 'undefined') return false
  return true
}

function withinPairWindow(aiTime: number, ruleTime: number, maxMs = PAIR_MAX_MS): boolean {
  if (!aiTime || !ruleTime) return false
  return Math.abs(aiTime - ruleTime) <= maxMs
}

/** 从 rule_* 模式的历史 outcome 解析 */
export function ruleChecksFromHistoryRecord(r: DetectionHistoryApiRecord): RuleChecksData | null {
  const mode = String(r.mode ?? '').trim().toLowerCase()
  const oc = r.outcome
  if (!isRecord(oc)) return null

  if (mode === 'rule_checks') {
    return parseLinkedRuleChecksField(oc)
  }

  const nested = isRecord(oc.rule_checks) ? parseLinkedRuleChecksField(oc.rule_checks) : null
  if (nested) return nested

  return parseLinkedRuleChecksField(oc)
}

export function mapApiRecordToEntry(r: DetectionHistoryApiRecord): DetectionHistoryEntry {
  const oc = r.outcome ?? {}
  const payload: HistoryPayload = {
    result: oc.result ?? null,
    multi: oc.multi_results,
    error_msg: oc.error_msg ?? null,
  }
  const name = r.original_filename?.trim()
  const ruleFromLinked =
    parseLinkedRuleChecksField(r.linked_rule_checks) ??
    (isRecord(oc) ? parseLinkedRuleChecksField(oc.linked_rule_checks) : null)
  const ruleFromRecord = isRuleHistoryMode(r.mode) ? ruleChecksFromHistoryRecord(r) : null

  return {
    id: String(r.id),
    savedAt: r.created_at,
    taskId: (r.task_id ?? '').trim(),
    fileName: name || '未命名图片',
    imageUrl: (r.image_url ?? '').trim(),
    imageCreatedAt: r.image_created_at ?? null,
    batch: r.batch ?? null,
    payload,
    status: r.status?.toUpperCase() === 'FAILED' ? 'FAILED' : 'COMPLETED',
    mode: r.mode,
    ruleCheck: ruleFromLinked ?? ruleFromRecord ?? null,
    feedbackStatus: r.feedback_status ?? null,
  }
}

type RuleRow = {
  entry: DetectionHistoryEntry
  used: boolean
}

/** 将同页 rule_checks 合并到 async_v3 / sync_v1 条目 */
export function mergeHistoryEntriesForDisplay(
  items: DetectionHistoryApiRecord[],
): DetectionHistoryEntry[] {
  const all = items.map(mapApiRecordToEntry)
  const ruleRows: RuleRow[] = []
  const ruleByTask = new Map<string, RuleChecksData>()

  for (const e of all) {
    if (!isRuleHistoryMode(e.mode) || !e.ruleCheck) continue
    ruleRows.push({ entry: e, used: false })
    if (isValidTaskId(e.taskId)) {
      ruleByTask.set(e.taskId, e.ruleCheck)
    }
  }

  const primary = all.filter((e) => isPrimaryHistoryMode(e.mode))

  for (const ai of primary) {
    if (ai.ruleCheck) continue

    const aiTime = parseHistoryTime(ai.savedAt)
    const aiListIdx = all.findIndex((x) => x.id === ai.id)
    let picked: RuleRow | undefined

    // 1) task_id 精确匹配
    if (isValidTaskId(ai.taskId) && ruleByTask.has(ai.taskId)) {
      ai.ruleCheck = ruleByTask.get(ai.taskId)!
      picked = ruleRows.find(
        (r) => !r.used && isValidTaskId(r.entry.taskId) && r.entry.taskId === ai.taskId,
      )
      if (picked) picked.used = true
      continue
    }

    // 2) id 相邻（rule.id === ai.id - 1）且时间接近
    if (!picked) {
      const aiIdNum = Number(ai.id)
      if (Number.isFinite(aiIdNum)) {
        picked = ruleRows.find(
          (r) =>
            !r.used &&
            Number(r.entry.id) === aiIdNum - 1 &&
            withinPairWindow(aiTime, parseHistoryTime(r.entry.savedAt)),
        )
      }
    }

    // 3) 列表中紧后一条 rule_checks 且时间接近（API 倒序时 rule 常在 v3 后一条）
    if (!picked && aiListIdx >= 0) {
      const next = all[aiListIdx + 1]
      if (next && isRuleHistoryMode(next.mode)) {
        picked = ruleRows.find((r) => !r.used && r.entry.id === next.id)
        if (
          picked &&
          !withinPairWindow(aiTime, parseHistoryTime(picked.entry.savedAt))
        ) {
          picked = undefined
        }
      }
    }

    // 4) 时间最近的一条未占用 rule（严格 10 秒内兜底）
    if (!picked) {
      let bestMs = Infinity
      for (const row of ruleRows) {
        if (row.used || !row.entry.ruleCheck) continue
        const ruleTime = parseHistoryTime(row.entry.savedAt)
        if (!withinPairWindow(aiTime, ruleTime, PAIR_FALLBACK_MAX_MS)) continue
        const diff = Math.abs(aiTime - ruleTime)
        if (diff < bestMs) {
          bestMs = diff
          picked = row
        }
      }
    }

    if (picked?.entry.ruleCheck) {
      ai.ruleCheck = picked.entry.ruleCheck
      picked.used = true
    }
  }

  const usedRuleIds = new Set(
    ruleRows.filter((r) => r.used).map((r) => r.entry.id),
  )
  const out: DetectionHistoryEntry[] = []
  for (const e of all) {
    if (isRuleHistoryMode(e.mode)) {
      if (!usedRuleIds.has(e.id)) out.push(e)
      continue
    }
    if (isPrimaryHistoryMode(e.mode)) out.push(e)
  }
  return out.filter((e) => shouldShowHistoryItem(e, out))
}
