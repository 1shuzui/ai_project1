<template>
  <div class="wdc-page">
    <div class="wdc-head">
      <h2>库房距离监测配置</h2>
      <p>
        单向绑定：源库房 → 对标库房。相同源库房合并展示；修改、删除时在弹窗中选择对标库房后确认。
      </p>
    </div>

    <section class="wdc-card">
      <div class="wdc-toolbar">
        <div class="wdc-filters">
          <div class="wdc-filter-field">
            <label for="wdc-filter-from">源库房</label>
            <WarehouseSearchPicker
              input-id="wdc-filter-from"
              v-model="filterFromId"
              :options="warehouseOptions"
              allow-all
              placeholder="全部或搜索选择源库房"
            />
          </div>
          <div class="wdc-filter-field">
            <label for="wdc-filter-to">对标库房</label>
            <WarehouseSearchPicker
              input-id="wdc-filter-to"
              v-model="filterToId"
              :options="warehouseOptions"
              allow-all
              placeholder="全部或搜索选择对标库房"
            />
          </div>
          <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="applyFilters">
            筛选
          </button>
        </div>
        <div class="wdc-actions">
          <button type="button" class="btn btn-outline-primary" :disabled="busy" @click="openAddDialog">新增绑定</button>
          <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="refreshList">
            刷新列表
          </button>
        </div>
      </div>

      <p v-if="message" class="wdc-msg">{{ message }}</p>
      <p v-if="error" class="wdc-err">{{ error }}</p>

      <div class="wdc-table-wrap">
        <table class="wdc-table">
          <thead>
            <tr>
              <th>源库房</th>
              <th>对标库房</th>
              <th>库房距离</th>
              <th>阶梯价差</th>
              <th>实际价差</th>
              <th class="wdc-col-remark">备注</th>
              <th class="wdc-col-ai">AI分析</th>
              <th class="wdc-col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="listRows.length === 0">
              <td colspan="8">暂无数据</td>
            </tr>
            <template v-for="grp in groupedTableRows" :key="`grp-${grp.rows[0]?.fromId ?? 0}`">
              <tr v-for="(r, idx) in grp.rows" :key="`edge-${r.fromId}-${r.toId}`">
                <td v-if="idx === 0" class="wdc-td-source" :rowspan="grp.rows.length">
                  {{ r.fromName }}
                </td>
                <td>{{ r.toName }}</td>
                <td class="wdc-td-distance">{{ distanceCellText(r) }}</td>
                <td class="wdc-td-tier">{{ tierPriceCellText(r) }}</td>
                <td class="wdc-td-freight">{{ r.realTimeDiff || '—' }}</td>
                <td class="wdc-td-remark" @click="startEditRemark(r)">
                  <textarea
                    v-if="editingRemarkKey === edgeKey(r)"
                    v-model="editingRemarkText"
                    class="wdc-remark-textarea"
                    rows="2"
                    @blur="saveRemark(r)"
                    @keydown.escape="cancelEditRemark"
                    @click.stop
                  ></textarea>
                  <span v-else class="wdc-remark-text" :class="{ 'wdc-remark-placeholder': !r.remark }">
                    {{ r.remark || '点击编辑备注' }}
                  </span>
                </td>
                <td
                  v-if="r.aiAnalysis"
                  class="wdc-td-ai"
                  @click.stop="openAiDetail(r)"
                >
                  <div class="wdc-ai-preview">
                    {{ r.aiAnalysis.slice(0, 40) + (r.aiAnalysis.length > 40 ? '…' : '') }}
                  </div>
                </td>
                <td v-else class="wdc-td-ai">
                  <span class="wdc-remark-placeholder">—</span>
                </td>
                <td v-if="idx === 0" class="wdc-td-ops wdc-col-actions" :rowspan="grp.rows.length">
                  <div class="wdc-ops-merge">
                    <div class="wdc-ops-buttons-row">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-success"
                        :disabled="busy"
                        @click="openAddDialogFromGroup(grp)"
                      >
                        新增对标库房
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        :disabled="busy || grp.rows.length === 0"
                        @click="openEditModalFromGroup(grp)"
                      >
                        修改
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        :disabled="busy || grp.rows.length === 0"
                        @click="openEditTierModalFromGroup(grp)"
                      >
                        编辑阶梯价差
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        :disabled="busy || grp.rows.length === 0"
                        @click="openDeleteModalFromGroup(grp)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="wdc-pager">
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="listPage <= 1 || busy" @click="gotoPage(listPage - 1)">
          上一页
        </button>
        <span>第 {{ listPage }} / {{ listTotalPages }} 页（共 {{ listTotal }} 条）</span>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="listPage >= listTotalPages || busy"
          @click="gotoPage(listPage + 1)"
        >
          下一页
        </button>
      </div>
    </section>

    <div v-if="dialogOpen" class="wdc-modal-overlay" role="dialog" aria-modal="true" @click.self="closeDialog">
      <div class="wdc-modal">
        <h3 class="wdc-modal-title">{{ dialogTitle }}</h3>
        <div v-if="dialogMode === 'add'" class="wdc-modal-body">
          <div class="wdc-row">
            <label for="wdc-dlg-from-search">源库房</label>
            <input
              id="wdc-dlg-from-search"
              v-model="dialogAddFromSearch"
              type="search"
              class="wdc-search"
              placeholder="输入名称或编号模糊搜索，点击下方选择"
              autocomplete="off"
              aria-controls="wdc-dlg-from-list"
              aria-autocomplete="list"
            />
            <div id="wdc-dlg-from-list" class="wdc-from-picker" role="listbox" aria-label="源库房候选列表">
              <button
                v-for="w in dialogFromSelectOptions"
                :key="`df-${w.id}`"
                type="button"
                class="wdc-from-option"
                :class="{ 'wdc-from-option--selected': dialogFromId === w.id }"
                role="option"
                :aria-selected="dialogFromId === w.id"
                @click="pickAddDialogFromWarehouse(w)"
              >
                {{ w.name }}
              </button>
              <p v-if="!dialogFromSelectOptions.length" class="wdc-hint wdc-hint-inline">无匹配库房，请调整关键词</p>
            </div>
          </div>
          <div class="wdc-row">
            <label for="wdc-dlg-target-search">对标库房（目标，可多选）</label>
            <input
              id="wdc-dlg-target-search"
              v-model="dialogAddTargetSearch"
              type="search"
              class="wdc-search"
              placeholder="模糊搜索名称或编号以筛选列表…"
              autocomplete="off"
            />
            <div class="wdc-modal-chips">
              <label v-for="w in dialogTargetOptionsFiltered" :key="`add-b-${w.id}`" class="wdc-chip">
                <input v-model="dialogAddTargetIds" type="checkbox" :value="w.id" />
                <span>{{ w.name }}</span>
              </label>
              <p v-if="!dialogTargetOptionsFiltered.length" class="wdc-hint wdc-hint-inline">无匹配库房，请调整搜索词或清空搜索框</p>
            </div>
            <p v-if="addSelectedCount" class="wdc-hint">已选 {{ addSelectedCount }} 个目标库房</p>
          </div>
        </div>
        <div v-else-if="dialogMode === 'edit'" class="wdc-modal-body">
          <div v-if="dialogEditGroup?.rows.length" class="wdc-row">
            <label for="wdc-dlg-pick-target">选择你要修改的对标库房</label>
            <WarehouseSearchPicker
              input-id="wdc-dlg-pick-target"
              :model-value="editingRow?.toId ?? 0"
              :options="dialogEditBoundOptions"
              placeholder="搜索当前已绑定的对标库房"
              @update:model-value="onModalGroupTargetChange"
            />
          </div>
          <p class="wdc-modal-readonly">
            <span class="wdc-muted">源库房：</span>{{ editingRow?.fromName }}
          </p>
          <p class="wdc-modal-readonly">
            <span class="wdc-muted">当前对标库房：</span>{{ editingRow?.toName }}
          </p>
          <div class="wdc-row">
            <label for="wdc-dlg-edit-to">修改为对标库房</label>
            <WarehouseSearchPicker
              input-id="wdc-dlg-edit-to"
              v-model="dialogToId"
              :options="warehouseOptions"
              :exclude-id="editingRow?.fromId ?? 0"
              placeholder="模糊搜索新对标库房"
            />
          </div>
        </div>
        <div v-else-if="dialogMode === 'delete'" class="wdc-modal-body">
          <p class="wdc-modal-readonly">
            <span class="wdc-muted">源库房：</span>{{ editingRow?.fromName }}
          </p>
          <div v-if="dialogEditGroup?.rows.length" class="wdc-row">
            <label for="wdc-dlg-pick-del">选择你要删除的对标库房</label>
            <WarehouseSearchPicker
              input-id="wdc-dlg-pick-del"
              :model-value="editingRow?.toId ?? 0"
              :options="dialogEditBoundOptions"
              placeholder="搜索要删除的对标库房"
              @update:model-value="onModalGroupTargetChange"
            />
          </div>
          <p class="wdc-hint">将删除从上述源库房到所选对标库房的绑定关系。</p>
        </div>
        <div v-else-if="dialogMode === 'edit-tier'" class="wdc-modal-body">
          <p class="wdc-modal-readonly">
            <span class="wdc-muted">源库房：</span>{{ editingRow?.fromName }}
          </p>
          <div v-if="dialogEditGroup?.rows.length" class="wdc-row">
            <label for="wdc-dlg-pick-tier">对标库房</label>
            <WarehouseSearchPicker
              input-id="wdc-dlg-pick-tier"
              :model-value="editingRow?.toId ?? 0"
              :options="dialogEditBoundOptions"
              placeholder="搜索要编辑阶梯价差的对标库房"
              @update:model-value="onModalGroupTargetChange"
            />
          </div>
          <div class="wdc-row">
            <label for="wdc-dlg-tier-text">差价</label>
            <textarea
              id="wdc-dlg-tier-text"
              v-model="dialogTierText"
              class="wdc-textarea"
              rows="3"
              placeholder="填写差价金额；若无需差价，请清空此处后点「确定」"
            ></textarea>
          </div>
          <p class="wdc-hint">保存后生效。若框内留空再保存，将去掉当前已保存的差价。</p>
        </div>
        <div class="wdc-modal-footer">
          <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="closeDialog">取消</button>
          <button
            v-if="dialogMode !== 'delete'"
            type="button"
            class="btn btn-primary"
            :disabled="
              busy ||
              (dialogMode === 'edit-tier' ? !dialogValidEditTier : !dialogValid)
            "
            @click="submitDialog"
          >
            确定
          </button>
          <button
            v-else
            type="button"
            class="btn btn-danger"
            :disabled="busy || !dialogValidDelete"
            @click="submitDialog"
          >
            确定删除
          </button>
        </div>
      </div>
    </div>

    <!-- AI分析详情弹窗 -->
    <div v-if="aiDetailOpen" class="wdc-modal-overlay" role="dialog" aria-modal="true" @click.self="closeAiDetail">
      <div class="wdc-modal wdc-ai-modal">
        <h3 class="wdc-modal-title">AI分析详情</h3>
        <div class="wdc-modal-body">
          <p class="wdc-modal-readonly">
            <span class="wdc-muted">源库房：</span>{{ aiDetailRow?.fromName }}
            <span class="wdc-muted" style="margin-left:16px">对标库房：</span>{{ aiDetailRow?.toName }}
          </p>
          <div class="wdc-ai-detail-content">{{ aiDetailRow?.aiAnalysis || '暂无分析结果' }}</div>
        </div>
        <div class="wdc-modal-footer">
          <button type="button" class="btn btn-outline-secondary" @click="closeAiDetail">关闭</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import WarehouseSearchPicker from '@/components/WarehouseSearchPicker.vue'
