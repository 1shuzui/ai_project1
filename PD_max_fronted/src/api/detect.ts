/** 请求坐标：左上到右下 [x1, y1, x2, y2]（像素） */
export type BboxXYXY = readonly [number, number, number, number]

/** 接口返回 ROI：[x, y, width, height] */
export type BboxXYWH = readonly [number, number, number, number]

import { demoLabelForFileName } from './mockDemoFileLabels'

const AI_DETECTION_PREFIX = '/ai-detection'

function baseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  const proxyTarget = String(import.meta.env.VITE_PROXY_TARGET ?? '').trim()
  // 生产：默认同源（/ai-detection 经 Nginx 反代），与 `src/api/config.ts` 的门户 /api 一致
  if (import.meta.env.PROD) {
    return trimmed !== '' ? trimmed.replace(/\/$/, '') : ''
  }
  if (trimmed !== '') {
    return trimmed.replace(/\/$/, '')
  }
  if (proxyTarget !== '') {
    return ''
  }
  // 开发：默认同源相对路径 /ai-detection，由主项目 Vite 代理到与电子地图相同的 VITE_API_TARGET（勿写死旧 IP:8002）
  return ''
}

function apiUrl(path: string): string {
  return `${baseUrl()}${path}`
}

function aiDetectionUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${AI_DETECTION_PREFIX}${normalized}`
}

export function resolveApiUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : `/${path}`
  const b = baseUrl()
  if (!b) return p

  const versionPrefix = '/api/v1'
  // 情形 A: base 以 /api/v1 结尾，且 path 也以 /api/v1 开头 → 去重拼接
  if (b.endsWith(versionPrefix) && p.startsWith(versionPrefix)) {
    return `${b}${p.slice(versionPrefix.length)}`
  }
  // 情形 B: base 以 /api/v1 结尾，但请求 path 是其他 /api/vX（如 /api/v3）
  // 在某些部署（Nginx 把 /api/v1 反代到后端）下，应从域名根拼接目标版本路径，避免 /api/v1/api/v3
  if (b.endsWith(versionPrefix) && /^\/api\/v\d+/i.test(p)) {
    const baseRoot = b.replace(new RegExp(`${versionPrefix}$`), '')
    return `${baseRoot}${p}`
  }

  // 默认：直接在 baseUrl 下拼接
  return apiUrl(p)
}

/** 将代理/网关类错误转成可操作的说明（开发环境 502 多为后端未启动或端口不对） */
function httpFailMessage(status: number, rawBody: string): string {
  const t = rawBody?.trim() ?? ''
  const looksHtml = t.startsWith('<')
  const detail = !looksHtml && t.length > 0 ? t.slice(0, 300) : ''

  if (status === 502 || status === 503 || status === 504) {
    const hint =
      import.meta.env.DEV && !import.meta.env.VITE_API_BASE
        ? '开发代理未指向可用服务：可在主项目 .env 中检查 VITE_API_TARGET（/ai-detection 与其一致），或单独设置 VITE_API_BASE；PD_max_fronted 独立开发时可设 VITE_PROXY_TARGET。'
        : '检测服务暂时不可用或网络异常，请稍后重试；若多次失败请联系管理员确认服务是否在线。'
    return detail
      ? `${detail}\n\n${hint}`
      : `暂时无法连接检测服务（${status}）\n${hint}`
  }

  if (detail) return detail
  return `HTTP ${status}`
}

export class DetectionApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'DetectionApiError'
    this.status = status
  }
}

export class V3PollingError extends Error {
  readonly kind: 'failed' | 'timeout' | 'unknown_status'
  readonly retryable: boolean
  readonly taskId: string

  constructor(
    kind: 'failed' | 'timeout' | 'unknown_status',
    message: string,
    taskId: string,
    retryable: boolean,
  ) {
    super(message)
    this.name = 'V3PollingError'
    this.kind = kind
    this.taskId = taskId
    this.retryable = retryable
  }
}

export function isRetryableDetectionError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false
  if (error instanceof V3PollingError) return error.retryable
  if (error instanceof DetectionApiError) {
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(error.status)
  }
  const message = error instanceof Error ? error.message : String(error)
  return /超时|暂时无法连接|网络|network|failed to fetch|fetch failed|502|503|504|timeout|timed out|任务不存在|任务丢失|not found|Task not found/i.test(message)
}

function throwHttpError(status: number, rawBody: string): never {
  throw new DetectionApiError(status, httpFailMessage(status, rawBody))
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

const MOCK_HISTORY_KEY = 'ai_detection_mock_history_v1'

function useMockOnly(): boolean {
  return String(import.meta.env.VITE_USE_MOCK ?? '').trim() === '1'
}

// function isGatewayLikeStatus(status: number): boolean {
//   return status === 502 || status === 503 || status === 504
// }

function nowIso(): string {
  return new Date().toISOString()
}

function fileModifiedString(file: File): string | null {
  try {
    const d = new Date(file.lastModified)
    if (isNaN(d.getTime())) return null
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return null
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// function randomRange(min: number, max: number): number {
//   return min + Math.random() * (max - min)
// }

async function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms)
    if (!signal) return
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal.aborted) return onAbort()
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function toXYWH(bbox: BboxXYXY): BboxXYWH {
  const x1 = Math.min(bbox[0], bbox[2])
  const y1 = Math.min(bbox[1], bbox[3])
  const x2 = Math.max(bbox[0], bbox[2])
  const y2 = Math.max(bbox[1], bbox[3])
  return [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)]
}

function readMockHistory(): DetectionHistoryApiRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MOCK_HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    const out: DetectionHistoryApiRecord[] = []
    for (const row of arr) {
      if (!isRecord(row)) continue
      const rec = coerceApiRecord(row)
      if (rec) out.push(rec)
    }
    return out
  } catch {
    return []
  }
}

function writeMockHistory(list: DetectionHistoryApiRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MOCK_HISTORY_KEY, JSON.stringify(list))
  } catch {
    // ignore quota/write failures
  }
}

type MockClassProfile = 'normal' | 'suspicious' | 'tamper' | 'mixed'

/** 文件名 + 时间盐：同图多次分析略有不同，不同图差异明显 */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickFrom<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]
}

/**
 * 将检测范围划分为互不重叠的网格单元，每块 ROI 严格落在各自单元内，避免框线叠压。
 */
function allocateNonOverlappingRegionBoxes(
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  rng: () => number,
): BboxXYWH[] {
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const cellW = w / cols
  const cellH = h / rows
  const boxes: BboxXYWH[] = []
  let idx = 0
  for (let r = 0; r < rows && idx < count; r++) {
    for (let c = 0; c < cols && idx < count; c++, idx++) {
      const cx = x + c * cellW
      const cy = y + r * cellH
      const fracLo = 0.05 + rng() * 0.04
      const fracHi = 0.1 + rng() * 0.06
      let mx = cellW * rndRange(rng, fracLo, fracHi)
      let my = cellH * rndRange(rng, fracLo, fracHi)
      const maxMx = Math.max(2, (cellW - 32) / 2 - 0.5)
      const maxMy = Math.max(2, (cellH - 32) / 2 - 0.5)
      mx = Math.min(mx, maxMx)
      my = Math.min(my, maxMy)
      if (cellW - 2 * mx < 32) mx = Math.max(0, (cellW - 32) / 2)
      if (cellH - 2 * my < 32) my = Math.max(0, (cellH - 32) / 2)
      const rx = Math.round(cx + mx)
      const ry = Math.round(cy + my)
      const rw = Math.max(32, Math.round(cellW - 2 * mx))
      const rh = Math.max(32, Math.round(cellH - 2 * my))
      boxes.push([rx, ry, rw, rh])
    }
  }
  return boxes
}

/**
 * 优先覆盖关键字段：顶部大号 ¥ 金额（居中宽框）、清单里姓名/时间（贴右缘窄条），
 * 避免落在标签与正文之间的空白带。
 */
function allocateAmountFocusRegionBoxes(
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  rng: () => number,
): BboxXYWH[] {
  const boxes: BboxXYWH[] = []

  const clampX = (rx: number, rw: number) =>
    Math.max(x + 2, Math.min(x + w - rw - 2, Math.round(rx)))
  const clampY = (ry: number, rh: number) =>
    Math.max(y + 2, Math.min(y + h - rh - 2, Math.round(ry)))

  /** 银行/App 详情页顶部「¥ 31,000.00」一类大金额 */
  function pushHeroCenterAmount() {
    const rw = Math.max(
      88,
      Math.min(w - 8, Math.round(w * rndRange(rng, 0.54, 0.8))),
    )
    const rh = Math.max(26, Math.round(h * rndRange(rng, 0.065, 0.115)))
    const cx = x + w / 2 + w * rndRange(rng, -0.05, 0.05)
    const rx = clampX(cx - rw / 2, rw)
    const ry = clampY(y + h * rndRange(rng, 0.045, 0.2), rh)
    boxes.push([rx, ry, rw, rh])
  }

  /**
   * 清单行右侧关键字段值（姓名、时间戳等），框偏窄并靠右，减少盖住中间留白。
   * topRel/botRel：在图高中的纵向采样区间（0～1）
   */
  function pushRightDigitStrip(topRel: number, botRel: number) {
    const lo = Math.min(topRel, botRel)
    const hi = Math.max(topRel, botRel)
    const rw = Math.max(
      46,
      Math.min(w - 8, Math.round(w * rndRange(rng, 0.28, 0.44))),
    )
    const rh = Math.max(20, Math.round(h * rndRange(rng, 0.038, 0.072)))
    const marginR = w * rndRange(rng, 0.008, 0.038)
    const rx = clampX(x + w - rw - marginR, rw)
    const ry = clampY(y + h * (lo + (hi - lo) * rndRange(rng, 0.15, 0.9)), rh)
    boxes.push([rx, ry, rw, rh])
  }

  if (count <= 1) {
    const u = rng()
    if (u < 0.55) {
      pushHeroCenterAmount()
    } else if (u < 0.55 + 0.3) {
      pushRightDigitStrip(0.03, 0.22)
    } else {
      pushRightDigitStrip(0.2, 0.62)
    }
    return boxes
  }

  if (rng() < 0.78) {
    pushHeroCenterAmount()
    pushRightDigitStrip(0.22, 0.68)
    return boxes
  }

  pushRightDigitStrip(0.04, 0.2)
  pushRightDigitStrip(0.22, 0.58)
  return boxes
}

function rndInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function rndRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

function confidenceByLabelRng(label: string, rng: () => number): number {
  if (label === '正常') return rndRange(rng, 0.855, 0.972)
  if (label === '可疑') return rndRange(rng, 0.598, 0.852)
  return rndRange(rng, 0.705, 0.938)
}

function weightedPickRng<T>(
  rng: () => number,
  items: readonly T[],
  weights: readonly number[],
): T {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return items[0]
  let r = rng() * sum
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/** 子区域说明：短句、口语化，避免术语堆砌 */
const MOCK_REASON_NORMAL = [
  '和周围衔接自然，看不出裁剪、拼接的痕迹。',
  '明暗、颜色过渡正常，更像一次性拍出来或正常保存的图。',
  '没有明显「一块贴上去」或重复图案的感觉。',
] as const

const MOCK_REASON_SUSPICIOUS = [
  '这一块和周围亮度、颜色差得有点明显，不排除改过或补过。',
  '边缘有点「接不上」，建议您对照手机里的原图或系统记录再看一下。',
  '截图类图片有时会误判，请结合真实交易界面或官方凭证核实。',
] as const

const MOCK_REASON_TAMPER = [
  '能看出局部被涂改或替换过，边界比较生硬。',
  '有「复制粘贴」那种重复纹理，和常见造假手法接近。',
  '这一块颜色和周围不搭，像后来叠上去的内容。',
  '扣减金额数字一带和周围衔接不自然，常见于改数、改账。',
] as const

function regionReasonRng(
  rng: () => number,
  label: string,
  regionNo: number,
): string {
  const n = regionNo
  if (label === '正常') {
    return `关注区域${n}：${pickFrom(rng, MOCK_REASON_NORMAL)}`
  }
  if (label === '篡改') {
    return `关注区域${n}：${pickFrom(rng, MOCK_REASON_TAMPER)}`
  }
  return `关注区域${n}：${pickFrom(rng, MOCK_REASON_SUSPICIOUS)}`
}

const MOCK_SUMMARY_NORMAL = [
  '整体来看，没有发现明显的修图或拼接痕迹。',
  '没有发现需要特别留意的局部问题。',
] as const

const MOCK_SUMMARY_SUSPICIOUS = [
  '有少数地方看起来不太自然，建议您再结合原始凭证或源文件核对。',
  '系统标出了可疑位置，但还不能当作最终结论，最好人工再看一眼。',
] as const

const MOCK_SUMMARY_TAMPER = [
  '多处特征显示这张图可能经过比较明显的后期编辑，重要用途请务必人工确认。',
  '篡改痕迹相对明显，本结果仅供辅助参考，不能单独作为法律依据。',
] as const

function summaryReasonRng(rng: () => number, label: string): string {
  const pool =
    label === '正常'
      ? MOCK_SUMMARY_NORMAL
      : label === '篡改'
        ? MOCK_SUMMARY_TAMPER
        : MOCK_SUMMARY_SUSPICIOUS
  const main = pickFrom(rng, pool)
  if (label === '正常') {
    return `${main}若仍有疑问，可换一张更清晰的原图再检测一次。`
  }
  return `${main}图上的编号与框一一对应，请从下栏说明里按序号查看。`
}

/** 全图「正常」且无异常子区（不出现「预览/定位框」类技术说明） */
function summaryReasonStrictNormalRng(rng: () => number): string {
  return pickFrom(rng, [
    '本次检测未发现明显修图或拼接痕迹，图片整体表现正常。',
    '整体看起来没有明显改动痕迹；若您不放心，可换更清晰的原图再检一次。',
  ])
}

function summaryLabelByProfileRng(
  rng: () => number,
  profile: MockClassProfile,
  multi: V3ResultItem[],
): '正常' | '可疑' | '篡改' {
  if (profile === 'normal') return rng() < 0.9 ? '正常' : '可疑'
  if (profile === 'suspicious') return rng() < 0.72 ? '可疑' : '篡改'
  if (profile === 'tamper') return rng() < 0.82 ? '篡改' : '可疑'
  const hasTamper = multi.some((m) => m.result === '篡改')
  const hasSuspicious = multi.some((m) => m.result === '可疑')
  return hasTamper ? '篡改' : hasSuspicious ? '可疑' : '正常'
}

/** 按文件名（通常带分类目录名或关键字）识别演示类别 */
function detectProfileFromFileName(name: string): MockClassProfile {
  const n = name.toLowerCase()
  const has = (arr: readonly string[]) => arr.some((k) => n.includes(k))
  // 中文分类优先：避免 "没有p图" 被简单命中 "p图"
  if (has(['没有p图', '未p图', '无p图', '未ps', 'no_ps', 'nop'])) return 'normal'
  if (has(['p图', '有p图', 'ps图', 'ps_', '_ps', 'photoshop'])) return 'tamper'
  if (has(['正常', 'normal', 'authentic', 'real', 'true'])) return 'normal'
  if (has(['可疑', 'suspicious', 'suspect', '疑似'])) return 'suspicious'
  if (has(['篡改', 'tamper', 'forg', 'fake', 'ps', '编辑'])) return 'tamper'
  return 'mixed'
}

/** 演示素材：优先按文件名白名单；否则按文件名关键词 */
function resolveMockProfile(fileName: string): MockClassProfile {
  const demo = demoLabelForFileName(fileName)
  if (demo === 'tamper') return 'tamper'
  if (demo === 'normal') return 'normal'
  if (demo === 'mixed') return 'mixed'
  return detectProfileFromFileName(fileName)
}

/** 文件名含「没有p图」等（上传时无目录路径，靠文件名标识） */
function filenameIndicatesNoEdit(name: string): boolean {
  const n = (name || '').toLowerCase()
  return ['没有p图', '未p图', '无p图', '未ps', 'no_ps', 'nop'].some((k) =>
    n.includes(k),
  )
}

/** 文件名含 p 图相关且不含「没有p图」 */
function filenameIndicatesEdit(name: string): boolean {
  const n = (name || '').toLowerCase()
  if (filenameIndicatesNoEdit(name)) return false
  return ['p图', '有p图', 'ps图', 'photoshop'].some((k) => n.includes(k))
}

/** 白名单 normal 或文件名标明未编辑 → 整图与各区域均不得出现可疑/篡改 */
function isStrictNormalDemo(fileName: string): boolean {
  const demo = demoLabelForFileName(fileName)
  if (demo === 'tamper') return false
  if (demo === 'normal') return true
  return filenameIndicatesNoEdit(fileName)
}

/** 白名单 tamper 或文件名标明 p 过 → 不出现「全图正常」 */
function isStrictTamperDemo(fileName: string): boolean {
  const demo = demoLabelForFileName(fileName)
  if (demo === 'normal') return false
  if (demo === 'tamper') return true
  return filenameIndicatesEdit(fileName)
}

function makeStrictNormalOutcome(
  bbox: BboxXYXY,
  rng: () => number,
): { result: V3ResultItem; multi: V3ResultItem[] } {
  const [x, y, w, h] = toXYWH(bbox)
  /** 严格正常：不返回子区；摘要 bbox 置零以免绘制整图框 */
  const summary: V3ResultItem = {
    result: '正常',
    confidence: Number(confidenceByLabelRng('正常', rng).toFixed(4)),
    bbox: [0, 0, 0, 0],
    reason: summaryReasonStrictNormalRng(rng),
    original_bbox: [x, y, x + w, y + h],
  }
  return { result: summary, multi: [] }
}

function makeStrictTamperOutcome(
  bbox: BboxXYXY,
  rng: () => number,
): { result: V3ResultItem; multi: V3ResultItem[] } {
  const [x, y, w, h] = toXYWH(bbox)
  /** 只标 1～2 处，避免满屏框线 */
  const count = rndInt(rng, 1, 2)
  const labels = ['正常', '可疑', '篡改'] as const
  /** 极低正常，突出篡改/可疑 */
  const weights = [0.04, 0.32, 0.64] as const
  const cells = allocateAmountFocusRegionBoxes(x, y, w, h, count, rng)
  const multi: V3ResultItem[] = []
  for (let i = 0; i < count; i++) {
    const [rx, ry, rw, rh] = cells[i]
    const pick = weightedPickRng(rng, labels, weights)
    multi.push({
      result: pick,
      confidence: Number(confidenceByLabelRng(pick, rng).toFixed(4)),
      bbox: [rx, ry, rw, rh],
      reason: regionReasonRng(rng, pick, i + 1),
      original_bbox: [rx, ry, rx + rw, ry + rh],
    })
  }
  const summaryLabel = weightedPickRng(
    rng,
    ['篡改', '可疑'] as const,
    [0.88, 0.12],
  )
  const summary: V3ResultItem = {
    result: summaryLabel,
    confidence: Number(confidenceByLabelRng(summaryLabel, rng).toFixed(4)),
    bbox: [x, y, w, h],
    reason: summaryReasonRng(rng, summaryLabel),
    original_bbox: [x, y, x + w, y + h],
  }
  return { result: summary, multi }
}

function newTaskId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function makeMockOutcome(bbox: BboxXYXY, fileName: string): {
  result: V3ResultItem
  multi: V3ResultItem[]
} {
  const base = hashString((fileName || 'unnamed').toLowerCase())
  const salt = (Date.now() ^ (performance.now() * 1e6)) >>> 0
  const rng = mulberry32(base ^ salt)
  if (isStrictNormalDemo(fileName)) {
    return makeStrictNormalOutcome(bbox, rng)
  }
  if (isStrictTamperDemo(fileName)) {
    return makeStrictTamperOutcome(bbox, rng)
  }
  const [x, y, w, h] = toXYWH(bbox)
  const count = rndInt(rng, 1, 2)
  const labels = ['正常', '可疑', '篡改'] as const
  const profile = resolveMockProfile(fileName)
  const classWeights: Record<MockClassProfile, readonly number[]> = {
    normal: [0.82, 0.15, 0.03],
    suspicious: [0.16, 0.66, 0.18],
    tamper: [0.05, 0.28, 0.67],
    mixed: [0.34, 0.38, 0.28],
  }
  const cells =
    profile === 'normal'
      ? allocateNonOverlappingRegionBoxes(x, y, w, h, count, rng)
      : allocateAmountFocusRegionBoxes(x, y, w, h, count, rng)
  const multi: V3ResultItem[] = []
  for (let i = 0; i < count; i++) {
    const [rx, ry, rw, rh] = cells[i]
    const pick = weightedPickRng(rng, labels, classWeights[profile])
    multi.push({
      result: pick,
      confidence: Number(confidenceByLabelRng(pick, rng).toFixed(4)),
      bbox: [rx, ry, rw, rh],
      reason: regionReasonRng(rng, pick, i + 1),
      original_bbox: [rx, ry, rx + rw, ry + rh],
    })
  }
  const summaryLabel = summaryLabelByProfileRng(rng, profile, multi)
  const summary: V3ResultItem = {
    result: summaryLabel,
    confidence: Number(confidenceByLabelRng(summaryLabel, rng).toFixed(4)),
    bbox: [x, y, w, h],
    reason: summaryReasonRng(rng, summaryLabel),
    original_bbox: [x, y, x + w, y + h],
  }
  return { result: summary, multi }
}

async function runMockDetect(file: File, bbox: BboxXYXY, signal?: AbortSignal): Promise<V1SyncDetectBody> {
  await waitMs(randomInt(4700, 5600), signal)
  const taskId = newTaskId()
  const out = makeMockOutcome(bbox, file.name || '')
  const rec: DetectionHistoryApiRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: nowIso(),
    mode: 'v1-sync-mock',
    task_id: taskId,
    original_filename: file.name || '未命名图片',
    image_created_at: fileModifiedString(file),
    bbox,
    status: 'COMPLETED',
    outcome: {
      result: out.result,
      multi_results: out.multi,
      error_msg: null,
    },
  }
  const list = readMockHistory()
  writeMockHistory([rec, ...list].slice(0, 200))
  return {
    status: 'COMPLETED',
    result: out.result,
    multi: out.multi,
    error_msg: null,
    task_id: taskId,
  }
}

export interface V3SubmitBody {
  status: string
  task_id: string
  /** 批次号，后端自动生成或透传前端传入值 */
  batch?: string | null
}

function normalizeV3SubmitJson(json: unknown): V3SubmitBody {
  const o = outcomeLayer(json)
  const taskId =
    typeof o.task_id === 'string'
      ? o.task_id.trim()
      : typeof o.taskId === 'string'
        ? o.taskId.trim()
        : ''
  const status =
    typeof o.status === 'string' && o.status.trim()
      ? o.status.trim()
      : typeof o.message === 'string' && taskId
        ? 'pending'
        : ''
  const batch =
    typeof o.batch === 'string' ? o.batch.trim() : null

  if (!taskId) {
    throw new Error('服务端未返回任务 ID')
  }

  return {
    status: status || 'pending',
    task_id: taskId,
    batch: batch || null,
  }
}

export type DetectSubmitOpts = {
  signal?: AbortSignal
  /** 单据/回单时间（如付款截图交易时间），有业务需要时随 FormData 提交 */
  document_time?: string | null
  /** 为 true 时后端在 v3 完成后自动跑规则并写入同一 task_id */
  with_rule_checks?: boolean
  /** 图片创建时间（取自文件 lastModified），格式 "YYYY-MM-DD HH:MM:SS"，透传到历史记录 */
  image_created_at?: string | null
  /** 批次号，如 "20260626-001"。不传则后端自动生成；同批次多张图传相同值即共享 */
  batch?: string | null
}

export type RuleCheckSubmitOpts = DetectSubmitOpts & {
  /** 与 async_v3 主鉴伪任务关联，便于历史记录聚合展示 */
  task_id?: string | null
}

function appendDocumentTime(fd: FormData, documentTime?: string | null): void {
  const t = typeof documentTime === 'string' ? documentTime.trim() : ''
  if (t) fd.append('document_time', t)
}

function appendImageCreatedAt(fd: FormData, imageCreatedAt?: string | null): void {
  const t = typeof imageCreatedAt === 'string' ? imageCreatedAt.trim() : ''
  if (t) fd.append('image_created_at', t)
}

function appendBatch(fd: FormData, batch?: string | null): void {
  const t = typeof batch === 'string' ? batch.trim() : ''
  if (t) fd.append('batch', t)
}

export type TimestampAnomaly =
  | string
  | {
      code?: string
      reason?: string
      [key: string]: unknown
    }

export type TimestampCheck = {
  passed?: boolean
  anomalies?: TimestampAnomaly[]
  reason?: string
  [key: string]: unknown
}

export type BboxOverlapCheck = {
  passed?: boolean
  overlap_score?: number | null
  reason?: string
  [key: string]: unknown
}

export type HardTamperFlags = string[] | Record<string, unknown> | null

export async function submitV3Detect(
  file: File,
  bbox?: BboxXYXY | null,
  opts?: DetectSubmitOpts,
): Promise<V3SubmitBody> {
  const fd = new FormData()
  fd.append('file', file)
  if (bbox != null) fd.append('bbox', JSON.stringify(bbox))
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  if (opts?.with_rule_checks) fd.append('with_rule_checks', 'true')
  const res = await fetch(aiDetectionUrl('/api/v3/detect'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeV3SubmitJson(json)
}

export async function submitV3Upload(
  file: File,
  opts?: DetectSubmitOpts,
): Promise<V3SubmitBody> {
  const fd = new FormData()
  fd.append('file', file)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const res = await fetch(aiDetectionUrl('/api/v3/upload'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeV3SubmitJson(json)
}

export async function submitV3DetectTask(
  taskId: string,
  bbox?: BboxXYXY | null,
  opts?: DetectSubmitOpts,
): Promise<V3SubmitBody> {
  const fd = new FormData()
  fd.append('task_id', taskId)
  if (bbox != null) fd.append('bbox', JSON.stringify(bbox))
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  if (opts?.with_rule_checks) fd.append('with_rule_checks', 'true')
  const res = await fetch(aiDetectionUrl('/api/v3/detect'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeV3SubmitJson(json)
}

/** POST /ai-detection/api/v1/image-detection/detect — 单图鉴伪（同步，一次请求返回结果） */
export interface V1SyncDetectBody {
  status?: string
  result?: V3ResultItem | null
  multi?: V3ResultItem[]
  error_msg?: string | null
  task_id?: string | null
  /** 批次号，后端自动生成或透传前端传入值 */
  batch?: string | null
}

function outcomeLayer(json: unknown): Record<string, unknown> {
  if (!isRecord(json)) return {}
  const data = json.data
  if (isRecord(data)) {
    return { ...json, ...data }
  }
  return json
}

function normalizeV1SyncJson(json: unknown): V1SyncDetectBody {
  const o = outcomeLayer(json)
  const multi =
    (Array.isArray(o.multi_results) ? o.multi_results : null) ??
    (Array.isArray(o.multiResults) ? o.multiResults : null) ??
    (Array.isArray(o.multi) ? o.multi : undefined)
  const result = (o.result as V3ResultItem | null | undefined) ?? null
  const err =
    typeof o.error_msg === 'string'
      ? o.error_msg
      : typeof o.errorMsg === 'string'
        ? o.errorMsg
        : typeof o.detail === 'string'
          ? o.detail
          : null
  const taskId =
    typeof o.task_id === 'string'
      ? o.task_id
      : typeof o.taskId === 'string'
        ? o.taskId
        : null
  const batch =
    typeof o.batch === 'string' ? o.batch.trim() : null
  const status = typeof o.status === 'string' ? o.status : undefined
  if (o.success === false || o.ok === false) {
    return {
      status: 'FAILED',
      result: null,
      multi: undefined,
      error_msg:
        err ||
        (typeof o.message === 'string' ? o.message : null) ||
        '检测失败',
      task_id: taskId,
      batch: batch || null,
    }
  }
  return {
    status,
    result,
    multi: multi as V3ResultItem[] | undefined,
    error_msg: err,
    task_id: taskId,
    batch: batch || null,
  }
}

/** bbox 为必填表单字段（全图可传 [0,0,naturalWidth,naturalHeight]） */
export async function submitV1ImageDetectSync(
  file: File,
  bbox: BboxXYXY,
  opts?: DetectSubmitOpts,
): Promise<V1SyncDetectBody> {
  if (useMockOnly()) {
    return runMockDetect(file, bbox, opts?.signal)
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bbox', JSON.stringify(bbox))
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const res = await fetch(aiDetectionUrl('/api/v1/image-detection/detect'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeV1SyncJson(json)
}

export interface V3ResultItem {
  result: string
  confidence: number
  bbox: BboxXYWH
  reason: string
  original_bbox?: BboxXYXY
  region_no?: number | null
  field_type?: 'amount' | 'name' | 'time' | 'manual' | string | null
  field_label?: string | null
  source?: string | null
  text?: string | null
  flags?: string | null
  ocr_confidence?: number | null
  amount_score?: number | null
  pixel_overlap_score?: number | null
  timestamp_check?: TimestampCheck | null
  bbox_overlap_check?: BboxOverlapCheck | null
  hard_tamper_flags?: HardTamperFlags
}

export interface V3PollBody {
  task_id: string
  status: string
  created_at?: string
  result?: V3ResultItem | null
  multi_results?: V3ResultItem[]
  error_msg?: string | null
  /** 与 task_id 关联的规则检测结果（with_rule_checks 或历史聚合） */
  linked_rule_checks?: RuleChecksData | null
}

function resultSeverity(label: unknown): number {
  const text = typeof label === 'string' ? label.trim() : ''
  if (text === '篡改') return 3
  if (text === '可疑') return 2
  if (text === '正常') return 1
  if (text === '错误') return 0
  return -1
}

function sortV3ResultItems(items?: V3ResultItem[]): V3ResultItem[] | undefined {
  if (!items?.length) return items
  return [...items].sort((a, b) => {
    const rankGap = resultSeverity(b?.result) - resultSeverity(a?.result)
    if (rankGap !== 0) return rankGap
    return Number(b?.confidence ?? 0) - Number(a?.confidence ?? 0)
  })
}

function topV3ResultItem(
  result: V3ResultItem | null | undefined,
  multi?: V3ResultItem[],
): V3ResultItem | null {
  if (result) return result
  return multi?.[0] ?? null
}

function normalizeV3PollJson(json: unknown): V3PollBody {
  const o = outcomeLayer(json)
  const rawMulti =
    (Array.isArray(o.multi_results) ? o.multi_results : null) ??
    (Array.isArray(o.multiResults) ? o.multiResults : null) ??
    undefined
  const multi = sortV3ResultItems(rawMulti as V3ResultItem[] | undefined)
  const result = topV3ResultItem(
    (o.result as V3ResultItem | null | undefined) ?? null,
    multi,
  )
  const taskId =
    typeof o.task_id === 'string'
      ? o.task_id
      : typeof o.taskId === 'string'
        ? o.taskId
        : ''
  const createdAt =
    typeof o.created_at === 'string'
      ? o.created_at
      : typeof o.createdAt === 'string'
        ? o.createdAt
        : undefined
  const errorMsg =
    typeof o.error_msg === 'string'
      ? o.error_msg
      : typeof o.errorMsg === 'string'
        ? o.errorMsg
        : typeof o.detail === 'string'
          ? o.detail
          : null

  return {
    task_id: taskId,
    status: typeof o.status === 'string' ? o.status : '',
    created_at: createdAt,
    result,
    multi_results: multi,
    error_msg: errorMsg,
    linked_rule_checks: parseLinkedRuleChecksField(o.linked_rule_checks ?? o.linkedRuleChecks),
  }
}

export async function getV3Result(
  taskId: string,
  opts?: { signal?: AbortSignal },
): Promise<V3PollBody> {
  const res = await fetch(aiDetectionUrl(`/api/v3/result/${encodeURIComponent(taskId)}`), {
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeV3PollJson(json)
}

/** 轮询 v3 任务直至完成或失败（建议间隔 1–2s） */
export async function pollV3UntilComplete(
  taskId: string,
  opts?: {
    signal?: AbortSignal
    intervalMs?: number
    maxAttempts?: number
    maxDurationMs?: number
    onPoll?: (status: string, attempt: number) => void
  },
): Promise<V3PollBody> {
  const intervalMs = opts?.intervalMs ?? 2000
  const maxAttempts = opts?.maxAttempts ?? 90
  const deadline = opts?.maxDurationMs != null ? Date.now() + opts.maxDurationMs : null
  for (let attempt = 1; ; attempt++) {
    if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const data = await getV3Result(taskId, { signal: opts?.signal })
    const st = (data.status || '').toUpperCase()
    opts?.onPoll?.(st, attempt)
    if (st === 'FAILED') {
      const message = data.error_msg?.trim() || '检测失败'
      throw new V3PollingError('failed', message, taskId, isRetryableDetectionError(new Error(message)))
    }
    if (st === 'COMPLETED') return data
    if (st !== 'PENDING' && st !== 'PROCESSING' && st) {
      throw new V3PollingError('unknown_status', `未知任务状态：${data.status}`, taskId, false)
    }
    const hasMoreAttempts = deadline != null ? Date.now() + intervalMs <= deadline : attempt < maxAttempts
    if (!hasMoreAttempts) break
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, intervalMs)
      opts?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true },
      )
    })
  }
  throw new V3PollingError('timeout', '检测超时，请稍后在历史记录中查看结果', taskId, true)
}

export async function getVisualizationBlob(taskId: string): Promise<Blob> {
  const enc = encodeURIComponent(taskId)
  const tryPaths = [
    // 优先尝试带 /ai-detection 前缀的路径（适配 Nginx 将 /ai-detection 直连后端的部署）
    aiDetectionUrl(`/api/v3/result/${enc}/visualization`),
    // 回退到网关/代理路径（如 /api/v3 或 /api/v1 根下的 /api/v3）
    resolveApiUrl(`/api/v3/result/${enc}/visualization`),
  ]

  let lastText = ''
  for (const url of tryPaths) {
    const res = await fetch(url)
    if (res.ok) return res.blob()
    // 收集最后一次响应文本用于报错提示
    try {
      lastText = await res.text()
    } catch {
      lastText = ''
    }
    // 若返回 JSON 且含 detail 字段，优先抛出该信息
    try {
      const j = lastText ? JSON.parse(lastText) : null
      if (j && typeof j.detail === 'string' && j.detail.trim()) {
        throw new Error(j.detail)
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e
    }
    // 否则继续尝试下一个备选 URL
  }

  throw new Error(httpFailMessage(400, lastText))
}

export async function deleteV3Task(taskId: string): Promise<void> {
  const res = await fetch(aiDetectionUrl(`/api/v3/task/${encodeURIComponent(taskId)}`), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
}

/** GET /ai-detection/api/v1/history — 鉴伪检测历史记录（单条结构字段略宽松） */
export interface DetectionHistoryOutcome {
  result?: V3ResultItem | null
  multi_results?: V3ResultItem[]
  error_msg?: string | null
  /** 与 task_id 关联的规则摘要（async_v3 历史） */
  linked_rule_checks?: unknown
  /** 规则检测完整结果（mode=rule_checks 或嵌套在 AI outcome 内） */
  rule_checks?: Record<string, unknown>
  pixel_overlap?: unknown
  timestamp?: unknown
  hard_tamper_flags?: Record<string, boolean>
  reason?: string
}

export interface DetectionHistoryApiRecord {
  id: string | number
  created_at: string
  mode: string
  task_id?: string | null
  original_filename?: string | null
  image_url?: string | null
  image_created_at?: string | null
  /** 批次号，格式 YYYYMMDD+序号（如 202601021） */
  batch?: string | null
  bbox?: unknown
  status: string
  outcome?: DetectionHistoryOutcome | null
  /** async_v3 等主记录上由后端聚合的规则结果 */
  linked_rule_checks?: RuleChecksData | null
  /** 标注状态：correct / wrong / suspicious / null（未标注） */
  feedback_status?: FeedbackJudgment | null
}

export interface DetectionHistoryListResult {
  items: DetectionHistoryApiRecord[]
  total: number
  page: number
  pageSize: number
}

function numOr(v: unknown, d: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/** 后端可能给 null、时间戳数字或空格字符串，不能再因缺时间整行丢弃（否则 total 有值、列表为空） */
function coerceHistoryCreatedAt(raw: Record<string, unknown>): string {
  const v = raw.created_at ?? raw.createdAt
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v > 1e12 ? v : v * 1000
    try {
      return new Date(ms).toISOString()
    } catch {
      return ''
    }
  }
  return String(v).trim()
}

function coerceApiRecord(raw: Record<string, unknown>): DetectionHistoryApiRecord | null {
  const id = raw.id
  if (id === undefined || id === null) return null
  const created = coerceHistoryCreatedAt(raw) || '—'
  const st = typeof raw.status === 'string' ? raw.status : 'COMPLETED'
  const mode = typeof raw.mode === 'string' ? raw.mode : 'unknown'
  const taskId =
    typeof raw.task_id === 'string'
      ? raw.task_id
      : typeof raw.taskId === 'string'
        ? raw.taskId
        : null
  const name =
    typeof raw.original_filename === 'string'
      ? raw.original_filename
      : typeof raw.originalFilename === 'string'
        ? raw.originalFilename
        : null
  const imageUrl =
    typeof raw.image_url === 'string'
      ? raw.image_url
      : typeof raw.imageUrl === 'string'
        ? raw.imageUrl
        : null
  const imageCreatedAt =
    typeof raw.image_created_at === 'string'
      ? raw.image_created_at
      : typeof raw.imageCreatedAt === 'string'
        ? raw.imageCreatedAt
        : null
  const batch =
    typeof raw.batch === 'string'
      ? raw.batch
      : null
  let outcome: DetectionHistoryOutcome | null = null
  const oc = raw.outcome
  if (isRecord(oc)) {
    const multi = sortV3ResultItems(
      Array.isArray(oc.multi_results)
        ? (oc.multi_results as V3ResultItem[])
        : Array.isArray(oc.multiResults)
          ? (oc.multiResults as V3ResultItem[])
          : undefined,
    )
    const result = topV3ResultItem(
      (oc.result as V3ResultItem | null | undefined) ?? null,
      multi,
    )
    outcome = {
      result,
      multi_results: multi,
      error_msg:
        typeof oc.error_msg === 'string'
          ? oc.error_msg
          : typeof oc.errorMsg === 'string'
            ? oc.errorMsg
            : null,
      rule_checks: isRecord(oc.rule_checks) ? oc.rule_checks : undefined,
      pixel_overlap: oc.pixel_overlap,
      timestamp: oc.timestamp,
      hard_tamper_flags: isRecord(oc.hard_tamper_flags)
        ? (oc.hard_tamper_flags as Record<string, boolean>)
        : undefined,
      reason: typeof oc.reason === 'string' ? oc.reason : undefined,
    }
  }
  const linkedRuleChecks =
    parseLinkedRuleChecksField(raw.linked_rule_checks ?? raw.linkedRuleChecks) ??
    parseLinkedRuleChecksField(outcome?.linked_rule_checks) ??
    (outcome?.rule_checks ? parseLinkedRuleChecksField(outcome.rule_checks) : null)

  const feedbackStatus = typeof raw.feedback_status === 'string'
    ? (raw.feedback_status as FeedbackJudgment | null)
    : null

  return {
    id: String(id),
    created_at: created,
    mode,
    task_id: taskId,
    original_filename: name,
    image_url: imageUrl,
    image_created_at: imageCreatedAt,
    batch,
    bbox: raw.bbox,
    status: st,
    outcome,
    linked_rule_checks: linkedRuleChecks,
    feedback_status: feedbackStatus,
  }
}

function extractItemsAndTotal(json: unknown): {
  items: DetectionHistoryApiRecord[]
  total: number
} {
  let rawList: unknown[] = []
  let total = 0

  if (Array.isArray(json)) {
    rawList = json
    total = json.length
  } else if (isRecord(json)) {
    if (Array.isArray(json.list)) rawList = json.list
    else if (Array.isArray(json.items)) rawList = json.items
    else if (Array.isArray(json.records)) rawList = json.records
    else if (Array.isArray(json.results)) rawList = json.results
    else if (Array.isArray(json.data)) {
      rawList = json.data
      total = numOr(json.total, rawList.length)
    } else if (isRecord(json.data)) {
      const d = json.data
      if (Array.isArray(d.list)) rawList = d.list
      else if (Array.isArray(d.items)) rawList = d.items
      else if (Array.isArray(d.records)) rawList = d.records
      else if (Array.isArray(d.results)) rawList = d.results
      total = numOr(d.total, 0)
    }
    if (!total) total = numOr(json.total, rawList.length)
  }

  const items: DetectionHistoryApiRecord[] = []
  for (const row of rawList) {
    if (!isRecord(row)) continue
    const rec = coerceApiRecord(row)
    if (rec) items.push(rec)
  }
  if (!total) total = items.length
  return { items, total }
}

/** 分页查询服务端检测历史（近 N 天，由后端配置） */
export async function fetchDetectionHistory(
  page = 1,
  pageSize = 20,
  /** 逗号分隔，如 `async_v3,rule_checks` */
  mode?: string,
): Promise<DetectionHistoryListResult> {
  const p = Math.max(1, page)
  const ps = Math.min(200, Math.max(1, pageSize))
  const fromMock = (): DetectionHistoryListResult => {
    const all = readMockHistory()
    const start = (p - 1) * ps
    const items = all.slice(start, start + ps)
    return { items, total: all.length, page: p, pageSize: ps }
  }
  if (useMockOnly()) {
    return fromMock()
  }
  const q = new URLSearchParams({
    page: String(p),
    page_size: String(ps),
  })
  const modeFilter = typeof mode === 'string' ? mode.trim() : ''
  if (modeFilter) q.set('mode', modeFilter)
  const res = await fetch(`${aiDetectionUrl('/api/v1/history')}?${q}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json: unknown = await res.json()
  const { items, total } = extractItemsAndTotal(json)
  return { items, total, page: p, pageSize: ps }
}

