/**
 * 升级调色板 → 75色 Tailwind 色系 + 原生取色器（v3：从原始状态应用）
 * Run: node scripts/patch-color-palette-v3.cjs
 */
const fs = require('fs')
const path = require('path')

const appPath = path.join(__dirname, '../public/embedded/price_system/assets/app-BZHDhlyu.js')
const htmlPath = path.join(__dirname, '../public/embedded/price_system/index.html')

let app = fs.readFileSync(appPath, 'utf8')
let html = fs.readFileSync(htmlPath, 'utf8')
const ok = []

// ═══════════════════════════════════════
// 调色板 HTML
// ═══════════════════════════════════════

function paletteHtml(prefix) {
  const colors = [
    // Red
    '#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b',
    // Orange
    '#fdba74','#fb923c','#f97316','#ea580c','#c2410c',
    // Amber / Yellow
    '#fde68a','#fcd34d','#fbbf24','#f59e0b','#facc15','#eab308',
    // Lime / Green
    '#a3e635','#84cc16','#86efac','#4ade80','#22c55e','#16a34a','#15803d',
    // Emerald / Teal
    '#6ee7b7','#34d399','#10b981','#2dd4bf','#14b8a6','#0d9488',
    // Cyan / Sky
    '#22d3ee','#06b6d4','#0891b2','#7dd3fc','#38bdf8','#0ea5e9','#0284c7',
    // Blue / Indigo
    '#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#818cf8','#6366f1','#4f46e5',
    // Violet / Purple
    '#a78bfa','#8b5cf6','#7c3aed','#c084fc','#a855f7','#9333ea',
    // Fuchsia / Pink
    '#f0abfc','#e879f9','#d946ef','#f9a8d4','#f472b6','#ec4899','#db2777',
    // Rose
    '#fda4af','#fb7185','#f43f5e','#e11d48','#be123c',
    // Slate / Gray
    '#94a3b8','#64748b','#475569','#6b7280','#4b5563','#374151','#1f2937',
    // Special
    '#ffffff','#000000',
  ]
  const swatches = colors.map(c =>
    `<span class="color-swatch" data-color="${c}" title="${c}" style="background:${c}"></span>`
  ).join('\n                    ')
  return `<div class="color-palette" id="${prefix}-color-palette" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;max-width:420px">\n                    ${swatches}\n                </div>`
}

// ═══════════════════════════════════════
// 接线函数
// ═══════════════════════════════════════

function wireFn(prefix) {
  const id = prefix === 'Factory' ? 'ft' : 'wt'
  const fname = `WtWire${prefix}ColorControls`
  return `function ${fname}() {\n    var r = document.getElementById(\`${id}-color-r\`),\n        g = document.getElementById(\`${id}-color-g\`),\n        b = document.getElementById(\`${id}-color-b\`),\n        t = document.getElementById(\`${id}-color\`),\n        n = document.getElementById(\`${id}-color-preview\`),\n        p = document.getElementById(\`${id}-color-palette\`),\n        c = document.getElementById(\`${id}-color-native\`);\n    if (!r || !g || !b) return;\n    if (r.dataset.${id}PalV5) return;\n    r.dataset.${id}PalV5 = \`1\`;\n    function u() {\n        var rv = Math.min(255, Math.max(0, parseInt(r.value, 10) || 0)),\n            gv = Math.min(255, Math.max(0, parseInt(g.value, 10) || 0)),\n            bv = Math.min(255, Math.max(0, parseInt(b.value, 10) || 0));\n        r.value = rv; g.value = gv; b.value = bv;\n        var e = [rv, gv, bv].map(function(v) {\n            var h = v.toString(16);\n            return h.length === 1 ? \`0\` + h : h;\n        }).join(\`\`);\n        t.value = \`#\` + e;\n        var i = WtSafeCssColor(\`#\` + e);\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`));\n        c && (c.value = \`#\` + e);\n        if (p) {\n            var a = p.querySelectorAll(\`.color-swatch\`);\n            for (var s = 0; s < a.length; s++) {\n                var sw = a[s], clr = sw.getAttribute(\`data-color\`) || \`\`;\n                sw.classList.toggle(\`active\`, clr.toLowerCase() === \`#\` + e);\n            }\n        }\n    }\n    function f(h) {\n        if (!h || h.length < 7) return;\n        var rr = parseInt(h.substr(1,2), 16),\n            gg = parseInt(h.substr(3,2), 16),\n            bb = parseInt(h.substr(5,2), 16);\n        if (isNaN(rr) || isNaN(gg) || isNaN(bb)) return;\n        r.value = rr; g.value = gg; b.value = bb; u();\n    }\n    p && p.addEventListener(\`click\`, function(e) {\n        var sw = e.target.closest(\`.color-swatch\`);\n        if (!sw) return;\n        var clr = sw.getAttribute(\`data-color\`) || \`\`;\n        f(clr)\n    });\n    c && c.addEventListener(\`input\`, function() {\n        c.value && f(c.value)\n    });\n    r.addEventListener(\`input\`, u); g.addEventListener(\`input\`, u); b.addEventListener(\`input\`, u);\n    r.addEventListener(\`change\`, u); g.addEventListener(\`change\`, u); b.addEventListener(\`change\`, u);\n    u()\n}`
}

// ═══════════════════════════════════════
// 替换逻辑
// ═══════════════════════════════════════

