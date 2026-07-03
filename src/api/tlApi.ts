import { fetchJson } from './userApi'

function unwrapList(data: unknown): Record<string, unknown>[] {
  if (data == null) return []
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  if (Array.isArray(o.data)) return o.data as Record<string, unknown>[]
  if (Array.isArray(o.list)) return o.list as Record<string, unknown>[]
  if (Array.isArray(o.items)) return o.items as Record<string, unknown>[]
  if (Array.isArray(o.records)) return o.records as Record<string, unknown>[]
  if (Array.isArray(o.rows)) return o.rows as Record<string, unknown>[]
  if (o.data != null && typeof o.data === 'object') return unwrapList(o.data)
  return []
}

function unwrapData(data: unknown): unknown {
  if (data == null || typeof data !== 'object') return data
  const o = data as Record<string, unknown>
  if ('data' in o) return o.data
  return data
}

function authHeaders(): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('api_token') : null
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/** TL 通用 POST JSON（库房/冶炼厂更新等） */
export async function tlPostJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  const url = path.startsWith('/') ? path : `/${path}`
  const { res, data } = await fetchJson(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    } as HeadersInit,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const bodyMsg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : ''
    const detail = [bodyMsg, res.statusText].filter(Boolean).join(' — ') || `HTTP ${res.status}`
    throw new Error(`${path} 返回 ${res.status}（${detail}）`)
  }
  return data
}

export async function tlGetJson(path: string): Promise<unknown> {
  const url = path.startsWith('/') ? path : `/${path}`
  const { res, data } = await fetchJson(url, {
    method: 'GET',
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const bodyMsg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : ''
    const detail = [bodyMsg, res.statusText].filter(Boolean).join(' — ') || `HTTP ${res.status}`
    throw new Error(
      `${path} 返回 ${res.status}（${detail}）。开发环境请检查 Vite 代理目标 VITE_TL_TARGET / VITE_API_TARGET 对应服务是否正常；502 多为上游网关或服务不可用。`,
    )
  }
  return data
}

export async function fetchTlWarehouses(): Promise<Record<string, unknown>[]> {
  const raw = await tlGetJson('/tl/get_warehouses')
  return unwrapList(raw)
}

/** TL 列表类接口：校验业务 code（与 /tl 返回体一致） */
function assertTlBizCode200(raw: unknown, ctx: string): void {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { code?: number; message?: string }
    if (o.code != null && o.code !== 200) {
      const msg = o.message ? String(o.message) : `code ${o.code}`
      throw new Error(`${ctx}：${msg}`)
    }
  }
}

/**
 * 从 get_warehouses / get_smelters 等响应中取出本页行。
 * 分页时 `data` 常见 `{ list|items|records, total|count|totalCount }`；也可能直接为数组。
 */