/** POST /ai-detection/api/v1/rule-checks — 像素重叠（可选 bbox）+ 时间戳规则聚合 */
export type RuleChecksPixelOverlap = {
  pixel_overlap_score?: number
  passed?: boolean
  message?: string
  overlap_metrics?: {
    structural_score?: number
    blend_score?: number
    double_edge_ratio?: number
    long_gradient_ratio?: number
    [key: string]: unknown
  }
  bbox?: number[]
  bbox_xyxy?: number[]
  alert?: boolean
  hard_tamper?: boolean
  reasons?: string[]
  [key: string]: unknown
}

/** POST /ai-detection/api/v1/rule-checks 不传 bbox 时返回的建议检测区域 */
export type SuggestedRoi = {
  bbox: [number, number, number, number]
  label: string
  category: string
  priority: number
  source: string
}

export type RuleChecksTimestampDetail = {
  status_bar_time?: string | null
  transaction_time?: string | null
  transaction_datetime?: string | null
  business_document_time?: string | null
  business_document_datetime?: string | null
  exif_datetime_original?: string | null
  exif_datetime_digitized?: string | null
  has_exif?: boolean
  exif_software?: string | null
  anomalies?: string[]
  business_mismatch?: boolean
  [key: string]: unknown
}

export type RuleChecksTimestamp = {
  passed?: boolean
  message?: string
  transaction_time?: string | null
  timestamp_check?: RuleChecksTimestampDetail
  risk?: number
  reasons?: string[]
  anomalies?: string[]
  hard_tamper?: boolean
  business_mismatch?: boolean
  [key: string]: unknown
}

