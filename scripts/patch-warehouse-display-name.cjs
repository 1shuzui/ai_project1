/**
 * 嵌入比价系统：库房展示名保持原始名称（不再去掉末尾括号）
 * Run: node scripts/patch-warehouse-display-name.cjs
 */
const fs = require('fs')
const path = require('path')

const appPath = path.join(
  __dirname,
  '../public/embedded/price_system/assets/app-BZHDhlyu.js',
)

let app = fs.readFileSync(appPath, 'utf8')

// 把带括号截断的 T() 替换为纯 trim 版本
const oldTRegex =
  'function T(e){var t=String(_(e,[`仓库名`,`仓库`,`name`,`warehouse_name`,`warehouseName`],``));return t.replace(/[（(][^）)]*[）)]\\s*$/u,``).trim()}'
const newT =
  'function T(e){var t=String(_(e,[`仓库名`,`仓库`,`name`,`warehouse_name`,`warehouseName`],``));return t.trim()}'

const oldXt = '`" data-wh-id="`+n+`">`+M(r)+`（`+n+`）</button>`'
const newXt = '`" data-wh-id="`+n+`">`+M(r)+`</button>`'

if (app.includes(oldTRegex)) {
  app = app.split(oldTRegex).join(newT)
  console.log('T(): removed parenthesis stripping regex')
} else if (app.includes(newT)) {
  console.log('T(): already clean (no-op)')
} else {
  console.error('T(): current state unrecognized — may already be patched')
}

if (app.includes(oldXt)) {
  app = app.split(oldXt).join(newXt)
  console.log('Xt: removed (编号) suffix from warehouse buttons')
} else {
  console.log('Xt: already clean (no-op)')
}

fs.writeFileSync(appPath, app, 'utf8')
console.log('patch-warehouse-display-name done')
