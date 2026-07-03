import {
    t as e
} from "./index-e7CRb-gt.js";
var t = [],
    n = !1,
    r = [],
    i = null,
    a = [],
    qE = [],
    qW = [],
    qS = [],
    qFW = [],
    qFJ = [],
    qFTW = [],
    o = {
        page: 1,
        pageSize: 50,
        total: 0
    },
    invPg = {
        page: 1,
        pageSize: 20,
        total: 0
    },
    rcpPg = {
        page: 1,
        pageSize: 20,
        total: 0
    },
    s = {},
    c = {},
    l = [`电动车电瓶`, `黑皮电瓶`, `管式电瓶`, `大白电瓶`, `摩托车电瓶`, `电子称电瓶`, `电信电瓶`, `AGM电瓶`, `电轿电瓶`, `小四斤电瓶`],
    u = new Set,
    d = new Set,
    f = [],
    p = {},
    m = {},
    h = null,
    g = [{
        label: `电动车电池`,
        keys: [`电动车电池`, `电动车电瓶`]
    }, {
        label: `黑皮电池`,
        keys: [`黑皮电池`, `黑皮电瓶`]
    }, {
        label: `管式电池`,
        keys: [`管式电池`, `管式电瓶`, `120管式`, `管式`]
    }, {
        label: `大白电池`,
        keys: [`大白电池`, `大白电瓶`, `汽车大白`]
    }, {
        label: `摩托车电池`,
        keys: [`摩托车原水`, `摩托车电池`, `摩托车电瓶`]
    }, {
        label: `电子秤电池`,
        keys: [`电子秤电池`, `电子秤电瓶`, `电子秤`, `电子称电瓶`, `电子称电池`, `电子称`]
    }, {
        label: `电信电池`,
        keys: [`电信电池`, `电信电瓶`, `电信`]
    }, {
        label: `AGM电池`,
        keys: [`agm电池`, `agm电瓶`, `agm`]
    }, {
        label: `电轿电池`,
        keys: [`电轿电池`, `电轿电瓶`, `电轿`]
    }, {
        label: `小四斤电池`,
        keys: [`小四斤电池`, `小四斤电瓶`, `小四斤`]
    }];

function _(e, t, n) {
    if (!e || typeof e != `object`) return n;
    for (var r = 0; r < t.length; r++) {
        var i = t[r];
        if (e[i] != null) return e[i]
    }
    return n
}

function v(e, t) {
    var n = _(e, t, void 0);
    if (n == null || n === ``) return null;
    var r = Number(n);
    return isNaN(r) ? null : r
}

function y(e) {
    if (e == null || e === ``) return `-`;
    var t = String(e).trim();
    return {
        "1pct": `1%增值税`,
        "3pct": `3%增值税`,
        "13pct": `13%增值税`,
        normal_invoice: `普通发票价`,
        reverse_invoice: `反向发票价`,
        base: `基准价（不含税）`
    } [t] || t
}

function b(e) {
    var t = String(e || ``).trim();
    return t.indexOf(`默认`) !== -1 || t.toLowerCase() === `default`
}

function x(e) {
    return !e || typeof e != `object` ? `-` : e.创建时间 || e.created_at || e.createdAt || e.create_time || e.创建日期 || `-`
}

function S(e) {
    return Number(_(e, [`冶炼厂id`, `冶炼厂Id`, `冶炼厂ID`, `id`, `factory_id`, `factoryId`], 0))
}

function C(e) {
    return String(_(e, [`冶炼厂`, `冶炼厂名`, `name`, `factory_name`, `factoryName`], ``))
}

function Aa(e) {
    return String(_(e, [`地址`, `address`, `详细地址`, `addr`], ``))
}

function splitCnAddress(e) {
    var t = String(e || ``).trim().replace(/\s+/g, ``);
    if (!t) return {
        省: ``,
        市: ``,
        区: ``
    };
    var n = ``,
        r = ``,
        i = ``,
        a = t.match(/^(北京市|上海市|天津市|重庆市)/);
    if (a) return {
        省: a[1],
        市: a[1],
        区: (function(e) {
            var t = e.match(/^(.*?(?:区|县|旗))/);
            return t ? t[1] : ``
        })(t.slice(a[1].length))
    };
    var o = t.match(/^(.*?(?:省|自治区|特别行政区))/);
    o && (n = o[1], t = t.slice(n.length));
    var s = t.match(/^(.*?(?:市|自治州|地区|盟))/);
    s && (r = s[1], t = t.slice(r.length));
    var c = t.match(/^(.*?(?:区|县|旗))/);
    if (c) i = c[1];
    else {
        var l = (n || ``) + (r || ``) + t,
            u = l.match(/(?:市|自治州|地区|盟)(.*?(?:区|县|旗))/);
        u && (i = u[1])
    }
    return r && r.indexOf(`市`) === -1 && String(e).indexOf(r + `市`) !== -1 && (r = r + `市`), {
        省: n,
        市: r,
        区: i
    }
}

function wa(e) {
    var t = _(e, [`类型`, `类型名`, `warehouse_type_name`, `type_name`, `名称`], ``);
    return t == null || t === `` ? `-` : String(t)
}
function readSmTypeName(e) {
    var t = _(e, [`冶炼厂类型`, `factory_type`, `冶炼厂类型名`, `factory_type_name`], ``);
    return t == null || t === `` ? `-` : String(t)
}
function readSmTypeId(e) {
    return v(e, [`冶炼厂类型id`, `factory_type_id`, `type_id`])
}

function xa(e) {
    var t = _(e, [`颜色配置`, `库房类型颜色配置`, `仓库颜色配置`, `color`, `颜色`, `color_config`], ``);
    return t == null || t === `` ? `-` : String(t)
}

function WtSafeCssColor(e) {
    var t = String(e || ``).trim();
    if (!t || t === `-`) return ``;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return t;
    if (/^rgb/i.test(t) && t.length <= 80) return t;
    if (/^hsl/i.test(t) && t.length <= 80) return t;
    return ``
}

function WtEnsureVividGrayOption(e) {
    if (!e || !e.options) return;
    for (var t = 0; t < e.options.length; t++)
        if (String(e.options[t].value).toLowerCase() === `#6b7280`) return;
    var n = document.createElement(`option`);
    n.value = `#6b7280`, n.textContent = `灰色`;
    for (var r = 0; r < e.options.length; r++)
        if (e.options[r].value === `#ffffff`) {
            e.insertBefore(n, e.options[r]);
            return
        } e.appendChild(n)
}

function WtWireColorControls() {
    var e = document.getElementById(`wt-color-vivid`),
        t = document.getElementById(`wt-color`),
        n = document.getElementById(`wt-color-preview`);
    WtEnsureVividGrayOption(e);
    if (!t) return;
    if (t.dataset.wtWired) return;
    t.dataset.wtWired = `1`;

    function r() {
        var e = (t.value || ``).trim(),
            i = WtSafeCssColor(e);
        n && (n.style.cssText = `display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:` + (i || `#e2e8f0`))
    }

    function i() {
        var n = (t.value || ``).trim();
        if (e) {
            e.selectedIndex = 0;
            for (var i = 1; i < e.options.length; i++)
                if (e.options[i].value === n) {
                    e.selectedIndex = i;
                    break
                }
        }
    }
    e && !e.dataset.wtWired && (e.dataset.wtWired = `1`, e.addEventListener(`change`, function() {
        this.value && (t.value = this.value), r()
    })), t.addEventListener(`input`, r), t.addEventListener(`change`, function() {
        i(), r()
    }), i(), r()
}

function Za(e) {
    var t = v(e, [`仓库类型id`, `warehouse_type_id`, `type_id`, `类型id`]);
    return t != null && !isNaN(t) ? t : null
}

function w(e) {
    return Number(_(e, [`仓库id`, `仓库Id`, `仓库ID`, `id`, `warehouse_id`, `warehouseId`], 0))
}

function T(e) {
    var t = String(_(e, [`仓库名`, `仓库`, `name`, `warehouse_name`, `warehouseName`], ``));
    return t.replace(/[（(][^）)]*[）)]\s*$/u, ``).trim()
}

function E(e, t, n) {
    e && (e.innerHTML = `<tr class="loading-row"><td colspan="` + String(t) + `">` + (n || `加载中...`) + `</td></tr>`)
}

function D(e, t, n) {
    e && (e.innerHTML = `<tr class="empty-row"><td colspan="` + String(t) + `">` + (n || `暂无数据`) + `</td></tr>`)
}

function O(e) {
    if (e == null || e === ``) return ``;
    var t = String(e).trim(),
        n = t.match(/^(\d{4}-\d{2}-\d{2})/);
    return n ? n[1] : (n = t.match(/^(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/), n ? n[1] + `-` + (`0` + n[2]).slice(-2) + `-` + (`0` + n[3]).slice(-2) : ``)
}

function k(e) {
    var t = String(e || ``).trim().toLowerCase();
    if (!t) return -1;
    t = t.replace(/\s+/g, ``).replace(/（/g, `(`).replace(/）/g, `)`);
    for (var n = 0; n < g.length; n++)
        if ((g[n].keys || []).some(function(e) {
                var n = String(e || ``).trim().toLowerCase().replace(/\s+/g, ``).replace(/（/g, `(`).replace(/）/g, `)`);
                return n ? t === n || t.indexOf(n) === 0 : !1
            })) return n;
    return -1
}

function ee(e) {
    return k(e) >= 0
}

function te(e) {
    return ee(e)
}

function ne(e) {
    var t = (e || []).filter(function(e) {
        var t = String(e.品类名 || ``).trim();
        return t && !b(t) && !j(t)
    });
    return t.sort(function(e, t) {
        var n = String(e.品类名 || ``),
            r = String(t.品类名 || ``),
            i = k(n),
            a = k(r);
        return i >= 0 && a >= 0 ? i - a : i >= 0 ? -1 : a >= 0 ? 1 : n.localeCompare(r, `zh-CN`)
    }), t
}

function A(e) {
    return String(e || ``).trim().toLowerCase().replace(/\s+/g, ``).replace(/（/g, `(`).replace(/）/g, `)`)
}
var re = [`电动 65ah 以下`, `新能源（电轿）`, `新能源（AGM）`, `黑皮（80ah 以下）`].map(function(e) {
    return A(e)
});

function j(e) {
    var t = String(e || ``).trim();
    if (!t) return !1;
    for (var n = t.split(/[、,;，]/), r = 0; r < n.length; r++) {
        var i = A(n[r]);
        if (i) {
            for (var a = 0; a < re.length; a++)
                if (i === re[a]) return !0
        }
    }
    return !1
}

function ie(e) {
    if (!e) return !1;
    if (j(e.name)) return !0;
    for (var t = e.aliases || [], n = 0; n < t.length; n++)
        if (j(t[n])) return !0;
    return !1
}

function M(e) {
    return String(e ?? ``).replace(/&/g, `&amp;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`).replace(/"/g, `&quot;`)
}

function N(e, t) {
    var n = String(t || ``).trim();
    !n || /全部/.test(n) || (e.add(A(n)), n.split(/[、,，;]/).forEach(function(t) {
        var n = A(t);
        n && e.add(n)
    }))
}

function ae(e) {
    if (e == null || e === ``) return [];
    if (Array.isArray(e)) return e.map(function(e) {
        return String(e || ``).trim()
    }).filter(Boolean);
    var t = String(e).trim();
    return t ? /[、,，;；]/.test(t) ? t.split(/[、,，;；]/).map(function(e) {
        return String(e).trim()
    }).filter(Boolean) : [t] : []
}

function oe(e) {
    if (!e || typeof e != `object`) return [];
    var t = ae(e.品类名称 == null ? e.品类名 : e.品类名称),
        n = _(e, [`别名`, `aliases`, `alias`, `別名`], ``);
    return n != null && n !== `` && ae(n).forEach(function(e) {
        e && t.indexOf(e) === -1 && t.push(e)
    }), t
}

function se(e) {
    return (e || []).map(function(e) {
        var t = oe(e);
        return {
            id: _(e, [`品类id`, `品类Id`, `id`], null),
            name: t[0] || ``,
            aliases: t.slice(1),
            createdAt: x(e)
        }
    }).filter(function(e) {
        return !ie(e)
    })
}

function ce(e, t) {
    return !e || !t || !t.keys ? !1 : t.keys.some(function(t) {
        var n = A(t);
        return n && (e === n || e.indexOf(n) === 0)
    })
}

function le(e, t) {
    if (t < 0 || t >= g.length) return !1;
    var n = g[t];
    if (ce(A(e.name), n)) return !0;
    for (var r = e.aliases || [], i = 0; i < r.length; i++)
        if (ce(A(r[i]), n)) return !0;
    return !1
}

function P(e, t) {
    for (var n = 0; n < e.length; n++)
        if (le(e[n], t)) return e[n];
    return null
}

function ue(e) {
    for (var t = [], n = 0; n < l.length; n++) {
        var r = P(e, n);
        r && t.push(r)
    }
    return t
}

function de() {
    u = new Set, l.forEach(function(e) {
        N(u, e)
    })
}
de();

function fe(e) {
    if (!e || !d || d.size === 0) return !1;
    for (var t = d.values(), n; !(n = t.next()).done;) {
        var r = n.value,
            i = c[r] || c[String(r)];
        if (!(!i || !i.length)) {
            for (var a = 0; a < i.length; a++)
                if (A(i[a]) === e) return !0
        }
    }
    return !1
}

function pe(e) {
    for (var t = String(e || ``), n = t.split(/[、,，;]/), r = 0; r < n.length; r++) {
        var i = n[r],
            a = A(i);
        if (a && fe(a) || a && u.has(a)) return !0
    }
    var o = A(t);
    return o && fe(o) ? !0 : !!(o && u.has(o))
}

function me(e) {
    if (e && e.length)
        for (var t = 0; t < l.length; t++) {
            var n = P(e, t);
            n && (N(u, n.name), (n.aliases || []).forEach(function(e) {
                N(u, e)
            }))
        }
    d && d.size && d.forEach(function(e) {
        var t = c[e] || c[String(e)];
        !t || !t.length || t.forEach(function(e) {
            N(u, e)
        })
    })
}

function F(e) {
    return _(e, [`品类`, `品类名`, `category_name`, `categoryName`, `电池名称`, `category`, `品名`, `名称`], ``)
}

function I(e) {
    if (!e || typeof e != `object`) return !1;
    var t = v(e, [`品类id`, `品类Id`, `category_id`, `categoryId`]);
    return t != null && !isNaN(t) && d && d.size > 0 && d.has(Number(t)) ? !0 : pe(F(e))
}

function he(e) {
    !e || !Array.isArray(e.items) || (e.items = e.items.filter(function(e) {
        return j(F(e)) ? !1 : I(e)
    }))
}

function ge(e) {
    !e || !Array.isArray(e.rows) || (e.rows = e.rows.filter(function(e) {
        return j(F(e)) ? !1 : I(e)
    }))
}

function _e(e) {
    var t = Array.isArray(e) ? e : [],
        n = {};
    t.forEach(function(e) {
        var t = v(e, [`品类id`, `品类Id`, `id`]);
        if (!(t == null || isNaN(t))) {
            var r = oe(e);
            r.length && (n[t] = r)
        }
    }), c = n, d = new Set, f = [], p = {}, m = {};
    var r = se(t);
    de();
    for (var i = new Set, a = 0; a < l.length; a++) {
        var o = P(r, a);
        if (o) {
            var s = Number(o.id);
            isNaN(s) || i.has(s) || (i.add(s), m[a] = s, d.add(s), f.push(s), p[s] = l[a])
        }
    }
    me(r)
}
async function L() {
    try {
        let e = await Api.request(`GET`, `/tl/get_category_mapping`),
            t = V(Api.unwrapData(e) || {}).list;
        _e(t)
    } catch (e) {
        console.warn(`refreshCategoryMappingLabelsByIdCache`, e)
    }
}

function ve(e) {
    var t = String(e || ``).trim();
    return t ? M(t) : `-`
}

function ye(e) {
    return Array.isArray(e) ? e : !e || typeof e != `object` ? [] : Array.isArray(e.data) ? e.data : Array.isArray(e.list) ? e.list : Array.isArray(e.rows) ? e.rows : Array.isArray(e.items) ? e.items : []
}

function be(e, t) {
    return t === `tax3` ? v(e, [`含3%税价`, `含3％税价`, `3%含税价`, `报价`, `报价金额`, `普通价`]) : v(e, [`基准价`, `报价`, `报价金额`, `普通价`, `资源报价`, `unit_price`])
}

function xe(e) {
    return v(e, [`总运费`, `运费`])
}

function Se(e, t) {
    if (!t || !Array.isArray(t.categoryIds) || !Array.isArray(t.weights)) return 0;
    var n = v(e, [`品类id`, `品类Id`, `category_id`, `categoryId`]);
    if (n != null) {
        var r = t.categoryIds.indexOf(Number(n));
        if (r >= 0) return Number(t.weights[r] || 0)
    }
    var i = String(_(e, [`品类`, `品类名`, `category_name`, `categoryName`], ``) || ``).trim();
    if (!i) return 0;
    for (var a = A(i), o = 0; o < t.categoryIds.length; o++) {
        var s = c[t.categoryIds[o]];
        if (s) {
            for (var l = 0; l < s.length; l++)
                if (A(s[l]) === a) return Number(t.weights[o] || 0)
        }
    }
    for (var u = 0; u < t.categoryIds.length; u++) {
        var d = t.categoryNames && t.categoryNames[u] ? String(t.categoryNames[u]) : ``;
        if (d) {
            if (d.indexOf(i) !== -1) return Number(t.weights[u] || 0);
            var f = d.split(`、`)[0].trim();
            if (f && (i === f || i.indexOf(f) !== -1 || f.indexOf(i) !== -1)) return Number(t.weights[u] || 0)
        }
    }
    return 0
}

function R(e, t) {
    if (!e || typeof e != `object`) return t ?? 0;
    for (var n = [`total`, `total_count`, `record_count`, `Total`, `count`, `nums`, `总数`, `条数`, `total_num`], r = 0; r < n.length; r++) {
        var i = e[n[r]];
        if (!(i == null || i === ``)) {
            var a = Number(i);
            if (!isNaN(a) && a >= 0) return a
        }
    }
    return t ?? 0
}

function z(e) {
    var t = e && typeof e == `object` ? e : {},
        n = Api.unwrapData(e);
    if (Array.isArray(n)) {
        var r = n;
        return {
            list: r,
            total: R(t, r.length)
        }
    }
    var i = V(n);
    if (i && i.list && i.list.length) {
        var a = R(t, null);
        a != null && a >= i.list.length && a > i.total && (i.total = a)
    }
    return i
}

function B(e) {
    if (!e || typeof e != `object`) return ``;
    var t = _(e, [`id`, `quote_detail_id`, `明细id`], null);
    return t != null && String(t).trim() !== `` ? `id:` + String(t) : [String(_(e, [`报价日期`, `日期`, `quote_date`, `date`], ``)), String(_(e, [`冶炼厂id`, `冶炼厂`, `factory_id`], ``)), String(_(e, [`品类名`, `品类`, `category_name`, `categoryName`], ``))].join(`|`)
}

function Ce(e) {
    var t = new URLSearchParams(e.toString());
    return t.delete(`品类id`), t.delete(`category_id`), t.delete(`category_name`), t
}

function we() {
    var e = [],
        t = document.getElementById(`category-filter`);
    if (t && t.options && t.options.length > 1)
        for (var n = 1; n < t.options.length; n++) {
            var r = String(t.options[n].value || ``).trim();
            r && r !== `undefined` && !isNaN(Number(r)) && e.push(Number(r))
        }
    if (e.length) return e;
    if (f && f.length) return f.slice();
    for (var i = [], a = 0; a < l.length; a++) {
        var o = m[a];
        o != null && !isNaN(Number(o)) && i.indexOf(Number(o)) === -1 && i.push(Number(o))
    }
    return i
}

function Te(e, t) {
    var n = String(_(e, [`报价日期`, `日期`, `quote_date`, `date`], ``) || ``);
    return String(_(t, [`报价日期`, `日期`, `quote_date`, `date`], ``) || ``).localeCompare(n, `zh-CN`)
}
async function Ee(e, t) {
    var n = new URLSearchParams(t.toString());
    n.set(`品类id`, String(e)), n.set(`category_id`, String(e));
    var r = c[e] || c[String(e)] || [];
    r.length && n.set(`category_name`, r.join(`、`));
    var i = (z(await Api.request(`GET`, `/tl/get_quote_details_list?` + n.toString())).list || []).slice();
    if (!i.length && !isNaN(e)) {
        var a = {};
        i.forEach(function(e) {
            a[B(e)] = e
        });
        for (var o = 0; o < r.length; o++) {
            var s = String(r[o] || ``).trim();
            if (s) {
                var l = new URLSearchParams(t.toString());
                l.delete(`品类id`), l.delete(`category_id`), l.set(`category_name`, s);
                try {
                    (z(await Api.request(`GET`, `/tl/get_quote_details_list?` + l.toString())).list || []).forEach(function(e) {
                        var t = B(e);
                        t && !a[t] && (a[t] = e)
                    })
                } catch (e) {
                    console.warn(`get_quote_details_list fallback`, s, e)
                }
            }
        }
        i = Object.keys(a).map(function(e) {
            return a[e]
        })
    }
    return i
}

function V(e) {
    if (Array.isArray(e)) return {
        list: e,
        total: e.length
    };
    if (!e || typeof e != `object`) return {
        list: [],
        total: 0
    };
    if (e.data && typeof e.data == `object` && !Array.isArray(e.data)) {
        var t = e.data;
        if (Array.isArray(t.list)) {
            var n = t.total == null ? NaN : Number(t.total),
                r = isNaN(n) ? R(e, t.list.length) : n;
            return {
                list: t.list,
                total: r
            }
        }
        if (Array.isArray(t.items)) {
            var i = t.total == null ? NaN : Number(t.total),
                a = isNaN(i) ? R(e, t.items.length) : i;
            return {
                list: t.items,
                total: a
            }
        }
    }
    if (Array.isArray(e.list)) {
        var o = e.total == null ? e.list.length : Number(e.total);
        return {
            list: e.list,
            total: isNaN(o) ? e.list.length : o
        }
    }
    if (Array.isArray(e.items)) {
        var s = e.total == null ? e.items.length : Number(e.total);
        return {
            list: e.items,
            total: isNaN(s) ? e.items.length : s
        }
    }
    if (Array.isArray(e.data)) {
        var c = e.data;
        return {
            list: c,
            total: R(e, c.length)
        }
    }
    for (var l = [`warehouses`, `categories`, `smelters`, `factories`, `rates`, `results`, `records`, `rows`, `mapping`], u = 0; u < l.length; u++) {
        var d = l[u];
        if (Array.isArray(e[d])) {
            var f = e[d];
            return {
                list: f,
                total: R(e, f.length)
            }
        }
    }
    return {
        list: [],
        total: 0
    }
}

function De() {
    n || (n = !0, console.log(`AI智能比价系统已加载`), Oe(), ke(), Ae(), H())
}
document.readyState === `loading` ? document.addEventListener(`DOMContentLoaded`, De) : De();

function Oe() {
    let e = new Date().toISOString().split(`T`)[0],
        t = document.getElementById(`current-date`);
    t && (t.textContent = e)
}

function ke() {
    let e = document.getElementById(`home-btn`);
    e && e.addEventListener(`click`, function() {
        H()
    })
}

function Ae() {
    document.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.module-card`);
        if (t) {
            e.preventDefault();
            let n = t.getAttribute(`data-page`);
            n && Me(n)
        }
    })
}

function H() {
    let t = document.getElementById(`home-template`),
        n = document.getElementById(`page-content`);
    if (!t) {
        console.error(`找不到首页模板`), n && (n.innerHTML = `<div class="error-message"><h3>首页未找到</h3><p>抱歉，首页模板不存在。</p></div>`);
        return
    }
    n && (n.innerHTML = t.innerHTML), e(function() {
        Fe(`home`), je(!0), typeof h == `function` && (h(), h = null)
    })
}

function je(e) {
    let t = document.getElementById(`home-btn`);
    t && (e ? t.classList.add(`active`) : t.classList.remove(`active`))
}

function Me(t) {
    let n = t + `-template`,
        r = document.getElementById(n),
        i = document.getElementById(`page-content`);
    if (!r) {
        console.error(`找不到模板:`, n), i && (i.innerHTML = `<div class="error-message"><h3>页面未找到</h3><p>抱歉，请求的页面不存在。</p></div>`);
        return
    }
    i && (i.innerHTML = r.innerHTML), e(function() {
        Pe(i), Fe(t), je(!1), Ie(t), Ne(t)
    })
}

function Ne(e) {
    typeof h == `function` && (h(), h = null);
    let t = function(t) {
        let n = t.target,
            r = n && n.tagName ? n.tagName.toLowerCase() : ``,
            i = r === `input` || r === `textarea` || r === `select`;
        if (t.altKey && (t.key === `h` || t.key === `H`)) {
            t.preventDefault(), H();
            return
        }
        if (t.ctrlKey && (t.key === `n` || t.key === `N`)) {
            let n = {
                    "smelter-management": `add-smelter-btn`,
                    "warehouse-management": `add-warehouse-btn`,
                    "freight-config": `add-freight-btn`,
                    "category-management": `add-category-btn`,
                    "inventory-management": `add-inv-btn`,
                    "receipt-price-management": `add-rcp-btn`,
                    "tax-config": `add-tax-config-btn`
                } [e],
                r = n ? document.getElementById(n) : null;
            r && (t.preventDefault(), r.click());
            return
        }
        if (!i && e === `smelter-management` && t.key === `/`) {
            let e = document.getElementById(`smelter-search`);
            e && (t.preventDefault(), e.focus(), e.select())
        }
    };
    document.addEventListener(`keydown`, t), h = function() {
        document.removeEventListener(`keydown`, t)
    }
}

function Pe(e) {
    let t = e.querySelector(`.page-content`);
    if (t) {
        let e = t.querySelector(`.page-header`);
        if (e && !e.querySelector(`.back-btn`)) {
            let t = document.createElement(`button`);
            t.className = `btn btn-outline back-btn`, t.innerHTML = `<i class="fas fa-arrow-left"></i> 返回首页`, t.addEventListener(`click`, function() {
                H()
            });
            let n = e.querySelector(`.header-actions`);
            if (n) n.appendChild(t);
            else {
                let n = document.createElement(`div`);
                n.className = `header-actions`, n.appendChild(t), e.appendChild(n)
            }
        }
    }
}

function Fe(e) {
    document.title = `AI智能比价系统 - ${{
        home: `首页`,
        "smelter-management": `冶炼厂管理`,
        "warehouse-management": `库房管理`,
        "freight-config": `运费配置`,
        "category-management": `回收品类管理`,
        "tax-config": `换算比例配置`,
        "quote-upload": `上传报价`,
        "quote-query": `报价查询`,
        "inventory-management": `当前库存管理`,
        "receipt-price-management": `收货价格管理`,
        "price-comparison": `智能比价工具`
    }[e] || `
    内部版`}`
}

function Ie(e) {
    switch (e) {
        case `smelter-management`:
            Le();
            break;
        case `warehouse-management`:
            Re();
            break;
        case `freight-config`:
            ze();
            break;
        case `category-management`:
            Be();
            break;
        case `tax-config`:
            Ve();
            break;
        case `quote-upload`:
            He();
            break;
        case `quote-query`:
            We();
            break;
        case `inventory-management`:
            initInventoryPage();
            break;
        case `receipt-price-management`:
            initReceiptPricePage();
            break;
        case `price-comparison`:
            Ge();
            break
    }
}

function Le() {
    console.log(`初始化冶炼厂管理页面`);
    let e = document.getElementById(`add-smelter-btn`);
    e && e.addEventListener(`click`, function() {
        U(`新增冶炼厂`, Ke(), {
            onOpen: async function() {
                var s = document.getElementById(`smelter-type-select`);
                s && await ltFactoryTypes(s, null)
            },
            onConfirm: function() {
                return Qe(null)
            }
        })
    });
    let t = document.getElementById(`smelter-table-body`);
    t && (t.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.edit-btn`),
            n = e.target.closest(`.delete-btn`);
        t ? $e(parseInt(t.getAttribute(`data-id`), 10)) : n && et(parseInt(n.getAttribute(`data-id`), 10))
    }), t.addEventListener(`dblclick`, function(e) {
        let t = e.target.closest(`tr`),
            n = t ? t.querySelector(`.edit-btn`) : null;
        n && n.click()
    }));
    var i = document.getElementById(`smelter-types-modal-btn`);
    i && i.addEventListener(`click`, function() {
        vtOpenFactoryTypesModal()
    });
    let n = document.getElementById(`smelter-search`);
    n && (n.addEventListener(`input`, function() {
        $(this.value)
    }), n.addEventListener(`keydown`, function(e) {
        e.key === `Enter` && (e.preventDefault(), $(this.value))
    })), W()
}