import { warehouseDisplayName } from '@/utils/warehouseDisplayName'
import { warehouseMatchesQuery } from '@/utils/warehouseFuzzyMatch'
import {
  deleteTlUnbindWarehouseLink,
  fetchTlCalculateDistance,
  fetchTlWarehouseLinksListAll,
  fetchTlWarehousesAll,
  fetchTlRealtimeSpreadList,
  postTlBatchBindWarehouseLinks,
  postTlBindWarehouseLink,
  putTlUpdateWarehouseLinkRemark,
  putTlUpdateWarehouseLinkTier,
} from '../api/tlApi'

type WarehouseOption = { id: number; name: string }
/** 阶梯价差：接口可为 null；非纯数字时保留 tierPriceEditSeed 供展示与编辑 */
type LinkRow = {
  /** 后端关联id，编辑阶梯价差时需要 */
  linkId: number
  fromId: number
  toId: number
  fromName: string
  toName: string
  tierPriceDiff: number | null
  tierPriceEditSeed: string
  /** 实时价差：暂无后端数据，预留字段 */
  realTimeDiff: string | null
  /** 备注：可内联编辑 */
  remark: string
  /** AI分析：只读多行文本 */
  aiAnalysis: string
  /** 上次分析时间：只读 YYYY-MM-DD HH:mm:ss */
  lastAnalysisTime: string
}

