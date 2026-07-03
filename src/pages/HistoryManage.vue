<template>
  <div class="history-manage-page">
    <!-- 内页菜单 -->
    <div class="card">
      <div class="inner-menu">
        <div 
          class="menu-item"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          数据导入
        </div>
        <div 
          class="menu-item"
          :class="{ active: activeTab === 'list' }"
          @click="activeTab = 'list'"
        >
          数据列表
        </div>
      </div>
    </div>

    <!-- ==================== 数据导入标签页 ==================== -->
    <div v-if="activeTab === 'import'" class="import-tab">
      <div class="card">
        <div class="action-bar">
          <div class="action-left">
            <button class="btn btn-primary" @click="triggerImport" :disabled="importLoading">
              {{ importLoading ? '导入中...' : '导入数据' }}
            </button>
            <button class="btn btn-secondary" @click="downloadTemplate">下载模板</button>
          </div>
        </div>
      </div>

      <!-- 文件预览区域 -->
      <div v-if="previewData.length > 0" class="card preview-card">
        <div class="preview-header">
          <span class="preview-title">预览数据（前10行）</span>
          <span class="preview-count">共 {{ previewTotalRows }} 行（提交时按后端要求上传<strong>整份文件</strong>）；预览仅显示前 10 行</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table preview-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" :checked="isAllPreviewSelected" @change="toggleSelectAllPreview" /></th>
                <th v-for="col in previewColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewData" :key="idx">
                <td><input type="checkbox" v-model="selectedPreviewRows" :value="idx" /></td>
                <td v-for="col in previewColumns" :key="col">{{ row[col] || '-' }}</td>
              </tr>
              <tr v-if="previewData.length === 0">
                <td :colspan="Math.max(1, 1 + previewColumns.length)" class="empty-data">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="preview-actions">
          <button class="btn btn-primary" @click="confirmImport" :disabled="importLoading || !pendingImportFile">
            {{ importLoading ? '导入中...' : `确认导入（${previewTotalRows} 行）` }}
          </button>
          <button class="btn btn-secondary" @click="clearPreview">取消</button>
        </div>
      </div>

      <div v-else class="card sample-card">
        <div class="sample-header">
          <span class="sample-title">模板示例数据</span>
          <span class="sample-hint">与「下载模板」同一接口返回的文件解析所得，供对照表头与填写格式；导入请仍点击「导入数据」</span>
        </div>
        <div v-if="templateSampleLoading" class="sample-loading">正在加载模板示例…</div>
        <template v-else>
          <div class="table-wrapper">
            <table class="data-table sample-table">
              <thead>
                <tr>
                  <th v-for="col in templateSampleColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in templateSampleRows" :key="idx">
                  <td v-for="col in templateSampleColumns" :key="col">{{ row[col] || '-' }}</td>
                </tr>
                <tr v-if="templateSampleRows.length === 0">
                  <td
                    :colspan="Math.max(1, templateSampleColumns.length)"
                    class="empty-data"
                  >
                    未从模板中解析到示例行，请检查网络后刷新页面，或使用「下载模板」查看完整文件
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="sample-format-note">
            注意：填写须与模板表头一致，勿改列名或顺序；各列勿留空。
            <strong>送货日期</strong>须为可被识别的日期（建议使用 Excel 日期单元格，或 <code>YYYY-MM-DD</code>、<code>YYYY/MM/DD</code> 等形式），勿填纯文字或非法格式；<strong>重量</strong>须为数字，。
          </p>
        </template>
      </div>
    </div>

    <!-- ==================== 数据列表标签页 ==================== -->
    <div v-if="activeTab === 'list'" class="list-tab">
      <!-- 筛选区 -->
      <div class="card filter-card">
        <div class="filter-row">
          <div class="filter-item date-item">
            <label>送货日期</label>
            <div class="date-range">
              <input type="date" v-model="filters.startDate" class="filter-input" />
              <span>至</span>
              <input type="date" v-model="filters.endDate" class="filter-input" />
            </div>
          </div>

          <!-- 大区经理多选 -->
          <div class="filter-item multi-select-item">
            <label>大区经理</label>
            <div class="multi-select-container">
              <div class="selected-tags" :class="multiSelectTagsClass(selectedManagers)" @click="focusManagerInput">
                <span v-for="item in mgrManagersTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
                <button v-for="item in mgrManagersTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeManager(item)">×</button>
                <span
                  v-if="mgrManagersTagsMore > 0"
                  class="tag tag-more tag-shrink"
                  :title="'还有：' + mgrManagersTagsRest.join('、')"
                >+{{ mgrManagersTagsMore }}</span>
                <input
                  ref="managerInputRef"
                  v-model="managerSearchText"
                  type="text"
                  class="multi-input"
                  :placeholder="multiSelectPlaceholder(selectedManagers)"
                  @input="onManagerSearchInput"
                  @focus="onManagerFocus"
                  @blur="closeManagerDropdown"
                  @keydown.enter="handleManagerKeydown"
                />
              </div>
              <div v-show="managerDropdownVisible && filteredManagerOptions.length > 0" class="dropdown-list">
                <div
                  v-for="item in filteredManagerOptions"
                  :key="item"
                  class="dropdown-item"
                  :class="{ 'dropdown-item--selected': selectedManagers.includes(item) }"
                  @mousedown.prevent="onManagerDropdownPick(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <!-- 冶炼厂多选 -->
          <div class="filter-item multi-select-item multi-select-item--wide">
            <label>冶炼厂</label>
            <div class="multi-select-container multi-select-container--wide">
              <div class="selected-tags" :class="multiSelectTagsClass(selectedSmelters)" @click="focusSmelterInput">
                <span v-for="item in mgrSmeltersTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
                <button v-for="item in mgrSmeltersTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeSmelter(item)">×</button>
                <span
                  v-if="mgrSmeltersTagsMore > 0"
                  class="tag tag-more tag-shrink"
                  :title="'还有：' + mgrSmeltersTagsRest.join('、')"
                >+{{ mgrSmeltersTagsMore }}</span>
                <input
                  ref="smelterInputRef"
                  v-model="smelterSearchText"
                  type="text"
                  class="multi-input"
                  :placeholder="multiSelectPlaceholder(selectedSmelters)"
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
                  :class="{ 'dropdown-item--selected': selectedSmelters.includes(item) }"
                  @mousedown.prevent="onSmelterDropdownPick(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <!-- 仓库多选 -->
          <div class="filter-item multi-select-item multi-select-item--wide">
            <label>仓库</label>
            <div class="multi-select-container multi-select-container--wide">
              <div class="selected-tags" :class="multiSelectTagsClass(selectedWarehouses)" @click="focusWarehouseInput">
                <span v-for="item in whWarehousesTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
                <button v-for="item in whWarehousesTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeWarehouse(item)">×</button>
                <span
                  v-if="whWarehousesTagsMore > 0"
                  class="tag tag-more tag-shrink"
                  :title="'还有：' + whWarehousesTagsRest.join('、')"
                >+{{ whWarehousesTagsMore }}</span>
                <input
                  ref="warehouseInputRef"
                  v-model="warehouseSearchText"
                  type="text"
                  class="multi-input"
                  :placeholder="multiSelectPlaceholder(selectedWarehouses)"
                  @input="onWarehouseSearchInput"
                  @focus="onWarehouseFocus"
                  @blur="closeWarehouseDropdown"
                  @keydown.enter="handleWarehouseKeydown"
                />
              </div>
              <div v-show="warehouseDropdownVisible && filteredWarehouseOptions.length > 0" class="dropdown-list">
                <div
                  v-for="item in filteredWarehouseOptions"
                  :key="item"
                  class="dropdown-item"
                  :class="{ 'dropdown-item--selected': selectedWarehouses.includes(item) }"
                  @mousedown.prevent="onWarehouseDropdownPick(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <!-- 品种多选 -->
          <div class="filter-item multi-select-item">
            <label>品种</label>
            <div class="multi-select-container">
              <div class="selected-tags" :class="multiSelectTagsClass(selectedVarieties)" @click="focusVarietyInput">
                <span v-for="item in varietyTagsPreview" :key="item" class="tag tag-shrink" :title="item">{{ item }}</span>
                <button v-for="item in varietyTagsPreview" :key="'rm-' + item" type="button" class="tag-remove" @click.stop="removeVariety(item)">×</button>
                <span
                  v-if="varietyTagsMore > 0"
                  class="tag tag-more tag-shrink"
                  :title="'还有：' + varietyTagsRest.join('、')"
                >+{{ varietyTagsMore }}</span>
                <input 
                  ref="varietyInputRef"
                  v-model="varietySearchText"
                  type="text"
                  class="multi-input"
                  placeholder="搜索并选择"
                  @input="onVarietySearchInput"
                  @focus="onVarietyFocus"
                  @blur="closeVarietyDropdown"
                  @keydown.enter="handleVarietyKeydown"
                />
              </div>
              <div v-show="varietyDropdownVisible && filteredVarietyOptions.length > 0" class="dropdown-list">
                <div
                  v-for="item in filteredVarietyOptions"
                  :key="item"
                  class="dropdown-item"
                  :class="{ 'dropdown-item--selected': selectedVarieties.includes(item) }"
                  @mousedown.prevent="onVarietyDropdownPick(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <div class="filter-actions">
            <button class="btn btn-primary" @click="handleQuery" :disabled="tableLoading">查询</button>
            <button class="btn btn-secondary" @click="handleReset">重置</button>
            <button class="btn btn-secondary" @click="exportFilteredData" :disabled="tableLoading">导出Excel</button>
          </div>
        </div>
      </div>

      <!-- 批量删除按钮 -->
      <div class="card batch-card">
        <div class="batch-bar">
          <button class="btn btn-danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
            批量删除 ({{ selectedRows.length }})
          </button>
        </div>
      </div>

      <!-- 数据表格 - 不显示品种列，重量显示汇总值 -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
                <th>送货日期</th>
                <th>大区经理</th>
                <th>冶炼厂</th>
                <th>仓库</th>
                <th>品类</th>
                <th>天气</th>
                <th>重量(吨)</th>
                <th width="70">查看</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedData" :key="row.id">
                <td><input type="checkbox" v-model="selectedRows" :value="row.id" /></td>
                <td>{{ row.delivery_date }}</td>
                <td>{{ row.regional_manager }}</td>
                <td>{{ row.smelter || '-' }}</td>
                <td>{{ row.warehouse }}</td>
                <td>{{ row.details.map(d => d.variety).join(', ') }}</td>
                <td>{{ row.weather || '-' }}</td>
                <td>{{ row.total_weight.toFixed(2) }}</td>
                <td><button class="btn-view" @click="openDetailModal(row)">查看</button></td>
              </tr>
              <tr v-if="paginatedData.length === 0">
                <td :colspan="9" class="empty-data">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
          <span>第 {{ currentPage }} / {{ totalPages }} 页（每页 {{ listPageSize }} 条）</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 - 显示品种明细，带筛选状态 -->
    <div v-if="modalVisible" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-info">
            <p><strong>送货日期：</strong>{{ modalData?.delivery_date || '-' }}</p>
            <p><strong>大区经理：</strong>{{ modalData?.regional_manager || '-' }}</p>
            <p><strong>冶炼厂：</strong>{{ modalData?.smelter || '-' }}</p>
            <p><strong>仓库：</strong>{{ modalData?.warehouse || '-' }}</p>
            <p><strong>总重量：</strong>{{ modalData?.total_weight ? modalData.total_weight.toFixed(2) : '-' }} 吨</p>
          </div>
          <div class="modal-table-header">
            <span class="modal-result-label">品种明细</span>
            <button class="btn btn-sm btn-secondary" @click="exportModalExcel">导出Excel</button>
          </div>
          <div class="table-wrapper">
            <table class="data-table modal-table">
              <thead>
                <tr>
                  <th>品种</th>
                  <th>重量(吨)</th>
                  <th width="100">筛选状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in modalVarietyData" :key="item.variety" :class="{ 'row-selected': isVarietySelected(item.variety) }">
                  <td>{{ item.variety }}</td>
                  <td>{{ item.weight.toFixed(2) }}</td>
                  <td>
                    <span v-if="isVarietySelected(item.variety)" class="status-selected">✅ 已选择</span>
                    <span v-else class="status-none">—</span>
                  </td>
                </tr>
                <tr v-if="modalVarietyData.length === 0">
                  <td :colspan="3" class="empty-data">暂无数据</td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 错误提示弹窗 -->
    <div v-if="errorModalVisible" class="modal" @click.self="closeErrorModal">
      <div class="modal-content modal-small">
        <div class="modal-header error-header">
          <h3>提示</h3>
          <button class="close-btn" @click="closeErrorModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-message">{{ errorModalMessage }}</p>
          <div v-if="errorModalDetails.length > 0" class="modal-details">
            <ul>
              <li v-for="detail in errorModalDetails" :key="detail">{{ detail }}</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="closeErrorModal">确定</button>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { ApiPaths } from '@/api/paths'
