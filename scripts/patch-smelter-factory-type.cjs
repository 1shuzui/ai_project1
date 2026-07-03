/**
 * 冶炼厂管理：新增「冶炼厂类型维护」功能（与库房类型维护模式一致）
 * Run: node scripts/patch-smelter-factory-type.cjs
 */
const fs = require('fs')
const path = require('path')

const appPath = path.join(__dirname, '../public/embedded/price_system/assets/app-BZHDhlyu.js')
const indexPath = path.join(__dirname, '../public/embedded/price_system/assets/index-e7CRb-gt.js')
const htmlPath = path.join(__dirname, '../public/embedded/price_system/index.html')

let app = fs.readFileSync(appPath, 'utf8')
let index = fs.readFileSync(indexPath, 'utf8')
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
// PART 1: index-e7CRb-gt.js — 模板层
// ═══════════════════════════════════════

// 1a. 冶炼厂管理 header 按钮行：在"新增冶炼厂"前插入"冶炼厂类型维护"按钮
index = replaceOnce(index,
  `class="btn btn-primary" id="add-smelter-btn"`,
  `class="btn btn-outline" id="smelter-types-modal-btn"><i class="fas fa-tags"></i> 冶炼厂类型维护 </button><button class="btn btn-primary" id="add-smelter-btn"`,
  'index: smelter types btn')

// 1b. 冶炼厂表格 thead：在"地址"列前插入"冶炼厂类型"列
index = replaceOnce(index,
  `<th data-v-4b5a159b>地址</th>`,
  `<th data-v-4b5a159b>冶炼厂类型</th><th data-v-4b5a159b>地址</th>`,
  'index: smelter type th')

fs.writeFileSync(indexPath, index)

// ═══════════════════════════════════════
// PART 2: app-BZHDhlyu.js — 逻辑层
// ═══════════════════════════════════════

// 2a. Le() 初始化 — 在 smelter-search 前插入 smelter-types-modal-btn 监听
app = replaceOnce(app,
  `let n = document.getElementById(\`smelter-search\`);\r\n    n && (n.addEventListener(\`input\`, function() {\r\n        \$(this.value)\r\n    }), n.addEventListener(\`keydown\`, function(e) {\r\n        e.key === \`Enter\` && (e.preventDefault(), \$(this.value))\r\n    })), W()`,
  `var i = document.getElementById(\`smelter-types-modal-btn\`);\r\n    i && i.addEventListener(\`click\`, function() {\r\n        vtOpenFactoryTypesModal()\r\n    });\r\n    let n = document.getElementById(\`smelter-search\`);\r\n    n && (n.addEventListener(\`input\`, function() {\r\n        \$(this.value)\r\n    }), n.addEventListener(\`keydown\`, function(e) {\r\n        e.key === \`Enter\` && (e.preventDefault(), \$(this.value))\r\n    })), W()`,
  'app: Le() btn handler')

// 2b. Ke() 表单 — 在地址前插入类型下拉框
app = replaceOnce(app,
  `<label for="smelter-address">地址</label>\r\n                <input type="text" id="smelter-address" class="form-control" placeholder="省市区街道门牌等（可选）">`,
  `<label for="smelter-type-select">冶炼厂类型</label>\r\n                <select id="smelter-type-select" class="form-control">\r\n                    <option value="">不指定</option>\r\n                </select>\r\n            </div>\r\n            <div class="form-group">\r\n                <label for="smelter-address">地址</label>\r\n                <input type="text" id="smelter-address" class="form-control" placeholder="省市区街道门牌等（可选）">`,
  'app: Ke() form type select')