/** 同一源库房的多条出边，用于合并首列与末列 */
type LinkRowGroup = { rows: LinkRow[] }

const warehouseOptions = ref<WarehouseOption[]>([])
/** 库房 id → WGS84 经纬度（与电子地图解析字段一致，供距离接口使用） */
const warehouseCoordById = ref<Record<number, { lat: number; lng: number }>>({})
const distanceTextByEdgeKey = ref<Record<string, string>>({})
const distanceStatus = ref<'idle' | 'loading' | 'done'>('idle')

const filterFromId = ref(0)
const filterToId = ref(0)

const listRows = ref<LinkRow[]>([])
const listPage = ref(1)
const listSize = ref(50)
/** 按源库房分组后，每组（源库房 + 全部对标库房）作为整体，计算分页 */
const groupedAllPages = computed((): LinkRow[][] => {
  const sorted = [...listRows.value].sort((a, b) => {
    if (a.fromId !== b.fromId) return a.fromId - b.fromId
    const byName = String(a.toName).localeCompare(b.toName, 'zh-CN')
    if (byName !== 0) return byName
    return a.toId - b.toId
  })
  // 按源库房分组
  const groups: LinkRow[][] = []
  let i = 0
  while (i < sorted.length) {
    const fromId = sorted[i].fromId
    let j = i + 1
    while (j < sorted.length && sorted[j].fromId === fromId) j++
    groups.push(sorted.slice(i, j))
    i = j
  }
  // 分页：每个源库房组不拆分
  const pages: LinkRow[][] = []
  let page: LinkRow[] = []
  for (const grp of groups) {
    if (page.length > 0 && page.length + grp.length > listSize.value) {
      pages.push(page)
      page = []
    }
    page.push(...grp)
  }
  if (page.length > 0) pages.push(page)
  return pages.length > 0 ? pages : [[]]
})
const listTotal = computed(() => listRows.value.length)
const listTotalPages = computed(() => groupedAllPages.value.length)
/** 当前页的行（保证同一源库房的记录不拆页） */
const pageRows = computed(() => groupedAllPages.value[listPage.value - 1] ?? [])

const groupedTableRows = computed((): LinkRowGroup[] => {
  const rows = [...pageRows.value].sort((a, b) => {
    if (a.fromId !== b.fromId) return a.fromId - b.fromId
    const byName = String(a.toName).localeCompare(String(b.toName), 'zh-CN')
    if (byName !== 0) return byName
    return a.toId - b.toId
  })
  const groups: LinkRowGroup[] = []
  let i = 0
  while (i < rows.length) {
    const fromId = rows[i].fromId
    let j = i + 1
    while (j < rows.length && rows[j].fromId === fromId) j++
    groups.push({ rows: rows.slice(i, j) })
    i = j
  }
  return groups
})

const busy = ref(false)
const message = ref('')
const error = ref('')

const dialogOpen = ref(false)
const dialogMode = ref<'add' | 'edit' | 'delete' | 'edit-tier'>('add')
const dialogFromId = ref(0)
const dialogToId = ref(0)
const dialogAddTargetIds = ref<number[]>([])
/** 从表格行打开「新增对标库房」时，打开弹窗瞬间已绑定的目标 id（提交时只新增未绑定的项） */
const dialogAddInitialTargetIds = ref<number[]>([])
/** 「新增绑定」弹窗内：源库房 / 对标列表搜索关键词 */
const dialogAddFromSearch = ref('')
const dialogAddTargetSearch = ref('')
/** 编辑阶梯价差弹窗输入内容 */
const dialogTierText = ref('')
const editingRow = ref<LinkRow | null>(null)
/** 当前编辑行的唯一标识 fromId-toId，API 成功后精准替换该行 */
const editingRowKey = ref('')
/** 从表格「修改/删除」打开弹窗时，携带该源库房下的绑定行列表 */
const dialogEditGroup = ref<LinkRowGroup | null>(null)