import { DELIVERY_HISTORY_FETCH_PAGE_SIZE } from '@/api/fetchLimits'
import { fetchDeliveryHistoryDimensionOptions } from '@/api/dimensionOptions'
import { fetchTlCategories } from '@/api/tlApi'

// ==================== 类型定义 ====================
interface HistoryRecord {
  id: number
  delivery_date: string
  regional_manager: string
  warehouse: string
  product_variety: string
  smelter?: string
  weight: string
  import_weather?: string
  created_at: string
}

// 汇总行数据（按日期+大区经理+冶炼厂+仓库分组）
interface SummaryRow {
  id: string
  /** 该汇总行对应的原始送货历史主键 id（批量删除用） */
  recordIds: number[]
  delivery_date: string
  regional_manager: string
  smelter: string
  warehouse: string
  weather: string
  total_weight: number
  details: { variety: string; weight: number }[]
}

interface ApiResponse {
  items: HistoryRecord[]
  total: number
  page: number
  page_size: number
}

// ==================== 状态 ====================
const activeTab = ref('list')
const tableLoading = ref(false)
const importLoading = ref(false)
const fileInput = ref<HTMLInputElement>()

// 数据
const allData = ref<HistoryRecord[]>([])
const summaryData = ref<SummaryRow[]>([])
const selectedRows = ref<string[]>([])

