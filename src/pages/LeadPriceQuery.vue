<template>
  <div class="smm-lead-page">
    <!-- 顶部摘要卡片 -->
    <div class="card summary-card">
      <div class="summary-head">
        <div>
          <h2 class="summary-title">{{ latest?.产品 || 'SMM 1#铅锭参考价' }}</h2>
          <p v-if="latest" class="summary-meta">
            <span>定价日期：{{ latest.定价日期 }}</span>
            <span v-if="latest.抓取时间">抓取时间：{{ formatFetchTime(latest.抓取时间) }}</span>
          </p>
          <p v-else-if="!latestLoading" class="summary-meta text-muted">暂无最新价格数据</p>
        </div>
        <button class="btn btn-primary" :disabled="syncLoading" @click="handleSync">
          {{ syncLoading ? '同步中…' : '立即同步' }}
        </button>
      </div>

      <p v-if="latestError && !latest" class="inline-error">{{ latestError }}</p>
      <p v-else-if="latestError && latest" class="inline-warn">{{ latestError }}</p>

      <div v-if="latestLoading" class="summary-loading">正在加载最新价格…</div>
      <div v-else-if="latest" class="price-grid">
        <div class="price-cell">
          <span class="price-label">最低价</span>
          <span class="price-value">{{ formatPrice(latest.最低价) }}</span>
        </div>
        <div class="price-cell price-cell--main">
          <span class="price-label">均价</span>
          <span class="price-value price-value--main">{{ formatPrice(latest.均价) }}</span>
          <span v-if="dayChange !== null" class="price-change" :class="dayChange >= 0 ? 'up' : 'down'">
            {{ dayChange >= 0 ? '+' : '' }}{{ formatPrice(dayChange) }}
            <span v-if="dayChangePct !== null">（{{ dayChangePct >= 0 ? '+' : '' }}{{ dayChangePct.toFixed(2) }}%）</span>
          </span>
        </div>
        <div class="price-cell">
          <span class="price-label">最高价</span>
          <span class="price-value">{{ formatPrice(latest.最高价) }}</span>
        </div>
        <div class="price-unit">{{ latest.单位 || '元/吨' }}</div>
      </div>

    </div>

    <!-- 筛选 + 走势图 -->
    <div class="card">
      <div class="filter-row">
        <div class="filter-item">
          <label>定价日期</label>
          <div class="date-range">
            <input v-model="filters.dateFrom" type="date" class="filter-input" />
            <span>至</span>
            <input v-model="filters.dateTo" type="date" class="filter-input" />
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary" :disabled="chartLoading || listLoading" @click="handleQuery">查询</button>
          <button class="btn btn-secondary" @click="resetFilters">重置</button>
        </div>
      </div>

      <div class="chart-section">
        <div class="chart-head">
          <span class="chart-title">价格走势</span>
          <span class="chart-legend">
            <span class="legend-item"><i class="legend-band"></i>最低–最高区间</span>
            <span class="legend-item"><i class="legend-line"></i>均价</span>
          </span>
        </div>
        <p v-if="chartError" class="inline-error">{{ chartError }}</p>
        <div v-if="chartLoading" class="chart-empty">加载走势数据…</div>
        <div v-else-if="chartSeries.length === 0" class="chart-empty">暂无走势数据，请点击「立即同步」或调整日期范围后查询</div>
        <div v-else class="chart-wrap">
          <canvas
            ref="chartCanvasRef"
            class="chart-canvas"
            @mousemove="onChartMouseMove"
            @mouseleave="onChartMouseLeave"
          />
          <div
            v-if="chartHoverIndex >= 0 && chartSeries[chartHoverIndex]"
            class="chart-tooltip"
            :style="chartTooltipStyle"
          >
            <div class="chart-tooltip-date">{{ chartSeries[chartHoverIndex]!.定价日期 }}</div>
            <div class="chart-tooltip-row">最低 {{ formatPrice(chartSeries[chartHoverIndex]!.最低价) }}</div>
            <div class="chart-tooltip-row">最高 {{ formatPrice(chartSeries[chartHoverIndex]!.最高价) }}</div>
            <div class="chart-tooltip-price">
              均价 {{ formatPrice(chartSeries[chartHoverIndex]!.均价) }} 元/吨
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史表格 -->
    <div class="card">
      <div class="table-head">
        <span class="table-title">历史记录</span>
        <span class="table-count">共 {{ listTotal }} 条</span>
      </div>
      <p v-if="listError" class="inline-error">{{ listError }}</p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>定价日期</th>
              <th>最低价</th>
              <th>最高价</th>
              <th>均价</th>
              <th>涨跌</th>
              <th>单位</th>
              <th>抓取时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="listLoading">
              <td colspan="7" class="empty-data">加载中…</td>
            </tr>
            <tr v-else-if="listRows.length === 0">
              <td colspan="7" class="empty-data">暂无历史数据，请点击「立即同步」</td>
            </tr>
            <tr v-for="(row, idx) in listRows" v-else :key="row.id">
              <td>{{ row.定价日期 }}</td>
              <td>{{ formatPrice(row.最低价) }}</td>
              <td>{{ formatPrice(row.最高价) }}</td>
              <td class="col-avg">{{ formatPrice(row.均价) }}</td>
              <td>
                <span v-if="rowChange(row, idx) !== null" :class="rowChange(row, idx)! >= 0 ? 'chg-up' : 'chg-down'">
                  {{ formatChange(rowChange(row, idx)!) }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>{{ row.单位 || '元/吨' }}</td>
              <td>{{ formatFetchTime(row.抓取时间) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button :disabled="listPage <= 1 || listLoading" @click="gotoPage(listPage - 1)">上一页</button>
        <span>第 {{ listPage }} / {{ listTotalPages }} 页（每页 {{ listPageSize }} 条）</span>
        <button :disabled="listPage >= listTotalPages || listLoading" @click="gotoPage(listPage + 1)">下一页</button>
      </div>
    </div>

    <p class="page-footer">
      数据来源于上海有色网公开行情，均价按区间价 (最低价+最高价)/2 折算，仅供参考。系统每日 10:35（上海时区）自动更新，也可手动点击「立即同步」。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  fetchLatestSmmLeadPrice,
  fetchSmmLeadPriceChartSeries,
  fetchSmmLeadPriceHistory,
  formatSmmLeadPriceError,
  syncSmmLeadPrice,
  type SmmLeadReferencePrice,
} from '@/api/smmLeadReferencePriceApi'

const latest = ref<SmmLeadReferencePrice | null>(null)
const latestLoading = ref(false)
const latestError = ref('')
const syncLoading = ref(false)

const filters = ref({ dateFrom: '', dateTo: '' })
const chartSeries = ref<SmmLeadReferencePrice[]>([])
const chartLoading = ref(false)
const chartError = ref('')
const chartCanvasRef = ref<HTMLCanvasElement | null>(null)
const chartHoverIndex = ref(-1)
const chartTooltipStyle = ref<Record<string, string>>({})

interface ChartLayout {
  width: number
  height: number
  margin: { t: number; r: number; b: number; l: number }
  toX: (i: number) => number
  toY: (v: number) => number
}

let chartLayout: ChartLayout | null = null

const listRows = ref<SmmLeadReferencePrice[]>([])
const listTotal = ref(0)
const listPage = ref(1)
const listPageSize = 20
const listLoading = ref(false)
const listError = ref('')

const listTotalPages = computed(() => Math.max(1, Math.ceil(listTotal.value / listPageSize)))

/** 与上一条（更早交易日）均价对比 */
const dayChange = computed(() => {
  if (!latest.value || chartSeries.value.length < 2) return null
  const sorted = [...chartSeries.value].sort((a, b) => a.定价日期.localeCompare(b.定价日期))
  const idx = sorted.findIndex((r) => r.定价日期 === latest.value!.定价日期)
  if (idx <= 0) return null
  return latest.value.均价 - sorted[idx - 1]!.均价
})

const dayChangePct = computed(() => {
  if (dayChange.value === null || !latest.value) return null
  const sorted = [...chartSeries.value].sort((a, b) => a.定价日期.localeCompare(b.定价日期))
  const idx = sorted.findIndex((r) => r.定价日期 === latest.value!.定价日期)
  if (idx <= 0) return null
  const prev = sorted[idx - 1]!.均价
  if (prev === 0) return null
  return (dayChange.value / prev) * 100
})

function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${formatPrice(n)}`
}

function formatFetchTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.replace('T', ' ').slice(0, 19)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function defaultChartDateRange(): { from: string; to: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(start), to: fmt(end) }
}

function applyDefaultFilters() {
  const { from, to } = defaultChartDateRange()
  filters.value = { dateFrom: from, dateTo: to }
}

function rowChange(row: SmmLeadReferencePrice, idx: number): number | null {
  const prev = listRows.value[idx + 1]
  if (!prev) return null
  return row.均价 - prev.均价
}

async function loadLatest(fallbackOn502 = true) {
  latestLoading.value = true
  latestError.value = ''
  try {
    latest.value = await fetchLatestSmmLeadPrice(false)
  } catch (e) {
    latestError.value = formatSmmLeadPriceError(e)
    if (!fallbackOn502 || latest.value) {
      /* 保留库内最后一条 */
    } else {
      latest.value = null
    }
  } finally {
    latestLoading.value = false
  }
}

async function loadChart() {
  chartLoading.value = true
  chartError.value = ''
  const range = filters.value.dateFrom && filters.value.dateTo
    ? { from: filters.value.dateFrom, to: filters.value.dateTo }
    : defaultChartDateRange()
  try {
    chartSeries.value = await fetchSmmLeadPriceChartSeries(range.from, range.to)
  } catch (e) {
    chartError.value = formatSmmLeadPriceError(e)
    chartSeries.value = []
  } finally {
    chartLoading.value = false
    await nextTick()
    drawChart()
  }
}

async function loadList() {
  listLoading.value = true
  listError.value = ''
  try {
    const payload = await fetchSmmLeadPriceHistory({
      page: listPage.value,
      page_size: listPageSize,
      date_from: filters.value.dateFrom || undefined,
      date_to: filters.value.dateTo || undefined,
    })
    listRows.value = payload.list
    listTotal.value = payload.total
  } catch (e) {
    listError.value = formatSmmLeadPriceError(e)
    listRows.value = []
    listTotal.value = 0
  } finally {
    listLoading.value = false
  }
}

async function handleQuery() {
  const start = filters.value.dateFrom
  const end = filters.value.dateTo
  if (start && end && end < start) {
    window.alert('结束日期不能早于开始日期，请重新选择')
    return
  }
  listPage.value = 1
  await Promise.all([loadChart(), loadList()])
}

function resetFilters() {
  applyDefaultFilters()
  listPage.value = 1
  void loadChart()
  void loadList()
}

function gotoPage(p: number) {
  listPage.value = p
  void loadList()
}

async function handleSync() {
  syncLoading.value = true
  latestError.value = ''
  try {
    const result = await syncSmmLeadPrice()
    latest.value = result.data
    listPage.value = 1
    await Promise.all([loadChart(), loadList()])
  } catch (e) {
    latestError.value = formatSmmLeadPriceError(e)
    await loadLatest(false)
  } finally {
    syncLoading.value = false
  }
}

function buildChartLayout(
  width: number,
  height: number,
  mins: number[],
  maxs: number[],
  avgs: number[],
  n: number,
): ChartLayout & { W: number; H: number; yMin: number; yMax: number; yRange: number } {
  const margin = { t: 24, r: 20, b: 56, l: 72 }
  const W = width - margin.l - margin.r
  const H = height - margin.t - margin.b
  const yMin = Math.min(...mins, ...avgs) * 0.998
  const yMax = Math.max(...maxs, ...avgs) * 1.002
  const yRange = yMax - yMin || 1
  const xStep = n <= 1 ? W / 2 : W / (n - 1)
  const toY = (v: number) => margin.t + H - ((v - yMin) / yRange) * H
  const toX = (i: number) => margin.l + i * xStep
  return { width, height, margin, W, H, yMin, yMax, yRange, toX, toY }
}

function drawChart(highlightIndex = -1) {
  const canvas = chartCanvasRef.value
  if (!canvas || chartSeries.value.length === 0) {
    chartLayout = null
    return
  }

  const series = chartSeries.value
  const dates = series.map((r) => r.定价日期)
  const mins = series.map((r) => r.最低价)
  const maxs = series.map((r) => r.最高价)
  const avgs = series.map((r) => r.均价)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const wrap = canvas.parentElement
  const width = Math.max((wrap?.clientWidth ?? 720) - 8, 320)
  const height = 280
  canvas.width = width
  canvas.height = height

  const layout = buildChartLayout(width, height, mins, maxs, avgs, dates.length)
  const { margin, W, H, toX, toY } = layout
  chartLayout = layout
  const n = dates.length

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(margin.l, margin.t)
  ctx.lineTo(margin.l, margin.t + H)
  ctx.lineTo(margin.l + W, margin.t + H)
  ctx.stroke()

  const ySteps = 5
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  for (let i = 0; i <= ySteps; i++) {
    const y = margin.t + H - (i / ySteps) * H
    const val = layout.yMin + (i / ySteps) * layout.yRange
    ctx.strokeStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.moveTo(margin.l, y)
    ctx.lineTo(margin.l + W, y)
    ctx.stroke()
    ctx.fillText(formatPrice(val), 4, y + 4)
  }

  if (highlightIndex >= 0 && highlightIndex < n) {
    const hx = toX(highlightIndex)
    ctx.strokeStyle = 'rgba(20, 118, 219, 0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(hx, margin.t)
    ctx.lineTo(hx, margin.t + H)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.fillStyle = 'rgba(20, 118, 219, 0.12)'
  ctx.beginPath()
  mins.forEach((v, i) => {
    const x = toX(i)
    const y = toY(v)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  for (let i = n - 1; i >= 0; i--) {
    ctx.lineTo(toX(i), toY(maxs[i]!))
  }
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#1476db'
  ctx.lineWidth = 2
  ctx.beginPath()
  avgs.forEach((v, i) => {
    const x = toX(i)
    const y = toY(v)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  avgs.forEach((v, i) => {
    const x = toX(i)
    const y = toY(v)
    const active = i === highlightIndex
    ctx.fillStyle = '#1476db'
    ctx.beginPath()
    ctx.arc(x, y, active ? 6 : 3, 0, Math.PI * 2)
    ctx.fill()
    if (active) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  const maxLabs = Math.max(2, Math.floor(W / 56))
  const labStep = Math.max(1, Math.ceil(n / maxLabs))
  ctx.fillStyle = '#64748b'
  dates.forEach((d, i) => {
    if (i % labStep !== 0 && i !== n - 1) return
    const label = d.length >= 10 ? d.slice(5) : d
    ctx.fillText(label, toX(i) - 16, margin.t + H + 20)
  })

  ctx.fillStyle = '#475569'
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillText('均价（元/吨）', margin.l, margin.t - 8)
  ctx.fillText('定价日期', margin.l + W / 2 - 28, height - 6)

  if (highlightIndex >= 0) {
    updateChartTooltipPosition(highlightIndex)
  }
}

function canvasPointer(ev: MouseEvent): { x: number; y: number } {
  const canvas = chartCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  }
}

function findNearestChartPoint(px: number, _py: number): number {
  if (!chartLayout) return -1
  const series = chartSeries.value
  if (series.length === 0) return -1
  let best = 0
  let bestDist = Math.abs(px - chartLayout!.toX(0))
  series.forEach((_row, i) => {
    const dx = Math.abs(px - chartLayout!.toX(i))
    if (dx < bestDist) {
      bestDist = dx
      best = i
    }
  })
  return best
}

function updateChartTooltipPosition(index: number) {
  const canvas = chartCanvasRef.value
  if (!canvas || !chartLayout || index < 0) return
  const row = chartSeries.value[index]
  if (!row) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width / canvas.width
  const scaleY = rect.height / canvas.height
  const left = chartLayout.toX(index) * scaleX
  const top = chartLayout.toY(row.均价) * scaleY
  /** 顶部留白不够放 tooltip 时翻到数据点下方 */
  const tooltipMinTop = 90
  const below = top < tooltipMinTop
  chartTooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform: below
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))',
  }
}

function onChartMouseMove(ev: MouseEvent) {
  if (!chartLayout || chartSeries.value.length === 0) return
  const { x, y } = canvasPointer(ev)
  const hit = findNearestChartPoint(x, y)
  if (hit === chartHoverIndex.value) return
  chartHoverIndex.value = hit
  drawChart(hit)
}

function onChartMouseLeave() {
  if (chartHoverIndex.value < 0) return
  chartHoverIndex.value = -1
  chartTooltipStyle.value = {}
  drawChart(-1)
}

let chartResizeHandler: (() => void) | null = null

watch(chartSeries, () => {
  chartHoverIndex.value = -1
  chartTooltipStyle.value = {}
  nextTick(() => drawChart(-1))
})

onMounted(async () => {
  applyDefaultFilters()
  await loadLatest()
  await Promise.all([loadChart(), loadList()])
  chartResizeHandler = () => drawChart(chartHoverIndex.value)
  window.addEventListener('resize', chartResizeHandler)
})

onBeforeUnmount(() => {
  if (chartResizeHandler) window.removeEventListener('resize', chartResizeHandler)
})
</script>

<style scoped>
.smm-lead-page { width: 100%; animation: fadeIn 0.25s ease both; }
.card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.summary-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.summary-title { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #1f2d3d; }
.summary-meta { margin: 0; font-size: 13px; color: #606266; display: flex; flex-wrap: wrap; gap: 16px; }
.summary-loading { padding: 24px 0; color: #909399; text-align: center; }
.price-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr auto; gap: 16px; align-items: end; margin-top: 16px; }
@media (max-width: 720px) { .price-grid { grid-template-columns: 1fr 1fr; } }
.price-cell { display: flex; flex-direction: column; gap: 4px; }
.price-cell--main { align-items: center; text-align: center; }
.price-label { font-size: 12px; color: #909399; }
.price-value { font-size: 22px; font-weight: 600; color: #2c3e50; }
.price-value--main { font-size: 32px; color: #1476db; }
.price-unit { font-size: 14px; color: #606266; align-self: center; padding-bottom: 4px; }
.price-change { font-size: 13px; margin-top: 4px; }
.price-change.up, .chg-up { color: #e53935; }
.price-change.down, .chg-down { color: #2e7d32; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; margin-bottom: 16px; overflow: visible; }
.filter-item { display: flex; flex-direction: column; gap: 6px; min-width: 140px; overflow: visible; }
.filter-item label { font-size: 13px; font-weight: 500; color: #606266; }
.date-hint { font-size: 11px; color: #909399; font-weight: normal; }
.date-range { display: flex; gap: 8px; align-items: center; }
.filter-input { padding: 6px 10px; border: 1px solid #e5e9f2; border-radius: 4px; font-size: 13px; width: 130px; }
.filter-actions { display: flex; gap: 10px; flex-shrink: 0; margin-left: auto; }
.btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #1476db; color: white; }
.btn-secondary { background: #f5f7fa; color: #606266; border: 1px solid #e5e9f2; }
.chart-section { border-top: 1px solid #e5e9f2; padding-top: 16px; }
.chart-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.chart-title { font-size: 14px; font-weight: 600; color: #2c3e50; }
.chart-legend { display: flex; gap: 16px; font-size: 12px; color: #606266; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.legend-band { display: inline-block; width: 16px; height: 10px; background: rgba(20, 118, 219, 0.2); border-radius: 2px; }
.legend-line { display: inline-block; width: 16px; height: 2px; background: #1476db; }
.chart-wrap { position: relative; width: 100%; }
.chart-canvas { display: block; width: 100%; cursor: crosshair; }
.chart-tooltip {
  position: absolute;
  z-index: 2;
  pointer-events: none;
  padding: 6px 10px;
  background: rgba(31, 45, 61, 0.92);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.chart-tooltip-date { color: #cbd5e1; font-size: 11px; margin-bottom: 4px; }
.chart-tooltip-row { font-size: 12px; color: #e2e8f0; }
.chart-tooltip-price { font-weight: 600; margin-top: 2px; }
.chart-empty { text-align: center; padding: 48px 16px; color: #909399; font-size: 14px; }
.table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.table-title { font-size: 14px; font-weight: 600; color: #2c3e50; }
.table-count { font-size: 12px; color: #909399; }
.table-wrapper { overflow-x: auto; border: 1px solid #e5e9f2; border-radius: 4px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #e5e9f2; white-space: nowrap; }
.data-table th { background: #e8f0f8; font-weight: 600; color: #2c3e50; }
.col-avg { font-weight: 600; color: #1476db; }
.empty-data { padding: 40px; color: #909399; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 4px 12px; border: 1px solid #e5e9f2; background: white; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.inline-error { color: #e53935; font-size: 13px; margin: 0 0 8px; }
.inline-warn { color: #f57c00; font-size: 13px; margin: 0 0 8px; }
.text-muted { color: #909399; }
.page-footer { font-size: 12px; color: #909399; line-height: 1.6; margin: 0 4px 8px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