/** 合并操作列：每个源库房选中的「要修改/删除」的目标库房 id（打开弹窗时沿用） */
const opTargetToIdByFromId = ref<Record<number, number>>({})

// ── 备注内联编辑 ──
const editingRemarkKey = ref('')
const editingRemarkText = ref('')

function startEditRemark(r: LinkRow) {
  editingRemarkKey.value = edgeKey(r)
  editingRemarkText.value = r.remark || ''
  // 等 DOM 更新后自动 focus textarea
  setTimeout(() => {
    const ta = document.querySelector<HTMLTextAreaElement>('.wdc-remark-textarea')
    ta?.focus()
  }, 0)
}

async function saveRemark(r: LinkRow) {
  const text = editingRemarkText.value.trim()
  const key = editingRemarkKey.value
  editingRemarkKey.value = ''
  const original = (r.remark || '').trim()
  // 未做任何更改，不调接口
  if (text === original) return
  const newVal = text || null
  const target = listRows.value.find((row) => edgeKey(row) === key)
  try {
    await putTlUpdateWarehouseLinkRemark({
      源库房id: r.fromId,
      对标库房id: r.toId,
      备注: newVal,
    })
    if (target) target.remark = text
    message.value = '备注已保存'
  } catch (e) {
    error.value = formatWdcLoadError(e)
    // 不影响编辑状态，下次点击再试
  }
}

function cancelEditRemark() {
  editingRemarkKey.value = ''
}

// ── AI分析弹窗 ──
const aiDetailRow = ref<LinkRow | null>(null)
const aiDetailOpen = ref(false)

function openAiDetail(r: LinkRow) {
  aiDetailRow.value = r
  aiDetailOpen.value = true
}

function closeAiDetail() {
  aiDetailOpen.value = false
  aiDetailRow.value = null
}

const dialogTitle = computed(() => {
  if (dialogMode.value === 'add') return '新增绑定'
  if (dialogMode.value === 'edit') return '修改绑定'
  if (dialogMode.value === 'edit-tier') return '编辑阶梯价差'
  return '删除绑定'
})

function getSelectedToIdForGroup(grp: LinkRowGroup): number {
  const fromId = grp.rows[0]?.fromId ?? 0
  if (!fromId || !grp.rows.length) return 0
  const stored = opTargetToIdByFromId.value[fromId]
  if (stored != null && grp.rows.some((r) => r.toId === stored)) return stored
  return grp.rows[0].toId
}

function pickRowByGroupSelection(grp: LinkRowGroup): LinkRow | null {
  if (!grp.rows.length) return null
  const toId = getSelectedToIdForGroup(grp)
  return grp.rows.find((r) => r.toId === toId) ?? grp.rows[0] ?? null
}

const addSelectedCount = computed(() => {
  const src = dialogFromId.value
  return new Set(dialogAddTargetIds.value.filter((id) => id > 0 && id !== src)).size
})

watch(
  () => dialogFromId.value,
  (id) => {
    if (dialogMode.value !== 'add') return
    dialogAddTargetIds.value = dialogAddTargetIds.value.filter((tid) => tid !== id)
  },
)

const dialogTargetOptions = computed(() =>
  warehouseOptions.value.filter((w) => w.id !== dialogFromId.value),
)

const dialogEditBoundOptions = computed((): WarehouseOption[] => {
  const seen = new Set<number>()
  const out: WarehouseOption[] = []
  for (const r of dialogEditGroup.value?.rows ?? []) {
    if (r.toId <= 0 || seen.has(r.toId)) continue
    seen.add(r.toId)
    out.push({ id: r.toId, name: r.toName })
  }
  return out
})

/** 源库房列表：按搜索词过滤；当前已选若不在过滤结果中仍保留在列表首条 */
const dialogFromSelectOptions = computed((): WarehouseOption[] => {
  const all = warehouseOptions.value
  const q = dialogAddFromSearch.value
  const filtered = all.filter((w) => warehouseMatchesQuery(w, q))
  const id = dialogFromId.value
  if (id > 0) {
    const sel = all.find((w) => w.id === id)
    if (sel && !filtered.some((w) => w.id === id)) return [sel, ...filtered]
  }
  return filtered
})

const dialogTargetOptionsFiltered = computed(() =>
  dialogTargetOptions.value.filter((w) => warehouseMatchesQuery(w, dialogAddTargetSearch.value)),
)

function pickAddDialogFromWarehouse(w: WarehouseOption) {
  dialogFromId.value = w.id
}

const dialogValid = computed(() => {
  if (dialogMode.value === 'add') {
    return dialogFromId.value > 0 && addSelectedCount.value > 0
  }
  if (dialogMode.value === 'edit') {
    if (!editingRow.value) return false
    return dialogToId.value > 0 && dialogToId.value !== editingRow.value.fromId
  }
  return false
})

const dialogValidDelete = computed(
  () => !!editingRow.value && !!(dialogEditGroup.value && dialogEditGroup.value.rows.length),
)

const dialogValidEditTier = computed(
  () =>
    !!editingRow.value &&
    editingRow.value.fromId > 0 &&
    editingRow.value.toId > 0 &&
    !!(dialogEditGroup.value && dialogEditGroup.value.rows.length),
)