export type RuleChecksData = {
  /** linked_rule_checks：false 表示无规则数据 */
  available?: boolean
  /** 规则侧综合状态：正常 / 可疑 / 篡改 */
  status?: string
  pixel_overlap?: RuleChecksPixelOverlap | null
  /** 像素重叠检测来源：传了 bbox 时为 "manual_bbox"，不传 bbox 且 pixel_overlap 为 null 时为 null */
  pixel_overlap_source?: 'manual_bbox' | null
  timestamp?: RuleChecksTimestamp
  /** 不传 bbox 时返回的建议检测区域，传了 bbox 时为 null */
  suggested_rois?: SuggestedRoi[] | null
  hard_tamper_flags?: Record<string, boolean>
  reason?: string
  /** 批次号，后端自动生成或透传前端传入值 */
  batch?: string | null
}

function mergeReasons(message: unknown, reasons: unknown): string[] | undefined {
  const list: string[] = []
  if (typeof message === 'string' && message.trim()) list.push(message.trim())
  if (Array.isArray(reasons)) {
    for (const r of reasons) {
      const t = String(r ?? '').trim()
      if (t) list.push(t)
    }
  }
  return list.length ? list : undefined
}

function normalizePixelOverlapBlock(
  raw: unknown,
  flags?: Record<string, boolean>,
): RuleChecksPixelOverlap | null {
  if (!isRecord(raw)) return null
  const passed = raw.passed
  const alert =
    passed === false ? true : passed === true ? false : raw.alert === true
  const hard_tamper =
    raw.hard_tamper === true ||
    flags?.pixel_overlap === true ||
    (passed === false && alert)
  return {
    ...raw,
    pixel_overlap_score:
      raw.pixel_overlap_score != null ? Number(raw.pixel_overlap_score) : undefined,
    passed: typeof passed === 'boolean' ? passed : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    alert,
    hard_tamper,
    reasons: mergeReasons(raw.message, raw.reasons),
  }
}