/** 列表固定每页条数；接口分批拉取后本地分页 */
const listPageSize = 10

// 预览数据（与 POST …/delivery-history/import 一致：上传整份原文件，字段名 file；列与 Excel 表头一致）
const previewColumns = ref<string[]>([])
const previewData = ref<Record<string, string>[]>([])
const selectedPreviewRows = ref<number[]>([])
const previewTotalRows = ref(0)
const pendingImportFile = ref<File | null>(null)

/** 与下载模板同一接口拉取并解析，表头与列顺序与接口返回的 xlsx 一致 */
const templateSampleColumns = ref<string[]>([])
const templateSampleRows = ref<Record<string, string>[]>([])
const templateSampleLoading = ref(false)


// 错误弹窗
const errorModalVisible = ref(false)
const errorModalMessage = ref('')
const errorModalDetails = ref<string[]>([])

// 筛选条件
const filters = ref({
  startDate: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })(),
  endDate: new Date().toISOString().slice(0, 10)
})

// 大区经理多选
const selectedManagers = ref<string[]>([])
const managerSearchText = ref('')
const managerDropdownVisible = ref(false)
const managerInputRef = ref<HTMLInputElement>()
const allManagerOptions = ref<string[]>([])
const filteredManagerOptions = ref<string[]>([])

// 冶炼厂多选
const selectedSmelters = ref<string[]>([])
const smelterSearchText = ref('')
const smelterDropdownVisible = ref(false)
const smelterInputRef = ref<HTMLInputElement>()
const allSmelterOptions = ref<string[]>([])
const filteredSmelterOptions = ref<string[]>([])

// 仓库多选
const selectedWarehouses = ref<string[]>([])
const warehouseSearchText = ref('')
const warehouseDropdownVisible = ref(false)
const warehouseInputRef = ref<HTMLInputElement>()
const allWarehouseOptions = ref<string[]>([])
const filteredWarehouseOptions = ref<string[]>([])

// 品种多选
const selectedVarieties = ref<string[]>([])
const varietySearchText = ref('')
const varietyDropdownVisible = ref(false)
const varietyInputRef = ref<HTMLInputElement>()
const allVarietyOptions = ref<string[]>([])
const filteredVarietyOptions = ref<string[]>([])

/** 品类显示名 → 全部别名列表（查询时使用全部名称） */
const varietyNameToAllNames = ref<Map<string, string[]>>(new Map())

/** 与电子地图/比价系统一致的 10 个固定回收品类 */
const FIXED_CATEGORY_IDS: readonly number[] = [6, 4, 15, 11, 16, 2, 5, 17, 12, 3]

// 标签预览常量
const MULTI_PREVIEW_TAG_COUNT = 1

function multiSelectTagsClass(selected: string[]) {
  return { 'selected-tags--single': selected.length === 1 }
}

function multiSelectPlaceholder(selected: string[]) {
  return selected.length > 0 ? '' : '搜索并选择'
}