function onModalGroupTargetChange(toId: number) {
  const grp = dialogEditGroup.value
  if (!grp) return
  const row = grp.rows.find((r) => r.toId === toId)
  if (!row) return
  editingRow.value = row
  dialogFromId.value = row.fromId
  dialogToId.value = row.toId
  opTargetToIdByFromId.value = { ...opTargetToIdByFromId.value, [row.fromId]: toId }
  if (dialogMode.value === 'edit-tier') {
    dialogTierText.value = row.tierPriceEditSeed
  }
}

function openEditModalFromGroup(grp: LinkRowGroup) {
  if (!grp.rows.length) return
  const row = pickRowByGroupSelection(grp)
  if (!row) return
  editingRowKey.value = edgeKey(row)
  dialogEditGroup.value = grp
  dialogMode.value = 'edit'
  editingRow.value = row
  dialogFromId.value = row.fromId
  dialogToId.value = row.toId
  dialogOpen.value = true
}

function openDeleteModalFromGroup(grp: LinkRowGroup) {
  if (!grp.rows.length) return
  const row = pickRowByGroupSelection(grp)
  if (!row) return
  editingRowKey.value = edgeKey(row)
  dialogEditGroup.value = grp
  dialogMode.value = 'delete'
  editingRow.value = row
  dialogOpen.value = true
}

function openEditTierModalFromGroup(grp: LinkRowGroup) {
  if (!grp.rows.length) return
  const row = pickRowByGroupSelection(grp)
  if (!row) return
  editingRowKey.value = edgeKey(row)
  dialogEditGroup.value = grp
  dialogMode.value = 'edit-tier'
  editingRow.value = row
  dialogTierText.value = row.tierPriceEditSeed
  dialogOpen.value = true
}

function pickNum(row: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

/** 解析阶梯价差：纯数字用 num 展示；JSON/其它字符串用 seed 原样编辑 */
function parseTierFields(row: Record<string, unknown>): { num: number | null; seed: string } {
  const keys = ['阶梯价差', 'ladder_price_diff', 'tier_price_diff', 'step_price_diff']
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, k)) continue
    const v = row[k]
    if (v === null || v === undefined) return { num: null, seed: '' }
    if (v === '') return { num: null, seed: '' }
    if (typeof v === 'number' && Number.isFinite(v)) return { num: v, seed: String(v) }
    if (typeof v === 'string') {
      const s = v.trim()
      if (s === '') return { num: null, seed: '' }
      const n = Number(s)
      if (Number.isFinite(n) && s === String(n)) return { num: n, seed: s }
      return { num: null, seed: s }
    }
    if (typeof v === 'object') {
      try {
        return { num: null, seed: JSON.stringify(v) }
      } catch {
        return { num: null, seed: '' }
      }
    }
  }
  return { num: null, seed: '' }
}

function warehouseNameById(id: number): string {
  return warehouseOptions.value.find((w) => w.id === id)?.name || `库房#${id}`
}

function asNestedRecord(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

/** 列表接口常把库房嵌在「源库房」「对标库房」等对象里；合并进缓存以便算距 */
function mergeWarehouseCoordsFromLinkRows(rows: Record<string, unknown>[]) {
  const map: Record<number, { lat: number; lng: number }> = { ...warehouseCoordById.value }
  const blobsKeys = ['源库房', '对标库房', 'from_warehouse', 'to_warehouse', 'source_warehouse', 'target_warehouse']
  for (const row of rows) {
    for (const k of blobsKeys) {
      const rec = asNestedRecord(row[k])
      if (!rec) continue
      const id = pickNum(rec, ['仓库id', '库房id', 'warehouse_id', 'id'])
      const c = pickWarehouseCoord(rec)
      if (id > 0 && c) map[id] = c
    }
  }
  warehouseCoordById.value = map
}

function pickWarehouseCoord(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const latKeys = ['latitude', 'lat', 'gcj02_lat', 'Latitude', 'LAT', 'y', '纬度']
  const lngKeys = ['longitude', 'lng', 'lon', 'gcj02_lng', 'Longitude', 'LNG', 'x', '经度']
  let lat: number | null = null
  let lng: number | null = null
  for (const k of latKeys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) {
      lat = v
      break
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) {
        lat = n
        break
      }
    }
  }
  for (const k of lngKeys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) {
      lng = v
      break
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) {
        lng = n
        break
      }
    }
  }
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function edgeKey(r: LinkRow): string {
  return `${r.fromId}-${r.toId}`
}

function distanceCellText(r: LinkRow): string {
  if (distanceStatus.value === 'loading') return '…'
  return distanceTextByEdgeKey.value[edgeKey(r)] ?? '—'
}

function tierPriceCellText(r: LinkRow): string {
  if (r.tierPriceDiff != null) {
    return r.tierPriceDiff.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
  }
  if (r.tierPriceEditSeed) return r.tierPriceEditSeed
  return '—'
}

async function loadDistancesForRows(rows: LinkRow[]) {
  if (!rows.length) {
    distanceTextByEdgeKey.value = {}
    distanceStatus.value = 'idle'
    return
  }
  distanceStatus.value = 'loading'
  const coords = warehouseCoordById.value
  const next: Record<string, string> = {}
  await Promise.all(
    rows.map(async (r) => {
      const key = edgeKey(r)
      const a = coords[r.fromId]
      const b = coords[r.toId]
      if (!a || !b) {
        next[key] = '缺坐标'
        return
      }
      try {
        const d = await fetchTlCalculateDistance(a.lng, a.lat, b.lng, b.lat, {
          fromWarehouseId: r.fromId,
          toWarehouseId: r.toId,
        })
        next[key] = `${d.distanceKm.toFixed(2)} km`
      } catch {
        next[key] = '计算失败'
      }
    }),
  )
  distanceTextByEdgeKey.value = next
  distanceStatus.value = 'done'
}