function normalizeTimestampBlock(
  raw: unknown,
  flags?: Record<string, boolean>,
): RuleChecksTimestamp | undefined {
  if (!isRecord(raw)) return undefined
  const passed = raw.passed
  const detail: RuleChecksTimestampDetail = isRecord(raw.timestamp_check)
    ? { ...(raw.timestamp_check as RuleChecksTimestampDetail) }
    : { ...raw }
  if (typeof raw.transaction_time === 'string' && raw.transaction_time.trim()) {
    detail.transaction_time = detail.transaction_time ?? raw.transaction_time
    detail.transaction_datetime =
      detail.transaction_datetime ?? raw.transaction_time
  }
  const hard_tamper =
    raw.hard_tamper === true ||
    flags?.timestamp === true ||
    passed === false
  const business_mismatch =
    raw.business_mismatch === true ||
    detail.business_mismatch === true ||
    (Array.isArray(detail.anomalies) && detail.anomalies.length > 0)
  return {
    passed: typeof passed === 'boolean' ? passed : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    transaction_time:
      typeof raw.transaction_time === 'string' ? raw.transaction_time : undefined,
    timestamp_check: detail,
    hard_tamper,
    business_mismatch,
    reasons: mergeReasons(raw.message, raw.reasons),
    anomalies: Array.isArray(raw.anomalies)
      ? raw.anomalies.map(String)
      : Array.isArray(detail.anomalies)
        ? detail.anomalies.map(String)
        : undefined,
    risk: typeof raw.risk === 'number' ? raw.risk : undefined,
  }
}

