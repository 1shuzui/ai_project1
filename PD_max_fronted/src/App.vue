<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRaw, watch } from 'vue'
import {
  deleteDetectionHistory,
  downloadHistoryExportZip,
  deleteFeedbackEntry,
  deleteTrainingDatasetEntry,
  deleteV3Task,
  fetchDetectionHistory,
  fetchHistoryExportPreview,
  fetchFeedbackEntries,
  fetchHealth,
  fetchModels,
  fetchTrainingDatasetAnnotation,
  fetchTrainingDatasetEntries,
  getV3Result,
  getVisualizationBlob,
  isRetryableDetectionError,
  pollV3UntilComplete,
  reloadModels,
  submitFeedback,
  submitRuleChecks,
  submitRuleChecksFromTask,
  submitV1ImageDetectSync,
  submitV3Detect,
  submitV3DetectTask,
  submitV3Upload,
  triggerTraining,
  updateFeedbackEntry,
  updateTrainingDatasetEntry,
  type BboxXYXY,
  type FeedbackEntry,
  type FeedbackJudgment,
  type HealthStatus,
  type HistoryExportDetectionResult,
  type HistoryExportFeedbackFilter,
  type HistoryExportImageVariant,
  type HistoryExportPreviewResult,
  type HistoryExportRequest,
  type RuleChecksData,
  type SuggestedRoi,
  type TrainingDatasetEntry,
  type TrainingDatasetFilter,
  type TrainingDatasetLabel,
  type TrainingDatasetSummary,
  type V3ResultItem,
} from './api/detect'
import {
  historyEntryHasAi,
  historyEntryHasRule,
  historyEntryKindLabel,
  mergeHistoryEntriesForDisplay,
  type DetectionHistoryEntry,
} from './detectionHistory'
import {
  buildExtendedDisplayLines,
  hasExtendedDetectionFields,
} from './detectionExtendedDisplay'
import {
  buildRuleCheckUserView,
  ruleCheckVerdict,
} from './ruleCheckDisplay'
const files = ref<File[]>([])
const filePreviews = ref<string[]>([])
const selectedUploadIndex = ref(0)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const historyPreviewUrl = ref<string | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const imageNatural = ref({ w: 0, h: 0 })
/** 当前选中文件的图片创建时间（从 lastModified 格式化） */
const selectedFileImageCreatedAt = computed(() => {
  const idx = selectedUploadIndex.value
  if (idx < 0 || idx >= files.value.length) return ''
  return formatImageCreatedAt(files.value[idx]!)
})

const v3SpecifyBbox = ref(false)
/** 单据时间（可选）：付款截图等场景供后端时间校验 */
const documentTime = ref('')

/** 可多选：默认只启用 AI 检测，规则检测按需勾选 */
const useModelDetection = ref(true)
const useRuleDetection = ref(false)

const drawing = ref(false)
const drawStart = ref<{ x: number; y: number } | null>(null)
const drawCurrent = ref<{ x: number; y: number } | null>(null)
const userBbox = ref<BboxXYXY | null>(null)

const busy = ref(false)
const pollStatus = ref('')
const errorMsg = ref<string | null>(null)
/** 批次号：根据历史记录当天最大序号+1 生成；同批多张图共享 */
const currentBatch = ref<string | null>(null)

/** 当前检测任务的标注状态（correct / wrong / suspicious / null） */
const currentTaskFeedbackStatus = ref<FeedbackJudgment | null>(null)

const v3TaskId = ref<string | null>(null)
type V3ViewPayload = {
  result?: V3ResultItem | null
  multi?: V3ResultItem[]
  error_msg?: string | null
}
const v3Payload = ref<V3ViewPayload | null>(null)

type BatchItemState =
  | 'pending'
  | 'submitting'
  | 'uploaded'
  | 'polling'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'canceled'

type BatchItem = {
  file: File
  fileName: string
  attempt: number
  taskId: string | null
  payload: V3ViewPayload | RuleChecksData | null
  error: string | null
  elapsedMs: number | null
  state: BatchItemState
  nextRetryAt: number
}

type BatchRunResult = {
  taskId?: string | null
  payload?: V3ViewPayload | RuleChecksData | null
  elapsedMs?: number | null
}

type BatchRunSummary = {
  total: number
  success: number
  failed: BatchItem[]
  retryCount: number
  lastTaskId: string | null
  lastPayload: V3ViewPayload | RuleChecksData | null
  lastElapsedMs: number | null
  items: BatchItem[]
}

const BATCH_MAX_ATTEMPTS = 3
const BATCH_RETRY_BACKOFF_MS = [2000, 5000, 10000] as const
const BATCH_HISTORY_REFRESH_EVERY = 5
const BATCH_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000
const V3_TASK_POLL_MAX_DURATION_MS = 20 * 60 * 1000
const MAX_BATCH_IMAGE_COUNT = 50
const batchItems = ref<BatchItem[]>([])

const ruleCheckPayload = ref<RuleChecksData | null>(null)
const ruleCheckLoading = ref(false)
const ruleCheckError = ref<string | null>(null)
const ruleCheckElapsed = ref<number | null>(null)
const aiElapsed = ref<number | null>(null)
/** 不传 bbox 时后端返回的建议检测区域 */
const suggestedRois = ref<SuggestedRoi[] | null>(null)
/** 用户在 suggested_rois 列表中勾选的索引数组 */
const selectedRoiIndices = ref<number[]>([])
/** 是否正在对选中的 ROI 执行二次检测 */
const roiDetectBusy = ref(false)

const ruleCheckVerdictInfo = computed(() => ruleCheckVerdict(ruleCheckPayload.value))
const ruleCheckUserView = computed(() => buildRuleCheckUserView(ruleCheckPayload.value))

const hasAiReport = computed(() => {
  const p = v3Payload.value
  return !!(p?.result || p?.multi?.length)
})

const aiReportResult = computed(() => v3Payload.value?.result ?? null)

const hasReportContent = computed(
  () =>
    hasAiReport.value ||
    !!ruleCheckPayload.value ||
    ruleCheckLoading.value ||
    !!ruleCheckError.value,
)

/** 报告区底部展示的图片（标注图优先，其次历史原图/当前上传图） */
const reportImageUrl = computed(() => {
  if (vizObjectUrl.value) return null
  if (viewingHistoryId.value && historyPreviewUrl.value) return historyPreviewUrl.value
  if (!viewingHistoryId.value && activePreviewUrl.value && hasReportContent.value) {
    return activePreviewUrl.value
  }
  return null
})

const reportImageHeading = computed(() => {
  if (vizObjectUrl.value) return '标注示意图'
  if (viewingHistoryId.value && hasAiReport.value) return '检测原图'
  return '检测图片'
})

const vizObjectUrl = ref<string | null>(null)
const vizLoading = ref(false)
const historyEntries = ref<DetectionHistoryEntry[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)
const historyTotal = ref(0)
/** 当前列表页码（从 1 起，每页仅展示本页 9 条） */
const historyPage = ref(1)

// 健康检查与模型管理
const health = ref<HealthStatus | null>(null)
const healthError = ref<string | null>(null)
const modelInfo = ref<string>('加载中...')
const feedbackSubmitting = ref<Record<string, boolean>>({})
const HISTORY_PAGE_SIZE = 9

const historyTotalPages = computed(() =>
  historyTotal.value <= 0 ? 0 : Math.ceil(historyTotal.value / HISTORY_PAGE_SIZE),
)

const historyCanPrev = computed(() => historyPage.value > 1)

const historyCanNext = computed(
  () =>
    historyTotalPages.value > 0 && historyPage.value < historyTotalPages.value,
)

type AppView = 'detect' | 'manage'
type ManageTab = 'feedback' | 'dataset' | 'history' | 'export'
type FeedbackFilter = FeedbackJudgment | 'all'

const appView = ref<AppView>('detect')
const manageTab = ref<ManageTab>('feedback')
const feedbackFilter = ref<FeedbackFilter>('all')
const feedbackEntries = ref<FeedbackEntry[]>([])
const feedbackLoading = ref(false)
const feedbackError = ref<string | null>(null)
const feedbackTotal = ref(0)
const selectedFeedbackFolder = ref<string | null>(null)
const feedbackActionBusy = ref<Record<string, boolean>>({})
/** 反馈日期筛选：起止日期 */
const feedbackDateFrom = ref('')
const feedbackDateTo = ref('')
const datasetFilter = ref<TrainingDatasetFilter>('all')
const datasetIncludeEnhanced = ref(true)
const datasetEntries = ref<TrainingDatasetEntry[]>([])
const datasetLoading = ref(false)
const datasetError = ref<string | null>(null)
const datasetSummary = ref<TrainingDatasetSummary | null>(null)
const selectedDatasetFilename = ref<string | null>(null)
const datasetAnnotation = ref<unknown>(null)
const datasetAnnotationLoading = ref(false)
const datasetAnnotationError = ref<string | null>(null)
const datasetActionBusy = ref<Record<string, boolean>>({})
const managedHistoryRows = ref<DetectionHistoryEntry[]>([])
const managedHistoryLoading = ref(false)
const managedHistoryError = ref<string | null>(null)
const managedHistoryTotal = ref(0)
const selectedManagedHistoryId = ref<string | null>(null)
const managedHistoryActionBusy = ref<Record<string, boolean>>({})

const exportDateFrom = ref('')
const exportDateTo = ref('')
/** 批次序号筛选（可选），仅填数字，日期取自上方检测时间起始日期 */
const exportBatchSeq = ref('')
const exportDetectionResults = ref<HistoryExportDetectionResult[]>([])
const exportImageVariant = ref<HistoryExportImageVariant>('original')
const exportPreviewLoading = ref(false)
const exportPreviewError = ref<string | null>(null)
const exportPreview = ref<HistoryExportPreviewResult | null>(null)
const exportZipBusy = ref(false)
/** 最近一次 ZIP 下载的服务端统计（响应头） */
const exportDownloadHint = ref<string | null>(null)


const viewingHistoryId = ref<string | null>(null)
/** 当前正在查看的历史记录条目（点击历史列表时直接存入，不从数组查找） */
const currentViewingEntry = ref<DetectionHistoryEntry | null>(null)
const viewingHistoryEntry = computed(() => {
  if (!viewingHistoryId.value) return currentViewingEntry.value
  return (
    currentViewingEntry.value ??
    historyEntries.value.find((e) => e.id === viewingHistoryId.value) ??
    managedHistoryRows.value.find((e) => e.id === viewingHistoryId.value) ??
    null
  )
})
/** viewingHistoryId 清空时同步清掉缓存的条目 */
watch(viewingHistoryId, (id) => {
  if (!id) currentViewingEntry.value = null
})

/** 同步检测进行中时用于取消 fetch */
const detectAbort = ref<AbortController | null>(null)

const activePreviewUrl = computed(
  () => filePreviews.value[selectedUploadIndex.value] || null,
)

const selectedFeedback = computed(() =>
  feedbackEntries.value.find((x) => x.folder_name === selectedFeedbackFolder.value) ??
  feedbackEntries.value[0] ??
  null,
)

/** 按日期范围筛选反馈条目（本地过滤，后端未提供日期范围参数时兜底） */
const filteredFeedbackEntries = computed(() => {
  let items = feedbackEntries.value
  if (feedbackDateFrom.value) {
    items = items.filter((e) => {
      const d = feedbackFilterDate(e)
      return d && d >= feedbackDateFrom.value
    })
  }
  if (feedbackDateTo.value) {
    items = items.filter((e) => {
      const d = feedbackFilterDate(e)
      return d && d <= feedbackDateTo.value + ' 23:59:59'
    })
  }
  return items
})

