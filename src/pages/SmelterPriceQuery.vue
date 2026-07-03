<template>
  <div class="smelter-price-query-page">
    <div class="card summary-card">
      <div class="summary-head">
        <div class="summary-head-main">
          <p v-if="latest" class="summary-meta">
            <span>最新报价日期：{{ latest.date }}</span>
          </p>

          <p v-else-if="selectedSmelterNames.length === 0" class="summary-meta text-muted">请先在筛选区选择冶炼厂</p>
        </div>
        <div class="summary-actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="aiPredictionLoading || todayPriceChecking"
            @click="handleStartPrediction"
          >
            <i class="bi bi-play-fill"></i>{{ aiPredictionButtonText }}
          </button>
          <button type="button" class="btn btn-secondary" @click="emit('navigateToQuote')">前往维护</button>
        </div>
      </div>

      <p v-if="latestError && !latest" class="inline-error">{{ latestError }}</p>
      <p v-else-if="latestError && latest" class="inline-warn">{{ latestError }}</p>
      <p
        v-if="aiPredictionMessage"
        class="prediction-status"
        :class="{ 'prediction-status--error': aiPredictionState === 'failed' }"
      >{{ aiPredictionMessage }}</p>

      <div v-if="latestLoading" class="summary-loading">正在查询最新报价…</div>
      <div v-else-if="latest" class="price-summary">
        <div class="price-cell price-cell--main">
          <span class="price-label">基准价</span>
          <span class="price-value price-value--main">{{ formatPrice(latest.basePrice) }}</span>
          <span v-if="dayChange !== null" class="price-change" :class="dayChange >= 0 ? 'up' : 'down'">
            {{ dayChange >= 0 ? '+' : '' }}{{ formatPrice(dayChange) }}
            <span v-if="dayChangePct !== null">（{{ dayChangePct >= 0 ? '+' : '' }}{{ dayChangePct.toFixed(2) }}%）</span>
          </span>
        </div>
        <div class="price-cell">
          <span class="price-label">3% 含税价</span>
          <span class="price-value">{{ formatPrice(latest.price3pctVat) }}</span>
        </div>
        <div class="price-cell">
          <span class="price-label">13% 含税价</span>
          <span class="price-value">{{ formatPrice(latest.price13pctVat) }}</span>
        </div>
        <div class="price-unit">元/吨</div>
      </div>
    </div>

    <div class="card">
      <div class="filter-row">
        <div class="filter-item multi-select-item">
          <label>冶炼厂</label>
          <div class="multi-select-container multi-select-container--wide">
            <div
              class="selected-tags"
              :class="multiSelectTagsClass(selectedSmelterNames)"
              @click="focusSmelterInput"
            >
              <span v-for="item in smelterTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
              <button v-for="item in smelterTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeSmelter(item)">×</button>
              <span
                v-if="smelterTagsMore > 0"
                class="tag tag-more tag-shrink"
                :title="'还有：' + smelterTagsRest.join('、')"
              >+{{ smelterTagsMore }}</span>
              <input
                ref="smelterInputRef"
                v-model="smelterSearchText"
                type="text"
                class="multi-input"
                :placeholder="multiSelectPlaceholder(selectedSmelterNames)"
                @input="onSmelterSearchInput"
                @focus="onSmelterFocus"
                @blur="closeSmelterDropdown"
                @keydown.enter="handleSmelterKeydown"
              />
            </div>
            <div v-show="smelterDropdownVisible && filteredSmelterOptions.length > 0" class="dropdown-list">
              <div
                v-for="item in filteredSmelterOptions"
                :key="item"
                class="dropdown-item"
                :class="{ 'dropdown-item--selected': selectedSmelterNames.includes(item) }"
                @mousedown.prevent="onSmelterDropdownPick(item)"
              >
                {{ item }}
              </div>
            </div>
          </div>
        </div>

        <div class="filter-item">
          <label>报价日期</label>
          <div class="date-range">
            <input v-model="filters.dateFrom" type="date" class="filter-input" />
            <span>至</span>
            <input v-model="filters.dateTo" type="date" class="filter-input" />
          </div>
        </div>

        <div class="filter-item multi-select-item">
          <label>品类</label>
          <div class="multi-select-container">
            <div
              class="selected-tags"
              :class="multiSelectTagsClass(selectedCategoryNames)"
              @click="focusCategoryInput"
            >
              <span v-for="item in categoryTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
              <button v-for="item in categoryTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeCategory(item)">×</button>
              <span
                v-if="categoryTagsMore > 0"
                class="tag tag-more tag-shrink"
                :title="'还有：' + categoryTagsRest.join('、')"
              >+{{ categoryTagsMore }}</span>
              <input
                ref="categoryInputRef"
                v-model="categorySearchText"
                type="text"
                class="multi-input"
                :placeholder="multiSelectPlaceholder(selectedCategoryNames)"
                @input="onCategorySearchInput"
                @focus="onCategoryFocus"
                @blur="closeCategoryDropdown"
                @keydown.enter="handleCategoryKeydown"
              />
            </div>
            <div v-show="categoryDropdownVisible && filteredCategoryOptions.length > 0" class="dropdown-list">
              <div
                v-for="item in filteredCategoryOptions"
                :key="item"
                class="dropdown-item"
                :class="{ 'dropdown-item--selected': selectedCategoryNames.includes(item) }"
                @mousedown.prevent="onCategoryDropdownPick(item)"
              >
                {{ item }}
              </div>
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn btn-primary" :disabled="chartLoading || listLoading || !canQuery" @click="handleQuery">
            {{ chartLoading || listLoading ? '正在查询...' : '查询' }}
          </button>
          <button class="btn btn-secondary" @click="resetFilters">重置</button>
        </div>
      </div>
      <p v-if="!canQuery" class="filter-hint filter-hint--warn">请至少选择一个冶炼厂和一个品类后再查询</p>
      <p v-else class="filter-hint">冶炼厂与品类不可同时多选，图表将按多选项分组展示多条曲线</p>

      <div class="chart-section">
        <div class="chart-head">
          <span class="chart-title">基准价走势</span>
          <div class="chart-legend">
            <template v-if="chartMultiSeries.length > 1">
              <span v-for="(s, si) in chartMultiSeries" :key="si" class="legend-item">
                <i class="legend-line" :style="{ background: s.color }"></i>{{ s.name }}
              </span>
            </template>
            <span v-else class="legend-item"><i class="legend-line"></i>基准价</span>
          </div>
        </div>
        <p v-if="chartError" class="inline-error">{{ chartError }}</p>
        <div v-if="chartLoading" class="chart-empty">正在查询走势数据…</div>
        <div v-else-if="chartMultiSeries.length === 0 || chartMultiSeries.every(s => s.data.length === 0)" class="chart-empty">暂无走势数据，请调整筛选条件后查询</div>
        <div v-else class="chart-wrap">
          <canvas
            ref="chartCanvasRef"
            class="chart-canvas"
            @mousemove="onChartMouseMove"
            @mouseleave="onChartMouseLeave"
          />
          <div
            v-if="chartHoverPoint"
            class="chart-tooltip"
            :style="chartTooltipStyle"
          >
            <div class="chart-tooltip-series" :style="{ color: chartMultiSeries[chartHoverPoint.seriesIdx]?.color }">
              {{ chartMultiSeries[chartHoverPoint.seriesIdx]?.name }}
            </div>
            <div class="chart-tooltip-date">{{ chartMultiSeries[chartHoverPoint.seriesIdx]?.data[chartHoverPoint.dataIdx]?.date }}</div>
            <div class="chart-tooltip-price">
              {{ formatPrice(chartMultiSeries[chartHoverPoint.seriesIdx]?.data[chartHoverPoint.dataIdx]?.basePrice ?? 0) }} 元/吨
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-head">
        <span class="table-title">报价记录</span>
        <span class="table-count">共 {{ listTotal }} 条</span>
      </div>
      <p v-if="listError" class="inline-error">{{ listError }}</p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>冶炼厂</th>
              <th>报价日期</th>
              <th>品类</th>
              <th>基准价</th>
              <th>3% 含税价</th>
              <th>13% 含税价</th>
              <th>涨跌</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="listLoading">
              <td colspan="7" class="empty-data">正在查询…</td>
            </tr>
            <tr v-else-if="listRows.length === 0">
              <td colspan="7" class="empty-data">暂无报价数据</td>
            </tr>
            <tr v-for="(row, idx) in listRows" v-else :key="row.id">
              <td>{{ row.smelter }}</td>
              <td>{{ row.date }}</td>
              <td>{{ row.category }}</td>
              <td class="col-price">{{ formatPrice(row.basePrice) }}</td>
              <td>{{ formatPrice(row.price3pctVat) }}</td>
              <td>{{ formatPrice(row.price13pctVat) }}</td>
              <td>
                <span v-if="rowChange(row, idx) !== null" :class="rowChange(row, idx)! >= 0 ? 'chg-up' : 'chg-down'">
                  {{ formatChange(rowChange(row, idx)!) }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>
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
      数据为各冶炼厂报价信息，仅供参考。详细管理请前往「AI 比价系统」。
    </p>

    <Transition name="modal-fade">
      <div v-if="todayPriceConfirmVisible" class="confirm-mask" @click.self="closeTodayPriceConfirm">
        <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="today-price-confirm-title">
          <div class="confirm-head">
            <span class="confirm-icon">?</span>
            <h3 id="today-price-confirm-title">今日价格未更新</h3>
          </div>
          <p class="confirm-text">今日价格未更新，是否进行预测。</p>
          <div class="confirm-actions">
            <button type="button" class="btn btn-secondary" :disabled="aiPredictionLoading" @click="closeTodayPriceConfirm">取消</button>
            <button type="button" class="btn btn-primary" :disabled="aiPredictionLoading" @click="confirmPredictionWithoutTodayPrice">
              {{ aiPredictionLoading ? '预测中...' : '继续预测' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="toast-fade">
      <div v-if="toastMsg" class="toast-tip" @click="toastMsg = ''">
        <i class="bi bi-info-circle"></i> {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  fetchCategoryMapping,
  fetchDailyAiPredictionStatus,
  fetchQuoteDetailsList,
  fetchTlSmeltersAll,
  triggerDailyAiPrediction,
  type TlCategoryRow,
  type TlQuoteDetailRow,
} from '@/api/tlApi'

const emit = defineEmits<{ navigateToQuote: [] }>()

const MULTI_PREVIEW_TAG_COUNT = 1
const AI_PREDICTION_POLL_INTERVAL_MS = 3000

const MULTI_LINE_COLORS = [
  '#1476db', '#e53935', '#2e7d32', '#f57c00', '#7b1fa2',
  '#00838f', '#c62828', '#1565c0', '#6a1b9a', '#2e7d32',
]

// ==================== 多选互斥 ====================
type AiPredictionState = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

const activeMultiSelectDim = ref<'smelter' | 'category' | null>(null)
const toastMsg = ref('')
const aiPredictionLoading = ref(false)
const aiPredictionMessage = ref('')
const aiPredictionState = ref<AiPredictionState>('idle')
const todayPriceChecking = ref(false)
const todayPriceConfirmVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null
let aiPredictionPollTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toastMsg.value = msg
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

function checkSmelterMulti() {
  activeMultiSelectDim.value = selectedSmelterNames.value.length > 1 ? 'smelter' : null
}

function checkCategoryMulti() {
  activeMultiSelectDim.value = selectedCategoryNames.value.length > 1 ? 'category' : null
}

function clearAiPredictionPollTimer() {
  if (!aiPredictionPollTimer) return
  clearTimeout(aiPredictionPollTimer)
  aiPredictionPollTimer = null
}

function normalizeAiPredictionState(status: string): AiPredictionState {
  if (status === 'pending' || status === 'processing' || status === 'completed' || status === 'failed') return status
  return 'processing'
}

const aiPredictionButtonText = computed(() => {
  if (todayPriceChecking.value) return '检查价格中...'
  if (aiPredictionLoading.value) return '预测中...'
  return '批量预跑AI预测数据'
})

function todayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function hasTodayQuote(): Promise<boolean> {
  const today = todayDateString()
  const rows = await fetchAllQuotes({ start_date: today, end_date: today })
  return rows.some((row) => row.date === today || row.date.startsWith(today))
}

function scheduleAiPredictionStatusPoll(batchId: string) {
  clearAiPredictionPollTimer()
  aiPredictionPollTimer = setTimeout(() => {
    void pollDailyAiPredictionStatus(batchId)
  }, AI_PREDICTION_POLL_INTERVAL_MS)
}

async function pollDailyAiPredictionStatus(batchId: string) {
  try {
    const status = await fetchDailyAiPredictionStatus(batchId)
    const state = normalizeAiPredictionState(status.status)
    aiPredictionState.value = state

    if (state === 'completed') {
      aiPredictionLoading.value = false
      aiPredictionMessage.value = `AI预测已完成，生成 ${status.resultCount} 条结果`
      showToast(aiPredictionMessage.value)
      return
    }

    if (state === 'failed') {
      aiPredictionLoading.value = false
      aiPredictionMessage.value = status.errorMessage || 'AI预测失败，请稍后重试'
      showToast(aiPredictionMessage.value)
      return
    }

    aiPredictionLoading.value = true
    aiPredictionMessage.value = 'AI预测正在后台执行，请稍候'
    scheduleAiPredictionStatusPoll(batchId)
  } catch (e) {
    aiPredictionLoading.value = false
    aiPredictionState.value = 'failed'
    aiPredictionMessage.value = e instanceof Error ? e.message : '查询AI预测状态失败，请稍后重试'
  }
}

async function startDailyAiPrediction() {
  if (aiPredictionLoading.value) return
  clearAiPredictionPollTimer()
  aiPredictionLoading.value = true
  aiPredictionState.value = 'pending'
  aiPredictionMessage.value = '正在提交AI预测任务...'

  try {
    const result = await triggerDailyAiPrediction()
    aiPredictionState.value = normalizeAiPredictionState(result.status)
    aiPredictionMessage.value = result.message || 'AI预测任务已提交，正在后台执行'
    showToast(aiPredictionMessage.value)
    scheduleAiPredictionStatusPoll(result.batchId)
  } catch (e) {
    aiPredictionLoading.value = false
    aiPredictionState.value = 'failed'
    aiPredictionMessage.value = e instanceof Error ? e.message : '启动AI预测失败，请稍后重试'
  }
}

async function handleStartPrediction() {
  if (aiPredictionLoading.value || todayPriceChecking.value) return
  todayPriceChecking.value = true
  aiPredictionMessage.value = '正在检查今日价格是否已更新...'

  try {
    if (await hasTodayQuote()) {
      await startDailyAiPrediction()
      return
    }
    aiPredictionMessage.value = '今日价格未更新，请确认是否继续预测'
    todayPriceConfirmVisible.value = true
  } catch (e) {
    aiPredictionState.value = 'failed'
    aiPredictionMessage.value = e instanceof Error ? e.message : '检查今日价格失败，请稍后重试'
  } finally {
    todayPriceChecking.value = false
  }
}

function closeTodayPriceConfirm() {
  if (aiPredictionLoading.value) return
  todayPriceConfirmVisible.value = false
}

async function confirmPredictionWithoutTodayPrice() {
  todayPriceConfirmVisible.value = false
  await startDailyAiPrediction()
}

// ==================== 冶炼厂多选 ====================
const allSmelterNames = ref<string[]>([])
const selectedSmelterNames = ref<string[]>([])
const smelterSearchText = ref('')
const smelterDropdownVisible = ref(false)
const filteredSmelterOptions = ref<string[]>([])
const smelterInputRef = ref<HTMLInputElement | null>(null)

const smelterTagsPreview = computed(() => selectedSmelterNames.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const smelterTagsMore = computed(() => Math.max(0, selectedSmelterNames.value.length - MULTI_PREVIEW_TAG_COUNT))
const smelterTagsRest = computed(() => selectedSmelterNames.value.slice(MULTI_PREVIEW_TAG_COUNT))

function filterSmelterOptions() {
  const search = smelterSearchText.value.toLowerCase()
  filteredSmelterOptions.value = filterBySearch(allSmelterNames.value, search)
}

function onSmelterFocus() {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
}

function onSmelterSearchInput() {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
}

function addSmelter(item: string) {
  // 互斥：品类已多选时不允许冶炼厂再多选
  if (selectedCategoryNames.value.length > 1) {
    showToast('品类已多选，冶炼厂只能选一个')
    return
  }
  if (!selectedSmelterNames.value.includes(item)) selectedSmelterNames.value.push(item)
  smelterSearchText.value = ''
  filterSmelterOptions()
  checkSmelterMulti()
}

function removeSmelter(item: string) {
  selectedSmelterNames.value = selectedSmelterNames.value.filter((i) => i !== item)
  filterSmelterOptions()
  checkSmelterMulti()
}

function onSmelterDropdownPick(item: string) {
  if (selectedSmelterNames.value.includes(item)) removeSmelter(item)
  else addSmelter(item)
}

function handleSmelterKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && smelterSearchText.value.trim()) {
    addSmelter(smelterSearchText.value.trim())
    e.preventDefault()
  }
}

function closeSmelterDropdown() {
  setTimeout(() => { smelterDropdownVisible.value = false }, 200)
}

function focusSmelterInput() {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
  nextTick(() => smelterInputRef.value?.focus())
}

// ==================== 品类多选 ====================
const allCategoryNames = ref<string[]>([])
const selectedCategoryNames = ref<string[]>([])
const categorySearchText = ref('')
const categoryDropdownVisible = ref(false)
const filteredCategoryOptions = ref<string[]>([])
const categoryInputRef = ref<HTMLInputElement | null>(null)

const categoryTagsPreview = computed(() => selectedCategoryNames.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const categoryTagsMore = computed(() => Math.max(0, selectedCategoryNames.value.length - MULTI_PREVIEW_TAG_COUNT))
const categoryTagsRest = computed(() => selectedCategoryNames.value.slice(MULTI_PREVIEW_TAG_COUNT))

function filterCategoryOptions() {
  const search = categorySearchText.value.toLowerCase()
  filteredCategoryOptions.value = filterBySearch(allCategoryNames.value, search)
}

function onCategoryFocus() {
  categoryDropdownVisible.value = true
  filterCategoryOptions()
}

function onCategorySearchInput() {
  categoryDropdownVisible.value = true
  filterCategoryOptions()
}

function addCategory(item: string) {
  // 互斥：冶炼厂已多选时不允许品类再多选
  if (selectedSmelterNames.value.length > 1) {
    showToast('冶炼厂已多选，品类只能选一个')
    return
  }
  if (!selectedCategoryNames.value.includes(item)) selectedCategoryNames.value.push(item)
  categorySearchText.value = ''
  filterCategoryOptions()
  checkCategoryMulti()
}

function removeCategory(item: string) {
  selectedCategoryNames.value = selectedCategoryNames.value.filter((i) => i !== item)
  filterCategoryOptions()
  checkCategoryMulti()
}

function onCategoryDropdownPick(item: string) {
  if (selectedCategoryNames.value.includes(item)) removeCategory(item)
  else addCategory(item)
}

function handleCategoryKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && categorySearchText.value.trim()) {
    addCategory(categorySearchText.value.trim())
    e.preventDefault()
  }
}

function closeCategoryDropdown() {
  setTimeout(() => { categoryDropdownVisible.value = false }, 200)
}

function focusCategoryInput() {
  categoryDropdownVisible.value = true
  filterCategoryOptions()
  nextTick(() => categoryInputRef.value?.focus())
}

// ==================== 通用工具 ====================
function filterBySearch(options: string[], searchLower: string) {
  if (!searchLower) return [...options]
  return options.filter((opt) => opt.toLowerCase().includes(searchLower))
}

function multiSelectTagsClass(selected: string[]) {
  return { 'selected-tags--single': selected.length === 1 }
}

function multiSelectPlaceholder(selected: string[]) {
  return selected.length > 0 ? '' : '搜索并选择'
}

const canQuery = computed(() => selectedSmelterNames.value.length > 0 && selectedCategoryNames.value.length > 0)

// ==================== 价格数据 ====================
const latest = ref<TlQuoteDetailRow | null>(null)
const latestLoading = ref(false)
const latestError = ref('')

const filters = ref({ dateFrom: '', dateTo: '' })
const chartLoading = ref(false)
const chartError = ref('')
const chartCanvasRef = ref<HTMLCanvasElement | null>(null)

interface ChartSeriesItem {
  name: string
  data: TlQuoteDetailRow[]
  color: string
}

const chartMultiSeries = ref<ChartSeriesItem[]>([])
const chartHoverPoint = ref<{ seriesIdx: number; dataIdx: number } | null>(null)
const chartTooltipStyle = ref<Record<string, string>>({})

interface ChartLayout {
  width: number
  height: number
  margin: { t: number; r: number; b: number; l: number }
  toX: (i: number) => number
  toY: (v: number) => number
  allDates: string[]
  dateIndexMap: Map<string, number>
  yMin: number
  yMax: number
  yRange: number
  W: number
  H: number
}

let chartLayout: ChartLayout | null = null

const listAllRows = ref<TlQuoteDetailRow[]>([])
const listPage = ref(1)
const listPageSize = 20
const listLoading = ref(false)
const listError = ref('')

const listTotal = computed(() => listAllRows.value.length)
const listRows = computed(() => {
  const start = (listPage.value - 1) * listPageSize
  return listAllRows.value.slice(start, start + listPageSize)
})
const listTotalPages = computed(() => Math.max(1, Math.ceil(listTotal.value / listPageSize)))

const dayChange = computed(() => {
  if (!latest.value) return null
  const allData = chartMultiSeries.value.flatMap((s) => s.data)
  if (allData.length < 2) return null
  const sorted = [...allData].sort((a, b) => a.date.localeCompare(b.date))
  const idx = sorted.findIndex((r) => r.date === latest.value!.date)
  if (idx <= 0) return null
  return latest.value.basePrice - sorted[idx - 1]!.basePrice
})

const dayChangePct = computed(() => {
  if (dayChange.value === null || !latest.value) return null
  const allData = chartMultiSeries.value.flatMap((s) => s.data)
  const sorted = [...allData].sort((a, b) => a.date.localeCompare(b.date))
  const idx = sorted.findIndex((r) => r.date === latest.value!.date)
  if (idx <= 0) return null
  const prev = sorted[idx - 1]!.basePrice
  if (prev === 0) return null
  return (dayChange.value / prev) * 100
})

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function formatChange(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${formatPrice(n)}`
}

function defaultChartDateRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

function applyDefaultFilters() {
  const { from, to } = defaultChartDateRange()
  filters.value = { dateFrom: from, dateTo: to }
}

function rowChange(row: TlQuoteDetailRow, idx: number): number | null {
  const prev = listRows.value[idx + 1]
  if (!prev) return null
  return row.basePrice - prev.basePrice
}

// ==================== 数据加载 ====================
let smelterOptionsCache: Array<{ id: number; name: string }> = []
let categoryCache: TlCategoryRow[] = []

async function loadSmelterOptionsWithCache() {
  try {
    const rows = await fetchTlSmeltersAll()
    smelterOptionsCache = rows
      .map((r) => ({
        id: Number(r['冶炼厂id'] ?? r.id ?? 0),
        name: String(r['冶炼厂'] ?? r.name ?? ''),
      }))
      .filter((s) => s.id > 0 && s.name)
    allSmelterNames.value = smelterOptionsCache.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    filterSmelterOptions()
  } catch {
    smelterOptionsCache = []
    allSmelterNames.value = []
  }
}

async function loadCategoriesWithCache() {
  try {
    categoryCache = await fetchCategoryMapping()
    allCategoryNames.value = categoryCache.map((c) => c.name).filter((n) => n !== '')
    filterCategoryOptions()
  } catch {
    categoryCache = []
    allCategoryNames.value = []
  }
}

function resolveSmelterIds(): number[] {
  return selectedSmelterNames.value
    .map((name) => smelterOptionsCache.find((s) => s.name === name)?.id ?? 0)
    .filter((id) => id > 0)
}


async function fetchAllQuotes(extra: {
  start_date?: string
  end_date?: string
}): Promise<TlQuoteDetailRow[]> {
  const smelterIds = resolveSmelterIds()
  const tasks: Promise<TlQuoteDetailRow[]>[] = []
  if (smelterIds.length === 0) {
    tasks.push(fetchQuoteDetailsList({ ...extra, page_size: 500 }))
  } else {
    for (const id of smelterIds) {
      tasks.push(fetchQuoteDetailsList({ factory_id: id, ...extra, page_size: 500 }))
    }
  }
  let results = (await Promise.all(tasks)).flat()
  // 品类客户端过滤
  const catNames = new Set(selectedCategoryNames.value)
  if (catNames.size > 0) {
    results = results.filter((r) => catNames.has(r.category))
  }
  // 去重：同一冶炼厂+品类+日期只保留第一条
  const seen = new Set<string>()
  results = results.filter((r) => {
    const key = `${r.smelter}|${r.category}|${r.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return results
}

function buildChartSeriesFromData(allData: TlQuoteDetailRow[]): ChartSeriesItem[] {
  const dim = activeMultiSelectDim.value
  if (!dim) {
    return [{ name: '基准价', data: allData, color: MULTI_LINE_COLORS[0] }]
  }

  const groups = new Map<string, TlQuoteDetailRow[]>()
  for (const row of allData) {
    const key = dim === 'smelter' ? row.smelter : row.category
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
  return sorted.map(([name, data], i) => ({
    name,
    data: [...data].sort((a, b) => a.date.localeCompare(b.date)),
    color: MULTI_LINE_COLORS[i % MULTI_LINE_COLORS.length],
  }))
}

async function loadChart() {
  chartLoading.value = true
  chartError.value = ''
  const range = filters.value.dateFrom && filters.value.dateTo
    ? { from: filters.value.dateFrom, to: filters.value.dateTo }
    : defaultChartDateRange()
  try {
    const allData = await fetchAllQuotes({ start_date: range.from, end_date: range.to })
    chartMultiSeries.value = buildChartSeriesFromData(allData)
  } catch (e) {
    chartError.value = e instanceof Error ? e.message : '请稍后重试'
    chartMultiSeries.value = []
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
    listAllRows.value = await fetchAllQuotes({
      start_date: filters.value.dateFrom || undefined,
      end_date: filters.value.dateTo || undefined,
    })
  } catch (e) {
    listError.value = e instanceof Error ? e.message : '请稍后重试'
    listAllRows.value = []
  } finally {
    listLoading.value = false
  }
}

async function handleQuery() {
  const start = filters.value.dateFrom
  const end = filters.value.dateTo
  if (start && end && end < start) {
    showToast('结束日期不能早于开始日期，请重新选择')
    return
  }
  listPage.value = 1
  await Promise.all([loadChart(), loadList()])
}

function resetFilters() {
  applyDefaultFilters()
  selectedSmelterNames.value = allSmelterNames.value.includes('河南金利金铅集团有限公司')
    ? ['河南金利金铅集团有限公司'] : []
  selectedCategoryNames.value = allCategoryNames.value.includes('电动车电瓶')
    ? ['电动车电瓶'] : []
  activeMultiSelectDim.value = null
  listPage.value = 1
}

function gotoPage(p: number) {
  listPage.value = p
}

// ==================== 图表绘制 ====================
function gatherAllDates(): string[] {
  const set = new Set<string>()
  for (const s of chartMultiSeries.value) {
    for (const r of s.data) set.add(r.date)
  }
  return [...set].sort()
}

function gatherAllPrices(): number[] {
  const prices: number[] = []
  for (const s of chartMultiSeries.value) {
    for (const r of s.data) prices.push(r.basePrice)
  }
  return prices
}

function buildChartLayout(width: number, height: number, allDates: string[]): ChartLayout {
  const margin = { t: 28, r: 20, b: 56, l: 72 }
  const W = width - margin.l - margin.r
  const H = height - margin.t - margin.b
  const prices = gatherAllPrices()
  const yMin = prices.length > 0 ? Math.floor(Math.min(...prices) / 100) * 100 : 0
  const yMax = prices.length > 0 ? Math.ceil(Math.max(...prices) / 100) * 100 : 100
  const yRange = yMax - yMin || 1
  const n = allDates.length
  const xStep = n <= 1 ? W / 2 : W / (n - 1)
  const toY = (v: number) => margin.t + H - ((v - yMin) / yRange) * H
  const toX = (i: number) => margin.l + i * xStep
  const dateIndexMap = new Map(allDates.map((d, i) => [d, i]))
  return { width, height, margin, W, H, yMin, yMax, yRange, toX, toY, allDates, dateIndexMap }
}

function drawChart(highlightPoint: { seriesIdx: number; dataIdx: number } | null = null) {
  const canvas = chartCanvasRef.value as HTMLCanvasElement | null
  if (!canvas || chartMultiSeries.value.length === 0 || chartMultiSeries.value.every((s) => s.data.length === 0)) {
    chartLayout = null
    return
  }

  const allDates = gatherAllDates()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const wrap = canvas.parentElement
  const width = wrap?.clientWidth ?? 720
  const height = chartMultiSeries.value.length > 1 ? 320 : 280
  canvas.width = width
  canvas.height = height

  const layout = buildChartLayout(width, height, allDates)
  const { margin, W, H, toX, toY, yMin, yRange } = layout
  chartLayout = layout
  const n = allDates.length
  const dateIndexMap = new Map(allDates.map((d, i) => [d, i]))

  // 白色背景
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)

  // 坐标轴
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(margin.l, margin.t)
  ctx.lineTo(margin.l, margin.t + H)
  ctx.lineTo(margin.l + W, margin.t + H)
  ctx.stroke()

  // Y 轴刻度
  const ySteps = 5
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#64748b'
  for (let i = 0; i <= ySteps; i++) {
    const y = margin.t + H - (i / ySteps) * H
    const val = yMin + (i / ySteps) * yRange
    ctx.strokeStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.moveTo(margin.l, y)
    ctx.lineTo(margin.l + W, y)
    ctx.stroke()
    ctx.fillText(formatPrice(val), 4, y + 4)
  }

  // 高亮竖线
  if (highlightPoint) {
    const dateStr = chartMultiSeries.value[highlightPoint.seriesIdx]?.data[highlightPoint.dataIdx]?.date
    if (dateStr) {
      const xi = dateIndexMap.get(dateStr) ?? 0
      const hx = toX(xi)
      ctx.strokeStyle = 'rgba(20, 118, 219, 0.35)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(hx, margin.t)
      ctx.lineTo(hx, margin.t + H)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // 绘制每条线
  chartMultiSeries.value.forEach((series, si) => {
    if (series.data.length === 0) return
    ctx.strokeStyle = series.color
    ctx.lineWidth = 2
    ctx.beginPath()
    series.data.forEach((row, di) => {
      const xi = dateIndexMap.get(row.date) ?? 0
      const x = toX(xi)
      const y = toY(row.basePrice)
      if (di === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 数据点
    series.data.forEach((row, di) => {
      const xi = dateIndexMap.get(row.date) ?? 0
      const x = toX(xi)
      const y = toY(row.basePrice)
      const active = highlightPoint && highlightPoint.seriesIdx === si && highlightPoint.dataIdx === di
      ctx.fillStyle = series.color
      ctx.beginPath()
      ctx.arc(x, y, active ? 6 : 3, 0, Math.PI * 2)
      ctx.fill()
      if (active) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  })

  // X 轴标签
  const maxLabs = Math.max(2, Math.floor(W / 56))
  const labStep = Math.max(1, Math.ceil(n / maxLabs))
  ctx.fillStyle = '#64748b'
  allDates.forEach((d, i) => {
    if (i % labStep !== 0 && i !== n - 1) return
    const label = d.length >= 10 ? d.slice(5) : d
    ctx.fillText(label, toX(i) - 16, margin.t + H + 20)
  })

  // 坐标轴标题
  ctx.fillStyle = '#475569'
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillText('基准价（元/吨）', margin.l, margin.t - 10)
  ctx.fillText('报价日期', margin.l + W / 2 - 28, height - 6)

  // 底部图例（多线时）
  if (chartMultiSeries.value.length > 1) {
    let legendX = margin.l
    const legendY = margin.t + H + 38
    ctx.font = '11px system-ui, sans-serif'
    chartMultiSeries.value.forEach((s) => {
      ctx.fillStyle = s.color
      ctx.fillRect(legendX, legendY - 4, 12, 3)
      ctx.fillStyle = '#475569'
      const textW = ctx.measureText(s.name).width
      ctx.fillText(s.name, legendX + 16, legendY)
      legendX += 16 + textW + 14
    })
  }

  // 更新 tooltip 位置
  if (highlightPoint) {
    updateChartTooltipPosition(highlightPoint)
  }
}

function canvasPointer(ev: MouseEvent): { x: number; y: number } {
  const canvas = chartCanvasRef.value as HTMLCanvasElement
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  }
}

function findNearestChartPoint(px: number, py: number): { seriesIdx: number; dataIdx: number } | null {
  if (!chartLayout || chartMultiSeries.value.length === 0) return null
  const { toX, toY, dateIndexMap } = chartLayout

  let bestSi = 0
  let bestDi = -1
  let bestDist = Infinity

  chartMultiSeries.value.forEach((series, si) => {
    series.data.forEach((row, di) => {
      const xi = dateIndexMap.get(row.date) ?? -1
      if (xi < 0) return
      const x = toX(xi)
      const y = toY(row.basePrice)
      const d = Math.hypot(px - x, py - y)
      if (d < bestDist) {
        bestDist = d
        bestSi = si
        bestDi = di
      }
    })
  })

  return bestDi >= 0 ? { seriesIdx: bestSi, dataIdx: bestDi } : null
}

function updateChartTooltipPosition(point: { seriesIdx: number; dataIdx: number }) {
  const canvas = chartCanvasRef.value as HTMLCanvasElement
  if (!canvas || !chartLayout) return
  const series = chartMultiSeries.value[point.seriesIdx]
  if (!series) return
  const row = series.data[point.dataIdx]
  if (!row) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width / canvas.width
  const scaleY = rect.height / canvas.height
  const dateIdx = chartLayout.dateIndexMap.get(row.date) ?? -1
  const left = chartLayout.toX(dateIdx >= 0 ? dateIdx : 0) * scaleX
  const top = chartLayout.toY(row.basePrice) * scaleY
  /** 顶部留白不够放 tooltip 时翻到数据点下方 */
  const below = top < 90
  chartTooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform: below
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))',
  }
}

function onChartMouseMove(ev: MouseEvent) {
  if (!chartLayout || chartMultiSeries.value.length === 0) return
  const { x, y } = canvasPointer(ev)
  const hit = findNearestChartPoint(x, y)
  if (!hit) return
  const prev = chartHoverPoint.value
  if (prev && prev.seriesIdx === hit.seriesIdx && prev.dataIdx === hit.dataIdx) return
  chartHoverPoint.value = hit
  drawChart(hit)
}

function onChartMouseLeave() {
  if (chartHoverPoint.value === null) return
  chartHoverPoint.value = null
  chartTooltipStyle.value = {}
  drawChart(null)
}

let chartResizeHandler: (() => void) | null = null

watch(chartMultiSeries, () => {
  chartHoverPoint.value = null
  chartTooltipStyle.value = {}
  nextTick(() => drawChart(null))
})

onMounted(async () => {
  applyDefaultFilters()
  await Promise.all([loadSmelterOptionsWithCache(), loadCategoriesWithCache()])
  // 默认选中
  if (allSmelterNames.value.includes('河南金利金铅集团有限公司')) {
    selectedSmelterNames.value = ['河南金利金铅集团有限公司']
    checkSmelterMulti()
  }
  if (allCategoryNames.value.includes('电动车电瓶')) {
    selectedCategoryNames.value = ['电动车电瓶']
    checkCategoryMulti()
  }
  chartResizeHandler = () => drawChart(chartHoverPoint.value)
  window.addEventListener('resize', chartResizeHandler)
})

onBeforeUnmount(() => {
  if (chartResizeHandler) window.removeEventListener('resize', chartResizeHandler)
  clearAiPredictionPollTimer()
})
</script>

<style scoped>
.smelter-price-query-page { width: 100%; animation: fadeIn 0.25s ease both; }
.card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.summary-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.summary-head-main { flex: 1; min-width: 200px; }
.summary-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.summary-meta { margin: 0; font-size: 13px; color: #606266; }
.prediction-status { margin: 12px 0 0; padding: 8px 12px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; font-size: 13px; }
.prediction-status--error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.summary-loading { padding: 24px 0; color: #909399; text-align: center; }
.price-summary { display: flex; align-items: flex-end; gap: 24px; margin-top: 16px; flex-wrap: wrap; }
.price-cell { display: flex; flex-direction: column; gap: 4px; }
.price-cell--main { align-items: flex-start; }
.price-label { font-size: 12px; color: #909399; }
.price-value { font-size: 22px; font-weight: 600; color: #2c3e50; }
.price-value--main { font-size: 32px; color: #1476db; }
.price-unit { font-size: 14px; color: #606266; padding-bottom: 4px; }
.price-change { font-size: 13px; margin-top: 4px; }
.price-change.up, .chg-up { color: #e53935; }
.price-change.down, .chg-down { color: #2e7d32; }

.filter-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; margin-bottom: 8px; overflow: visible; }
.filter-item { display: flex; flex-direction: column; gap: 6px; min-width: 140px; overflow: visible; }
.filter-item label { font-size: 13px; font-weight: 500; color: #606266; }
.date-range { display: flex; gap: 8px; align-items: center; }
.filter-input { padding: 6px 10px; border: 1px solid #e5e9f2; border-radius: 4px; font-size: 13px; width: 130px; }
.filter-actions { display: flex; gap: 10px; flex-shrink: 0; margin-left: auto; }
.filter-hint { font-size: 12px; color: #909399; margin: 0 0 12px; }
.filter-hint--warn { color: #e65100; }
.btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #1476db; color: white; }
.btn-secondary { background: #f5f7fa; color: #606266; border: 1px solid #e5e9f2; }
.btn .bi { margin-right: 4px; }

/* ==================== 多选下拉 ==================== */
.multi-select-item { min-width: 200px; flex: 1; overflow: visible; }
.multi-select-container { position: relative; width: 100%; max-width: 280px; overflow: visible; }
.multi-select-container--wide { max-width: 100%; }

.selected-tags {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  background: white;
  height: 32px;
  min-height: 32px;
  max-height: 32px;
  overflow-x: auto;
  overflow-y: hidden;
  cursor: text;
  box-sizing: border-box;
}

.selected-tags--single {
  height: auto;
  min-height: 32px;
  max-height: none;
  flex-wrap: nowrap;
  overflow: visible;
}

.selected-tags--single .tag {
  max-width: none;
  flex: 1 1 auto;
  min-width: 0;
  overflow: visible;
  text-overflow: clip;
}

.selected-tags--single .multi-input {
  flex: 0 0 24px;
  min-width: 24px;
  width: 24px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #E8F0F8;
  border-radius: 3px;
  font-size: 12px;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 118px;
  flex-shrink: 0;
}

.tag-shrink { flex-shrink: 0; }

.tag-more {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  background-color: #f0f2f5;
  color: #606266;
  cursor: default;
  flex-shrink: 0;
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #909399;
  padding: 0 2px;
}

.tag-remove:hover { color: #f56c6c; }

.multi-input {
  flex: 1 1 48px;
  min-width: 48px;
  width: 0;
  border: none;
  outline: none;
  padding: 2px 4px;
  font-size: 13px;
  background: transparent;
}

.multi-input::placeholder { color: #c0c4cc; }

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background: white;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 2500;
  margin-top: 2px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  text-align: left;
  line-height: 1.45;
  word-break: break-word;
}

.dropdown-item:hover { background-color: #F5F7FA; color: #4A7A9C; }

.dropdown-item--selected { color: #a8abb2; background-color: #f5f7fa; }
.dropdown-item--selected:hover { background-color: #ebeef5; color: #909399; }

/* ==================== 图表 ==================== */
.chart-section { border-top: 1px solid #e5e9f2; padding-top: 16px; }
.chart-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.chart-title { font-size: 14px; font-weight: 600; color: #2c3e50; }
.chart-legend { display: flex; gap: 16px; font-size: 12px; color: #606266; flex-wrap: wrap; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
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
.chart-tooltip-series { font-weight: 600; font-size: 11px; margin-bottom: 2px; }
.chart-tooltip-date { color: #cbd5e1; font-size: 11px; margin-bottom: 2px; }
.chart-tooltip-price { font-weight: 600; }
.chart-empty { text-align: center; padding: 48px 16px; color: #909399; font-size: 14px; }

/* ==================== 表格 ==================== */
.table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.table-title { font-size: 14px; font-weight: 600; color: #2c3e50; }
.table-count { font-size: 12px; color: #909399; }
.table-wrapper { overflow-x: auto; border: 1px solid #e5e9f2; border-radius: 4px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #e5e9f2; white-space: nowrap; }
.data-table th { background: #e8f0f8; font-weight: 600; color: #2c3e50; }
.col-price { font-weight: 600; color: #1476db; }
.empty-data { padding: 40px; color: #909399; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 4px 12px; border: 1px solid #e5e9f2; background: white; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.inline-error { color: #e53935; font-size: 13px; margin: 0 0 8px; }
.inline-warn { color: #f57c00; font-size: 13px; margin: 0 0 8px; }
.text-muted { color: #909399; }
.page-footer { font-size: 12px; color: #909399; line-height: 1.6; margin: 0 4px 8px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.34);
}

.confirm-dialog {
  width: min(420px, 100%);
  padding: 20px 24px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.confirm-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 14px;
  font-weight: 700;
}

.confirm-head h3 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.confirm-text {
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

.toast-tip {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 10px 20px;
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  white-space: nowrap;
}
.toast-tip i { margin-right: 4px; }

.toast-fade-enter-active { transition: all 0.25s ease; }
.toast-fade-leave-active { transition: all 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