function Re() {
    console.log(`初始化库房管理页面`);
    let e = document.getElementById(`add-warehouse-btn`);
    e && e.addEventListener(`click`, function() {
        U(`新增库房`, qe(), {
            onOpen: async function() {
                var e = document.getElementById(`warehouse-type-select`),
                    t = document.getElementById(`warehouse-address`),
                    f = document.getElementById(`warehouse-form`);
                e && await ltTypes(e, null), t && (t.value = ``), f && (f.dataset.wProv = f.dataset.wCity = f.dataset.wDist = ``);
                [`warehouse-contact`, `warehouse-phone`, `warehouse-hazmat-permit-qty`, `warehouse-monthly-inbound`].forEach(function(id) {
                    var el = document.getElementById(id);
                    el && (el.value = ``)
                })
            },
            onConfirm: function() {
                return tt(null)
            }
        })
    });
    let t = document.getElementById(`warehouse-table-body`);
    t && (t.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.edit-btn`),
            n = e.target.closest(`.delete-btn`);
        t ? nt(parseInt(t.getAttribute(`data-id`), 10)) : n && rt(parseInt(n.getAttribute(`data-id`), 10))
    }), t.addEventListener(`dblclick`, function(e) {
        let t = e.target.closest(`tr`),
            n = t ? t.querySelector(`.edit-btn`) : null;
        n && n.click()
    }));
    var n = document.getElementById(`warehouse-search-keyword`),
        r = document.getElementById(`warehouse-search-btn`),
        i = document.getElementById(`warehouse-types-modal-btn`);
    i && i.addEventListener(`click`, function() {
        vtOpenTypesModal()
    }), r && r.addEventListener(`click`, function() {
        G()
    }), n && n.addEventListener(`keydown`, function(e) {
        e.key === `Enter` && (e.preventDefault(), G())
    }), G()
}

function ze() {
    console.log(`初始化运费配置页面`);
    let e = document.getElementById(`add-freight-btn`);
    e && e.addEventListener(`click`, function() {
        U(`新增运费配置`, Je(), {
            onOpen: async function() {
                await ct()
            },
            onConfirm: function() {
                return lt(null)
            }
        })
    });
    let t = document.getElementById(`download-freight-template-btn`);
    t && t.addEventListener(`click`, function() {
        mt()
    });
    let n = document.getElementById(`import-freight-btn`),
        r = document.getElementById(`freight-import-input`);
    n && r && (n.addEventListener(`click`, function() {
        r.click()
    }), r.addEventListener(`change`, function(e) {
        _t(e && e.target ? e.target.files : null), r.value = ``
    }));
    let i = document.getElementById(`freight-table-body`);
    i && i.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.edit-btn`),
            n = e.target.closest(`.delete-btn`);
        t ? dt(parseInt(t.getAttribute(`data-id`), 10)) : n && ft(parseInt(n.getAttribute(`data-id`), 10))
    });
    let a = document.getElementById(`freight-search-btn`);
    a && a.addEventListener(`click`, function() {
        o.page = 1, K()
    });
    let s = document.getElementById(`freight-reset-btn`);
    s && s.addEventListener(`click`, function() {
        at(), K()
    });
    let c = document.getElementById(`freight-prev-btn`);
    c && c.addEventListener(`click`, function() {
        o.page > 1 && (--o.page, K())
    });
    let l = document.getElementById(`freight-next-btn`);
    l && l.addEventListener(`click`, function() {
        o.page += 1, K()
    });
    let u = document.getElementById(`freight-page-size`);
    u && u.addEventListener(`change`, function() {
        o.pageSize = parseInt(this.value, 10) || 50, o.page = 1, K()
    });
    let whs = document.getElementById(`freight-filter-warehouse-search`);
    whs && whs.addEventListener(`focus`, function() {
        ftwApplyFilter()
    });
    whs && whs.addEventListener(`input`, function() {
        ftwApplyFilter()
    });
    document.addEventListener(`click`, function(e) {
        var _l = document.getElementById(`freight-filter-warehouse-list`),
            _s = document.getElementById(`freight-filter-warehouse-search`);
        if (_l && _s && !_s.contains(e.target) && !_l.contains(e.target)) _l.style.display = `none`
    });
    whs && whs.addEventListener(`keydown`, function(e) {
        if (e.key === `Enter`) {
            e.preventDefault();
            var list = document.getElementById(`freight-filter-warehouse-list`),
                btn = list && list.querySelector(`button[data-wh-id]:not([data-wh-id=""])`);
            btn ? btn.click() : ftwApplyFilter();
            o.page = 1, K()
        }
    }), it().then(function() {
        return K()
    }).catch(function() {
        K()
    })
}

function Be() {
    console.log(`初始化回收品类管理页面`);
    let e = document.getElementById(`add-category-btn`);
    e && e.addEventListener(`click`, function() {
        U(`新增回收品类`, Xe(), {
            onConfirm: function() {
                return yt(null)
            }
        })
    });
    let t = document.getElementById(`category-table-body`);
    t && (t.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.edit-btn`),
            n = e.target.closest(`.delete-btn`);
        t ? bt(parseInt(t.getAttribute(`data-id`), 10)) : n && xt(parseInt(n.getAttribute(`data-id`), 10))
    }), t.addEventListener(`dblclick`, function(e) {
        let t = e.target.closest(`tr`),
            n = t ? t.querySelector(`.edit-btn`) : null;
        n && n.click()
    })), q()
}

function Ve() {
    console.log(`初始化换算比例配置页面`);
    let e = document.getElementById(`add-tax-config-btn`);
    e && e.addEventListener(`click`, function() {
        U(`新增换算比例配置`, Ze(), {
            onOpen: async function() {
                await St()
            },
            onConfirm: function() {
                return wt(null)
            }
        })
    });
    let t = document.getElementById(`tax-config-table-body`);
    t && t.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.edit-btn`),
            n = e.target.closest(`.delete-btn`);
        t ? Tt(parseInt(t.getAttribute(`data-id`), 10)) : n && Et(parseInt(n.getAttribute(`data-id`), 10))
    }), J()
}

function He() {
    console.log(`初始化报价上传页面`);
    let q = document.getElementById(`goto-quote-query-btn`);
    q && q.addEventListener(`click`, function() {
        Me(`quote-query`)
    });
    let e = document.getElementById(`upload-btn`),
        t = document.getElementById(`file-input`),
        n = document.getElementById(`upload-area`);
    e && t && (e.addEventListener(`click`, function() {
        t.click()
    }), t.addEventListener(`change`, function(e) {
        Ot(e.target.files)
    })), n && (n.addEventListener(`dragover`, function(e) {
        e.preventDefault(), this.classList.add(`drag-over`)
    }), n.addEventListener(`dragleave`, function(e) {
        e.preventDefault(), this.classList.remove(`drag-over`)
    }), n.addEventListener(`drop`, function(e) {
        e.preventDefault(), this.classList.remove(`drag-over`), Ot(e.dataTransfer.files)
    }));
    let i = document.getElementById(`cancel-recognition`);
    i && i.addEventListener(`click`, function() {
        let e = document.getElementById(`recognition-results`);
        e && (e.style.display = `none`), r = []
    });
    let a = document.getElementById(`confirm-recognition`);
    a && a.addEventListener(`click`, async function() {
        await Ue()
    });
    let m = document.getElementById(`manual-quote-date`);
    m && (m.value = kt());
    let f = document.getElementById(`manual-quote-submit`);
    f && !f.dataset.manualQuoteSubmitWired && (f.dataset.manualQuoteSubmitWired = `1`, f.addEventListener(`click`, async function() {
        try {
            await Qn()
        } catch (e) {
            alert(e.message || String(e))
        }
    }));
    ns().catch(function(e) {
        console.error(e)
    }), loadManualCategorySelect().catch(function(e) {
        console.error(e)
    });
    let mBase = document.getElementById(`manual-base-price`),
        mTax3 = document.getElementById(`manual-tax3`),
        mTax13 = document.getElementById(`manual-tax13`);
    mBase && mTax3 && mTax13 && !mBase.dataset.taxFromBaseWired && (mBase.dataset.taxFromBaseWired = `1`, function() {
        var o = function() {
            var e = parseFloat(String(mBase.value || ``));
            if (isNaN(e) || e < 0) {
                mTax3.value = ``, mTax13.value = ``;
                return
            }
            var t = la(e);
            mTax3.value = t.t3 != null ? String(t.t3) : ``, mTax13.value = t.t13 != null ? String(t.t13) : ``
        };
        o(), mBase.addEventListener(`input`, o), mBase.addEventListener(`change`, o)
    }())
}
async function Qn() {
    await L();
    let e = document.getElementById(`manual-quote-date`),
        sel = document.getElementById(`manual-smelter-select`),
        n = document.getElementById(`manual-category-name`),
        r = document.getElementById(`manual-base-price`),
        a = document.getElementById(`manual-tax3`),
        o = document.getElementById(`manual-tax13`),
        s = e && e.value ? e.value.trim() : ``;
    if (!s) throw Error(`请选择报价日期`);
    let smelterId = sel ? parseInt(String(sel.value || ``).trim(), 10) : NaN;
    var smOpt = sel && sel.selectedOptions && sel.selectedOptions[0];
    let c = smOpt && smOpt.value ? String(smOpt.textContent || ``).trim() : ``;
    if (!smelterId || isNaN(smelterId) || smelterId <= 0 || !c) throw Error(`请选择冶炼厂`);
    let catId = NaN,
        l = ``;
    if (n && n.tagName === `SELECT`) {
        catId = parseInt(String(n.value || ``).trim(), 10);
        var catOpt = n.selectedOptions && n.selectedOptions[0];
        l = catOpt && catOpt.value ? String(catOpt.textContent || ``).trim() : ``
    } else l = n && n.value ? n.value.trim() : ``;
    if (!l || !catId || isNaN(catId)) throw Error(`请选择品种`);
    if (!I({
            品类id: catId,
            品类: l
        })) throw Error(`该品种不在系统管理的固定品种范围内，请先在「回收品类管理」中配置。`);
    let u = {
            冶炼厂id: smelterId,
            冶炼厂名: c,
            冶炼厂: c,
            factory_name: c,
            smelter_name: c,
            品类id: catId,
            品类名: l,
            品类: l,
            category_name: l,
            category_id: catId
        },
        d = r && r.value !== `` ? parseFloat(r.value) : NaN,
        f = a && a.value !== `` ? parseFloat(a.value) : NaN,
        p = o && o.value !== `` ? parseFloat(o.value) : NaN;
    isNaN(d) || At(u, d), isNaN(f) || jt(u, f), isNaN(p) || Mt(u, p);
    let m = {
        quote_date: s,
        报价日期: s
    };
    await Api.request(`POST`, `/tl/manual_quote`, {
        报价日期: s,
        full_data: m,
        数据: [u]
    }), alert(`手动录入已提交`), Me(`quote-query`)
}

function $n(e) {
    var t = v(e, [`id`, `quote_detail_id`, `明细id`]);
    if (t == null || isNaN(t)) return void alert(`当前行缺少明细 id，无法修改。`);
    var n = O(_(e, [`日期`, `报价日期`, `quote_date`, `date`], ``)) || kt(),
        r = v(e, [`冶炼厂id`, `factory_id`]),
        a = String(_(e, [`品类名`, `品类`, `category_name`, `categoryName`], ``)),
        o = v(e, [`普通价`, `基准价`, `价格`, `price`, `base_price`, `basePrice`, `资源报价`]),
        i = _(e, [`3%含税价`, `价格_3pct增值税`, `tax3_price`, `price_3pct_vat`], null),
        s = _(e, [`13%含税价`, `价格_13pct增值税`, `tax13_price`, `price_13pct_vat`], null),
        c = i == null ? null : Number(i),
        l = s == null ? null : Number(s);
    U(`更改报价`, `
<div class="form-group"><label>明细 id</label><input type="text" id="qedit-id" class="form-control" readonly></div>
<div class="form-group"><label>报价日期</label><input type="date" id="qedit-date" class="form-control"></div>
<div class="form-group"><label>冶炼厂 id</label><input type="number" id="qedit-fid" class="form-control" step="1" min="0" placeholder="可选"></div>
<div class="form-group"><label>品种名</label><input type="text" id="qedit-cat" class="form-control"></div>
<div class="form-group"><label>基准价</label><input type="number" id="qedit-base" class="form-control" step="0.01" min="0"></div>
<div class="form-group"><label>3%含税价</label><input type="number" id="qedit-t3" class="form-control" step="0.01" min="0"></div>
<div class="form-group"><label>13%含税价</label><input type="number" id="qedit-t13" class="form-control" step="0.01" min="0"></div>
`, {
        onOpen: function() {
            document.getElementById(`qedit-id`).value = String(t);
            document.getElementById(`qedit-date`).value = n;
            document.getElementById(`qedit-fid`).value = r != null && !isNaN(r) ? String(r) : ``;
            document.getElementById(`qedit-cat`).value = a;
            document.getElementById(`qedit-base`).value = o != null && !isNaN(o) ? String(o) : ``;
            document.getElementById(`qedit-t3`).value = c != null && !isNaN(c) ? String(c) : ``;
            document.getElementById(`qedit-t13`).value = l != null && !isNaN(l) ? String(l) : ``;
            setTimeout(function() {
                var b = document.getElementById(`qedit-base`),
                    e3 = document.getElementById(`qedit-t3`),
                    e13 = document.getElementById(`qedit-t13`);
                if (b && e3 && e13) {
                    var H = function() {
                        var v = parseFloat(String(b.value || ``));
                        if (isNaN(v) || v < 0) return;
                        var p = la(v);
                        e3.value = String(p.t3), e13.value = String(p.t13)
                    };
                    b.addEventListener(`input`, H), b.addEventListener(`change`, H)
                }
            }, 0)
        },
        onConfirm: async function() {
            var e = {
                    id: Number(document.getElementById(`qedit-id`).value)
                },
                n = document.getElementById(`qedit-date`).value.trim();
            n && (e.报价日期 = n);
            var o = parseInt(String(document.getElementById(`qedit-fid`).value).trim(), 10);
            !isNaN(o) && o > 0 && (e.冶炼厂id = o);
            var i = document.getElementById(`qedit-cat`).value.trim();
            i && (e.品类名 = i);
            var s = parseFloat(document.getElementById(`qedit-base`).value);
            !isNaN(s) && (e.价格 = s);
            var c = parseFloat(document.getElementById(`qedit-t3`).value);
            !isNaN(c) && (e[`3%含税价`] = c);
            var l = parseFloat(document.getElementById(`qedit-t13`).value);
            !isNaN(l) && (e[`13%含税价`] = l), await Api.request(`POST`, `/tl/update_quote_detail`, e), alert(`报价已更新`), await Z()
        }
    })
}
async function Jn(e) {
    var t = v(e, [`id`, `quote_detail_id`, `明细id`]);
    if (t == null || isNaN(t)) return void alert(`当前行缺少明细 id，无法删除。`);
    var n = _(e, [`冶炼厂`, `冶炼厂名`, `factory_name`, `smelterName`], ``) || `-`,
        r = F(e) || `-`;
    if (!confirm(`确定删除该条报价？\n冶炼厂：` + n + `\n品种：` + r)) return;
    try {
        await Api.request(`DELETE`, `/t1/quote_detail/` + String(t));
        var ix = qE.indexOf(e);
        ix >= 0 ? qE.splice(ix, 1) : qE = qE.filter(function(n) {
            return v(n, [`id`, `quote_detail_id`, `明细id`]) !== t
        }), X(qE, qE.length)
    } catch (e) {
        alert(`删除失败: ` + (e.message || String(e)))
    }
}
async function Ue() {
    if (!r.length) {
        alert(`请先上传并识别报价`);
        return
    }
    let e = (r[0] || {}).full_data || {};
    var t = document.querySelector(`#recognition-table-body .rec-row-date`),
        n = t && t.value ? t.value.trim() : ``;
    n ||= _(e, [`quote_date`, `报价日期`], ``) || kt(), Y(r, n);
    let i = [];
    if (r.forEach(function(e) {
            (e.items || []).forEach(function(e) {
                j(F(e)) || I(e) && i.push(e)
            })
        }), !i.length) {
        alert(`没有属于「固定十个品种（含别名）」的识别数据可提交。`);
        return
    }
    await Api.request(`POST`, `/tl/confirm_price_table`, {
        报价日期: n,
        full_data: e,
        数据: i
    }), alert(`报价写入成功`), Me(`quote-query`)
}