/** 从字符串中提取 YYYY-MM-DD 格式的日期 */
function extractDateStr(s: string | undefined): string | null {
  if (!s) return null
  // 优先匹配 YYYY-MM-DD
  const m1 = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`
  // 再尝试 YYYYMMDD 格式（如 20260602）
  const m2 = s.match(/(\d{4})(\d{2})(\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return null
}

/** 获取条目用于日期筛选的日期字符串（优先 feedback_marked_at，兜底 timestamp/updated_at） */
function feedbackFilterDate(entry: FeedbackEntry): string | null {
  const raw = entry.feedback_marked_at
  if (raw) return raw.slice(0, 10)
  // 兜底：从 timestamp 或 updated_at 中提取日期
  return extractDateStr(entry.timestamp || entry.updated_at)
}

/** 清除日期筛选 */
function clearFeedbackDateFilter() {
  feedbackDateFrom.value = ''
  feedbackDateTo.value = ''
}

/** 初始化反馈日期筛选默认值：今天往前推 30 天 */
function initFeedbackDateDefault() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  feedbackDateFrom.value = start.toISOString().slice(0, 10)
  feedbackDateTo.value = now.toISOString().slice(0, 10)
}

const selectedManagedHistory = computed(() =>
  managedHistoryRows.value.find((x) => x.id === selectedManagedHistoryId.value) ??
  managedHistoryRows.value[0] ??
  null,
)

const selectedDatasetEntry = computed(() =>
  datasetEntries.value.find((x) => x.filename === selectedDatasetFilename.value) ??
  datasetEntries.value[0] ??
  null,
)

function revokeUploadPreviews() {
  for (const u of filePreviews.value) {
    if (u) URL.revokeObjectURL(u)
  }
  filePreviews.value = []
}

function addFiles(next: File[]) {
  if (!next.length) return
  const validNext = next.filter((f) => /^image\//.test(f.type))
  if (!validNext.length) return
  const remaining = MAX_BATCH_IMAGE_COUNT - files.value.length
  if (remaining <= 0) {
    errorMsg.value = `最多支持上传 ${MAX_BATCH_IMAGE_COUNT} 张图片，请先移除部分图片再继续。`
    return
  }
  const accepted = validNext.slice(0, remaining)
  if (!accepted.length) {
    errorMsg.value = `最多支持上传 ${MAX_BATCH_IMAGE_COUNT} 张图片，请先移除部分图片再继续。`
    return
  }
  const rejectedCount = validNext.length - accepted.length
  resetResults()
  userBbox.value = null
  imageNatural.value = { w: 0, h: 0 }
  const before = files.value.length
  files.value = [...files.value, ...accepted]
  filePreviews.value = [...filePreviews.value, ...accepted.map((f) => URL.createObjectURL(f))]
  // 默认切到刚新增的第一张，方便连续多次上传后立即预览新图
  selectedUploadIndex.value = before
  if (rejectedCount > 0) {
    errorMsg.value = `最多支持上传 ${MAX_BATCH_IMAGE_COUNT} 张图片，已忽略超出的 ${rejectedCount} 张。`
  }
}

function removePickedFile(index: number) {
  if (index < 0 || index >= files.value.length) return
  const url = filePreviews.value[index]
  if (url) URL.revokeObjectURL(url)
  files.value = files.value.filter((_, i) => i !== index)
  filePreviews.value = filePreviews.value.filter((_, i) => i !== index)
  if (!files.value.length) {
    selectedUploadIndex.value = 0
    imageNatural.value = { w: 0, h: 0 }
    if (!viewingHistoryId.value) {
      v3Payload.value = null
      v3TaskId.value = null
      if (vizObjectUrl.value) {
        URL.revokeObjectURL(vizObjectUrl.value)
        vizObjectUrl.value = null
      }
    }
    return
  }
  if (selectedUploadIndex.value > index) {
    selectedUploadIndex.value -= 1
  } else if (selectedUploadIndex.value >= files.value.length) {
    selectedUploadIndex.value = files.value.length - 1
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter((f) => /^image\//.test(f.type))
  input.value = ''
  addFiles(files)
}

function triggerUploadPick() {
  uploadInputRef.value?.click()
}

function resetRuleCheck() {
  ruleCheckPayload.value = null
  ruleCheckError.value = null
  ruleCheckLoading.value = false
  ruleCheckElapsed.value = null
  aiElapsed.value = null
  suggestedRois.value = null
  selectedRoiIndices.value = []
  roiDetectBusy.value = false
}

function resetResults() {
  errorMsg.value = null
  viewingHistoryId.value = null
  historyPreviewUrl.value = null
  v3Payload.value = null
  resetRuleCheck()
  detectAbort.value?.abort()
  detectAbort.value = null
  vizLoading.value = false
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  v3TaskId.value = null
  currentTaskFeedbackStatus.value = null
}

async function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function withTimeoutSignal<T>(
  parentSignal: AbortSignal,
  timeoutMs: number,
  timeoutMessage: string,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (parentSignal.aborted) throw new DOMException('Aborted', 'AbortError')
  const ac = new AbortController()
  const onAbort = () => ac.abort()
  const timer = window.setTimeout(() => ac.abort(), timeoutMs)
  parentSignal.addEventListener('abort', onAbort, { once: true })
  try {
    return await run(ac.signal)
  } catch (e) {
    if (ac.signal.aborted && !parentSignal.aborted) {
      throw new Error(timeoutMessage)
    }
    throw e
  } finally {
    window.clearTimeout(timer)
    parentSignal.removeEventListener('abort', onAbort)
  }
}

function retryDelayMs(attempt: number): number {
  return BATCH_RETRY_BACKOFF_MS[Math.min(Math.max(attempt - 1, 0), BATCH_RETRY_BACKOFF_MS.length - 1)]!
}

function formatBatchProgress(
  label: string,
  total: number,
  success: number,
  failed: number,
  retryCount: number,
  current?: BatchItem,
): string {
  const done = success + failed
  const base = `${label} ${done}/${total}：成功 ${success}，最终失败 ${failed}，重试 ${retryCount}`
  if (!current) return base
  return `${base}；当前 ${current.fileName}（第 ${current.attempt}/${BATCH_MAX_ATTEMPTS} 次）`
}

function formatBatchFailureSummary(failed: BatchItem[]): string | null {
  if (!failed.length) return null
  const head = `以下文件最终失败（${failed.length}）：`
  const rows = failed
    .slice(0, 8)
    .map((item) => `${item.fileName}: ${item.error || '检测失败'}`)
  return `${head}\n${rows.join('\n')}${failed.length > 8 ? '\n…' : ''}`
}

function markUnfinishedBatchItemsCanceled(items: BatchItem[]): void {
  for (const item of items) {
    if (item.state !== 'completed' && item.state !== 'failed') {
      item.state = 'canceled'
    }
  }
}

async function maybeRefreshHistory(completedCount: number, force = false): Promise<void> {
  if (!force && completedCount % BATCH_HISTORY_REFRESH_EVERY !== 0) return
  try {
    await refreshHistoryList()
  } catch {
    // 历史刷新失败不应中断批量检测主流程。
  }
}

function createBatchItems(filesToRun: File[]): BatchItem[] {
  return filesToRun.map((file) => ({
    file,
    fileName: file.name || '未命名图片',
    attempt: 0,
    taskId: null,
    payload: null,
    error: null,
    elapsedMs: null,
    state: 'pending',
    nextRetryAt: 0,
  }))
}

async function deleteBatchItemTasks(items: BatchItem[]): Promise<void> {
  const taskIds = new Set<string>()
  for (const item of items) {
    const taskId = item.taskId?.trim()
    if (taskId) taskIds.add(taskId)
  }
  await Promise.all([...taskIds].map((taskId) => deleteV3Task(taskId).catch(() => undefined)))
}

async function runStableBatchItems(
  items: BatchItem[],
  label: string,
  signal: AbortSignal,
  executeOne: (item: BatchItem, prefix: string) => Promise<BatchRunResult>,
  opts?: {
    refreshHistory?: boolean
    deleteTaskOnRetry?: boolean
  },
): Promise<BatchRunSummary> {
  batchItems.value = items
  const total = items.length
  const refreshHistory = opts?.refreshHistory ?? true
  const deleteTaskOnRetry = opts?.deleteTaskOnRetry ?? true

  const queue = items.map((_, index) => index)
  let success = 0
  let finalFailed = 0
  let retryCount = 0
  let lastTaskId: string | null = null
  let lastPayload: V3ViewPayload | RuleChecksData | null = null
  let lastElapsedMs: number | null = null

  while (queue.length > 0) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const index = queue.shift()!
    const item = items[index]!
    if (item.state === 'completed' || item.state === 'failed' || item.state === 'canceled') {
      continue
    }

    const waitForRetry = item.nextRetryAt - Date.now()
    if (waitForRetry > 0) {
      pollStatus.value = `${label}：${item.fileName} 等待重试 ${Math.ceil(waitForRetry / 1000)} 秒`
      await waitMs(waitForRetry, signal)
    }

    item.attempt += 1
    item.state = 'submitting'
    item.error = null
    pollStatus.value = formatBatchProgress(label, total, success, finalFailed, retryCount, item)

    try {
      const prefix = `${label} ${success + finalFailed + 1}/${total}`
      const startedAt = performance.now()
      const result = await executeOne(item, prefix)
      item.state = 'completed'
      item.taskId = result.taskId ?? item.taskId
      item.payload = result.payload ?? item.payload
      item.elapsedMs = result.elapsedMs ?? Math.round(performance.now() - startedAt)
      success += 1
      lastTaskId = item.taskId || lastTaskId
      lastPayload = item.payload ?? lastPayload
      lastElapsedMs = item.elapsedMs
      pollStatus.value = formatBatchProgress(label, total, success, finalFailed, retryCount)
      if (refreshHistory) await maybeRefreshHistory(success + finalFailed)
    } catch (e) {
      if (isAbortError(e)) {
        markUnfinishedBatchItemsCanceled(items)
        throw e
      }

      item.error = errorText(e)
      const canRetry = item.attempt < BATCH_MAX_ATTEMPTS && isRetryableDetectionError(e)
      if (canRetry) {
        if (deleteTaskOnRetry && item.taskId) {
          void deleteV3Task(item.taskId).catch(() => undefined)
        }
        item.state = 'retrying'
        retryCount += 1
        const delay = retryDelayMs(item.attempt)
        item.nextRetryAt = Date.now() + delay
        pollStatus.value = `${label}：${item.fileName} 失败，将在 ${Math.ceil(delay / 1000)} 秒后第 ${item.attempt + 1} 次重试`
        queue.push(index)
        continue
      }

      item.state = 'failed'
      finalFailed += 1
      pollStatus.value = formatBatchProgress(label, total, success, finalFailed, retryCount)
      if (refreshHistory) await maybeRefreshHistory(success + finalFailed)
    }
  }

  if (refreshHistory) await maybeRefreshHistory(success + finalFailed, true)
  return {
    total,
    success,
    failed: items.filter((item) => item.state === 'failed'),
    retryCount,
    lastTaskId,
    lastPayload,
    lastElapsedMs,
    items,
  }
}

function resetUploadedItemsForDetection(items: BatchItem[]): void {
  for (const item of items) {
    if (item.state !== 'completed') continue
    item.state = 'uploaded'
    item.attempt = 0
    item.error = null
    item.nextRetryAt = 0
    item.payload = null
    item.elapsedMs = null
  }
}

async function uploadBatchFiles(
  filesToUpload: File[],
  label: string,
  signal: AbortSignal,
): Promise<BatchRunSummary> {
  pollStatus.value = `${label}：上传阶段 0/${filesToUpload.length}`
  const summary = await runStableBatchItems(
    createBatchItems(filesToUpload),
    `${label}上传`,
    signal,
    async (item) => {
      const t0 = performance.now()
      const submit = await withTimeoutSignal(
        signal,
        BATCH_UPLOAD_TIMEOUT_MS,
        `${item.fileName} 上传超时`,
        (childSignal) => submitV3Upload(
          item.file,
          detectSubmitOpts(childSignal, false, formatImageCreatedAt(item.file)),
        ),
      )
      item.taskId = submit.task_id
      if (submit.batch && !currentBatch.value) currentBatch.value = submit.batch
      return { taskId: submit.task_id, elapsedMs: Math.round(performance.now() - t0) }
    },
    { refreshHistory: false, deleteTaskOnRetry: true },
  )

  if (summary.failed.length > 0) {
    await deleteBatchItemTasks(summary.items)
    return summary
  }

  resetUploadedItemsForDetection(summary.items)
  pollStatus.value = `${label}：上传完成 ${summary.success}/${summary.total}，开始检测`
  return summary
}

function isDetectionMockMode(): boolean {
  return String(import.meta.env.VITE_USE_MOCK ?? '').trim() === '1'
}

async function checkHealth() {
  if (isDetectionMockMode()) {
    health.value = { status: 'mock', font_lib_ready: true, font_lib_size: 0, global_model_loaded: true, ocr_available: true }
    healthError.value = null
    return
  }
  try {
    health.value = await fetchHealth()
    healthError.value = null
  } catch (e) {
    healthError.value = (e as Error).message || '健康检查失败'
    health.value = null
  }
}

/** 将文件的 lastModified 格式化为 "YYYY-MM-DD HH:MM:SS" */
function formatImageCreatedAt(file: File): string {
  try {
    const ts = file.lastModified
    console.log('[image_created_at] file:', file.name, 'lastModified:', ts, '→', new Date(ts).toISOString())
    const d = new Date(ts)
    if (isNaN(d.getTime())) {
      console.warn('[image_created_at] INVALID lastModified for:', file.name)
      return ''
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    const result = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    console.log('[image_created_at] formatted:', result)
    return result
  } catch {
    return ''
  }
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectSubmitOpts(signal: AbortSignal, withRuleChecks = false, imageCreatedAt?: string | null) {
  const t = documentTime.value.trim()
  const finalImageCreatedAt = imageCreatedAt || null
  console.log('[detectSubmitOpts] image_created_at input:', JSON.stringify(imageCreatedAt), '→ output:', JSON.stringify(finalImageCreatedAt))
  return {
    signal,
    document_time: t || null,
    with_rule_checks: withRuleChecks,
    image_created_at: finalImageCreatedAt,
    batch: currentBatch.value || null,
  }
}

function emptyLinkedRuleChecks(reason?: string): RuleChecksData {
  return reason?.trim() ? { available: false, reason: reason.trim() } : { available: false }
}

function applyLinkedRuleChecksFromPoll(
  linked: RuleChecksData | null | undefined,
  expected = true,
) {
  if (linked != null) {
    ruleCheckPayload.value = linked
    if (linked.suggested_rois && linked.suggested_rois.length > 0) {
      suggestedRois.value = linked.suggested_rois
      // 优先默认选中 priority 1-4；若全部为低优先级(5-6)则全选
      const highPrio = linked.suggested_rois
        .map((roi, i) => (roi.priority <= 4 ? i : -1))
        .filter((i) => i >= 0)
      selectedRoiIndices.value = highPrio.length > 0
        ? highPrio
        : linked.suggested_rois.map((_, i) => i)
    }
  } else if (expected) {
    ruleCheckPayload.value = emptyLinkedRuleChecks()
  } else {
    ruleCheckPayload.value = null
  }
  ruleCheckError.value = null
  ruleCheckLoading.value = false
  ruleCheckElapsed.value = null
  aiElapsed.value = null
}

function v3PayloadFromPoll(data: Awaited<ReturnType<typeof getV3Result>>): V3ViewPayload {
  return {
    result: data.result ?? null,
    multi: data.multi_results,
    error_msg: data.error_msg ?? null,
  }
}

async function loadModelInfo() {
  if (isDetectionMockMode()) {
    modelInfo.value = '演示模式'
    return
  }
  try {
    const data = await fetchModels()
    const vCount = Array.isArray(data.versions) ? data.versions.length : 0
    const cur = data.current_model?.split('/').pop() || 'N/A'
    modelInfo.value = `版本数: ${vCount} | 当前: ${cur}`
  } catch {
    modelInfo.value = '无法获取模型信息'
  }
}

async function handleReload() {
  if (isDetectionMockMode()) return
  try {
    await reloadModels()
    modelInfo.value = '模型已重载'
    await checkHealth()
    await loadModelInfo()
  } catch (e) {
    errorMsg.value = '模型重载失败: ' + (e as Error).message
  }
}

async function handleTraining() {
  if (isDetectionMockMode()) return
  if (!confirm('训练将重新训练模型，可能影响正在进行的检测任务。确认继续？')) return
  try {
    const res = await triggerTraining(true)
    if (res.status === 'completed') {
      alert('训练完成')
    } else if (res.status === 'failed') {
      alert('训练失败: ' + (res.warning || ''))
    } else {
      alert('训练状态: ' + res.status)
    }
    await loadModelInfo()
  } catch (e) {
    errorMsg.value = '训练触发失败: ' + (e as Error).message
  }
}

async function handleFeedback(taskId: string, resultIndex: number, judgment: FeedbackJudgment) {
  if (isDetectionMockMode()) return
  const key = `${taskId}-${resultIndex}`
  feedbackSubmitting.value[key] = true
  try {
    await submitFeedback(taskId, judgment, null, `result_index:${resultIndex}`)
    currentTaskFeedbackStatus.value = judgment
    await goHistoryPage(historyPage.value)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('HTTP 409')) {
      errorMsg.value = '该任务已标注，不可重复标注。如需修改请在数据管理中操作或先删除原标注。'
    } else {
      errorMsg.value = '反馈提交失败: ' + msg
    }
  } finally {
    feedbackSubmitting.value[key] = false
  }
}

function judgmentText(judgment: string | undefined): string {
  if (judgment === 'correct') return '正确'
  if (judgment === 'wrong') return '错误'
  if (judgment === 'suspicious') return '疑似'
  return '—'
}

function feedbackResultText(entry: FeedbackEntry | null | undefined): string {
  const r = entry?.engine_result
  if (r && typeof r === 'object' && 'result' in r) {
    const label = String((r as { result?: unknown }).result ?? '').trim()
    return label || '—'
  }
  return '—'
}

function feedbackConfidenceText(entry: FeedbackEntry | null | undefined): string {
  const r = entry?.engine_result
  if (r && typeof r === 'object' && 'confidence' in r) {
    const n = Number((r as { confidence?: unknown }).confidence)
    if (Number.isFinite(n)) return `${(n * 100).toFixed(1)}%`
  }
  return '—'
}

function feedbackReason(entry: FeedbackEntry | null | undefined): string {
  const r = entry?.engine_result
  if (r && typeof r === 'object' && 'reason' in r) {
    return String((r as { reason?: unknown }).reason ?? '').trim() || '—'
  }
  return '—'
}

function feedbackImageUrl(entry: FeedbackEntry | null | undefined): string {
  const raw = entry?.image_url?.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw
  return '/' + raw
}

function datasetLabelText(label: number | undefined): string {
  return label === 0 ? '正常' : label === 1 ? '篡改' : '—'
}

function datasetPillClass(entry: TrainingDatasetEntry | null | undefined): string {
  return entry?.label === 0 ? '正常' : '篡改'
}

function datasetImageUrl(entry: TrainingDatasetEntry | null | undefined): string {
  const raw = entry?.image_url?.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw
  return '/' + raw
}

function datasetSizeText(bytes: number | undefined): string {
  const n = Number(bytes ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

function datasetDimsText(entry: TrainingDatasetEntry | null | undefined): string {
  if (!entry?.width || !entry?.height) return '—'
  return `${entry.width} × ${entry.height}`
}

function datasetAnnotationText(): string {
  if (datasetAnnotation.value == null) return ''
  try {
    return JSON.stringify(datasetAnnotation.value, null, 2)
  } catch {
    return String(datasetAnnotation.value)
  }
}

async function loadFeedbackEntries() {
  if (isDetectionMockMode()) return
  feedbackLoading.value = true
  feedbackError.value = null
  try {
    const data = await fetchFeedbackEntries(feedbackFilter.value)
    feedbackEntries.value = data.items
    feedbackTotal.value = data.total
    if (!feedbackEntries.value.some((x) => x.folder_name === selectedFeedbackFolder.value)) {
      selectedFeedbackFolder.value = feedbackEntries.value[0]?.folder_name ?? null
    }
  } catch (e) {
    feedbackError.value = e instanceof Error ? e.message : String(e)
  } finally {
    feedbackLoading.value = false
  }
}

async function changeFeedbackJudgment(entry: FeedbackEntry, judgment: FeedbackJudgment) {
  const key = `${entry.folder_name}:${judgment}`
  feedbackActionBusy.value[key] = true
  try {
    await updateFeedbackEntry(entry.folder_name, judgment, entry.user_note)
    await loadFeedbackEntries()
  } catch (e) {
    feedbackError.value = e instanceof Error ? e.message : String(e)
  } finally {
    feedbackActionBusy.value[key] = false
  }
}

async function removeFeedbackEntry(entry: FeedbackEntry) {
  if (!confirm('确认删除这条反馈标注？')) return
  const key = `${entry.folder_name}:delete`
  feedbackActionBusy.value[key] = true
  try {
    await deleteFeedbackEntry(entry.folder_name)
    if (selectedFeedbackFolder.value === entry.folder_name) selectedFeedbackFolder.value = null
    await loadFeedbackEntries()
  } catch (e) {
    feedbackError.value = e instanceof Error ? e.message : String(e)
  } finally {
    feedbackActionBusy.value[key] = false
  }
}

async function loadDatasetEntries() {
  datasetLoading.value = true
  datasetError.value = null
  try {
    const data = await fetchTrainingDatasetEntries(datasetFilter.value, datasetIncludeEnhanced.value)
    datasetEntries.value = data.items
    datasetSummary.value = data.summary
    if (!datasetEntries.value.some((x) => x.filename === selectedDatasetFilename.value)) {
      selectedDatasetFilename.value = datasetEntries.value[0]?.filename ?? null
    }
    if (selectedDatasetEntry.value) {
      await loadDatasetAnnotation(selectedDatasetEntry.value)
    } else {
      datasetAnnotation.value = null
      datasetAnnotationError.value = null
    }
  } catch (e) {
    datasetError.value = e instanceof Error ? e.message : String(e)
  } finally {
    datasetLoading.value = false
  }
}

async function loadDatasetAnnotation(entry: TrainingDatasetEntry | null | undefined) {
  datasetAnnotation.value = null
  datasetAnnotationError.value = null
  if (!entry?.has_annotation) return
  datasetAnnotationLoading.value = true
  try {
    datasetAnnotation.value = await fetchTrainingDatasetAnnotation(entry.filename)
  } catch (e) {
    datasetAnnotationError.value = e instanceof Error ? e.message : String(e)
  } finally {
    datasetAnnotationLoading.value = false
  }
}

async function selectDatasetEntry(entry: TrainingDatasetEntry) {
  selectedDatasetFilename.value = entry.filename
  await loadDatasetAnnotation(entry)
}

async function changeDatasetLabel(entry: TrainingDatasetEntry, label: TrainingDatasetLabel) {
  const key = `${entry.filename}:${label}`
  datasetActionBusy.value[key] = true
  try {
    const data = await updateTrainingDatasetEntry(entry.filename, label)
    if (data.summary) datasetSummary.value = data.summary
    selectedDatasetFilename.value = data.entry?.filename ?? selectedDatasetFilename.value
    await loadDatasetEntries()
  } catch (e) {
    datasetError.value = e instanceof Error ? e.message : String(e)
  } finally {
    datasetActionBusy.value[key] = false
  }
}

async function removeDatasetEntry(entry: TrainingDatasetEntry) {
  if (!confirm('确认删除该训练样本及其配套增强图和标注 JSON？')) return
  const key = `${entry.filename}:delete`
  datasetActionBusy.value[key] = true
  try {
    const data = await deleteTrainingDatasetEntry(entry.filename, true)
    if (data.summary) datasetSummary.value = data.summary
    if (selectedDatasetFilename.value === entry.filename) selectedDatasetFilename.value = null
    await loadDatasetEntries()
  } catch (e) {
    datasetError.value = e instanceof Error ? e.message : String(e)
  } finally {
    datasetActionBusy.value[key] = false
  }
}

async function loadManagedHistory() {
  managedHistoryLoading.value = true
  managedHistoryError.value = null
  try {
    const data = await fetchDetectionHistory(1, 200)
    managedHistoryRows.value = mergeHistoryEntriesForDisplay(data.items)
    managedHistoryTotal.value = data.total
    if (!managedHistoryRows.value.some((x) => x.id === selectedManagedHistoryId.value)) {
      selectedManagedHistoryId.value = managedHistoryRows.value[0]?.id ?? null
    }
  } catch (e) {
    managedHistoryError.value = e instanceof Error ? e.message : String(e)
  } finally {
    managedHistoryLoading.value = false
  }
}

async function removeManagedHistory(entry: DetectionHistoryEntry) {
  if (!confirm('确认删除这条历史记录？')) return
  managedHistoryActionBusy.value[entry.id] = true
  try {
    await deleteDetectionHistory(entry.id)
    if (selectedManagedHistoryId.value === entry.id) selectedManagedHistoryId.value = null
    await loadManagedHistory()
    await refreshHistoryList()
  } catch (e) {
    managedHistoryError.value = e instanceof Error ? e.message : String(e)
  } finally {
    managedHistoryActionBusy.value[entry.id] = false
  }
}

/** 默认与历史列表 retention 一致：最近 7 天 */
function initExportDateDefault() {
  if (exportDateFrom.value && exportDateTo.value) return
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  exportDateFrom.value = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T00:00`
  exportDateTo.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T23:59`
}

function dateToExportDatetime(dateStr: string, endOfDay: boolean): string {
  const d = dateStr.trim()
  if (!d) return ''
  if (d.includes('T')) return d
  return endOfDay ? `${d}T23:59` : `${d}T00:00`
}

function buildHistoryExportRequest(): HistoryExportRequest {
  const start_time = dateToExportDatetime(exportDateFrom.value, false)
  const end_time = dateToExportDatetime(exportDateTo.value, true)
  const body: HistoryExportRequest = {
    start_time,
    end_time,
    image_variant: exportImageVariant.value,
  }
  if (exportDetectionResults.value.length) {
    body.detection_results = [...exportDetectionResults.value]
  }
  const seq = exportBatchSeq.value.trim()
  if (seq && /^\d+$/.test(seq)) {
    const d = exportDateFrom.value.trim()
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      body.batch = `${m[1]}${m[2]}${m[3]}${seq}`
    }
  }
  return body
}

function toggleExportDetectionResult(r: HistoryExportDetectionResult) {
  const arr = exportDetectionResults.value
  const i = arr.indexOf(r)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(r)
}

function exportFeedbackStatusLabel(
  s: HistoryExportFeedbackFilter | FeedbackJudgment | null | undefined,
): string {
  if (s === 'correct') return '正确'
  if (s === 'wrong') return '错误'
  if (s === 'suspicious') return '疑似'
  if (s === 'unmarked') return '未标注'
  return '—'
}

function exportModeLabel(mode: string | undefined): string {
  const m = (mode || '').trim()
  if (!m) return '—'
  if (m === 'async_v3') return 'AI 异步'
  if (m === 'sync_v1') return 'AI 同步'
  if (m.startsWith('rule_')) return '规则'
  return m
}

function exportPreviewImageUrl(raw: string | null | undefined): string {
  const s = raw?.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s
  return '/' + s
}

function exportPreviewImageSrc(item: { id: number | string; image_url?: string | null }): string {
  if (exportImageVariant.value === 'annotated' && item.id != null) {
    return `/ai-detection/api/v1/history/${item.id}/image/annotated`
  }
  return exportPreviewImageUrl(item.image_url)
}

function exportBboxModeLabel(mode: string | undefined): string {
  if (mode === 'manual') return '手动画框'
  if (mode === 'auto') return '自动 OCR'
  return '—'
}

async function runHistoryExportPreview() {
  if (!exportDateFrom.value || !exportDateTo.value) {
    exportPreviewError.value = '请选择开始与结束日期'
    return
  }
  if (exportDateFrom.value > exportDateTo.value) {
    exportPreviewError.value = '结束日期不得早于开始日期'
    return
  }
  exportPreviewLoading.value = true
  exportPreviewError.value = null
  exportDownloadHint.value = null
  try {
    exportPreview.value = await fetchHistoryExportPreview(buildHistoryExportRequest())
  } catch (e) {
    exportPreview.value = null
    exportPreviewError.value = e instanceof Error ? e.message : String(e)
  } finally {
    exportPreviewLoading.value = false
  }
}

async function runHistoryExportDownload() {
  if (!exportPreview.value) {
    exportPreviewError.value = '请先点击「预览统计」确认导出范围'
    return
  }
  if (exportPreview.value.exceeds_limit) {
    exportPreviewError.value = `匹配 ${exportPreview.value.total_matched} 条，超过单次上限 ${exportPreview.value.export_max_records}，请缩小时间或筛选范围`
    return
  }
  if (exportPreview.value.total_matched <= 0) {
    exportPreviewError.value = '无匹配记录，无法导出'
    return
  }
  exportZipBusy.value = true
  exportPreviewError.value = null
  exportDownloadHint.value = null
  try {
    const zip = await downloadHistoryExportZip(buildHistoryExportRequest())
    const url = URL.createObjectURL(zip.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zip.filename
    a.click()
    URL.revokeObjectURL(url)
    const parts: string[] = []
    if (zip.recordCount != null) parts.push(`manifest ${zip.recordCount} 条`)
    if (zip.imagesAdded != null) parts.push(`图片 ${zip.imagesAdded} 张`)
    if (zip.skippedNoImage != null && zip.skippedNoImage > 0) {
      parts.push(`无图跳过 ${zip.skippedNoImage} 条`)
    }
    exportDownloadHint.value = parts.length
      ? `下载已开始（${parts.join('，')}）`
      : '下载已开始'
  } catch (e) {
    exportPreviewError.value = e instanceof Error ? e.message : String(e)
  } finally {
    exportZipBusy.value = false
  }
}

async function showManagement(tab: ManageTab = manageTab.value) {
  appView.value = 'manage'
  manageTab.value = tab
  if (tab === 'feedback') {
    await loadFeedbackEntries()
  } else if (tab === 'dataset') {
    await loadDatasetEntries()
  } else if (tab === 'history') {
    await loadManagedHistory()
  } else if (tab === 'export') {
    initExportDateDefault()
  }
}

function showDetectWorkspace() {
  appView.value = 'detect'
}

async function startRuleChecks(
  file: File,
  bbox: BboxXYXY | null,
  signal: AbortSignal,
  taskId?: string | null,
  imageCreatedAt?: string | null,
): Promise<RuleChecksData> {
  ruleCheckLoading.value = true
  ruleCheckError.value = null
  ruleCheckPayload.value = null
  ruleCheckElapsed.value = null
  aiElapsed.value = null
  const t0 = performance.now()
  try {
    const data = await submitRuleChecks(file, bbox, {
      ...detectSubmitOpts(signal, false, imageCreatedAt ?? formatImageCreatedAt(file)),
      task_id: taskId,
    })
    ruleCheckPayload.value = data
    // 处理 suggested_rois：不传 bbox 时后端返回建议检测区域
    if (data.suggested_rois && data.suggested_rois.length > 0) {
      suggestedRois.value = data.suggested_rois
      // 优先默认选中 priority 1-4；若全部为低优先级(5-6)则全选
      const highPrio = data.suggested_rois
        .map((roi, i) => (roi.priority <= 4 ? i : -1))
        .filter((i) => i >= 0)
      selectedRoiIndices.value = highPrio.length > 0
        ? highPrio
        : data.suggested_rois.map((_, i) => i)
    } else {
      suggestedRois.value = null
      selectedRoiIndices.value = []
    }
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    const message = e instanceof Error ? e.message : String(e)
    ruleCheckError.value = message || '规则检测失败'
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
    throw e
  } finally {
    ruleCheckLoading.value = false
  }
}

async function startRuleChecksFromTask(
  taskId: string,
  file: File,
  bbox: BboxXYXY | null,
  signal: AbortSignal,
  imageCreatedAt?: string | null,
): Promise<RuleChecksData> {
  ruleCheckLoading.value = true
  ruleCheckError.value = null
  ruleCheckElapsed.value = null
  aiElapsed.value = null
  const t0 = performance.now()
  try {
    const data = await submitRuleChecksFromTask(taskId, bbox, {
      ...detectSubmitOpts(signal, false, imageCreatedAt ?? formatImageCreatedAt(file)),
    })
    ruleCheckPayload.value = data
    if (data.suggested_rois && data.suggested_rois.length > 0) {
      suggestedRois.value = data.suggested_rois
      const highPrio = data.suggested_rois
        .map((roi, i) => (roi.priority <= 4 ? i : -1))
        .filter((i) => i >= 0)
      selectedRoiIndices.value = highPrio.length > 0
        ? highPrio
        : data.suggested_rois.map((_, i) => i)
    } else {
      suggestedRois.value = null
      selectedRoiIndices.value = []
    }
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    const message = e instanceof Error ? e.message : String(e)
    ruleCheckError.value = message || '规则检测失败'
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
    throw e
  } finally {
    ruleCheckLoading.value = false
  }
}

async function runRuleSingle(file: File) {
  const bbox: BboxXYXY | null = v3SpecifyBbox.value ? (userBbox.value ?? fullImageBbox()) : null
  if (v3SpecifyBbox.value && !bbox) {
    errorMsg.value = '请框选区域或等待图片在预览区加载完成'
    return
  }

  busy.value = true
  errorMsg.value = null
  currentBatch.value = generateNextBatch()
  viewingHistoryId.value = null
  v3Payload.value = null
  v3TaskId.value = null
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  detectAbort.value?.abort()
  const ac = new AbortController()
  detectAbort.value = ac
  pollStatus.value = '规则检测中…'
  try {
    await startRuleChecks(file, bbox, ac.signal)
    pollStatus.value = '规则检测完成'
    void refreshHistoryList()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      pollStatus.value = '已取消'
      return
    }
    errorMsg.value = e instanceof Error ? e.message : String(e)
    pollStatus.value = ''
  } finally {
    detectAbort.value = null
    busy.value = false
  }
}

/** 用户从 suggested_rois 中勾选区域后，以选中的 bbox 重新执行规则检测 */
async function runRoiDetect(file: File) {
  const rois = suggestedRois.value
  if (!rois || selectedRoiIndices.value.length === 0) return

  // 获取第一个选中的 ROI 的 bbox
  const sorted = [...selectedRoiIndices.value].sort((a, b) => a - b)
  const firstIdx = sorted[0]
  if (firstIdx == null) return
  const selectedRoi = rois[firstIdx]
  if (!selectedRoi) return

  roiDetectBusy.value = true
  ruleCheckLoading.value = true
  ruleCheckError.value = null
  ruleCheckElapsed.value = null
  const t0 = performance.now()
  try {
    const data = await submitRuleChecks(file, selectedRoi.bbox as BboxXYXY, {
      ...detectSubmitOpts(new AbortController().signal, false, formatImageCreatedAt(file)),
    })
    ruleCheckPayload.value = data
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
    // 传了 bbox，pixel_overlap 应当有结果，suggested_rois 应为 null
    suggestedRois.value = null
    selectedRoiIndices.value = []
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    const message = e instanceof Error ? e.message : String(e)
    ruleCheckError.value = message || '规则检测失败'
    ruleCheckElapsed.value = Math.round(performance.now() - t0)
  } finally {
    ruleCheckLoading.value = false
    roiDetectBusy.value = false
  }
}

async function runRuleBatch(batchFiles: File[]) {
  if (!batchFiles.length) return
  const filesToRun = batchFiles.slice(0, MAX_BATCH_IMAGE_COUNT)
  const limitNotice = filesToRun.length !== batchFiles.length
    ? `批量检测最多支持 ${MAX_BATCH_IMAGE_COUNT} 张图片，已忽略超出的 ${batchFiles.length - filesToRun.length} 张。`
    : null
  if (v3SpecifyBbox.value) {
    errorMsg.value = '批量检测暂不支持”仅分析框选区域”，请关闭后重试。'
    return
  }

  busy.value = true
  errorMsg.value = limitNotice
  currentBatch.value = generateNextBatch()
  viewingHistoryId.value = null
  v3Payload.value = null
  v3TaskId.value = null
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  detectAbort.value?.abort()
  const ac = new AbortController()
  detectAbort.value = ac
  try {
    const uploadSummary = await uploadBatchFiles(filesToRun, '规则检测', ac.signal)
    if (uploadSummary.failed.length > 0) {
      pollStatus.value = `规则检测停止：上传成功 ${uploadSummary.success}/${uploadSummary.total}，最终失败 ${uploadSummary.failed.length}，未开始检测`
      errorMsg.value = formatBatchFailureSummary(uploadSummary.failed)
      return
    }

    const summary = await runStableBatchItems(
      uploadSummary.items,
      '规则检测',
      ac.signal,
      async (item) => {
        const taskId = item.taskId?.trim()
        if (!taskId) throw new Error('上传阶段未返回任务 ID')
        item.state = 'polling'
        const t0 = performance.now()
        const payload = await startRuleChecksFromTask(
          taskId,
          item.file,
          null,
          ac.signal,
          formatImageCreatedAt(item.file),
        )
        return { taskId, payload, elapsedMs: Math.round(performance.now() - t0) }
      },
      { refreshHistory: true, deleteTaskOnRetry: false },
    )
    pollStatus.value = `规则检测完成：总数 ${summary.total}，成功 ${summary.success}，最终失败 ${summary.failed.length}，上传重试 ${uploadSummary.retryCount}，检测重试 ${summary.retryCount}`
    errorMsg.value = formatBatchFailureSummary(summary.failed)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      pollStatus.value = '已取消'
      return
    }
    errorMsg.value = e instanceof Error ? e.message : String(e)
    pollStatus.value = ''
  } finally {
    detectAbort.value = null
    busy.value = false
  }
}

/** 单张/批量共用：v3 异步提交 → 等待 → 拉取结果（与多张单步逻辑一致） */
async function runV3AsyncOne(
  file: File,
  bbox: BboxXYXY | null,
  progressPrefix: string,
  signal: AbortSignal,
  withRuleChecks = false,
  imageCreatedAt?: string | null,
  options?: {
    taskId?: string | null
    maxDurationMs?: number
    onTaskId?: (taskId: string) => void
  },
): Promise<{ taskId: string; payload: V3ViewPayload }> {
  pollStatus.value = withRuleChecks
    ? `${progressPrefix}：提交检测与辅助核查…`
    : `${progressPrefix}：提交任务…`
  const existingTaskId = options?.taskId?.trim()
  const submit = existingTaskId
    ? await submitV3DetectTask(
        existingTaskId,
        bbox,
        detectSubmitOpts(signal, withRuleChecks, imageCreatedAt ?? formatImageCreatedAt(file)),
      )
    : await submitV3Detect(
        file,
        bbox,
        detectSubmitOpts(signal, withRuleChecks, imageCreatedAt ?? formatImageCreatedAt(file)),
      )
  const taskId = submit.task_id?.trim()
  if (!taskId) throw new Error(`${progressPrefix}：未返回任务 ID`)
  v3TaskId.value = taskId
  options?.onTaskId?.(taskId)
  pollStatus.value = withRuleChecks
    ? `${progressPrefix}：检测与辅助核查处理中…`
    : `${progressPrefix}：检测处理中…`
  const data = await pollV3UntilComplete(taskId, {
    signal,
    intervalMs: 2000,
    maxDurationMs: options?.maxDurationMs ?? V3_TASK_POLL_MAX_DURATION_MS,
    onPoll: (st) => {
      const label =
        st === 'PENDING' || st === 'PROCESSING'
          ? '处理中'
          : st === 'COMPLETED'
            ? '已完成'
            : st
      pollStatus.value = withRuleChecks
        ? `${progressPrefix}：检测与辅助核查${label}`
        : `${progressPrefix}：检测${label}`
    },
  })
  if (data.error_msg?.trim() && !data.result && !(data.multi_results?.length)) {
    throw new Error(data.error_msg)
  }
  if (!data.result && !(data.multi_results?.length)) {
    throw new Error('未返回检测结果')
  }
  const payload = v3PayloadFromPoll(data)
  if (withRuleChecks) {
    applyLinkedRuleChecksFromPoll(data.linked_rule_checks, true)
  }
  return { taskId, payload }
}

function onImgLoad() {
  const el = imgRef.value
  imageNatural.value = el
    ? { w: el.naturalWidth, h: el.naturalHeight }
    : { w: 0, h: 0 }
}

function onImgError() {
  imageNatural.value = { w: 0, h: 0 }
}

const overlayStroke = computed(() =>
  Math.max(2, (imageNatural.value.w || 0) * 0.003),
)

function naturalBboxFromDraw(): BboxXYXY | null {
  const img = imgRef.value
  if (!img?.naturalWidth || !drawStart.value || !drawCurrent.value) return null
  const s = drawStart.value
  const c = drawCurrent.value
  const x1 = Math.max(0, Math.min(s.x, c.x))
  const y1 = Math.max(0, Math.min(s.y, c.y))
  const x2 = Math.min(img.naturalWidth, Math.max(s.x, c.x))
  const y2 = Math.min(img.naturalHeight, Math.max(s.y, c.y))
  if (x2 - x1 < 2 || y2 - y1 < 2) return null
  return [Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)]
}

function eventToNatural(e: MouseEvent, img: HTMLImageElement) {
  const r = img.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * img.naturalWidth
  const y = ((e.clientY - r.top) / r.height) * img.naturalHeight
  return {
    x: Math.max(0, Math.min(img.naturalWidth, x)),
    y: Math.max(0, Math.min(img.naturalHeight, y)),
  }
}

function onDrawDown(e: MouseEvent) {
  const img = imgRef.value
  if (!img?.naturalWidth || busy.value) return
  drawing.value = true
  drawStart.value = eventToNatural(e, img)
  drawCurrent.value = { ...drawStart.value }
}

function onDrawMove(e: MouseEvent) {
  const img = imgRef.value
  if (!drawing.value || !img?.naturalWidth) return
  drawCurrent.value = eventToNatural(e, img)
}

function onDrawUp() {
  if (!drawing.value) return
  drawing.value = false
  const b = naturalBboxFromDraw()
  drawStart.value = null
  drawCurrent.value = null
  if (b) userBbox.value = b
}

function fullImageBbox(): BboxXYXY | null {
  const img = imgRef.value
  if (!img?.naturalWidth) return null
  return [0, 0, img.naturalWidth, img.naturalHeight]
}

const drawPreviewBbox = computed(() => {
  const img = imgRef.value
  if (!img?.naturalWidth || !drawStart.value || !drawCurrent.value) return null
  const s = drawStart.value
  const c = drawCurrent.value
  return {
    x1: Math.min(s.x, c.x),
    y1: Math.min(s.y, c.y),
    x2: Math.max(s.x, c.x),
    y2: Math.max(s.y, c.y),
  }
})

type NumberedBbox = {
  n: number
  bbox: readonly [number, number, number, number]
}

/** 接口偶发缺 bbox 或非数组，直接解构会在 computed 里抛错导致整页白屏 */
function readBboxWh(b: unknown): readonly [number, number, number, number] | null {
  if (!Array.isArray(b) || b.length < 4) return null
  const nums = b.slice(0, 4).map((v) => Number(v))
  if (!nums.every((n) => Number.isFinite(n))) return null
  const [x, y, w, h] = nums
  if (w <= 0 || h <= 0) return null
  return [x, y, w, h] as const
}

function resultRegionNo(item: V3ResultItem | null | undefined, fallback: number): number {
  const raw = Number(item?.region_no)
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : fallback
}

function resultFieldLabel(item: V3ResultItem | null | undefined): string {
  const label = String(item?.field_label ?? '').trim()
  if (label) return label
  const type = String(item?.field_type ?? '').trim()
  if (type === 'amount') return '金额'
  if (type === 'name') return '姓名'
  if (type === 'time') return '时间'
  if (type === 'manual') return '手动框选'
  return '区域'
}

/** 与右侧列表序号一致；预览与历史坐标示意共用 */
function collectNumberedBoxesFromPayload(
  p: NonNullable<typeof v3Payload.value>,
): NumberedBbox[] {
  if (p.multi?.length) {
    const raw: NumberedBbox[] = []
    for (let i = 0; i < p.multi.length; i++) {
      const m = p.multi[i]
      const bb = readBboxWh(m?.bbox)
      if (bb) raw.push({ n: resultRegionNo(m, i + 1), bbox: bb })
    }
    return raw
  }
  if (p.result) {
    const bb = readBboxWh(p.result.bbox)
    if (bb) return [{ n: resultRegionNo(p.result, 1), bbox: bb }]
  }
  return []
}

/** 与右侧「各区域明细」序号一致 */
const previewNumberedRegions = computed((): NumberedBbox[] => {
  if (!imageNatural.value.w || viewingHistoryId.value) return []
  const p = v3Payload.value
  if (!p) return []
  return collectNumberedBoxesFromPayload(p)
})

/** 看历史且无标注图/原图时，用坐标画区域示意（放在报告区） */
const historySchematicSpec = computed(() => {
  if (!viewingHistoryId.value || !v3Payload.value) return null
  if (vizObjectUrl.value || vizLoading.value || historyPreviewUrl.value) return null
  const boxes = collectNumberedBoxesFromPayload(v3Payload.value)
  if (!boxes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { bbox: b } of boxes) {
    minX = Math.min(minX, b[0])
    minY = Math.min(minY, b[1])
    maxX = Math.max(maxX, b[0] + b[2])
    maxY = Math.max(maxY, b[1] + b[3])
  }
  const w0 = maxX - minX
  const h0 = maxY - minY
  const pad = Math.max(16, Math.min(w0 || 1, h0 || 1) * 0.06)
  const vx = minX - pad
  const vy = minY - pad
  const vw = w0 + 2 * pad
  const vh = h0 + 2 * pad
  if (!Number.isFinite(vw) || !Number.isFinite(vh) || vw <= 0 || vh <= 0) return null
  const span = Math.max(vw, vh)
  return { viewBox: `${vx} ${vy} ${vw} ${vh}`, span, boxes }
})

function schematicMarkerFromBbox(
  bbox: readonly [number, number, number, number],
  span: number,
) {
  const r = Math.max(8, Math.min(22, span * 0.022))
  const x1 = bbox[0]
  const y1 = bbox[1]
  const bw = bbox[2]
  const bh = bbox[3]
  let cx = x1 + r + 3
  let cy = y1 + r + 3
  const minX = x1 + r + 1
  const maxX = x1 + bw - r - 1
  const minY = y1 + r + 1
  const maxY = y1 + bh - r - 1
  if (maxX >= minX) cx = Math.min(maxX, Math.max(minX, cx))
  else cx = x1 + bw / 2
  if (maxY >= minY) cy = Math.min(maxY, Math.max(minY, cy))
  else cy = y1 + bh / 2
  const fs = Math.max(12, Math.min(22, span * 0.028))
  return { cx, cy, r, fs }
}

const historySchematicRenderList = computed(() => {
  const s = historySchematicSpec.value
  if (!s) return []
  return s.boxes.map((it) => ({
    ...it,
    ...schematicMarkerFromBbox(it.bbox, s.span),
  }))
})

const vizHintMissing = computed(
  () =>
    !!viewingHistoryId.value &&
    !!v3TaskId.value &&
    !!v3Payload.value &&
    !vizObjectUrl.value &&
    !vizLoading.value &&
    !historySchematicSpec.value &&
    collectNumberedBoxesFromPayload(v3Payload.value).length > 0,
)

/** 检测报告「各区域明细」：展示全部检测区，序号与后端标注图一致 */
const reportMultiDetailRows = computed(() => {
  const multi = v3Payload.value?.multi
  if (!multi?.length) return [] as { item: V3ResultItem; regionNo: number; fieldLabel: string }[]
  const out: { item: V3ResultItem; regionNo: number; fieldLabel: string }[] = []
  for (let i = 0; i < multi.length; i++) {
    const m = multi[i]
    out.push({ item: m, regionNo: resultRegionNo(m, i + 1), fieldLabel: resultFieldLabel(m) })
  }
  return out
})

const summaryExtendedLines = computed(() =>
  buildExtendedDisplayLines(v3Payload.value?.result ?? null),
)

function extendedLinesForItem(item: V3ResultItem) {
  return buildExtendedDisplayLines(item)
}

function itemShowsExtended(item: V3ResultItem) {
  return hasExtendedDetectionFields(item)
}

const regionLabelMetrics = computed(() => {
  const w = imageNatural.value.w || 800
  const fs = Math.max(12, Math.min(24, w * 0.022))
  const r = fs * 0.55
  return { fs, r }
})

function regionMarkerCenter(bbox: readonly [number, number, number, number]) {
  const { r } = regionLabelMetrics.value
  const x1 = bbox[0]
  const y1 = bbox[1]
  const bw = bbox[2]
  const bh = bbox[3]
  let cx = x1 + r + 3
  let cy = y1 + r + 3
  const minX = x1 + r + 1
  const maxX = x1 + bw - r - 1
  const minY = y1 + r + 1
  const maxY = y1 + bh - r - 1
  if (maxX >= minX) cx = Math.min(maxX, Math.max(minX, cx))
  else cx = x1 + bw / 2
  if (maxY >= minY) cy = Math.min(maxY, Math.max(minY, cy))
  else cy = y1 + bh / 2
  return { cx, cy }
}

const REGION_STROKES = ['#1d4ed8', '#0d9488', '#7c3aed', '#c2410c'] as const
function regionStrokeForIndex(n: number) {
  return REGION_STROKES[(n - 1) % REGION_STROKES.length]
}

const REGION_DASH = ['7 5', '4 4', '10 4', '3 3'] as const
function regionDashForIndex(n: number) {
  return REGION_DASH[(n - 1) % REGION_DASH.length]
}

const previewNumberedRenderList = computed(() =>
  previewNumberedRegions.value.map((it) => ({
    ...it,
    ...regionMarkerCenter(it.bbox),
  })),
)

const previewLightboxOpen = ref(false)
const previewLightboxSrc = ref('')
const previewLightboxStageRef = ref<HTMLElement | null>(null)
const lightboxImgRef = ref<HTMLImageElement | null>(null)
const lightboxImgNatural = ref({ w: 0, h: 0 })
const lightboxScale = ref(1)
const LIGHTBOX_SCALE_MIN = 0.25
const LIGHTBOX_SCALE_MAX = 5
const LIGHTBOX_SCALE_STEP = 0.25

function computeFitScale(): number {
  const imgW = lightboxImgNatural.value.w
  const imgH = lightboxImgNatural.value.h
  if (!imgW || !imgH) return 1
  const stage = previewLightboxStageRef.value
  const stageW = stage?.clientWidth ?? window.innerWidth
  const stageH = stage?.clientHeight ?? window.innerHeight
  const padW = Math.max(0, stageW - 32)
  const padH = Math.max(0, stageH - 32)
  // 允许放大（最大3倍），小图也能填满视口
  return Math.min(3, padW / imgW, padH / imgH)
}

function openPreviewLightbox(src?: string) {
  const target = (src ?? activePreviewUrl.value ?? '').trim()
  if (!target) return
  previewLightboxSrc.value = target
  previewLightboxOpen.value = true
  // 默认适应屏幕；图片加载后会触发 onLightboxImgLoad 重新计算
  lightboxScale.value = computeFitScale()
  // 若与当前预览图片同源，直接复用已知尺寸
  if (target === activePreviewUrl.value && imageNatural.value.w > 0) {
    lightboxImgNatural.value = { w: imageNatural.value.w, h: imageNatural.value.h }
    lightboxScale.value = computeFitScale()
  } else {
    lightboxImgNatural.value = { w: 0, h: 0 }
  }
  window.addEventListener('keydown', onPreviewLightboxKeydown)
  nextTick(() => {
    const stage = previewLightboxStageRef.value
    if (!stage) return
    stage.scrollTop = 0
    stage.scrollLeft = 0
    stage.addEventListener('wheel', onLightboxWheel, { passive: false })
  })
}

function closePreviewLightbox() {
  previewLightboxOpen.value = false
  previewLightboxSrc.value = ''
  lightboxImgNatural.value = { w: 0, h: 0 }
  lightboxScale.value = 1
  window.removeEventListener('keydown', onPreviewLightboxKeydown)
  const stage = previewLightboxStageRef.value
  if (stage) stage.removeEventListener('wheel', onLightboxWheel)
}

function onLightboxImgLoad() {
  const el = lightboxImgRef.value
  lightboxImgNatural.value = el
    ? { w: el.naturalWidth, h: el.naturalHeight }
    : { w: 0, h: 0 }
  // 图片加载后自动计算适应屏幕的缩放
  nextTick(() => { lightboxScale.value = computeFitScale() })
}

function onPreviewLightboxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closePreviewLightbox()
}

function onLightboxWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const delta = -Math.sign(e.deltaY) * LIGHTBOX_SCALE_STEP
  lightboxScale.value = Math.min(LIGHTBOX_SCALE_MAX, Math.max(LIGHTBOX_SCALE_MIN, lightboxScale.value + delta))
}

function onLightboxImgClick() {
  const fitScale = computeFitScale()
  if (Math.abs(lightboxScale.value - fitScale) < 0.01) {
    lightboxScale.value = Math.min(LIGHTBOX_SCALE_MAX, fitScale * 2)
  } else {
    lightboxScale.value = fitScale
  }
}

function onPreviewImgClick() {
  if (v3SpecifyBbox.value || busy.value) return
  openPreviewLightbox(activePreviewUrl.value || '')
}

const userBboxXYWH = computed(() => {
  if (!userBbox.value) return null
  const [x1, y1, x2, y2] = userBbox.value
  return [x1, y1, x2 - x1, y2 - y1] as const
})

/** 将 suggested_rois 转为图片上可渲染的矩形列表，含标签芯片 + 正交引导线 */
type RoiRenderRect = {
  idx: number
  x: number; y: number; w: number; h: number
  category: string; ocrLabel: string; displayLabel: string; priority: number
  selected: boolean
  stroke: string; dash: string
  /** 芯片矩形：x, y, w, h */
  cx: number; cy: number; cw: number; ch: number
  /** 标签文字锚点坐标 */
  tx: number; ty: number
  /** 正交折线路径点串 "x1,y1 x2,y2 x3,y3 x4,y4" */
  linePoints: string
}

/** 全局计算所有 ROI 的标签布局：右侧列 + Y 排序 + 正交折线 + 芯片样式 */
function computeAllRoiLayouts(
  rois: SuggestedRoi[],
  imgW: number,
  imgH: number,
): Pick<RoiRenderRect, 'cx' | 'cy' | 'cw' | 'ch' | 'tx' | 'ty' | 'linePoints'>[] {
  const count = rois.length
  if (count === 0) return []

  // 标签芯片尺寸
  const chipH = 22
  const chipPadX = 10
  const marginRight = 28   // 距图片右边缘
  const marginLeft = 28    // 距图片左边缘
  const labelSpacing = 42  // 标签之间最小间距
  const boxHStep = 10      // 框边外移距离

  // 先按框中心 Y 排序，确定垂直顺序
  const indexed = rois.map((roi, i) => {
    const [x1, y1, x2, y2] = roi.bbox
    return { idx: i, x1, y1, x2, y2, cy: y1 + Math.max(0, y2 - y1) / 2, cx: x1 + Math.max(0, x2 - x1) / 2 }
  })
  indexed.sort((a, b) => a.cy - b.cy)

  // 垂直布局：从 topMargin 开始均匀分布
  const topMargin = 12
  const availH = imgH - topMargin - 12
  const step = Math.max(labelSpacing, Math.min(availH / count, availH / Math.max(count - 1, 1)))
  // 如果总高度超出可用空间则压缩
  const totalH = (count - 1) * step + chipH
  const usedSpacing = totalH > availH ? Math.max(28, availH / Math.max(count, 1)) : step

  // 为每个 ROI 分配标签 Y（按排序后的顺序）
  const layouts = new Array<{
    idx: number; ly: number; side: 'right' | 'left'
  }>(count)

  for (let i = 0; i < count; i++) {
    const item = indexed[i]!
    const ly = topMargin + i * usedSpacing + chipH / 2
    // 框靠近右边缘（< chipW + margin）则放左侧
    const estChipW = 44
    const side: 'right' | 'left' = item.x2 + estChipW + marginRight > imgW ? 'left' : 'right'
    layouts[i] = { idx: item.idx, ly: Math.max(chipH / 2 + 2, Math.min(imgH - chipH / 2 - 2, ly)), side }
  }

  // 构建结果（按原始 idx 排序返回）
  const result = new Array<Pick<RoiRenderRect, 'cx' | 'cy' | 'cw' | 'ch' | 'tx' | 'ty' | 'linePoints'>>(count)

  for (let i = 0; i < count; i++) {
    const item = indexed[i]!
    const layout = layouts[i]!
    const { ly, side } = layout
    const label = `A${item.idx + 1}`
    // 估算芯片宽度：每个字符约 0.6em ≈ 8px（font-size≈13px），加左右 padding
    const estCw = Math.max(36, label.length * 9 + chipPadX * 2)
    const cw = estCw

    // 芯片 X：右侧靠右边缘，左侧靠左边缘
    let chipX: number, tx: number
    if (side === 'right') {
      chipX = imgW - marginRight - cw
      tx = imgW - marginRight - 4  // text-anchor: end
    } else {
      chipX = marginLeft
      tx = marginLeft + 4  // text-anchor: start
    }

    // 正交折线路径
    let pts: string
    if (side === 'right') {
      // 框右边缘 → 右移 → 垂直 → 到芯片左侧
      pts = `${item.x2},${item.cy} ${item.x2 + boxHStep},${item.cy} ${item.x2 + boxHStep},${ly} ${chipX - 4},${ly}`
    } else {
      // 框左边缘 → 左移 → 垂直 → 到芯片右侧
      pts = `${item.x1},${item.cy} ${item.x1 - boxHStep},${item.cy} ${item.x1 - boxHStep},${ly} ${chipX + cw + 4},${ly}`
    }

    result[item.idx] = {
      cx: chipX, cy: ly - chipH / 2, cw, ch: chipH,
      tx, ty: ly,
      linePoints: pts,
    }
  }

  return result
}

/** ROI 区域颜色调色板（与 AI 检测结果保持风格一致） */
const ROI_STROKES = ['#2563eb', '#0d9488', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#b91c1c'] as const

function roiStrokeForIndex(idx: number): string {
  return ROI_STROKES[idx % ROI_STROKES.length]
}

const suggestedRoiRenderRects = computed<RoiRenderRect[]>(() => {
  const rois = suggestedRois.value
  if (!rois || rois.length === 0) return []
  const imgW = imageNatural.value.w || 800
  const imgH = imageNatural.value.h || 600
  const layouts = computeAllRoiLayouts(rois, imgW, imgH)
  return rois.map((roi, idx) => {
    const bbox = roi.bbox as [number, number, number, number]
    const [x1, y1, x2, y2] = bbox
    const w = Math.max(0, x2 - x1)
    const h = Math.max(0, y2 - y1)
    const sel = isRoiSelected(idx)
    const layout = layouts[idx]!
    return {
      idx,
      x: x1, y: y1, w, h,
      category: roi.category,
      ocrLabel: roi.label,
      displayLabel: `A${idx + 1}`,
      priority: roi.priority,
      selected: sel,
      stroke: sel ? roiStrokeForIndex(idx) : '#94a3b8',
      dash: sel ? 'none' : '4 3',
      ...layout,
    }
  })
})

/** #rrggbb → rgba(r, g, b, alpha) */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return `rgba(0,0,0,${alpha})`
  return `rgba(${parseInt(m[1]!, 16)}, ${parseInt(m[2]!, 16)}, ${parseInt(m[3]!, 16)}, ${alpha})`
}

function formatHistoryTime(iso: string) {
  if (!iso || iso === '—') return '—'
  try {
    const d = new Date(iso.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function truncateName(name: string, max = 18) {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

/** 从批次号（格式 YYYYMMDD+序号，如 202601021）中提取序号部分 */
function formatBatchShort(batch: string | null | undefined): string {
  if (!batch || batch.length <= 8) return batch || '—'
  return batch.slice(8)
}

/** 从历史记录中推断下一个批次号：当天日期 + 最大序号 + 1，无当天记录则从 1 开始 */
function generateNextBatch(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePrefix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  let maxSeq = 0
  // 从已加载的历史列表中查找当天批次的最大序号
  for (const e of historyEntries.value) {
    const b = e.batch
    if (b && b.startsWith(datePrefix)) {
      const seq = parseInt(b.slice(8), 10)
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
    }
  }
  // 如果当前会话已有批次号，也纳入比较（避免重复）
  if (currentBatch.value && currentBatch.value.startsWith(datePrefix)) {
    const seq = parseInt(currentBatch.value.slice(8), 10)
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
  }
  return `${datePrefix}${maxSeq + 1}`
}

/** 切换 suggested_rois 列表中某个 ROI 的勾选状态 */
function toggleRoiIndex(idx: number) {
  const arr = selectedRoiIndices.value
  const pos = arr.indexOf(idx)
  if (pos >= 0) {
    arr.splice(pos, 1)
  } else {
    arr.push(idx)
  }
}

function isRoiSelected(idx: number): boolean {
  return selectedRoiIndices.value.includes(idx)
}

function selectAllRois() {
  if (suggestedRois.value) {
    selectedRoiIndices.value = suggestedRois.value.map((_, i) => i)
  }
}

function deselectAllRois() {
  selectedRoiIndices.value = []
}

function historyResultLabel(entry: DetectionHistoryEntry) {
  if (entry.status === 'FAILED') return '失败'
  const r = entry.payload.result?.result
  if (r) return r
  const m = entry.payload.multi?.[0]?.result
  if (m) return m
  if (entry.ruleCheck) return ruleCheckVerdict(entry.ruleCheck).label
  return '已完成'
}

function historyKindLabel(entry: DetectionHistoryEntry) {
  return historyEntryKindLabel(entry)
}

function historyPillClass(entry: DetectionHistoryEntry) {
  if (entry.status === 'FAILED') return '失败'
  const label = historyResultLabel(entry)
  if (label === '正常' || label === '可疑' || label === '篡改' || label === '错误') {
    return label
  }
  return ''
}

function historyFeedbackStatusLabel(entry: DetectionHistoryEntry): string | null {
  const s = entry.feedbackStatus
  if (s === 'correct') return '正确'
  if (s === 'wrong') return '错误'
  if (s === 'suspicious') return '疑似'
  return null
}

function historyFeedbackStatusPillClass(entry: DetectionHistoryEntry): string {
  return entry.feedbackStatus ?? ''
}

/** 按 task_id 建立反馈条目索引，便于在历史记录中快速查找对应的纠错信息 */
const feedbackByTaskId = computed(() => {
  const map = new Map<string, FeedbackEntry>()
  for (const e of feedbackEntries.value) {
    const tid = e.task_id?.trim()
    if (tid) map.set(tid, e)
  }
  return map
})

/** 从反馈条目中获取纠错时间，格式化为 MM/DD HH:mm */
function correctionTimestamp(entry: FeedbackEntry | null | undefined): string | null {
  if (!entry) return null
  const raw = entry.updated_at || entry.timestamp
  if (!raw) return null
  try {
    const d = new Date(raw.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return null
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch {
    return null
  }
}

/** 反馈列表行显示时间（MM/DD HH:mm），支持多种后端时间格式 */
function feedbackListTime(entry: FeedbackEntry): string {
  const raw = entry.timestamp || entry.updated_at
  if (!raw) return '—'
  // 尝试解析 YYYYMMDD_HHMMSS 格式（如 20260603_204200）
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})[_\s](\d{2})(\d{2})(\d{2})/)
  if (m) {
    const mm = m[2]
    const dd = m[3]
    const hh = m[4]
    const mi = m[5]
    return `${mm}/${dd} ${hh}:${mi}`
  }
  // 尝试标准 ISO 格式
  try {
    const d = new Date(raw.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return '—'
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const dy = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mo}/${dy} ${hh}:${mi}`
  } catch {
    return '—'
  }
}