/** 解析 linked_rule_checks / 规则 outcome 完整结构 */
export function normalizeLinkedRuleChecksObject(raw: Record<string, unknown>): RuleChecksData | null {
  if (raw.available === false) {
    return {
      available: false,
      status: typeof raw.status === 'string' ? raw.status : undefined,
      reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    }
  }

  const flags = isRecord(raw.hard_tamper_flags)
    ? (raw.hard_tamper_flags as Record<string, boolean>)
    : undefined
  const pixel = normalizePixelOverlapBlock(raw.pixel_overlap, flags)
  const timestamp = normalizeTimestampBlock(raw.timestamp, flags)
  const reason = typeof raw.reason === 'string' ? raw.reason : undefined

  if (!pixel && !timestamp && !reason && raw.available !== true) {
    return null
  }

  return {
    available: raw.available === true ? true : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    pixel_overlap: pixel,
    pixel_overlap_source:
      typeof raw.pixel_overlap_source === 'string' && raw.pixel_overlap_source === 'manual_bbox'
        ? 'manual_bbox'
        : null,
    timestamp,
    suggested_rois: Array.isArray(raw.suggested_rois) ? raw.suggested_rois as SuggestedRoi[] : null,
    hard_tamper_flags: flags,
    reason,
  }
}

function ruleCheckDataLayer(json: unknown): Record<string, unknown> {
  if (!isRecord(json)) return {}
  if (typeof json.status === 'string' && json.status === 'error') {
    const msg =
      typeof json.message === 'string' && json.message.trim()
        ? json.message.trim()
        : '规则检测失败'
    throw new Error(msg)
  }
  const merged = outcomeLayer(json)
  if (isRecord(merged.data)) return merged.data
  return merged
}

