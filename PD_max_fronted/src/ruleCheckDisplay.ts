import type {
  RuleChecksData,
  RuleChecksPixelOverlap,
  RuleChecksTimestamp,
  SuggestedRoi,
} from './api/detect'

/** 规则检测语义块（部分后端响应含 semantic，detect 类型未单独导出） */
export type RuleChecksSemantic = {
  passed?: boolean
  alert?: boolean
  hard_tamper?: boolean
  message?: string
  reasons?: string[]
  anomalies?: string[]
  risk?: number
  [key: string]: unknown
}

export type RuleCheckFindingStatus = 'ok' | 'warn' | 'bad'

export type RuleCheckUserFinding = {
  status: RuleCheckFindingStatus
  title: string
  resultLabel: string
  resultText: string
  text: string
  explanation: string
  details?: { label: string; value: string }[]
}

export type RuleCheckTimeFact = {
  label: string
  value: string
}

export type RuleCheckUserView = {
  summary: string
  findings: RuleCheckUserFinding[]
  timeFacts: RuleCheckTimeFact[]
  /** 不传 bbox 时后端返回的建议检测区域 */
  suggestedRois: SuggestedRoi[] | null
  /** 像素重叠检测结果是否来自手动框选 */
  pixelOverlapSource: 'manual_bbox' | null
  /** 高压缩图片可能误报的提示 */
  highCompressionNote?: string
}

type RuleBlock =
  | (RuleChecksPixelOverlap & Record<string, unknown>)
  | (RuleChecksTimestamp & Record<string, unknown>)
  | (RuleChecksSemantic & Record<string, unknown>)

function joinUnique(parts: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const t = p.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out.join('；')
}