function We() {
    console.log(`初始化报价查询页面`);

    function _setDefaultDates() {
        var _sd = document.getElementById(`start-date`),
            _ed = document.getElementById(`end-date`);
        if (_sd && !_sd.value) {
            var _d = new Date();
            _ed && (_ed.value = _d.toISOString().slice(0, 10));
            _d.setDate(_d.getDate() - 30);
            _sd.value = _d.toISOString().slice(0, 10);
            return true
        }
        return false
    }
    if (!_setDefaultDates()) {
        setTimeout(_setDefaultDates, 300);
        setTimeout(_setDefaultDates, 800)
    }
    let u = document.getElementById(`goto-quote-upload-btn`);
    u && u.addEventListener(`click`, function() {
        Me(`quote-upload`)
    });
    let e = document.getElementById(`search-btn`);
    e && e.addEventListener(`click`, function() {
        Z()
    });
    let t = document.querySelector(`.quote-query-page .filter-form`);
    t && t.addEventListener(`keydown`, function(e) {
        e.key === `Enter` && (e.preventDefault(), Z())
    });
    let n = document.getElementById(`reset-filter`);
    n && n.addEventListener(`click`, function() {
        Lt()
    });
    let r = document.getElementById(`export-btn`);
    r && r.addEventListener(`click`, function() {
        Rt()
    });
    let a = document.getElementById(`quote-table-body`);
    a && a.addEventListener(`click`, function(e) {
        let t = e.target.closest(`.quote-edit-btn`);
        if (t) {
            let n = parseInt(t.getAttribute(`data-i`) || `-1`, 10);
            n < 0 || !qE || !qE[n] || $n(qE[n]);
            return
        }
        let d = e.target.closest(`.quote-delete-btn`);
        if (!d) return;
        let r = parseInt(d.getAttribute(`data-i`) || `-1`, 10);
        r < 0 || !qE || !qE[r] || Jn(qE[r])
    }), Ft().then(function() {
        return new Promise(function(e) {
            requestAnimationFrame(function() {
                e()
            })
        })
    }).then(function() {
        return Z()
    })
}

function Ge() {
    console.log(`初始化智能比价工具页面`);
    let e = document.getElementById(`calculate-btn`);
    e && e.addEventListener(`click`, function() {
        Q()
    });
    let t = document.getElementById(`comparison-type`);
    t && t.addEventListener(`change`, function() {
        Bt(), a && a.length && Q()
    });
    let nw = document.getElementById(`warehouse-select-filter`);
    nw && (nw.addEventListener(`input`, function() {
        Xt()
    }), nw.addEventListener(`focus`, function() {
        var el = document.getElementById(`warehouse-select-list`);
        el && (el.style.display = ``), Xt()
    })), zt()
}

function U(e, t, n) {
    n ||= {};
    let r = document.getElementById(`modal-template`);
    if (!r) return;
    var i;
    if (r.tagName === `TEMPLATE`) i = r.content.cloneNode(!0).querySelector(`.modal-overlay`), i && document.body.appendChild(i);
    else {
        var a = r.querySelector(`.modal-overlay`);
        if (!a) return;
        i = a.cloneNode(!0), document.body.appendChild(i)
    }
    if (!i) return;
    let o = i.querySelector(`#modal-title`),
        s = i.querySelector(`#modal-body`),
        c = i.querySelector(`#modal-close`),
        l = i.querySelector(`#modal-cancel`),
        u = i.querySelector(`#modal-confirm`);
    o && (o.textContent = e), s && (s.innerHTML = t);
    let d = function() {
        document.removeEventListener(`keydown`, f), i.parentNode && i.parentNode.removeChild(i)
    };
    c && c.addEventListener(`click`, d), l && l.addEventListener(`click`, d), u && u.addEventListener(`click`, async function() {
        if (!u.disabled)
            if (n.onConfirm) try {
                let e = u.textContent;
                u.disabled = !0, u.textContent = `处理中...`;
                let t = await n.onConfirm();
                u.disabled = !1, u.textContent = e, t !== !1 && d()
            } catch (e) {
                u.disabled = !1, u.textContent = `确认`, alert(e.message || String(e))
            } else d()
    }), i.addEventListener(`click`, function(e) {
        e.target === i && d()
    });
    let f = function(e) {
        if (e.key === `Escape`) {
            d();
            return
        }
        if (e.key === `Enter`) {
            let t = document.activeElement;
            (t && t.tagName ? t.tagName.toLowerCase() : ``) !== `textarea` && u && (e.preventDefault(), u.click())
        }
    };
    document.addEventListener(`keydown`, f), n.onOpen && Promise.resolve(n.onOpen()).catch(function(e) {
        alert(e.message || String(e))
    }), setTimeout(function() {
        let e = i.querySelector(`input, select, textarea`);
        e && typeof e.focus == `function` && e.focus()
    }, 0)
}

function Ke() {
    return `
        <form id="smelter-form">
            <div class="form-group">
                <label for="smelter-name">冶炼厂名称 <span class="required">*</span></label>
                <input type="text" id="smelter-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="smelter-type-select">冶炼厂类型</label>
                <select id="smelter-type-select" class="form-control">
                    <option value="">不指定</option>
                </select>
            </div>
            <div class="form-group">
                <label for="smelter-address">地址</label>
                <input type="text" id="smelter-address" class="form-control" placeholder="省市区街道门牌等（可选）">
            </div>
        </form>
    `
}

function qe() {
    return `
        <form id="warehouse-form">
            <div class="form-group">
                <label for="warehouse-name">库房名称 <span class="required">*</span></label>
                <input type="text" id="warehouse-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="warehouse-type-select">库房类型</label>
                <select id="warehouse-type-select" class="form-control">
                    <option value="">不指定</option>
                </select>
            </div>
            <div class="form-group">
                <label for="warehouse-address">库房地址</label>
                <input type="text" id="warehouse-address" class="form-control" placeholder="编辑时可只改街道门牌；省/市/区沿用本条已保存区划">
            </div>
            <div class="form-group">
                <label for="warehouse-contact">库房联系人</label>
                <input type="text" id="warehouse-contact" class="form-control" placeholder="可选">
            </div>
            <div class="form-group">
                <label for="warehouse-phone">电话</label>
                <input type="text" id="warehouse-phone" class="form-control" maxlength="20" inputmode="numeric" autocomplete="tel" placeholder="选填；填写时须 11 位数字（空格、横线可忽略）">
            </div>
            <div class="form-group">
                <label for="warehouse-hazmat-permit-qty">危废经营许可数量</label>
                <input type="number" id="warehouse-hazmat-permit-qty" class="form-control" step="1" min="0" placeholder="可选">
            </div>
            <div class="form-group">
                <label for="warehouse-monthly-inbound">月均收货</label>
                <input type="number" id="warehouse-monthly-inbound" class="form-control" step="0.01" min="0" placeholder="可选">
            </div>
        </form>
    `
}

function $eType() {
    return `
        <form id="warehouse-type-form">
            <div class="form-group">
                <label for="wt-type-name">类型名 <span class="required">*</span></label>
                <input type="text" id="wt-type-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label>颜色配置（可选）</label>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0">
                    <span id="wt-color-preview" title="预览" style="display:inline-block;width:28px;height:28px;border-radius:6px;border:1px solid #cbd5e1;background:#e2e8f0"></span>
                    <select id="wt-color-vivid" class="form-control" style="max-width:150px">
                        <option value="">选色…</option>
                        <option value="#dc2626">红</option>
                        <option value="#ea580c">橙</option>
                        <option value="#eab308">黄</option>
                        <option value="#16a34a">绿</option>
                        <option value="#0891b2">青</option>
                        <option value="#2563eb">蓝</option>
                        <option value="#7c3aed">紫</option>
                        <option value="#6b7280">灰色</option>
                        <option value="#ffffff">白</option>
                        <option value="#000000">黑</option>
                    </select>
                </div>
                <input type="text" id="wt-color" class="form-control" placeholder="#RRGGBB，或从上方下拉选色；留空为黑色">
                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>
            </div>
        </form>
    `
}

function UtModalBody() {
    return `
        <div class="warehouse-types-modal-inner">
            <button type="button" class="btn btn-primary btn-sm mb-2" id="wt-modal-add-btn"><i class="fas fa-plus"></i> 新增库房类型</button>
            <p class="text-muted small mb-2">共 <span id="warehouse-type-count">0</span> 条</p>
            <div class="table-responsive" style="max-height:380px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;">
                <table class="data-table" style="width:100%;margin:0"><thead><tr><th>类型ID</th><th>类型名</th><th>颜色</th><th>状态</th><th>操作</th></tr></thead><tbody id="warehouse-type-table-body"></tbody></table>
            </div>
            <p class="text-muted small mb-0 mt-2">类型与颜色供库房列表展示；停用后新建库房不可选。点击下方「确认」关闭本窗口。</p>
        </div>
    `
}

function vtOpenTypesModal() {
    U(`库房类型维护`, UtModalBody(), {
        onOpen: async function() {
            var e = document.getElementById(`wt-modal-add-btn`);
            e && (e.onclick = function(e) {
                e.preventDefault(), e.stopPropagation(), U(`新增库房类型`, $eType(), {
                    onOpen: function() {
                        WtWireColorControls()
                    },
                    onConfirm: function() {
                        return QtType(null)
                    }
                })
            });
            var t = document.getElementById(`warehouse-type-table-body`);
            t && !t.dataset.wtDlg && (t.dataset.wtDlg = `1`, t.addEventListener(`click`, function(e) {
                var n = e.target.closest(`.wt-edit-btn`),
                    r = e.target.closest(`.wt-del-btn`);
                n ? jtType(parseInt(n.getAttribute(`data-id`), 10)) : r && ItType(parseInt(r.getAttribute(`data-id`), 10))
            })), await ptTypes()
        },
        onConfirm: function() {
            return !0
        }
    })
}

function Je() {
    return `
        <form id="freight-form">
            <div class="form-group">
                <label for="freight-warehouse-search">库房 <span class="required">*</span></label>
                <div class="warehouse-select-combo wh-modal-combo">
                    <input type="search" id="freight-warehouse-search" class="form-control" autocomplete="off" placeholder="输入名称或编号筛选，点击下方选择库房">
                    <div id="freight-warehouse-list" class="warehouse-select-list"></div>
                    <input type="hidden" id="freight-warehouse" value="">
                </div>
            </div>
            <div class="form-group">
                <label for="freight-smelter">冶炼厂 <span class="required">*</span></label>
                <select id="freight-smelter" class="form-control" required>
                    <option value="">请选择冶炼厂</option>
                    <!-- 冶炼厂选项将通过JavaScript动态生成 -->
                </select>
            </div>
            <div class="form-group">
                <label for="freight-price">运费（元/吨） <span class="required">*</span></label>
                <input type="number" id="freight-price" class="form-control" step="0.01" min="0" required>
            </div>
        </form>
    `
}

function Ye() {
    return `
        <form id="freight-edit-form">
            <input type="hidden" id="freight-edit-id" value="">
            <div class="form-group">
                <label for="freight-edit-price">运费（元/吨） <span class="required">*</span></label>
                <input type="number" id="freight-edit-price" class="form-control" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label for="freight-edit-effective-date">生效日期</label>
                <input type="date" id="freight-edit-effective-date" class="form-control">
                <small class="form-text">可选修改；不可与同库房、冶炼厂下其它记录的生效日期冲突。</small>
            </div>
        </form>
    `
}

function Xe() {
    return `
        <form id="category-form">
            <div class="form-group">
                <label for="category-name">品类名称 <span class="required">*</span></label>
                <input type="text" id="category-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="category-alias">别名</label>
                <input type="text" id="category-alias" class="form-control">
                <small class="form-text">多个别名用逗号分隔</small>
            </div>
            <div class="form-group">
                <label for="category-unit">计量单位</label>
                <input type="text" id="category-unit" class="form-control" value="元/吨">
            </div>
        </form>
    `
}

function Ze() {
    return `
        <form id="tax-config-form">
            <div class="form-group">
                <label for="tax-smelter">冶炼厂 <span class="required">*</span></label>
                <select id="tax-smelter" class="form-control" required>
                    <option value="">请选择冶炼厂</option>
                </select>
            </div>
            <div class="form-group">
                <label for="tax-type">计税口径 <span class="required">*</span></label>
                <select id="tax-type" class="form-control" required>
                    <option value="1pct">1%增值税</option>
                    <option value="3pct" selected>3%增值税</option>
                    <option value="13pct">13%增值税</option>
                </select>
                <small class="form-text">与接口 <code>tax_type</code> 一致；同一冶炼厂可按不同口径各配一条换算比例。</small>
            </div>
            <div class="form-group">
                <label for="tax-ratio">换算比例 <span class="required">*</span></label>
                <input type="number" id="tax-ratio" class="form-control" step="0.0001" min="0" placeholder="如 0.03 或填 3 表示 3%" required>
                <small class="form-text">含税价 = 基准价 × 换算比例。接口要求为 <strong>0～1</strong> 的小数（例：3% 填 <code>0.03</code>）；也可直接填 <strong>1～100</strong> 的百分数（例：填 <code>3</code> 将按 3% 提交）。</small>
            </div>
        </form>
    `
}
async function Qe(e) {
    let t = document.getElementById(`smelter-name`),
        n = t && t.value.trim();
    if (!n) throw Error(`请填写冶炼厂名称`);
    let r = document.getElementById(`smelter-address`),
        i = r && r.value.trim(),
        c = document.getElementById(`smelter-type-select`),
        d = c ? parseInt(c.value, 10) : NaN,
        u = c && c.selectedOptions && c.selectedOptions[0] ? String(c.selectedOptions[0].textContent || ``).replace(/^\[停用\]\s*/, ``).trim() : ``,
        a = {
            冶炼厂名: n
        };
    if (!isNaN(d) && d >= 1) a.冶炼厂类型id = d;
    if (u) a.冶炼厂类型名 = u;
    if (i) {
        a.地址 = i;
        var o = splitCnAddress(i);
        o.省 && (a.省 = o.省, a.省份 = o.省, a.province = o.省), o.市 && (a.市 = o.市, a.城市 = o.市, a.city = o.市), o.区 && (a.区 = o.区, a.区县 = o.区, a.district = o.区)
    }
    e ? (a.冶炼厂id = Number(e), a.is_active = !0, await Api.request(`POST`, `/tl/update_smelter`, a)) : await Api.request(`POST`, `/tl/add_smelter`, a), await W()
}

function $e(e) {
    e && Api.request(`GET`, `/tl/get_smelters`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return S(t) === Number(e)
        });
        if (!n) throw Error(`未找到该冶炼厂`);
        U(`编辑冶炼厂`, Ke(), {
            onOpen: async function() {
                document.getElementById(`smelter-name`).value = C(n) || ``;
                var t = document.getElementById(`smelter-address`);
                t && (t.value = Aa(n) || ``);
                var s = document.getElementById(`smelter-type-select`);
                s && await ltFactoryTypes(s, v(n, [`冶炼厂类型id`, `factory_type_id`, `type_id`]))
            },
            onConfirm: function() {
                return Qe(e)
            }
        })
    }).catch(function(e) {
        alert(e.message)
    })
}
async function et(e) {
    !e || !confirm(`确认删除该冶炼厂？删除后不可恢复。`) || (await Api.request(`DELETE`, `/tl/purge_smelter?smelter_id=` + encodeURIComponent(e)), await W())
}
async function tt(e) {
    let t = document.getElementById(`warehouse-name`),
        n = t && t.value.trim();
    if (!n) throw Error(`请填写库房名称`);
    let r = document.getElementById(`warehouse-address`) || document.querySelector(`#warehouse-form input[name="地址"]`) || document.querySelector(`#warehouse-form input[name="address"]`),
        i = r && typeof r.value == `string` ? r.value.trim() : ``,
        a = document.getElementById(`warehouse-type-select`),
        o = a ? parseInt(a.value, 10) : NaN,
        s = a && a.selectedOptions && a.selectedOptions[0] ? String(a.selectedOptions[0].textContent || ``).replace(/^\[停用\]\s*/, ``).trim() : ``,
        c = {
            仓库名: n
        };
    if (!i) throw Error(`请填写库房地址（需含省市区）`);
    if (i) {
        var l = splitCnAddress(i) || {},
            u = Object.keys(l),
            d = u[0],
            f = u[1],
            p = u[2],
            m = d ? String(l[d] || '').trim() : '',
            h = f ? String(l[f] || '').trim() : '',
            g = p ? String(l[p] || '').trim() : '',
            k = String(i).replace(/\s+/g, ''),
            L = k.match(/^(.*?(?:省|自治区|特别行政区))/),
            R = L ? L[1] : '',
            P = k.match(/(?:省|自治区|特别行政区)(.*?(?:市|自治州|地区|盟))/),
            N = P ? P[1] : '',
            M = k.match(/(?:市|自治州|地区|盟)(.*?(?:区|县|旗))/),
            T = M ? M[1] : '';
        m = m || R, h = h || N, g = g || T, !g && (M = k.match(/(.*?(?:区|县|旗))/), M && (g = M[1])), h && h.indexOf(`市`) === -1 && k.indexOf(h + `市`) !== -1 && (h = h + `市`);
        var wf = document.getElementById(`warehouse-form`),
            wm = ``,
            whc = ``,
            wd = ``;
        if (e && wf) {
            wm = String(wf.dataset.wProv || ``).trim(), whc = String(wf.dataset.wCity || ``).trim(), wd = String(wf.dataset.wDist || ``).trim(), m || (m = wm), h || (h = whc), g || (g = wd)
        }
        if (!(m && h && g)) throw Error(`地址需包含省/市/区（县）`);
        c.省 = m, c.市 = h, c.区 = g;
        var pfx = (m || ``) + (h || ``) + (g || ``),
            ic = String(i).replace(/\s+/g, ``),
            pc = pfx.replace(/\s+/g, ``);
        c.地址 = pc && ic.startsWith(pc) ? String(i).trim() : pfx + String(i).trim()
    }
    if (isNaN(o) || !(o > 0)) throw Error(`完整地址模式下请先选择已启用的库房类型`);
    c.仓库类型id = o, s && (c.库房类型名 = s);
    var _wcc = document.getElementById(`warehouse-contact`),
        _wpp = document.getElementById(`warehouse-phone`),
        _whz = document.getElementById(`warehouse-hazmat-permit-qty`),
        _wmi = document.getElementById(`warehouse-monthly-inbound`);
    c.库房联系人 = _wcc ? String(_wcc.value || ``).trim() : ``;
    var _ph0 = _wpp ? String(_wpp.value || ``).trim() : ``;
    if (_ph0) {
        var _ph = _ph0.replace(/\s+/g, ``).replace(/-/g, ``);
        if (!/^\d{11}$/.test(_ph)) throw Error(`电话填写时须为 11 位数字`);
        c.电话 = _ph
    } else c.电话 = ``;
    var _nz = function(el) {
        if (!el) return null;
        var s = String(el.value || ``).trim();
        if (!s) return null;
        var x = Number(s);
        return isFinite(x) ? x : null
    };
    c[`危废经营许可数量`] = _nz(_whz), c[`月均收货`] = _nz(_wmi), e ? (c.仓库id = Number(e), c.is_active = !0, await Api.request(`POST`, `/tl/update_warehouse`, c)) : await Api.request(`POST`, `/tl/add_warehouse`, c);
    if (e) {
        try {
            var _whRes = await Api.request(`GET`, `/tl/get_warehouses`);
            var _whList = Api.unwrapList(_whRes).filter(function(x) {
                return !b(T(x))
            });
            var _whRow = _whList.find(function(x) {
                return w(x) === Number(e)
            });
            if (_whRow) {
                var _tbody = document.getElementById(`warehouse-table-body`);
                if (_tbody) {
                    var _rows = _tbody.querySelectorAll(`tr`);
                    for (var _i = 0; _i < _rows.length; _i++) {
                        var _btn = _rows[_i].querySelector(`.edit-btn[data-id="` + e + `"]`);
                        if (_btn) {
                            var _tds = _rows[_i].querySelectorAll(`td`);
                            if (_tds.length >= 7) {
                                _tds[1].textContent = T(_whRow) || `-`;
                                _tds[2].textContent = Aa(_whRow) || `-`;
                                _tds[3].textContent = wa(_whRow) || `-`;
                                var _clr = WtSafeCssColor(String(xa(_whRow) || ``).trim());
                                if (_tds[4]) {
                                    var _sw = _tds[4].querySelector(`span`);
                                    if (_sw) _sw.style.background = _clr || `#e2e8f0`
                                }
                                _tds[5].textContent = String(_(_whRow, [`库房联系人`, `联系人`], ``) || `-`);
                                _tds[6].textContent = String(_(_whRow, [`电话`, `联系电话`, `手机`], ``) || `-`);
                            }
                        }
                        break
                    }
                }
            }
        } catch (_e) {
            console.error(`刷新单行失败:`, _e);
            await G()
        }
    } else {
        await G()
    }
}

function nt(e) {
    e && Api.request(`GET`, `/tl/get_warehouses`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return w(t) === Number(e)
        });
        if (!n) throw Error(`未找到该库房`);
        U(`编辑库房`, qe(), {
            onOpen: async function() {
                var t = document.getElementById(`warehouse-type-select`),
                    wf = document.getElementById(`warehouse-form`);
                t && await ltTypes(t, Za(n)), wf && (wf.dataset.wProv = _(n, [`省`, `省份`, `province`], ``) || ``, wf.dataset.wCity = _(n, [`市`, `城市`, `city`], ``) || ``, wf.dataset.wDist = _(n, [`区`, `区县`, `district`, `县`], ``) || ``);
                document.getElementById(`warehouse-name`).value = T(n) || ``;
                var r = document.getElementById(`warehouse-address`);
                r && (r.value = Aa(n) || ``);
                var wc1 = document.getElementById(`warehouse-contact`),
                    wp1 = document.getElementById(`warehouse-phone`),
                    wh1 = document.getElementById(`warehouse-hazmat-permit-qty`),
                    wm1 = document.getElementById(`warehouse-monthly-inbound`);
                wc1 && (wc1.value = String(_(n, [`库房联系人`, `联系人`], ``) || ``)), wp1 && (wp1.value = String(_(n, [`电话`, `联系电话`, `手机`], ``) || ``));
                var hv = v(n, [`危废经营许可数量`]);
                wh1 && (wh1.value = hv != null && !isNaN(hv) ? String(hv) : ``);
                var mv = v(n, [`月均收货`]);
                wm1 && (wm1.value = mv != null && !isNaN(mv) ? String(mv) : ``)
            },
            onConfirm: function() {
                return tt(e)
            }
        })
    }).catch(function(e) {
        alert(e.message || String(e))
    })
}
async function rt(e) {
    if (!(!e || !confirm(`确认删除该库房？`))) try {
        await Api.request(`DELETE`, `/tl/delete_warehouse?warehouse_id=` + encodeURIComponent(e)), await G()
    } catch (e) {
        alert(`删除库房失败: ` + (e.message || String(e)))
    }
}