function toLinkRow(row: Record<string, unknown>): LinkRow {
  const srcObj =
    asNestedRecord(row['源库房']) ||
    asNestedRecord(row['from_warehouse']) ||
    asNestedRecord(row['source_warehouse'])
  const tgtObj =
    asNestedRecord(row['对标库房']) ||
    asNestedRecord(row['to_warehouse']) ||
    asNestedRecord(row['target_warehouse'])

  let fromId = pickNum(row, [
    'from_warehouse_id',
    '源库房id',
    '源仓库id',
    'source_warehouse_id',
    'from_id',
  ])
  if (!fromId && srcObj) {
    fromId = pickNum(srcObj, ['仓库id', '库房id', 'warehouse_id', 'id'])
  }

  let toId = pickNum(row, [
    'to_warehouse_id',
    '目标库房id',
    '对标库房id',
    '目标仓库id',
    '对标仓库id',
    'target_warehouse_id',
    'to_id',
    'target_id',
  ])
  if (!toId && tgtObj) {
    toId = pickNum(tgtObj, ['仓库id', '库房id', 'warehouse_id', 'id'])
  }

  let fromName = pickStr(row, ['from_warehouse_name', '源库房名', 'source_warehouse_name'])
  if (!fromName && srcObj) {
    fromName = pickStr(srcObj, ['仓库名', 'warehouse_name', 'name', '库房名'])
  }
  if (!fromName) fromName = warehouseNameById(fromId)
  fromName = warehouseDisplayName(fromName)

  let toName = pickStr(row, [
    'to_warehouse_name',
    '目标库房名',
    '对标库房名',
    'target_warehouse_name',
  ])
  if (!toName && tgtObj) {
    toName = pickStr(tgtObj, ['仓库名', 'warehouse_name', 'name', '库房名'])
  }
  if (!toName) toName = warehouseNameById(toId)
  toName = warehouseDisplayName(toName)

  const { num: tierPriceDiff, seed: tierPriceEditSeed } = parseTierFields(row)

  const linkId = pickNum(row, ['关联id', 'link_id', 'id'])

  const remark = pickStr(row, ['备注', 'remark'])
  const aiAnalysis = pickStr(row, ['AI分析', 'ai_analysis', 'aiAnalysis'])
  const lastAnalysisTime = pickStr(row, ['上次分析时间', 'last_analysis_time', 'lastAnalysisTime'])

  return {
    linkId, fromId, toId, fromName, toName,
    tierPriceDiff, tierPriceEditSeed,
    realTimeDiff: null,
    remark, aiAnalysis, lastAnalysisTime,
  }
}

async function loadWarehouses() {
  const rows = await fetchTlWarehousesAll()
  const coordMap: Record<number, { lat: number; lng: number }> = {}
  warehouseOptions.value = rows
    .map((r) => {
      const id = pickNum(r, ['仓库id', '库房id', 'warehouse_id', 'id'])
      const name =
        warehouseDisplayName(pickStr(r, ['仓库名', 'warehouse_name', 'name'])) || `库房#${id}`
      const c = pickWarehouseCoord(r)
      if (id > 0 && c) coordMap[id] = c
      return { id, name }
    })
    .filter((x) => x.id > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  warehouseCoordById.value = coordMap
}

async function fetchListPage(page: number) {
  console.trace('[fetchListPage] called, page=' + page)
  const r = await fetchTlWarehouseLinksListAll({
    from_warehouse_id: filterFromId.value > 0 ? filterFromId.value : undefined,
    to_warehouse_id: filterToId.value > 0 ? filterToId.value : undefined,
  })
  mergeWarehouseCoordsFromLinkRows(r.rows)
  listRows.value = r.rows.map(toLinkRow)
  // 确保 page 在有效范围内
  const maxPage = groupedAllPages.value.length
  listPage.value = page > maxPage ? maxPage : page
  await Promise.all([loadDistancesForRows(pageRows.value), loadRealtimeSpreads()])
}

async function loadRealtimeSpreads() {
  try {
    const items = await fetchTlRealtimeSpreadList({
      from_warehouse_id: filterFromId.value > 0 ? filterFromId.value : undefined,
      to_warehouse_id: filterToId.value > 0 ? filterToId.value : undefined,
      page: 1,
      size: 200,
    })
    console.log('[实时价差] 返回条数:', items.length, '首条:', items[0])
    const spreadMap: Record<string, string> = {}
    for (const item of items) {
      const o = item as Record<string, unknown>
      const fromId = Number(o['源库房id'] ?? 0)
      const toId = Number(o['对标库房id'] ?? 0)
      const spread = o['实时价差']
      console.log(`[实时价差] ${fromId}→${toId}:`, spread)
      if (fromId > 0 && toId > 0 && spread != null) {
        spreadMap[`${fromId}-${toId}`] = String(spread)
      }
    }
    console.log('[实时价差] spreadMap:', spreadMap)
    console.log('[实时价差] listRows keys:', listRows.value.map(r => `${r.fromId}-${r.toId}`))
    for (const row of listRows.value) {
      const key = `${row.fromId}-${row.toId}`
      if (spreadMap[key] != null) {
        row.realTimeDiff = spreadMap[key]
      }
    }
    console.log('[实时价差] 合并后:', listRows.value.map(r => ({ from: r.fromId, to: r.toId, spread: r.realTimeDiff })))
  } catch (e) {
    console.error('[实时价差] 加载失败:', e)
    /* 实时价差加载失败不影响主列表 */
  }
}

const WDC_LOAD_FAIL_HINT = '如果长时间未加载请检查网络或者刷新'

function formatWdcLoadError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const s = raw.trim()
  if (/failed to fetch/i.test(s)) return WDC_LOAD_FAIL_HINT
  if (/load failed/i.test(s)) return WDC_LOAD_FAIL_HINT
  if (/networkerror/i.test(s)) return WDC_LOAD_FAIL_HINT
  if (/net::err_/i.test(s)) return WDC_LOAD_FAIL_HINT
  if (/aborted|timeout|timed out|超时|连接.*拒绝|无法连接/i.test(s)) return WDC_LOAD_FAIL_HINT
  return raw
}