function pickTotalFromPayload(d: Record<string, unknown>): number | undefined {
  const keys = ['total', 'count', 'totalCount', 'total_count', 'Total']
  for (const k of keys) {
    const v = d[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function extractTlListPayload(raw: unknown): { rows: Record<string, unknown>[]; total?: number } {
  const data = unwrapData(raw)
  if (Array.isArray(data)) {
    return {
      rows: data.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object'),
    }
  }
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    const listRaw = d.list ?? d.items ?? d.records ?? d.rows
    if (Array.isArray(listRaw)) {
      const rows = listRaw.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      return { rows, total: pickTotalFromPayload(d) }
    }
  }
  return { rows: unwrapList(raw) }
}

/** 库房/冶炼厂分页：每页条数（你方要求 200；若后端限制 size，可改为 100） */
const TL_LIST_PAGE_SIZE = 200

/**
 * 拉齐列表全部分页后再返回（地图等场景一次性打点）。
 * 从第 1 页起固定带 `page`、`size`，避免服务端默认 pageSize 小于本常量时只拉到第一页。
 */
async function fetchTlListAll(
  pathNoQuery: string,
  ctx: string,
): Promise<Record<string, unknown>[]> {
  const pageSize = TL_LIST_PAGE_SIZE
  const sep = pathNoQuery.includes('?') ? '&' : '?'

  const raw0 = await tlGetJson(`${pathNoQuery}${sep}page=1&size=${pageSize}`)
  assertTlBizCode200(raw0, ctx)
  const data0 = unwrapData(raw0)
  if (Array.isArray(data0)) {
    return data0.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
  }

  const first = extractTlListPayload(raw0)
  const all: Record<string, unknown>[] = [...first.rows]
  let total = first.total
  let page = 2

  if (first.rows.length === 0) {
    return all
  }
  if (total != null && all.length >= total) {
    return all
  }
  if (first.rows.length < pageSize) {
    return all
  }

  while (page <= 500) {
    const raw = await tlGetJson(`${pathNoQuery}${sep}page=${page}&size=${pageSize}`)
    assertTlBizCode200(raw, ctx)
    const dataLoop = unwrapData(raw)
    if (Array.isArray(dataLoop)) {
      all.push(
        ...dataLoop.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object'),
      )
      break
    }
    const { rows, total: t2 } = extractTlListPayload(raw)
    if (t2 != null) total = t2
    all.push(...rows)
    if (rows.length === 0) break
    if (total != null && all.length >= total) break
    if (rows.length < pageSize) break
    page += 1
  }

  return all
}

/** 仓库全量（分页拉齐，地图打点）。GET /tl/get_warehouses；与单页 `fetchTlWarehouses` 同源。 */
export async function fetchTlWarehousesAll(): Promise<Record<string, unknown>[]> {
  return fetchTlListAll('/tl/get_warehouses', '仓库列表')
}

/** 冶炼厂全量（地图打点）；逻辑同仓库：先无参，再 page/size 直至取完 */
export async function fetchTlSmeltersAll(): Promise<Record<string, unknown>[]> {
  return fetchTlListAll('/tl/get_smelters', '冶炼厂列表')
}

export async function fetchTlSmelters(): Promise<Record<string, unknown>[]> {
  const raw = await tlGetJson('/tl/get_smelters')
  return unwrapList(raw)
}

export interface TriggerDailyAiPredictionResult {
  taskId: string
  batchId: string
  status: string
  message: string
}

export interface DailyAiPredictionStatusResult {
  batchId: string
  status: string
  resultCount: number
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

function asRecord(data: unknown): Record<string, unknown> {
  return data != null && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {}
}

export async function triggerDailyAiPrediction(): Promise<TriggerDailyAiPredictionResult> {
  const raw = await tlPostJson('/tl/trigger_daily_ai_prediction', {})
  assertTlBizCode200(raw, '启动今日AI预测')
  const data = asRecord(unwrapData(raw))
  const batchId = String(data.batch_id ?? '')
  if (!batchId) throw new Error('启动今日AI预测失败：后端未返回 batch_id')
  return {
    taskId: String(data.task_id ?? ''),
    batchId,
    status: String(data.status ?? 'pending'),
    message: String(data.message ?? '任务已提交，正在后台执行'),
  }
}

export async function fetchDailyAiPredictionStatus(batchId: string): Promise<DailyAiPredictionStatusResult> {
  const raw = await tlGetJson(`/tl/daily_ai_prediction_status/${encodeURIComponent(batchId)}`)
  assertTlBizCode200(raw, '查询今日AI预测状态')
  const data = asRecord(unwrapData(raw))
  return {
    batchId: String(data.batch_id ?? batchId),
    status: String(data.status ?? ''),
    resultCount: Number(data.result_count ?? 0),
    errorMessage: data.error_message == null ? null : String(data.error_message),
    createdAt: String(data.created_at ?? ''),
    completedAt: data.completed_at == null ? null : String(data.completed_at),
  }
}

export async function searchTlWarehouses(query: string, page = 1, size = 20): Promise<Record<string, unknown>[]> {
  const q = new URLSearchParams({ keyword: query, page: String(page), size: String(size) })
  const raw = await tlGetJson(`/tl/get_warehouses?${q.toString()}`)
  return unwrapList(raw)
}

/** 用于库房列表「颜色」与地图打点配色（类型 id → 颜色配置） */
export async function fetchTlWarehouseTypes(includeInactive = false): Promise<Record<string, unknown>[]> {
  const q = includeInactive ? 'true' : 'false'
  const raw = await tlGetJson(`/tl/get_warehouse_types?include_inactive=${q}`)
  return unwrapList(raw)
}

// ── 冶炼厂类型字典维护（与库房类型模式一致） ──

/** 查询冶炼厂类型列表 GET /tl/get_factory_types */
export async function fetchTlFactoryTypes(includeInactive = false): Promise<Record<string, unknown>[]> {
  const q = includeInactive ? 'true' : 'false'
  const raw = await tlGetJson(`/tl/get_factory_types?include_inactive=${q}`)
  return unwrapList(raw)
}

/** 新增冶炼厂类型 POST /tl/add_factory_type */
export async function addTlFactoryType(body: {
  类型名: string
  颜色配置?: { marker: string } | null
}): Promise<unknown> {
  return tlPostJson('/tl/add_factory_type', body as unknown as Record<string, unknown>)
}

/** 修改冶炼厂类型 POST /tl/update_factory_type */
export async function updateTlFactoryType(body: {
  类型id: number
  类型名?: string
  颜色配置?: { marker: string } | null
  is_active?: boolean
}): Promise<unknown> {
  return tlPostJson('/tl/update_factory_type', body as unknown as Record<string, unknown>)
}

/** 删除冶炼厂类型（软删除） DELETE /tl/delete_factory_type?type_id=... */
export async function deleteTlFactoryType(typeId: number): Promise<unknown> {
  return tlDeleteJson(`/tl/delete_factory_type?type_id=${typeId}`)
}

/** `不含循融宝` / `含循融宝`：与明细顶层价税块同构；运费与顶层一致 */
export type TlXunRongBaoPriceBranch = {
  单价: number | null
  总价: number | null
  运费单价: number
  运费: number
  总运费: number
  报价: number | null
  报价金额: number | null
  报价来源: string
  基准价: number | null
  '含1%税价': number | null
  '含3%税价': number | null
  利润: number
  利润_基准: number | null
  '利润_含3%': number | null
  最优价各口径利润: Record<string, number | null>
}

/**
 * 智能比价 `data[]` 单行（仓库×冶炼厂×品类）。
 * 顶层价税利润仍为含循融宝口径；对比含/不含时读 `不含循融宝` / `含循融宝`（仅当 `冶炼厂循融宝发货 === 1`）。
 */
export type TlComparisonDetailRow = Record<string, unknown> & {
  冶炼厂循融宝发货?: 0 | 1
  循融宝加价元每吨?: number | null
  不含循融宝?: TlXunRongBaoPriceBranch | null
  含循融宝?: TlXunRongBaoPriceBranch | null
}

/** `POST /tl/get_comparison` 成功响应常见形状；无数据时 `data` / `冶炼厂利润排行` 可能为 `[]` */
export type TlGetComparisonResponse = Record<string, unknown> & {
  code?: number
  message?: string
  data?: TlComparisonDetailRow[]
  冶炼厂利润排行?: unknown[]
  最优价排序口径?: string
}

/** POST /tl/get_comparison，请求体字段为英文 snake_case（与后端约定一致） */
export async function fetchTlComparison(body: Record<string, unknown>): Promise<TlComparisonDetailRow[]> {
  const raw = await tlPostJson('/tl/get_comparison', body)
  return unwrapList(unwrapData(raw)) as TlComparisonDetailRow[]
}

/**
 * 智能比价完整响应（含 `冶炼厂利润排行`、`最优价排序口径`、明细循融宝字段等），与嵌入页 `price_system` 一致校验 `code===200`。
 */
export async function postTlGetComparison(body: Record<string, unknown>): Promise<TlGetComparisonResponse> {
  const raw = await tlPostJson('/tl/get_comparison', body)
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { code?: number; message?: string }
    if (o.code != null && o.code !== 200) {
      const msg = o.message ? String(o.message) : `业务码 ${o.code}`
      throw new Error(`比价失败：${msg}`)
    }
    return raw as TlGetComparisonResponse
  }
  return { data: raw } as TlGetComparisonResponse
}

/** 从比价响应中取出明细行（`data` / `list` 等，与 unwrapList 一致） */
export function tlUnwrapComparisonDetails(raw: Record<string, unknown>): TlComparisonDetailRow[] {
  return unwrapList(unwrapData(raw)) as TlComparisonDetailRow[]
}

/** 品类列表（GET /tl/get_categories）；兼容后端英文字段与历史中文字段 */
export type TlCategoryRow = {
  id: number
  name: string
}

export async function fetchTlCategories(): Promise<TlCategoryRow[]> {
  const raw = await tlGetJson('/tl/get_categories')
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { code?: number; message?: string }
    if (o.code != null && o.code !== 200) {
      const msg = o.message ? String(o.message) : `code ${o.code}`
      throw new Error(`获取品类列表失败：${msg}`)
    }
  }
  const list = unwrapList(raw)
  return list
    .map((row) => {
      const id = row['category_id'] ?? row['品类id'] ?? row['id']
      const name = row['category_name'] ?? row['品类名'] ?? row['name'] ?? row['品类名称']
      const nid = id != null && id !== '' ? Number(id) : NaN
      const nname = name != null ? String(name).trim() : ''
      return { id: nid, name: nname }
    })
    .filter((x) => !Number.isNaN(x.id) && x.name !== '')
}

/** 报价明细行 */
export type TlQuoteDetailRow = {
  id: number
  date: string
  smelterId: number
  smelter: string
  category: string
  basePrice: number
  price1pctVat: number
  price3pctVat: number
  price13pctVat: number
}

/** GET /tl/get_quote_details_list — 报价查询 */
export async function fetchQuoteDetailsList(params: {
  factory_id?: number
  start_date?: string
  end_date?: string
  category_id?: number
  category_name?: string
  page?: number
  page_size?: number
}): Promise<TlQuoteDetailRow[]> {
  const q = new URLSearchParams()
  if (params.factory_id) q.set('factory_id', String(params.factory_id))
  if (params.start_date) q.set('start_date', params.start_date)
  if (params.end_date) q.set('end_date', params.end_date)
  if (params.category_id) {
    q.set('品类id', String(params.category_id))
    q.set('category_id', String(params.category_id))
  }
  if (params.category_name) q.set('category_name', params.category_name)
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.page_size ?? 500))

  const raw = await tlGetJson(`/tl/get_quote_details_list?${q.toString()}`)
  const list = unwrapList(raw)
  return list.map((r) => ({
    id: Number(r.id ?? 0),
    date: String(r['报价日期'] ?? ''),
    smelterId: Number(r['冶炼厂id'] ?? 0),
    smelter: String(r['冶炼厂'] ?? ''),
    category: String(r['品类名'] ?? ''),
    basePrice: Number(r['普通价'] ?? 0),
    price1pctVat: Number(r['价格_1pct增值税'] ?? 0),
    price3pctVat: Number(r['价格_3pct增值税'] ?? 0),
    price13pctVat: Number(r['价格_13pct增值税'] ?? 0),
  }))
}