function ftwRowMatch(e, n) {
    var r = String(n || ``).trim();
    if (!r) return !0;
    var i = String(w(e)),
        a = T(e),
        o = r.toLowerCase();
    return a.indexOf(r) !== -1 || i.indexOf(r) !== -1 || a.toLowerCase().indexOf(o) !== -1 || i.toLowerCase().indexOf(o) !== -1
}

function ftwApplyFilter() {
    var _l = document.getElementById(`freight-filter-warehouse-list`);
    _l && (_l.style.display = ``);
    renderWhComboList(`freight-filter`, qFW, {
        allowAll: !0,
        allLabel: `全部`,
        syncSearchOnPick: !0
    })
}
async function it() {
    let e = document.getElementById(`freight-filter-warehouse`),
        t = document.getElementById(`freight-filter-factory`);
    if (!(!e || !t)) try {
        let n = await Api.request(`GET`, `/tl/get_warehouses`),
            r = await Api.request(`GET`, `/tl/get_smelters`),
            i = Api.unwrapList(n).filter(function(e) {
                return !b(T(e))
            }),
            a = Api.unwrapList(r).filter(function(e) {
                return !b(C(e))
            });
        qFW = i;
        var sf = document.getElementById(`freight-filter-warehouse-search`);
        sf && (sf.value = ``), ftwApplyFilter(), t.innerHTML = `<option value="">全部</option>`, a.forEach(function(e) {
            let n = document.createElement(`option`);
            n.value = String(S(e)), n.textContent = C(e), t.appendChild(n)
        })
    } catch (e) {
        console.error(e)
    }
}

function at() {
    var sfw = document.getElementById(`freight-filter-warehouse-search`);
    sfw && (sfw.value = ``);
    let e = document.getElementById(`freight-filter-warehouse`),
        t = document.getElementById(`freight-filter-factory`),
        n = document.getElementById(`freight-filter-date-from`),
        r = document.getElementById(`freight-filter-date-to`);
    ftwApplyFilter(), e && (e.value = ``), t && (t.value = ``), n && (n.value = ``), r && (r.value = ``), o.page = 1
}

function ot() {
    let e = new URLSearchParams;
    e.set(`page`, String(o.page)), e.set(`page_size`, String(o.pageSize));
    let t = document.getElementById(`freight-filter-warehouse`);
    t && t.value && e.set(`warehouse_id`, t.value);
    let n = document.getElementById(`freight-filter-factory`);
    n && n.value && e.set(`factory_id`, n.value);
    let r = document.getElementById(`freight-filter-date-from`);
    r && r.value && e.set(`date_from`, r.value);
    let i = document.getElementById(`freight-filter-date-to`);
    return i && i.value && e.set(`date_to`, i.value), e
}

function st(e) {
    let t = document.getElementById(`freight-page-info`),
        n = document.getElementById(`freight-prev-btn`),
        r = document.getElementById(`freight-next-btn`),
        i = o.total,
        a = o.page,
        s = o.pageSize;
    if (t)
        if (i > 0) {
            let n = Math.max(1, Math.ceil(i / s));
            t.textContent = `第 ` + a + ` / ` + n + ` 页，共 ` + i + ` 条（本页 ` + e + ` 条）`
        } else t.textContent = `第 ` + a + ` 页，本页 ` + e + ` 条`;
    if (n && (n.disabled = a <= 1), r) {
        var c = e < s;
        i > 0 ? r.disabled = a * s >= i || c : r.disabled = c
    }
}

function ffwApply() {
    renderWhComboList(`freight`, qFJ, {
        syncSearchOnPick: !0
    })
}
async function ct() {
    let e = await Api.request(`GET`, `/tl/get_warehouses`),
        t = await Api.request(`GET`, `/tl/get_smelters`),
        n = Api.unwrapList(e).filter(function(e) {
            return !b(T(e))
        }),
        r = Api.unwrapList(t).filter(function(e) {
            return !b(C(e))
        }),
        i = document.getElementById(`freight-warehouse`),
        a = document.getElementById(`freight-smelter`);
    if (!i || !a) return;
    qFJ = n, i.value = ``;
    var sf = document.getElementById(`freight-warehouse-search`);
    sf && (sf.value = ``, sf.oninput = function() {
        ffwApply()
    }, sf.onkeydown = function(e) {
        if (e.key === `Enter`) {
            e.preventDefault();
            var t = document.getElementById(`freight-warehouse-list`);
            t && t.querySelector(`button[data-wh-id]`) && t.querySelector(`button[data-wh-id]`).click()
        }
    }), ffwApply(), a.innerHTML = `<option value="">请选择冶炼厂</option>`, r.forEach(function(e) {
        let t = document.createElement(`option`);
        t.value = S(e), t.textContent = C(e), a.appendChild(t)
    })
}
async function lt(e) {
    let t = parseInt(document.getElementById(`freight-warehouse`).value, 10),
        n = parseInt(document.getElementById(`freight-smelter`).value, 10),
        r = parseFloat(document.getElementById(`freight-price`).value);
    if (!t || !n) throw Error(`请选择库房和冶炼厂`);
    if (isNaN(r) || r < 0) throw Error(`请填写有效运费`);
    var whRow = qFJ.find(function(e) {
            return w(e) === t
        }),
        whName = whRow ? T(whRow) : ``;
    let i = [{
        仓库: whName,
        冶炼厂: (document.querySelector(`#freight-smelter option:checked`) || {}).textContent || ``,
        运费: r
    }];
    await Api.request(`POST`, `/tl/upload_freight`, i), o.page = 1, await K()
}
async function ut() {
    var e = document.getElementById(`freight-edit-id`),
        t = document.getElementById(`freight-edit-price`),
        n = document.getElementById(`freight-edit-effective-date`),
        r = e ? parseInt(e.value, 10) : NaN,
        i = t ? parseFloat(t.value) : NaN;
    if (!r || isNaN(r)) throw Error(`运费记录无效`);
    if (isNaN(i) || i < 0) throw Error(`请填写有效运费`);
    var a = {
            运费id: r,
            运费: i
        },
        o = n && n.value ? String(n.value).trim() : ``;
    o && (a.生效日期 = o), await Api.request(`POST`, `/tl/update_freight`, a), await K()
}

function dt(e) {
    if (!(!e || isNaN(Number(e)))) {
        var t = s[e];
        if (!t) {
            alert(`未找到该运费记录，请刷新列表后重试。`);
            return
        }
        var n = v(t, [`运费`, `运费（元/吨）`, `freight`, `freight_rate`]),
            r = _(t, [`生效日期`, `日期`, `生效时间`, `effective_date`, `date`, `生效`], ``);
        U(`编辑运费`, Ye(), {
            onOpen: function() {
                var t = document.getElementById(`freight-edit-id`),
                    i = document.getElementById(`freight-edit-price`),
                    a = document.getElementById(`freight-edit-effective-date`);
                t && (t.value = String(e)), i && (i.value = n != null && !isNaN(n) ? String(n) : ``), a && (a.value = O(r))
            },
            onConfirm: function() {
                return ut()
            }
        })
    }
}
async function ft(e) {
    if (!(!e || isNaN(Number(e))) && confirm(`确认删除该运费配置？删除后同库房+冶炼厂可重新上传该生效日期的运费。`)) try {
        await Api.request(`DELETE`, `/tl/delete_freight?freight_id=` + encodeURIComponent(e)), await K()
    } catch (e) {
        alert(`删除运费失败: ` + (e.message || String(e)))
    }
}

function renderFreightTemplateWhList() {
    var box = document.getElementById(`freight-template-warehouse-list`),
        searchEl = document.getElementById(`freight-template-warehouse-search`);
    if (!box) return;
    var checked = {};
    box.querySelectorAll(`.freight-template-warehouse:checked`).forEach(function(c) {
        checked[String(c.value || ``)] = !0
    });
    var q = searchEl && searchEl.value ? String(searchEl.value) : ``,
        filtered = qFTW.filter(function(r) {
            return Kt(r, q)
        });
    if (!filtered.length) {
        box.innerHTML = `<p class="text-muted" style="margin:8px;text-align:center;">无匹配库房</p>`;
        return
    }
    box.innerHTML = ``;
    filtered.forEach(function(t) {
        var n = w(t);
        if (!n) return;
        var r = document.createElement(`label`);
        r.style.display = `block`;
        r.style.marginBottom = `8px`;
        var cid = String(n),
            chk = checked[cid] ? ` checked` : ``;
        r.innerHTML = `<input type="checkbox" class="freight-template-warehouse" value="` + cid + `"` + chk + `> ` + M(T(t) || `库房 #` + n);
        box.appendChild(r)
    })
}

function pt() {
    return `
        <div>
            <p style="margin:0 0 10px;">请选择要下载模板的库房（可多选）</p>
            <input type="search" id="freight-template-warehouse-search" class="form-control" autocomplete="off" placeholder="输入名称或编号筛选" style="margin-bottom:8px;">
            <div id="freight-template-warehouse-list" style="max-height:280px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
                <p class="text-muted" style="margin:0;">库房加载中...</p>
            </div>
        </div>
    `
}

function mt() {
    U(`下载运费模板`, pt(), {
        onOpen: function() {
            return ht()
        },
        onConfirm: function() {
            return gt()
        }
    })
}
async function ht() {
    let e = document.getElementById(`freight-template-warehouse-list`);
    var sf = document.getElementById(`freight-template-warehouse-search`);
    sf && (sf.value = ``, sf.oninput = function() {
        renderFreightTemplateWhList()
    });
    if (e) try {
        let t = await Api.request(`GET`, `/tl/get_warehouses`);
        qFTW = Api.unwrapList(t).filter(function(e) {
            return !b(T(e))
        });
        if (!qFTW.length) {
            e.innerHTML = `<p class="text-muted" style="margin:0;">暂无可选库房</p>`;
            return
        }
        renderFreightTemplateWhList()
    } catch (t) {
        e.innerHTML = `<p class="text-muted" style="margin:0;">库房加载失败：` + M(t.message || String(t)) + `</p>`
    }
}
async function gt() {
    var e = Array.from(document.querySelectorAll(`#freight-template-warehouse-list .freight-template-warehouse:checked`)).map(function(e) {
        return String(e.value || ``).trim()
    }).filter(Boolean);
    if (!e.length) throw Error(`请至少选择一个库房`);
    var t = e.map(function(e) {
        return Number(e)
    }).filter(function(e) {
        return !isNaN(e) && e > 0
    });
    if (!t.length) throw Error(`库房ID无效，请重试`);
    var n = await Api.requestBlob(`POST`, `/tl/download_freight_template_excel`, {
            库房id列表: t
        }),
        r = window.URL.createObjectURL(n),
        i = document.createElement(`a`);
    i.href = r, i.download = `运费模板.xlsx`, document.body.appendChild(i), i.click(), i.remove(), window.URL.revokeObjectURL(r)
}
async function _t(e) {
    var t = e && e[0];
    if (!t) return;
    if (!/\.(xlsx|xls|csv)$/i.test(String(t.name || ``))) {
        alert(`请上传 Excel 或 CSV 文件（.xlsx/.xls/.csv）`);
        return
    }
    let n = document.getElementById(`import-freight-btn`);
    var r = n ? n.innerHTML : ``;
    n && (n.disabled = !0, n.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 导入中...`);
    try {
        var i = new FormData;
        i.append(`file`, t);
        var a = await Api.request(`POST`, `/tl/import_freight_excel`, i),
            s = _(a, [`msg`, `message`], ``) || _(Api.unwrapData(a), [`msg`, `message`], ``);
        alert(s || `导入运费成功`), o.page = 1, await K()
    } catch (e) {
        alert(`导入运费失败: ` + (e.message || String(e)))
    } finally {
        n && (n.disabled = !1, n.innerHTML = r || `<i class="fas fa-file-import"></i> 导入运费表格`)
    }
}

function vt(e) {
    return !e || !e.trim() ? [] : e.split(`,`).map(function(e) {
        return e.trim()
    }).filter(Boolean)
}
async function yt(e) {
    let t = document.getElementById(`category-name`).value.trim();
    if (!t) throw Error(`请填写品类名称`);
    let n = document.getElementById(`category-alias`).value,
        r = vt(n),
        i = await Api.request(`GET`, `/tl/get_category_mapping`),
        a = Api.unwrapList(i).map(function(e) {
            var t = _(e, [`品类id`, `品类Id`, `id`], null),
                n = _(e, [`品类名称`, `品类名`, `names`], []),
                r = Array.isArray(n) ? n.slice() : n ? [String(n)] : [];
            return {
                品类id: Number(t),
                品类名称: r
            }
        }).filter(function(e) {
            return !isNaN(e.品类id)
        });
    if (e) {
        let n = a.find(function(t) {
            return Number(t.品类id) === Number(e)
        });
        if (!n) throw Error(`未找到该品类`);
        n.品类名称 = [t].concat(r)
    } else {
        var o = a.reduce(function(e, t) {
            return Math.max(e, Number(t.品类id) || 0)
        }, 0);
        a.push({
            品类id: o + 1,
            品类名称: [t].concat(r)
        })
    }
    await Api.request(`POST`, `/tl/update_category_mapping`, a), await q()
}

function bt(e) {
    e && Api.request(`GET`, `/tl/get_category_mapping`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return Number(t.品类id) === Number(e)
        });
        if (!n) throw Error(`未找到该品类`);
        U(`编辑回收品类`, Xe(), {
            onOpen: function() {
                let e = n.品类名称 || [];
                document.getElementById(`category-name`).value = e[0] || ``;
                let t = e.slice(1).join(`,`);
                document.getElementById(`category-alias`).value = t
            },
            onConfirm: function() {
                return yt(e)
            }
        })
    }).catch(function(e) {
        alert(e.message)
    })
}
async function xt(e) {
    if (!(!e || !confirm(`确认删除该品类？删除后不可恢复。`))) {
        var t = new URLSearchParams;
        t.set(`品类id`, String(e)), await Api.request(`DELETE`, `/tl/delete_category?` + t.toString()), await q()
    }
}
async function St() {
    let e = await Api.request(`GET`, `/tl/get_smelters`),
        t = V(Api.unwrapData(e) || {}).list.filter(function(e) {
            return !b(C(e)) && (S(e) || C(e))
        }),
        n = document.getElementById(`tax-smelter`);
    if (n && (n.innerHTML = `<option value="">请选择冶炼厂</option>`, t.forEach(function(e) {
            let t = document.createElement(`option`);
            t.value = String(S(e)), t.textContent = C(e) || `冶炼厂 #` + S(e), n.appendChild(t)
        }), !t.length)) {
        let e = document.createElement(`option`);
        e.value = ``, e.textContent = `暂无冶炼厂数据，请先在冶炼厂管理中添加`, e.disabled = !0, n.appendChild(e)
    }
}

function Ct(e) {
    var t = parseFloat(String(e ?? ``).replace(`,`, `.`));
    return isNaN(t) || t <= 0 ? {
        ok: !1,
        msg: `请填写有效换算比例`
    } : t <= 1 ? {
        ok: !0,
        rate: t
    } : t <= 100 ? {
        ok: !0,
        rate: t / 100
    } : {
        ok: !1,
        msg: `换算比例超出范围：须为 0～1 的小数（如 0.03），或 1～100 的百分数（如 3 表示 3%）。您填写的 ` + t + ` 无法换算为合法税率。`
    }
}
async function wt(e) {
    let t = parseInt(document.getElementById(`tax-smelter`).value, 10),
        n = document.getElementById(`tax-type`),
        r = n && n.value ? String(n.value).trim() : ``,
        i = Ct(document.getElementById(`tax-ratio`).value);
    if (!t) throw Error(`请选择冶炼厂`);
    if (!r) throw Error(`请选择计税口径`);
    if (!i.ok) throw Error(i.msg);
    let a = {
        items: [{
            factory_id: t,
            tax_type: r,
            tax_rate: i.rate
        }]
    };
    await Api.request(`POST`, `/tl/upsert_tax_rates`, a), await J()
}

function Tt(e) {
    e && Api.request(`GET`, `/tl/get_tax_rates`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return Number(t.id) === Number(e)
        });
        if (!n) throw Error(`未找到该配置`);
        U(`编辑换算比例`, Ze(), {
            onOpen: async function() {
                await St();
                var e = n.factory_id == null ? n.smelterId : n.factory_id;
                document.getElementById(`tax-smelter`).value = String(e || ``);
                var t = document.getElementById(`tax-type`);
                if (t && (t.value = n.tax_type || `3pct`, !Array.prototype.some.call(t.options, function(e) {
                        return e.value === t.value
                    }))) {
                    var r = document.createElement(`option`);
                    r.value = t.value, r.textContent = y(t.value), t.appendChild(r), t.value = r.value
                }
                document.getElementById(`tax-ratio`).value = String(n.tax_rate == null ? n.rate : n.tax_rate)
            },
            onConfirm: function() {
                return wt(e)
            }
        })
    }).catch(function(e) {
        alert(e.message)
    })
}
async function Et(e) {
    if (!e || !confirm(`确认删除该换算比例？删除后不可恢复。`)) return;
    let t = await Api.request(`GET`, `/tl/get_tax_rates`),
        n = Api.unwrapList(t).find(function(t) {
            return Number(t.id) === Number(e)
        });
    if (!n) throw Error(`未找到税率配置`);
    var r = n.factory_id == null ? n.smelterId : n.factory_id,
        i = n.tax_type == null ? n.taxType : n.tax_type;
    await Api.request(`DELETE`, `/tl/delete_tax_rate?factory_id=` + encodeURIComponent(r) + `&tax_type=` + encodeURIComponent(i)), await J()
}
async function ltTypes(e, t) {
    if (!e) return;
    for (; e.options.length > 1;) e.remove(1);
    try {
        let n = await Api.request(`GET`, `/tl/get_warehouse_types?include_inactive=false`),
            r = Api.unwrapList(n);
        r.forEach(function(n) {
            var r = v(n, [`类型id`, `id`, `type_id`]),
                i = _(n, [`类型名`, `name`, `类型名称`], ``),
                a = n.is_active === !1 || n.is_active === 0 || n.is_active === `0`;
            if (r == null || isNaN(r)) return;
            var o = document.createElement(`option`);
            o.value = String(r), o.textContent = (a ? `[停用] ` : ``) + String(i || `类型#` + r), t != null && Number(t) === Number(r) && (o.selected = !0), e.appendChild(o)
        })
    } catch (t) {
        console.error(t)
    }
}
async function ptTypes() {
    let e = document.getElementById(`warehouse-type-table-body`),
        t = document.getElementById(`warehouse-type-count`);
    if (!e) return;
    E(e, 5, `正在加载库房类型...`);
    try {
        let n = await Api.request(`GET`, `/tl/get_warehouse_types?include_inactive=false`),
            r = function(e) {
                var t = [],
                    n = new Set;
                return e.forEach(function(e) {
                    var r = v(e, [`类型id`, `id`, `type_id`]);
                    r != null && !isNaN(r) && !n.has(String(r)) && (n.add(String(r)), t.push(e))
                }), t
            }(Api.unwrapList(n));
        e.innerHTML = ``, r.length || D(e, 5, `暂无库房类型，请点击「新增库房类型」`), r.forEach(function(t) {
            var n = v(t, [`类型id`, `id`, `type_id`]),
                r = _(t, [`类型名`, `name`, `类型名称`], ``),
                i = xa(t),
                a = t.is_active === !1 || t.is_active === 0 || t.is_active === `0`,
                c = WtSafeCssColor(i && i !== `-` ? String(i).trim() : ``),
                o = `<span style="display:inline-block;width:22px;height:22px;border-radius:4px;vertical-align:middle;border:1px solid #ccc;background:` + (c || `#e2e8f0`) + `" title="` + M(String(i)) + `"></span> `,
                s = document.createElement(`tr`);
            s.innerHTML = `
            <td>` + String(n) + `</td>
            <td>` + M(r || `-`) + `</td>
            <td>` + o + M(i) + `</td>
            <td>` + (a ? `<span class="text-muted">停用</span>` : `<span class="text-success">启用</span>`) + `</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline wt-edit-btn" data-id="` + String(n) + `">编辑</button>
                <button type="button" class="btn btn-sm btn-danger wt-del-btn" data-id="` + String(n) + `">删除</button>
            </td>`, e.appendChild(s)
        }), t && (t.textContent = String(r.length))
    } catch (n) {
        console.error(n), e.innerHTML = ``, D(e, 5, n && n.message ? String(n.message) : `加载失败`)
    }
}
async function QtType(e) {
    let t = document.getElementById(`wt-type-name`),
        n = t && t.value.trim(),
        r = document.getElementById(`wt-color`),
        i = r && r.value.trim();
    if (!n) throw Error(`请填写类型名`);
    i || (i = `#000000`);
    let a = {
        类型名: n,
        颜色配置: i
    };
    e ? (a.类型id = Number(e), a.is_active = !0, await Api.request(`POST`, `/tl/update_warehouse_type`, a)) : await Api.request(`POST`, `/tl/add_warehouse_type`, a), await ptTypes()
}

function jtType(e) {
    e && Api.request(`GET`, `/tl/get_warehouse_types?include_inactive=false`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return v(t, [`类型id`, `id`, `type_id`]) === Number(e)
        });
        if (!n) throw Error(`未找到该库房类型`);
        U(`编辑库房类型`, $eType(), {
            onOpen: function() {
                var t = xa(n);
                document.getElementById(`wt-type-name`).value = _(n, [`类型名`, `name`, `类型名称`], ``) || ``, document.getElementById(`wt-color`).value = t && t !== `-` ? t : ``, WtWireColorControls()
            },
            onConfirm: function() {
                return QtType(e)
            }
        })
    }).catch(function(e) {
        alert(e.message || String(e))
    })
}
async function ItType(e) {
    if (!(!e || !confirm(`确认删除该库房类型？`))) try {
        await Api.request(`DELETE`, `/tl/delete_warehouse_type?type_id=` + encodeURIComponent(e)), await ptTypes()
    } catch (e) {
        alert(`删除失败: ` + (e.message || String(e)))
    }
}
function vtOpenFactoryTypesModal() {
    U(`冶炼厂类型维护`, UtFactoryModalBody(), {
        onOpen: async function() {
            var e = document.getElementById(`ft-modal-add-btn`);
            e && (e.onclick = function(e) {
                e.preventDefault(), e.stopPropagation(), U(`新增冶炼厂类型`, $eFactoryType(), {
                    onOpen: function() {
                        WtWireFactoryColorControls()
                    },
                    onConfirm: function() {
                        return QtFactoryType(null)
                    }
                })
            });
            var t = document.getElementById(`factory-type-table-body`);
            t && !t.dataset.ftDlg && (t.dataset.ftDlg = `1`, t.addEventListener(`click`, function(e) {
                var n = e.target.closest(`.ft-edit-btn`),
                    r = e.target.closest(`.ft-del-btn`);
                n ? jtFactoryType(parseInt(n.getAttribute(`data-id`), 10)) : r && ItFactoryType(parseInt(r.getAttribute(`data-id`), 10))
            })), await ptFactoryTypes()
        },
        onConfirm: function() {
            return !0
        }
    })
}