async function runAction(fn: () => Promise<void>, okText: string) {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await fn()
    if (okText) message.value = okText
  } catch (e) {
    error.value = formatWdcLoadError(e)
  } finally {
    busy.value = false
  }
}

function applyFilters() {
  runAction(async () => {
    await fetchListPage(1)
  }, '')
}

function refreshList() {
  runAction(async () => {
    await fetchListPage(listPage.value)
  }, '')
}

async function gotoPage(page: number) {
  if (page < 1 || page > listTotalPages.value) return
  await runAction(async () => {
    await fetchListPage(page)
  }, '')
}

function openAddDialog() {
  dialogMode.value = 'add'
  dialogEditGroup.value = null
  editingRow.value = null
  dialogFromId.value = 0
  dialogToId.value = 0
  dialogAddTargetIds.value = []
  dialogAddInitialTargetIds.value = []
  dialogAddFromSearch.value = ''
  dialogAddTargetSearch.value = ''
  error.value = ''
  dialogOpen.value = true
}

/** 以当前分组的源库房打开新增绑定，并对已绑定的对标库房预勾选 */
function openAddDialogFromGroup(grp: LinkRowGroup) {
  const first = grp.rows[0]
  if (!first || first.fromId <= 0) return
  dialogEditGroup.value = null
  dialogMode.value = 'add'
  editingRow.value = null
  dialogFromId.value = first.fromId
  dialogToId.value = 0
  const boundIds = [...new Set(grp.rows.map((r) => r.toId).filter((id) => id > 0 && id !== first.fromId))]
  dialogAddInitialTargetIds.value = boundIds
  dialogAddTargetIds.value = [...boundIds]
  dialogAddFromSearch.value = first.fromName
  dialogAddTargetSearch.value = ''
  error.value = ''
  dialogOpen.value = true
}

function closeDialog() {
  if (busy.value) return
  dialogOpen.value = false
  editingRow.value = null
  dialogEditGroup.value = null
  dialogAddTargetIds.value = []
  dialogAddInitialTargetIds.value = []
  dialogAddFromSearch.value = ''
  dialogAddTargetSearch.value = ''
  dialogTierText.value = ''
}

async function submitDialog() {
  console.log('[submitDialog] mode=', dialogMode.value, 'editingRowKey=', editingRowKey.value)
  if (dialogMode.value === 'delete') {
    if (!dialogValidDelete.value || !editingRow.value) return
    const row = editingRow.value
    const key = editingRowKey.value
    await runAction(async () => {
      await deleteTlUnbindWarehouseLink(row.fromId, row.toId)
    }, '已删除绑定')
    if (!error.value) {
      const idx = listRows.value.findIndex((r) => edgeKey(r) === key)
      if (idx !== -1) listRows.value.splice(idx, 1)
      closeDialog()
    }
    return
  }
  if (dialogMode.value === 'edit-tier') {
    if (!dialogValidEditTier.value || !editingRow.value) return
    const row = editingRow.value
    const raw = dialogTierText.value.trim()
    const key = editingRowKey.value
    await runAction(async () => {
      await putTlUpdateWarehouseLinkTier({
        关联id: row.linkId,
        源库房id: row.fromId,
        对标库房id: row.toId,
        阶梯价差: raw === '' ? null : raw,
      })
    }, '已保存')
    if (!error.value) {
      const target = listRows.value.find((r) => edgeKey(r) === key)
      console.log('[submitDialog] edit-tier local update, target found=', !!target, 'key=', key)
      if (target) {
        const parsed = raw === '' ? null : Number(raw)
        target.tierPriceDiff = raw === '' ? null : (Number.isFinite(parsed) ? parsed : null)
        target.tierPriceEditSeed = raw
      }
      closeDialog()
    }
    return
  }
  if (!dialogValid.value) return
  if (dialogMode.value === 'add') {
    const src = dialogFromId.value
    const targetIds = [...new Set(dialogAddTargetIds.value)].filter((id) => id > 0 && id !== src)
    if (!targetIds.length) return
    const initial = new Set(dialogAddInitialTargetIds.value)
    const newIds = targetIds.filter((id) => !initial.has(id))
    if (!newIds.length) {
      error.value = '请至少勾选一个尚未绑定的新对标库房'
      return
    }
    await runAction(async () => {
      await postTlBatchBindWarehouseLinks(src, newIds)
    }, `新增绑定成功（${newIds.length} 条）`)
    if (!error.value) {
      const fromName = warehouseDisplayName(warehouseNameById(src))
      for (const tid of newIds) {
        listRows.value.push({
          linkId: 0,
          fromId: src,
          toId: tid,
          fromName,
          toName: warehouseDisplayName(warehouseNameById(tid)),
          tierPriceDiff: null,
          tierPriceEditSeed: '',
          realTimeDiff: null,
          remark: '',
          aiAnalysis: '',
          lastAnalysisTime: '',
        })
      }
      closeDialog()
    }
    return
  }
  const row = editingRow.value
  if (!row) return
  const newTo = dialogToId.value
  if (newTo === row.toId) {
    closeDialog()
    return
  }
  const key = editingRowKey.value
  await runAction(async () => {
    await deleteTlUnbindWarehouseLink(row.fromId, row.toId)
    await postTlBindWarehouseLink(row.fromId, newTo)
  }, '修改绑定成功')
  if (!error.value) {
    const target = listRows.value.find((r) => edgeKey(r) === key)
    if (target) {
      target.toId = newTo
      target.toName = warehouseDisplayName(warehouseNameById(newTo))
      target.tierPriceDiff = null
      target.tierPriceEditSeed = ''
      target.realTimeDiff = null
      target.remark = ''
      target.aiAnalysis = ''
      target.lastAnalysisTime = ''
    }
    closeDialog()
  }
}