/** 品类映射（GET /tl/get_category_mapping）；取每个品类的品类名称[0] 作为主名称 */
export async function fetchCategoryMapping(): Promise<TlCategoryRow[]> {
  const raw = await tlGetJson('/tl/get_category_mapping')
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { code?: number; message?: string }
    if (o.code != null && o.code !== 200) {
      const msg = o.message ? String(o.message) : `code ${o.code}`
      throw new Error(`获取品类映射失败：${msg}`)
    }
  }
  const list = unwrapList(raw)
  return list
    .map((row) => {
      const id = row['品类id'] ?? row['category_id'] ?? row['id']
      const rawNames = row['品类名称']
      const firstName = Array.isArray(rawNames) && rawNames.length > 0 ? String(rawNames[0]).trim() : ''
      const nid = id != null && id !== '' ? Number(id) : NaN
      return { id: nid, name: firstName }
    })
    .filter((x) => !Number.isNaN(x.id) && x.name !== '')
}

export async function fetchForecastDetail(
  params: Record<string, string | number | Array<string | number>>,
): Promise<Record<string, unknown>[]> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item))
      continue
    }
    search.append(key, String(value))
  }
  const query = search.toString()
  const path = `/forecast/details${query ? `?${query}` : ''}`
  const raw = await tlGetJson(path)
  const data = unwrapData(raw)
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return ((data as { items: unknown[] }).items || []).filter(
      (x): x is Record<string, unknown> => !!x && typeof x === 'object',
    )
  }
  return unwrapList(data)
}