// 2c. Qe() 保存 — 读取类型 select 加入 payload
app = replaceOnce(app,
  `let r = document.getElementById(\`smelter-address\`),\r\n        i = r && r.value.trim(),\r\n        a = {\r\n            冶炼厂名: n\r\n        };`,
  `let r = document.getElementById(\`smelter-address\`),\r\n        i = r && r.value.trim(),\r\n        c = document.getElementById(\`smelter-type-select\`),\r\n        d = c ? parseInt(c.value, 10) : NaN,\r\n        u = c && c.selectedOptions && c.selectedOptions[0] ? String(c.selectedOptions[0].textContent || \`\`).replace(/^\\[停用\\]\\s*/, \`\`).trim() : \`\`,\r\n        a = {\r\n            冶炼厂名: n\r\n        };\r\n    if (!isNaN(d) && d >= 1) a.冶炼厂类型id = d;\r\n    if (u) a.冶炼厂类型名 = u;`,
  'app: Qe() save type')

// 2d. $e() 编辑 — onOpen 里加载类型下拉框 + 预选
app = replaceOnce(app,
  `document.getElementById(\`smelter-name\`).value = C(n) || \`\`;\r\n                var t = document.getElementById(\`smelter-address\`);\r\n                t && (t.value = Aa(n) || \`\`)`,
  `document.getElementById(\`smelter-name\`).value = C(n) || \`\`;\r\n                var t = document.getElementById(\`smelter-address\`);\r\n                t && (t.value = Aa(n) || \`\`);\r\n                var s = document.getElementById(\`smelter-type-select\`);\r\n                s && ltFactoryTypes(s, v(n, [\`冶炼厂类型id\`, \`factory_type_id\`, \`type_id\`]))`,
  'app: $e() edit load type')

// Also make onOpen async
app = replaceOnce(app,
  `onOpen: function() {\r\n                document.getElementById(\`smelter-name\`).value = C(n) || \`\`;\r\n                var t = document.getElementById(\`smelter-address\`);\r\n                t && (t.value = Aa(n) || \`\`);\r\n                var s = document.getElementById(\`smelter-type-select\`);\r\n                s && ltFactoryTypes(s, v(n, [\`冶炼厂类型id\`, \`factory_type_id\`, \`type_id\`]))`,
  `onOpen: async function() {\r\n                document.getElementById(\`smelter-name\`).value = C(n) || \`\`;\r\n                var t = document.getElementById(\`smelter-address\`);\r\n                t && (t.value = Aa(n) || \`\`);\r\n                var s = document.getElementById(\`smelter-type-select\`);\r\n                s && await ltFactoryTypes(s, v(n, [\`冶炼厂类型id\`, \`factory_type_id\`, \`type_id\`]))`,
  'app: $e() async onOpen')

// 2e. W() 数据映射 — 增加 typeName / typeId
app = replaceOnce(app,
  `id: S(e),\r\n                name: C(e),\r\n                address: Aa(e),\r\n                createdAt: x(e)`,
  `id: S(e),\r\n                name: C(e),\r\n                address: Aa(e),\r\n                typeName: readSmTypeName(e),\r\n                typeId: readSmTypeId(e),\r\n                createdAt: x(e)`,
  'app: W() data map type')

// 2f. $() 列表行渲染 — 增加类型列
app = replaceOnce(app,
  `<td>\${e.id}</td>\r\n            <td>\${M(e.name)}</td>\r\n            <td>\${M(e.address||\`-\`)}</td>`,
  `<td>\${e.id}</td>\r\n            <td>\${M(e.name)}</td>\r\n            <td>\${M(e.typeName||\`-\`)}</td>\r\n            <td>\${M(e.address||\`-\`)}</td>`,
  'app: $() list row type')

// 2g. 新增冶炼厂按钮 — onOpen 加载类型下拉
app = replaceOnce(app,
  `U(\`新增冶炼厂\`, Ke(), {\r\n            onConfirm: function() {\r\n                return Qe(null)\r\n            }\r\n        })`,
  `U(\`新增冶炼厂\`, Ke(), {\r\n            onOpen: async function() {\r\n                var s = document.getElementById(\`smelter-type-select\`);\r\n                s && await ltFactoryTypes(s, null)\r\n            },\r\n            onConfirm: function() {\r\n                return Qe(null)\r\n            }\r\n        })`,
  'app: add smelter onOpen load types')

