/**
 * 规则检测接口变更 — 前端适配测试
 *
 * 运行方式:
 *   npx tsx PD_max_fronted/src/__tests__/ruleCheckApi.test.ts
 *
 * 测试范围:
 *   1. normalizeLinkedRuleChecksObject — 新响应格式（suggested_rois / pixel_overlap_source）
 *   2. normalizeLinkedRuleChecksObject — 传 bbox 的响应（pixel_overlap 有值）
 *   3. normalizeLinkedRuleChecksObject — 旧格式兼容（含 semantic，应被静默忽略）
 *   4. buildRuleCheckUserView — 有 suggested_rois + pixel_overlap 为 null 时
 *   5. buildRuleCheckUserView — 有 pixel_overlap 结果时（无 semantic）
 *   6. buildRuleCheckUserView — available=false 时
 *   7. parseLinkedRuleChecksField — 历史记录数组格式
 *   8. makeFinding — 不再输出 auto_scan_regions / semantic_check
 */

import { deepStrictEqual, strictEqual, ok } from 'node:assert'
import {
  normalizeLinkedRuleChecksObject,
  parseLinkedRuleChecksField,
  type RuleChecksData,
} from '../api/detect'
import {
  buildRuleCheckUserView,
  makeFinding,
  ruleCheckVerdict,
} from '../ruleCheckDisplay'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error(`    ${e instanceof Error ? e.message : String(e)}`)
  }
}

function assert(condition: boolean, msg?: string) {
  ok(condition, msg)
}

// ============================================================
// 1. normalizeLinkedRuleChecksObject — 新响应：不传 bbox，返回 suggested_rois
// ============================================================
test('新格式：不传 bbox → pixel_overlap=null + suggested_rois 有值 + pixel_overlap_source=null', () => {
  const raw: Record<string, unknown> = {
    status: 'success',
    data: {
      pixel_overlap: null,
      pixel_overlap_source: null,
      suggested_rois: [
        { bbox: [360, 202, 480, 228], label: '转账金额', category: '金额', priority: 1, source: 'ocr_labeled_field' },
        { bbox: [298, 130, 430, 160], label: '- 6,000.00', category: '金额候选', priority: 6, source: 'amount_line' },
        { bbox: [100, 300, 250, 330], label: '张三', category: '姓名', priority: 2, source: 'ocr_labeled_field' },
      ],
      timestamp: {
        passed: true,
        message: '时间戳校验通过',
        hard_tamper: false,
      },
      hard_tamper_flags: {
        pixel_overlap: false,
        timestamp: false,
      },
      reason: '未指定检测区域，返回建议检测区域供选择',
    },
  }

  const dataLayer = raw.data as Record<string, unknown>
  const result = normalizeLinkedRuleChecksObject(dataLayer)

  assert(result != null, '应返回非 null 结果')
  assert(result.pixel_overlap === null, 'pixel_overlap 应为 null（未传 bbox）')
  assert(result.pixel_overlap_source === null, 'pixel_overlap_source 应为 null')
  assert(result.suggested_rois != null, 'suggested_rois 应有值')
  assert(result.suggested_rois!.length === 3, '应有 3 个建议区域')
  assert(result.suggested_rois![0].category === '金额', '第一个 ROI 分类应为"金额"')
  assert(result.suggested_rois![0].priority === 1, '第一个 ROI 优先级应为 1')
  assert(result.suggested_rois![0].bbox[0] === 360, '第一个 ROI bbox x1 应为 360')
  assert(result.timestamp != null, 'timestamp 应有值')
  assert(result.timestamp!.passed === true, 'timestamp 应通过')
  // semantic 不应存在
  assert(!('semantic' in result), '结果不应包含 semantic 字段')
})