function UtFactoryModalBody() {
    return `
        <div class="warehouse-types-modal-inner">
            <button type="button" class="btn btn-primary btn-sm mb-2" id="ft-modal-add-btn"><i class="fas fa-plus"></i> 新增冶炼厂类型</button>
            <p class="text-muted small mb-2">共 <span id="factory-type-count">0</span> 条</p>
            <div class="table-responsive" style="max-height:380px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;">
                <table class="data-table" style="width:100%;margin:0"><thead><tr><th>类型ID</th><th>类型名</th><th>颜色</th><th>状态</th><th>操作</th></tr></thead><tbody id="factory-type-table-body"></tbody></table>
            </div>
            <p class="text-muted small mb-0 mt-2">类型与颜色供冶炼厂列表展示；停用后新建冶炼厂不可选。点击下方「确认」关闭本窗口。</p>
        </div>
    `
}

function $eFactoryType() {
    return `
        <form id="factory-type-form">
            <div class="form-group">
                <label for="ft-type-name">类型名 <span class="required">*</span></label>
                <input type="text" id="ft-type-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label>颜色配置（可选）</label>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0">
                    <span id="ft-color-preview" title="预览" style="display:inline-block;width:28px;height:28px;border-radius:6px;border:1px solid #cbd5e1;background:#e2e8f0"></span>
                    <select id="ft-color-vivid" class="form-control" style="max-width:150px">
                        <option value="">选色…</option>
                        <option value="#dc2626">红</option>
                        <option value="#ea580c">橙</option>
                        <option value="#eab308">黄</option>
                        <option value="#16a34a">绿</option>
                        <option value="#0891b2">青</option>
                        <option value="#2563eb">蓝</option>
                        <option value="#7c3aed">紫</option>
                        <option value="#6b7280">灰色</option>
                        <option value="#ffffff">白</option>
                        <option value="#000000">黑</option>
                    </select>
                </div>
                <input type="text" id="ft-color" class="form-control" placeholder="#RRGGBB，或从上方下拉选色；留空为黑色">
                <small class="form-text">不填时自动使用黑色 <code>#000000</code></small>
            </div>
        </form>
    `
}

function WtWireFactoryColorControls() {
    var e = document.getElementById(`ft-color-vivid`),
        t = document.getElementById(`ft-color`),
        n = document.getElementById(`ft-color-preview`);
    WtEnsureVividGrayOption(e);
    if (!t) return;
    if (t.dataset.ftWired) return;
    t.dataset.ftWired = `1`;
    function r() {
        var e = (t.value || ``).trim(),
            i = WtSafeCssColor(e);
        n && (n.style.cssText = `display:inline-block;width:28px;height:28px;border-radius:6px;vertical-align:middle;border:1px solid #cbd5e1;background:` + (i || `#e2e8f0`))
    }
    function i() {
        var n = (t.value || ``).trim();
        if (e) {
            var a = e.value;
            if (a && n) {
                var o = n.toLowerCase();
                for (var s = 0; s < e.options.length; s++)
                    if (String(e.options[s].value).toLowerCase() === o) {
                        e.options[s].selected = !0;
                        return
                    }
            }
            if (a && !n) return
        }
    }
    t.addEventListener(`input`, r), t.addEventListener(`change`, function() { r(), i() }), e && e.addEventListener(`change`, function() {
        var n = e.value;
        n && (t.value = n, r())
    }), r(), i()
}

async function ptFactoryTypes() {
    let e = document.getElementById(`factory-type-table-body`),
        t = document.getElementById(`factory-type-count`);
    if (!e) return;
    E(e, 5, `正在加载冶炼厂类型...`);
    try {
        let n = await Api.request(`GET`, `/tl/get_factory_types?include_inactive=false`),
            r = function(e) {
                var t = [],
                    n = new Set;
                return e.forEach(function(e) {
                    var r = v(e, [`类型id`, `id`, `type_id`]);
                    r != null && !isNaN(r) && !n.has(String(r)) && (n.add(String(r)), t.push(e))
                }), t
            }(Api.unwrapList(n));
        e.innerHTML = ``, r.length || D(e, 5, `暂无冶炼厂类型，请点击「新增冶炼厂类型」`), r.forEach(function(t) {
            var n = v(t, [`类型id`, `id`, `type_id`]),
                r = _(t, [`类型名`, `name`, `类型名称`], ``),
                i = readSmTypeColor(t),
                a = t.is_active === !1 || t.is_active === 0 || t.is_active === `0`,
                c = WtSafeCssColor(i && i !== `-` ? String(i).trim() : ``),
                o = `<span style="display:inline-block;width:22px;height:22px;border-radius:4px;vertical-align:middle;border:1px solid #ccc;background:` + (c || `#e2e8f0`) + `" title="` + M(String(i)) + `"></span> `,
                s = document.createElement(`tr`);
            s.innerHTML = `
            <td>` + String(n) + `</td>
            <td>` + M(r || `-`) + `</td>
            <td>` + o + M(i) + `</td>
            <td>` + (a ? `<span class="text-muted">停用</span>` : `<span class="text-success">启用</span>`) + `</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline ft-edit-btn" data-id="` + String(n) + `">编辑</button>
                <button type="button" class="btn btn-sm btn-danger ft-del-btn" data-id="` + String(n) + `">删除</button>
            </td>`, e.appendChild(s)
        }), t && (t.textContent = String(r.length))
    } catch (n) {
        console.error(n), e.innerHTML = ``, D(e, 5, n && n.message ? String(n.message) : `加载失败`)
    }
}

function readSmTypeColor(e) {
    var t = e[`颜色配置`];
    if (t != null && typeof t === `object` && !Array.isArray(t)) {
        var m = t.marker || t.color || ``;
        if (m) return String(m)
    }
    var c = _(e, [`颜色配置`, `color`, `颜色`, `color_config`], ``);
    return c == null || c === `` ? `-` : String(c)
}

async function QtFactoryType(e) {
    let t = document.getElementById(`ft-type-name`),
        n = t && t.value.trim(),
        r = document.getElementById(`ft-color`),
        i = r && r.value.trim();
    if (!n) throw Error(`请填写类型名`);
    i || (i = `#000000`);
    let a = {
        类型名: n,
        颜色配置: { marker: i }
    };
    e ? (a.类型id = Number(e), a.is_active = !0, await Api.request(`POST`, `/tl/update_factory_type`, a)) : await Api.request(`POST`, `/tl/add_factory_type`, a), await ptFactoryTypes()
}

function jtFactoryType(e) {
    e && Api.request(`GET`, `/tl/get_factory_types?include_inactive=false`).then(function(t) {
        let n = Api.unwrapList(t).find(function(t) {
            return v(t, [`类型id`, `id`, `type_id`]) === Number(e)
        });
        if (!n) throw Error(`未找到该冶炼厂类型`);
        U(`编辑冶炼厂类型`, $eFactoryType(), {
            onOpen: function() {
                var t = readSmTypeColor(n);
                document.getElementById(`ft-type-name`).value = _(n, [`类型名`, `name`, `类型名称`], ``) || ``, document.getElementById(`ft-color`).value = t && t !== `-` ? t : ``, WtWireFactoryColorControls()
            },
            onConfirm: function() {
                return QtFactoryType(e)
            }
        })
    }).catch(function(e) {
        alert(e.message || String(e))
    })
}

async function ItFactoryType(e) {
    if (!(!e || !confirm(`确认删除该冶炼厂类型？删除后已关联该类型的冶炼厂会自动取消关联。`))) try {
        await Api.request(`DELETE`, `/tl/delete_factory_type?type_id=` + encodeURIComponent(e)), await ptFactoryTypes()
    } catch (e) {
        alert(`删除失败: ` + (e.message || String(e)))
    }
}

async function ltFactoryTypes(e, t) {
    if (!e) return;
    for (; e.options.length > 1;) e.remove(1);
    try {
        let n = await Api.request(`GET`, `/tl/get_factory_types?include_inactive=false`),
            r = Api.unwrapList(n);
        r.forEach(function(n) {
            var r = v(n, [`类型id`, `id`, `type_id`]),
                i = _(n, [`类型名`, `name`, `类型名称`], ``),
                a = n.is_active === !1 || n.is_active === 0 || n.is_active === `0`;
            if (r == null || isNaN(r)) return;
            var o = document.createElement(`option`);
            o.value = String(r), o.textContent = (a ? `[停用] ` : ``) + String(i || `类型#` + r), t != null && Number(t) === Number(r) && (o.selected = !0), e.appendChild(o)
        })
    } catch (t) {
        console.error(t)
    }
}
async function W() {
    let e = document.getElementById(`smelter-table-body`);
    e && E(e, 4, `正在加载冶炼厂...`);
    try {
        let e = await Api.request(`GET`, `/tl/get_smelters`);
        t = Api.unwrapList(e).map(function(e) {
            return {
                id: S(e),
                name: C(e),
                address: Aa(e),
                typeName: readSmTypeName(e),
                typeId: readSmTypeId(e),
                createdAt: x(e)
            }
        }).filter(function(e) {
            return !b(e.name)
        })
    } catch (e) {
        alert(`加载冶炼厂失败: ` + e.message), t = []
    }
    let n = document.getElementById(`smelter-search`);
    $(n ? n.value : ``)
}
window.__tlRefreshSmeltersList = W;

function Dt() {
    var e = document.getElementById(`warehouse-search-keyword`);
    return e ? String(e.value || ``).trim() : ``
}
async function G() {
    let e = document.getElementById(`warehouse-table-body`),
        t = document.getElementById(`warehouse-count`);
    if (e) {
        E(e, 10, `正在加载库房...`);
        var n = Dt(),
            r = `/tl/get_warehouses`;
        n && (r += `?keyword=` + encodeURIComponent(n));
        try {
            let i = await Api.request(`GET`, r),
                a = Api.unwrapList(i).map(function(e) {
                    return {
                        id: w(e),
                        name: T(e),
                        address: Aa(e),
                        typeName: wa(e),
                        color: xa(e),
                        createdAt: x(e),
                        contact: String(_(e, [`库房联系人`, `联系人`], ``) || ``),
                        phone: String(_(e, [`电话`, `联系电话`, `手机`], ``) || ``),
                        hazQty: v(e, [`危废经营许可数量`]),
                        monthRecv: v(e, [`月均收货`])
                    }
                }).filter(function(e) {
                    return !b(e.name)
                });
            if (!Array.isArray(a)) {
                e.innerHTML = ``, D(e, 10, `数据格式异常`);
                return
            }
            e.innerHTML = ``, a.length || D(e, 10, n ? `未找到匹配的库房` : `暂无库房数据`), a.forEach(function(t) {
                var n = WtSafeCssColor(String(t.color || ``).trim()),
                    o = n ? n : `#e2e8f0`,
                    sw = `<span style="display:inline-block;width:18px;height:18px;border-radius:4px;vertical-align:middle;border:1px solid #ccc;background:` + o + `" title="` + M(String(t.color || ``)) + `"></span> `,
                    hz = t.hazQty != null && !isNaN(t.hazQty) ? t.hazQty.toLocaleString() : `-`,
                    mr = t.monthRecv != null && !isNaN(t.monthRecv) ? t.monthRecv.toLocaleString() : `-`,
                    r = document.createElement(`tr`);
                r.innerHTML = `
            <td>${t.id}</td>
            <td>${M(t.name)}</td>
            <td>${M(t.typeName)}</td>
            <td>${sw}${M(t.color)}</td>
            <td>${M(t.address||`-`)}</td>
            <td>${M(t.contact||`-`)}</td>
            <td>${M(t.phone||`-`)}</td>
            <td>${M(hz)}</td>
            <td>${M(mr)}</td>
            <td>
                <button class="btn btn-sm btn-outline edit-btn" data-id="${t.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${t.id}">删除</button>
            </td>`, e.appendChild(r)
            }), t && (t.textContent = String(a.length))
        } catch (t) {
            console.error(`加载库房失败`, t), e.innerHTML = ``;
            var i = t && t.message ? String(t.message) : `加载失败`;
            /HTML/i.test(i) && typeof location < `u` && location.protocol === `https:` && (i = `HTTPS 页面不能直连 HTTP 接口；若 http 访问会自动跳回 https，需为本站配置 /tl 反代或为 TL 启用 HTTPS（见页面顶部说明）。`), D(e, 10, i)
        }
    }
}
async function K() {
    let e = document.getElementById(`freight-table-body`),
        t = document.getElementById(`freight-count`),
        n = document.getElementById(`freight-page-size`);
    if (n && n.value && (o.pageSize = parseInt(n.value, 10) || o.pageSize), e) {
        E(e, 6, `正在加载运费配置...`);
        try {
            let n = ot().toString();
            var r = z(await Api.request(`GET`, `/tl/get_freight_list?` + n)),
                i = r.list;
            o.total = r.total, s = {}, e.innerHTML = ``, i.length || D(e, 6, `暂无运费数据`), i.forEach(function(t, n) {
                var r = v(t, [`id`, `运费id`, `freight_id`]),
                    i = r != null && !isNaN(r);
                i && (s[r] = t);
                var a = i ? r : _(t, [`id`, `运费id`, `freight_id`], n + 1);
                let o = _(t, [`仓库`, `仓库名`, `warehouse_name`], `-`),
                    c = _(t, [`冶炼厂`, `冶炼厂名`, `factory_name`], `-`),
                    l = _(t, [`运费`, `运费（元/吨）`, `运费（元/吨）`, `freight`, `freight_rate`], null),
                    u = Number(l);
                var d = _(t, [`生效日期`, `日期`, `生效时间`, `effective_date`, `date`, `生效`], ``) || `-`,
                    f = i ? `data-id="` + String(r) + `"` : `data-id="" disabled title="缺少运费主键，无法编辑或删除"`;
                let p = document.createElement(`tr`);
                p.innerHTML = `
            <td>${a}</td>
            <td>${o||`-`}</td>
            <td>${c||`-`}</td>
            <td>${isNaN(u)?`-`:u.toLocaleString()}</td>
            <td>${d}</td>
            <td>
                <button class="btn btn-sm btn-outline edit-btn" ${f}>编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" ${f}>删除</button>
            </td>`, e.appendChild(p)
            });
            var a = document.getElementById(`freight-page-rows`),
                c = o.total > 0 ? o.total : i.length;
            t && (t.textContent = String(c)), a && (a.textContent = String(i.length)), st(i.length)
        } catch (e) {
            alert(`加载运费配置失败: ` + e.message), t && (t.textContent = `0`);
            var l = document.getElementById(`freight-page-rows`);
            l && (l.textContent = `0`), st(0)
        }
    }
}
async function q() {
    let e = document.getElementById(`category-table-body`),
        t = document.getElementById(`category-count`);
    if (e) {
        E(e, 4, `正在加载回收品类...`);
        try {
            let r = await Api.request(`GET`, `/tl/get_category_mapping`),
                i = V(Api.unwrapData(r) || {}).list,
                a = se(i);
            if (!Array.isArray(a)) {
                e.innerHTML = ``, D(e, 4, `数据格式异常`);
                return
            }
            var n = ue(a);
            e.innerHTML = ``, n.length || D(e, 4, `暂无回收品类数据`), n.forEach(function(t) {
                let n = Array.isArray(t.aliases) ? t.aliases.join(`,`) : t.alias || ``,
                    r = document.createElement(`tr`);
                r.innerHTML = `
            <td>${t.id}</td>
            <td>${t.name}</td>
            <td>${n||`-`}</td>
            <td>
                <button class="btn btn-sm btn-outline edit-btn" data-id="${t.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${t.id}">删除</button>
            </td>`, e.appendChild(r)
            }), t && (t.textContent = String(n.length))
        } catch (e) {
            alert(`加载品类失败: ` + e.message), t && (t.textContent = `0`)
        }
    }
}
async function J() {
    let e = document.getElementById(`tax-config-table-body`),
        t = document.getElementById(`tax-config-count`);
    if (e) {
        E(e, 4, `正在加载换算比例...`);
        try {
            let n = await Api.request(`GET`, `/tl/get_tax_rates`),
                r = Api.unwrapList(n).map(function(e) {
                    return {
                        id: e.id,
                        smelterId: e.factory_id,
                        categoryId: 0,
                        rate: e.tax_rate,
                        taxType: e.tax_type,
                        smelter: {
                            name: e.factory_name || `冶炼厂` + e.factory_id
                        },
                        category: {
                            name: e.tax_type || `-`
                        },
                        createdAt: `-`
                    }
                });
            if (!Array.isArray(r)) {
                e.innerHTML = ``, D(e, 4, `数据格式异常`);
                return
            }
            e.innerHTML = ``, r.length || D(e, 4, `暂无换算比例配置`), r.forEach(function(t) {
                let n = t.smelter && t.smelter.name ? t.smelter.name : `-`,
                    r = y(t.taxType),
                    i = Number(t.rate),
                    a = document.createElement(`tr`);
                a.innerHTML = `
            <td>${t.id}</td>
            <td>${n} / ${r}</td>
            <td>${isNaN(i)?`-`:i.toFixed(4)}</td>
            <td>
                <button class="btn btn-sm btn-outline edit-btn" data-id="${t.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${t.id}">删除</button>
            </td>`, e.appendChild(a)
            }), t && (t.textContent = String(r.length))
        } catch (e) {
            alert(`加载换算比例失败: ` + e.message), t && (t.textContent = `0`)
        }
    }
}
async function Ot(e) {
    if (!e.length) return;
    let t = document.getElementById(`upload-progress`),
        n = document.getElementById(`progress-fill`),
        r = document.getElementById(`progress-percent`),
        i = document.getElementById(`progress-text`);
    t && (t.style.display = `block`), n && (n.style.width = `15%`), r && (r.textContent = `15%`), i && (i.textContent = `正在上传并识别…`);
    try {
        let t = await Api.uploadQuoteImage(e[0]);
        n && (n.style.width = `100%`), r && (r.textContent = `100%`);
        let i = Api.unwrapData(t) || t;
        await L(), Nt(i)
    } catch (e) {
        alert(`上传识别失败: ` + e.message), t && (t.style.display = `none`)
    }
}

function kt() {
    return new Date().toISOString().slice(0, 10)
}

function Y(e, t) {
    !t || !Array.isArray(e) || e.forEach(function(e) {
        e.full_data ||= {}, e.full_data.quote_date = t, e.full_data.报价日期 = t
    })
}

function At(e, t) {
    if (t == null || isNaN(t)) {
        e.价格 = null, e.普通价 = null, e.price = null, e.base_price = null;
        return
    }
    e.价格 = t, e.普通价 = t, e.price = t, e.base_price = t
}

function jt(e, t) {
    if (t == null || isNaN(t)) {
        e.价格_3pct增值税 = null, e.price_3pct_vat = null, e.tax3_price = null;
        return
    }
    e.价格_3pct增值税 = t, e.price_3pct_vat = t, e.tax3_price = t
}

function Mt(e, t) {
    if (t == null || isNaN(t)) {
        e.价格_13pct增值税 = null, e.price_13pct_vat = null, e.tax13_price = null;
        return
    }
    e.价格_13pct增值税 = t, e.price_13pct_vat = t, e.tax13_price = t
}

function ha(n) {
    return String(parseFloat(Number(n).toFixed(4)))
}

function va(n) {
    if (n == null || isNaN(n)) return null;
    return parseFloat(n.toFixed(10))
}

function fa() {
    var e = document.getElementById(`manual-tax3-mult`),
        t = document.getElementById(`manual-tax13-mult`);
    e && (e.textContent = `倍率` + ha(qManualTax.r3 != null ? 1 + qManualTax.r3 : 1.03)), t && (t.textContent = `倍率` + ha(qManualTax.r13 != null ? 1 + qManualTax.r13 : 1.13))
}
var qManualTax = {
    r3: null,
    r13: null
};

function ma(e) {
    qManualTax.r3 = e && e.r3 != null && !isNaN(e.r3) ? e.r3 : null;
    qManualTax.r13 = e && e.r13 != null && !isNaN(e.r13) ? e.r13 : null;
    fa()
}
async function da(e) {
    if (ma({
            r3: null,
            r13: null
        }), !e || isNaN(e)) return;
    try {
        var t = await Api.request(`GET`, `/tl/get_tax_rates?factory_ids=` + encodeURIComponent(String(e))),
            n = Api.unwrapList(t);
        if (!n.length) return;
        var r = null,
            a = null;
        n.forEach(function(e) {
            var t = e.tax_type == null ? e.taxType : e.tax_type,
                o = Number(e.tax_rate == null ? e.rate : e.tax_rate);
            isNaN(o) || (t === `3pct` ? r = o : t === `13pct` && (a = o))
        }), ma({
            r3: r,
            r13: a
        })
    } catch (e) {
        console.error(e)
    }
}

function pa() {
    var e = document.getElementById(`manual-base-price`),
        t = document.getElementById(`manual-tax3`),
        n = document.getElementById(`manual-tax13`);
    if (!e || !t || !n) return;
    var r = parseFloat(String(e.value || ``));
    if (isNaN(r) || r < 0) {
        t.value = ``, n.value = ``;
        return
    }
    var a = la(r);
    t.value = a.t3 != null ? String(a.t3) : ``, n.value = a.t13 != null ? String(a.t13) : ``
}

function la(e) {
    if (e == null || isNaN(e) || e < 0) return {
        t3: null,
        t13: null
    };
    var t = qManualTax.r3 != null ? 1 + qManualTax.r3 : 1.03,
        n = qManualTax.r13 != null ? 1 + qManualTax.r13 : 1.13;
    return {
        t3: va(t * e),
        t13: va(n * e)
    }
}

function ua(e, t, n, r) {
    var i = parseFloat(String(t.value || ``));
    if (At(e, isNaN(i) ? null : i), isNaN(i) || i < 0) {
        jt(e, null), Mt(e, null), n && (n.value = ``), r && (r.value = ``);
        return
    }
    var a = la(i);
    n && (n.value = String(a.t3)), r && (r.value = String(a.t13)), jt(e, a.t3), Mt(e, a.t13)
}