onMounted(async () => {
  await runAction(async () => {
    await loadWarehouses()
    await fetchListPage(1)
  }, '')
  message.value = ''
})
</script>

<style scoped>
.wdc-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: fadeIn 0.25s ease both;
}

.wdc-head h2 {
  margin: 0;
  font-size: 22px;
  color: #111827;
}

.wdc-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.wdc-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  animation: fadeInUp 0.3s ease both;
}

.wdc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wdc-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.wdc-filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}

.wdc-filter-field label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.wdc-select {
  height: 38px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 0 10px;
  background: #fff;
  font-size: 13px;
}

.wdc-search {
  height: 36px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 0 10px;
  background: #fff;
  font-size: 13px;
  box-sizing: border-box;
  width: 100%;
}

.wdc-search::placeholder {
  color: #94a3b8;
}

.wdc-from-picker {
  max-height: 220px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.wdc-from-option {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.35;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  color: #1e293b;
  cursor: pointer;
  font-family: inherit;
}

.wdc-from-option:last-of-type {
  border-bottom: none;
}

.wdc-from-option:hover {
  background: #f8fafc;
}

.wdc-from-option--selected {
  background: #eff6ff;
  box-shadow: inset 3px 0 0 0 #2563eb;
}

.wdc-from-option--selected:hover {
  background: #dbeafe;
}

.wdc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wdc-msg {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 13px;
}

.wdc-err {
  margin: 0 0 8px;
  color: #b91c1c;
  font-size: 13px;
  white-space: pre-wrap;
}

.wdc-table-wrap {
  overflow-x: auto;
}

.wdc-table {
  width: 100%;
  border-collapse: collapse;
}

.wdc-table th,
.wdc-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  font-size: 13px;
  text-align: left;
  vertical-align: middle;
}

.wdc-table tbody tr {
  transition: background 0.15s ease;
}

.wdc-table tbody tr:hover {
  background: #f0f7ff;
}

.wdc-td-source {
  vertical-align: middle;
  background: #f8fafc;
  font-weight: 600;
  color: #1e293b;
}

.wdc-td-distance {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: #334155;
}

.wdc-td-tier {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: #334155;
}

.wdc-td-freight {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: #334155;
}

.wdc-td-ops {
  vertical-align: top;
  background: #fafafa;
}

.wdc-ops-merge {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 200px;
}

.wdc-ops-buttons-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.wdc-col-actions {
  white-space: normal;
}

.wdc-col-actions .btn {
  margin-right: 6px;
}

.wdc-col-actions .btn:last-child {
  margin-right: 0;
}

.wdc-pager {
  margin-top: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: #475569;
}

.wdc-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  animation: fadeIn 0.2s ease both;
}

.wdc-modal {
  background: #fff;
  border-radius: 12px;
  max-width: 560px;
  width: 100%;
  padding: 18px 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  animation: scaleIn 0.25s ease both;
}

.wdc-modal-title {
  margin: 0 0 14px;
  font-size: 17px;
  color: #111827;
}

.wdc-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wdc-modal-readonly {
  margin: 0;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.5;
}

.wdc-muted {
  color: #64748b;
}

.wdc-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wdc-row label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.wdc-modal-footer {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.wdc-modal-chips {
  max-height: 220px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.wdc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f8fafc;
  cursor: pointer;
}

.wdc-hint {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.wdc-hint-inline {
  width: 100%;
  flex-basis: 100%;
  text-align: center;
  padding: 12px 4px;
}

.wdc-textarea {
  width: 100%;
  min-height: 72px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

/* ── 备注 & AI分析列 ── */
.wdc-col-remark {
  min-width: 140px;
  width: 18%;
}

.wdc-col-ai {
  min-width: 160px;
  width: 22%;
}

.wdc-td-remark {
  cursor: pointer;
  transition: background 0.15s ease;
}

.wdc-td-remark:hover {
  background: #f8fafc;
}

.wdc-remark-text {
  display: block;
  color: #1e293b;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.wdc-remark-placeholder {
  color: #94a3b8;
  font-style: italic;
}

.wdc-remark-textarea {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #3b82f6;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.wdc-td-ai {
  cursor: pointer;
  max-width: 200px;
  transition: background 0.15s ease;
}

.wdc-td-ai:hover {
  background: #f1f5f9;
}

.wdc-ai-preview {
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.wdc-ai-detail-content {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.wdc-ai-modal {
  max-width: 520px;
}
</style>