function isHistoryRowActive(entry: DetectionHistoryEntry) {
  if (viewingHistoryId.value === entry.id) return true
  if (
    !viewingHistoryId.value &&
    entry.taskId &&
    v3TaskId.value === entry.taskId &&
    v3Payload.value
  ) {
    return true
  }
  return false
}

async function goHistoryPage(page: number) {
  if (historyLoading.value) return
  if (page < 1) return
  if (historyTotal.value > 0) {
    const tp = Math.ceil(historyTotal.value / HISTORY_PAGE_SIZE)
    if (page > tp) return
  }
  historyLoading.value = true
  historyError.value = null
  try {
    const r = await fetchDetectionHistory(page, HISTORY_PAGE_SIZE, 'async_v3,rule_checks,sync_v1')
    historyEntries.value = mergeHistoryEntriesForDisplay(r.items)
    historyTotal.value = r.total
    historyPage.value = page
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : String(e)
  } finally {
    historyLoading.value = false
  }
}

async function refreshHistoryList() {
  await goHistoryPage(1)
}

/** 历史列表项来自 Vue 响应式数据，不能用 structuredClone（Proxy 不可克隆） */
function clonePayloadForView(
  p: DetectionHistoryEntry['payload'],
): NonNullable<typeof v3Payload.value> {
  return JSON.parse(JSON.stringify(toRaw(p))) as NonNullable<
    typeof v3Payload.value
  >
}