function Nt(e) {
    let t = document.getElementById(`upload-progress`),
        n = document.getElementById(`recognition-results`);
    if (t && (t.style.display = `none`), !n) return;
    n.style.display = `block`;
    let i = document.getElementById(`recognition-table-body`),
        a = Pt(e);
    a.forEach(function(e) {
        he(e), e.full_data && ge(e.full_data)
    }), r = a;
    var o = kt();
    if (a.forEach(function(e) {
            e.full_data ||= {};
            var t = e.full_data;
            _(t, [`quote_date`, `报价日期`], ``) || (t.quote_date = o, t.报价日期 = o)
        }), i) {
        i.innerHTML = ``;
        var s = 0;
        a.forEach(function(e) {
            (e.items || []).forEach(function(t) {
                var n = F(t);
                if (!j(n) && I(t)) {
                    s += 1;
                    var r = _(e.full_data || {}, [`quote_date`, `报价日期`, `date`], ``) || o,
                        c = _(t, [`冶炼厂名`, `冶炼厂`, `factory_name`, `smelter_name`], ``),
                        l = n,
                        u = v(t, [`普通价`, `价格`, `price`, `base_price`, `基准价`, `price_general`, `资源报价`]),
                        d = _(t, [`价格_3pct增值税`, `price_3pct_vat`, `tax3_price`], null),
                        f = _(t, [`价格_13pct增值税`, `price_13pct_vat`, `tax13_price`], null),
                        p = d == null ? null : Number(d),
                        m = f == null ? null : Number(f),
                        h = document.createElement(`tr`);
                    h.className = `recognition-edit-row`;
                    var g = document.createElement(`td`),
                        y = document.createElement(`input`);
                    y.type = `date`, y.className = `form-control rec-row-date`, y.value = String(r).slice(0, 10), y.addEventListener(`change`, function() {
                        var e = this.value;
                        Y(a, e), document.querySelectorAll(`#recognition-table-body .rec-row-date`).forEach(function(t) {
                            t.value = e
                        })
                    }), g.appendChild(y), h.appendChild(g);
                    var b = document.createElement(`td`),
                        x = document.createElement(`input`);
                    x.type = `text`, x.className = `form-control`, x.value = c, x.addEventListener(`input`, function() {
                        t.冶炼厂名 = this.value, t.冶炼厂 = this.value, t.factory_name = this.value, t.smelter_name = this.value
                    }), b.appendChild(x), h.appendChild(b);
                    var S = document.createElement(`td`),
                        C = document.createElement(`input`);
                    C.type = `text`, C.className = `form-control`, C.value = l, C.addEventListener(`input`, function() {
                        t.品类名 = this.value, t.品类 = this.value, t.category_name = this.value
                    }), S.appendChild(C), h.appendChild(S);
                    var w = document.createElement(`td`),
                        T = document.createElement(`input`);
                    T.type = `number`, T.className = `form-control`, T.step = `0.01`, T.min = `0`, T.placeholder = `基准价`, u != null && !isNaN(u) && (T.value = String(u)), T.addEventListener(`input`, function() {
                        ua(t, T, D, k)
                    }), T.addEventListener(`change`, function() {
                        ua(t, T, D, k)
                    }), w.appendChild(T), h.appendChild(w);
                    var E = document.createElement(`td`),
                        D = document.createElement(`input`);
                    D.type = `number`, D.className = `form-control`, D.step = `0.01`, D.min = `0`, D.placeholder = `3%含税`, p != null && !isNaN(p) && (D.value = String(p)), D.addEventListener(`change`, function() {
                        var e = parseFloat(this.value);
                        jt(t, isNaN(e) ? null : e)
                    }), E.appendChild(D), h.appendChild(E);
                    var O = document.createElement(`td`),
                        k = document.createElement(`input`);
                    k.type = `number`, k.className = `form-control`, k.step = `0.01`, k.min = `0`, k.placeholder = `其他含税`, m != null && !isNaN(m) && (k.value = String(m)), k.addEventListener(`change`, function() {
                        var e = parseFloat(this.value);
                        Mt(t, isNaN(e) ? null : e)
                    }), O.appendChild(k), h.appendChild(O), u != null && !isNaN(u) && u >= 0 && ua(t, T, D, k), i.appendChild(h)
                }
            })
        }), s || D(i, 6, `识别完成，但没有属于「固定十个品种（含别名）」的明细可展示。`)
    }
}

function Pt(e) {
    return !e || typeof e != `object` ? [] : Array.isArray(e.details) ? e.details : e.data && Array.isArray(e.data.details) ? e.data.details : Array.isArray(e.result) ? e.result : []
}
async function Ft() {
    let e = document.getElementById(`smelter-filter`);
    if (e) {
        e.innerHTML = `<option value="">全部冶炼厂</option>`;
        try {
            let t = await Api.request(`GET`, `/tl/get_smelters`);
            Api.unwrapList(t).filter(function(e) {
                return !b(C(e))
            }).forEach(function(t) {
                let n = document.createElement(`option`);
                n.value = S(t), n.textContent = C(t), e.appendChild(n)
            })
        } catch (e) {
            console.error(e)
        }
    }
    let t = document.getElementById(`category-filter`);
    if (t) {
        t.innerHTML = `<option value="">全部品类</option>`, await L();
        try {
            let e = await Api.request(`GET`, `/tl/get_categories`),
                c = ne(Api.unwrapList(e));
            var n = {};
            c.forEach(function(e) {
                n[Number(e.品类id)] = e
            });
            var r = [];
            if (l.length)
                for (var i = 0; i < l.length; i++) {
                    var a = l[i],
                        o = m[i];
                    if (o == null || isNaN(Number(o))) {
                        var s = c.find(function(e) {
                            return k(String(e.品类名 || ``)) === i
                        });
                        s && (o = Number(s.品类id))
                    }
                    o == null || isNaN(Number(o)) || (d.add(Number(o)), n[o], r.push({
                        品类id: o,
                        品类名: a
                    }))
                } else r = c;
            r.forEach(function(e) {
                let n = document.createElement(`option`);
                n.value = e.品类id, n.textContent = e.品类名, t.appendChild(n)
            }), t.selectedIndex = 0
        } catch (e) {
            console.error(e)
        }
    }
}

function It() {
    let e = new URLSearchParams,
        t = document.getElementById(`start-date`),
        n = document.getElementById(`end-date`);
    t && t.value && (e.set(`start_date`, t.value), e.set(`date_from`, t.value)), n && n.value && (e.set(`end_date`, n.value), e.set(`date_to`, n.value));
    let r = document.getElementById(`smelter-filter`);
    if (r && r.selectedOptions.length) {
        var i = r.selectedOptions[0].value;
        i && e.set(`factory_id`, i)
    }
    let a = document.getElementById(`category-filter`);
    if (a && a.options && a.options.length) {
        var o = a.selectedOptions[0],
            s = o ? String(o.value).trim() : ``,
            l = a.options[a.selectedIndex] && a.options[a.selectedIndex].textContent;
        if (s && s !== `undefined`) {
            e.set(`品类id`, s), e.set(`category_id`, s);
            var u = Number(s),
                d = isNaN(u) ? null : c[u] || c[String(u)],
                f = d && d.length ? d.join(`、`) : ``;
            !f && l && !/全部/.test(l) && (f = String(l).trim()), f && e.set(`category_name`, f)
        }
    }
    return e
}

function X(e, t) {
    let n = document.getElementById(`quote-table-body`),
        r = document.getElementById(`quote-count`);
    if (n) {
        n.innerHTML = ``;
        var i = (e || []).filter(function(e) {
            var t = F(e);
            return I(e) && !j(t)
        });
        qE = i, i.length || D(n, 7, e && e.length ? `接口有返回但无「固定十个品种（含别名）」范围内的数据。` : `暂无报价数据`), i.forEach(function(e, ix) {
            let t = _(e, [`冶炼厂`, `冶炼厂名`, `factory_name`, `smelterName`], ``),
                r = F(e),
                i = _(e, [`日期`, `报价日期`, `quote_date`, `date`], `-`),
                a = v(e, [`普通价`, `基准价`, `价格`, `price`, `base_price`, `basePrice`, `resource_price`, `资源报价`, `price_general`, `quote_price`, `基准价格`]),
                o = _(e, [`3%含税价`, `价格_3pct增值税`, `tax3_price`, `price_3pct_vat`], null),
                s = _(e, [`13%含税价`, `价格_13pct增值税`, `tax13_price`, `price_13pct_vat`], null),
                c = o == null ? null : Number(o),
                l = s == null ? null : Number(s),
                u = document.createElement(`tr`);
            u.innerHTML = `
            <td>${i||`-`}</td>
            <td>${t}</td>
            <td>${ve(r)}</td>
            <td>${a==null?`-`:a.toLocaleString()}</td>
            <td>${c!=null&&!isNaN(c)?c.toLocaleString():`-`}</td>
            <td>${l!=null&&!isNaN(l)?l.toLocaleString():`-`}</td>
            <td><button type="button" class="btn btn-sm btn-outline-primary quote-edit-btn" data-i="${ix}">编辑</button> <button type="button" class="btn btn-sm btn-outline-danger quote-delete-btn" data-i="${ix}">删除</button></td>`, n.appendChild(u)
        }), r && (r.textContent = String(i.length))
    }
}
async function Z() {
    let e = document.getElementById(`quote-table-body`);
    e && E(e, 7, `正在查询报价数据...`);
    try {
        let c = It();
        var t = Ce(c);
        if (!c.get(`品类id`)) {
            var n = we();
            if (!n.length) {
                e && (e.innerHTML = ``, D(e, 7, `未找到十个品种的品类 id，请先打开「回收品类管理」或刷新页面以加载映射。`));
                var r = document.getElementById(`quote-count`);
                r && (r.textContent = `0`);
                return
            }
            for (var i = {}, a = 0; a < n.length; a++)(await Ee(n[a], t)).forEach(function(e) {
                var t = B(e);
                t && !i[t] && (i[t] = e)
            });
            var o = Object.keys(i).map(function(e) {
                return i[e]
            });
            o.sort(Te), X(o, o.length);
            return
        }
        var s = await Ee(Number(c.get(`品类id`)), t);
        X(s, s.length)
    } catch (e) {
        alert(`查询报价失败: ` + e.message), X([])
    }
}

function Lt() {
    let e = document.getElementById(`start-date`),
        t = document.getElementById(`end-date`),
        n = document.getElementById(`smelter-filter`),
        r = document.getElementById(`category-filter`);
    e && (e.value = ``), t && (t.value = ``), n && Array.from(n.options).forEach(e => {
        e.selected = !1
    }), r && r.options.length && (r.selectedIndex = 0)
}
async function Rt() {
    try {
        let e = It();
        let t = e.toString(),
            n = await Api.getBlob(`/tl/export_quote_details_excel?` + t),
            r = window.URL.createObjectURL(n),
            i = document.createElement(`a`);
        i.href = r, i.download = `报价明细.xlsx`, document.body.appendChild(i), i.click(), i.remove(), window.URL.revokeObjectURL(r)
    } catch (e) {
        alert(`导出报价失败: ` + e.message)
    }
}

function renderWhComboList(prefix, rows, cfg) {
    cfg = cfg || {};
    var listEl = document.getElementById(prefix + `-warehouse-list`),
        hid = document.getElementById(prefix + `-warehouse`),
        searchEl = document.getElementById(prefix + `-warehouse-search`);
    if (!listEl || !hid) return;
    var q = searchEl && searchEl.value ? String(searchEl.value) : ``,
        sel = hid.value != null ? String(hid.value) : ``,
        filtered = (rows || []).filter(function(r) {
            return Kt(r, q)
        }),
        parts = [];
    if (cfg.allowAll) parts.push(`<button type="button" class="wh-sel-opt` + (sel === `` ? ` wh-sel-opt--on` : ``) + `" data-wh-id="">` + M(cfg.allLabel || `全部`) + `</button>`);
    for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i],
            id = w(r);
        if (!id) continue;
        var name = T(r),
            on = String(id) === sel;
        parts.push(`<button type="button" class="wh-sel-opt` + (on ? ` wh-sel-opt--on` : ``) + `" data-wh-id="` + id + `">` + M(name) + `</button>`)
    }
    listEl.innerHTML = parts.length ? parts.join(``) : `<p class="text-muted" style="margin:8px;text-align:center;font-size:13px;">` + M(cfg.emptyText || `无匹配库房`) + `</p>`;
    listEl.querySelectorAll(`button[data-wh-id]`).forEach(function(btn) {
        btn.addEventListener(`click`, function() {
            var id = btn.getAttribute(`data-wh-id`) || ``;
            hid.value = id;
            if (cfg.syncSearchOnPick && searchEl) {
                if (!id) searchEl.value = ``;
                else {
                    var row = (rows || []).find(function(r) {
                        return String(w(r)) === id
                    });
                    row && (searchEl.value = T(row))
                }
            }
            renderWhComboList(prefix, rows, cfg);
            cfg.onPick && cfg.onPick(id)
        })
    })
}

function Kt(e, n) {
    var r = String(n || ``).trim();
    if (!r) return !0;
    var i = String(w(e)),
        a = T(e),
        o = r.toLowerCase();
    return a.indexOf(r) !== -1 || i.indexOf(r) !== -1 || String(a).toLowerCase().indexOf(o) !== -1 || i.toLowerCase().indexOf(o) !== -1
}

function Xt() {
    var e = document.getElementById(`warehouse-select-list`),
        t = document.getElementById(`warehouse-select`),
        n = document.getElementById(`warehouse-select-filter`);
    if (!e || !t) return;
    e.style.display = ``;
    var r = n && n.value || ``,
        i = qW.filter(function(e) {
            return Kt(e, r)
        }),
        a = parseInt(String(t.value || ``), 10) || 0;
    e.innerHTML = i.length ? i.map(function(e) {
        var n = w(e),
            r = T(e),
            o = n === a;
        return `<button type="button" class="wh-sel-opt` + (o ? ` wh-sel-opt--on` : ``) + `" data-wh-id="` + n + `">` + M(r) + `</button>`
    }).join(``) : `<p class="text-muted" style="margin:8px;text-align:center;font-size:13px;">无匹配库房</p>`;
    e.querySelectorAll(`button[data-wh-id]`).forEach(function(btn) {
        btn.addEventListener(`click`, function() {
            var whId = parseInt(btn.getAttribute(`data-wh-id`), 10);
            t.value = whId && !isNaN(whId) ? String(whId) : ``;
            if (n && whId) {
                var row = qW.find(function(e) {
                    return w(e) === whId
                });
                row && (n.value = T(row))
            }
            e.style.display = `none`, Bt()
        })
    })
}
var msddOutsideHandler = null,
    msddReposHandler = null;

function msddUnbindRepos() {
    msddReposHandler && (window.removeEventListener(`resize`, msddReposHandler), window.removeEventListener(`scroll`, msddReposHandler, !0), msddReposHandler = null)
}

function msddPosition() {
    var tr = document.getElementById(`manual-smelter-trigger`),
        p = document.getElementById(`manual-smelter-panel`);
    if (!tr || !p || p.style.display === `none` || !p.style.display) return;
    var r = tr.getBoundingClientRect(),
        w = Math.max(200, r.width),
        left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
        below = r.bottom + 4,
        roomBelow = window.innerHeight - below - 8,
        roomAbove = r.top - 12,
        openBelow = roomBelow >= 160 || roomBelow >= roomAbove,
        top = openBelow ? below : Math.max(8, r.top - 4 - Math.min(280, roomAbove)),
        maxH = Math.min(280, openBelow ? roomBelow : roomAbove);
    p.style.position = `fixed`, p.style.left = left + `px`, p.style.width = w + `px`, p.style.right = `auto`, p.style.top = top + `px`, p.style.maxHeight = maxH + `px`;
    var wrap = p.querySelector(`.manual-smelter-table-wrap`);
    wrap && (wrap.style.maxHeight = Math.max(80, maxH - 12) + `px`)
}

function msddBindRepos() {
    msddReposHandler || (msddReposHandler = function() {
        msddPosition()
    }, window.addEventListener(`resize`, msddReposHandler), window.addEventListener(`scroll`, msddReposHandler, !0))
}

function msddClose() {
    var p = document.getElementById(`manual-smelter-panel`),
        tr = document.getElementById(`manual-smelter-trigger`);
    p && (p.style.display = `none`), tr && tr.setAttribute(`aria-expanded`, `false`), msddUnbindRepos()
}

function msddOpen() {
    var p = document.getElementById(`manual-smelter-panel`);
    p && (p.style.display = `block`, msddPosition(), msddBindRepos());
    var tr = document.getElementById(`manual-smelter-trigger`);
    tr && tr.setAttribute(`aria-expanded`, `true`)
}

function msddToggle() {
    var p = document.getElementById(`manual-smelter-panel`);
    if (!p) return;
    var o = p.style.display === `none` || !p.style.display || p.style.display === ``;
    o ? msddOpen() : msddClose()
}

function msddWire() {
    var root = document.querySelector(`.manual-smelter-dd`);
    if (!root) return;
    var tr = document.getElementById(`manual-smelter-trigger`);
    if (tr && !tr.dataset.msddTriggerWired) {
        tr.dataset.msddTriggerWired = `1`, tr.addEventListener(`click`, function(e) {
            e.stopPropagation(), msddToggle()
        });
        var lb = document.querySelector(`label[for="manual-smelter-trigger"]`);
        lb && !lb.dataset.msddLabelWired && (lb.dataset.msddLabelWired = `1`, lb.addEventListener(`click`, function(e) {
            e.preventDefault(), e.stopPropagation(), msddToggle()
        }))
    }
    msddOutsideHandler && (document.removeEventListener(`click`, msddOutsideHandler), msddOutsideHandler = null), msddOutsideHandler = function(e) {
        var r = document.querySelector(`.manual-smelter-dd`),
            p = document.getElementById(`manual-smelter-panel`),
            lb = document.querySelector(`label[for="manual-smelter-trigger"]`);
        if (!r || !p) return;
        var v = p.style.display;
        if (v === `none` || !v || v === ``) return;
        if (r.contains(e.target) || p.contains(e.target) || lb && lb.contains(e.target)) return;
        msddClose()
    }, document.addEventListener(`click`, msddOutsideHandler)
}

function msn() {
    var e = document.getElementById(`manual-smelter-tbody`),
        t = document.getElementById(`manual-smelter-id`),
        r = document.getElementById(`manual-smelter-name`),
        tr = document.getElementById(`manual-smelter-trigger`);
    if (!e) return;
    var a = qS,
        o = parseInt(String(t && t.value || ``), 10) || 0;
    e.innerHTML = a.length ? a.map(function(e) {
        var n = S(e),
            i = C(e),
            c = n === o;
        return `<tr class="manual-smelter-row` + (c ? ` manual-smelter-row--on` : ``) + `" data-sid="` + n + `" style="cursor:pointer"><td>` + M(i) + `</td><td>` + n + `</td></tr>`
    }).join(``) : `<tr><td colspan="2" class="text-muted" style="text-align:center;padding:10px">暂无冶炼厂</td></tr>`;
    e.querySelectorAll(`tr[data-sid]`).forEach(function(n) {
        n.addEventListener(`mousedown`, function(e) {
            e.stopPropagation()
        }), n.addEventListener(`click`, function(e) {
            e.stopPropagation();
            var i = parseInt(n.getAttribute(`data-sid`), 10),
                a = qS.find(function(e) {
                    return S(e) === i
                });
            t && (t.value = i && !isNaN(i) ? String(i) : ``), r && a && (r.value = C(a)), tr && a && (tr.value = C(a)), msddClose(), msn(), da(i).then(function() {
                pa()
            })
        })
    })
}
async function loadManualCategorySelect() {
    var sel = document.getElementById(`manual-category-name`);
    if (!sel || sel.tagName !== `SELECT`) return;
    try {
        await L();
        var resp = await Api.request(`GET`, `/tl/get_category_mapping`);
        var rawList = V(Api.unwrapData(resp) || {}).list;
        var list = ue(se(Array.isArray(rawList) ? rawList : []));
        sel.innerHTML = `<option value="">请选择品种</option>` + list.map(function(c) {
            var id = c.id,
                n = String(c.name || ``).trim();
            if (id == null || isNaN(Number(id)) || !n) return ``;
            return `<option value="` + String(id) + `">` + M(n) + `</option>`
        }).join(``)
    } catch (err) {
        console.error(`loadManualCategorySelect`, err)
    }
}
async function ns() {
    qS = [];
    var sel = document.getElementById(`manual-smelter-select`);
    if (!sel) return;
    try {
        sel.innerHTML = `<option value="">请选择冶炼厂</option>`, ma({
            r3: null,
            r13: null
        }), pa();
        let t = await Api.request(`GET`, `/tl/get_smelters`);
        qS = Api.unwrapList(t).filter(function(e) {
            return !b(C(e))
        }), qS.forEach(function(e) {
            var n = S(e),
                r = C(e);
            if (!n || !r) return;
            var i = document.createElement(`option`);
            i.value = String(n), i.textContent = r, sel.appendChild(i)
        }), sel.dataset.manualSmelterWired || (sel.dataset.manualSmelterWired = `1`, sel.addEventListener(`change`, function() {
            var e = parseInt(String(sel.value || ``), 10);
            isNaN(e) || !e ? ma({
                r3: null,
                r13: null
            }) : da(e).then(function() {
                pa()
            })
        }))
    } catch (err) {
        console.error(err), sel.innerHTML = `<option value="">冶炼厂加载失败</option>`
    }
}
async function zt() {
    let e = document.getElementById(`warehouse-select`),
        tf = document.getElementById(`warehouse-select-filter`),
        tl = document.getElementById(`warehouse-select-list`);
    if (e && tl) {
        e.value = ``, tf && (tf.value = ``), qW = [];
        try {
            let t = await Api.request(`GET`, `/tl/get_warehouses`);
            qW = Api.unwrapList(t).filter(function(e) {
                return !b(T(e))
            }), Xt()
        } catch (err) {
            console.error(err), tl.innerHTML = `<p class="text-muted" style="margin:8px;">库房加载失败</p>`
        }
    }
    let t = document.getElementById(`category-list`);
    if (t) {
        t.innerHTML = ``;
        try {
            await L();
            let e = await Api.request(`GET`, `/tl/get_categories`),
                u = ne(Api.unwrapList(e));
            if (!u.length) t.innerHTML = `<p class="text-muted" style="margin:0;padding:8px 0;">暂无品类数据，请确认接口 /tl/get_categories 有返回。</p>`;
            else
                for (var n = 0; n < l.length; n++) {
                    var r = l[n],
                        i = m[n],
                        a = null;
                    if (i != null && !isNaN(Number(i)) && (a = u.find(function(e) {
                            return Number(e.品类id) === Number(i)
                        })), a ||= u.find(function(e) {
                            return k(String(e.品类名 || ``)) === n
                        }), !a) continue;
                    var o = a.品类id;
                    o != null && o !== `` && !isNaN(Number(o)) && d.add(Number(o));
                    var s = ``,
                        c = `comparison-category-slot-` + String(n);
                    let e = document.createElement(`div`);
                    e.className = `checkbox-item`, e.innerHTML = `
                <input type="checkbox" id="${c}" data-category-id="${o}" ${s}>
                <label for="${c}">${M(r)}</label>`, t.appendChild(e), e.querySelector(`input[type=checkbox]`).addEventListener(`change`, function() {
                        Bt()
                    })
                }
            Bt()
        } catch (e) {
            console.error(e), t.innerHTML = `<p class="text-muted" style="margin:0;padding:8px 0;">品类加载失败，请打开控制台查看错误。</p>`
        }
    }
}