// 大区经理标签预览
const mgrManagersTagsPreview = computed(() => selectedManagers.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const mgrManagersTagsMore = computed(() => Math.max(0, selectedManagers.value.length - MULTI_PREVIEW_TAG_COUNT))
const mgrManagersTagsRest = computed(() => selectedManagers.value.slice(MULTI_PREVIEW_TAG_COUNT))

// 冶炼厂标签预览
const mgrSmeltersTagsPreview = computed(() => selectedSmelters.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const mgrSmeltersTagsMore = computed(() => Math.max(0, selectedSmelters.value.length - MULTI_PREVIEW_TAG_COUNT))
const mgrSmeltersTagsRest = computed(() => selectedSmelters.value.slice(MULTI_PREVIEW_TAG_COUNT))

// 仓库标签预览
const whWarehousesTagsPreview = computed(() => selectedWarehouses.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const whWarehousesTagsMore = computed(() => Math.max(0, selectedWarehouses.value.length - MULTI_PREVIEW_TAG_COUNT))
const whWarehousesTagsRest = computed(() => selectedWarehouses.value.slice(MULTI_PREVIEW_TAG_COUNT))

// 品种标签预览
const varietyTagsPreview = computed(() => selectedVarieties.value.slice(0, MULTI_PREVIEW_TAG_COUNT))
const varietyTagsMore = computed(() => Math.max(0, selectedVarieties.value.length - MULTI_PREVIEW_TAG_COUNT))
const varietyTagsRest = computed(() => selectedVarieties.value.slice(MULTI_PREVIEW_TAG_COUNT))

// 分页（仅前端；数据一次性拉齐后按汇总行切片）
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(summaryData.value.length / listPageSize)))
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * listPageSize
  return summaryData.value.slice(start, start + listPageSize)
})

const isAllSelected = computed(() => {
  return paginatedData.value.length > 0 && selectedRows.value.length === paginatedData.value.length
})

const isAllPreviewSelected = computed(() => {
  return previewData.value.length > 0 && selectedPreviewRows.value.length === previewData.value.length
})

// 弹窗相关
const modalVisible = ref(false)
const modalData = ref<SummaryRow | null>(null)
const modalTitle = ref('')
const modalVarietyData = ref<{ variety: string; weight: number }[]>([])

// ==================== 错误弹窗 ====================
const showError = (message: string, details?: string[]) => {
  errorModalMessage.value = message
  errorModalDetails.value = details || []
  errorModalVisible.value = true
}

const closeErrorModal = () => {
  errorModalVisible.value = false
  errorModalMessage.value = ''
  errorModalDetails.value = []
}

// ==================== 大区经理逻辑 ====================
function filterOptionsBySearch(options: string[], searchLower: string) {
  if (!searchLower) return [...options]
  return options.filter((opt) => opt.toLowerCase().includes(searchLower))
}

const filterManagerOptions = () => {
  const search = managerSearchText.value.toLowerCase()
  filteredManagerOptions.value = filterOptionsBySearch(allManagerOptions.value, search)
}

function onManagerFocus() {
  managerDropdownVisible.value = true
  filterManagerOptions()
}

function onManagerSearchInput() {
  managerDropdownVisible.value = true
  filterManagerOptions()
}

const addManager = (item: string) => {
  if (!selectedManagers.value.includes(item)) selectedManagers.value.push(item)
  managerSearchText.value = ''
  filterManagerOptions()
}

const removeManager = (item: string) => {
  selectedManagers.value = selectedManagers.value.filter((i) => i !== item)
  filterManagerOptions()
}

function onManagerDropdownPick(item: string) {
  if (selectedManagers.value.includes(item)) removeManager(item)
  else addManager(item)
}

const handleManagerKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && managerSearchText.value.trim()) {
    addManager(managerSearchText.value.trim())
    e.preventDefault()
  }
}

const closeManagerDropdown = () => {
  setTimeout(() => {
    managerDropdownVisible.value = false
  }, 200)
}

const focusManagerInput = () => {
  managerDropdownVisible.value = true
  filterManagerOptions()
  nextTick(() => managerInputRef.value?.focus())
}

// ==================== 冶炼厂逻辑 ====================
const filterSmelterOptions = () => {
  const search = smelterSearchText.value.toLowerCase()
  filteredSmelterOptions.value = filterOptionsBySearch(allSmelterOptions.value, search)
}

function onSmelterFocus() {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
}

function onSmelterSearchInput() {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
}

const addSmelter = (item: string) => {
  if (!selectedSmelters.value.includes(item)) selectedSmelters.value.push(item)
  smelterSearchText.value = ''
  filterSmelterOptions()
}

const removeSmelter = (item: string) => {
  selectedSmelters.value = selectedSmelters.value.filter((i) => i !== item)
  filterSmelterOptions()
}

function onSmelterDropdownPick(item: string) {
  if (selectedSmelters.value.includes(item)) removeSmelter(item)
  else addSmelter(item)
}

const handleSmelterKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && smelterSearchText.value.trim()) {
    addSmelter(smelterSearchText.value.trim())
    e.preventDefault()
  }
}

const closeSmelterDropdown = () => {
  setTimeout(() => {
    smelterDropdownVisible.value = false
  }, 200)
}

const focusSmelterInput = () => {
  smelterDropdownVisible.value = true
  filterSmelterOptions()
  nextTick(() => smelterInputRef.value?.focus())
}

// ==================== 仓库逻辑 ====================
const filterWarehouseOptions = () => {
  const search = warehouseSearchText.value.toLowerCase()
  filteredWarehouseOptions.value = filterOptionsBySearch(allWarehouseOptions.value, search)
}

function onWarehouseFocus() {
  warehouseDropdownVisible.value = true
  filterWarehouseOptions()
}