function readBlockLabel(block: Record<string, unknown> | null | undefined): string {
  if (!block) return ''
  for (const key of ['title', 'label', 'name'] as const) {
    const v = block[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function readBlockText(
  block: {
    message?: string
    reasons?: string[]
    anomalies?: string[]
  } | null | undefined,
): string {
  if (!block) return ''
  return joinUnique([
    ...(block.reasons ?? []),
    ...(block.message ? [block.message] : []),
    ...(block.anomalies ?? []).map(String),
  ])
}

function readBlockStatus(
  block: {
    passed?: boolean
    alert?: boolean
    hard_tamper?: boolean
  } | null | undefined,
): RuleCheckFindingStatus {
  if (!block) return 'ok'
  if (block.hard_tamper === true || block.passed === false) return 'bad'
  if (block.alert === true) return 'warn'
  return 'ok'
}

function resultLabel(status: RuleCheckFindingStatus): string {
  if (status === 'ok') return '结果正常'
  if (status === 'warn') return '需要复核'
  return '发现问题'
}

function defaultResultText(title: string, status: RuleCheckFindingStatus): string {
  if (title === '拼接/贴图痕迹') {
    if (status === 'ok') return '未发现明显拼接、贴图或重复粘贴痕迹。'
    if (status === 'warn') return '检测到疑似拼接或贴图迹象，建议人工放大查看。'
    return '检测到明显拼接、贴图或重复粘贴痕迹，这张图存在问题。'
  }
  if (title === '时间与单据核对') {
    if (status === 'ok') return '图片中的时间信息和交易/单据信息基本一致。'
    if (status === 'warn') return '时间信息存在疑点，建议核对交易截图和单据原件。'
    return '图片时间和交易或单据信息不一致，这张图存在问题。'
  }
  if (title === '金额、排版与图片信息') {
    if (status === 'ok') return '金额、排版和图片信息没有发现明显异常。'
    if (status === 'warn') return '金额、排版或图片信息有可疑点，建议人工复核。'
    return '金额、排版或图片信息存在明显异常，这张图存在问题。'
  }
  if (status === 'ok') return '该规则未发现明显异常。'
  if (status === 'warn') return '该规则发现可疑点，建议人工复核。'
  return '该规则发现明显问题。'
}

function readableMessage(title: string, status: RuleCheckFindingStatus, rawText: string): string {
  const raw = rawText.trim()
  if (!raw || raw === '—') return defaultResultText(title, status)

  const lower = raw.toLowerCase()
  if (lower.includes('status_transaction_time_mismatch')) {
    return '图片状态栏时间和交易时间对不上，可能不是同一次截图或图片被处理过。'
  }
  if (lower.includes('business') && lower.includes('mismatch')) {
    return '交易时间和业务单据时间对不上，需要核对原始单据。'
  }
  if (lower.includes('pixel') || lower.includes('overlap') || lower.includes('splice')) {
    return status === 'ok'
      ? '没有看到明显复制粘贴或拼接痕迹。'
      : '系统在局部区域看到了类似复制粘贴、拼接或重复覆盖的痕迹。'
  }
  if (lower.includes('exif')) {
    return status === 'ok'
      ? '图片保存信息未发现明显异常。'
      : '图片保存信息缺失或不一致，不能单独证明有问题，但需要结合图片内容复核。'
  }

  if (status === 'ok') return defaultResultText(title, status)
  return `${defaultResultText(title, status)}系统原始提示：${raw}`
}

function explanationFor(title: string): string {
  if (title === '拼接/贴图痕迹') {
    return '这一项会看图片里有没有复制粘贴、局部覆盖、边缘不自然、噪点不一致等痕迹。简单说，就是判断图片有没有被局部改过。'
  }
  if (title === '时间与单据核对') {
    return '这一项会对比图片状态栏时间、交易时间、单据时间和图片保存信息。只要这些时间互相对不上，就需要人工复核。'
  }
  if (title === '金额、排版与图片信息') {
    return '这一项会看金额、文字排版、脱敏区域和图片保存信息是否符合常见截图规律。它主要帮助发现内容被改写或拼接的风险。'
  }
  return '这一项是辅助规则，只用于提示风险，最终仍建议结合原图和业务记录人工确认。'
}

function pushPercentDetail(details: { label: string; value: string }[], label: string, value: unknown) {
  const n = Number(value)
  if (Number.isFinite(n)) details.push({ label, value: `${(n * 100).toFixed(1)}%` })
}

function buildPixelDetails(block: RuleChecksPixelOverlap & Record<string, unknown>) {
  const details: { label: string; value: string }[] = []
  pushPercentDetail(details, '像素重叠分数', block.pixel_overlap_score)
  if (block.overlap_metrics && typeof block.overlap_metrics === 'object') {
    const metrics = block.overlap_metrics as Record<string, unknown>
    pushPercentDetail(details, '结构相似度', metrics.structural_score)
    pushPercentDetail(details, '颜色混合痕迹', metrics.blend_score)
    pushPercentDetail(details, '重复边缘比例', metrics.double_edge_ratio)
    pushPercentDetail(details, '异常渐变比例', metrics.long_gradient_ratio)
    pushPercentDetail(details, '压缩痕迹差异', metrics.ela_score)
    pushPercentDetail(details, '噪点不一致程度', metrics.noise_inconsistency_score)
    pushPercentDetail(details, '文字拼接痕迹', metrics.text_splice_score)
  }
  if (Array.isArray(block.auto_scan_regions) && block.auto_scan_regions.length > 0) {
    details.push({ label: '扫描区域数', value: String(block.auto_scan_regions.length) })
  }
  return details
}

function buildTimestampDetails(block: RuleChecksTimestamp & Record<string, unknown>) {
  const details: { label: string; value: string }[] = []
  pushPercentDetail(details, '风险程度', block.risk)
  if (block.transaction_time) details.push({ label: '交易时间', value: String(block.transaction_time) })
  if (block.business_mismatch === true) details.push({ label: '时间是否不一致', value: '是' })
  if (block.timestamp_check && typeof block.timestamp_check === 'object') {
    const tc = block.timestamp_check as Record<string, unknown>
    if (typeof tc.status_bar_time === 'string' && tc.status_bar_time.trim()) {
      details.push({ label: '状态栏时间', value: tc.status_bar_time.trim() })
    }
    if (typeof tc.business_document_time === 'string' && tc.business_document_time.trim()) {
      details.push({ label: '业务单据时间', value: tc.business_document_time.trim() })
    }
    if (tc.has_exif === false) details.push({ label: '图片保存信息', value: '无' })
  }
  return details
}

function buildSemanticDetails(block: RuleChecksSemantic & Record<string, unknown>) {
  const details: { label: string; value: string }[] = []
  pushPercentDetail(details, '风险程度', block.risk)
  if (Array.isArray(block.anomalies) && block.anomalies.length > 0) {
    details.push({ label: '异常类型', value: block.anomalies.map(String).join('、') })
  }
  return details
}

function buildFinding(
  title: string,
  block: RuleBlock,
  details: { label: string; value: string }[],
): RuleCheckUserFinding {
  const status = readBlockStatus(block)
  const rawText = readBlockText(block)
  return {
    status,
    title,
    resultLabel: resultLabel(status),
    resultText: defaultResultText(title, status),
    text: readableMessage(title, status, rawText),
    explanation: explanationFor(title),
    details: details.length > 0 ? details : undefined,
  }
}

export function makeFinding(
  block:
    | (RuleChecksPixelOverlap & Record<string, unknown>)
    | (RuleChecksTimestamp & Record<string, unknown>)
    | null
    | undefined,
): RuleCheckUserFinding | null {
  if (!block) return null
  const text = readBlockText(block)
  if (!text && block.passed == null && block.hard_tamper == null && block.alert == null) return null
  const title = readBlockLabel(block) || '规则检测项'
  const details: { label: string; value: string }[] = []
  if ('pixel_overlap_score' in block) {
    details.push(...buildPixelDetails(block as RuleChecksPixelOverlap & Record<string, unknown>))
  } else if ('timestamp_check' in block || 'business_mismatch' in block) {
    details.push(...buildTimestampDetails(block as RuleChecksTimestamp & Record<string, unknown>))
  }
  return buildFinding(title, block, details)
}

export function ruleCheckVerdict(data: RuleChecksData | null | undefined): {
  label: string
  pillClass: string
} {
  if (!data) return { label: '—', pillClass: '' }
  if (data.available === false) return { label: '暂无', pillClass: '' }
  const st = data.status?.trim()
  if (st) return { label: st, pillClass: st }
  const semantic = (data as RuleChecksData & { semantic?: RuleChecksSemantic | null }).semantic
  const blocks = [data.pixel_overlap, data.timestamp, semantic].filter(Boolean) as RuleBlock[]
  if (blocks.some((block) => readBlockStatus(block) === 'bad')) return { label: '有问题', pillClass: '篡改' }
  if (blocks.some((block) => readBlockStatus(block) === 'warn')) return { label: '需复核', pillClass: '可疑' }
  if (blocks.length > 0) return { label: '正常', pillClass: '正常' }
  return { label: '—', pillClass: '' }
}

function buildSummary(data: RuleChecksData, findings: RuleCheckUserFinding[]): string {
  if (data.reason?.trim()) {
    const bad = findings.filter((item) => item.status === 'bad').map((item) => item.title)
    const warn = findings.filter((item) => item.status === 'warn').map((item) => item.title)
    if (bad.length > 0) return `规则检测结论：这张图片存在问题，主要风险在${bad.join('、')}。`
    if (warn.length > 0) return `规则检测结论：这张图片有可疑点，建议重点复核${warn.join('、')}。`
    return '规则检测结论：未发现明显问题，图片通过规则审核。'
  }
  if (findings.length === 0) return '规则检测结论：暂无可展示的规则检测数据。'
  if (findings.some((item) => item.status === 'bad')) {
    return `规则检测结论：这张图片存在问题，主要风险在${findings.filter((item) => item.status === 'bad').map((item) => item.title).join('、')}。`
  }
  if (findings.some((item) => item.status === 'warn')) {
    return `规则检测结论：这张图片有可疑点，建议重点复核${findings.filter((item) => item.status === 'warn').map((item) => item.title).join('、')}。`
  }
  return '规则检测结论：未发现明显问题，图片通过规则审核。'
}

export function buildRuleCheckUserView(
  data: RuleChecksData | null | undefined,
): RuleCheckUserView | null {
  if (!data) return null
  if (data.available === false) {
    return {
      summary: data.reason?.trim() || '规则检测未执行或结果不可用',
      findings: [],
      timeFacts: [],
      suggestedRois: null,
      pixelOverlapSource: null,
    }
  }

  const findings: RuleCheckUserFinding[] = []

  if (data.pixel_overlap) {
    const block = data.pixel_overlap as RuleChecksPixelOverlap & Record<string, unknown>
    findings.push(buildFinding('拼接/贴图痕迹', block, buildPixelDetails(block)))
  }

  if (data.timestamp) {
    const block = data.timestamp as RuleChecksTimestamp & Record<string, unknown>
    findings.push(buildFinding('时间与单据核对', block, buildTimestampDetails(block)))
  }

  const dataWithSemantic = data as RuleChecksData & { semantic?: RuleChecksSemantic | null }
  if (dataWithSemantic.semantic) {
    const block = dataWithSemantic.semantic as RuleChecksSemantic & Record<string, unknown>
    findings.push(buildFinding('金额、排版与图片信息', block, buildSemanticDetails(block)))
  }

  const highCompressionNote = data.pixel_overlap
    ? (data.pixel_overlap as Record<string, unknown>).high_compression === true
      ? '该图片压缩率较高，像素检测结果可能误报，请结合其他维度综合判断'
      : undefined
    : undefined

  return {
    summary: buildSummary(data, findings),
    findings,
    timeFacts: [],
    suggestedRois: data.suggested_rois ?? null,
    pixelOverlapSource: data.pixel_overlap_source ?? null,
    highCompressionNote,
  }
}