function Bt() {
    let e = document.getElementById(`comparison-type`),
        t = document.getElementById(`weight-inputs`);
    e && t && (e.value ? (t.style.display = `block`, Vt()) : t.style.display = `none`)
}

function Vt() {
    let e = document.getElementById(`weight-inputs-container`);
    if (e) {
        var t = {};
        e.querySelectorAll(`.weight-input`).forEach(function(e) {
            var n = e.getAttribute(`data-category-id`);
            n == null || n === `` || String(e.value == null ? `` : e.value).trim() !== `` && (t[String(n)] = e.value)
        }), e.innerHTML = ``, document.querySelectorAll(`#category-list input[type="checkbox"]:checked`).forEach(function(n) {
            let r = n.getAttribute(`data-category-id`),
                i = n.nextElementSibling,
                a = i ? i.textContent : ``,
                o = document.createElement(`div`);
            o.className = `weight-input-group`;
            let s = document.createElement(`label`);
            s.textContent = a + `重量（吨）`;
            let c = document.createElement(`input`);
            c.type = `number`, c.className = `form-control weight-input`, c.setAttribute(`data-category-id`, r || ``), c.setAttribute(`data-category-name`, a), c.placeholder = `请输入重量`, c.step = `0.1`, c.min = `0`;
            var l = r != null && r !== `` ? t[String(r)] : void 0;
            l != null && String(l).trim() !== `` && (c.value = l), o.appendChild(s), o.appendChild(c), e.appendChild(o)
        })
    }
}
async function Q() {
    let e = document.getElementById(`warehouse-select`),
        t = document.getElementById(`comparison-type`);
    if (!e || !t) return;
    let n = parseInt(e.value, 10);
    if (!n) {
        alert(`请选择发货库房`);
        return
    }
    let r = t.value;
    if (!r) {
        alert(`请选择比价类型`);
        return
    }
    let a = [],
        o = [];
    if (document.querySelectorAll(`.weight-input`).forEach(function(e) {
            let t = parseFloat(e.value) || 0,
                n = e.getAttribute(`data-category-id`);
            !n || t <= 0 || (a.push(parseInt(n, 10)), o.push(t))
        }), !a.length) {
        alert(`请输入至少一个品类的采购重量`);
        return
    }
    try {
        let e = await Api.request(`GET`, `/tl/get_smelters`),
            t = Api.unwrapList(e).map(function(e) {
                return S(e)
            }).filter(Boolean);
        var s = a.map(function(e) {
            var t = document.querySelector(`#category-list input[data-category-id="` + String(e) + `"]`),
                n = t && t.nextElementSibling;
            return n ? String(n.textContent || ``).trim() : ``
        });
        i = {
            warehouseId: n,
            categoryIds: a.slice(),
            weights: o.slice(),
            categoryNames: s,
            priceMode: r
        };
        var c = a.map(function(e, t) {
                return {
                    品类id: Number(e),
                    吨数: Number(o[t] || 0)
                }
            }).filter(function(e) {
                return isFinite(e.吨数) && e.吨数 > 0
            }),
            l = r === `tax3` ? `3pct` : null;
        let u = await Api.request(`POST`, `/tl/get_comparison`, {
            选中仓库id列表: [n],
            冶炼厂id列表: t,
            品类id列表: a,
            品类吨数列表: c,
            price_type: l,
            运费计价方式: `per_ton`,
            每车吨数: 35,
            最优价计税口径列表: r === `tax3` ? [`3pct`] : [`base`],
            最优价排序口径: r === `tax3` ? `3pct` : `base`
        });
        Ht(u, r)
    } catch (e) {
        alert(`比价计算失败: ` + e.message)
    }
}

function Ht(e, t) {
    t = t || i && i.priceMode || `base`;
    var T = (typeof globalThis !== `undefined` && globalThis.TlComparisonRanking) || (typeof window !== `undefined` && window.TlComparisonRanking);
    if (T && typeof T.rankingsFromComparisonResponse == `function`) {
        var mode = t === `tax3` ? `tax3` : `base`,
            raw = e && typeof e == `object` && !Array.isArray(e) ? e : {},
            detail = ye(e),
            ranks = T.rankingsFromComparisonResponse(raw, detail, mode);
        return a = ranks, Ut(ranks), void(ranks.length && Wt({
            silent: !0
        }))
    }
    var n = i;
    if (e && typeof e == `object` && !Array.isArray(e) && Array.isArray(e.冶炼厂利润排行) && e.冶炼厂利润排行.length) {
        for (var d = ye(e), f = e.冶炼厂利润排行, p = [], m = 0; m < f.length; m++) {
            var h = f[m],
                g = h.冶炼厂 || `-`,
                y = t === `tax3` ? v(h, [`利润_含3%合计`, `利润_含3%`, `利润`]) : v(h, [`利润_基准合计`, `利润_基准`, `利润`]),
                b = y == null ? 0 : Number(y),
                _ = {},
                k = 0,
                w = 0;
            d.forEach(function(e) {
                var t = e.冶炼厂 || ``,
                    n = t === g || t.includes(g) || g.includes(t);
                if (!n) return;
                var r = e.品类 || `-`,
                    i = v(e, [`单价`, `基准价`, `报价`]),
                    a = v(e, [`总价`, `报价金额`]),
                    o = v(e, [`总运费`]);
                _[r] = null != i && !isNaN(i) ? i : `-`, null != a && !isNaN(a) && (k += a), null != o && !isNaN(o) && (w += o)
            });
            if (!Object.keys(_).length) {
                var x = d.find(function(e) {
                    var t = e.冶炼厂 || ``;
                    return t === g || t.includes(g) || g.includes(t)
                });
                if (x) {
                    var P = x.品类 || `-`,
                        N = v(x, [`单价`, `基准价`, `报价`]);
                    _[P] = null != N && !isNaN(N) ? N : `-`, k || (k = v(x, [`总价`, `报价金额`]) || 0), w || (w = v(x, [`总运费`]) || 0)
                }
            }
            p.push({
                rank: m + 1,
                smelter: g,
                prices: _,
                totalRecovery: k,
                freightPerTon: 0,
                freightTotal: w,
                profit: b
            })
        }
        a = p, Ut(p), p.length && Wt({
            silent: !0
        });
        return
    }
    e = Array.isArray(e) ? e : ye(e);
    e = Array.isArray(e) ? e : [];
    let r = {};
    e.forEach(function(e) {
        var i = e.品类 || `-`;
        if (!j(i) && I(e)) {
            var a = (e.冶炼厂 || `-`) + `|` + (e.仓库 || `-`);
            r[a] || (r[a] = {
                smelter: e.冶炼厂 || `-`,
                prices: {},
                freightSum: 0,
                freightCount: 0,
                materialSum: 0,
                qtySum: 0
            });
            var o = r[a],
                s = be(e, t),
                c = xe(e),
                l = c == null ? NaN : Number(c),
                u = Se(e, n);
            o.prices[i] = s ?? `-`, isNaN(l) || (o.freightSum += l, o.freightCount += 1), o.qtySum += u, s != null && !isNaN(s) && u > 0 && (o.materialSum += s * u)
        }
    });
    let o = Object.values(r).map(function(e) {
        var t = e.freightCount ? e.freightSum / e.freightCount : 0,
            n = t * e.qtySum,
            r = e.materialSum - n;
        return {
            smelter: e.smelter,
            prices: e.prices,
            totalRecovery: e.materialSum,
            freightPerTon: t,
            freightTotal: n,
            profit: r
        }
    }).sort(function(e, t) {
        return t.profit - e.profit
    }).map(function(e, t) {
        return e.rank = t + 1, e
    });
    a = o, Ut(o), o.length && Wt({
        silent: !0
    })
}