async function applyHistoryEntry(entry: DetectionHistoryEntry) {
  errorMsg.value = null
  pollStatus.value = ''
  viewingHistoryId.value = entry.id
  currentViewingEntry.value = entry
  imageNatural.value = { w: 0, h: 0 }
  ruleCheckPayload.value = entry.ruleCheck ?? null
  ruleCheckError.value = null
  ruleCheckLoading.value = false
  ruleCheckElapsed.value = null
  aiElapsed.value = null
  // 同步 suggested_rois
  const rc = entry.ruleCheck
  if (rc?.suggested_rois && rc.suggested_rois.length > 0) {
    suggestedRois.value = rc.suggested_rois
    const highPrio = rc.suggested_rois
      .map((roi, i) => (roi.priority <= 4 ? i : -1))
      .filter((i) => i >= 0)
    selectedRoiIndices.value = highPrio.length > 0
      ? highPrio
      : rc.suggested_rois.map((_, i) => i)
  } else {
    suggestedRois.value = null
    selectedRoiIndices.value = []
  }
  currentTaskFeedbackStatus.value = entry.feedbackStatus ?? null
  // 后端返回的 imageUrl 应为完整的资源路径（通常以 /ai-detection 开头），
  // 前端不得再统一 prepend 公共 /api/v1 前缀，避免生成错误路径。
  const raw = (entry.imageUrl ?? '').trim()
  if (!raw) {
    historyPreviewUrl.value = null
  } else if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw) || raw.startsWith('/')) {
    // 绝对 URL 或以 / 开头的本域路径，直接使用
    historyPreviewUrl.value = raw
  } else {
    // 相对路径（极少数），在前面补一个斜杠以成为同域绝对路径
    historyPreviewUrl.value = '/' + raw
  }
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  if (entry.status === 'FAILED') {
    v3TaskId.value = entry.taskId || null
    v3Payload.value = null
    errorMsg.value = entry.payload.error_msg || '该条检测未成功完成'
    return
  }
  v3TaskId.value = entry.taskId || null
  if (historyEntryHasAi(entry)) {
    const taskId = entry.taskId?.trim()
    const expectRule = historyEntryHasRule(entry)
    if (taskId && !isDetectionMockMode()) {
      if (expectRule) ruleCheckLoading.value = true
      else {
        ruleCheckPayload.value = null
        ruleCheckLoading.value = false
      }
      try {
        const data = await getV3Result(taskId)
        v3Payload.value = v3PayloadFromPoll(data)
        if (data.linked_rule_checks != null) {
          applyLinkedRuleChecksFromPoll(data.linked_rule_checks, expectRule)
        } else if (expectRule) {
          applyLinkedRuleChecksFromPoll(entry.ruleCheck ?? null, true)
        } else {
          applyLinkedRuleChecksFromPoll(null, false)
        }
      } catch (e) {
        v3Payload.value = clonePayloadForView(entry.payload)
        if (expectRule) {
          applyLinkedRuleChecksFromPoll(entry.ruleCheck ?? null, true)
        } else {
          applyLinkedRuleChecksFromPoll(null, false)
        }
        ruleCheckError.value =
          e instanceof Error ? e.message : '刷新检测结果失败，已显示历史缓存'
      }
    } else {
      v3Payload.value = clonePayloadForView(entry.payload)
      ruleCheckPayload.value = expectRule ? entry.ruleCheck ?? emptyLinkedRuleChecks() : null
      ruleCheckLoading.value = false
      ruleCheckElapsed.value = null
      aiElapsed.value = null
    }
    if (entry.taskId) void loadViz(entry.taskId)
  } else {
    v3Payload.value = null
  }
}

onMounted(() => {
  void refreshHistoryList()
  void checkHealth()
  void loadModelInfo()
  void loadFeedbackEntries().then(() => {
    // 反馈数据加载完成后设置默认日期范围（近 30 天）
    initFeedbackDateDefault()
  })
})

async function runV3() {
  const picked = files.value
  if (!picked.length) {
    errorMsg.value = '请先上传图片'
    return
  }
  if (!useModelDetection.value && !useRuleDetection.value) {
    errorMsg.value = '请至少选择一种检测方式'
    return
  }

  if (useRuleDetection.value && !useModelDetection.value) {
    if (picked.length > 1) {
      await runRuleBatch(picked)
    } else {
      await runRuleSingle(picked[0]!)
    }
    return
  }

  if (picked.length > 1) {
    await runV3Batch(picked)
    return
  }

  const one = picked[0]!
  const runRule = useRuleDetection.value

  /** Mock 模式仍走同步 v1（本地假数据），与真实服务异步路径分离 */
  if (isDetectionMockMode()) {
    const bbox: BboxXYXY | null = v3SpecifyBbox.value ? (userBbox.value ?? fullImageBbox()) : fullImageBbox()
    if (!bbox) {
      errorMsg.value = v3SpecifyBbox.value
        ? '请框选区域或等待图片在预览区加载完成'
        : '请等待图片在预览区加载完成后再分析（需读取尺寸以提交整图区域）'
      return
    }
    busy.value = true
    errorMsg.value = null
    viewingHistoryId.value = null
    v3Payload.value = null
    v3TaskId.value = null
    if (vizObjectUrl.value) {
      URL.revokeObjectURL(vizObjectUrl.value)
      vizObjectUrl.value = null
    }
    detectAbort.value?.abort()
    const ac = new AbortController()
    detectAbort.value = ac
    pollStatus.value = ''
    resetRuleCheck()
    try {
      pollStatus.value = '正在提交检测…'
      const data = await submitV1ImageDetectSync(one, bbox, detectSubmitOpts(ac.signal, false, formatImageCreatedAt(one)))
      if (data.error_msg?.trim() && !data.result && !(data.multi?.length)) {
        throw new Error(data.error_msg)
      }
      if (!data.result && !(data.multi?.length)) {
        throw new Error(data.error_msg || '未返回检测结果')
      }
      v3Payload.value = {
        result: data.result ?? null,
        multi: data.multi,
        error_msg: data.error_msg ?? null,
      }
      const taskId = data.task_id?.trim()
      v3TaskId.value = taskId || null
      pollStatus.value = '分析完成'
      viewingHistoryId.value = null
      if (runRule) {
        applyLinkedRuleChecksFromPoll(emptyLinkedRuleChecks(), true)
      }
      void refreshHistoryList()
      if (taskId) void loadViz(taskId)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        pollStatus.value = '已取消'
        return
      }
      errorMsg.value = e instanceof Error ? e.message : String(e)
      pollStatus.value = ''
    } finally {
      detectAbort.value = null
      busy.value = false
    }
    return
  }

  /** 单张与多张一致：v3 异步任务 + 倒计时等待 + 查询结果 */
  const bbox: BboxXYXY | null = v3SpecifyBbox.value ? (userBbox.value ?? fullImageBbox()) : null
  if (v3SpecifyBbox.value && !bbox) {
    errorMsg.value = '请框选区域或等待图片在预览区加载完成'
    return
  }

  busy.value = true
  errorMsg.value = null
  currentBatch.value = generateNextBatch()
  viewingHistoryId.value = null
  v3Payload.value = null
  v3TaskId.value = null
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  detectAbort.value?.abort()
  const ac = new AbortController()
  detectAbort.value = ac
  pollStatus.value = ''
  if (runRule) {
    resetRuleCheck()
    ruleCheckLoading.value = true
  } else {
    resetRuleCheck()
  }
  try {
    pollStatus.value = runRule
      ? '预计等待约 1 分钟（含辅助核查，按每张约 1 分钟估算）'
      : '预计等待约 1 分钟（按每张约 1 分钟估算）'
    await waitMs(300)
    const t0 = performance.now()
    const { taskId, payload } = await runV3AsyncOne(one, bbox, '检测', ac.signal, runRule)
    const elapsed = Math.round(performance.now() - t0)
    aiElapsed.value = elapsed
    if (runRule) ruleCheckElapsed.value = elapsed
    v3TaskId.value = taskId
    v3Payload.value = payload
    pollStatus.value = '分析完成'
    viewingHistoryId.value = null
    void refreshHistoryList()
    void loadViz(taskId)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      pollStatus.value = '已取消'
    } else {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      pollStatus.value = ''
    }
    if (runRule) ruleCheckLoading.value = false
  } finally {
    detectAbort.value = null
    busy.value = false
  }
}