function onWarehouseSearchInput() {
  warehouseDropdownVisible.value = true
  filterWarehouseOptions()
}

const addWarehouse = (item: string) => {
  if (!selectedWarehouses.value.includes(item)) selectedWarehouses.value.push(item)
  warehouseSearchText.value = ''
  filterWarehouseOptions()
}

const removeWarehouse = (item: string) => {
  selectedWarehouses.value = selectedWarehouses.value.filter((i) => i !== item)
  filterWarehouseOptions()
}

function onWarehouseDropdownPick(item: string) {
  if (selectedWarehouses.value.includes(item)) removeWarehouse(item)
  else addWarehouse(item)
}

const handleWarehouseKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && warehouseSearchText.value.trim()) {
    addWarehouse(warehouseSearchText.value.trim())
    e.preventDefault()
  }
}

const closeWarehouseDropdown = () => {
  setTimeout(() => {
    warehouseDropdownVisible.value = false
  }, 200)
}

const focusWarehouseInput = () => {
  warehouseDropdownVisible.value = true
  filterWarehouseOptions()
  nextTick(() => warehouseInputRef.value?.focus())
}

// ==================== 品种逻辑 ====================
const filterVarietyOptions = () => {
  const search = varietySearchText.value.toLowerCase()
  filteredVarietyOptions.value = filterOptionsBySearch(allVarietyOptions.value, search)
}

function onVarietyFocus() {
  varietyDropdownVisible.value = true
  filterVarietyOptions()
}

function onVarietySearchInput() {
  varietyDropdownVisible.value = true
  filterVarietyOptions()
}

const addVariety = (item: string) => {
  if (!selectedVarieties.value.includes(item)) selectedVarieties.value.push(item)
  varietySearchText.value = ''
  filterVarietyOptions()
}

const removeVariety = (item: string) => {
  selectedVarieties.value = selectedVarieties.value.filter((i) => i !== item)
  filterVarietyOptions()
}

function onVarietyDropdownPick(item: string) {
  if (selectedVarieties.value.includes(item)) removeVariety(item)
  else addVariety(item)
}

const handleVarietyKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && varietySearchText.value.trim()) {
    addVariety(varietySearchText.value.trim())
    e.preventDefault()
  }
}

const closeVarietyDropdown = () => {
  setTimeout(() => {
    varietyDropdownVisible.value = false
  }, 200)
}

const focusVarietyInput = () => {
  varietyDropdownVisible.value = true
  filterVarietyOptions()
  nextTick(() => varietyInputRef.value?.focus())
}

// ==================== 汇总数据（按日期+大区经理+冶炼厂+仓库分组） ====================
const aggregateData = (data: HistoryRecord[]): SummaryRow[] => {
  const map = new Map<string, SummaryRow>()
  
  data.forEach(item => {
    const key = `${item.delivery_date}|${item.regional_manager}|${item.smelter || ''}|${item.warehouse}`
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        recordIds: [],
        delivery_date: item.delivery_date,
        regional_manager: item.regional_manager,
        smelter: item.smelter || '',
        warehouse: item.warehouse,
        weather: item.import_weather || '',
        total_weight: 0,
        details: []
      })
    }
    const row = map.get(key)!
    row.recordIds.push(item.id)
    const weight = parseFloat(item.weight)
    row.total_weight += weight
    row.details.push({
      variety: item.product_variety,
      weight: weight
    })
  })
  
  return Array.from(map.values()).sort((a, b) => {
    if (a.delivery_date !== b.delivery_date) return b.delivery_date.localeCompare(a.delivery_date)
    if (a.regional_manager !== b.regional_manager) return a.regional_manager.localeCompare(b.regional_manager)
    if (a.smelter !== b.smelter) return a.smelter.localeCompare(b.smelter)
    return a.warehouse.localeCompare(b.warehouse)
  })
}

// ==================== 获取下拉选项 ====================
const fetchOptions = async () => {
  try {
    const [dims, categories] = await Promise.all([
      fetchDeliveryHistoryDimensionOptions(),
      fetchTlCategories().catch(() => []),
    ])
    allManagerOptions.value = dims.regional_managers
    allSmelterOptions.value = dims.smelters
    allWarehouseOptions.value = dims.warehouses

    // 解析品类：每个品类的品类名用"、"分隔，第一个作为显示名，全部用于查询
    const nameMap = new Map<string, string[]>()
    const idToFirstName = new Map<number, string>()
    for (const cat of categories) {
      const allNames = cat.name.split('、').map(s => s.trim()).filter(s => s !== '')
      if (allNames.length > 0) {
        idToFirstName.set(cat.id, allNames[0])
        nameMap.set(allNames[0], allNames)
      }
    }
    varietyNameToAllNames.value = nameMap

    // 仅保留固定 10 个品类，按固定 id 顺序排列，显示第一个名称
    allVarietyOptions.value = FIXED_CATEGORY_IDS
      .map((id) => idToFirstName.get(id) ?? '')
      .filter((n) => n !== '')

    filteredManagerOptions.value = [...allManagerOptions.value]
    filteredSmelterOptions.value = [...allSmelterOptions.value]
    filteredWarehouseOptions.value = [...allWarehouseOptions.value]
    filteredVarietyOptions.value = [...allVarietyOptions.value]
  } catch (error) {
    console.error('获取选项失败', error)
  }
}

