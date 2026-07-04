/**
 * 为库房类型和冶炼厂类型维护表单的"颜色配置"添加可视化调色板
 * Run: node scripts/patch-color-palette.cjs
 */
const fs = require('fs')
const path = require('path')

const appPath = path.join(__dirname, '../public/embedded/price_system/assets/app-BZHDhlyu.js')
const htmlPath = path.join(__dirname, '../public/embedded/price_system/index.html')

let app = fs.readFileSync(appPath, 'utf8')
let html = fs.readFileSync(htmlPath, 'utf8')

const ok = []

function replaceOnce(haystack, oldStr, newStr, label) {
  if (!haystack.includes(oldStr)) {
    console.warn(`[warn] ${label}: NOT FOUND`)
    return haystack
  }
  const before = haystack
  haystack = haystack.split(oldStr).join(newStr)
  if (haystack === before) {
    console.warn(`[warn] ${label}: no change`)
  } else {
    ok.push(label)
  }
  return haystack
}

// ═══════════════════════════════════════
// 调色板 HTML 片段（库房类型 / 冶炼厂类型共用，仅 id 前缀不同）
// ═══════════════════════════════════════

function colorPaletteHtml(prefix) {
  const colors = [
    '#ef4444','#dc2626','#b91c1c','#f97316','#ea580c','#d97706',
    '#eab308','#f59e0b','#84cc16','#22c55e','#16a34a','#15803d',
    '#14b8a6','#0891b2','#0e7490','#3b82f6','#2563eb','#1d4ed8',
    '#8b5cf6','#7c3aed','#6d28d9','#ec4899','#db2777','#be185d',
    '#6b7280','#374151','#1f2937','#ffffff','#000000',
  ]
  const swatches = colors.map(c =>
    `<span class="color-swatch" data-color="${c}" title="${c}" style="background:${c}"></span>`
  ).join('\n                    ')
  return `<div class="color-palette" id="${prefix}-color-palette" style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0">\n                    ${swatches}\n                </div>`
}

// ═══════════════════════════════════════
// 通用调色板接线函数
// ═══════════════════════════════════════