async function runV3Batch(files: File[]) {
  if (!files.length) return
  const filesToRun = files.slice(0, MAX_BATCH_IMAGE_COUNT)
  const limitNotice = filesToRun.length !== files.length
    ? `批量检测最多支持 ${MAX_BATCH_IMAGE_COUNT} 张图片，已忽略超出的 ${files.length - filesToRun.length} 张。`
    : null
  if (v3SpecifyBbox.value) {
    errorMsg.value = '批量检测暂不支持”仅分析框选区域”，请关闭后重试。'
    return
  }
  const runRule = useRuleDetection.value
  busy.value = true
  errorMsg.value = limitNotice
  currentBatch.value = generateNextBatch()
  viewingHistoryId.value = null
  v3Payload.value = null
  v3TaskId.value = null
  if (runRule) {
    resetRuleCheck()
    ruleCheckLoading.value = true
  } else {
    resetRuleCheck()
  }
  if (vizObjectUrl.value) {
    URL.revokeObjectURL(vizObjectUrl.value)
    vizObjectUrl.value = null
  }
  detectAbort.value?.abort()
  const ac = new AbortController()
  detectAbort.value = ac
  try {
    pollStatus.value = runRule
      ? `预计等待约 ${filesToRun.length} 分钟（含辅助核查，按每张约 1 分钟估算）`
      : `预计等待约 ${filesToRun.length} 分钟（按每张约 1 分钟估算）`
    await waitMs(300, ac.signal)
    const uploadSummary = await uploadBatchFiles(filesToRun, '批量检测', ac.signal)
    if (uploadSummary.failed.length > 0) {
      pollStatus.value = `批量检测停止：上传成功 ${uploadSummary.success}/${uploadSummary.total}，最终失败 ${uploadSummary.failed.length}，未开始检测`
      errorMsg.value = formatBatchFailureSummary(uploadSummary.failed)
      if (runRule) ruleCheckLoading.value = false
      return
    }

    const summary = await runStableBatchItems(
      uploadSummary.items,
      '批量检测',
      ac.signal,
      async (item, prefix) => {
        const uploadedTaskId = item.taskId?.trim()
        if (!uploadedTaskId) throw new Error(`${prefix}：上传阶段未返回任务 ID`)
        const t0 = performance.now()
        item.state = 'polling'
        const { taskId, payload } = await runV3AsyncOne(
          item.file,
          null,
          prefix,
          ac.signal,
          runRule,
          formatImageCreatedAt(item.file),
          {
            taskId: uploadedTaskId,
            maxDurationMs: V3_TASK_POLL_MAX_DURATION_MS,
            onTaskId: (taskId) => {
              item.taskId = taskId
              item.state = 'polling'
            },
          },
        )
        const elapsed = Math.round(performance.now() - t0)
        aiElapsed.value = elapsed
        if (runRule) ruleCheckElapsed.value = elapsed
        return { taskId, payload, elapsedMs: elapsed }
      },
      { refreshHistory: true, deleteTaskOnRetry: false },
    )
    v3TaskId.value = summary.lastTaskId
    if (summary.lastPayload) v3Payload.value = summary.lastPayload as V3ViewPayload
    if (summary.lastElapsedMs != null) {
      aiElapsed.value = summary.lastElapsedMs
      if (runRule) ruleCheckElapsed.value = summary.lastElapsedMs
    }
    pollStatus.value = `批量完成：总数 ${summary.total}，成功 ${summary.success}，最终失败 ${summary.failed.length}，上传重试 ${uploadSummary.retryCount}，检测重试 ${summary.retryCount}`
    errorMsg.value = formatBatchFailureSummary(summary.failed)
    if (summary.lastTaskId) void loadViz(summary.lastTaskId)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      pollStatus.value = '已取消'
    } else {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      pollStatus.value = ''
    }
    if (runRule) ruleCheckLoading.value = false
  } finally {
    detectAbort.value = null
    busy.value = false
  }
}

async function loadViz(taskId: string): Promise<boolean> {
  vizLoading.value = true
  try {
    // 若任务尚未完成，后端可能返回 400/{"detail":"Task not completed."}
    // 因此在前端做小范围重试以避免瞬时竞态导致的空白预览
    const maxAttempts = 5
    const delayMs = 1000
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const blob = await getVisualizationBlob(taskId)
        if (vizObjectUrl.value) URL.revokeObjectURL(vizObjectUrl.value)
        vizObjectUrl.value = URL.createObjectURL(blob)
        return true
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // 若为任务未完成导致的错误，则等待后重试，否则立即抛出
        if (msg.includes('Task not completed') || msg.includes('暂时无法连接检测服务') || msg.includes('HTTP 400')) {
          if (attempt < maxAttempts) {
            await waitMs(delayMs)
            continue
          }
          // 最后一次依然失败则当作不可用
          return false
        }
        throw e
      }
    }
    return false
  } catch {
    vizObjectUrl.value = null
    return false
  } finally {
    vizLoading.value = false
  }
}

async function cancelTask() {
  detectAbort.value?.abort()
  const taskIds = new Set<string>()
  const currentTaskId = v3TaskId.value?.trim()
  if (currentTaskId) taskIds.add(currentTaskId)
  for (const item of batchItems.value) {
    const taskId = item.taskId?.trim()
    if (taskId) taskIds.add(taskId)
  }
  for (const taskId of taskIds) {
    try {
      await deleteV3Task(taskId)
    } catch {
      // ignore cancel races; local polling has already been aborted
    }
  }
}