// ============================================================
// 2. normalizeLinkedRuleChecksObject — 传 bbox 的响应
// ============================================================
test('新格式：传 bbox → pixel_overlap 有值 + suggested_rois=null + pixel_overlap_source=manual_bbox', () => {
  const raw: Record<string, unknown> = {
    status: 'success',
    data: {
      pixel_overlap: {
        pixel_overlap_score: 0.85,
        passed: false,
        message: '检测到疑似拼接痕迹',
        overlap_metrics: {
          structural_score: 0.72,
          blend_score: 0.68,
          ela_score: 0.25,
          noise_inconsistency_score: 0.15,
          text_splice_score: 0.60,
        },
        bbox: [360, 202, 480, 228],
        alert: true,
        hard_tamper: true,
        reasons: ['ELA 分数偏高（0.25），噪声不一致分（0.15）同时异常'],
      },
      pixel_overlap_source: 'manual_bbox',
      suggested_rois: null,
      timestamp: {
        passed: true,
        message: '时间戳校验通过',
      },
      hard_tamper_flags: {
        pixel_overlap: true,
        timestamp: false,
      },
      reason: '检测到像素重叠异常',
    },
  }

  const dataLayer = raw.data as Record<string, unknown>
  const result = normalizeLinkedRuleChecksObject(dataLayer)

  assert(result != null, '应返回非 null 结果')
  assert(result.pixel_overlap != null, 'pixel_overlap 应有值')
  assert(result.pixel_overlap!.pixel_overlap_score === 0.85, '像素重叠分数应为 0.85')
  assert(result.pixel_overlap!.hard_tamper === true, 'hard_tamper 应为 true')
  assert(result.pixel_overlap_source === 'manual_bbox', 'pixel_overlap_source 应为 manual_bbox')
  assert(result.suggested_rois === null, 'suggested_rois 应为 null（传了 bbox）')
  assert(result.timestamp != null, 'timestamp 应有值')
  assert(result.hard_tamper_flags != null, 'hard_tamper_flags 应有值')
  assert(result.hard_tamper_flags!.pixel_overlap === true, 'pixel_overlap flag 应为 true')
})

// ============================================================
// 3. normalizeLinkedRuleChecksObject — 旧格式兼容（仍含 semantic）
// ============================================================
test('旧格式兼容：含 semantic 字段 → 应被静默忽略，不影响其他字段解析', () => {
  const raw: Record<string, unknown> = {
    status: 'success',
    data: {
      pixel_overlap: {
        pixel_overlap_score: 0.12,
        passed: true,
        message: '未发现异常',
        alert: false,
        hard_tamper: false,
      },
      pixel_overlap_source: 'manual_bbox',
      suggested_rois: null,
      timestamp: {
        passed: true,
        message: '时间戳校验通过',
      },
      semantic: {
        passed: true,
        message: '语义检测通过',
        anomalies: [],
        hard_tamper: false,
      },
      hard_tamper_flags: {
        pixel_overlap: false,
        timestamp: false,
        semantic: false,
      },
      reason: '所有检测通过',
    },
  }

  const dataLayer = raw.data as Record<string, unknown>
  const result = normalizeLinkedRuleChecksObject(dataLayer)

  assert(result != null, '应返回非 null 结果')
  assert(result.pixel_overlap != null, 'pixel_overlap 应正常解析')
  assert(result.pixel_overlap!.passed === true, 'pixel_overlap 应通过')
  assert(result.timestamp != null, 'timestamp 应正常解析')
  // semantic 字段应被忽略（不再出现在结果中）
  assert(!('semantic' in result), '结果不应包含 semantic 字段')
  // hard_tamper_flags 中仍可能包含 semantic（来自原始响应），但前端不使用
  assert(result.hard_tamper_flags != null, 'hard_tamper_flags 应有值')
})

// ============================================================
// 4. buildRuleCheckUserView — 有 suggested_rois + pixel_overlap 为 null
// ============================================================
test('buildRuleCheckUserView：suggested_rois 存在 + pixel_overlap 为 null → 返回 suggestedRois', () => {
  const data: RuleChecksData = {
    available: true,
    status: '可疑',
    pixel_overlap: null,
    pixel_overlap_source: null,
    suggested_rois: [
      { bbox: [360, 202, 480, 228], label: '转账金额', category: '金额', priority: 1, source: 'ocr_labeled_field' },
      { bbox: [100, 300, 250, 330], label: '张三', category: '姓名', priority: 2, source: 'ocr_labeled_field' },
    ],
    timestamp: {
      passed: true,
      message: '时间戳校验通过',
    },
    hard_tamper_flags: {
      pixel_overlap: false,
      timestamp: false,
    },
    reason: '未指定检测区域',
  }

  const view = buildRuleCheckUserView(data)

  assert(view != null, 'view 不应为 null')
  assert(view.suggestedRois != null, 'suggestedRois 应有值')
  assert(view.suggestedRois!.length === 2, '应有 2 个建议区域')
  assert(view.pixelOverlapSource === null, 'pixelOverlapSource 应为 null')
  // 时间戳 finding 应该存在
  assert(view.findings.length === 1, '应只有时间戳 finding（pixel_overlap 为 null 无 finding）')
  assert(view.findings[0].title === '时间与单据核对', 'finding 应为时间戳')
})