// ==================== 获取数据 ====================
const fetchData = async () => {
  tableLoading.value = true
  try {
    const baseParams: Record<string, any> = {}

    if (filters.value.startDate) {
      baseParams.date_from = filters.value.startDate
    }
    if (filters.value.endDate) {
      baseParams.date_to = filters.value.endDate
    }

    if (selectedManagers.value.length > 0) {
      baseParams.regional_managers = selectedManagers.value
    }
    if (selectedSmelters.value.length > 0) {
      baseParams.smelters = selectedSmelters.value
    }
    if (selectedWarehouses.value.length > 0) {
      baseParams.warehouses = selectedWarehouses.value
    }
    if (selectedVarieties.value.length > 0) {
      // 查询时使用每个品类的所有别名
      const allVarietyNames: string[] = []
      for (const name of selectedVarieties.value) {
        const allNames = varietyNameToAllNames.value.get(name)
        if (allNames) {
          allVarietyNames.push(...allNames)
        } else {
          allVarietyNames.push(name)
        }
      }
      baseParams.product_varieties = [...new Set(allVarietyNames)]
    }

    const allItems: HistoryRecord[] = []
    let page = 1
    while (page <= 200) {
      const params = {
        ...baseParams,
        page,
        page_size: DELIVERY_HISTORY_FETCH_PAGE_SIZE,
      }
      const response = await axios.get(ApiPaths.deliveryHistory, { params })
      const data = response.data as ApiResponse
      const items = data.items || []
      allItems.push(...items)
      if (items.length === 0) break
      if (items.length < DELIVERY_HISTORY_FETCH_PAGE_SIZE) break
      if (typeof data.total === 'number' && allItems.length >= data.total) break
      page += 1
    }

    allData.value = allItems
    if (allItems.length > 0) {
      summaryData.value = aggregateData(allItems)
    } else {
      summaryData.value = []
    }

    const tp = Math.max(1, Math.ceil(summaryData.value.length / listPageSize))
    if (currentPage.value > tp) currentPage.value = tp
  } catch (error) {
    console.error('获取数据失败', error)
    showError('获取数据失败', ['请检查网络连接或稍后重试'])
  } finally {
    tableLoading.value = false
  }
}

const validateDateRange = (): boolean => {
  const start = filters.value.startDate
  const end = filters.value.endDate
  if (start && end && end < start) {
    showError('日期范围错误', ['结束日期不能早于开始日期，请重新选择'])
    return false
  }
  return true
}

const handleQuery = () => {
  if (!validateDateRange()) return
  currentPage.value = 1
  fetchData()
}

const handleReset = () => {
  filters.value = {
    startDate: '',
    endDate: ''
  }
  selectedManagers.value = []
  selectedSmelters.value = []
  selectedWarehouses.value = []
  selectedVarieties.value = []
  managerSearchText.value = ''
  smelterSearchText.value = ''
  warehouseSearchText.value = ''
  varietySearchText.value = ''
  currentPage.value = 1
  fetchData()
}

// ==================== 分页 ====================
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// ==================== 全选/批量删除 ====================
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedRows.value = []
  } else {
    selectedRows.value = paginatedData.value.map(row => row.id)
  }
}

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return
  if (!confirm(`确认删除选中的${selectedRows.value.length}条汇总行？将删除其下全部明细记录，此操作不可恢复。`)) return

  const idSet = new Set<number>()
  for (const sid of selectedRows.value) {
    const row = summaryData.value.find((r) => r.id === sid)
    row?.recordIds.forEach((id) => idSet.add(id))
  }
  const ids = [...idSet]
  if (ids.length === 0) {
    showError('无法删除', ['未找到对应的主键 id，请刷新后重试'])
    return
  }

  try {
    await axios.delete(ApiPaths.deliveryHistoryBatchDelete, { data: { ids } })
    window.alert(`已成功删除 ${ids.length} 条送货历史记录`)
    selectedRows.value = []
    fetchData()
    fetchOptions()
  } catch (error: any) {
    console.error('删除失败', error)
    const detail = error.response?.data?.detail
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join('；') || '请稍后重试'
          : error.response?.data?.message || '请稍后重试'
    showError('删除失败', [msg])
  }
}