onUnmounted(() => {
  detectAbort.value?.abort()
  window.removeEventListener('keydown', onPreviewLightboxKeydown)
  revokeUploadPreviews()
  if (vizObjectUrl.value) URL.revokeObjectURL(vizObjectUrl.value)
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true" />
          <div>
            <h1 class="brand-title">图片真伪检测</h1>
            <p class="brand-sub">检测图片是否存在后期篡改风险</p>
          </div>
        </div>
        <div class="topbar-actions">
          <div class="topbar-tabs" role="tablist" aria-label="页面切换">
            <button
              type="button"
              class="topbar-tab"
              :class="{ active: appView === 'detect' }"
              @click="showDetectWorkspace"
            >
              检测工作台
            </button>
            <button
              type="button"
              class="topbar-tab"
              :class="{ active: appView === 'manage' }"
              @click="showManagement()"
            >
              数据管理
            </button>
          </div>
          <div class="topbar-health">
            <span v-if="health" class="health-dot" :class="{ 'health-ok': health.status === 'ok', 'health-mock': health.status === 'mock' }" />
            <span v-if="health" class="health-text">
              字体库: {{ health.font_lib_size }} 条 | 模型: {{ health.global_model_loaded ? '已加载' : '未加载' }}
            </span>
            <span v-else-if="healthError" class="health-text health-err">{{ healthError }}</span>
            <span v-else class="health-text">检查中...</span>
          </div>
        </div>
      </div>
    </header>

    <div v-if="appView === 'detect'" class="main">
      <aside class="sidebar">
        <section class="card side-section">
          <h2 class="section-title">检测方式</h2>
          <p class="detect-type-hint">可多选；默认勾选 AI 检测，规则检测为辅助选项，可按需勾选。</p>
          <div class="detect-type-list">
            <label class="detect-type-item">
              <input
                v-model="useModelDetection"
                type="checkbox"
                class="detect-type-input"
                :disabled="busy || (useModelDetection && !useRuleDetection)"
              />
              <span class="detect-type-check" aria-hidden="true" />
              <span class="detect-type-body">
                <span class="detect-type-title">AI 检测</span>
                <span class="detect-type-desc"
                  >自动查找关键区域并汇总结论，适合证件、票据等复杂画面</span
                >
              </span>
            </label>
            <label class="detect-type-item">
              <input
                v-model="useRuleDetection"
                type="checkbox"
                class="detect-type-input"
                :disabled="busy || (useRuleDetection && !useModelDetection)"
              />
              <span class="detect-type-check" aria-hidden="true" />
              <span class="detect-type-body">
                <span class="detect-type-title">规则检测</span>
                <span class="detect-type-desc"
                  >核查拼接痕迹、时间一致性、像素重叠等规则项，辅助 AI 检测选项，可不选取</span
                >
              </span>
            </label>
          </div>
        </section>

        <section class="card side-section">
          <h2 class="section-title">上传图片</h2>
          <input
            ref="uploadInputRef"
            class="sr-only"
            type="file"
            accept="image/*"
            multiple
            @change="onFileChange"
          />
          <div class="upload-select-row">
            <button type="button" class="btn btn-secondary upload-select-btn" :disabled="busy" @click="triggerUploadPick">
              上传图片
            </button>
            <span class="upload-picked-summary">
              {{ files.length ? `已选择 ${files.length}/${MAX_BATCH_IMAGE_COUNT} 张图片` : `最多支持 ${MAX_BATCH_IMAGE_COUNT} 张图片，支持一次选择一张或多张，后续可继续添加` }}
            </span>
          </div>
          <div v-if="files.length > 1" class="upload-picked-list" aria-label="已选图片列表">
            <button
              v-for="(f, i) in files"
              :key="`${f.name}-${i}`"
              type="button"
              class="upload-picked-item"
              :class="{ active: i === selectedUploadIndex }"
              :title="f.name"
              @click="selectedUploadIndex = i"
            >
              <span class="upload-picked-item-name">{{ i + 1 }}. {{ f.name }}</span>
              <span
                class="upload-picked-item-remove"
                role="button"
                title="移除该图片"
                @click.stop="removePickedFile(i)"
                >×</span
              >
            </button>
          </div>

          <div class="option-row">
            <label class="field-label" for="document-time-input">单据时间（可选）</label>
            <input
              id="document-time-input"
              v-model="documentTime"
              type="datetime-local"
              class="field-input"
              :disabled="busy"
            />
            <p class="option-hint">
              付款截图、回单等若需校验状态栏与交易时间，可填写或核对单据上的时间；不填则由系统自动识别。
            </p>
          </div>

          <div class="option-row">
            <label class="switch-label">
              <input v-model="v3SpecifyBbox" type="checkbox" class="switch-input" />
              <span class="switch-ui" />
              <span class="switch-text">仅分析我框出的区域</span>
            </label>
            <p class="option-hint">
              <template v-if="useModelDetection">
                关闭此项时，将由系统自动在图中选取多个关键位置分别判断。
              </template>
              <template v-else>
                不框选时对整图进行规则核查；开启后可指定区域。
              </template>
            </p>
          </div>

          <div v-if="v3SpecifyBbox" class="bbox-hint">
            <p>
              在右侧预览区按住拖拽即可框选。开启本模式后请先框选再开始分析；也可框选整张图范围。
            </p>
            <p v-if="userBbox" class="bbox-coords">
              已选区域（像素）：{{ userBbox.join(', ') }}
            </p>
          </div>
        </section>

        <section class="card side-section actions-card">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy || !files.length"
            @click="runV3"
          >
            <span v-if="busy" class="btn-spinner" />
            {{ busy ? '检测中…' : '提交检测' }}
          </button>
          <button
            v-if="busy"
            type="button"
            class="btn btn-secondary"
            @click="cancelTask"
          >
            取消分析
          </button>

          <div v-if="pollStatus" class="status-line">
            <span class="status-dot" :class="{ pulse: busy }" />
            {{ pollStatus }}
          </div>
          <p v-if="errorMsg" class="alert">{{ errorMsg }}</p>
        </section>

        <section class="card side-section">
          <h2 class="section-title">模型管理</h2>
          <div class="model-info-line">
            <span class="model-info-text">{{ modelInfo }}</span>
          </div>
          <div class="model-actions">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="busy || isDetectionMockMode()"
              @click="handleReload"
            >
              热重载模型
            </button>
            <button
              type="button"
              class="btn btn-warning"
              :disabled="busy || isDetectionMockMode()"
              @click="handleTraining"
            >
              触发训练
            </button>
          </div>
        </section>
      </aside>

      <div class="workspace-wrap">
      <main class="workspace">
        <section class="card workspace-card">
          <div class="workspace-head">
            <h2 class="section-title tight">预览</h2>
            <div class="workspace-head-tags">
              <span v-if="v3SpecifyBbox" class="workspace-tip">框选模式已开启</span>
            </div>
          </div>

          <div
            v-if="activePreviewUrl"
            class="stage"
            @mouseleave="drawing ? onDrawUp() : null"
          >
            <img
              ref="imgRef"
              :src="activePreviewUrl || undefined"
              alt="待检测图片"
              class="preview-img"
              :class="{ 'preview-img-zoomin': !v3SpecifyBbox && !busy }"
              draggable="false"
              @load="onImgLoad"
              @error="onImgError"
              @click="onPreviewImgClick"
            />
            <svg
              v-if="imageNatural.w"
              class="overlay-svg"
              :viewBox="`0 0 ${imageNatural.w} ${imageNatural.h}`"
              preserveAspectRatio="xMidYMid meet"
            >
              <g v-if="previewNumberedRenderList.length">
                <g v-for="item in previewNumberedRenderList" :key="'rg' + item.n">
                  <rect
                    :x="item.bbox[0]"
                    :y="item.bbox[1]"
                    :width="item.bbox[2]"
                    :height="item.bbox[3]"
                    fill="rgba(37, 99, 235, 0.06)"
                    :stroke="regionStrokeForIndex(item.n)"
                    :stroke-width="Math.max(1.1, overlayStroke * 0.75)"
                    :stroke-dasharray="regionDashForIndex(item.n)"
                  />
                  <circle
                    :cx="item.cx"
                    :cy="item.cy"
                    :r="regionLabelMetrics.r"
                    fill="#1d4ed8"
                    stroke="#fff"
                    :stroke-width="Math.max(1, overlayStroke * 0.35)"
                  />
                  <text
                    :x="item.cx"
                    :y="item.cy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    :font-size="regionLabelMetrics.fs * 0.88"
                    font-weight="700"
                    fill="#fff"
                    style="font-family: system-ui, -apple-system, sans-serif"
                  >
                    {{ item.n }}
                  </text>
                </g>
              </g>
              <!-- 建议检测区域（suggested_rois）：框线 + 正交引导线 + 芯片标签 -->
              <g v-for="rect in suggestedRoiRenderRects" :key="'sroi' + rect.idx">
                <!-- 检测框 -->
                <rect
                  :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h"
                  :fill="rect.selected ? hexToRgba(rect.stroke, 0.08) : 'rgba(148,163,184,0.05)'"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(1.5, overlayStroke * 0.9)"
                  :stroke-dasharray="rect.dash"
                  style="cursor: pointer; transition: fill 0.15s, stroke 0.15s; pointer-events: auto;"
                  @click.stop="suggestedRois && toggleRoiIndex(rect.idx)"
                />
                <!-- 框边连接点 -->
                <circle
                  :cx="rect.x + rect.w" :cy="rect.y + rect.h / 2"
                  :r="Math.max(2.5, overlayStroke * 0.28)"
                  :fill="rect.stroke" stroke="none"
                />
                <!-- 正交引导线 -->
                <polyline
                  :points="rect.linePoints"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(0.8, overlayStroke * 0.45)"
                  :stroke-dasharray="rect.selected ? 'none' : '3 2'"
                  fill="none"
                  style="pointer-events: none;"
                />
                <!-- 芯片标签：白色背景 + 彩色边框 + 圆角 -->
                <rect
                  :x="rect.cx" :y="rect.cy" :width="rect.cw" :height="rect.ch"
                  rx="4" ry="4"
                  :fill="rect.selected ? '#ffffff' : '#f8fafc'"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(1.2, overlayStroke * 0.4)"
                  style="pointer-events: none;"
                />
                <text
                  :x="rect.tx" :y="rect.ty"
                  :text-anchor="rect.tx > imageNatural.w / 2 ? 'end' : 'start'"
                  dominant-baseline="central"
                  :font-size="Math.max(11, Math.min(14, imageNatural.w * 0.014))"
                  :font-weight="700"
                  :fill="rect.stroke"
                  style="font-family: system-ui, -apple-system, sans-serif; pointer-events: none;"
                >{{ rect.displayLabel }}</text>
              </g>
              <rect
                v-if="userBboxXYWH && !v3Payload"
                :x="userBboxXYWH[0]"
                :y="userBboxXYWH[1]"
                :width="userBboxXYWH[2]"
                :height="userBboxXYWH[3]"
                fill="rgba(14, 165, 233, 0.12)"
                stroke="#0ea5e9"
                :stroke-width="overlayStroke"
                stroke-dasharray="8 6"
              />
              <rect
                v-if="drawPreviewBbox"
                :x="drawPreviewBbox.x1"
                :y="drawPreviewBbox.y1"
                :width="drawPreviewBbox.x2 - drawPreviewBbox.x1"
                :height="drawPreviewBbox.y2 - drawPreviewBbox.y1"
                fill="rgba(14, 165, 233, 0.18)"
                stroke="#0284c7"
                :stroke-width="overlayStroke"
              />
            </svg>
            <div
              v-if="v3SpecifyBbox"
              class="draw-layer"
              @mousedown.prevent="onDrawDown"
              @mousemove="onDrawMove"
              @mouseup="onDrawUp"
            />
          </div>

          <div v-if="files.length" class="preview-file-info">
            <div class="preview-file-name" :title="files[selectedUploadIndex]?.name">
              📄 {{ files[selectedUploadIndex]?.name || '-' }}
            </div>
            <div class="preview-file-meta-row">
              <span>{{ files[selectedUploadIndex] ? formatFileSize(files[selectedUploadIndex]!.size) : '-' }}</span>
              <span class="preview-file-info-sep">·</span>
              <span>{{ selectedFileImageCreatedAt || '-' }}</span>
            </div>
          </div>

          <div v-else class="empty-preview">
            <p>请先在左侧上传一张图片</p>
            <p v-if="viewingHistoryId" class="history-preview-hint">
              当前正在查看历史记录，检测图片与结论见右侧「检测报告」。
            </p>
          </div>
        </section>

        <section class="card workspace-card results-card">
          <div class="workspace-head">
            <h2 class="section-title tight">检测报告</h2>
            <div class="workspace-head-tags">
              <span v-if="viewingHistoryId" class="workspace-tip workspace-tip-muted"
                >历史记录</span
              >
            </div>
          </div>

          <div v-if="viewingHistoryEntry" class="history-file-meta">
            <div class="history-file-name" :title="viewingHistoryEntry.fileName"
              >📄 {{ viewingHistoryEntry.fileName }}</div
            >
            <div class="history-file-time">{{ viewingHistoryEntry.imageCreatedAt || '—' }}</div>
          </div>

          <div v-if="hasAiReport" class="report">
            <template v-if="aiReportResult">
              <div class="report-head">
                <span
                  class="pill"
                  :class="aiReportResult.result || undefined"
                  >{{ aiReportResult.result || '—' }}</span
                >
                <span v-if="aiElapsed != null" class="rule-check-elapsed">{{
                  aiElapsed >= 1000
                    ? (aiElapsed / 1000).toFixed(1) + ' 秒'
                    : aiElapsed + ' ms'
                }}</span>
                <div class="meter-wrap">
                  <div class="meter-label">
                    <span>风险倾向</span>
                    <span>{{
                      ((aiReportResult.confidence ?? 0) * 100).toFixed(1)
                    }}%</span>
                  </div>
                  <div class="meter">
                    <div
                      class="meter-fill"
                      :style="{
                        width: `${Math.min(
                          100,
                          Math.max(0, (aiReportResult.confidence ?? 0) * 100),
                        )}%`,
                      }"
                    />
                  </div>
                </div>
              </div>
              <p class="report-reason">{{ aiReportResult.reason || '—' }}</p>
              <div v-if="summaryExtendedLines.length" class="detect-ext-block">
                <h4 class="detect-ext-title">扩展字段</h4>
                <dl class="detect-ext-dl">
                  <template v-for="row in summaryExtendedLines" :key="'sum-' + row.label">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ row.value }}</dd>
                  </template>
                </dl>
              </div>
              <div v-if="!currentTaskFeedbackStatus" class="feedback-row">
                <span class="feedback-label">人工审核结果</span>
                <button
                  type="button"
                  class="btn btn-feedback btn-feedback-correct"
                  :disabled="isDetectionMockMode() || feedbackSubmitting[v3TaskId + '-0']"
                  @click="handleFeedback(v3TaskId ?? '', 0, 'correct')"
                >
                  {{ feedbackSubmitting[v3TaskId + '-0'] ? '...' : '正确' }}
                </button>
                <button
                  type="button"
                  class="btn btn-feedback btn-feedback-wrong"
                  :disabled="isDetectionMockMode() || feedbackSubmitting[v3TaskId + '-0']"
                  @click="handleFeedback(v3TaskId ?? '', 0, 'wrong')"
                >
                  {{ feedbackSubmitting[v3TaskId + '-0'] ? '...' : '错误' }}
                </button>
              </div>
            </template>

            <div v-if="reportMultiDetailRows.length" class="multi-block">
              <h3 class="multi-heading">各区域明细</h3>
              <div class="multi-scroll">
                <ul class="multi-list">
                  <li v-for="row in reportMultiDetailRows" :key="row.regionNo">
                    <div class="multi-li-top">
                      <span class="region-idx">{{ row.regionNo }}号 · {{ row.fieldLabel }}</span>
                      <span class="pill sm" :class="row.item.result || undefined">{{
                        row.item.result || '—'
                      }}</span>
                      <span class="multi-confidence"
                        >{{ ((row.item.confidence ?? 0) * 100).toFixed(1) }}%</span
                      >
                    </div>
                    <p class="multi-reason">{{ row.item.reason }}</p>
                    <dl
                      v-if="itemShowsExtended(row.item)"
                      class="detect-ext-dl compact"
                    >
                      <template
                        v-for="ext in extendedLinesForItem(row.item)"
                        :key="'m' + row.regionNo + ext.label"
                      >
                        <dt>{{ ext.label }}</dt>
                        <dd>{{ ext.value }}</dd>
                      </template>
                    </dl>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            v-if="ruleCheckLoading || ruleCheckError || ruleCheckPayload"
            class="rule-check-block"
            aria-labelledby="rule-check-heading"
          >
            <h3 id="rule-check-heading" class="rule-check-heading">
              {{ hasAiReport ? '辅助核查' : '规则检测' }}
            </h3>

            <p v-if="ruleCheckLoading" class="rule-check-status">加载中…</p>
            <p v-else-if="ruleCheckError" class="rule-check-error">{{ ruleCheckError }}</p>

            <template v-else-if="ruleCheckPayload && ruleCheckUserView">
              <div class="rule-check-summary">
                <span
                  class="pill sm"
                  :class="ruleCheckVerdictInfo.pillClass || undefined"
                  >{{ ruleCheckVerdictInfo.label }}</span
                >
                <span v-if="ruleCheckElapsed != null" class="rule-check-elapsed">{{
                  ruleCheckElapsed >= 1000
                    ? (ruleCheckElapsed / 1000).toFixed(1) + ' 秒'
                    : ruleCheckElapsed + ' ms'
                }}</span>
                <p class="rule-check-reason">{{ ruleCheckUserView.summary }}</p>
              </div>

              <p v-if="ruleCheckPayload.available === false" class="rule-check-unavailable">
                规则检测未执行或结果不可用
              </p>

              <ul v-else-if="ruleCheckUserView.findings.length" class="rule-check-findings">
                <li
                  v-for="(item, idx) in ruleCheckUserView.findings"
                  :key="idx"
                  class="rule-check-finding"
                  :class="'rule-check-finding--' + item.status"
                >
                  <span class="rule-check-finding-icon" aria-hidden="true">{{
                    item.status === 'ok' ? '✓' : item.status === 'warn' ? '!' : '×'
                  }}</span>
                  <div class="rule-check-finding-body">
                    <div class="rule-check-finding-head">
                      <strong v-if="item.title" class="rule-check-finding-title">{{
                        item.title
                      }}</strong>
                      <span
                        class="rule-check-result-badge"
                        :class="'rule-check-result-badge--' + item.status"
                      >{{ item.resultLabel }}</span>
                      <span class="rule-check-help" tabindex="0" :aria-label="item.explanation">
                        ?
                        <span class="rule-check-help-tip">{{ item.explanation }}</span>
                      </span>
                    </div>
                    <p class="rule-check-finding-result">{{ item.resultText }}</p>
                    <p class="rule-check-finding-text">{{ item.text }}</p>
                    <dl v-if="item.details && item.details.length" class="rule-check-details">
                      <template v-for="(detail, dIdx) in item.details" :key="dIdx">
                        <dt>{{ detail.label }}</dt>
                        <dd>{{ detail.value }}</dd>
                      </template>
                    </dl>
                  </div>
                </li>
              </ul>

              <p v-else class="rule-check-no-findings">暂无检测数据</p>

              <!-- 高压缩图片误报提示 -->
              <p
                v-if="ruleCheckUserView?.highCompressionNote"
                class="rule-check-compression-note"
              >{{ ruleCheckUserView.highCompressionNote }}</p>

              <!-- 建议检测区域（suggested_rois） -->
              <div
                v-if="suggestedRois && suggestedRois.length > 0 && !ruleCheckPayload?.pixel_overlap"
                class="suggested-rois-block"
              >
                <h4 class="suggested-rois-heading">建议检测区域</h4>
                <p class="suggested-rois-hint">
                  系统识别到以下可能被修改的区域，勾选或直接在图片上点击框线即可选中；选中后点击"检测选中区域"。
                </p>
                <p
                  v-if="suggestedRois.every(r => r.priority >= 5)"
                  class="suggested-rois-low-conf"
                >当前所有区域均为自动检测（准确度较低），建议人工判断后再勾选。</p>
                <p
                  v-if="suggestedRois.length > 0"
                  class="suggested-rois-legend"
                >
                  <strong>关键区域</strong>：自动检测优先关注金额、姓名、时间三类字段。
                  <strong>P6</strong>：低优先级金额候选，准确度低于明确字段标签定位。
                </p>
                <div class="suggested-rois-toolbar">
                  <button
                    type="button"
                    class="btn-text"
                    :disabled="roiDetectBusy"
                    @click="selectAllRois"
                  >全选</button>
                  <button
                    type="button"
                    class="btn-text"
                    :disabled="roiDetectBusy"
                    @click="deselectAllRois"
                  >取消全选</button>
                </div>
                <ul class="suggested-rois-list">
                  <li
                    v-for="(roi, idx) in suggestedRois"
                    :key="idx"
                    class="suggested-rois-item"
                    :class="{ 'suggested-rois-item--selected': isRoiSelected(idx) }"
                    :title="roi.label"
                  >
                    <label class="suggested-rois-label">
                      <input
                        type="checkbox"
                        :checked="isRoiSelected(idx)"
                        :disabled="roiDetectBusy"
                        @change="toggleRoiIndex(idx)"
                      />
                      <span
                        class="roi-color-dot"
                        :style="{ background: isRoiSelected(idx) ? roiStrokeForIndex(idx) : '#cbd5e1' }"
                      ></span>
                      <span class="roi-idx-label">A{{ idx + 1 }}</span>
                      <span class="roi-category" :class="'roi-cat--' + (roi.priority <= 3 ? 'high' : 'normal')">
                        {{ roi.category }}
                      </span>
                      <span class="roi-priority">P{{ roi.priority }}</span>
                    </label>
                  </li>
                </ul>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="roiDetectBusy || selectedRoiIndices.length === 0"
                  @click="runRoiDetect(files[selectedUploadIndex])"
                >
                  <span v-if="roiDetectBusy" class="btn-spinner" />
                  {{ roiDetectBusy ? '检测中…' : '检测选中区域' }}
                </button>
              </div>
            </template>
          </div>

          <div
            v-if="
              hasReportContent &&
              (vizLoading || vizObjectUrl || reportImageUrl || historySchematicSpec)
            "
            class="report-images"
          >
            <div v-if="viewingHistoryId && hasAiReport && vizLoading" class="history-viz-loading">
              正在加载标注示意图…
            </div>

            <div v-if="vizObjectUrl" class="viz-wrap">
              <h3 class="viz-heading">标注示意图</h3>
              <div class="viz-frame">
                <img
                  :src="vizObjectUrl"
                  alt="检测标注示意"
                  class="viz-img viz-img-zoomin"
                  @click="openPreviewLightbox(vizObjectUrl)"
                />
              </div>
            </div>

            <div v-else-if="reportImageUrl" class="viz-wrap">
              <h3 class="viz-heading">{{ reportImageHeading }}</h3>
              <div class="viz-frame">
                <img
                  :src="reportImageUrl"
                  alt="检测图片"
                  class="viz-img viz-img-zoomin"
                  @click="openPreviewLightbox(reportImageUrl)"
                />
              </div>
            </div>

            <div
              v-if="viewingHistoryId && historySchematicSpec"
              class="history-schematic-wrap history-schematic-wrap--report"
            >
              <p class="history-schematic-title">区域位置示意</p>
              <p class="history-schematic-note">
                服务端未保留原图或标注图，仅根据检测坐标绘制示意框线。
              </p>
              <svg
                class="history-schematic-svg"
                :viewBox="historySchematicSpec.viewBox"
                preserveAspectRatio="xMidYMid meet"
              >
                <g v-for="item in historySchematicRenderList" :key="'hs' + item.n">
                  <rect
                    :x="item.bbox[0]"
                    :y="item.bbox[1]"
                    :width="item.bbox[2]"
                    :height="item.bbox[3]"
                    fill="rgba(37, 99, 235, 0.08)"
                    :stroke="regionStrokeForIndex(item.n)"
                    stroke-width="2"
                    :stroke-dasharray="regionDashForIndex(item.n)"
                  />
                  <circle
                    :cx="item.cx"
                    :cy="item.cy"
                    :r="item.r"
                    fill="#1d4ed8"
                    stroke="#fff"
                    stroke-width="1.5"
                  />
                  <text
                    :x="item.cx"
                    :y="item.cy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    :font-size="item.fs * 0.88"
                    font-weight="700"
                    fill="#fff"
                    style="font-family: system-ui, -apple-system, sans-serif"
                  >
                    {{ item.n }}
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <p v-if="vizHintMissing" class="viz-miss-hint">
            本条任务的标注图在服务端已过期或未生成；可结合下方检测图片与文字结论查看。
          </p>

          <p
            v-if="!hasReportContent && !errorMsg && !busy"
            class="empty-report"
          >
            完成检测后，将在此展示结论、说明与示意图。
          </p>
        </section>
      </main>
      </div>

      <aside class="history-aside" aria-label="历史记录">
        <section class="card side-section history-card">
          <div class="history-head">
            <h2 class="section-title history-title-merged">历史记录</h2>
            <button
              type="button"
              class="btn-text-refresh"
              :disabled="historyLoading"
              @click="refreshHistoryList"
            >
              {{ historyLoading ? '加载中…' : '刷新' }}
            </button>
          </div>
          <p class="history-api-hint">来自服务端近 7 日记录；AI+规则 仅展示 async_v3 主记录，附属 rule_checks 已合并或隐藏</p>
          <p v-if="historyError" class="history-error">{{ historyError }}</p>
          <p
            v-if="!historyLoading && !historyEntries.length && !historyError"
            class="history-empty"
          >
            暂无记录。
          </p>
          <ul v-if="historyEntries.length" class="history-list" aria-label="检测历史列表">
            <li
              v-for="h in historyEntries"
              :key="h.id"
              class="history-row"
              :class="{ active: isHistoryRowActive(h) }"
            >
              <button
                type="button"
                class="history-main"
                @click="applyHistoryEntry(h)"
              >
                <span class="history-meta">
                  <span class="history-time">{{ formatHistoryTime(h.savedAt) }}</span>
                  <span v-if="historyKindLabel(h)" class="history-kind">{{
                    historyKindLabel(h)
                  }}</span>
                </span>
                <span class="history-file" :title="h.fileName">{{
                  truncateName(h.fileName)
                }}</span>
                <span class="history-file-time">{{ h.imageCreatedAt || '—' }}</span>
                <span v-if="h.batch" class="history-batch">批次：{{ formatBatchShort(h.batch) }}</span>
                <span class="pill sm history-pill" :class="historyPillClass(h)">{{
                  historyResultLabel(h)
                }}</span>
              </button>
              <div
                v-if="h.feedbackStatus"
                class="history-correction"
              >
                <div class="history-correction-divider">
                  <span class="history-correction-divider-line" />
                  <span class="history-correction-divider-text">人工审核</span>
                  <span class="history-correction-divider-line" />
                </div>
                <span class="pill sm history-correction-pill" :class="h.feedbackStatus">
                  {{ judgmentText(h.feedbackStatus) }}
                </span>
                <span class="history-correction-icon">{{
                  h.feedbackStatus === 'correct' ? '✓' : h.feedbackStatus === 'wrong' ? '✗' : '—'
                }}</span>
                <span v-if="h.taskId && feedbackByTaskId.get(h.taskId)" class="history-correction-time">{{
                  correctionTimestamp(feedbackByTaskId.get(h.taskId!))
                }}</span>
              </div>
            </li>
          </ul>
          <div v-if="historyTotal > 0" class="history-footer">
            <span class="history-count">
              共 {{ historyTotal }} 条，第 {{ historyPage }} /
              {{ historyTotalPages || 1 }} 页（每页最多 {{ HISTORY_PAGE_SIZE }} 条）
            </span>
            <div class="history-pager" role="navigation" aria-label="历史记录分页">
              <button
                type="button"
                class="btn-history-page"
                :disabled="historyLoading || !historyCanPrev"
                @click="goHistoryPage(historyPage - 1)"
              >
                上一页
              </button>
              <button
                type="button"
                class="btn-history-page"
                :disabled="historyLoading || !historyCanNext"
                @click="goHistoryPage(historyPage + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <main v-else class="manage-main">
      <section class="manage-toolbar card">
        <div>
          <h2 class="manage-title">数据管理</h2>
          <p class="manage-subtitle">反馈标注、训练样本、历史记录与数据导出</p>
        </div>
        <div class="manage-tabs" role="tablist" aria-label="数据管理分类">
          <button
            type="button"
            class="manage-tab"
            :class="{ active: manageTab === 'feedback' }"
            @click="showManagement('feedback')"
          >
            反馈标注
          </button>
          <button
            type="button"
            class="manage-tab"
            :class="{ active: manageTab === 'dataset' }"
            @click="showManagement('dataset')"
          >
            训练集
          </button>
          <button
            type="button"
            class="manage-tab"
            :class="{ active: manageTab === 'history' }"
            @click="showManagement('history')"
          >
            历史记录
          </button>
          <button
            type="button"
            class="manage-tab"
            :class="{ active: manageTab === 'export' }"
            @click="showManagement('export')"
          >
            数据导出
          </button>
        </div>
      </section>

      <section v-if="manageTab === 'feedback'" class="manage-grid">
        <div class="card manage-list-card">
          <div class="manage-card-head">
            <h3 class="section-title tight">反馈列表</h3>
            <button type="button" class="btn-text-refresh" :disabled="feedbackLoading" @click="loadFeedbackEntries">
              {{ feedbackLoading ? '加载中…' : '刷新' }}
            </button>
          </div>
          <div class="manage-filter-row">
            <button
              v-for="f in (['all', 'suspicious', 'wrong', 'correct'] as const)"
              :key="f"
              type="button"
              class="filter-chip"
              :class="{ active: feedbackFilter === f }"
              @click="feedbackFilter = f; loadFeedbackEntries()"
            >
              {{ f === 'all' ? '全部' : judgmentText(f) }}
            </button>
          </div>
          <div class="manage-date-filter-wrap">
            <span class="filter-label">反馈日期：</span>
          </div>
          <div class="manage-date-filter-controls">
            <input
              type="date"
              class="filter-date-input"
              :value="feedbackDateFrom"
              @input="feedbackDateFrom = ($event.target as HTMLInputElement).value"
            />
            <span class="filter-date-sep">~</span>
            <input
              type="date"
              class="filter-date-input"
              :value="feedbackDateTo"
              @input="feedbackDateTo = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="filter-chip"
              :class="{ active: feedbackDateFrom || feedbackDateTo }"
              @click="clearFeedbackDateFilter"
            >
              清除
            </button>
          </div>
          <p v-if="feedbackError" class="history-error">{{ feedbackError }}</p>
          <p v-if="!feedbackLoading && !filteredFeedbackEntries.length && !feedbackError" class="history-empty">
            <template v-if="feedbackDateFrom || feedbackDateTo">
              当前筛选条件下无反馈记录。
            </template>
            <template v-else>
              暂无反馈标注。
            </template>
          </p>
          <ul v-if="filteredFeedbackEntries.length" class="manage-list">
            <li
              v-for="entry in filteredFeedbackEntries"
              :key="entry.folder_name"
              class="manage-row"
              :class="{ active: selectedFeedbackFolder === entry.folder_name }"
            >
              <button type="button" class="manage-row-main" @click="selectedFeedbackFolder = entry.folder_name">
                <span class="manage-row-top">
                  <span class="pill sm" :class="feedbackResultText(entry)">{{ feedbackResultText(entry) }}</span>
                  <span class="feedback-row-time">{{ feedbackListTime(entry) }}</span>
                  <span class="feedback-row-right">
                    <span class="feedback-audit-label">人工审核</span>
                    <span class="pill sm feedback-judgment-pill" :class="entry.judgment">{{ judgmentText(entry.judgment) }}</span>
                  </span>
                </span>
                <span class="history-file">{{ entry.task_id || entry.folder_name }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="card manage-detail-card">
          <template v-if="selectedFeedback">
            <div class="manage-card-head">
              <h3 class="section-title tight">反馈详情</h3>
              <span class="history-kind">{{ selectedFeedback.folder_name }}</span>
            </div>
            <div class="manage-detail-layout">
              <div class="manage-image-frame">
                <img
                  v-if="feedbackImageUrl(selectedFeedback)"
                  :src="feedbackImageUrl(selectedFeedback)"
                  alt="反馈原图"
                  class="manage-image"
                />
                <p v-else class="history-empty">无可用原图</p>
              </div>
              <div class="manage-detail-body">
                <dl class="manage-facts">
                  <div><dt>当前标注</dt><dd class="feedback-detail-judgment">{{ judgmentText(selectedFeedback.judgment) }}<span class="feedback-check">✔</span></dd></div>
                  <div><dt>AI 原判</dt><dd>{{ feedbackResultText(selectedFeedback) }} · {{ feedbackConfidenceText(selectedFeedback) }}</dd></div>
                  <div><dt>任务</dt><dd>{{ selectedFeedback.task_id || '—' }}</dd></div>
                  <div><dt>时间</dt><dd>{{ selectedFeedback.timestamp || selectedFeedback.updated_at || '—' }}</dd></div>
                </dl>
                <p class="manage-reason">{{ feedbackReason(selectedFeedback) }}</p>
                <div class="manage-actions">
                  <button
                    type="button"
                    class="btn btn-feedback btn-feedback-correct"
                    :disabled="feedbackActionBusy[selectedFeedback.folder_name + ':correct']"
                    @click="changeFeedbackJudgment(selectedFeedback, 'correct')"
                  >
                    确认为正确
                  </button>
                  <button
                    type="button"
                    class="btn btn-feedback btn-feedback-wrong"
                    :disabled="feedbackActionBusy[selectedFeedback.folder_name + ':wrong']"
                    @click="changeFeedbackJudgment(selectedFeedback, 'wrong')"
                  >
                    确认为错误
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="feedbackActionBusy[selectedFeedback.folder_name + ':delete']"
                    @click="removeFeedbackEntry(selectedFeedback)"
                  >
                    删除标注
                  </button>
                </div>
              </div>
            </div>
          </template>
          <p v-else class="history-empty">请选择一条反馈记录。</p>
        </div>
      </section>

      <section v-else-if="manageTab === 'dataset'" class="manage-grid">
        <div class="card manage-list-card">
          <div class="manage-card-head">
            <h3 class="section-title tight">训练样本</h3>
            <button type="button" class="btn-text-refresh" :disabled="datasetLoading" @click="loadDatasetEntries">
              {{ datasetLoading ? '加载中…' : '刷新' }}
            </button>
          </div>
          <div v-if="datasetSummary" class="manage-summary-row">
            <span>总数 {{ datasetSummary.total }}</span>
            <span>正常 {{ datasetSummary.normal }}</span>
            <span>篡改 {{ datasetSummary.tampered }}</span>
            <span>标注 {{ datasetSummary.annotations }}</span>
          </div>
          <div class="manage-filter-row">
            <button
              v-for="f in (['all', 0, 1] as const)"
              :key="String(f)"
              type="button"
              class="filter-chip"
              :class="{ active: datasetFilter === f }"
              @click="datasetFilter = f; loadDatasetEntries()"
            >
              {{ f === 'all' ? '全部' : datasetLabelText(f) }}
            </button>
            <label class="dataset-toggle">
              <input v-model="datasetIncludeEnhanced" type="checkbox" @change="loadDatasetEntries" />
              <span>包含增强样本</span>
            </label>
          </div>
          <p v-if="datasetError" class="history-error">{{ datasetError }}</p>
          <p v-if="!datasetLoading && !datasetEntries.length && !datasetError" class="history-empty">
            暂无训练样本。
          </p>
          <ul v-if="datasetEntries.length" class="manage-list">
            <li
              v-for="entry in datasetEntries"
              :key="entry.filename"
              class="manage-row"
              :class="{ active: selectedDatasetFilename === entry.filename }"
            >
              <button type="button" class="manage-row-main" @click="selectDatasetEntry(entry)">
                <span class="manage-row-top">
                  <span class="pill sm" :class="datasetPillClass(entry)">{{ datasetLabelText(entry.label) }}</span>
                  <span v-if="entry.is_enhanced" class="history-kind">增强</span>
                  <span v-if="entry.has_annotation" class="history-kind">JSON</span>
                </span>
                <span class="history-file">{{ entry.filename }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="card manage-detail-card">
          <template v-if="selectedDatasetEntry">
            <div class="manage-card-head">
              <h3 class="section-title tight">样本详情</h3>
              <span class="history-kind">{{ selectedDatasetEntry.filename }}</span>
            </div>
            <div class="manage-detail-layout">
              <div class="manage-image-frame">
                <img
                  v-if="datasetImageUrl(selectedDatasetEntry)"
                  :src="datasetImageUrl(selectedDatasetEntry)"
                  alt="训练样本"
                  class="manage-image"
                />
                <p v-else class="history-empty">无可用图片</p>
              </div>
              <div class="manage-detail-body">
                <dl class="manage-facts">
                  <div><dt>训练标签</dt><dd>{{ datasetLabelText(selectedDatasetEntry.label) }}</dd></div>
                  <div><dt>尺寸</dt><dd>{{ datasetDimsText(selectedDatasetEntry) }}</dd></div>
                  <div><dt>大小</dt><dd>{{ datasetSizeText(selectedDatasetEntry.size_bytes) }}</dd></div>
                  <div><dt>标注 JSON</dt><dd>{{ selectedDatasetEntry.json_name || '—' }}</dd></div>
                </dl>
                <div class="manage-actions">
                  <button
                    type="button"
                    class="btn btn-feedback btn-feedback-correct"
                    :disabled="datasetActionBusy[selectedDatasetEntry.filename + ':0']"
                    @click="changeDatasetLabel(selectedDatasetEntry, 0)"
                  >
                    标为正常
                  </button>
                  <button
                    type="button"
                    class="btn btn-feedback btn-feedback-wrong"
                    :disabled="datasetActionBusy[selectedDatasetEntry.filename + ':1']"
                    @click="changeDatasetLabel(selectedDatasetEntry, 1)"
                  >
                    标为篡改
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="datasetActionBusy[selectedDatasetEntry.filename + ':delete']"
                    @click="removeDatasetEntry(selectedDatasetEntry)"
                  >
                    删除样本
                  </button>
                </div>
                <div class="dataset-json-panel">
                  <div class="manage-card-head dataset-json-head">
                    <h4>区域标注</h4>
                    <button
                      type="button"
                      class="btn-text-refresh"
                      :disabled="datasetAnnotationLoading || !selectedDatasetEntry.has_annotation"
                      @click="loadDatasetAnnotation(selectedDatasetEntry)"
                    >
                      {{ datasetAnnotationLoading ? '加载中…' : '刷新' }}
                    </button>
                  </div>
                  <p v-if="datasetAnnotationError" class="history-error">{{ datasetAnnotationError }}</p>
                  <pre v-else-if="datasetAnnotationText()" class="dataset-json">{{ datasetAnnotationText() }}</pre>
                  <p v-else class="history-empty">无区域标注 JSON。</p>
                </div>
              </div>
            </div>
          </template>
          <p v-else class="history-empty">请选择一个训练样本。</p>
        </div>
      </section>

      <section v-else-if="manageTab === 'export'" class="manage-export-wrap">
        <div class="card manage-export-card">
          <div class="manage-card-head">
            <h3 class="section-title tight">鉴伪历史导出</h3>
          </div>
          <p class="export-hint">
            按时间范围筛选鉴伪历史，先预览统计再打包下载 ZIP（含 manifest 与图片）。默认日期为最近 7 天，精确到秒；可选批次号精确筛选。
          </p>
          <div class="manage-date-filter-wrap">
            <span class="filter-label">检测时间：</span>
          </div>
          <div class="manage-date-filter-controls">
            <input
              type="datetime-local"
              class="filter-date-input"
              step="1"
              v-model="exportDateFrom"
            />
            <span class="filter-date-sep">~</span>
            <input
              type="datetime-local"
              class="filter-date-input"
              step="1"
              v-model="exportDateTo"
            />
          </div>
          <div class="manage-filter-row export-filter-block">
            <span class="filter-label">批次号：</span>
            <input
              type="text"
              class="filter-batch-input"
              v-model="exportBatchSeq"
              inputmode="numeric"
              placeholder="填写序号，如 1，留空表示全部"
            />
            <span class="export-filter-note">（日期取上方检测时间起始日）</span>
          </div>
          <div class="manage-filter-row export-filter-block">
            <span class="filter-label">鉴伪结论：</span>
            <button
              v-for="r in (['正常', '可疑', '篡改'] as const)"
              :key="r"
              type="button"
              class="filter-chip"
              :class="{ active: exportDetectionResults.includes(r) }"
              @click="toggleExportDetectionResult(r)"
            >
              {{ r }}
            </button>
            <span class="export-filter-note">不选表示全部</span>
          </div>
          <div class="manage-filter-row export-filter-block">
            <span class="filter-label">ZIP 内图片：</span>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: exportImageVariant === 'original' }"
              @click="exportImageVariant = 'original'"
            >
              原图
            </button>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: exportImageVariant === 'annotated' }"
              @click="exportImageVariant = 'annotated'"
            >
              标注图
            </button>
          </div>
          <div class="manage-actions export-actions">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="exportPreviewLoading || exportZipBusy"
              @click="runHistoryExportPreview"
            >
              <span v-if="exportPreviewLoading" class="btn-spinner export-spinner-dark" />
              {{ exportPreviewLoading ? '统计中…' : '预览统计' }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="
                exportZipBusy ||
                exportPreviewLoading ||
                !exportPreview ||
                exportPreview.exceeds_limit ||
                exportPreview.total_matched <= 0
              "
              @click="runHistoryExportDownload"
            >
              <span v-if="exportZipBusy" class="btn-spinner" />
              {{ exportZipBusy ? '打包中…' : '下载 ZIP' }}
            </button>
          </div>
          <p v-if="exportPreviewError" class="history-error">{{ exportPreviewError }}</p>
          <p v-if="exportDownloadHint" class="export-download-ok">{{ exportDownloadHint }}</p>
          <div v-if="exportPreview" class="export-summary card-inner">
            <div class="manage-summary-row export-summary-row">
              <span>匹配 {{ exportPreview.total_matched }} 条</span>
              <span>有图 {{ exportPreview.with_image }}</span>
              <span>无图 {{ exportPreview.without_image }}</span>
              <span>上限 {{ exportPreview.export_max_records }}</span>
            </div>
            <p v-if="exportPreview.exceeds_limit" class="export-limit-warn">
              匹配条数超过单次导出上限，请缩小时间或筛选条件后再导出。
            </p>
            <p v-else-if="exportPreview.total_matched <= 0" class="history-empty">
              当前条件下无记录。
            </p>
            <p v-if="exportPreview.preview_truncated" class="export-truncate-hint">
              下方列表已截断（最多展示部分明细），以「匹配条数」为准。
            </p>
          </div>
          <ul v-if="exportPreview?.list?.length" class="manage-list export-preview-list">
            <li v-for="item in exportPreview.list" :key="item.id" class="export-preview-row">
              <div class="export-preview-main">
                <span class="manage-row-top">
                  <span class="pill sm" :class="item.detection_result">{{ item.detection_result || '—' }}</span>
                  <span class="history-kind">{{ exportModeLabel(item.mode) }}</span>
                  <span class="history-kind">{{ exportBboxModeLabel(item.bbox_mode) }}</span>
                  <span
                    v-if="item.feedback_status"
                    class="history-kind history-kind--feedback"
                    :class="item.feedback_status"
                  >{{ exportFeedbackStatusLabel(item.feedback_status) }}</span>
                  <span v-if="!item.has_image" class="history-kind">无图</span>
                  <span v-if="item.batch" class="history-kind">批次：{{ formatBatchShort(item.batch) }}</span>
                  <span class="feedback-row-time">{{ formatHistoryTime(item.created_at) }}</span>
                </span>
                <span class="history-file" :title="item.original_filename || ''">{{
                  truncateName(item.original_filename || String(item.id), 28)
                }}</span>
              </div>
              <div
                v-if="exportPreviewImageSrc(item)"
                class="export-preview-thumb"
                @click="openPreviewLightbox(exportPreviewImageSrc(item))"
              >
                <img
                  :src="exportPreviewImageSrc(item)"
                  alt=""
                  class="export-thumb-img"
                  loading="lazy"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section v-else-if="manageTab === 'history'" class="manage-grid">
        <div class="card manage-list-card">
          <div class="manage-card-head">
            <h3 class="section-title tight">历史记录</h3>
            <button type="button" class="btn-text-refresh" :disabled="managedHistoryLoading" @click="loadManagedHistory">
              {{ managedHistoryLoading ? '加载中…' : '刷新' }}
            </button>
          </div>
          <p v-if="managedHistoryError" class="history-error">{{ managedHistoryError }}</p>
          <p v-if="!managedHistoryLoading && !managedHistoryRows.length && !managedHistoryError" class="history-empty">
            暂无历史记录。
          </p>
          <ul v-if="managedHistoryRows.length" class="manage-list">
            <li
              v-for="entry in managedHistoryRows"
              :key="entry.id"
              class="manage-row"
              :class="{ active: selectedManagedHistoryId === entry.id }"
            >
              <button type="button" class="manage-row-main" @click="selectedManagedHistoryId = entry.id">
                <span class="manage-row-top">
                  <span class="pill sm" :class="historyPillClass(entry)">{{ historyResultLabel(entry) }}</span>
                  <span class="history-kind">{{ historyKindLabel(entry) || '历史' }}</span>
                  <span
                    v-if="historyFeedbackStatusLabel(entry)"
                    class="history-kind history-kind--feedback"
                    :class="historyFeedbackStatusPillClass(entry)"
                  >{{ historyFeedbackStatusLabel(entry) }}</span>
                </span>
                <span class="history-file">{{ entry.fileName }}</span>
                <span class="history-file-time">{{ entry.imageCreatedAt || '—' }}</span>
                <span v-if="entry.batch" class="history-batch">批次：{{ formatBatchShort(entry.batch) }}</span>
              </button>
              <button
                type="button"
                class="manage-row-delete"
                :disabled="managedHistoryActionBusy[entry.id]"
                @click="removeManagedHistory(entry)"
              >
                删除
              </button>
            </li>
          </ul>
        </div>

        <div class="card manage-detail-card">
          <template v-if="selectedManagedHistory">
            <div class="manage-card-head">
              <h3 class="section-title tight">历史详情</h3>
              <span class="history-kind">{{ selectedManagedHistory.savedAt }}</span>
            </div>
            <div class="manage-detail-layout">
              <div class="manage-image-frame">
                <img
                  v-if="selectedManagedHistory.imageUrl"
                  :src="selectedManagedHistory.imageUrl"
                  alt="历史原图"
                  class="manage-image"
                />
                <p v-else class="history-empty">无归档原图</p>
              </div>
              <div class="manage-detail-body">
                <dl class="manage-facts">
                  <div><dt>文件</dt><dd>{{ selectedManagedHistory.fileName }}</dd></div>
                  <div><dt>修改时间</dt><dd>{{ selectedManagedHistory.imageCreatedAt || '—' }}</dd></div>
                  <div v-if="selectedManagedHistory.batch"><dt>批次</dt><dd>{{ formatBatchShort(selectedManagedHistory.batch) }}</dd></div>
                  <div><dt>任务</dt><dd>{{ selectedManagedHistory.taskId || '—' }}</dd></div>
                  <div><dt>结果</dt><dd>{{ historyResultLabel(selectedManagedHistory) }}</dd></div>
                  <div><dt>类型</dt><dd>{{ historyKindLabel(selectedManagedHistory) || '—' }}</dd></div>
                  <div><dt>标注</dt><dd>{{ historyFeedbackStatusLabel(selectedManagedHistory) ?? '— 未标注 —' }}</dd></div>
                </dl>
                <p class="manage-reason">
                  {{ selectedManagedHistory.payload.result?.reason || selectedManagedHistory.payload.error_msg || '—' }}
                </p>
                <div class="manage-actions">
                  <button type="button" class="btn btn-secondary" @click="applyHistoryEntry(selectedManagedHistory); showDetectWorkspace()">
                    打开查看
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    :disabled="managedHistoryActionBusy[selectedManagedHistory.id]"
                    @click="removeManagedHistory(selectedManagedHistory)"
                  >
                    删除历史
                  </button>
                </div>
              </div>
            </div>
          </template>
          <p v-else class="history-empty">请选择一条历史记录。</p>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="previewLightboxOpen && previewLightboxSrc"
        class="preview-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="图片放大预览"
        @click.self="closePreviewLightbox"
      >
        <button
          type="button"
          class="preview-lightbox-close"
          aria-label="关闭"
          @click="closePreviewLightbox"
        >
          ×
        </button>
        <div ref="previewLightboxStageRef" class="preview-lightbox-stage">
          <div class="preview-lightbox-img-wrap" :style="{ transform: `scale(${lightboxScale})` }">
            <img
              ref="lightboxImgRef"
              :src="previewLightboxSrc"
              alt=""
              class="preview-lightbox-img"
              :class="{ 'preview-lightbox-img-zoomable': lightboxScale < LIGHTBOX_SCALE_MAX }"
              @load="onLightboxImgLoad"
              @click.stop="onLightboxImgClick"
            />
            <svg
              v-if="lightboxImgNatural.w && suggestedRoiRenderRects.length"
              class="preview-lightbox-overlay"
              :viewBox="`0 0 ${lightboxImgNatural.w} ${lightboxImgNatural.h}`"
              preserveAspectRatio="xMidYMid meet"
            >
              <g v-for="rect in suggestedRoiRenderRects" :key="'lbsroi' + rect.idx">
                <rect
                  :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h"
                  :fill="rect.selected ? hexToRgba(rect.stroke, 0.10) : 'rgba(148,163,184,0.06)'"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(2, lightboxImgNatural.w * 0.002)"
                  :stroke-dasharray="rect.dash"
                  style="pointer-events: none;"
                />
                <circle
                  :cx="rect.x + rect.w" :cy="rect.y + rect.h / 2"
                  :r="Math.max(3, lightboxImgNatural.w * 0.003)"
                  :fill="rect.stroke" stroke="none"
                />
                <polyline
                  :points="rect.linePoints"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(1, lightboxImgNatural.w * 0.0008)"
                  :stroke-dasharray="rect.selected ? 'none' : '3 2'"
                  fill="none"
                />
                <rect
                  :x="rect.cx" :y="rect.cy" :width="rect.cw" :height="rect.ch"
                  rx="5" ry="5"
                  :fill="rect.selected ? '#ffffff' : '#f8fafc'"
                  :stroke="rect.stroke"
                  :stroke-width="Math.max(1.5, lightboxImgNatural.w * 0.0006)"
                />
                <text
                  :x="rect.tx" :y="rect.ty"
                  :text-anchor="rect.tx > lightboxImgNatural.w / 2 ? 'end' : 'start'"
                  dominant-baseline="central"
                  :font-size="Math.max(13, Math.min(18, lightboxImgNatural.w * 0.016))"
                  :font-weight="700"
                  :fill="rect.stroke"
                  style="font-family: system-ui, -apple-system, sans-serif; pointer-events: none;"
                >{{ rect.displayLabel }}</text>
              </g>
            </svg>
          </div>
        </div>
        <p class="preview-lightbox-hint">滚轮缩放 | 点击图片 适应/原始/2x 三档切换 | 点背景或 × 关闭 | Esc 退出</p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.topbar-inner {
  max-width: 1420px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
  flex-wrap: wrap;
}

.topbar-tabs {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
}

.topbar-tab {
  border: 0;
  border-radius: 6px;
  padding: 0.42rem 0.72rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.topbar-tab.active {
  color: var(--brand);
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.brand {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(145deg, #1d4ed8, #0ea5e9);
  flex-shrink: 0;
  margin-top: 2px;
}

.brand-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.brand-sub {
  margin: 0.2rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.main {
  flex: 1;
  max-width: 1420px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(260px, 300px);
  gap: 1.25rem;
  align-items: start;
}

.manage-main {
  flex: 1;
  width: 100%;
  max-width: 1420px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.manage-toolbar {
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.manage-title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--text);
}

.manage-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.manage-tabs,
.manage-filter-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.manage-date-filter-row {
  flex-wrap: nowrap;
  align-items: center;
}

.manage-date-filter-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
}

.manage-date-filter-wrap .filter-label {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text-muted);
}

.manage-date-filter-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
  width: 100%;
}

.manage-tab,
.filter-chip {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.manage-tab.active,
.filter-chip.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: var(--brand);
}

.filter-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text-muted);
  padding: 0 0.2rem;
  white-space: nowrap;
}