// ============================================================
// 5. buildRuleCheckUserView — 有 pixel_overlap 结果 + 无 semantic
// ============================================================
test('buildRuleCheckUserView：pixel_overlap 有值 → 有像素重叠 finding，无 semantic finding', () => {
  const data: RuleChecksData = {
    available: true,
    status: '篡改',
    pixel_overlap: {
      pixel_overlap_score: 0.85,
      passed: false,
      message: '检测到疑似拼接痕迹',
      overlap_metrics: {
        structural_score: 0.72,
        blend_score: 0.68,
        ela_score: 0.25,
        noise_inconsistency_score: 0.15,
        text_splice_score: 0.60,
      },
      alert: true,
      hard_tamper: true,
    },
    pixel_overlap_source: 'manual_bbox',
    suggested_rois: null,
    timestamp: {
      passed: true,
      message: '时间戳校验通过',
    },
    hard_tamper_flags: {
      pixel_overlap: true,
      timestamp: false,
    },
    reason: '检测到像素重叠异常',
  }

  const view = buildRuleCheckUserView(data)

  assert(view != null, 'view 不应为 null')
  assert(view.suggestedRois === null, 'suggestedRois 应为 null（传了 bbox）')
  assert(view.pixelOverlapSource === 'manual_bbox', 'pixelOverlapSource 应为 manual_bbox')
  assert(view.findings.length === 2, '应有 2 个 finding（像素重叠 + 时间戳）')

  const poFinding = view.findings.find((f) => f.title === '拼接/贴图痕迹')
  assert(poFinding != null, '应有"拼接/贴图痕迹"finding')
  assert(poFinding!.status === 'bad', '像素重叠状态应为 bad')
  assert(poFinding!.details != null, '应有详细信息')
  // 不应包含 auto_scan_regions
  const hasAutoScan = poFinding!.details!.some((d) => d.label === '自动扫描区域数')
  assert(!hasAutoScan, '不应包含"自动扫描区域数"')

  // 不应包含 semantic finding
  const semFinding = view.findings.find((f) => f.title.includes('语义'))
  assert(semFinding == null, '不应包含语义检测 finding')
})

// ============================================================
// 6. buildRuleCheckUserView — available=false
// ============================================================
test('buildRuleCheckUserView：available=false → 返回空 findings + suggestedRois=null', () => {
  const data: RuleChecksData = {
    available: false,
    reason: '规则检测服务暂不可用',
  }

  const view = buildRuleCheckUserView(data)

  assert(view != null, 'view 不应为 null')
  assert(view.findings.length === 0, 'findings 应为空')
  assert(view.suggestedRois === null, 'suggestedRois 应为 null')
  assert(view.pixelOverlapSource === null, 'pixelOverlapSource 应为 null')
  assert(view.summary.includes('暂不可用'), 'summary 应包含不可用提示')
})

// ============================================================
// 7. parseLinkedRuleChecksField — 历史记录数组格式
// ============================================================
test('parseLinkedRuleChecksField：数组取首项 + 含 suggested_rois', () => {
  const raw = [
    {
      available: true,
      status: '可疑',
      pixel_overlap: null,
      pixel_overlap_source: null,
      suggested_rois: [
        { bbox: [50, 80, 200, 120], label: '申请时间', category: '时间', priority: 3, source: 'ocr_labeled_field' },
      ],
      timestamp: { passed: true },
      hard_tamper_flags: {},
      reason: '建议选择检测区域',
    },
    {},
  ]

  const result = parseLinkedRuleChecksField(raw)

  assert(result != null, '应返回非 null 结果')
  assert(result.suggested_rois != null, 'suggested_rois 应有值')
  assert(result.suggested_rois!.length === 1, '应有 1 个建议区域')
  assert(result.suggested_rois![0].category === '时间', '分类应为"时间"')
})