function wireColorPaletteFn(prefix) {
  return `function WtWire${prefix}ColorControls() {
    var t = document.getElementById(\`${prefix === 'Factory' ? 'ft' : 'wt'}-color\`),
        n = document.getElementById(\`${prefix === 'Factory' ? 'ft' : 'wt'}-color-preview\`),
        p = document.getElementById(\`${prefix === 'Factory' ? 'ft' : 'wt'}-color-palette\`);
    if (!t) return;
    if (t.dataset.${prefix === 'Factory' ? 'ft' : 'wt'}WiredPal) return;
    t.dataset.${prefix === 'Factory' ? 'ft' : 'wt'}WiredPal = \`1\`;
    function r() {
        var e = (t.value || \`\`).trim(),
            i = WtSafeCssColor(e);
        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`));
        if (p) {
            var a = p.querySelectorAll(\`.color-swatch\`);
            for (var s = 0; s < a.length; s++) {
                var sw = a[s], c = sw.getAttribute(\`data-color\`) || \`\`;
                sw.classList.toggle(\`active\`, c.toLowerCase() === e.toLowerCase());
            }
        }
    }
    p && p.addEventListener(\`click\`, function(e) {
        var sw = e.target.closest(\`.color-swatch\`);
        if (!sw) return;
        var c = sw.getAttribute(\`data-color\`) || \`\`;
        t.value = c, r()
    });
    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, r), r()
}`
}

// ═══════════════════════════════════════
// PART 1: 库房类型表单 — 替换 select → 调色板
// ═══════════════════════════════════════

app = replaceOnce(app,
  `<select id="wt-color-vivid" class="form-control" style="max-width:150px">\r\n                        <option value="">选色…</option>\r\n                        <option value="#dc2626">红</option>\r\n                        <option value="#ea580c">橙</option>\r\n                        <option value="#eab308">黄</option>\r\n                        <option value="#16a34a">绿</option>\r\n                        <option value="#0891b2">青</option>\r\n                        <option value="#2563eb">蓝</option>\r\n                        <option value="#7c3aed">紫</option>\r\n                        <option value="#6b7280">灰色</option>\r\n                        <option value="#ffffff">白</option>\r\n                        <option value="#000000">黑</option>\r\n                    </select>`,
  colorPaletteHtml('wt'),
  'app: warehouse type form palette')

// 更新 placeholder 文本
app = replaceOnce(app,
  `placeholder="#RRGGBB，或从上方下拉选色；留空为黑色"`,
  `placeholder="#RRGGBB，或从上方调色板选色；留空为黑色"`,
  'app: warehouse color placeholder')

// ═══════════════════════════════════════
// PART 2: 冶炼厂类型表单 — 替换 select → 调色板
// ═══════════════════════════════════════

app = replaceOnce(app,
  `<select id="ft-color-vivid" class="form-control" style="max-width:150px">\r\n                        <option value="">选色…</option>\r\n                        <option value="#dc2626">红</option>\r\n                        <option value="#ea580c">橙</option>\r\n                        <option value="#eab308">黄</option>\r\n                        <option value="#16a34a">绿</option>\r\n                        <option value="#0891b2">青</option>\r\n                        <option value="#2563eb">蓝</option>\r\n                        <option value="#7c3aed">紫</option>\r\n                        <option value="#6b7280">灰色</option>\r\n                        <option value="#ffffff">白</option>\r\n                        <option value="#000000">黑</option>\r\n                    </select>`,
  colorPaletteHtml('ft'),
  'app: smelter type form palette')

app = replaceOnce(app,
  `placeholder="#RRGGBB，或从上方下拉选色；留空为黑色"`,
  `placeholder="#RRGGBB，或从上方调色板选色；留空为黑色"`,
  'app: smelter color placeholder (second occurrence)')

// ═══════════════════════════════════════
// PART 3: 替换 WtWireColorControls（库房）
// ═══════════════════════════════════════

const oldWireWh = `function WtWireColorControls() {\r\n    var e = document.getElementById(\`wt-color-vivid\`),\r\n        t = document.getElementById(\`wt-color\`),\r\n        n = document.getElementById(\`wt-color-preview\`);\r\n    WtEnsureVividGrayOption(e);\r\n    if (!t) return;\r\n    if (t.dataset.wtWired) return;\r\n    t.dataset.wtWired = \`1\`;\r\n\r\n    function r() {\r\n        var e = (t.value || \`\`).trim(),\r\n            i = WtSafeCssColor(e);\r\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`))\r\n    }\r\n\r\n    function i() {\r\n        var n = (t.value || \`\`).trim();\r\n        if (e) {\r\n            e.selectedIndex = 0;\r\n            for (var i = 1; i < e.options.length; i++)\r\n                if (e.options[i].value === n) {\r\n                    e.selectedIndex = i;\r\n                    break\r\n                }\r\n        }\r\n    }\r\n    e && !e.dataset.wtWired && (e.dataset.wtWired = \`1\`, e.addEventListener(\`change\`, function() {\r\n        this.value && (t.value = this.value), r()\r\n    })), t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, function() {\r\n        i(), r()\r\n    }), i(), r()\r\n}`

app = replaceOnce(app, oldWireWh, wireColorPaletteFn(''), 'app: WtWireColorControls → palette')

// ═══════════════════════════════════════
// PART 4: 替换 WtWireFactoryColorControls（冶炼厂）
// ═══════════════════════════════════════

const oldWireFt = `function WtWireFactoryColorControls() {\r\n    var e = document.getElementById(\`ft-color-vivid\`),\r\n        t = document.getElementById(\`ft-color\`),\r\n        n = document.getElementById(\`ft-color-preview\`);\r\n    WtEnsureVividGrayOption(e);\r\n    if (!t) return;\r\n    if (t.dataset.ftWired) return;\r\n    t.dataset.ftWired = \`1\`;\r\n    function r() {\r\n        var e = (t.value || \`\`).trim(),\r\n            i = WtSafeCssColor(e);\r\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`))\r\n    }\r\n    function i() {\r\n        var n = (t.value || \`\`).trim();\r\n        if (e) {\r\n            var a = e.value;\r\n            if (a && n) {\r\n                var o = n.toLowerCase();\r\n                for (var s = 0; s < e.options.length; s++)\r\n                    if (String(e.options[s].value).toLowerCase() === o) {\r\n                        e.options[s].selected = !0;\r\n                        return\r\n                    }\r\n            }\r\n            if (a && !n) return\r\n        }\r\n    }\r\n    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, function() { r(), i() }), e && e.addEventListener(\`change\`, function() {\r\n        var n = e.value;\r\n        n && (t.value = n, r())\r\n    }), r(), i()\r\n}`

app = replaceOnce(app, oldWireFt, wireColorPaletteFn('Factory'), 'app: WtWireFactoryColorControls → palette')

fs.writeFileSync(appPath, app)

// ═══════════════════════════════════════
// PART 5: index.html — 添加调色板 CSS（使用唯一锚点避免重复插入）
// ═══════════════════════════════════════

const paletteCSS = `
  .color-palette { user-select:none; }
  .color-swatch {
    display:inline-block; width:26px; height:26px; border-radius:6px;
    cursor:pointer; border:2px solid transparent; box-sizing:border-box;
    transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
    vertical-align:middle;
  }
  .color-swatch:hover { transform:scale(1.18); z-index:1; position:relative; }
  .color-swatch.active {
    border-color:#0f172a; box-shadow:0 0 0 2px #fff, 0 0 0 4px #0f172a;
    transform:scale(1.1); z-index:1; position:relative;
  }
  .color-swatch[data-color="#ffffff"] { border-color:#d1d5db; }
  .color-swatch[data-color="#ffffff"].active { border-color:#0f172a; }
`

// 使用唯一的 CSS 规则作为锚点，只插入一次
html = replaceOnce(html,
  `background: #fafcff !important;\r\n    }\r\n\r\n  </style>`,
  `background: #fafcff !important;\r\n    }` + paletteCSS + `\r\n\r\n  </style>`,
  'html: color palette CSS')

fs.writeFileSync(htmlPath, html)

console.log('patch-color-palette: ' + ok.length + ' patches applied')
ok.forEach(s => console.log('  OK: ' + s))