.filter-date-input {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 0.78rem;
  padding: 0.35rem 0.55rem;
  cursor: pointer;
  min-width: 0;
}

.filter-date-input:focus {
  border-color: var(--brand);
  outline: none;
}

.filter-batch-input {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-size: 0.78rem;
  padding: 0.35rem 0.55rem;
  width: 100px;
}

.filter-batch-input:focus {
  border-color: var(--brand);
  outline: none;
}

.filter-batch-input::placeholder {
  color: #94a3b8;
  font-size: 0.7rem;
}

.filter-date-sep {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text-muted);
  padding: 0 0.15rem;
}

.feedback-date-pill {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.1rem 0.38rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* 反馈列表右侧区域：人工审核 + 判定 pill */
.feedback-row-right {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}

.feedback-audit-label {
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  color: #64748b;
  white-space: nowrap;
}

.feedback-row-time {
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  padding: 0 0.3rem;
}

.feedback-judgment-pill {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.1rem 0.38rem;
  border-radius: 999px;
  white-space: nowrap;
}

.feedback-judgment-pill.correct {
  background: #dcfce7;
  color: #166534;
}

.feedback-judgment-pill.wrong {
  background: #fee2e2;
  color: #991b1b;
}

.feedback-judgment-pill.suspicious {
  background: #ffedd5;
  color: #9a3412;
}

/* 反馈详情标注行 */
.feedback-detail-judgment {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.feedback-check {
  color: #16a34a;
  font-weight: 700;
  font-size: 0.75rem;
}

.manage-summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin: 0 0 0.75rem;
}

.manage-summary-row span {
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 650;
  padding: 0.45rem 0.5rem;
  text-align: center;
  white-space: nowrap;
}

.dataset-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  min-height: 32px;
  padding: 0 0.2rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.manage-grid {
  display: grid;
  grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.manage-export-wrap {
  width: 100%;
}

.manage-export-card {
  padding: 1rem 1.1rem;
}

.export-hint {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.export-filter-block {
  margin-top: 0.55rem;
  align-items: center;
}

.export-filter-note {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-left: 0.15rem;
}

.export-actions {
  margin-top: 1rem;
}

.export-spinner-dark {
  border-color: rgba(15, 23, 42, 0.2);
  border-top-color: var(--brand);
}

.export-summary {
  margin-top: 1rem;
  padding: 0.75rem 0;
  border-top: 1px dashed var(--border);
}

.card-inner {
  background: transparent;
}

.export-summary-row {
  margin: 0;
}

.export-download-ok {
  margin: 0.65rem 0 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-sm);
}

.export-limit-warn {
  margin: 0.65rem 0 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
}

.export-truncate-hint {
  margin: 0.5rem 0 0;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.export-preview-list {
  max-height: min(52vh, 480px);
}

.export-preview-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: #fff;
}

.export-preview-main {
  min-width: 0;
}

.export-preview-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #f8fafc;
  cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

.export-preview-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.export-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.manage-list-card,
.manage-detail-card {
  padding: 1rem;
}

.manage-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.manage-list {
  list-style: none;
  padding: 0;
  margin: 0.8rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-height: 62vh;
  overflow: auto;
}

.manage-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: stretch;
}

.manage-row-main {
  border: 1px solid var(--border);
  border-radius: 7px;
  background: #fff;
  padding: 0.65rem;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}

.manage-row.active .manage-row-main,
.manage-row-main:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.manage-row-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.manage-row-delete {
  border: 1px solid #fecaca;
  border-radius: 7px;
  background: #fff5f5;
  color: #b91c1c;
  font-size: 0.74rem;
  font-weight: 650;
  padding: 0 0.55rem;
  cursor: pointer;
}

.manage-detail-layout {
  display: grid;
  grid-template-columns: minmax(260px, 42%) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.manage-image-frame {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f8fafc;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.manage-image {
  width: 100%;
  height: 100%;
  max-height: 62vh;
  object-fit: contain;
  display: block;
}

.manage-detail-body {
  min-width: 0;
}

.manage-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin: 0;
}

.manage-facts div {
  padding: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface-2);
  min-width: 0;
}

.manage-facts dt {
  color: var(--text-muted);
  font-size: 0.7rem;
  margin-bottom: 0.25rem;
}

.manage-facts dd {
  margin: 0;
  color: var(--text);
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.manage-reason {
  margin: 0.9rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.84rem;
}

.manage-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.dataset-json-panel {
  margin-top: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.dataset-json-head {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.dataset-json-head h4 {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text);
}

.dataset-json {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  padding: 0.75rem;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.72rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 920px) {
  .manage-grid,
  .manage-detail-layout {
    grid-template-columns: 1fr;
  }

  .manage-summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.workspace-wrap {
  min-width: 0;
}

.history-aside {
  min-width: 0;
}

.history-aside .history-card {
  position: sticky;
  top: 1.25rem;
}

@media (max-width: 1180px) {
  .main {
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
  }

  .history-aside {
    grid-column: 1 / -1;
    max-width: 720px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  .history-aside .history-card {
    position: static;
  }
}

@media (max-width: 960px) {
  .main {
    grid-template-columns: 1fr;
    max-width: 640px;
  }

  .history-aside {
    grid-column: auto;
    max-width: none;
  }
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.side-section {
  padding: 1.25rem 1.35rem;
}

.section-title {
  margin: 0 0 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.section-title.tight {
  margin-bottom: 0.75rem;
}

.detect-type-hint {
  margin: -0.35rem 0 0.75rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.detect-type-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.detect-type-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}

.detect-type-item:has(.detect-type-input:checked) {
  border-color: var(--brand);
  background: #eff6ff;
  box-shadow: 0 0 0 1px var(--brand);
}

.detect-type-item:has(.detect-type-input:disabled) {
  cursor: not-allowed;
  opacity: 0.72;
}

.detect-type-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.detect-type-check {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  margin-top: 0.1rem;
  border-radius: 0.25rem;
  border: 2px solid #94a3b8;
  background: #fff;
  position: relative;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.detect-type-input:checked + .detect-type-check {
  border-color: var(--brand);
  background: var(--brand);
}

.detect-type-input:checked + .detect-type-check::after {
  content: '';
  position: absolute;
  left: 0.28rem;
  top: 0.05rem;
  width: 0.28rem;
  height: 0.55rem;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.detect-type-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.detect-type-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
}

.detect-type-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  padding: 1rem;
  border: 2px dashed #cbd5e1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.drop-zone:hover,
.drop-zone.over {
  border-color: var(--brand);
  background: #f8fafc;
}

.drop-zone.hasFile {
  min-height: auto;
  align-items: flex-start;
  border-style: solid;
  border-color: var(--border);
  background: var(--surface-2);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dz-icon {
  font-size: 1.75rem;
  color: var(--brand);
  line-height: 1;
  margin-bottom: 0.35rem;
}

.dz-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.dz-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

.dz-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
  word-break: break-all;
  width: 100%;
}

.dz-change {
  font-size: 0.75rem;
  color: var(--brand);
  margin-top: 0.5rem;
}

.upload-select-row {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.upload-select-btn {
  width: 100%;
}

.upload-picked-summary {
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.upload-picked-list {
  margin-top: 0.6rem;
  max-height: 120px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #f8fafc;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.upload-picked-item {
  border: 1px solid transparent;
  border-radius: 6px;
  background: #fff;
  color: var(--text);
  text-align: left;
  font-size: 0.75rem;
  padding: 0.28rem 0.45rem;
  line-height: 1.35;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  overflow: hidden;
}

.upload-picked-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-picked-item-remove {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: #64748b;
  background: transparent;
}

.upload-picked-item-remove:hover {
  color: #dc2626;
  background: #fee2e2;
}

.upload-picked-item:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.upload-picked-item.active {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1e40af;
}

.preview-file-info {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #64748b;
  padding: 0.3rem 0.15rem;
}

.preview-file-name {
  color: var(--text);
  font-weight: 500;
  word-break: break-all;
  line-height: 1.35;
}

.preview-file-meta-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #94a3b8;
  font-size: 0.7rem;
}

.preview-file-info-sep {
  color: #c0c4cc;
  flex-shrink: 0;
}

.history-file-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 1rem;
  margin: 0 1rem 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.history-file-name {
  font-size: 0.82rem;
  color: var(--text);
  font-weight: 500;
  word-break: break-all;
  line-height: 1.35;
}

.history-file-time {
  font-size: 0.72rem;
  color: #94a3b8;
}

.option-row {
  margin-top: 1rem;
}

.switch-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text);
}

.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-ui {
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: #e2e8f0;
  flex-shrink: 0;
  margin-top: 1px;
  position: relative;
  transition: background 0.15s;
}

.switch-ui::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 2px;
  left: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s;
}

.switch-input:checked + .switch-ui {
  background: var(--brand);
}

.switch-input:checked + .switch-ui::after {
  transform: translateX(16px);
}

.switch-text {
  line-height: 1.4;
  font-weight: 500;
}

.option-hint {
  margin: 0.5rem 0 0 2.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.bbox-hint {
  margin-top: 1rem;
  padding: 0.75rem 0.85rem;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.bbox-coords {
  margin: 0.5rem 0 0;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--brand);
}

.actions-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-card {
  padding-bottom: 1rem;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.history-head .section-title {
  margin: 0;
}

.history-title-merged {
  margin-bottom: 0 !important;
}

.btn-text-refresh {
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--brand);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}

.btn-text-refresh:hover:not(:disabled) {
  background: #eff6ff;
}

.btn-text-refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.history-api-hint {
  margin: 0 0 0.5rem;
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.history-error {
  margin: 0 0 0.5rem;
  padding: 0.45rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #991b1b;
  background: #fef2f2;
  border-radius: var(--radius-sm);
  border: 1px solid #fecaca;
}

.history-empty {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.history-footer {
  margin-top: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
}

.history-pager {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.history-count {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.btn-history-page {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
}

.btn-history-page:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand);
}

.btn-history-page:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

@media (min-width: 1181px) {
}

.history-row {
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
}

.history-row.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}

.history-main {
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.12rem;
  padding: 0.3rem 0.45rem;
  min-height: 56px;
  line-height: 1.35;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.history-main:hover {
  background: #f8fafc;
}

.history-time {
  font-size: 0.68rem;
  line-height: 1.3;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.history-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.history-kind {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 0.1rem 0.38rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  letter-spacing: 0.02em;
}

.history-kind--feedback.correct {
  background: #dcfce7;
  color: #166534;
}

.history-kind--feedback.wrong {
  background: #fee2e2;
  color: #991b1b;
}

.history-kind--feedback.suspicious {
  background: #ffedd5;
  color: #9a3412;
}

/* ---- 历史记录纠错区块 ---- */

.history-correction {
  margin: 0;
  padding: 0.45rem 0.65rem 0.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.history-correction-divider {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.history-correction-divider-line {
  flex: 1;
  height: 1px;
  background: #d1d5db;
}

.history-correction-divider-text {
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
  letter-spacing: 0.04em;
}

.history-correction-pill {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  margin-right: 0.35rem;
  line-height: 1.3;
}

.history-correction-pill.correct {
  background: #dcfce7;
  color: #166534;
}

.history-correction-pill.wrong {
  background: #fee2e2;
  color: #991b1b;
}

.history-correction-pill.suspicious {
  background: #ffedd5;
  color: #9a3412;
}

.history-correction-icon {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  margin-right: 0.2rem;
  line-height: 1.3;
}

.history-correction-time {
  font-size: 0.65rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.history-file {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  padding-top: 1px;
  color: var(--text);
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-file-time {
  display: block;
  font-size: 0.68rem;
  color: #94a3b8;
  line-height: 1.3;
}

.history-batch {
  display: inline-block;
  font-size: 0.68rem;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.4;
  margin-right: 6px;
}

.history-pill {
  align-self: flex-start;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.15rem;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--brand);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-hover);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-2);
}

.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.status-dot.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.alert {
  margin: 0;
  padding: 0.65rem 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: #991b1b;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

@media (min-width: 1040px) {
  .workspace {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(300px, 1.1fr);
    gap: 1rem;
    align-items: start;
  }

  .workspace .workspace-card {
    min-width: 0;
  }
}

.workspace-card {
  padding: 1.25rem 1.35rem;
}

.workspace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.workspace-head .section-title {
  margin: 0;
}

.workspace-head-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
  align-items: center;
}

.workspace-tip {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--brand);
  background: #eff6ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.workspace-tip-muted {
  color: #64748b;
  background: #f1f5f9;
}

.stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #0f172a;
}

.preview-img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
  max-height: min(44vh, 420px);
  margin: 0 auto;
  object-fit: contain;
}

.preview-img-zoomin {
  cursor: zoom-in;
}

.btn-preview-zoom {
  padding: 0.28rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--brand);
  background: #fff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.btn-preview-zoom:hover {
  background: #eff6ff;
  border-color: var(--brand);
}

.overlay-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.draw-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.empty-preview {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.9rem;
}

.history-preview-placeholder {
  flex-direction: column;
  gap: 0.35rem;
  text-align: center;
  padding: 1.25rem 1rem;
}

.history-preview-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  max-width: 300px;
  color: var(--text-muted);
}

.history-schematic-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 200px;
  padding: 0.75rem 0.65rem 0.85rem;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.report-images {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.report-images .viz-wrap {
  margin-top: 0;
}

.history-schematic-wrap--report {
  margin-top: 0.75rem;
}

.history-viz-loading {
  margin: 0.5rem 0 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.history-schematic-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.history-schematic-note {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.history-schematic-svg {
  width: 100%;
  max-height: min(48vh, 480px);
  min-height: 160px;
  background: #f8fafc;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.results-card {
  flex: 1;
}

.report {
  padding: 0.25rem 0;
}

.report-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.pill {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
  background: #e2e8f0;
  color: #334155;
}

.pill.sm {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
}

.pill.正常 {
  background: #dcfce7;
  color: #166534;
}

.pill.可疑 {
  background: #ffedd5;
  color: #9a3412;
}

.pill.篡改 {
  background: #fee2e2;
  color: #991b1b;
}

.pill.错误 {
  background: #f1f5f9;
  color: #475569;
}

.pill.失败 {
  background: #fee2e2;
  color: #991b1b;
}

.meter-wrap {
  flex: 1;
  min-width: 160px;
}

.meter-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.meter {
  height: 8px;
  border-radius: 4px;
  background: #e2e8f0;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #0ea5e9, #1d4ed8);
  transition: width 0.35s ease;
}

.report-reason {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text);
}

.detect-ext-block {
  margin-top: 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
}

.detect-ext-title {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.detect-ext-dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.8rem;
  line-height: 1.45;
}

.detect-ext-dl dt {
  margin: 0;
  color: var(--text-muted);
  white-space: nowrap;
}

.detect-ext-dl dd {
  margin: 0;
  color: var(--text);
}

.detect-ext-dl.compact {
  margin-top: 0.35rem;
  font-size: 0.75rem;
}

.field-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.55rem;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
}

.field-input:disabled {
  opacity: 0.6;
}

.report-foot {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
}

.report-foot.inline {
  display: block;
  margin-top: 0.25rem;
}

.multi-block {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
}

.rule-check-block {
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border);
}

.rule-check-heading {
  margin: 0 0 0.35rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.rule-check-desc {
  margin: 0 0 0.75rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.rule-check-status {
  margin: 0;
  font-size: 0.8rem;
  color: var(--brand);
}

.rule-check-error {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #b45309;
  white-space: pre-wrap;
}

.rule-check-summary {
  margin-bottom: 0.75rem;
}

.rule-check-elapsed {
  margin-left: 0.6rem;
  font-size: 0.78rem;
  color: var(--muted, #6c757d);
  background: var(--bg-muted, rgba(128, 128, 128, 0.1));
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  vertical-align: middle;
}

.rule-check-reason {
  margin: 0.5rem 0 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text);
}

.rule-check-findings {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.rule-check-finding {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #fafbfc;
}

.rule-check-finding--ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.rule-check-finding--warn {
  border-color: #fed7aa;
  background: #fff7ed;
}

.rule-check-finding--bad {
  border-color: #fecaca;
  background: #fef2f2;
}

.rule-check-finding-icon {
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}

.rule-check-finding--ok .rule-check-finding-icon {
  background: #dcfce7;
  color: #166534;
}

.rule-check-finding--warn .rule-check-finding-icon {
  background: #ffedd5;
  color: #9a3412;
}

.rule-check-finding--bad .rule-check-finding-icon {
  background: #fee2e2;
  color: #991b1b;
}

.rule-check-finding-body {
  min-width: 0;
  width: 100%;
}

.rule-check-finding-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.rule-check-finding-title {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
}

.rule-check-result-badge {
  display: inline-flex;
  align-items: center;
  height: 1.15rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}

.rule-check-result-badge--ok {
  border-color: #bbf7d0;
  background: #dcfce7;
  color: #166534;
}

.rule-check-result-badge--warn {
  border-color: #fed7aa;
  background: #ffedd5;
  color: #9a3412;
}

.rule-check-result-badge--bad {
  border-color: #fecaca;
  background: #fee2e2;
  color: #991b1b;
}

.rule-check-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: help;
  outline: none;
}

.rule-check-help:hover,
.rule-check-help:focus-visible {
  border-color: #94a3b8;
  color: #334155;
}

.rule-check-help-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  z-index: 20;
  width: min(18rem, 72vw);
  transform: translateX(-50%) translateY(0.2rem);
  padding: 0.55rem 0.65rem;
  border-radius: 6px;
  background: #0f172a;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.rule-check-help:hover .rule-check-help-tip,
.rule-check-help:focus-visible .rule-check-help-tip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.rule-check-finding-result {
  margin: 0 0 0.2rem;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text);
  font-weight: 600;
}

.rule-check-finding-text {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.rule-check-details {
  margin: 0.4rem 0 0;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  font-size: 0.75rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.5rem;
}

.rule-check-details dt {
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
}

.rule-check-details dd {
  margin: 0;
  color: var(--text);
  word-break: break-all;
}

.rule-check-unavailable,
.rule-check-no-findings {
  margin: 0.5rem 0 0;
  padding: 0.6rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.rule-check-times {
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-sm);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.rule-check-times-title {
  margin: 0 0 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.rule-check-times-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rule-check-times-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  padding: 0.28rem 0;
  font-size: 0.78rem;
  line-height: 1.45;
  border-bottom: 1px solid #eef2f7;
}

.rule-check-times-list li:last-child {
  border-bottom: none;
}

.rule-check-times-label {
  color: var(--text-muted);
  min-width: 7.5rem;
}

.rule-check-times-value {
  color: var(--text);
  font-weight: 600;
}

/* ===== Suggested ROIs（建议检测区域） ===== */
.suggested-rois-block {
  margin-top: 0.85rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  background: #fafbfc;
}

.suggested-rois-heading {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
}

.suggested-rois-hint {
  margin: 0 0 0.6rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.suggested-rois-low-conf {
  font-size: 0.75rem;
  color: #92400e;
  background: #fef3c7;
  padding: 0.35rem 0.55rem;
  border-radius: 4px;
  margin-bottom: 0.4rem;
  line-height: 1.45;
}

.suggested-rois-legend {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.55;
  margin: 0 0 0.6rem;
  padding: 0.35rem 0.55rem;
  background: #f8fafc;
  border-radius: 4px;
  border-left: 3px solid #e2e8f0;
}

.suggested-rois-list {
  margin: 0 0 0.65rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.suggested-rois-item {
  padding: 0.3rem 0 0.3rem 0.5rem;
  border-left: 3px solid transparent;
  border-radius: 0 4px 4px 0;
  transition: border-color 0.15s, background 0.15s;
}

.suggested-rois-item--selected {
  border-left-color: #2563eb;
  background: rgba(37, 99, 235, 0.04);
}

.suggested-rois-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.suggested-rois-label input[type="checkbox"] {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  accent-color: var(--brand);
}

.roi-color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.15s;
}

.roi-category {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.roi-cat--high {
  background: #fee2e2;
  color: #dc2626;
}

.roi-cat--normal {
  background: #f3f4f6;
  color: #6b7280;
}

.roi-idx-label {
  font-weight: 700;
  color: #2563eb;
  font-size: 0.82rem;
  min-width: 2.2em;
  flex-shrink: 0;
}

.roi-label {
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roi-priority {
  color: var(--text-muted);
  font-size: 0.7rem;
  flex-shrink: 0;
}

/* ===== 高压缩图片误报提示 ===== */
.rule-check-compression-note {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.7rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
  font-size: 0.78rem;
  color: #92400e;
  line-height: 1.45;
}

.multi-scroll {
  max-height: min(26vh, 220px);
  overflow-y: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  padding: 0 0.5rem;
}

.multi-heading {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.multi-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.multi-list li {
  padding: 0.45rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.45;
}

.multi-list li:last-child {
  border-bottom: none;
}

.multi-li-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.5rem;
}

.region-idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}

.multi-confidence {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.multi-reason {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.viz-miss-hint {
  margin: 0.75rem 0 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-muted);
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
}

.viz-wrap {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
}

.viz-frame {
  max-height: min(42vh, 380px);
  overflow: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #f8fafc;
  text-align: center;
  line-height: 0;
}

.viz-heading {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.viz-img {
  max-width: 100%;
  width: auto;
  height: auto;
  max-height: min(42vh, 380px);
  object-fit: contain;
  vertical-align: middle;
}

.viz-img-zoomin {
  cursor: zoom-in;
}

.empty-report {
  margin: 0;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.preview-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem 1.5rem;
  box-sizing: border-box;
}

.preview-lightbox-stage {
  max-width: 96vw;
  max-height: calc(100vh - 6rem);
  width: 96vw;
  height: calc(100vh - 6rem);
  overflow: auto;
  border-radius: 8px;
  display: block;
}

.preview-lightbox-img-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
  transform-origin: top left;
  transition: transform 150ms ease-out;
}

.preview-lightbox-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-lightbox-img {
  display: block;
  margin: 0;
  width: auto;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.45);
}

.preview-lightbox-img-zoomable {
  cursor: zoom-in;
}

.preview-lightbox-close {
  position: fixed;
  top: 0.85rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
}

.preview-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.preview-lightbox-hint {
  margin: 0.85rem 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
  text-align: center;
}

/* ---- 顶部健康状态 ---- */

.topbar-health {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}

.health-dot.health-ok {
  background: #4ade80;
}

.health-dot.health-mock {
  background: #facc15;
}

.health-text {
  white-space: nowrap;
}

.health-err {
  color: #fca5a5;
}

/* ---- 模型管理 ---- */

.model-info-line {
  margin-bottom: 0.65rem;
}

.model-info-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
  word-break: break-all;
}

.model-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-warning {
  background: #f59e0b;
  color: #fff;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

/* ---- 反馈按钮 ---- */

.feedback-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.feedback-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-right: 0.25rem;
}

.btn-feedback {
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.btn-feedback:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-feedback-correct {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}

.btn-feedback-correct:hover:not(:disabled) {
  background: #dcfce7;
}

.btn-feedback-suspicious {
  background: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
}

.btn-feedback-suspicious:hover:not(:disabled) {
  background: #fef3c7;
}

.btn-feedback-wrong {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.btn-feedback-wrong:hover:not(:disabled) {
  background: #fee2e2;
}

.btn-feedback-edit {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.btn-feedback-edit:hover:not(:disabled) {
  background: #dbeafe;
}

.btn-feedback-delete {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.btn-feedback-delete:hover:not(:disabled) {
  background: #fee2e2;
}

.feedback-status-pill {
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  line-height: 1.3;
}

.feedback-status-pill.correct {
  background: #dcfce7;
  color: #166534;
}

.feedback-status-pill.wrong {
  background: #fee2e2;
  color: #991b1b;
}

.feedback-status-pill.suspicious {
  background: #ffedd5;
  color: #9a3412;
}

/** 已标注状态下，「改」按钮中与当前标注一致的按钮高亮 */
.btn-feedback-active {
  font-weight: 700;
  box-shadow: inset 0 0 0 2px currentColor;
}
</style>