// 2h. 辅助函数 readSmTypeName / readSmTypeId — 插入在 wa() 后面
app = replaceOnce(app,
  `function wa(e) {\r\n    var t = _(e, [\`类型\`, \`类型名\`, \`warehouse_type_name\`, \`type_name\`, \`名称\`], \`\`);\r\n    return t == null || t === \`\` ? \`-\` : String(t)\r\n}`,
  `function wa(e) {\r\n    var t = _(e, [\`类型\`, \`类型名\`, \`warehouse_type_name\`, \`type_name\`, \`名称\`], \`\`);\r\n    return t == null || t === \`\` ? \`-\` : String(t)\r\n}\r\nfunction readSmTypeName(e) {\r\n    var t = _(e, [\`冶炼厂类型\`, \`factory_type\`, \`冶炼厂类型名\`, \`factory_type_name\`], \`\`);\r\n    return t == null || t === \`\` ? \`-\` : String(t)\r\n}\r\nfunction readSmTypeId(e) {\r\n    return v(e, [\`冶炼厂类型id\`, \`factory_type_id\`, \`type_id\`])\r\n}`,
  'app: readSmTypeName/readSmTypeId helpers')

// 2i. 冶炼厂类型全套 CRUD — 在 ItType 函数后面插入
const factoryTypeFuncs = `\r\nfunction vtOpenFactoryTypesModal() {\r\n    U(\`冶炼厂类型维护\`, UtFactoryModalBody(), {\r\n        onOpen: async function() {\r\n            var e = document.getElementById(\`ft-modal-add-btn\`);\r\n            e && (e.onclick = function(e) {\r\n                e.preventDefault(), e.stopPropagation(), U(\`新增冶炼厂类型\`, $eFactoryType(), {\r\n                    onOpen: function() {\r\n                        WtWireFactoryColorControls()\r\n                    },\r\n                    onConfirm: function() {\r\n                        return QtFactoryType(null)\r\n                    }\r\n                })\r\n            });\r\n            var t = document.getElementById(\`factory-type-table-body\`);\r\n            t && !t.dataset.ftDlg && (t.dataset.ftDlg = \`1\`, t.addEventListener(\`click\`, function(e) {\r\n                var n = e.target.closest(\`.ft-edit-btn\`),\r\n                    r = e.target.closest(\`.ft-del-btn\`);\r\n                n ? jtFactoryType(parseInt(n.getAttribute(\`data-id\`), 10)) : r && ItFactoryType(parseInt(r.getAttribute(\`data-id\`), 10))\r\n            })), await ptFactoryTypes()\r\n        },\r\n        onConfirm: function() {\r\n            return !0\r\n        }\r\n    })\r\n}\r\n\r\nfunction UtFactoryModalBody() {\r\n    return \`\r\n        <div class="warehouse-types-modal-inner">\r\n            <button type="button" class="btn btn-primary btn-sm mb-2" id="ft-modal-add-btn"><i class="fas fa-plus"></i> 新增冶炼厂类型</button>\r\n            <p class="text-muted small mb-2">共 <span id="factory-type-count">0</span> 条</p>\r\n            <div class="table-responsive" style="max-height:380px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;">\r\n                <table class="data-table" style="width:100%;margin:0"><thead><tr><th>类型ID</th><th>类型名</th><th>颜色</th><th>状态</th><th>操作</th></tr></thead><tbody id="factory-type-table-body"></tbody></table>\r\n            </div>\r\n            <p class="text-muted small mb-0 mt-2">类型与颜色供冶炼厂列表展示；停用后新建冶炼厂不可选。点击下方「确认」关闭本窗口。</p>\r\n        </div>\r\n    \`\r\n}\r\n\r\nfunction $eFactoryType() {\r\n    return \`\r\n        <form id="factory-type-form">\r\n            <div class="form-group">\r\n                <label for="ft-type-name">类型名 <span class="required">*</span></label>\r\n                <input type="text" id="ft-type-name" class="form-control" required>\r\n            </div>\r\n            <div class="form-group">\r\n                <label>颜色配置（可选）</label>\r\n                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0">\r\n                    <span id="ft-color-preview" title="预览" style="display:inline-block;width:28px;height:28px;border-radius:6px;border:1px solid #cbd5e1;background:#e2e8f0"></span>\r\n                    <select id="ft-color-vivid" class="form-control" style="max-width:150px">\r\n                        <option value="">选色…</option>\r\n                        <option value="#dc2626">红</option>\r\n                        <option value="#ea580c">橙</option>\r\n                        <option value="#eab308">黄</option>\r\n                        <option value="#16a34a">绿</option>\r\n                        <option value="#0891b2">青</option>\r\n                        <option value="#2563eb">蓝</option>\r\n                        <option value="#7c3aed">紫</option>\r\n                        <option value="#6b7280">灰色</option>\r\n                        <option value="#ffffff">白</option>\r\n                        <option value="#000000">黑</option>\r\n                    </select>\r\n                </div>\r\n                <input type="text" id="ft-color" class="form-control" placeholder="#RRGGBB，或从上方下拉选色；留空为黑色">\r\n                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>\r\n            </div>\r\n        </form>\r\n    \`\r\n}\r\n\r\nfunction WtWireFactoryColorControls() {\r\n    var e = document.getElementById(\`ft-color-vivid\`),\r\n        t = document.getElementById(\`ft-color\`),\r\n        n = document.getElementById(\`ft-color-preview\`);\r\n    WtEnsureVividGrayOption(e);\r\n    if (!t) return;\r\n    if (t.dataset.ftWired) return;\r\n    t.dataset.ftWired = \`1\`;\r\n    function r() {\r\n        var e = (t.value || \`\`).trim(),\r\n            i = WtSafeCssColor(e);\r\n        n && (n.style.cssText = \`display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:\` + (i || \`#e2e8f0\`))\r\n    }\r\n    function i() {\r\n        var n = (t.value || \`\`).trim();\r\n        if (e) {\r\n            var a = e.value;\r\n            if (a && n) {\r\n                var o = n.toLowerCase();\r\n                for (var s = 0; s < e.options.length; s++)\r\n                    if (String(e.options[s].value).toLowerCase() === o) {\r\n                        e.options[s].selected = !0;\r\n                        return\r\n                    }\r\n            }\r\n            if (a && !n) return\r\n        }\r\n    }\r\n    t.addEventListener(\`input\`, r), t.addEventListener(\`change\`, function() { r(), i() }), e && e.addEventListener(\`change\`, function() {\r\n        var n = e.value;\r\n        n && (t.value = n, r())\r\n    }), r(), i()\r\n}\r\n\r\nasync function ptFactoryTypes() {\r\n    let e = document.getElementById(\`factory-type-table-body\`),\r\n        t = document.getElementById(\`factory-type-count\`);\r\n    if (!e) return;\r\n    E(e, 5, \`正在加载冶炼厂类型...\`);\r\n    try {\r\n        let n = await Api.request(\`GET\`, \`/tl/get_factory_types?include_inactive=false\`),\r\n            r = function(e) {\r\n                var t = [],\r\n                    n = new Set;\r\n                return e.forEach(function(e) {\r\n                    var r = v(e, [\`类型id\`, \`id\`, \`type_id\`]);\r\n                    r != null && !isNaN(r) && !n.has(String(r)) && (n.add(String(r)), t.push(e))\r\n                }), t\r\n            }(Api.unwrapList(n));\r\n        e.innerHTML = \`\`, r.length || D(e, 5, \`暂无冶炼厂类型，请点击「新增冶炼厂类型」\`), r.forEach(function(t) {\r\n            var n = v(t, [\`类型id\`, \`id\`, \`type_id\`]),\r\n                r = _(t, [\`类型名\`, \`name\`, \`类型名称\`], \`\`),\r\n                i = readSmTypeColor(t),\r\n                a = t.is_active === !1 || t.is_active === 0 || t.is_active === \`0\`,\r\n                c = WtSafeCssColor(i && i !== \`-\` ? String(i).trim() : \`\`),\r\n                o = \`<span style="display:inline-block;width:22px;height:22px;border-radius:4px;vertical-align:middle;border:1px solid #ccc;background:\` + (c || \`#e2e8f0\`) + \`" title="\` + M(String(i)) + \`"></span> \`,\r\n                s = document.createElement(\`tr\`);\r\n            s.innerHTML = \`\r\n            <td>\` + String(n) + \`</td>\r\n            <td>\` + M(r || \`-\`) + \`</td>\r\n            <td>\` + o + M(i) + \`</td>\r\n            <td>\` + (a ? \`<span class="text-muted">停用</span>\` : \`<span class="text-success">启用</span>\`) + \`</td>\r\n            <td>\r\n                <button type="button" class="btn btn-sm btn-outline ft-edit-btn" data-id="\` + String(n) + \`">编辑</button>\r\n                <button type="button" class="btn btn-sm btn-danger ft-del-btn" data-id="\` + String(n) + \`">删除</button>\r\n            </td>\`, e.appendChild(s)\r\n        }), t && (t.textContent = String(r.length))\r\n    } catch (n) {\r\n        console.error(n), e.innerHTML = \`\`, D(e, 5, n && n.message ? String(n.message) : \`加载失败\`)\r\n    }\r\n}\r\n\r\nfunction readSmTypeColor(e) {\r\n    var t = e[\`颜色配置\`];\r\n    if (t != null && typeof t === \`object\` && !Array.isArray(t)) {\r\n        var m = t.marker || t.color || \`\`;\r\n        if (m) return String(m)\r\n    }\r\n    var c = _(e, [\`颜色配置\`, \`color\`, \`颜色\`, \`color_config\`], \`\`);\r\n    return c == null || c === \`\` ? \`-\` : String(c)\r\n}\r\n\r\nasync function QtFactoryType(e) {\r\n    let t = document.getElementById(\`ft-type-name\`),\r\n        n = t && t.value.trim(),\r\n        r = document.getElementById(\`ft-color\`),\r\n        i = r && r.value.trim();\r\n    if (!n) throw Error(\`请填写类型名\`);\r\n    i || (i = \`#000000\`);\r\n    let a = {\r\n        类型名: n,\r\n        颜色配置: { marker: i }\r\n    };\r\n    e ? (a.类型id = Number(e), a.is_active = !0, await Api.request(\`POST\`, \`/tl/update_factory_type\`, a)) : await Api.request(\`POST\`, \`/tl/add_factory_type\`, a), await ptFactoryTypes()\r\n}\r\n\r\nfunction jtFactoryType(e) {\r\n    e && Api.request(\`GET\`, \`/tl/get_factory_types?include_inactive=false\`).then(function(t) {\r\n        let n = Api.unwrapList(t).find(function(t) {\r\n            return v(t, [\`类型id\`, \`id\`, \`type_id\`]) === Number(e)\r\n        });\r\n        if (!n) throw Error(\`未找到该冶炼厂类型\`);\r\n        U(\`编辑冶炼厂类型\`, $eFactoryType(), {\r\n            onOpen: function() {\r\n                var t = readSmTypeColor(n);\r\n                document.getElementById(\`ft-type-name\`).value = _(n, [\`类型名\`, \`name\`, \`类型名称\`], \`\`) || \`\`, document.getElementById(\`ft-color\`).value = t && t !== \`-\` ? t : \`\`, WtWireFactoryColorControls()\r\n            },\r\n            onConfirm: function() {\r\n                return QtFactoryType(e)\r\n            }\r\n        })\r\n    }).catch(function(e) {\r\n        alert(e.message || String(e))\r\n    })\r\n}\r\n\r\nasync function ItFactoryType(e) {\r\n    if (!(!e || !confirm(\`确认删除该冶炼厂类型？删除后已关联该类型的冶炼厂会自动取消关联。\`))) try {\r\n        await Api.request(\`DELETE\`, \`/tl/delete_factory_type?type_id=\` + encodeURIComponent(e)), await ptFactoryTypes()\r\n    } catch (e) {\r\n        alert(\`删除失败: \` + (e.message || String(e)))\r\n    }\r\n}\r\n\r\nasync function ltFactoryTypes(e, t) {\r\n    if (!e) return;\r\n    for (; e.options.length > 1;) e.remove(1);\r\n    try {\r\n        let n = await Api.request(\`GET\`, \`/tl/get_factory_types?include_inactive=false\`),\r\n            r = Api.unwrapList(n);\r\n        r.forEach(function(n) {\r\n            var r = v(n, [\`类型id\`, \`id\`, \`type_id\`]),\r\n                i = _(n, [\`类型名\`, \`name\`, \`类型名称\`], \`\`),\r\n                a = n.is_active === !1 || n.is_active === 0 || n.is_active === \`0\`;\r\n            if (r == null || isNaN(r)) return;\r\n            var o = document.createElement(\`option\`);\r\n            o.value = String(r), o.textContent = (a ? \`[停用] \` : \`\`) + String(i || \`类型#\` + r), t != null && Number(t) === Number(r) && (o.selected = !0), e.appendChild(o)\r\n        })\r\n    } catch (t) {\r\n        console.error(t)\r\n    }\r\n}`