// 1. 替换 select 下拉框 → 调色板
const selectRegex = /<select id="(wt|ft)-color-vivid" class="form-control" style="max-width:150px">[\s\S]*?<\/select>/
let match

match = app.match(selectRegex)
if (match) {
  app = app.replace(selectRegex, (m, prefix) => paletteHtml(prefix))
  // replaceAll to catch both occurrences
  while (app.match(selectRegex)) {
    app = app.replace(selectRegex, (m, prefix) => paletteHtml(prefix))
  }
  ok.push('app: select → palette (both)')
} else {
  console.warn('[warn] select regex not matched')
}

// 2. 替换颜色输入行 — R/G/B 三通道 + 原生取色器
app = app.replace(/<input type="text" id="(wt|ft)-color" class="form-control" placeholder="[^"]*">/g, (match, id) => {
  const baseId = id // 'wt' or 'ft'
  return `<label style="font-size:0.85rem;color:#475569;margin-top:4px;display:block">自定义颜色 <span style="font-weight:400;color:#94a3b8">（RGB 三通道，0–255）</span></label>\n                <div style="display:flex;align-items:center;gap:6px;margin-top:4px">\n                    <input type="color" id="${baseId}-color-native" class="color-native-input" title="打开系统取色器">\n                    <input type="number" id="${baseId}-color-r" class="form-control color-rgb-input" placeholder="R" min="0" max="255" style="width:68px;text-align:center" title="红色 0-255">\n                    <input type="number" id="${baseId}-color-g" class="form-control color-rgb-input" placeholder="G" min="0" max="255" style="width:68px;text-align:center" title="绿色 0-255">\n                    <input type="number" id="${baseId}-color-b" class="form-control color-rgb-input" placeholder="B" min="0" max="255" style="width:68px;text-align:center" title="蓝色 0-255">\n                    <input type="text" id="${baseId}-color" style="display:none">\n                    <span id="${baseId}-color-preview" style="display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:#e2e8f0;flex-shrink:0"></span>\n                </div>`
})
ok.push('app: native color inputs (both)')

// Also update the placeholder text in the small hint
app = app.replace(/不填时自动使用黑色 <code>#000000<\/code>/g,
  '不填时自动使用黑色 <code>#000000</code>')

// 3. 替换 WtWireColorControls 函数
const whFuncStart = app.indexOf('function WtWireColorControls() {')
const whFuncEnd = app.indexOf('\r\n\r\nfunction Za(e)', whFuncStart)
if (whFuncStart >= 0 && whFuncEnd > whFuncStart) {
  app = app.slice(0, whFuncStart) + wireFn('') + app.slice(whFuncEnd)
  ok.push('app: WtWireColorControls')
} else {
  console.warn(`[warn] WtWireColorControls bounds: start=${whFuncStart} end=${whFuncEnd}`)
}

// 4. 替换 WtWireFactoryColorControls 函数
const ftFuncStart = app.indexOf('function WtWireFactoryColorControls() {')
const ftFuncEnd = app.indexOf('\r\n\r\nasync function ptFactoryTypes(', ftFuncStart)
if (ftFuncStart >= 0 && ftFuncEnd > ftFuncStart) {
  app = app.slice(0, ftFuncStart) + wireFn('Factory') + app.slice(ftFuncEnd)
  ok.push('app: WtWireFactoryColorControls')
} else {
  console.warn(`[warn] WtWireFactoryColorControls bounds: start=${ftFuncStart} end=${ftFuncEnd}`)
}

fs.writeFileSync(appPath, app)

// 5. CSS — 调色板色块 + 原生取色器
const paletteCSS = `
  .color-palette { user-select:none; }
  .color-swatch {
    display:inline-block; width:24px; height:24px; border-radius:5px;
    cursor:pointer; border:2px solid transparent; box-sizing:border-box;
    transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
    vertical-align:middle; flex-shrink:0;
  }
  .color-swatch:hover { transform:scale(1.22); z-index:1; position:relative; }
  .color-swatch.active {
    border-color:#0f172a; box-shadow:0 0 0 2px #fff, 0 0 0 3px #0f172a;
    transform:scale(1.14); z-index:1; position:relative;
  }
  .color-swatch[data-color="#ffffff"] { border-color:#d1d5db; }
  .color-swatch[data-color="#ffffff"].active { border-color:#0f172a; }
  .color-native-input {
    width:36px; height:36px; padding:2px; border:1px solid #cbd5e1;
    border-radius:6px; cursor:pointer; background:#fff; flex-shrink:0;
  }
  .color-native-input::-webkit-color-swatch-wrapper { padding:2px; }
  .color-native-input::-webkit-color-swatch { border-radius:4px; border:none; }
  .color-native-input::-moz-color-swatch { border-radius:4px; border:none; }
  .color-rgb-input::-webkit-inner-spin-button,
  .color-rgb-input::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  .color-rgb-input { -moz-appearance:textfield; }
`

// 在主样式块（第一个 </style> 之前）插入
const firstStyleEnd = html.indexOf('</style>')
if (firstStyleEnd >= 0) {
  html = html.slice(0, firstStyleEnd) + paletteCSS + '\n  ' + html.slice(firstStyleEnd)
  ok.push('html: palette + native color CSS')
} else {
  console.warn('[warn] html: </style> not found')
}

fs.writeFileSync(htmlPath, html)

console.log('patch-color-palette-v3: ' + ok.length + ' patches applied')
ok.forEach(s => console.log('  OK: ' + s))