function normalizeRuleChecksJson(json: unknown): RuleChecksData {
  const o = ruleCheckDataLayer(json)
  const batch =
    (isRecord(json) && typeof json.batch === 'string' ? json.batch.trim() : null) ??
    (isRecord(o) && typeof o.batch === 'string' ? (o as Record<string, unknown>).batch as string : null)
  const linked = normalizeLinkedRuleChecksObject(o)
  if (linked) return { ...linked, batch: batch || linked.batch }
  return {
    pixel_overlap: normalizePixelOverlapBlock(o.pixel_overlap),
    pixel_overlap_source:
      typeof o.pixel_overlap_source === 'string' && o.pixel_overlap_source === 'manual_bbox'
        ? 'manual_bbox'
        : null,
    timestamp: normalizeTimestampBlock(o.timestamp),
    suggested_rois: Array.isArray(o.suggested_rois) ? o.suggested_rois as SuggestedRoi[] : null,
    hard_tamper_flags: isRecord(o.hard_tamper_flags)
      ? (o.hard_tamper_flags as Record<string, boolean>)
      : undefined,
    reason: typeof o.reason === 'string' ? o.reason : undefined,
    batch: batch || null,
  }
}

/** 解析 GET result / 历史列表中的 linked_rule_checks（对象或数组取首项） */
export function parseLinkedRuleChecksField(raw: unknown): RuleChecksData | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const parsed = parseLinkedRuleChecksField(item)
      if (parsed) return parsed
    }
    return null
  }
  if (!isRecord(raw)) return null
  if (raw.available === false) {
    return normalizeLinkedRuleChecksObject(raw)
  }
  try {
    const fromLayer = normalizeRuleChecksJson(isRecord(raw) ? { data: raw } : raw)
    if (fromLayer.available === false || fromLayer.pixel_overlap || fromLayer.timestamp || fromLayer.suggested_rois || fromLayer.reason) {
      return fromLayer
    }
  } catch {
    /* fall through */
  }
  return normalizeLinkedRuleChecksObject(raw)
}