app = replaceOnce(app,
  `function ItType(e) {\r\n    if (!(!e || !confirm(\`确认删除该库房类型？\`))) try {\r\n        await Api.request(\`DELETE\`, \`/tl/delete_warehouse_type?type_id=\` + encodeURIComponent(e)), await ptTypes()\r\n    } catch (e) {\r\n        alert(\`删除失败: \` + (e.message || String(e)))\r\n    }\r\n}`,
  `function ItType(e) {\r\n    if (!(!e || !confirm(\`确认删除该库房类型？\`))) try {\r\n        await Api.request(\`DELETE\`, \`/tl/delete_warehouse_type?type_id=\` + encodeURIComponent(e)), await ptTypes()\r\n    } catch (e) {\r\n        alert(\`删除失败: \` + (e.message || String(e)))\r\n    }\r\n}` + factoryTypeFuncs,
  'app: factory type CRUD funcs')

fs.writeFileSync(appPath, app)

// ═══════════════════════════════════════
// PART 3: index.html — 保存拦截逻辑
// ═══════════════════════════════════════

// 3a. smelter 保存：payload 中加入冶炼厂类型
html = replaceOnce(html,
  `const payload = { 冶炼厂名: name, 地址: address }\r\n            if (address) {`,
  `const typeSel = document.getElementById('smelter-type-select')\r\n            const typeId = Number(typeSel?.value || '')\r\n            const typeName = typeSel?.selectedOptions?.[0] ? String(typeSel.selectedOptions[0].textContent || '').replace(/^\\[停用\\]\\s*/, '').trim() : ''\r\n            const payload = { 冶炼厂名: name, 地址: address }\r\n            if (!isNaN(typeId) && typeId >= 1) payload['冶炼厂类型id'] = typeId\r\n            if (typeName) payload['冶炼厂类型名'] = typeName\r\n            if (address) {`,
  'html: smelter payload type')

fs.writeFileSync(htmlPath, html)

console.log('patch-smelter-factory-type: ' + ok.length + '/' + (ok.length + 0) + ' patches applied')
ok.forEach(s => console.log('  OK: ' + s))