export async function tlPutJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  const url = path.startsWith('/') ? path : `/${path}`
  const { res, data } = await fetchJson(url, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    } as HeadersInit,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const bodyMsg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : ''
    const detail = [bodyMsg, res.statusText].filter(Boolean).join(' — ') || `HTTP ${res.status}`
    throw new Error(`${path} 返回 ${res.status}（${detail}）`)
  }
  return data
}

export async function tlDeleteJson(pathWithQuery: string): Promise<unknown> {
  const url = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`
  const { res, data } = await fetchJson(url, { method: 'DELETE', headers: { ...authHeaders() } })
  if (!res.ok) {
    const bodyMsg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message?: unknown }).message)
        : ''
    const detail = [bodyMsg, res.statusText].filter(Boolean).join(' — ') || `HTTP ${res.status}`
    throw new Error(
      `${pathWithQuery} 返回 ${res.status}（${detail}）。开发环境请检查 /tl 代理与上游服务。`,
    )
  }
  return data
}

/**
 * GET /tl/get_warehouse_links_outbound
 * 标准 query：`warehouse_id`（必填）、可选 `page`/`size`。
 * 仍尝试旧版 `源库房id`、`from_warehouse_id` 以兼容老服务。
 */
export async function fetchTlWarehouseLinksOutbound(
  fromWarehouseId: number,
): Promise<Record<string, unknown>[]> {
  const id = fromWarehouseId
  const noPagePaths = [
    `/tl/get_warehouse_links_outbound?warehouse_id=${id}`,
    `/tl/get_warehouse_links_outbound?${encodeURIComponent('源库房id')}=${id}`,
    `/tl/get_warehouse_links_outbound?from_warehouse_id=${id}`,
  ]
  let last: unknown
  for (const p of noPagePaths) {
    try {
      const raw = await tlGetJson(p)
      assertTlBizCode200(raw, '库房出边')
      return extractTlListPayload(raw).rows
    } catch (e) {
      last = e
    }
  }
  for (const p of noPagePaths) {
    try {
      return await fetchTlListAll(p, '库房出边')
    } catch (e) {
      last = e
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

export async function putTlReplaceWarehouseLinksOutbound(
  源库房id: number,
  目标库房id列表: number[],
): Promise<unknown> {
  const raw = await tlPutJson('/tl/replace_warehouse_links_outbound', { 源库房id, 目标库房id列表 })
  assertTlBizCode200(raw, '替换出边')
  return raw
}

/**
 * PUT /tl/update_warehouse_link_tier
 * 修改源库房→对标库房边上的阶梯价差；阶梯价差传 null 表示清空。
 */
export async function putTlUpdateWarehouseLinkTier(payload: {
  关联id: number
  源库房id: number
  对标库房id: number
  阶梯价差: string | null
}): Promise<unknown> {
  const raw = await tlPutJson('/tl/update_warehouse_link_tier', {
    关联id: payload.关联id,
    源库房id: payload.源库房id,
    对标库房id: payload.对标库房id,
    阶梯价差: payload.阶梯价差,
  })
  assertTlBizCode200(raw, '修改阶梯价差')
  return raw
}

export async function postTlBindWarehouseLink(源库房id: number, 目标库房id: number): Promise<unknown> {
  const raw = await tlPostJson('/tl/bind_warehouse_link', { 源库房id, 目标库房id })
  assertTlBizCode200(raw, '绑定出边')
  return raw
}

export async function postTlBatchBindWarehouseLinks(
  源库房id: number,
  目标库房id列表: number[],
): Promise<unknown> {
  const raw = await tlPostJson('/tl/batch_bind_warehouse_links', { 源库房id, 目标库房id列表 })
  assertTlBizCode200(raw, '批量绑定出边')
  return raw
}

export async function deleteTlUnbindWarehouseLink(
  fromWarehouseId: number,
  toWarehouseId: number,
): Promise<unknown> {
  const q = `from_warehouse_id=${fromWarehouseId}&to_warehouse_id=${toWarehouseId}`
  const raw = await tlDeleteJson(`/tl/unbind_warehouse_link?${q}`)
  assertTlBizCode200(raw, '解绑出边')
  return raw
}

export async function postTlBatchUnbindWarehouseLinks(
  源库房id: number,
  目标库房id列表: number[],
): Promise<unknown> {
  const raw = await tlPostJson('/tl/batch_unbind_warehouse_links', { 源库房id, 目标库房id列表 })
  assertTlBizCode200(raw, '批量解绑出边')
  return raw
}

function buildQueryString(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    const sv = String(v).trim()
    if (!sv) continue
    sp.set(k, sv)
  }
  return sp.toString()
}

/**
 * GET /tl/get_warehouse_links_inbound
 * 返回指向该库房的全部入边。
 */
export async function fetchTlWarehouseLinksInbound(
  warehouseId: number,
): Promise<Record<string, unknown>[]> {
  const q = buildQueryString({ warehouse_id: warehouseId })
  const raw = await tlGetJson(`/tl/get_warehouse_links_inbound?${q}`)
  assertTlBizCode200(raw, '库房入边')
  return extractTlListPayload(raw).rows
}

export type TlWarehouseLinksListParams = {
  page?: number
  size?: number
  warehouse_id?: number
  from_warehouse_id?: number
  to_warehouse_id?: number
}

/**
 * GET /tl/get_warehouse_links_list
 * 全部有向边分页列表，可按源/目标/任意库房过滤。
 */
export async function fetchTlWarehouseLinksList(
  params: TlWarehouseLinksListParams = {},
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const page = Number.isFinite(params.page) && (params.page as number) > 0 ? (params.page as number) : 1
  const size = Number.isFinite(params.size) && (params.size as number) > 0 ? (params.size as number) : 50
  const q = buildQueryString({
    page,
    size,
    warehouse_id: params.warehouse_id,
    from_warehouse_id: params.from_warehouse_id,
    to_warehouse_id: params.to_warehouse_id,
  })
  const raw = await tlGetJson(`/tl/get_warehouse_links_list?${q}`)
  assertTlBizCode200(raw, '库房关联列表')
  const parsed = extractTlListPayload(raw)
  return {
    rows: parsed.rows,
    total: parsed.total ?? parsed.rows.length,
  }
}

/**
 * 一次性拉取全部库房关联列表（分页拉齐）。
 * 用于客户端按源库房分组分页，避免同一源库房的多条记录被拆到两页。
 */
export async function fetchTlWarehouseLinksListAll(
  params: Omit<TlWarehouseLinksListParams, 'page' | 'size'> = {},
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const q = buildQueryString({
    warehouse_id: params.warehouse_id,
    from_warehouse_id: params.from_warehouse_id,
    to_warehouse_id: params.to_warehouse_id,
  })
  const path = `/tl/get_warehouse_links_list${q ? `?${q}` : ''}`
  const rows = await fetchTlListAll(path, '库房关联列表')
  return { rows, total: rows.length }
}

/**
 * GET /tl/calculate_distance
 * Haversine 球面直线距离（WGS84），单位见返回字段。
 * 部分环境要求 query 带 warehouse_id（及可选 to_warehouse_id）做校验或审计。
 */
export async function fetchTlCalculateDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
  options?: {
    fromWarehouseId?: number
    toWarehouseId?: number
  },
): Promise<{ distanceKm: number; distanceM?: number }> {
  const q = new URLSearchParams({
    lng1: String(lng1),
    lat1: String(lat1),
    lng2: String(lng2),
    lat2: String(lat2),
  })
  const fromId = options?.fromWarehouseId
  const toId = options?.toWarehouseId
  const fromOk = fromId != null && Number.isFinite(fromId) && fromId > 0
  const toOk = toId != null && Number.isFinite(toId) && toId > 0
  /** 后端常要求 query 必带 warehouse_id；源 id 解析失败时至少用目标 id 满足校验 */
  if (fromOk) {
    q.set('warehouse_id', String(fromId))
  } else if (toOk) {
    q.set('warehouse_id', String(toId))
  }
  if (fromOk && toOk && toId !== fromId) {
    q.set('to_warehouse_id', String(toId))
  }
  const raw = await tlGetJson(`/tl/calculate_distance?${q.toString()}`)
  assertTlBizCode200(raw, '距离计算')
  const data = unwrapData(raw)
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('距离计算：响应 data 无效')
  }
  const o = data as Record<string, unknown>
  const kmRaw = o.distance_km ?? o.distanceKm
  const mRaw = o.distance_m ?? o.distanceM
  const distanceKm = typeof kmRaw === 'number' ? kmRaw : Number(kmRaw)
  if (!Number.isFinite(distanceKm)) {
    throw new Error('距离计算：缺少有效的 distance_km')
  }
  const distanceM =
    mRaw != null && Number.isFinite(Number(mRaw)) ? Number(mRaw) : undefined
  return { distanceKm, distanceM }
}

/** GET /vertical-warehouse-ai/analysis?warehouse_id= — 库房自有定价 AI 分析 */
export async function fetchWarehouseAiAnalysis(warehouseId: number): Promise<Record<string, unknown>> {
  const raw = await tlGetJson(`/vertical-warehouse-ai/analysis?warehouse_id=${warehouseId}`)
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return { data: raw }
}

/** GET /tl/get_link_realtime_spread_list — 获取库房关联实时价差 */
export async function fetchTlRealtimeSpreadList(params?: {
  warehouse_id?: number
  from_warehouse_id?: number
  to_warehouse_id?: number
  page?: number
  size?: number
}): Promise<Record<string, unknown>[]> {
  const q = buildQueryString({
    page: params?.page ?? 1,
    size: params?.size ?? 200,
    warehouse_id: params?.warehouse_id,
    from_warehouse_id: params?.from_warehouse_id,
    to_warehouse_id: params?.to_warehouse_id,
  })
  const raw = await tlGetJson(`/tl/get_link_realtime_spread_list?${q}`)
  assertTlBizCode200(raw, '实时价差')
  return unwrapList(raw)
}