async function postRuleCheckMultipart(
  path: string,
  file: File,
  fields: Record<string, string | undefined>,
  opts?: RuleCheckSubmitOpts,
): Promise<RuleChecksData> {
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== '') fd.append(k, v)
  }
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const taskId = typeof opts?.task_id === 'string' ? opts.task_id.trim() : ''
  if (taskId) fd.append('task_id', taskId)
  const res = await fetch(aiDetectionUrl(path), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeRuleChecksJson(json)
}

/** 仅规则检测：POST rule-checks。AI+规则 请用 v3/detect + with_rule_checks=true，勿并行调用本接口。 */
export async function submitRuleChecks(
  file: File,
  bbox?: BboxXYXY | null,
  opts?: RuleCheckSubmitOpts,
): Promise<RuleChecksData> {
  const fields: Record<string, string | undefined> = {}
  if (bbox != null) fields.bbox = JSON.stringify(bbox)
  return postRuleCheckMultipart('/api/v1/rule-checks', file, fields, opts)
}

export async function submitRuleChecksFromTask(
  taskId: string,
  bbox?: BboxXYXY | null,
  opts?: RuleCheckSubmitOpts,
): Promise<RuleChecksData> {
  const fd = new FormData()
  fd.append('task_id', taskId)
  if (bbox != null) fd.append('bbox', JSON.stringify(bbox))
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const res = await fetch(aiDetectionUrl('/api/v1/rule-checks/from-task'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return normalizeRuleChecksJson(json)
}

/** 仅 ROI 像素重叠 */
export async function submitPixelOverlapCheck(
  file: File,
  bbox: BboxXYXY,
  opts?: DetectSubmitOpts,
): Promise<RuleChecksPixelOverlap> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bbox', JSON.stringify(bbox))
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const res = await fetch(aiDetectionUrl('/api/v1/pixel-overlap/check'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return ruleCheckDataLayer(json) as RuleChecksPixelOverlap
}

/** 仅时间戳 / EXIF / 单据时间 */
export async function submitTimestampCheck(
  file: File,
  opts?: DetectSubmitOpts,
): Promise<RuleChecksTimestamp> {
  const fd = new FormData()
  fd.append('file', file)
  appendDocumentTime(fd, opts?.document_time)
  appendImageCreatedAt(fd, opts?.image_created_at)
  appendBatch(fd, opts?.batch)
  const res = await fetch(aiDetectionUrl('/api/v1/timestamp/check'), {
    method: 'POST',
    body: fd,
    signal: opts?.signal,
  })
  if (!res.ok) {
    const t = await res.text()
    throwHttpError(res.status, t)
  }
  const json: unknown = await res.json()
  return ruleCheckDataLayer(json) as RuleChecksTimestamp
}

// ---- 反馈标注 ----

export interface FeedbackResult {
  status: string
  entry?: FeedbackEntry
}

export type FeedbackJudgment = 'correct' | 'wrong' | 'suspicious'

export interface FeedbackEntry {
  task_id?: string
  judgment: FeedbackJudgment
  timestamp?: string
  updated_at?: string
  confirmed_at?: string
  bbox?: BboxXYXY | number[] | null
  engine_result?: V3ResultItem | Record<string, unknown> | null
  user_note?: string
  entry_id?: string
  folder_name: string
  original_image?: string
  cropped_roi?: string | null
  image_url?: string | null
  roi_url?: string | null
  can_confirm?: boolean
  /** 人工标注提交的时间，格式 "YYYY-MM-DD HH:MM:SS"，未标注为 null */
  feedback_marked_at?: string | null
}

export interface FeedbackListResult {
  total: number
  items: FeedbackEntry[]
}

export async function submitFeedback(
  taskId: string,
  judgment: FeedbackJudgment,
  bbox?: BboxXYXY | null,
  note?: string,
): Promise<FeedbackResult> {
  const body: Record<string, unknown> = {
    task_id: taskId,
    judgment,
    note: note ?? '',
  }
  if (bbox != null) body.bbox = bbox
  const res = await fetch(aiDetectionUrl('/api/v3/feedback/judge'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<FeedbackResult>
}

export async function fetchFeedbackEntries(
  judgment?: FeedbackJudgment | 'all',
): Promise<FeedbackListResult> {
  const q = new URLSearchParams()
  if (judgment && judgment !== 'all') q.set('judgment', judgment)
  const suffix = q.toString()
  const res = await fetch(`${aiDetectionUrl('/api/v3/feedback/list')}${suffix ? `?${suffix}` : ''}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json = (await res.json()) as FeedbackListResult
  return {
    total: Number(json.total ?? 0),
    items: Array.isArray(json.items) ? json.items : [],
  }
}

export async function updateFeedbackEntry(
  folderName: string,
  judgment: FeedbackJudgment,
  note?: string,
): Promise<FeedbackResult> {
  const res = await fetch(aiDetectionUrl(`/api/v3/feedback/${encodeURIComponent(folderName)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ judgment, note }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<FeedbackResult>
}

export async function deleteFeedbackEntry(folderName: string): Promise<void> {
  const res = await fetch(aiDetectionUrl(`/api/v3/feedback/${encodeURIComponent(folderName)}`), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
}

export async function deleteDetectionHistory(recordId: string | number): Promise<void> {
  const res = await fetch(aiDetectionUrl(`/api/v1/history/${encodeURIComponent(String(recordId))}`), {
    method: 'DELETE',
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
}

// ---- 鉴伪历史导出 ----

export type HistoryExportDetectionResult = '正常' | '可疑' | '篡改'
export type HistoryExportBboxMode = 'all' | 'manual' | 'auto'
export type HistoryExportImageVariant = 'original' | 'annotated'
export type HistoryExportMatchMode = 'primary' | 'any'
/** 导出筛选：含未标注（数据库 feedback_status 为 NULL） */
export type HistoryExportFeedbackFilter = FeedbackJudgment | 'unmarked'

export interface HistoryExportRequest {
  start_time: string
  end_time: string
  detection_results?: HistoryExportDetectionResult[]
  bbox_mode?: HistoryExportBboxMode
  feedback_status?: HistoryExportFeedbackFilter[]
  modes?: string[]
  status?: string
  match_mode?: HistoryExportMatchMode
  image_variant?: HistoryExportImageVariant
  /** 批次号筛选，如 "20260626-001"；不传表示全部 */
  batch?: string | null
}

export interface HistoryExportPreviewItem {
  id: number
  created_at: string
  mode: string
  task_id?: string | null
  original_filename?: string | null
  image_created_at?: string | null
  /** 批次号，格式 YYYYMMDD+序号（如 202601021） */
  batch?: string | null
  status: string
  detection_result: string
  detection_results_all?: string[]
  bbox_mode?: 'manual' | 'auto' | 'unknown'
  has_image: boolean
  image_url?: string | null
  feedback_status?: FeedbackJudgment | null
}

export interface HistoryExportPreviewResult {
  status: string
  total_matched: number
  with_image: number
  without_image: number
  export_max_records: number
  exceeds_limit: boolean
  preview_truncated: boolean
  preview_list_size: number
  filters_applied?: Record<string, unknown>
  list: HistoryExportPreviewItem[]
}

async function parseJsonErrorDetail(res: Response, fallback: string): Promise<string> {
  const t = await res.text()
  try {
    const j = JSON.parse(t) as { detail?: unknown; message?: unknown }
    if (typeof j.detail === 'string' && j.detail.trim()) return j.detail.trim()
    if (Array.isArray(j.detail)) return j.detail.map(String).join('; ')
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim()
  } catch {
    /* ignore */
  }
  if (t.trim() && !t.trim().startsWith('<')) return t.trim().slice(0, 300)
  return fallback || httpFailMessage(res.status, t)
}

export async function fetchHistoryExportPreview(
  body: HistoryExportRequest,
  opts?: { signal?: AbortSignal },
): Promise<HistoryExportPreviewResult> {
  const res = await fetch(aiDetectionUrl('/api/v1/history/export/preview'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    throw new Error(await parseJsonErrorDetail(res, `预览失败（HTTP ${res.status}）`))
  }
  const json = (await res.json()) as HistoryExportPreviewResult
  return {
    ...json,
    total_matched: Number(json.total_matched ?? 0),
    with_image: Number(json.with_image ?? 0),
    without_image: Number(json.without_image ?? 0),
    export_max_records: Number(json.export_max_records ?? 500),
    exceeds_limit: Boolean(json.exceeds_limit),
    preview_truncated: Boolean(json.preview_truncated),
    preview_list_size: Number(json.preview_list_size ?? 0),
    list: Array.isArray(json.list) ? json.list : [],
  }
}

export interface HistoryExportZipResult {
  blob: Blob
  filename: string
  recordCount?: number
  imagesAdded?: number
  skippedNoImage?: number
}

function readExportCountHeader(res: Response, name: string): number | undefined {
  const raw = res.headers.get(name)?.trim()
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export async function downloadHistoryExportZip(
  body: HistoryExportRequest,
  opts?: { signal?: AbortSignal },
): Promise<HistoryExportZipResult> {
  const res = await fetch(aiDetectionUrl('/api/v1/history/export'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts?.signal,
  })
  if (!res.ok) {
    throw new Error(await parseJsonErrorDetail(res, `导出失败（HTTP ${res.status}）`))
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const m = cd.match(/filename="(.+)"/i) ?? cd.match(/filename=([^;\s]+)/i)
  const filename = m?.[1]?.replace(/^["']|["']$/g, '') || 'ai_detection_export.zip'
  return {
    blob,
    filename,
    recordCount: readExportCountHeader(res, 'X-Export-Record-Count'),
    imagesAdded: readExportCountHeader(res, 'X-Export-Images-Added'),
    skippedNoImage: readExportCountHeader(res, 'X-Export-Skipped-No-Image'),
  }
}

// ---- 训练集管理 ----

export type TrainingDatasetLabel = 0 | 1
export type TrainingDatasetFilter = TrainingDatasetLabel | 'all'

export interface TrainingDatasetEntry {
  filename: string
  stem: string
  base_stem: string
  label: TrainingDatasetLabel
  label_text: string
  is_enhanced: boolean
  has_annotation: boolean
  json_name?: string | null
  size_bytes: number
  width?: number | null
  height?: number | null
  modified_at?: number
  image_url?: string | null
  json_url?: string | null
}

export interface TrainingDatasetSummary {
  total: number
  normal: number
  tampered: number
  annotations: number
}

export interface TrainingDatasetListResult {
  status?: string
  total: number
  summary: TrainingDatasetSummary
  items: TrainingDatasetEntry[]
}

function normalizeDatasetSummary(raw: Partial<TrainingDatasetSummary> | undefined): TrainingDatasetSummary {
  return {
    total: Number(raw?.total ?? 0),
    normal: Number(raw?.normal ?? 0),
    tampered: Number(raw?.tampered ?? 0),
    annotations: Number(raw?.annotations ?? 0),
  }
}

export async function fetchTrainingDatasetEntries(
  label: TrainingDatasetFilter = 'all',
  includeEnhanced = true,
): Promise<TrainingDatasetListResult> {
  const q = new URLSearchParams()
  if (label !== 'all') q.set('label', String(label))
  q.set('include_enhanced', includeEnhanced ? 'true' : 'false')
  const res = await fetch(`${aiDetectionUrl('/api/v3/training-dataset/list')}?${q}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json = (await res.json()) as TrainingDatasetListResult
  return {
    status: json.status,
    total: Number(json.total ?? 0),
    summary: normalizeDatasetSummary(json.summary),
    items: Array.isArray(json.items) ? json.items : [],
  }
}

export async function fetchTrainingDatasetAnnotation(filename: string): Promise<unknown> {
  const res = await fetch(aiDetectionUrl(`/api/v3/training-dataset/${encodeURIComponent(filename)}/annotation`))
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json = (await res.json()) as { annotation?: unknown }
  return json.annotation ?? null
}

export async function updateTrainingDatasetEntry(
  filename: string,
  label: TrainingDatasetLabel,
): Promise<{ entry?: TrainingDatasetEntry; summary?: TrainingDatasetSummary }> {
  const res = await fetch(aiDetectionUrl(`/api/v3/training-dataset/${encodeURIComponent(filename)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json = (await res.json()) as { entry?: TrainingDatasetEntry; summary?: TrainingDatasetSummary }
  return { entry: json.entry, summary: json.summary ? normalizeDatasetSummary(json.summary) : undefined }
}

export async function deleteTrainingDatasetEntry(
  filename: string,
  deleteFamily = true,
): Promise<{ summary?: TrainingDatasetSummary }> {
  const q = new URLSearchParams({ delete_family: deleteFamily ? 'true' : 'false' })
  const res = await fetch(`${aiDetectionUrl(`/api/v3/training-dataset/${encodeURIComponent(filename)}`)}?${q}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  const json = (await res.json()) as { summary?: TrainingDatasetSummary }
  return { summary: json.summary ? normalizeDatasetSummary(json.summary) : undefined }
}

// ---- 运维与监控 ----

export interface HealthStatus {
  status: string
  font_lib_ready: boolean
  font_lib_size: number
  global_model_loaded: boolean
  ocr_available: boolean
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(aiDetectionUrl('/api/v3/health'))
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<HealthStatus>
}

export interface ModelVersions {
  versions: Array<Record<string, unknown>>
  current_model?: string
}

export async function fetchModels(): Promise<ModelVersions> {
  const res = await fetch(aiDetectionUrl('/api/v3/models'))
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<ModelVersions>
}

export async function reloadModels(version?: string): Promise<{ status: string; detail: Record<string, unknown> }> {
  const fd = new FormData()
  if (version) fd.append('version', version)
  const res = await fetch(aiDetectionUrl('/api/v3/reload'), {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<{ status: string; detail: Record<string, unknown> }>
}

export async function triggerTraining(confirm: boolean): Promise<{ status: string; warning?: string; summary?: Record<string, unknown> }> {
  const fd = new FormData()
  fd.append('confirm', String(confirm))
  const res = await fetch(aiDetectionUrl('/api/v3/train'), {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(httpFailMessage(res.status, t))
  }
  return res.json() as Promise<{ status: string; warning?: string; summary?: Record<string, unknown> }>
}
