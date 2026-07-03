/**
 * 门户主导航 + 嵌入「AI 比价系统」内常见子模块，用于权限字段定义 seed。
 * field_name 须匹配后端：`^perm_[a-z][a-z0-9_]*$`，故统一为 `perm_nav_{大类key}_{英文段}`。
 * 分配权限弹窗按大类归类为 5 个「大 tab」。
 *
 * CLI 批量写入后端：在项目根执行 `npm run seed:permissions`（须设置 PERMISSION_SEED_TOKEN），
 * 清单与本文件 `NAV_PERMISSION_SEED` 保持同步，脚本路径：`scripts/seed-nav-permissions.mjs`。
 */
export type NavPermissionSeedRow = {
  /** 大类 key，须与 NAV_CATEGORY_META 一致 */
  category: NavCategoryKey
  /** 展示名称（写入接口 label） */
  label: string
  /** 稳定字段名，POST 定义用 */
  field_name: string
}

export const NAV_CATEGORY_KEYS = [
  'map_supply',
  'ai_prediction',
  'ai_security',
  'ai_price',
  'ai_pricing',
  'system_account',
] as const

export type NavCategoryKey = (typeof NAV_CATEGORY_KEYS)[number]

export const NAV_CATEGORY_META: Record<
  NavCategoryKey,
  { title: string; order: number }
> = {
  map_supply: { title: '地图与供应链', order: 1 },
  ai_prediction: { title: 'AI 预测', order: 2 },
  ai_security: { title: 'AI 检测与安全', order: 3 },
  ai_price: { title: 'AI 比价系统', order: 4 },
  ai_pricing: { title: 'AI 定价', order: 5 },
  system_account: { title: '系统与账号', order: 6 },
}

/** 与主站 App.vue / 嵌入页能力对齐的小 tab 清单 */
export const NAV_PERMISSION_SEED: NavPermissionSeedRow[] = [
  { category: 'map_supply', label: '电子地图', field_name: 'perm_nav_map_supply_electronic_map' },
  {
    category: 'map_supply',
    label: '库房距离监测配置',
    field_name: 'perm_nav_map_supply_warehouse_distance_config',
  },

  { category: 'ai_prediction', label: 'AI 预测', field_name: 'perm_nav_ai_prediction' },
  { category: 'ai_prediction', label: '历史数据管理', field_name: 'perm_nav_ai_prediction_history_manage' },
  { category: 'ai_prediction', label: '历史数据查询', field_name: 'perm_nav_ai_prediction_history_query' },
  { category: 'ai_prediction', label: '送货量预测', field_name: 'perm_nav_ai_prediction_forecast' },
  { category: 'ai_prediction', label: '铅价格查询', field_name: 'perm_nav_ai_prediction_lead_price_query' },
  { category: 'ai_prediction', label: '冶炼厂价格查询', field_name: 'perm_nav_ai_prediction_smelter_price_query' },

  { category: 'ai_security', label: '图片真伪检查', field_name: 'perm_nav_ai_security_image_detect' },

  // AI 比价系统（嵌入页内模块/常用入口）
  { category: 'ai_price', label: 'AI 比价系统', field_name: 'perm_nav_ai_price' },
  { category: 'ai_price', label: '智能比价', field_name: 'perm_nav_ai_price_smart_compare' },
  { category: 'ai_price', label: '比价与决策', field_name: 'perm_nav_ai_price_compare_decision' },
  { category: 'ai_price', label: '后台配置', field_name: 'perm_nav_ai_price_backend_config' },
  { category: 'ai_price', label: 'AI 比价', field_name: 'perm_nav_ai_price_ai_compare' },
  { category: 'ai_price', label: '报价上传与识别', field_name: 'perm_nav_ai_price_quote_upload' },
  { category: 'ai_price', label: '报价查询', field_name: 'perm_nav_ai_price_quote_query' },
  { category: 'ai_price', label: 'Excel 报价导入', field_name: 'perm_nav_ai_price_excel_quote_import' },
  { category: 'ai_price', label: '库房管理', field_name: 'perm_nav_ai_price_warehouse_manage' },
  { category: 'ai_price', label: '冶炼厂管理', field_name: 'perm_nav_ai_price_smelter_manage' },
  { category: 'ai_price', label: '回收品类管理', field_name: 'perm_nav_ai_price_category_manage' },
  { category: 'ai_price', label: '库房类型配置', field_name: 'perm_nav_ai_price_warehouse_type_config' },
  { category: 'ai_price', label: '冶炼厂类型配置', field_name: 'perm_nav_ai_price_factory_type_config' },
  { category: 'ai_price', label: '运费模板', field_name: 'perm_nav_ai_price_freight_template' },
  { category: 'ai_price', label: '税金/换算比例', field_name: 'perm_nav_ai_price_tax_rate_config' },
  { category: 'ai_price', label: '异常信息补全', field_name: 'perm_nav_ai_price_abnormal_complete' },
  { category: 'ai_price', label: '报价导出', field_name: 'perm_nav_ai_price_quote_export' },

  // AI 定价
  { category: 'ai_pricing', label: 'AI 定价', field_name: 'perm_nav_ai_pricing' },
  { category: 'ai_pricing', label: '库房AI定价对标分析', field_name: 'perm_nav_ai_pricing_benchmark_analysis' },
  { category: 'ai_pricing', label: '库房自有定价分析', field_name: 'perm_nav_ai_pricing_self_pricing' },
  { category: 'ai_pricing', label: '对标城市定价', field_name: 'perm_nav_ai_pricing_city_benchmark' },
  { category: 'ai_pricing', label: '冶炼厂标定价格', field_name: 'perm_nav_ai_pricing_smelter_price' },
  { category: 'ai_pricing', label: '库房差价和毛利管理', field_name: 'perm_nav_ai_pricing_margin_manage' },

  { category: 'system_account', label: '账号管理', field_name: 'perm_nav_system_account_user_account' },
  { category: 'system_account', label: '角色管理', field_name: 'perm_nav_system_account_role_manage' },
]

export function categoryKeyFromFieldName(fieldName: string): NavCategoryKey | 'other' {
  if (!fieldName) return 'other'
  // 当前约定：perm_nav_{category}_...
  const sortedCats = [...NAV_CATEGORY_KEYS].sort((a, b) => b.length - a.length)
  for (const cat of sortedCats) {
    const prefPerm = `perm_nav_${cat}_`
    if (fieldName.startsWith(prefPerm)) return cat
    const prefNav = `nav_${cat}_`
    if (fieldName.startsWith(prefNav)) return cat
  }
  // 旧约定（带点号，若库里已有）
  const m = /^nav\.([a-z0-9_]+)\./.exec(fieldName)
  if (m?.[1]) {
    const k = m[1] as NavCategoryKey
    return k in NAV_CATEGORY_META ? k : 'other'
  }
  return 'other'
}