function Ut(e) {
    function o0(n) {
        return Math.round(Number(n || 0) * 100) / 100
    }

    function f0(n) {
        return o0(n).toLocaleString(`zh-CN`, {
            maximumFractionDigits: 2
        })
    }

    function optYen(x) {
        if (x === void 0 || x === null || !Number.isFinite(x)) return ``;
        return `¥` + Number(x).toLocaleString(void 0, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    function fmtMoney(n) {
        if (n == null || !Number.isFinite(n)) return `—`;
        return `¥` + f0(n)
    }

    function fmtGross(n) {
        if (n == null || !Number.isFinite(n)) return `—`;
        return `¥` + f0(n)
    }

    function fmtVpt(row) {
        if (row.valuePerTon != null && Number.isFinite(row.valuePerTon)) return fmtMoney(row.valuePerTon);
        if (!row.qtySum || row.qtySum <= 0 || !Number.isFinite(row.netProfit)) return `—`;
        return fmtMoney(row.netProfit / row.qtySum)
    }

    function xrbTitle(row) {
        if (row.xunRongBaoExcludedPricing) return `本行为不含循融宝口径（来自接口「不含循融宝」对象）；运费与含循融宝行一致。`;
        var n = row.xunRongBaoSurchargeYuanPerTon,
            s = `列表金额与排序为含循融宝口径（与接口顶层字段一致）。`;
        return n != null && Number.isFinite(n) ? n + ` 元/吨（在不含税基准上加价后重算含税列）；` + s : `该冶炼厂已开循融宝。` + s
    }
    let t = document.getElementById(`comparison-results`),
        n = document.getElementById(`comparison-table-body`),
        r = document.getElementById(`best-smelter`),
        i = document.getElementById(`total-cost`),
        a = document.getElementById(`savings`);
    if (!t || !n) return;
    var legacy = e.length && e[0] && e[0].profit !== void 0 && e[0].netProfit === void 0;
    if (legacy) {
        t.style.display = `block`;
        r && (r.textContent = e.length > 0 ? e[0].smelter : `-`);
        i && (i.textContent = e.length > 0 ? `¥` + e[0].profit.toLocaleString() : `-`);
        a && (e.length > 1 ? a.textContent = `¥` + (e[0].profit - e[1].profit).toLocaleString() : a.textContent = `-`);
        n.innerHTML = ``;
        e.forEach(function(e) {
            var tr = document.createElement(`tr`),
                pr = Object.entries(e.prices).map(function(e) {
                    var t = String(e[0] || ``).trim() || `-`,
                        n = e[1],
                        r = n === `-` ? `-` : Number(n).toLocaleString();
                    return M(t) + `: ¥` + r
                }).join(`<br>`);
            var i = e.totalRecovery == null ? NaN : Number(e.totalRecovery),
                ac = !isFinite(i) || i === 0 ? `-` : `¥` + i.toLocaleString();
            tr.innerHTML = `
            <td>${e.rank}</td>
            <td>${M(e.smelter)}</td>
            <td>—</td>
            <td>${pr}</td>
            <td>${ac}</td>
            <td>¥${Number(e.freightTotal||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>¥${e.profit.toLocaleString()}</td>
            <td>—</td>
        `, n.appendChild(tr)
        });
        var po = document.getElementById(`purchase-suggestion-box`);
        return void(po && (po.style.display = e.length ? `block` : `none`))
    }
    t.style.display = `block`;
    var sorted = e.length ? e.slice().sort(function(x, y) {
            return x.rank - y.rank
        }) : [],
        first = sorted[0],
        second = sorted[1];
    r && (r.textContent = first ? first.smelter : `-`), i && (i.textContent = first ? fmtMoney(first.netProfit) : `-`), a && (second ? a.textContent = fmtMoney(first.netProfit - second.netProfit) : a.textContent = `-`), n.innerHTML = ``, e.forEach(function(e) {
        var cats = e.categoryPrices || e.prices || {},
            html = Object.keys(cats).length ? Object.entries(cats).map(function(t) {
                var n = String(t[0] || ``).trim() || `-`,
                    r = t[1];
                return r == null || !Number.isFinite(r) ? M(n) + `: —` : M(n) + `: ¥` + Number(r).toLocaleString(`zh-CN`)
            }).join(`<br>`) : e.unitPrice > 0 ? `均价: ¥` + Number(o0(e.unitPrice)).toLocaleString(`zh-CN`) : `—`;
        var rec = e.totalRecovery == null ? NaN : Number(e.totalRecovery),
            recCell = !isFinite(rec) || rec === 0 ? `—` : fmtMoney(rec);
        var vptCell = fmtVpt(e);
        var gpCell = fmtGross(e.grossProfit);
        var gptCell = fmtGross(e.grossProfitPerTon);
        var xrb = e.xunRongBao && !e.xunRongBaoExcludedPricing ? `<span class="ps-cmp-xrb" title="` + M(xrbTitle(e)) + `">循</span>` : ``;
        var tr = document.createElement(`tr`);
        tr.innerHTML = `
            <td><span class="ps-cmp-rank-wrap"><span class="ps-cmp-rank-num">${e.rank}</span>${xrb}</span></td>
            <td>${M(e.smelter)}</td>
            <td>${M(optYen(e.freightUnitPrice))}</td>
            <td>${html}</td>
            <td>${recCell}</td>
            <td>¥${Number(e.totalFreight||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>${fmtMoney(e.netProfit)}</td>
            <td>${vptCell}</td>
            <td>${gpCell}</td>
            <td>${gptCell}</td>
        `, n.appendChild(tr)
    });
    var pc = document.getElementById(`purchase-suggestion-box`);
    pc && (pc.style.display = e.length ? `block` : `none`)
}
async function Wt(e) {
    e ||= {};
    var t = !!e.silent;
    if (!i || !a.length) {
        t || alert(`请先完成比价计算`);
        return
    }
    let n = document.getElementById(`suggestion-text`),
        r = document.getElementById(`generate-suggestion-btn`);
    var o = r ? r.innerHTML : ``;
    n && (n.textContent = `正在生成配送建议…`), r && (r.disabled = !0, r.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 生成中…`);
    try {
        let e = a[0],
            t = await Api.request(`GET`, `/tl/get_smelters`),
            r = V(Api.unwrapData(t) || {}).list.find(function(t) {
                return C(t) === e.smelter
            }),
            o = r ? S(r) : 0;
        if (!o) throw Error(`未匹配到最优冶炼厂ID`);
        let s = i.categoryIds.map(function(e, t) {
                return {
                    smelter_id: o,
                    category_id: e,
                    demand: Number(i.weights[t] || 0)
                }
            }).filter(function(e) {
                return e.demand > 0
            }),
            c = await Api.request(`POST`, `/tl/get_purchase_suggestion`, {
                warehouse_ids: [i.warehouseId],
                demands: s
            }),
            l = Api.unwrapData(c) || {};
        n && (n.textContent = l.suggestion || JSON.stringify(l, null, 2))
    } catch (e) {
        var s = e.message || String(e),
            c = s;
        /403|Forbidden|not allowed|拒绝/i.test(s) && (c = `配送建议接口返回 403（拒绝访问）。

常见原因：调用上游 AI/大模型时被拒绝，或缺少/错误的 API 密钥、IP 白名单、套餐权限等。

请在部署环境检查相关配置（密钥、白名单、权限等），或联系运维处理。`), n && (n.textContent = c), t || alert(`生成配送建议失败

` + c)
    } finally {
        r && (r.disabled = !1, r.innerHTML = o || `<i class="fas fa-route"></i> 生成配送建议`)
    }
}

function $(e) {
    let n = document.getElementById(`smelter-table-body`),
        r = document.getElementById(`smelter-count`);
    if (!n) return;
    let i = (e || ``).trim().toLowerCase(),
        a = i ? t.filter(function(e) {
            return (e.name || ``).toLowerCase().includes(i) || (e.address || ``).toLowerCase().includes(i)
        }) : t.slice();
    n.innerHTML = ``, a.length || D(n, 4, i ? `未匹配到冶炼厂` : `暂无冶炼厂数据`), a.forEach(function(e) {
        let t = document.createElement(`tr`);
        t.innerHTML = `
            <td>${e.id}</td>
            <td>${M(e.name)}</td>
            <td>${M(e.typeName||`-`)}</td>
            <td>${M(e.address||`-`)}</td>
            <td>
                <button class="btn btn-sm btn-outline edit-btn" data-id="${e.id}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${e.id}">删除</button>
            </td>`, n.appendChild(t)
    }), r && (r.textContent = String(a.length))
}

function invFormHtml() {
    return `
        <form id="inv-manual-form">
            <div class="form-group">
                <label for="inv-warehouse-search">库房 <span class="required">*</span></label>
                <div class="warehouse-select-combo wh-modal-combo">
                    <input type="search" id="inv-warehouse-search" class="form-control" autocomplete="off" placeholder="输入名称或编号筛选，点击下方选择库房">
                    <div id="inv-warehouse-list" class="warehouse-select-list"></div>
                    <input type="hidden" id="inv-warehouse" value="">
                </div>
            </div>
            <div class="form-group">
                <label for="inv-category">回收品种 <span class="required">*</span></label>
                <select id="inv-category" class="form-control" required><option value="">请选择品种</option></select>
            </div>
            <div class="form-group">
                <label for="inv-stock">当前库存（吨） <span class="required">*</span></label>
                <input type="number" step="0.0001" min="0" id="inv-stock" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="inv-date">库存日期</label>
                <input type="date" id="inv-date" class="form-control">
                <small class="text-muted">留空则使用定价日历当天</small>
            </div>
        </form>`
}

function rcpFormHtml() {
    return `
        <form id="rcp-manual-form">
            <div class="form-group">
                <label for="rcp-warehouse-search">库房 <span class="required">*</span></label>
                <div class="warehouse-select-combo wh-modal-combo">
                    <input type="search" id="rcp-warehouse-search" class="form-control" autocomplete="off" placeholder="输入名称或编号筛选，点击下方选择库房">
                    <div id="rcp-warehouse-list" class="warehouse-select-list"></div>
                    <input type="hidden" id="rcp-warehouse" value="">
                </div>
            </div>
            <div class="form-group">
                <label for="rcp-category">回收品种 <span class="required">*</span></label>
                <select id="rcp-category" class="form-control" required><option value="">请选择品种</option></select>
            </div>
            <div class="form-group">
                <label for="rcp-price">价格（元/吨） <span class="required">*</span></label>
                <input type="number" step="0.01" min="0" id="rcp-price" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="rcp-date">价格日期</label>
                <input type="date" id="rcp-date" class="form-control" value="">
                <small class="text-muted">默认为当天</small>
            </div>
        </form>`
}

function rcpEditFormHtml() {
    return `
        <form id="rcp-edit-form">
            <div class="form-group">
                <label for="rcp-edit-price">价格（元/吨） <span class="required">*</span></label>
                <input type="number" step="0.01" min="0" id="rcp-edit-price" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="rcp-edit-date">价格日期</label>
                <input type="date" id="rcp-edit-date" class="form-control">
            </div>
        </form>`}
var modalWhRows=[];function renderModalWhCombo(e){renderWhComboList(e,modalWhRows,{syncSearchOnPick:!0})}async function setupModalWhCombo(e){var t=await Api.request(`GET`,`/tl/get_warehouses`);modalWhRows=Api.unwrapList(t).filter(function(e){return!b(T(e))});var n=document.getElementById(e+`-warehouse`),r=document.getElementById(e+`-warehouse-search`);n&&(n.value=``),r&&(r.value=``),r&&(r.oninput=function(){renderModalWhCombo(e)},r.onkeydown=function(t){if(t.key===`Enter`){t.preventDefault();var n=document.getElementById(e+`-warehouse-list`);if(!n)return;var r=n.querySelector(`button[data-wh-id]`);r&&r.click()}}),renderModalWhCombo(e)}
async function invFillCategorySelect(e){var t=document.getElementById(e);if(!t)return;var n=await Api.request(`GET`,`/tl/get_category_mapping`),r=V(Api.unwrapData(n)||{}).list,i=ue(se(Array.isArray(r)?r:[]));t.innerHTML=`<option value="">请选择品种</option>`+i.map(function(e){var t=e.id,n=String(e.name||``).trim();return t!=null&&!isNaN(Number(t))&&n?`<option value="`+String(t)+`">`+M(n)+`</option>`:``}).join(``)}
function invUpdatePager(){var e=document.getElementById(`inv-page-info`),t=document.getElementById(`inv-prev-btn`),n=document.getElementById(`inv-next-btn`),r=Math.max(1,Math.ceil((invPg.total||0)/invPg.pageSize));e&&(e.textContent=`第 `+invPg.page+` / `+r+` 页（共 `+invPg.total+` 条）`),t&&(t.disabled=invPg.page<=1),n&&(n.disabled=invPg.page>=r)}
async function invManualSubmit(){var e=parseInt(document.getElementById(`inv-warehouse`).value,10),t=parseInt(document.getElementById(`inv-category`).value,10),n=parseFloat(document.getElementById(`inv-stock`).value),r=document.getElementById(`inv-date`),i=r&&r.value?r.value.trim():``;if(!e||isNaN(e))throw Error(`请选择库房`);if(!t||isNaN(t))throw Error(`请选择回收品种`);if(isNaN(n)||n<0)throw Error(`请填写有效库存`);var a={库房id:e,品类id:t,当前库存:n};i&&(a.库存日期=i),await Api.request(`POST`,`/tl/warehouse_inventories`,a),invPg.page=1,await loadInventoryList()}
async function invDownloadTemplate(){try{var e=await Api.getBlob(`/tl/download_warehouse_inventory_template_excel`),t=window.URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`库房库存导入模板.xlsx`,document.body.appendChild(n),n.click(),n.remove(),window.URL.revokeObjectURL(t)}catch(e){alert(`下载模板失败: `+(e.message||String(e)))}}
async function invImportExcel(e){var t=e&&e[0];if(!t)return;if(!/\.(xlsx|xls)$/i.test(String(t.name||``))){alert(`请上传 Excel 文件（.xlsx/.xls）`);return}var n=document.getElementById(`import-inv-btn`),r=n?n.innerHTML:``;n&&(n.disabled=!0,n.innerHTML=`<i class="fas fa-spinner fa-spin"></i> 导入中...`);try{var i=new FormData;i.append(`file`,t);var o=await Api.request(`POST`,`/tl/import_warehouse_inventory_excel`,i),s=_(o,[`msg`,`message`],``)||_(Api.unwrapData(o),[`msg`,`message`],``);alert(s||`导入成功`),invPg.page=1,await loadInventoryList()}catch(e){alert(`导入失败: `+(e.message||String(e)))}finally{n&&(n.disabled=!1,n.innerHTML=r||`<i class="fas fa-file-import"></i> 导入库存表格`)}}
function rcpUpdatePager(){var e=document.getElementById(`rcp-page-info`),t=document.getElementById(`rcp-prev-btn`),n=document.getElementById(`rcp-next-btn`),r=Math.max(1,Math.ceil((rcpPg.total||0)/rcpPg.pageSize));e&&(e.textContent=`第 `+rcpPg.page+` / `+r+` 页（共 `+rcpPg.total+` 条）`),t&&(t.disabled=rcpPg.page<=1),n&&(n.disabled=rcpPg.page>=r)}
async function loadReceiptPriceList(){var e=document.getElementById(`rcp-table-body`),t=document.getElementById(`rcp-count`);if(!e)return;E(e,4,`正在加载收货价格...`);try{var ws=document.getElementById(`rcp-wh-search`),cf=document.getElementById(`rcp-category-filter`),df=document.getElementById(`rcp-date-from`),dt=document.getElementById(`rcp-date-to`),i=new URLSearchParams;i.set(`page`,String(rcpPg.page)),i.set(`page_size`,String(rcpPg.pageSize)),ws&&ws.value&&ws.value.trim()&&i.set(`keyword`,ws.value.trim()),cf&&cf.value&&i.set(`keyword`,cf.value),df&&df.value&&i.set(`date_from`,df.value),dt&&dt.value&&i.set(`date_to`,dt.value);var a=z(await Api.request(`GET`,`/tl/warehouse_receipt_prices?`+i.toString())),o=a.list||[];rcpPg.total=a.total||0,e.innerHTML=``,o.length||D(e,4,`暂无收货价格数据`),o.forEach(function(t){var n=v(t,[`id`,`price_id`]),r=_(t,[`库房名称`,`warehouse_name`],`-`),i=_(t,[`品类名`,`品类名称`,`category_name`],`-`),a=Number(_(t,[`价格`,`price`],null)),o=document.createElement(`tr`);var d=_(t,[`价格日期`,`price_date`,`日期`,`更新时间`,`updated_at`],`-`);if(d.length>10)d=d.slice(0,10);o.innerHTML=`<td>`+M(r)+`</td><td>`+M(i)+`</td><td>`+(isNaN(a)?`-`:a.toLocaleString())+`</td><td>`+M(d)+`</td><td><button class="btn btn-sm btn-outline edit-btn" data-id="`+String(n)+`">编辑</button> <button class="btn btn-sm btn-danger delete-btn" data-id="`+String(n)+`">删除</button></td>`,e.appendChild(o)}),t&&(t.textContent=String(rcpPg.total)),rcpUpdatePager()}catch(n){alert(`加载收货价格失败: `+(n.message||String(n))),t&&(t.textContent=`0`),e.innerHTML=``,D(e,4,n.message||`加载失败`),rcpUpdatePager()}}
async function rcpManualSubmit(){var e=parseInt(document.getElementById(`rcp-warehouse`).value,10),t=parseInt(document.getElementById(`rcp-category`).value,10),n=parseFloat(document.getElementById(`rcp-price`).value);if(!e||isNaN(e))throw Error(`请选择库房`);if(!t||isNaN(t))throw Error(`请选择回收品种`);if(isNaN(n)||n<0)throw Error(`请填写有效价格`);var rd=document.getElementById(`rcp-date`),rv=rd&&rd.value?rd.value.trim():``;var body={库房id:e,品类id:t,价格:n};if(rv)body.价格日期=rv;await Api.request(`POST`,`/tl/warehouse_receipt_prices`,body),rcpPg.page=1,await loadReceiptPriceList()}
async function rcpEditPrice(e,t){U(`编辑收货价格`,rcpEditFormHtml(),{onOpen:function(){var n=document.getElementById(`rcp-edit-price`);n&&!isNaN(t)&&(n.value=String(t));var ed=document.getElementById(`rcp-edit-date`);if(ed){var dv=_(`t`,["价格日期","price_date","日期"],"");ed.value=O(dv||"")}},onConfirm:async function(){var t=parseFloat(document.getElementById(`rcp-edit-price`).value);if(isNaN(t)||t<0)throw Error(`请填写有效价格`);var ed=document.getElementById(`rcp-edit-date`),ev=ed&&ed.value?ed.value.trim():``;var body={价格:t};if(ev)body.价格日期=ev;await Api.request(`PUT`,`/tl/warehouse_receipt_prices/`+String(e),body),await loadReceiptPriceList()}})}
async function rcpDeletePrice(e){if(!e||isNaN(e))return;if(!confirm(`确定删除该收货价格记录？`))return;try{await Api.request(`DELETE`,`/tl/warehouse_receipt_prices/`+String(e)),await loadReceiptPriceList()}catch(e){alert(`删除失败: `+(e.message||String(e)))}}
async function rcpDownloadTemplate(){try{var e=await Api.getBlob(`/tl/download_warehouse_receipt_prices_template_excel`),t=window.URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`库房收货价格导入模板.xlsx`,document.body.appendChild(n),n.click(),n.remove(),window.URL.revokeObjectURL(t)}catch(e){alert(`下载模板失败: `+(e.message||String(e)))}}
async function rcpImportExcel(e){var t=e&&e[0];if(!t)return;if(!/\.(xlsx|xls)$/i.test(String(t.name||``))){alert(`请上传 Excel 文件（.xlsx/.xls）`);return}var n=document.getElementById(`import-rcp-btn`),r=n?n.innerHTML:``;n&&(n.disabled=!0,n.innerHTML=`<i class="fas fa-spinner fa-spin"></i> 导入中...`);try{var i=new FormData;i.append(`file`,t);var a=await Api.request(`POST`,`/tl/import_warehouse_receipt_prices_excel`,i),o=_(a,[`msg`,`message`],``)||_(Api.unwrapData(a),[`msg`,`message`],``);alert(o||`导入成功`),rcpPg.page=1,await loadReceiptPriceList()}catch(e){alert(`导入失败: `+(e.message||String(e)))}finally{n&&(n.disabled=!1,n.innerHTML=r||`<i class="fas fa-file-import"></i> 导入价格表格`)}}
async function initReceiptPricePage(){console.log(`初始化收货价格管理页面`);function _addRcpDateFilters(){var _rs=document.getElementById(`rcp-reset-btn`);if(!_rs)return false;var _rf=_rs.parentElement;if(!_rf)return false;if(!document.getElementById(`rcp-date-from`)){var _df=document.createElement(`input`);_df.type=`date`;_df.id=`rcp-date-from`;_df.className=`form-control`;_df.title=`更新日期起`;_df.style.cssText=`max-width:150px;height:34px;`;_rf.insertBefore(_df,_rs)}if(!document.getElementById(`rcp-date-to`)){var _dt=document.createElement(`input`);_dt.type=`date`;_dt.id=`rcp-date-to`;_dt.className=`form-control`;_dt.title=`更新日期止`;_dt.style.cssText=`max-width:150px;height:34px;`;_rf.insertBefore(_dt,_rs)}var _dFrom=document.getElementById('rcp-date-from'),_dTo=document.getElementById('rcp-date-to');if(_dFrom&&!_dFrom.value){var _dft=new Date();_dTo&&(_dTo.value=_dft.toISOString().slice(0,10));_dft.setDate(_dft.getDate()-30);_dFrom.value=_dft.toISOString().slice(0,10)}return true}if(!_addRcpDateFilters()){var _rcpRetry=0;var _rcpTimer=setInterval(function(){if(_addRcpDateFilters()||++_rcpRetry>15)clearInterval(_rcpTimer)},200)}var e=document.getElementById(`add-rcp-btn`);e&&e.addEventListener(`click`,function(){U(`手工录入收货价格`,rcpFormHtml(),{onOpen:async function(){await setupModalWhCombo(`rcp`),await invFillCategorySelect(`rcp-category`);var rd=document.getElementById(`rcp-date`);rd&&(rd.value=kt())},onConfirm:function(){return rcpManualSubmit()}})});var t=document.getElementById(`download-rcp-template-btn`);t&&t.addEventListener(`click`,function(){rcpDownloadTemplate()});var n=document.getElementById(`import-rcp-btn`),r=document.getElementById(`rcp-import-input`);n&&r&&(n.addEventListener(`click`,function(){r.click()}),r.addEventListener(`change`,function(e){rcpImportExcel(e&&e.target?e.target.files:null),r.value=``}));var i=document.getElementById(`rcp-table-body`);i&&i.addEventListener(`click`,function(e){var t=e.target.closest(`.edit-btn`),n=e.target.closest(`.delete-btn`);if(t){var r=parseInt(t.getAttribute(`data-id`),10),i=t.closest(`tr`),a=i&&i.children&&i.children[2]?parseFloat(String(i.children[2].textContent||``).replace(/,/g,``)):NaN;rcpEditPrice(r,a)}n&&rcpDeletePrice(parseInt(n.getAttribute(`data-id`),10))});var a=document.getElementById(`rcp-search-btn`);a&&a.addEventListener(`click`,function(){rcpPg.page=1,loadReceiptPriceList()});var o=document.getElementById(`rcp-reset-btn`);o&&o.addEventListener(`click`,function(){var wf=document.getElementById(`rcp-warehouse-filter`);wf&&(wf.value=``);var ws=document.getElementById(`rcp-wh-search`);ws&&(ws.value=``);var cf=document.getElementById(`rcp-category-filter`);cf&&(cf.value=``);var df=document.getElementById(`rcp-date-from`);df&&(df.value=``);var dt=document.getElementById(`rcp-date-to`);dt&&(dt.value=``);rcpPg.page=1,loadReceiptPriceList()});var s=document.getElementById(`rcp-prev-btn`);s&&s.addEventListener(`click`,function(){rcpPg.page>1&&(--rcpPg.page,loadReceiptPriceList())});var c=document.getElementById(`rcp-next-btn`);c&&c.addEventListener(`click`,function(){rcpPg.page+=1,loadReceiptPriceList()});var qRcpW=[];function _rcpWhApply(){renderWhComboList(`rcp-wh`,qRcpW,{allowAll:!0,allLabel:`全部库房`})}async function _initRcpFilters(){try{var ws=await Api.request(`GET`,`/tl/get_warehouses`);qRcpW=Api.unwrapList(ws).filter(function(x){return!b(T(x))});var searchEl=document.getElementById(`rcp-wh-search`),listEl=document.getElementById(`rcp-wh-list`);if(searchEl){searchEl.value=``;searchEl.addEventListener(`input`,function(){listEl&&(listEl.style.display=``);_rcpWhApply()});searchEl.addEventListener(`focus`,function(){listEl&&(listEl.style.display=``);_rcpWhApply()});document.addEventListener(`click`,function(e){if(!searchEl.contains(e.target)&&listEl&&!listEl.contains(e.target))listEl.style.display=`none`})}if(listEl){listEl.addEventListener(`mousedown`,function(e){var btn=e.target.closest(`[data-wh-id]`);if(btn){setTimeout(function(){listEl.style.display=`none`},100)}})}await L();var resp=await Api.request(`GET`,`/tl/get_category_mapping`);var rawList=V(Api.unwrapData(resp)||{}).list;var cats=ue(se(Array.isArray(rawList)?rawList:[]));var cSel=document.getElementById(`rcp-category-filter`);if(cSel){cSel.innerHTML=`<option value="">全部品种</option>`+cats.map(function(c){var n=String(c.name||``).trim();if(!n)return``;return`<option value="`+M(n)+`">`+M(n)+`</option>`}).join(``)}}catch(e){console.warn(`加载收货价格筛选选项失败`,e)}}_initRcpFilters(),loadReceiptPriceList()}

async function invFillWarehouseSelect(e) {
    var t = document.getElementById(e);
    if (!t) return;
    var n = await Api.request(`GET`, `/tl/get_warehouses`),
        r = Api.unwrapList(n).filter(function(e) {
            return !b(T(e))
        });
    t.innerHTML = `<option value="">请选择库房</option>` + r.map(function(e) {
        var n = w(e),
            r = T(e);
        return n ? `<option value="` + String(n) + `">` + M(r || `库房 #` + n) + `</option>` : ``
    }).join(``)
}
async function loadInventoryList() {
    var e = document.getElementById(`inv-table-body`),
        t = document.getElementById(`inv-count`),
        n = document.getElementById(`inv-page-size`);
    if (n && n.value && (invPg.pageSize = parseInt(n.value, 10) || invPg.pageSize), !e) return;
    E(e, 5, `正在加载库存数据...`);
    try {
        var ws = document.getElementById(`inv-wh-search`),
            cf = document.getElementById(`inv-category-filter`),
            df = document.getElementById(`inv-date-from`),
            dt = document.getElementById(`inv-date-to`),
            i = new URLSearchParams;
        i.set(`page`, String(invPg.page));
        i.set(`page_size`, String(invPg.pageSize));
        ws && ws.value && ws.value.trim() && i.set(`keyword`, ws.value.trim());
        cf && cf.value && i.set(`category_id`, cf.value);
        df && df.value && i.set(`date_from`, df.value);
        dt && dt.value && i.set(`date_to`, dt.value);
        var a = z(await Api.request(`GET`, `/tl/warehouse_inventories?` + i.toString())),
            o = a.list || [];
        invPg.total = a.total || 0, e.innerHTML = ``, o.length || D(e, 5, `暂无库存数据`);
        o.forEach(function(t) {
            var n = v(t, [`库房id`, `id`, `record_id`]),
                r = _(t, [`库房名称`, `warehouse_name`], `-`),
                c = _(t, [`品类名`, `回收品种`, `category_name`], `-`),
                cid = v(t, [`品类id`, `category_id`]),
                i = Number(_(t, [`当前库存`, `stock`], null)),
                a = _(t, [`库存日期`, `inventory_date`], ``) || `-`,
                s = document.createElement(`tr`);
            s.innerHTML =
                `<td>` + M(r) + `</td>` +
                `<td>` + M(c) + `</td>` +
                `<td>` + (isNaN(i) ? `-` : i.toLocaleString()) + `</td>` +
                `<td>` + M(a) + `</td>` +
                `<td>` +
                `<button class="btn btn-sm btn-outline edit-inv-btn" data-id="${String(n)}" data-category-id="${String(cid || 0)}" data-stock="${String(isNaN(i) ? 0 : i)}" data-date="${M(a)}">修改</button> ` +
                `<button class="btn btn-sm btn-danger delete-inv-btn" data-id="${String(n)}" data-date="${M(a)}">删除</button>` +
                `</td>`;
            e.appendChild(s)
        }), t && (t.textContent = String(invPg.total)), invUpdatePager()
    } catch (n) {
        alert(`加载库存失败: ` + (n.message || String(n))), t && (t.textContent = `0`), e.innerHTML = ``, D(e, 5, n.message || `加载失败`), invUpdatePager()
    }
}

function invEditFormHtml() {
    return `
        <form id="inv-edit-form">
            <div class="form-group">
                <label for="inv-edit-stock">当前库存（吨） <span class="required">*</span></label>
                <input type="number" step="0.0001" min="0" id="inv-edit-stock" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="inv-edit-date">库存日期</label>
                <input type="date" id="inv-edit-date" class="form-control">
            </div>
        </form>`
}
async function invEditStock(e, t, n, cid) {
    if (!e || isNaN(e)) {
        alert(`记录ID无效，无法修改。请刷新页面后重试。`);
        return
    }
    U(`修改库存`, invEditFormHtml(), {
        onOpen: function() {
            var r = document.getElementById(`inv-edit-stock`);
            r && !isNaN(t) && (r.value = String(t));
            var i = document.getElementById(`inv-edit-date`);
            i && n && n !== `-` && (i.value = n)
        },
        onConfirm: async function() {
            var t = parseFloat(document.getElementById(`inv-edit-stock`).value),
                n = document.getElementById(`inv-edit-date`),
                r = n && n.value ? n.value.trim() : ``;
            if (isNaN(t) || t < 0) throw Error(`请填写有效库存`);
            console.log(`[库存调试] 编辑请求:`, {
                库房id: e,
                品类id: cid || 0,
                当前库存: t
            });
            var i = {
                库房id: e,
                品类id: cid || 0,
                当前库存: t
            };
            r && (i.库存日期 = r), await Api.request(`POST`, `/tl/warehouse_inventories`, i), await loadInventoryList()
        }
    })
}
async function invDeleteStock(id, date) {
    if (!id || !confirm('确定删除该库存记录？删除后不可恢复。')) return;
    try {
        var payload = {
            库房id: id
        };
        if (date) payload.库存日期 = date;
        var res = await fetch('/tl/warehouse_inventories', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + (localStorage.getItem('api_token') || '')
            },
            body: JSON.stringify(payload)
        });
        var txt = await res.text();
        var json = null;
        try {
            json = txt ? JSON.parse(txt) : null;
        } catch (e) {}
        if (!res.ok) throw new Error((json && json.message ? json.message : txt) || '删除失败');
        alert('删除成功');
        await loadInventoryList();
    } catch (e) {
        alert('删除失败: ' + (e.message || String(e)));
    }
}

async function initInventoryPage(){console.log(`初始化当前库存管理页面`);var _fr=document.querySelector(`.inv-rcp-filter-row`);if(_fr){if(!document.getElementById(`inv-date-from`)){var _df=document.createElement(`input`);_df.type=`date`;_df.id=`inv-date-from`;_df.className=`form-control`;_df.title=`库存日期起`;_df.style.cssText=`max-width:150px;height:34px;`;_fr.insertBefore(_df,_fr.querySelector(`#inv-reset-btn`)||null)}if(!document.getElementById(`inv-date-to`)){var _dt=document.createElement(`input`);_dt.type=`date`;_dt.id=`inv-date-to`;_dt.className=`form-control`;_dt.title=`库存日期止`;_dt.style.cssText=`max-width:150px;height:34px;`;_fr.insertBefore(_dt,_fr.querySelector(`#inv-reset-btn`)||null)}}var _invDFrom=document.getElementById('inv-date-from'),_invDTo=document.getElementById('inv-date-to');if(_invDFrom&&!_invDFrom.value){var _dft=new Date();_invDTo&&(_invDTo.value=_dft.toISOString().slice(0,10));_dft.setDate(_dft.getDate()-30);_invDFrom.value=_dft.toISOString().slice(0,10)}var e=document.getElementById(`add-inv-btn`);e&&e.addEventListener(`click`,function(){U(`手工录入库存`,invFormHtml(),{onOpen:async function(){await setupModalWhCombo(`inv`),await invFillCategorySelect(`inv-category`);var e=document.getElementById(`inv-date`);e&&!e.value&&(e.value=kt())},onConfirm:function(){return invManualSubmit()}})});var t=document.getElementById(`download-inv-template-btn`);t&&t.addEventListener(`click`,function(){invDownloadTemplate()});var n=document.getElementById(`import-inv-btn`),r=document.getElementById(`inv-import-input`);n&&r&&(n.addEventListener(`click`,function(){r.click()}),r.addEventListener(`change`,function(e){invImportExcel(e&&e.target?e.target.files:null),r.value=``}));var i=document.getElementById(`inv-table-body`);i&&i.addEventListener(`click`,function(e){var t=e.target.closest(`.edit-inv-btn`),d=e.target.closest(`.delete-inv-btn`);if(t){var n=parseInt(t.getAttribute(`data-id`),10),cid=parseInt(t.getAttribute(`data-category-id`),10)||0,r=parseFloat(t.getAttribute(`data-stock`))||0,i=t.getAttribute(`data-date`)||``;invEditStock(n,r,i,cid)}if(d){var did=parseInt(d.getAttribute(`data-id`),10),ddate=d.getAttribute(`data-date`)||``;invDeleteStock(did,ddate)}});var a=document.getElementById(`inv-search-btn`);a&&a.addEventListener(`click`,function(){invPg.page=1,loadInventoryList()});var o=document.getElementById(`inv-reset-btn`);o&&o.addEventListener(`click`,function(){var wf=document.getElementById(`inv-wh-warehouse`);wf&&(wf.value=``);var ws=document.getElementById(`inv-wh-search`);ws&&(ws.value=``);var cf=document.getElementById(`inv-category-filter`);cf&&(cf.value=``);var df=document.getElementById(`inv-date-from`);df&&(df.value=``);var dt=document.getElementById(`inv-date-to`);dt&&(dt.value=``);invPg.page=1,loadInventoryList()});var s=document.getElementById(`inv-prev-btn`);s&&s.addEventListener(`click`,function(){invPg.page>1&&(--invPg.page,loadInventoryList())});var c=document.getElementById(`inv-next-btn`);c&&c.addEventListener(`click`,function(){invPg.page+=1,loadInventoryList()});var l=document.getElementById(`inv-page-size`);l&&l.addEventListener(`change`,function(){invPg.pageSize=parseInt(this.value,10)||20,invPg.page=1,loadInventoryList()});var qInvW=[];function _invWhApply(){renderWhComboList(`inv-wh`,qInvW,{allowAll:!0,allLabel:`全部库房`})}async function _initInvFilters(){try{var ws=await Api.request(`GET`,`/tl/get_warehouses`);qInvW=Api.unwrapList(ws).filter(function(x){return!b(T(x))});var searchEl=document.getElementById(`inv-wh-search`),listEl=document.getElementById(`inv-wh-list`);if(searchEl){searchEl.value=``;searchEl.addEventListener(`input`,function(){listEl&&(listEl.style.display=``);_invWhApply()});searchEl.addEventListener(`focus`,function(){listEl&&(listEl.style.display=``);_invWhApply()});document.addEventListener(`click`,function(e){if(!searchEl.contains(e.target)&&listEl&&!listEl.contains(e.target))listEl.style.display=`none`})}if(listEl){listEl.addEventListener(`mousedown`,function(e){var btn=e.target.closest(`[data-wh-id]`);if(btn){setTimeout(function(){listEl.style.display=`none`},100)}})}await L();var resp=await Api.request(`GET`,`/tl/get_category_mapping`);var rawList=V(Api.unwrapData(resp)||{}).list;var cats=ue(se(Array.isArray(rawList)?rawList:[]));var cSel=document.getElementById(`inv-category-filter`);if(cSel){cSel.innerHTML=`<option value="">全部品种</option>`+cats.map(function(c){var id=c.id,n=String(c.name||``).trim();if(id==null||isNaN(Number(id))||!n)return``;return`<option value="`+String(id)+`">`+M(n)+`</option>`}).join(``)}}catch(e){console.warn(`加载库存筛选选项失败`,e)}}_initInvFilters(),loadInventoryList()}
console.log(`AI智能比价系统逻辑已加载完成`);
window._priceSystemNavigate = function(page) {
    try {
        Me(page)
    } catch (err) {
        console.warn('navigate error', err)
    }
};
window.addEventListener('message', function(e) {
    try {
        var d = e.data;
        if (d && d.type === 'navigate' && d.page) {
            window._priceSystemNavigate(d.page)
        }
    } catch (err) {
        console.warn('postMessage navigate error', err)
    }
});