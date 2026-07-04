/**
 * 升级库房类型/冶炼厂类型调色板 → 70+ 色 + 原生取色器
 * Run: node scripts/patch-color-palette-v2.cjs
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
// 70+ 色调色板（Tailwind 色系，按色相排列）
// ═══════════════════════════════════════

function expandedPaletteHtml(prefix) {
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
    // Slate / Gray neutrals
    '#94a3b8','#64748b','#475569','#6b7280','#4b5563','#374151','#1f2937',
    // Special
    '#ffffff','#000000',
  ]
  const swatches = colors.map((c, i) => {
    // Add a visual row break marker (invisible) for readability — purely cosmetic
    const breaks = [6, 11, 17, 24, 30, 37, 45, 51, 58, 63, 70]
    const prefix2 = breaks.includes(i) ? '\n                   ' : ''
    return prefix2 + `<span class="color-swatch" data-color="${c}" title="${c}" style="background:${c}"></span>`
  }).join('')
  return `<div class="color-palette" id="${prefix}-color-palette" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;max-width:420px">${swatches}\n                </div>`
}

// ═══════════════════════════════════════
// 原生取色器 + 调色板 的通用接线函数
// ═══════════════════════════════════════

function wireColorFn(prefix) {
  const id = prefix === 'Factory' ? 'ft' : 'wt'
  return `function WtWire${prefix}ColorControls() {
    var t = document.getElementById(\`${id}-color\`),
        n = document.getElementById(\`${id}-color-preview\`),
        p = document.getElementById(\`${id}-color-palette\`),
        c = document.getElementById(\`${id}-color-native\`);
    if (!t) return;
    if (t.dataset.${id}PalV2) return;
    t.dataset.${id}PalV2 = \`1\`;
    function r() {
        var e = (t.value || \`\`).trim(),
            i = WtSafeCssColor(e);
        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`));
        c && i && (c.value = i);
        if (p) {
            var a = p.querySelectorAll(\`.color-swatch\`);
            for (var s = 0; s < a.length; s++) {
                var sw = a[s], clr = sw.getAttribute(\`data-color\`) || \`\`;
                sw.classList.toggle(\`active\`, clr.toLowerCase() === e.toLowerCase());
            }
        }
    }
    p && p.addEventListener(\`click\`, function(e) {
        var sw = e.target.closest(\`.color-swatch\`);
        if (!sw) return;
        var clr = sw.getAttribute(\`data-color\`) || \`\`;
        t.value = clr, r()
    });
    c && c.addEventListener(\`input\`, function() {
        c.value && (t.value = c.value, r())
    });
    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, r), r()
}`
}

// ═══════════════════════════════════════
// PART 1: 替换库房类型调色板
// ═══════════════════════════════════════

const oldWhPalette = `<div class="color-palette" id="wt-color-palette" style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0">\r\n                    <span class="color-swatch" data-color="#ef4444" title="#ef4444" style="background:#ef4444"></span>\r\n                    <span class="color-swatch" data-color="#dc2626" title="#dc2626" style="background:#dc2626"></span>\r\n                    <span class="color-swatch" data-color="#b91c1c" title="#b91c1c" style="background:#b91c1c"></span>\r\n                    <span class="color-swatch" data-color="#f97316" title="#f97316" style="background:#f97316"></span>\r\n                    <span class="color-swatch" data-color="#ea580c" title="#ea580c" style="background:#ea580c"></span>\r\n                    <span class="color-swatch" data-color="#d97706" title="#d97706" style="background:#d97706"></span>\r\n                    <span class="color-swatch" data-color="#eab308" title="#eab308" style="background:#eab308"></span>\r\n                    <span class="color-swatch" data-color="#f59e0b" title="#f59e0b" style="background:#f59e0b"></span>\r\n                    <span class="color-swatch" data-color="#84cc16" title="#84cc16" style="background:#84cc16"></span>\r\n                    <span class="color-swatch" data-color="#22c55e" title="#22c55e" style="background:#22c55e"></span>\r\n                    <span class="color-swatch" data-color="#16a34a" title="#16a34a" style="background:#16a34a"></span>\r\n                    <span class="color-swatch" data-color="#15803d" title="#15803d" style="background:#15803d"></span>\r\n                    <span class="color-swatch" data-color="#14b8a6" title="#14b8a6" style="background:#14b8a6"></span>\r\n                    <span class="color-swatch" data-color="#0891b2" title="#0891b2" style="background:#0891b2"></span>\r\n                    <span class="color-swatch" data-color="#0e7490" title="#0e7490" style="background:#0e7490"></span>\r\n                    <span class="color-swatch" data-color="#3b82f6" title="#3b82f6" style="background:#3b82f6"></span>\r\n                    <span class="color-swatch" data-color="#2563eb" title="#2563eb" style="background:#2563eb"></span>\r\n                    <span class="color-swatch" data-color="#1d4ed8" title="#1d4ed8" style="background:#1d4ed8"></span>\r\n                    <span class="color-swatch" data-color="#8b5cf6" title="#8b5cf6" style="background:#8b5cf6"></span>\r\n                    <span class="color-swatch" data-color="#7c3aed" title="#7c3aed" style="background:#7c3aed"></span>\r\n                    <span class="color-swatch" data-color="#6d28d9" title="#6d28d9" style="background:#6d28d9"></span>\r\n                    <span class="color-swatch" data-color="#ec4899" title="#ec4899" style="background:#ec4899"></span>\r\n                    <span class="color-swatch" data-color="#db2777" title="#db2777" style="background:#db2777"></span>\r\n                    <span class="color-swatch" data-color="#be185d" title="#be185d" style="background:#be185d"></span>\r\n                    <span class="color-swatch" data-color="#6b7280" title="#6b7280" style="background:#6b7280"></span>\r\n                    <span class="color-swatch" data-color="#374151" title="#374151" style="background:#374151"></span>\r\n                    <span class="color-swatch" data-color="#1f2937" title="#1f2937" style="background:#1f2937"></span>\r\n                    <span class="color-swatch" data-color="#ffffff" title="#ffffff" style="background:#ffffff"></span>\r\n                    <span class="color-swatch" data-color="#000000" title="#000000" style="background:#000000"></span>\r\n                </div>`

app = replaceOnce(app, oldWhPalette, expandedPaletteHtml('wt'), 'app: warehouse expanded palette')

// ═══════════════════════════════════════
// PART 2: 替换冶炼厂类型调色板
// ═══════════════════════════════════════

const oldFtPalette = `<div class="color-palette" id="ft-color-palette" style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0">\r\n                    <span class="color-swatch" data-color="#ef4444" title="#ef4444" style="background:#ef4444"></span>\r\n                    <span class="color-swatch" data-color="#dc2626" title="#dc2626" style="background:#dc2626"></span>\r\n                    <span class="color-swatch" data-color="#b91c1c" title="#b91c1c" style="background:#b91c1c"></span>\r\n                    <span class="color-swatch" data-color="#f97316" title="#f97316" style="background:#f97316"></span>\r\n                    <span class="color-swatch" data-color="#ea580c" title="#ea580c" style="background:#ea580c"></span>\r\n                    <span class="color-swatch" data-color="#d97706" title="#d97706" style="background:#d97706"></span>\r\n                    <span class="color-swatch" data-color="#eab308" title="#eab308" style="background:#eab308"></span>\r\n                    <span class="color-swatch" data-color="#f59e0b" title="#f59e0b" style="background:#f59e0b"></span>\r\n                    <span class="color-swatch" data-color="#84cc16" title="#84cc16" style="background:#84cc16"></span>\r\n                    <span class="color-swatch" data-color="#22c55e" title="#22c55e" style="background:#22c55e"></span>\r\n                    <span class="color-swatch" data-color="#16a34a" title="#16a34a" style="background:#16a34a"></span>\r\n                    <span class="color-swatch" data-color="#15803d" title="#15803d" style="background:#15803d"></span>\r\n                    <span class="color-swatch" data-color="#14b8a6" title="#14b8a6" style="background:#14b8a6"></span>\r\n                    <span class="color-swatch" data-color="#0891b2" title="#0891b2" style="background:#0891b2"></span>\r\n                    <span class="color-swatch" data-color="#0e7490" title="#0e7490" style="background:#0e7490"></span>\r\n                    <span class="color-swatch" data-color="#3b82f6" title="#3b82f6" style="background:#3b82f6"></span>\r\n                    <span class="color-swatch" data-color="#2563eb" title="#2563eb" style="background:#2563eb"></span>\r\n                    <span class="color-swatch" data-color="#1d4ed8" title="#1d4ed8" style="background:#1d4ed8"></span>\r\n                    <span class="color-swatch" data-color="#8b5cf6" title="#8b5cf6" style="background:#8b5cf6"></span>\r\n                    <span class="color-swatch" data-color="#7c3aed" title="#7c3aed" style="background:#7c3aed"></span>\r\n                    <span class="color-swatch" data-color="#6d28d9" title="#6d28d9" style="background:#6d28d9"></span>\r\n                    <span class="color-swatch" data-color="#ec4899" title="#ec4899" style="background:#ec4899"></span>\r\n                    <span class="color-swatch" data-color="#db2777" title="#db2777" style="background:#db2777"></span>\r\n                    <span class="color-swatch" data-color="#be185d" title="#be185d" style="background:#be185d"></span>\r\n                    <span class="color-swatch" data-color="#6b7280" title="#6b7280" style="background:#6b7280"></span>\r\n                    <span class="color-swatch" data-color="#374151" title="#374151" style="background:#374151"></span>\r\n                    <span class="color-swatch" data-color="#1f2937" title="#1f2937" style="background:#1f2937"></span>\r\n                    <span class="color-swatch" data-color="#ffffff" title="#ffffff" style="background:#ffffff"></span>\r\n                    <span class="color-swatch" data-color="#000000" title="#000000" style="background:#000000"></span>\r\n                </div>`

app = replaceOnce(app, oldFtPalette, expandedPaletteHtml('ft'), 'app: smelter expanded palette')

// ═══════════════════════════════════════
// PART 3: 添加原生取色器 + 更新 placeholder
// ═══════════════════════════════════════

// 在 text input 前插入原生取色器
const oldWhInput = `                </div>\r\n                <input type="text" id="wt-color" class="form-control" placeholder="#RRGGBB，或从上方调色板选色；留空为黑色">\r\n                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>`
const newWhInput = `                </div>\r\n                <div style="display:flex;align-items:center;gap:8px;margin-top:4px">\r\n                    <input type="color" id="wt-color-native" class="color-native-input" title="打开系统取色器">\r\n                    <input type="text" id="wt-color" class="form-control" placeholder="#RRGGBB，手输或从调色板/取色器选色；留空为黑色" style="flex:1">\r\n                </div>\r\n                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>`

app = replaceOnce(app, oldWhInput, newWhInput, 'app: warehouse native color input')

const oldFtInput = `                </div>\r\n                <input type="text" id="ft-color" class="form-control" placeholder="#RRGGBB，或从上方调色板选色；留空为黑色">\r\n                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>`
const newFtInput = `                </div>\r\n                <div style="display:flex;align-items:center;gap:8px;margin-top:4px">\r\n                    <input type="color" id="ft-color-native" class="color-native-input" title="打开系统取色器">\r\n                    <input type="text" id="ft-color" class="form-control" placeholder="#RRGGBB，手输或从调色板/取色器选色；留空为黑色" style="flex:1">\r\n                </div>\r\n                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>`

app = replaceOnce(app, oldFtInput, newFtInput, 'app: smelter native color input')

// ═══════════════════════════════════════
// PART 4: 替换接线函数
// ═══════════════════════════════════════

const oldWireWh = `function WtWireColorControls() {\r\n    var t = document.getElementById(\`wt-color\`),\r\n        n = document.getElementById(\`wt-color-preview\`),\r\n        p = document.getElementById(\`wt-color-palette\`);\r\n    if (!t) return;\r\n    if (t.dataset.wtWiredPal) return;\r\n    t.dataset.wtWiredPal = \`1\`;\r\n    function r() {\r\n        var e = (t.value || \`\`).trim(),\r\n            i = WtSafeCssColor(e);\r\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`));\r\n        if (p) {\r\n            var a = p.querySelectorAll(\`.color-swatch\`);\r\n            for (var s = 0; s < a.length; s++) {\r\n                var sw = a[s], c = sw.getAttribute(\`data-color\`) || \`\`;\r\n                sw.classList.toggle(\`active\`, c.toLowerCase() === e.toLowerCase());\r\n            }\r\n        }\r\n    }\r\n    p && p.addEventListener(\`click\`, function(e) {\r\n        var sw = e.target.closest(\`.color-swatch\`);\r\n        if (!sw) return;\r\n        var c = sw.getAttribute(\`data-color\`) || \`\`;\r\n        t.value = c, r()\r\n    });\r\n    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, r), r()\r\n}`

app = replaceOnce(app, oldWireWh, wireColorFn(''), 'app: WtWireColorControls v2')

const oldWireFt = `function WtWireFactoryColorControls() {\r\n    var t = document.getElementById(\`ft-color\`),\r\n        n = document.getElementById(\`ft-color-preview\`),\r\n        p = document.getElementById(\`ft-color-palette\`);\r\n    if (!t) return;\r\n    if (t.dataset.ftWiredPal) return;\r\n    t.dataset.ftWiredPal = \`1\`;\r\n    function r() {\r\n        var e = (t.value || \`\`).trim(),\r\n            i = WtSafeCssColor(e);\r\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`));\r\n        if (p) {\r\n            var a = p.querySelectorAll(\`.color-swatch\`);\r\n            for (var s = 0; s < a.length; s++) {\r\n                var sw = a[s], c = sw.getAttribute(\`data-color\`) || \`\`;\r\n                sw.classList.toggle(\`active\`, c.toLowerCase() === e.toLowerCase());\r\n            }\r\n        }\r\n    }\r\n    p && p.addEventListener(\`click\`, function(e) {\r\n        var sw = e.target.closest(\`.color-swatch\`);\r\n        if (!sw) return;\r\n        var c = sw.getAttribute(\`data-color\`) || \`\`;\r\n        t.value = c, r()\r\n    });\r\n    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, r), r()\r\n}`

app = replaceOnce(app, oldWireFt, wireColorFn('Factory'), 'app: WtWireFactoryColorControls v2')

fs.writeFileSync(appPath, app)

// ═══════════════════════════════════════
// PART 5: CSS — 添加原生取色器样式
// ═══════════════════════════════════════

const nativeColorCSS = `
  .color-native-input {
    width: 36px; height: 36px; padding: 2px; border: 1px solid #cbd5e1;
    border-radius: 6px; cursor: pointer; background: #fff;
    flex-shrink: 0;
  }
  .color-native-input::-webkit-color-swatch-wrapper { padding: 2px; }
  .color-native-input::-webkit-color-swatch { border-radius: 4px; border: none; }
  .color-native-input::-moz-color-swatch { border-radius: 4px; border: none; }
`

// 使用唯一锚点（已有调色板 CSS 之后）
html = replaceOnce(html,
  `.color-swatch[data-color="#ffffff"].active { border-color:#0f172a; }`,
  `.color-swatch[data-color="#ffffff"].active { border-color:#0f172a; }` + nativeColorCSS,
  'html: native color input CSS')

fs.writeFileSync(htmlPath, html)

console.log('patch-color-palette-v2: ' + ok.length + ' patches applied')
ok.forEach(s => console.log('  OK: ' + s))