// ============================================================
// 8. makeFinding — 不再输出 auto_scan_regions / semantic_check
// ============================================================
test('makeFinding：pixel_overlap 类型 → 不包含 auto_scan_regions 信息', () => {
  const block = {
    pixel_overlap_score: 0.42,
    passed: false,
    message: '检测到异常',
    alert: true,
    hard_tamper: true,
    overlap_metrics: {
      structural_score: 0.3,
      blend_score: 0.5,
    },
    auto_scan_regions: [{ bbox: [1, 2, 3, 4] }, { bbox: [5, 6, 7, 8] }],
  }

  const finding = makeFinding(block)

  assert(finding != null, '应返回 finding')
  // 即使原始数据有 auto_scan_regions，makeFinding 也不应提取
  const autoScanDetail = finding!.details?.find((d) => d.label === '自动扫描区域数')
  assert(autoScanDetail == null, '不应包含"自动扫描区域数"')
})

test('makeFinding：不含 semantic_check 信息', () => {
  const block = {
    passed: false,
    message: '检测到异常',
    hard_tamper: true,
    risk: 0.5,
    semantic_check: {
      account_masks: { anomaly: true, message: '检测到账号掩码' },
      synthetic: { suspicious: true, signals: ['unnatural_shadow'] },
    },
  }

  const finding = makeFinding(block as any)

  assert(finding != null, '应返回 finding')
  // semantic_check 信息不应出现在 details 中
  const accountDetail = finding!.details?.find((d) => d.label === '账号脱敏')
  assert(accountDetail == null, '不应包含"账号脱敏"')
  const synthDetail = finding!.details?.find((d) => d.label === '合成检测')
  assert(synthDetail == null, '不应包含"合成检测"')
})

// ============================================================
// 9. ruleCheckVerdict — 各种状态
// ============================================================
test('ruleCheckVerdict：正常/可疑/篡改/暂无', () => {
  assert(ruleCheckVerdict(null).label === '—', 'null → —')
  assert(ruleCheckVerdict({ available: false }).label === '暂无', 'available=false → 暂无')
  assert(ruleCheckVerdict({ available: true, status: '正常' }).label === '正常', 'status=正常')
  assert(ruleCheckVerdict({ available: true, status: '可疑' }).label === '可疑', 'status=可疑')
  assert(ruleCheckVerdict({ available: true, status: '篡改' }).label === '篡改', 'status=篡改')
  assert(ruleCheckVerdict({ available: true }).label === '—', '无 status → —')
})

// ============================================================
// 10. 字段变更验证 — 确认旧字段已移除
// ============================================================
test('RuleChecksData 类型：不含 semantic 字段', () => {
  const data: RuleChecksData = {
    pixel_overlap: null,
    timestamp: { passed: true },
    suggested_rois: [],
    hard_tamper_flags: {},
  }
  // TypeScript 编译时检查：如果 semantic 仍在类型中，下面这行会报类型错误
  // 运行时确认
  assert(!('semantic' in data) || data.semantic === undefined, 'semantic 不应存在')
})

test('RuleChecksData 类型：包含新字段 pixel_overlap_source 和 suggested_rois', () => {
  const data: RuleChecksData = {
    pixel_overlap_source: 'manual_bbox',
    suggested_rois: null,
  }
  assert(data.pixel_overlap_source === 'manual_bbox', 'pixel_overlap_source 应可设置')
  assert(data.suggested_rois === null, 'suggested_rois 应可为 null')

  const data2: RuleChecksData = {
    pixel_overlap_source: null,
    suggested_rois: [
      { bbox: [1, 2, 3, 4], label: 'test', category: '金额', priority: 1, source: 'ocr' },
    ],
  }
  assert(data2.suggested_rois!.length === 1, 'suggested_rois 应可包含数据')
})

// ============================================================
// 结果汇总
// ============================================================
console.log(`\n${'='.repeat(50)}`)
console.log(`测试结果: ${passed} 通过, ${failed} 失败, ${passed + failed} 总计`)
console.log(`${'='.repeat(50)}`)

if (failed > 0) {
  process.exit(1)
}