// ==================== 导出当前筛选结果 ====================
const exportFilteredData = () => {
  if (summaryData.value.length === 0) {
    showError('没有可导出的数据', ['请先查询数据后再导出'])
    return
  }
  
  const headers = ['送货日期', '大区经理', '冶炼厂', '仓库', '品类', '天气', '重量(吨)']
  const rowsData = summaryData.value.map(item => [
    item.delivery_date,
    item.regional_manager,
    item.smelter || '',
    item.warehouse,
    item.details.map(d => d.variety).join(', '),
    item.weather || '',
    item.total_weight.toFixed(2)
  ])
  
  const csvContent = [headers, ...rowsData].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `送货历史数据_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 判断品种是否被筛选选中 ====================
const isVarietySelected = (variety: string): boolean => {
  if (selectedVarieties.value.length === 0) return false
  return selectedVarieties.value.includes(variety)
}

// ==================== 详情弹窗 ====================
const openDetailModal = (row: SummaryRow) => {
  modalData.value = row
  modalTitle.value = `${row.delivery_date} - ${row.regional_manager} - ${row.warehouse} 品种明细`
  modalVarietyData.value = [...row.details]
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  modalData.value = null
  modalVarietyData.value = []
}

// ==================== 导出弹窗Excel ====================
const exportModalExcel = () => {
  if (modalVarietyData.value.length === 0) {
    showError('没有可导出的数据', [])
    return
  }
  
  const headers = ['品种', '重量(吨)', '筛选状态']
  const rowsData = modalVarietyData.value.map(item => [
    item.variety,
    item.weight.toFixed(2),
    isVarietySelected(item.variety) ? '已选择' : '未选择'
  ])
  
  const csvContent = [headers, ...rowsData].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `${modalTitle.value}_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 导入功能 ====================
/** 与「下载模板」共用同一请求，保证页面示例与下载文件一致 */
async function fetchDeliveryHistoryTemplateBuffer(): Promise<ArrayBuffer> {
  const { data } = await axios.get<ArrayBuffer>(ApiPaths.deliveryHistoryTemplate, {
    responseType: 'arraybuffer',
  })
  return data
}

function parseWorkbookRowsFromArrayBuffer(ab: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(ab, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const ws = wb.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' })
}

const loadTemplateSampleRows = async () => {
  templateSampleLoading.value = true
  try {
    const ab = await fetchDeliveryHistoryTemplateBuffer()
    const sheetRows = parseWorkbookRowsFromArrayBuffer(ab)
    const { columns, rows } = sheetRowsToKeyedRows(sheetRows)
    templateSampleColumns.value = columns
    templateSampleRows.value = rows.slice(0, 10)
  } catch (e) {
    console.error('加载模板示例失败', e)
    templateSampleColumns.value = []
    templateSampleRows.value = []
  } finally {
    templateSampleLoading.value = false
  }
}

const downloadTemplate = async () => {
  try {
    const ab = await fetchDeliveryHistoryTemplateBuffer()
    const blob = new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '送货数据导入模板.xlsx'
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('下载模板失败', error)
    showError('下载模板失败', ['请检查网络连接或稍后重试'])
  }
}

const triggerImport = () => {
  fileInput.value?.click()
}

function cellToString(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function rowHasAnyCell(row: Record<string, unknown>): boolean {
  return Object.values(row).some((v) => cellToString(v) !== '')
}

/** 按首行键顺序生成列与行，保留后端模板全部列 */
function sheetRowsToKeyedRows(sheetRows: Record<string, unknown>[]): {
  columns: string[]
  rows: Record<string, string>[]
} {
  if (!sheetRows.length) return { columns: [], rows: [] }
  const headerOrder = Object.keys(sheetRows[0]!)
  const rows = sheetRows.filter(rowHasAnyCell).map((row) => {
    const out: Record<string, string> = {}
    for (const h of headerOrder) {
      out[h] = cellToString(row[h])
    }
    return out
  })
  return { columns: headerOrder, rows }
}

function parseSheetRows(file: File, ab: ArrayBuffer): Record<string, unknown>[] {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const wb =
    ext === 'csv'
      ? XLSX.read(new Uint8Array(ab), { type: 'array' })
      : XLSX.read(ab, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const ws = wb.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' })
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importLoading.value = true
  try {
    const ab = await file.arrayBuffer()
    const sheetRows = parseSheetRows(file, ab)
    const { columns, rows: parsed } = sheetRowsToKeyedRows(sheetRows)
    if (parsed.length === 0) {
      showError('未解析到数据', [
        '请确认首行为表头，且文件中至少有一行有效数据；列名需与当前下载模板一致。',
      ])
      pendingImportFile.value = null
      previewColumns.value = []
      previewData.value = []
      previewTotalRows.value = 0
      selectedPreviewRows.value = []
      return
    }
    pendingImportFile.value = file
    previewColumns.value = columns
    previewTotalRows.value = parsed.length
    previewData.value = parsed.slice(0, 10)
    selectedPreviewRows.value = previewData.value.map((_, idx) => idx)
  } catch (e) {
    console.error('解析文件失败', e)
    showError('文件解析失败', ['请使用与模板一致的 .xlsx / .xls / .csv'])
    pendingImportFile.value = null
    previewColumns.value = []
    previewData.value = []
    previewTotalRows.value = 0
    selectedPreviewRows.value = []
  } finally {
    importLoading.value = false
  }
}

const toggleSelectAllPreview = () => {
  if (isAllPreviewSelected.value) {
    selectedPreviewRows.value = []
  } else {
    selectedPreviewRows.value = previewData.value.map((_, idx) => idx)
  }
}

const clearPreview = () => {
  previewColumns.value = []
  previewData.value = []
  selectedPreviewRows.value = []
  previewTotalRows.value = 0
  pendingImportFile.value = null
}

const confirmImport = async () => {
  const file = pendingImportFile.value
  if (!file) {
    showError('请先选择文件', [])
    return
  }

  importLoading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file, file.name)
    await axios.post(ApiPaths.deliveryHistoryImport, fd, {
      timeout: 300_000,
    })
    window.alert('导入成功')
    clearPreview()
    fetchOptions()
    if (activeTab.value === 'list') {
      fetchData()
    }
  } catch (error: any) {
    console.error('导入失败', error)
    const detail = error.response?.data?.detail
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join('；') || '请稍后重试'
          : error.response?.data?.message || error.message || '请稍后重试'
    showError('导入失败', [msg])
  } finally {
    importLoading.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchOptions()
  loadTemplateSampleRows()
})
</script>

<style scoped>
.history-manage-page { width: 100%; animation: fadeIn 0.25s ease both; }
.card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); animation: fadeInUp 0.3s ease both; }
.filter-card { position: relative; z-index: 40; overflow: visible; }
.inner-menu { display: flex; gap: 8px; background: #F5F7FA; border-radius: 8px; padding: 4px; }
.menu-item { padding: 8px 24px; cursor: pointer; font-size: 14px; font-weight: 500; border-radius: 6px; color: #606266; }
.menu-item:hover { background-color: rgba(74, 122, 156, 0.1); }
.menu-item.active { background-color: #1476db; color: white; }
.filter-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; overflow: visible; }
.filter-item { display: flex; flex-direction: column; gap: 6px; min-width: 140px; overflow: visible; }
.filter-item label { font-size: 13px; font-weight: 500; color: #606266; }
.date-range { display: flex; gap: 8px; align-items: center; }
.filter-input { padding: 6px 10px; border: 1px solid #E5E9F2; border-radius: 4px; font-size: 13px; width: 130px; }
.filter-actions { display: flex; gap: 10px; flex-shrink: 0; margin-left: auto; }
.multi-select-item { min-width: 200px; max-width: 280px; }
.multi-select-item--wide { min-width: 300px; max-width: 380px; flex: 1 1 300px; }
.multi-select-container { position: relative; width: 100%; max-width: 280px; overflow: visible; }
.multi-select-container--wide { max-width: 100%; }
.selected-tags { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; padding: 2px 6px; border: 1px solid #E5E9F2; border-radius: 4px; background: white; height: 32px; min-height: 32px; max-height: 32px; overflow-x: auto; overflow-y: hidden; cursor: text; box-sizing: border-box; }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; background-color: #E8F0F8; border-radius: 3px; font-size: 12px; color: #2c3e50; max-width: 118px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.tag-remove { background: none; border: none; cursor: pointer; font-size: 14px; color: #909399; padding: 0 2px; }
.tag-remove:hover { color: #f56c6c; }
.tag-shrink { flex-shrink: 0; }
.tag-more { max-width: none; overflow: visible; text-overflow: clip; background-color: #f0f2f5; color: #606266; }
.multi-input { border: none; outline: none; font-size: 13px; flex: 1 1 48px; min-width: 48px; }
.multi-input::placeholder { color: #c0c4cc; }
.dropdown-list { position: absolute; top: 100%; left: 0; right: 0; max-height: 240px; overflow-y: auto; background: white; border: 1px solid #E5E9F2; border-radius: 4px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); z-index: 2500; margin-top: 2px; }
.dropdown-item { padding: 8px 12px; cursor: pointer; font-size: 13px; color: #606266; text-align: left; }
.dropdown-item:hover { background-color: #F5F7FA; color: #1476db; }
.dropdown-item--selected { color: #a8abb2; background-color: #f5f7fa; }
.dropdown-item--selected:hover { background-color: #ebeef5; color: #909399; }
.batch-card { padding: 12px 20px; }
.batch-bar { display: flex; justify-content: flex-start; }
.btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12); }
.btn:active { transform: scale(0.97); }
.btn-primary { background-color: #1476db; color: white; }
.btn-primary:hover { background-color: #0e65c4; }
.btn-secondary { background-color: #F5F7FA; color: #606266; border: 1px solid #E5E9F2; }
.btn-secondary:hover { background-color: #E5E9F2; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-danger { background-color: #f56c6c; color: white; }
.btn-danger:hover:not(:disabled) { background-color: #f78989; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-view { background: none; border: 1px solid #1476db; color: #1476db; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background-color: #1476db; color: white; }
.table-wrapper { overflow-x: auto; border: 1px solid #E5E9F2; border-radius: 4px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #E5E9F2; white-space: nowrap; }
.data-table th { background-color: #E8F0F8; font-weight: 600; color: #2c3e50; }
.data-table tbody tr { transition: background 0.15s ease; }
.data-table tbody tr:hover { background-color: #f0f7ff; }
.empty-data { text-align: center; padding: 40px; color: #909399; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 4px 12px; border: 1px solid #E5E9F2; background: white; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination select { padding: 4px 8px; border: 1px solid #E5E9F2; border-radius: 4px; }
.action-bar { display: flex; justify-content: flex-start; align-items: center; }
.action-left { display: flex; gap: 12px; }

/* 预览区域样式 */
.preview-card { background-color: #F5F7FA; }
.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E9F2; }
.preview-title { font-size: 14px; font-weight: 600; color: #2e7d32; }
.preview-count { font-size: 12px; color: #909399; }
.preview-table { font-size: 12px; }
.preview-table th, .preview-table td { padding: 6px 10px; }
.preview-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E5E9F2; }

.sample-card { min-height: 280px; }
.sample-header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E9F2; display: flex; flex-direction: column; gap: 4px; }
.sample-title { font-size: 14px; font-weight: 600; color: #2c3e50; }
.sample-hint { font-size: 12px; color: #909399; line-height: 1.5; }
.sample-loading { text-align: center; padding: 48px 16px; color: #909399; font-size: 14px; }
.sample-table { font-size: 13px; }
.sample-table th, .sample-table td { padding: 8px 12px; }
.sample-format-note {
  margin: 12px 0 0;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1.6;
  color: #e53935;
}
.sample-format-note code {
  font-size: 11px;
  padding: 0 4px;
  background: #ffebee;
  border-radius: 3px;
  color: #c62828;
}
.sample-format-note strong { font-weight: 600; }

/* 弹窗样式 */
.modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.2s ease both; }
.modal-content { background: white; border-radius: 8px; width: 600px; max-width: 90%; max-height: 80%; overflow: auto; animation: scaleIn 0.25s ease both; }
.modal-small { width: 450px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E9F2; }
.modal-header h3 { font-size: 16px; font-weight: 600; color: #1F2D3D; margin: 0; }
.error-header { background-color: #ffebee; border-bottom-color: #ef9a9a; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #909399; }
.close-btn:hover { color: #606266; }
.modal-body { padding: 20px; }
.modal-message { font-size: 14px; color: #606266; margin-bottom: 12px; }
.modal-details { background-color: #f5f7fa; padding: 12px; border-radius: 4px; margin-top: 12px; }
.modal-details ul { margin: 0; padding-left: 20px; font-size: 13px; color: #909399; }
.modal-details li { margin: 4px 0; }
.modal-footer { padding: 16px 20px; border-top: 1px solid #E5E9F2; text-align: right; }

/* 详情弹窗内样式 */
.modal-info { background: #F5F7FA; padding: 12px; border-radius: 6px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 16px; }
.modal-info p { margin: 0; font-size: 13px; color: #606266; }
.modal-info strong { color: #1F2D3D; }
.modal-table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-result-label { font-size: 14px; font-weight: 600; color: #2e7d32; }
.modal-table { width: 100%; }
.row-selected { background-color: #e8f5e9 !important; }
.status-selected { color: #2e7d32; font-weight: 500; }
.status-none { color: #c0c4cc; }
</style>