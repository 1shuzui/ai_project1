<template>
  <div ref="emapShellRef" class="emap-shell emap-shell--dashboard">
    <div v-if="!toolbarCollapsed" class="emap-toolbar">
      <div class="emap-toolbar-row">
          <div class="emap-toolbar-main">
            <div class="emap-toolbar-heading">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary emap-toolbar-collapse-btn"
                title="收起筛选区，扩大地图可视区域"
                @click="toggleToolbarCollapse"
              >
                <i class="bi bi-chevron-up" aria-hidden="true"></i>
                收起
              </button>
              <div class="emap-toolbar-heading-text">
                <span class="emap-title">
                  <i class="bi bi-map"></i>
                  废铅蓄电池供应链服务系统
                </span>
                <span class="emap-toolbar-hint text-muted small"
                  >请先在下方选择<strong>比价类型</strong>并为品类填写<strong>吨数</strong>（至少一项
                  &gt; 0），再点击库房进行比价并绘制流向箭头。</span
                >
              </div>
            </div>
          </div>
          <div class="emap-toolbar-actions">
            <div class="emap-field">
              <label class="emap-field-label" for="emap-comparison-type">比价类型</label>
              <select
                id="emap-comparison-type"
                v-model="comparisonType"
                class="form-select form-select-sm emap-select"
              >
                <option value="base">基准价比价</option>
                <option value="tax3">3%含税价比价</option>
              </select>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              :disabled="loading"
              title="进入页面时会自动同步；点此立即从服务器拉取库房与冶炼厂并更新缓存"
              @click="onManualRefreshMarkers"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-1 text-light" role="status" />
              {{ loading ? '加载中…' : '刷新数据' }}
            </button>
          </div>
        </div>
        <div class="emap-toolbar-row emap-toolbar-row--categories">
          <div class="emap-cat-toolbar">
            <div class="emap-cat-toolbar-head">
              <span class="emap-field-label">回收品类（吨）</span>
              <span v-if="categoriesLoading" class="text-muted small">加载中…</span>
              <span v-else-if="categoriesError" class="emap-cat-toolbar-err small">{{ categoriesError }}</span>
              <span v-else class="text-muted small">勾选品类并填写吨数，至少一项 &gt; 0</span>
            </div>
            <div v-if="categories.length">
              <div class="emap-cat-toolbar-list">
                <label v-for="c in categories" :key="c.id" class="emap-cat-pill">
                  <input v-model="categoryPrefs[c.id].selected" type="checkbox" class="form-check-input" />
                  <span class="emap-cat-name">{{ c.name }}</span>
                  <input
                    v-model="categoryPrefs[c.id].tons"
                    type="number"
                    min="0"
                    step="0.01"
                    class="form-control form-control-sm emap-cat-tons"
                    placeholder="吨"
                    :disabled="!categoryPrefs[c.id].selected"
                  />
                </label>
              </div>
              <div class="emap-cat-toolbar-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-success"
                  :disabled="categoriesLoading || compareLoading || loading"
                  @click="confirmComparisonConditions"
                >
                  确定
                </button>
              </div>
            </div>
            <div v-else-if="!categoriesLoading && !categoriesError" class="text-muted small">
              暂无品类，请稍后刷新或检查接口。
            </div>
          </div>
        </div>
    </div>
    <div ref="mapWrapRef" class="emap-map-wrap" :class="{ 'emap-map-wrap--toolbar-collapsed': toolbarCollapsed }">
      <div
        v-if="toolbarCollapsed && !comparisonModalVisible && !warehouseDistanceMonitorOn"
        class="emap-map-tools-bubble emap-cmp-settings-bubble"
      >
        <button
          type="button"
          class="emap-map-tools-tab"
          title="展开比价类型、品类吨数等设置"
          @click="toggleToolbarCollapse"
        >
          比价设置
        </button>
      </div>
      <div ref="mapElRef" class="emap-map" />
      <div v-if="selectedWarehouse" class="emap-wh-selection-lock">
        <span class="emap-wh-selection-lock-label" :title="selectedWarehouse.title">{{
          selectedWarehouse.title
        }}</span>
        <button
          type="button"
          class="btn btn-sm emap-wh-selection-lock-btn"
          :class="warehouseSelectionLocked ? 'btn-warning' : 'btn-outline-secondary'"
          :title="
            warehouseSelectionLocked
              ? '已锁定当前库房，拖拽地图时不会误选其他库房；点击取消锁定'
              : '锁定当前库房，拖拽地图时避免误选其他库房'
          "
          @click="toggleWarehouseSelectionLock"
        >
          <i
            class="bi"
            :class="warehouseSelectionLocked ? 'bi-lock-fill' : 'bi-lock'"
            aria-hidden="true"
          ></i>
          {{ warehouseSelectionLocked ? '取消锁定' : '锁定库房' }}
        </button>
      </div>
      <div v-if="markersSyncing" class="emap-markers-sync-hint" role="status" aria-live="polite">
        <span class="spinner-border spinner-border-sm emap-markers-sync-hint-spin" aria-hidden="true" />
        正在从服务器同步库房与冶炼厂…
      </div>
      <div
        ref="mapToolsFloatRef"
        class="emap-map-tools-float"
        :class="{ 'emap-map-tools-float--default': mapToolsFloatTopPx == null }"
        :style="mapToolsFloatStyle"
      >
        <div
          v-if="mapToolsCollapsed"
          class="emap-map-tools-bubble"
          @pointerdown="onBubbleDragPointerDown"
        >
          <span class="emap-map-tools-drag-hint" aria-hidden="true" title="上下拖动">
            <i class="bi bi-grip-vertical" aria-hidden="true"></i>
          </span>
          <button type="button" class="emap-map-tools-tab" @click="mapToolsCollapsed = false">
            地图工具
          </button>
        </div>
        <transition name="emap-tools-slide">
          <div v-if="!mapToolsCollapsed" class="emap-map-tools">
            <div class="emap-map-tools-head" @pointerdown="onMapToolsHeadPointerDown">
              <span class="emap-map-tools-drag-hint" aria-hidden="true" title="按住标题栏上下拖动">
                <i class="bi bi-grip-vertical" aria-hidden="true"></i>
              </span>
              <div class="emap-map-tools-title">地图工具</div>
              <button
                type="button"
                class="emap-map-tools-collapse"
                title="收起工具栏"
                aria-label="收起地图工具"
                @pointerdown.stop
                @click.stop="mapToolsCollapsed = true"
              >
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          <label class="emap-tool-check">
            <input v-model="enableCoordPick" type="checkbox" class="form-check-input" />
            <span>点击坐标</span>
          </label>
          <label class="emap-tool-check">
            <input v-model="enableAutoZoomOnPointClick" type="checkbox" class="form-check-input" />
            <span>点击点位是否放大</span>
          </label>
          <label class="emap-tool-check">
            <input v-model="showAllComparisonFlows" type="checkbox" class="form-check-input" />
            <span>展示全部比价线</span>
          </label>
          <label class="emap-tool-check">
            <input v-model="showComparisonSmelterInfo" type="checkbox" class="form-check-input" />
            <span>比价时展示冶炼厂信息</span>
          </label>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary w-100 emap-tool-nearest-wh"
            :disabled="nearestWarehouseBusy || allWarehousePoints.length === 0"
            title="使用浏览器定位，地图飞到直线距离最近的库房"
            @click="focusNearestWarehouseFromGeolocation"
          >
            {{ nearestWarehouseBusy ? '定位中…' : '定位最近仓库' }}
          </button>
          <div class="emap-tool-block">
            <span class="emap-tool-block-label">搜索库房 / 冶炼厂</span>
            <div class="emap-tool-search-wrap">
              <div class="emap-tool-search-row">
                <input
                  v-model="emapMapSearchText"
                  type="search"
                  class="form-control form-control-sm"
                  placeholder="输入名称，列表中选点"
                  autocomplete="off"
                  aria-autocomplete="list"
                  :aria-expanded="emapPointSearchOpen"
                  aria-controls="emap-point-search-list"
                  @focus="onEmapPointSearchFocus"
                  @blur="onEmapPointSearchBlur"
                  @input="onEmapPointSearchInput"
                  @keydown.enter.prevent="runEmapPointSearch"
                  @keydown.down.prevent="onEmapPointSearchKeyArrow('down')"
                  @keydown.up.prevent="onEmapPointSearchKeyArrow('up')"
                  @keydown.escape.prevent="emapPointSearchOpen = false"
                />
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary flex-shrink-0"
                  title="定位到当前高亮项（或第一项）"
                  @mousedown.prevent
                  @click="runEmapPointSearch"
                >
                  定位
                </button>
              </div>
              <div
                v-show="emapPointSearchOpen && emapMapSearchText.trim()"
                id="emap-point-search-list"
                class="emap-point-search-dropdown"
                role="listbox"
                aria-label="名称匹配结果"
              >
                <template v-if="emapPointSearchCandidates.length">
                  <button
                    v-for="(p, idx) in emapPointSearchCandidates"
                    :id="'emap-point-search-' + idx"
                    :key="p.kind + '-' + p.id"
                    type="button"
                    class="emap-point-search-item"
                    :class="{ 'emap-point-search-item--active': idx === emapPointSearchActiveIdx }"
                    role="option"
                    :aria-selected="idx === emapPointSearchActiveIdx"
                    @mousedown.prevent="focusMapPointFromSearch(p)"
                    @mouseenter="emapPointSearchActiveIdx = idx"
                  >
                    <span class="emap-point-search-item-title">{{ p.title }}</span>
                    <span class="emap-point-search-item-meta">
                      <span class="emap-point-search-item-kind">{{
                        p.kind === 'warehouse' ? '库房' : '冶炼厂'
                      }}</span>
                      <span v-if="p.subtitle" class="emap-point-search-item-sub">{{ p.subtitle }}</span>
                    </span>
                  </button>
                </template>
                <div v-else class="emap-point-search-empty">无匹配名称，请修改关键词</div>
              </div>
            </div>
            <p v-if="emapSearchFeedback" class="emap-tool-hint text-muted mb-0">{{ emapSearchFeedback }}</p>
          </div>
          <div class="emap-tool-block">
            <label class="emap-tool-block-label" for="emap-province-filter">按省筛选</label>
            <select
              id="emap-province-filter"
              v-model="emapProvinceFilter"
              class="form-select form-select-sm"
              title="34 个省级行政区；地图绘制省界红线，并筛选库房/冶炼厂"
            >
              <option value="">全部（不筛选）</option>
              <option v-for="it in EMAP_CHINA_REGION_OPTIONS" :key="it.value" :value="it.value">
                {{ it.label }}
              </option>
            </select>
            <p class="emap-tool-hint text-muted mb-0">
              外省标记变淡；鼠标移到外省点上可临时恢复样式。选中省后在地图上用红线标出省界（需联网加载边界数据）。
            </p>
          </div>
          <div v-if="lastClickedCoordText" class="emap-tool-coord text-muted">
            {{ lastClickedCoordText }}
          </div>
          </div>
        </transition>
        <div
          v-if="emapProvinceFilter.trim()"
          class="emap-province-facilities"
        >
          <button
            type="button"
            class="emap-province-facilities-head"
            :aria-expanded="!provinceFacilitiesPanelCollapsed"
            title="展开或收起本省库房与冶炼厂列表"
            @click="provinceFacilitiesPanelCollapsed = !provinceFacilitiesPanelCollapsed"
          >
            <span class="emap-province-facilities-head-row">
              <span class="emap-province-facilities-title">{{ emapProvinceFilter.trim() }}</span>
              <i
                class="bi emap-province-facilities-chevron"
                :class="provinceFacilitiesPanelCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'"
                aria-hidden="true"
              />
            </span>
            <span class="emap-province-facilities-meta">
              库房 {{ emapProvinceWarehousePoints.length }} · 冶炼厂 {{ emapProvinceSmelterPoints.length }}
            </span>
          </button>
          <div v-show="!provinceFacilitiesPanelCollapsed" class="emap-province-facilities-body">
            <div class="emap-province-facilities-section">
              <button
                type="button"
                class="emap-province-facilities-section-toggle"
                :aria-expanded="provinceListWarehouseSectionOpen"
                @click="provinceListWarehouseSectionOpen = !provinceListWarehouseSectionOpen"
              >
                <span>库房（{{ emapProvinceWarehousePoints.length }}）</span>
                <i
                  class="bi"
                  :class="provinceListWarehouseSectionOpen ? 'bi-chevron-up' : 'bi-chevron-down'"
                  aria-hidden="true"
                />
              </button>
              <ul
                v-show="provinceListWarehouseSectionOpen"
                class="emap-province-facilities-list"
                aria-label="本省库房"
              >
                <li v-for="p in emapProvinceWarehousePoints" :key="'emap-prov-wh-' + p.id">
                  <button
                    type="button"
                    class="emap-province-facilities-item"
                    :title="p.subtitle || p.title"
                    @click="focusMapPointFromSearch(p, { silent: true })"
                  >
                    <span class="emap-province-facilities-item-title">{{ p.title }}</span>
                    <span v-if="p.subtitle" class="emap-province-facilities-item-sub">{{ p.subtitle }}</span>
                  </button>
                </li>
                <li v-if="!emapProvinceWarehousePoints.length" class="emap-province-facilities-empty">
                  该省暂无库房数据
                </li>
              </ul>
            </div>
            <div class="emap-province-facilities-section">
              <button
                type="button"
                class="emap-province-facilities-section-toggle"
                :aria-expanded="provinceListSmelterSectionOpen"
                @click="provinceListSmelterSectionOpen = !provinceListSmelterSectionOpen"
              >
                <span>冶炼厂（{{ emapProvinceSmelterPoints.length }}）</span>
                <i
                  class="bi"
                  :class="provinceListSmelterSectionOpen ? 'bi-chevron-up' : 'bi-chevron-down'"
                  aria-hidden="true"
                />
              </button>
              <ul
                v-show="provinceListSmelterSectionOpen"
                class="emap-province-facilities-list"
                aria-label="本省冶炼厂"
              >
                <li v-for="p in emapProvinceSmelterPoints" :key="'emap-prov-sm-' + p.id">
                  <button
                    type="button"
                    class="emap-province-facilities-item"
                    :title="p.subtitle || p.title"
                    @click="focusMapPointFromSearch(p, { silent: true })"
                  >
                    <span class="emap-province-facilities-item-title">{{ p.title }}</span>
                    <span v-if="p.subtitle" class="emap-province-facilities-item-sub">{{ p.subtitle }}</span>
                  </button>
                </li>
                <li v-if="!emapProvinceSmelterPoints.length" class="emap-province-facilities-empty">
                  该省暂无冶炼厂数据
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-if="selectedWarehouse" class="emap-floating-actions">
        <p v-if="compareError" class="emap-floating-actions-err small text-danger mb-0" role="alert">
          {{ compareError }}
        </p>
        <div class="emap-floating-actions-btns">
          <button
            v-if="comparisonRanks.length"
            type="button"
            class="btn btn-sm btn-outline-dark"
            @click="openComparisonModal"
          >
            查看比价预测结果
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-info"
            :disabled="warehouseDistanceLoading"
            :title="
              warehouseDistanceMonitorOn
                ? '关闭库房绑定距离线，可恢复显示比价流向'
                : '绘制当前库房到各绑定库房的直线并标注球面距离（与比价线互斥）'
            "
            @click="onWarehouseDistanceMonitorClick"
          >
            {{
              warehouseDistanceLoading
                ? '测算中…'
                : warehouseDistanceMonitorOn
                  ? '关闭距离监测'
                  : '库房距离监测'
            }}
          </button>
        </div>
      </div>
      <div
        v-if="comparisonModalVisible || warehouseDistanceMonitorOn"
        class="emap-cmp-panel"
        :class="{
          'emap-cmp-panel--compact':
            comparisonSectionCollapsed && forecastSectionCollapsed && !warehouseDistanceMonitorOn,
          'emap-cmp-panel--distance': warehouseDistanceMonitorOn,
        }"
      >
        <div class="emap-cmp-panel-head">
          <div class="emap-cmp-panel-head-main">
            <div
              v-if="toolbarCollapsed"
              class="emap-map-tools-bubble emap-cmp-settings-bubble emap-cmp-settings-bubble--head"
            >
              <button
                type="button"
                class="emap-cmp-settings-head-btn"
                title="展开比价类型、品类吨数等设置"
                @click="toggleToolbarCollapse"
              >
                比价设置
              </button>
            </div>
            <h4 class="emap-cmp-panel-title">{{ comparisonModalTitle }}</h4>
          </div>
          <div class="emap-cmp-panel-head-actions">
            <button
              v-if="!warehouseDistanceMonitorOn"
              type="button"
              class="emap-cmp-panel-toggle"
              :title="comparisonSectionCollapsed ? '展开比价' : '收起比价'"
              @click="comparisonSectionCollapsed = !comparisonSectionCollapsed"
            >
              {{ comparisonSectionCollapsed ? '展开比价' : '收起比价' }}
            </button>
            <button
              v-if="!warehouseDistanceMonitorOn"
              type="button"
              class="emap-cmp-panel-toggle"
              :title="forecastSectionCollapsed ? '展开预测' : '收起预测'"
              @click="forecastSectionCollapsed = !forecastSectionCollapsed"
            >
              {{ forecastSectionCollapsed ? '展开预测' : '收起预测' }}
            </button>
            <button type="button" class="emap-cmp-panel-close" @click="closeComparisonModal">&times;</button>
          </div>
        </div>
        <div v-if="warehouseDistanceMonitorOn" class="emap-wh-dist-section">
          <p v-if="warehouseDistanceLoading" class="emap-wh-dist-loading text-muted mb-0">正在加载绑定与距离…</p>
          <div v-else class="emap-cmp-table-wrap emap-wh-dist-table-wrap">
            <table class="table table-sm table-striped align-middle mb-0 emap-cmp-table emap-wh-dist-table">
              <thead>
                <tr>
                  <th>对标库房</th>
                  <th class="emap-wh-dist-col-km">库房距离</th>
                  <th>阶梯价差</th>
                  <th>实际价差</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!warehouseDistanceTableRows.length">
                  <td colspan="4" class="text-center text-muted py-3">暂无绑定库房</td>
                </tr>
                <tr
                  v-for="r in warehouseDistanceTableRows"
                  :key="`wh-dist-${r.toId}`"
                  :class="{ 'emap-wh-dist-row--focus': warehouseDistanceFocusToId === r.toId }"
                >
                  <td class="emap-wh-dist-col-name">
                    <div class="emap-wh-dist-name-cell">
                      <button
                        type="button"
                        class="emap-wh-dist-locate"
                        title="定位到地图查看距离卡片"
                        :aria-label="`定位到${r.toName}`"
                        @click.stop="focusWarehouseDistanceBindTarget(r.toId)"
                      >
                        <i class="bi bi-geo-alt" aria-hidden="true"></i>
                      </button>
                      <span class="emap-wh-dist-name-text">{{ r.toName }}</span>
                    </div>
                  </td>
                  <td class="emap-wh-dist-col-km">{{ r.distanceText }}</td>
                  <td>{{ r.tierPriceDiff }}</td>
                  <td>{{ r.realTimeDiff }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="!comparisonSectionCollapsed && !warehouseDistanceMonitorOn" class="emap-cmp-summary">
          <div class="emap-cmp-summary-card">
            <div class="emap-cmp-summary-label">最优方案</div>
            <div class="emap-cmp-summary-value">{{ comparisonSummary.bestSmelter || '-' }}</div>
          </div>
          <div class="emap-cmp-summary-card">
            <div class="emap-cmp-summary-label">净货款</div>
            <div class="emap-cmp-summary-value">¥ {{ formatNum(comparisonSummary.bestProfit) }}</div>
          </div>
          <div class="emap-cmp-summary-card">
            <div class="emap-cmp-summary-label">较第二名多赚</div>
            <div class="emap-cmp-summary-value">¥ {{ formatNum(comparisonSummary.marginToSecond) }}</div>
          </div>
        </div>
        <div v-if="!comparisonSectionCollapsed && !warehouseDistanceMonitorOn" class="emap-cmp-table-wrap">
          <table class="table table-sm table-striped align-middle mb-0 emap-cmp-table">
            <thead>
              <tr>
                <th class="emap-cmp-col-rank">排名</th>
                <th class="emap-cmp-col-smelter">冶炼厂名称</th>
                <th class="emap-cmp-col-unit">运费单价</th>
                <th class="emap-cmp-col-cats">冶炼厂回收单价</th>
                <th class="emap-cmp-col-money">总货款</th>
                <th class="emap-cmp-col-money">总运费</th>
                <th class="emap-cmp-col-money">净货款</th>
                <th class="emap-cmp-col-money">每吨净值</th>
                <th class="emap-cmp-col-money">毛利</th>
                <th class="emap-cmp-col-money">每吨毛利</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!comparisonRanks.length">
                <td colspan="10" class="text-center text-muted py-3 emap-cmp-table-empty">
                  暂无比价明细
                </td>
              </tr>
              <tr
                v-for="row in comparisonRanks"
                :key="`${row.rank}-${row.smelter}-${row.xunRongBaoExcludedPricing ? 'ex' : 'in'}`"
              >
                <td class="emap-cmp-col-rank">
                  <span class="emap-cmp-rank-wrap">
                    <span class="emap-cmp-rank-num">{{ row.rank }}</span>
                    <span
                      v-if="row.xunRongBao"
                      class="emap-cmp-xrb-on-rank"
                      :title="comparisonXunRongBaoTitle(row)"
                      aria-label="循融宝"
                      >循</span>
                  </span>
                </td>
                <td class="emap-cmp-col-smelter">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整名称"
                    @click.stop="openComparisonCellDetail('冶炼厂名称', row.smelter)"
                    @keydown.enter.prevent="openComparisonCellDetail('冶炼厂名称', row.smelter)"
                    >{{ row.smelter }}</span>
                </td>
                <td class="emap-cmp-col-unit">
                  <span
                    v-if="comparisonFreightUnitMoneyCellText(row)"
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail(
                        '运费单价',
                        comparisonFreightUnitMoneyCellText(row)!,
                      )
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail(
                        '运费单价',
                        comparisonFreightUnitMoneyCellText(row)!,
                      )
                    "
                    >{{ comparisonFreightUnitMoneyCellText(row) }}</span>
                </td>
                <td class="emap-cmp-col-cats">
                  <div
                    class="emap-cmp-cats-clip"
                    tabindex="0"
                    role="button"
                    title="点击查看全部品类单价"
                    @click.stop="
                      openComparisonCellDetail(
                        '冶炼厂回收单价',
                        formatComparisonCategoryPricesPlain(row),
                      )
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail(
                        '冶炼厂回收单价',
                        formatComparisonCategoryPricesPlain(row),
                      )
                    "
                    v-html="formatComparisonCategoryPricesHtml(row)"
                  />
                </td>
                <td class="emap-cmp-col-money">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail(
                        '总货款',
                        formatComparisonTotalRecoveryCell(row.totalRecovery),
                      )
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail(
                        '总货款',
                        formatComparisonTotalRecoveryCell(row.totalRecovery),
                      )
                    "
                    >{{ formatComparisonTotalRecoveryCell(row.totalRecovery) }}</span>
                </td>
                <td class="emap-cmp-col-money">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail('总运费', formatComparisonFreightCell(row.totalFreight))
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail('总运费', formatComparisonFreightCell(row.totalFreight))
                    "
                    >{{ formatComparisonFreightCell(row.totalFreight) }}</span>
                </td>
                <td class="emap-cmp-col-money text-success fw-semibold">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail('净货款', formatComparisonNetProfitCell(row))
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail('净货款', formatComparisonNetProfitCell(row))
                    "
                    >{{ formatComparisonNetProfitCell(row) }}</span>
                </td>
                <td class="emap-cmp-col-money">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail('每吨净值', formatValuePerTonCell(row))
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail('每吨净值', formatValuePerTonCell(row))
                    "
                    >{{ formatValuePerTonCell(row) }}</span>
                </td>
                <td class="emap-cmp-col-money">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail('毛利', formatComparisonGrossProfitCell(row.grossProfit))
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail('毛利', formatComparisonGrossProfitCell(row.grossProfit))
                    "
                    >{{ formatComparisonGrossProfitCell(row.grossProfit) }}</span>
                </td>
                <td class="emap-cmp-col-money">
                  <span
                    class="emap-cmp-cell-truncate"
                    tabindex="0"
                    role="button"
                    title="点击查看完整内容"
                    @click.stop="
                      openComparisonCellDetail(
                        '每吨毛利',
                        formatComparisonGrossProfitCell(row.grossProfitPerTon),
                      )
                    "
                    @keydown.enter.prevent="
                      openComparisonCellDetail(
                        '每吨毛利',
                        formatComparisonGrossProfitCell(row.grossProfitPerTon),
                      )
                    "
                    >{{ formatComparisonGrossProfitCell(row.grossProfitPerTon) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!forecastSectionCollapsed && !warehouseDistanceMonitorOn" class="emap-cmp-forecast">
          <div class="emap-cmp-forecast-head">
            <div class="emap-cmp-forecast-title">送货量预测</div>
            <div class="emap-cmp-forecast-actions">
              <button
                type="button"
                class="btn btn-sm btn-outline-success"
                :disabled="forecastLoading || !selectedWarehouse"
                @click="selectedWarehouse && runForecastForWarehouse(selectedWarehouse)"
              >
                {{ forecastLoading ? '预测中…' : '重新预测' }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                :disabled="!forecastModalDates.length"
                @click="exportForecastTrendCsv"
              >
                导出趋势CSV
              </button>
            </div>
          </div>
          <p v-if="forecastError" class="emap-side-error mb-2">{{ forecastError }}</p>
          <ForecastBasisPanel :summary="forecastSummaryText" :placeholder="forecastBasisPlaceholder" dark />
          <div class="emap-fc-chart-wrap">
            <p v-if="forecastLoading" class="emap-fc-chart-empty text-muted mb-0">预测中，请稍候…</p>
            <template v-else-if="forecastModalDates.length">
              <canvas
                ref="forecastTrendCanvasRef"
                @mousemove="onTrendChartMouseMove"
                @mouseleave="onTrendChartMouseLeave"
              ></canvas>
              <div
                v-if="trendHoverIndex >= 0"
                class="emap-chart-tooltip"
                :style="trendTooltipStyle"
              >
                <div class="emap-chart-tooltip-date">{{ forecastModalDates[trendHoverIndex] }}</div>
                <div class="emap-chart-tooltip-price">{{ formatTrendValue(forecastModalValues[trendHoverIndex]) }} 吨</div>
              </div>
            </template>
            <p v-else-if="forecastQueried" class="emap-fc-chart-empty text-muted mb-0">正在根据预测结果绘制图表中...</p>
            <p v-else class="emap-fc-chart-empty text-muted mb-0">请选择库房后点击"重新预测"获取预测数据。</p>
          </div>
          <div v-if="forecastModalMeta" class="emap-fc-chart-meta">
            <p><strong>仓库：</strong>{{ forecastModalMeta.warehouse }}</p>
            <p><strong>大区经理：</strong>{{ forecastModalMeta.regional_manager }}</p>
            <p><strong>品类：</strong>{{ forecastModalMeta.product_variety }}</p>
            <p v-if="forecastModalMeta.smelter"><strong>冶炼厂：</strong>{{ forecastModalMeta.smelter }}</p>
          </div>
          <div v-if="forecastDetailRows.length" class="emap-fc-analysis">
            <div class="emap-fc-analysis-head">
              <h4 class="emap-fc-analysis-title">预测依据</h4>
              <span class="emap-fc-analysis-hint text-muted">点击行查看完整说明</span>
            </div>
            <div class="emap-fc-analysis-scroll">
              <button
                v-for="row in forecastDetailRows"
                :key="row.targetDate"
                type="button"
                class="emap-fc-analysis-row"
                :title="row.mainFactors || row.analysis || ''"
                @click="openForecastAnalysisDrawer(row)"
              >
                <span class="emap-fc-analysis-date">{{ formatForecastDetailDate(row.targetDate) }}</span>
                <span v-if="row.shipProbability" class="emap-fc-analysis-badge" :class="`emap-fc-analysis-badge--${row.shipProbability}`">{{ row.shipProbability }}</span>
                <span class="emap-fc-analysis-weight">{{ row.predictedWeight.toFixed(2) }} 吨</span>
                <span v-if="row.confidenceLevel" class="emap-fc-analysis-confidence">置信{{ row.confidenceLevel }}</span>
                <span class="emap-fc-analysis-snippet">{{ truncateForecastAnalysis(row.mainFactors || row.analysis) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="emap-map-corner">
        <div class="emap-legend">
          <div class="emap-legend-item emap-legend-item--toggle">
            <button
              type="button"
              class="emap-legend-eye-btn"
              :title="allWarehousesHidden ? '显示全部库房' : '隐藏全部库房'"
              @click.stop="toggleAllWarehousesVisibility"
            >
              <i
                class="bi"
                :class="allWarehousesHidden ? 'bi-eye-slash' : 'bi-eye'"
                aria-hidden="true"
              />
            </button>
            <span class="emap-legend-dot emap-legend-dot--wh"></span>
            <span>库房（随类型颜色）</span>
          </div>
          <div class="emap-legend-item emap-legend-item--toggle">
            <button
              type="button"
              class="emap-legend-eye-btn"
              :title="allSmeltersHidden ? '显示全部冶炼厂' : '隐藏全部冶炼厂'"
              @click.stop="toggleAllSmeltersVisibility"
            >
              <i
                class="bi"
                :class="allSmeltersHidden ? 'bi-eye-slash' : 'bi-eye'"
                aria-hidden="true"
              />
            </button>
            <span class="emap-legend-tri"></span>
            <span>冶炼厂</span>
          </div>
          <div v-if="warehouseTypeStats.length" class="emap-legend-stats">
            <div class="emap-legend-stats-title">
              库房类型数量
              <span class="emap-legend-stats-total">（共 {{ allWarehousePoints.length }}）</span>
            </div>
            <div
              v-for="row in warehouseTypeStats"
              :key="row.label"
              class="emap-legend-stat-row"
              :title="row.label"
            >
              <button
                type="button"
                class="emap-legend-eye-btn"
                :title="hiddenWarehouseTypes.has(row.label) ? '显示该类型' : '隐藏该类型'"
                @click.stop="toggleWarehouseTypeVisibility(row.label)"
              >
                <i
                  class="bi"
                  :class="hiddenWarehouseTypes.has(row.label) ? 'bi-eye-slash' : 'bi-eye'"
                  aria-hidden="true"
                />
              </button>
              <span
                class="emap-legend-stat-dot"
                :style="{ background: row.color, boxShadow: `0 0 6px ${row.color}88` }"
              />
              <span class="emap-legend-stat-label">{{ row.label }}</span>
              <span class="emap-legend-stat-count">{{ row.count }}</span>
            </div>
          </div>
          <div v-if="smelterTypeStats.length" class="emap-legend-stats">
            <div class="emap-legend-stats-title">
              冶炼厂类型数量
              <span class="emap-legend-stats-total">（共 {{ allSmelterPoints.length }}）</span>
            </div>
            <div
              v-for="row in smelterTypeStats"
              :key="row.label"
              class="emap-legend-stat-row"
              :title="row.label"
            >
              <button
                type="button"
                class="emap-legend-eye-btn"
                :title="hiddenSmelterTypes.has(row.label) ? '显示该类型' : '隐藏该类型'"
                @click.stop="toggleSmelterTypeVisibility(row.label)"
              >
                <i
                  class="bi"
                  :class="hiddenSmelterTypes.has(row.label) ? 'bi-eye-slash' : 'bi-eye'"
                  aria-hidden="true"
                />
              </button>
              <span
                class="emap-legend-stat-dot"
                :style="{ background: row.color, boxShadow: `0 0 6px ${row.color}88` }"
              />
              <span class="emap-legend-stat-label">{{ row.label }}</span>
              <span class="emap-legend-stat-count">{{ row.count }}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-sm emap-fs-btn"
          :title="emapFullscreen ? '退出全屏 (Esc)' : '全屏查看地图'"
          @click="toggleEmapFullscreen"
        >
          <i class="bi" :class="emapFullscreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'" aria-hidden="true" />
          {{ emapFullscreen ? '退出全屏' : '全屏' }}
        </button>
      </div>

      <!-- 定位最近仓库：地图区域右上角，可关闭，10 分钟自动关闭；再次定位只更新内容 -->
      <div v-if="geoNearestToastVisible" class="emap-geo-nearest-toast" role="status">
        <button
          type="button"
          class="emap-geo-nearest-toast-close"
          title="关闭"
          aria-label="关闭"
          @click="dismissGeoNearestToast"
        >
          ×
        </button>
        <div class="emap-geo-nearest-toast-body">{{ geoNearestToastMessage }}</div>
      </div>

      <!-- 仅「重新比价」触发：地图内顶部轻提示，不遮罩、不阻挡操作，10 秒自动关闭 -->
      <div
        v-if="comparisonPrereqToastVisible"
        class="emap-comparison-prereq-toast"
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          class="emap-comparison-prereq-toast-close"
          title="关闭"
          aria-label="关闭"
          @click="dismissComparisonPrereqToast"
        >
          ×
        </button>
        <p class="emap-comparison-prereq-toast-msg">{{ comparisonPrereqToastMessage }}</p>
      </div>
    </div>
    <div v-if="loadError" class="alert emap-alert-dashboard m-3 mb-0" role="alert">{{ loadError }}</div>

    <!-- 比价表：单元格过长省略，点击看全文（类 Excel） -->
    <div
      v-if="comparisonCellDetail"
      class="emap-cmp-cell-detail-backdrop"
      role="presentation"
      @click="closeComparisonCellDetail"
    >
      <div
        class="emap-cmp-cell-detail-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emap-cmp-cell-detail-title"
        @click.stop
      >
        <div class="emap-cmp-cell-detail-head">
          <h5 id="emap-cmp-cell-detail-title" class="emap-cmp-cell-detail-title">
            {{ comparisonCellDetail.label }}
          </h5>
          <button
            type="button"
            class="emap-cmp-cell-detail-close"
            aria-label="关闭"
            @click="closeComparisonCellDetail"
          >
            ×
          </button>
        </div>
        <div class="emap-cmp-cell-detail-body">{{ comparisonCellDetail.text }}</div>
        <div class="emap-cmp-cell-detail-foot">
          <button type="button" class="btn btn-sm btn-secondary" @click="closeComparisonCellDetail">
            关闭
          </button>
        </div>
      </div>
    </div>
    <PredictionAnalysisDrawer
      :visible="forecastAnalysisDrawerVisible"
      :title="forecastAnalysisDrawerTitle"
      :analysis="forecastAnalysisDrawerText"
      :meta-lines="forecastAnalysisDrawerMeta"
      :sections="forecastAnalysisDrawerSections"
      @close="closeForecastAnalysisDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import axios from 'axios'
import PredictionAnalysisDrawer from '../components/PredictionAnalysisDrawer.vue'
import ForecastBasisPanel from '../components/ForecastBasisPanel.vue'
import { triggerPrediction, fetchAllPredictResults, aggregateChartFromResults, type PredictResultRow } from '../api/predictApi'
import { warehouseDisplayName } from '@/utils/warehouseDisplayName'
import {
  fetchTlCalculateDistance,
  fetchTlCategories,
  fetchTlSmeltersAll,
  fetchTlWarehouseLinksOutbound,
  fetchTlWarehouseTypes,
  fetchTlFactoryTypes,
  fetchTlWarehousesAll,
  fetchTlRealtimeSpreadList,
  postTlGetComparison,
  tlGetJson,
  tlUnwrapComparisonDetails,
  type TlCategoryRow,
} from '../api/tlApi'

type MapPoint = {
  kind: 'warehouse' | 'smelter'
  id: string
  title: string
  subtitle: string
  lat: number
  lng: number
  /** 库房：与列表一致的颜色 */
  pinColor?: string
  raw: Record<string, unknown>
}

type ComparisonRankItem = {
  rank: number
  smelter: string
  unitPrice: number
  netProfit: number
  totalRecovery: number
  /** 后端「运费」/「总运费」；无明细时由旧逻辑推算 */
  totalFreight: number
  qtySum: number
  /** 接口「每吨净值」；无则回退净货款/吨数 */
  valuePerTon?: number | null
  /** 接口「毛利」；可为 null */
  grossProfit?: number | null
  /** 接口「每吨毛利」；可为 null */
  grossProfitPerTon?: number | null
  /** 与嵌入页「智能比价」各品种单价列一致：品类名 → 单价 */
  categoryPrices?: Record<string, number | null>
  /** 明细字段「单价」按吨数加权；无非空值时不展示 */
  lineUnitPrice?: number
  /** 明细字段「运费单价」按吨数加权 */
  freightUnitPrice?: number
  /** 任一明细 `冶炼厂循融宝发货 === 1`；金额与排序仍用顶层含循融宝口径 */
  xunRongBao?: boolean
  /** `循融宝加价元每吨`；后端可能只给在对象里，未返回时可为 undefined */
  xunRongBaoSurchargeYuanPerTon?: number | null
  /** 与上一行同厂：本行为「不含循融宝」口径，不显示排名角标「循」 */
  xunRongBaoExcludedPricing?: boolean
}

/** 左侧「库房距离监测」表格行 */
type WarehouseDistanceTableRow = {
  toId: number
  toName: string
  distanceText: string
  distanceKm: number | null
  tierPriceDiff: string
  realTimeDiff: string
}

/** 与「送货量预测」折线图弹窗下方展示一致 */
type ForecastChartMeta = {
  warehouse: string
  regional_manager: string
  product_variety: string
  smelter?: string
}

/**
 * 预测明细行（v2 响应结构）
 * v2 将单条 analysis 拆分为六大段分析，预测量字段从 predicted_weight 改为 expectedShipment
 */
type ForecastDetailRow = {
  targetDate: string
  predictedWeight: number
  analysis: string | null
  regionalManager: string
  productVariety: string
  smelter: string | null
  shipProbability: string
  expectedShipDate: string | null
  confidenceLevel: string
  mainFactors: string
  comprehensiveAnalysis: string
  historyAnalysis: string
  priceSensitivityAnalysis: string
  priceCompetitivenessAnalysis: string
  holidayAnalysis: string
  weatherAnalysis: string
}

const GAODE_TILE =
  'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

const DEFAULT_WAREHOUSE_COLOR = '#2563eb'
const DEFAULT_SMELTER_COLOR = '#f97316'
const MAX_MAP_FLOW_TARGETS = 30
/** 定位最近仓库提示在右上角停留时间 */
const GEO_NEAREST_TOAST_MS = 10 * 60 * 1000
/** 未确认比价条件时中央提示自动关闭时间 */
const COMPARISON_PREREQ_TOAST_MS = 10_000
const EMAP_TOOLBAR_COLLAPSED_KEY = 'emap.toolbar.collapsed'
/** 回收品类勾选与吨数：跨页面/刷新保留 */
const EMAP_CATEGORY_PREFS_KEY = 'emap.categoryPrefs.v1'
/** 库房/冶炼厂打点：本地缓存用于再次进入时先秒显地图，后台拉齐后再一次性替换为服务端数据 */
const EMAP_MARKERS_CACHE_KEY = 'emap.markersPayload.v1'

/** 地图「按省筛选」：34 个省级行政区（含省/自治区/直辖市/特别行政区），与国家统计口径一致 */
type EmapChinaRegionItem = { value: string; label: string }
type EmapChinaRegionGroup = { group: string; items: EmapChinaRegionItem[] }

const EMAP_CHINA_REGION_GROUPS: EmapChinaRegionGroup[] = [
  {
    group: '23个省',
    items: [
      { value: '河北', label: '河北省' },
      { value: '山西', label: '山西省' },
      { value: '辽宁', label: '辽宁省' },
      { value: '吉林', label: '吉林省' },
      { value: '黑龙江', label: '黑龙江省' },
      { value: '江苏', label: '江苏省' },
      { value: '浙江', label: '浙江省' },
      { value: '安徽', label: '安徽省' },
      { value: '福建', label: '福建省' },
      { value: '江西', label: '江西省' },
      { value: '山东', label: '山东省' },
      { value: '河南', label: '河南省' },
      { value: '湖北', label: '湖北省' },
      { value: '湖南', label: '湖南省' },
      { value: '广东', label: '广东省' },
      { value: '海南', label: '海南省' },
      { value: '四川', label: '四川省' },
      { value: '贵州', label: '贵州省' },
      { value: '云南', label: '云南省' },
      { value: '陕西', label: '陕西省' },
      { value: '甘肃', label: '甘肃省' },
      { value: '青海', label: '青海省' },
      { value: '台湾', label: '台湾省' },
    ],
  },
  {
    group: '5个自治区',
    items: [
      { value: '内蒙古', label: '内蒙古自治区' },
      { value: '广西', label: '广西壮族自治区' },
      { value: '西藏', label: '西藏自治区' },
      { value: '宁夏', label: '宁夏回族自治区' },
      { value: '新疆', label: '新疆维吾尔自治区' },
    ],
  },
  {
    group: '4个直辖市',
    items: [
      { value: '北京', label: '北京市' },
      { value: '天津', label: '天津市' },
      { value: '上海', label: '上海市' },
      { value: '重庆', label: '重庆市' },
    ],
  },
  {
    group: '2个特别行政区',
    items: [
      { value: '香港', label: '香港特别行政区' },
      { value: '澳门', label: '澳门特别行政区' },
    ],
  },
]

const EMAP_CHINA_REGION_OPTIONS: EmapChinaRegionItem[] = EMAP_CHINA_REGION_GROUPS.flatMap((g) => g.items)

/** 筛选值（简称）→ 行政区划代码，用于拉取省界 GeoJSON（阿里云 DataV areas_v3） */
const EMAP_FILTER_TO_ADCODE: Record<string, string> = {
  北京: '110000',
  天津: '120000',
  上海: '310000',
  重庆: '500000',
  河北: '130000',
  山西: '140000',
  辽宁: '210000',
  吉林: '220000',
  黑龙江: '230000',
  江苏: '320000',
  浙江: '330000',
  安徽: '340000',
  福建: '350000',
  江西: '360000',
  山东: '370000',
  河南: '410000',
  湖北: '420000',
  湖南: '430000',
  广东: '440000',
  海南: '460000',
  四川: '510000',
  贵州: '520000',
  云南: '530000',
  陕西: '610000',
  甘肃: '620000',
  青海: '630000',
  台湾: '710000',
  内蒙古: '150000',
  广西: '450000',
  西藏: '540000',
  宁夏: '640000',
  新疆: '650000',
  香港: '810000',
  澳门: '820000',
}
const EMAP_LOCAL_PROVINCE_GEOJSON_PATH = '/province'

function emapProvinceFilterToAdcode(sel: string): string | null {
  const t = sel.trim().replace(/\s+/g, '')
  if (EMAP_FILTER_TO_ADCODE[t]) return EMAP_FILTER_TO_ADCODE[t]
  const stripped = t
    .replace(/特别行政区$/u, '')
    .replace(/壮族自治区|维吾尔自治区|回族自治区|自治区$/u, '')
    .replace(/省$/u, '')
    .replace(/市$/u, '')
  return EMAP_FILTER_TO_ADCODE[stripped] ?? null
}

function readToolbarCollapsed(): boolean {
  try {
    return sessionStorage.getItem(EMAP_TOOLBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

const toolbarCollapsed = ref(readToolbarCollapsed())

function toggleToolbarCollapse() {
  toolbarCollapsed.value = !toolbarCollapsed.value
  try {
    sessionStorage.setItem(EMAP_TOOLBAR_COLLAPSED_KEY, toolbarCollapsed.value ? '1' : '0')
  } catch {
    /* 隐私模式等 */
  }
}

const emapShellRef = ref<HTMLElement | null>(null)
const emapFullscreen = ref(false)
const mapWrapRef = ref<HTMLElement | null>(null)
const mapElRef = ref<HTMLElement | null>(null)
const mapRef = shallowRef<L.Map | null>(null)
const markerLayerRef = shallowRef<L.LayerGroup | null>(null)
const flowLayerRef = shallowRef<L.LayerGroup | null>(null)
const topTipLayerRef = shallowRef<L.LayerGroup | null>(null)
/** 按省筛选时绘制的行政区红线轮廓（GeoJSON） */
const provinceOutlineLayerRef = shallowRef<L.GeoJSON | null>(null)
/** 比价流向折线统一走 SVG，虚线 dash 动画与双层描边更稳定 */
const flowPathSvgRendererRef = shallowRef<L.SVG | null>(null)
const distanceLinePaneName = 'emap-distance-line-pane'
const distanceLabelPaneName = 'emap-distance-label-pane'
/** 低于 Leaflet 默认 popupPane(~700)，比价冶炼厂常驻卡片不遮挡库房点击弹窗 */
const emapRankComparisonTipPaneName = 'emap-rank-comparison-tip-pane'
/** 库房悬浮卡片：高于比价 tip(680) 与默认 tooltipPane(~650)，与点击弹窗同级略高 */
const emapWarehouseHoverTipPaneName = 'emap-warehouse-hover-tip-pane'
/** 高于 markerPane(~600)，使比价流向线画在库房/冶炼厂打点之上 */
const emapComparisonFlowPaneName = 'emap-comparison-flow-pane'
const loading = ref(false)
/** 有本地缓存时的静默全量同步：不打断操作，仅地图角标提示 */
const markersSyncing = ref(false)
const loadError = ref('')
const categories = ref<TlCategoryRow[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref('')

/**
 * 电子地图回收品类：与比价侧「十个品种」一致（固定 id + 展示名）。
 * 仅以列表为准筛选接口返回项并排序；接口若缺少某 id 则不展示该行。
 */
const EMAP_FIXED_CATEGORY_ORDER: readonly TlCategoryRow[] = [
  { id: 6, name: '电动车电池' },
  { id: 4, name: '黑皮电瓶' },
  { id: 15, name: '管式电瓶' },
  { id: 11, name: '大白电池' },
  { id: 16, name: '摩托车电瓶' },
  { id: 2, name: '电子秤电瓶' },
  { id: 5, name: '电信电瓶' },
  { id: 17, name: 'AGM电瓶' },
  { id: 12, name: '电轿电瓶' },
  { id: 3, name: '小四斤电瓶' },
]

function pickCategoryDisplayName(rawName: string): string {
  const text = String(rawName ?? '').trim()
  if (!text) return ''
  const first = text
    .split(/[、,，;；]/)
    .map((s) => s.trim())
    .find(Boolean)
  return first ?? text
}

watch(toolbarCollapsed, async () => {
  await nextTick()
  mapRef.value?.invalidateSize()
})

const compareLoading = ref(false)
/** 库房→绑定库房距离连线模式（与比价流向互斥） */
const warehouseDistanceMonitorOn = ref(false)
const warehouseDistanceLoading = ref(false)
const warehouseDistanceTableRows = ref<WarehouseDistanceTableRow[]>([])
/** 左侧距离表「定位」高亮行（对标库房 id） */
const warehouseDistanceFocusToId = ref<number | null>(null)
const forecastLoading = ref(false)
const compareError = ref('')
const forecastError = ref('')
const forecastModalMeta = ref<ForecastChartMeta | null>(null)
const forecastModalDates = ref<string[]>([])
const forecastModalValues = ref<number[]>([])
const forecastDetailRows = ref<ForecastDetailRow[]>([])
const forecastQueried = ref(false)
const forecastAnalysisDrawerVisible = ref(false)
const forecastAnalysisDrawerTitle = ref('预测依据详情')
const forecastAnalysisDrawerText = ref<string | null>(null)
const forecastAnalysisDrawerMeta = ref<string[]>([])
const forecastAnalysisDrawerSections = ref<Array<{ title: string; content: string }>>([])
const comparisonModalVisible = ref(false)
const comparisonModalTitle = ref('比价预测结果')
const comparisonSectionCollapsed = ref(false)
const forecastSectionCollapsed = ref(false)
/** 比价表单元格点击后展示的完整文案（列标题 + 正文） */
const comparisonCellDetail = ref<{ label: string; text: string } | null>(null)
const forecastTrendCanvasRef = ref<HTMLCanvasElement | null>(null)
const trendHoverIndex = ref(-1)
const trendTooltipStyle = ref<Record<string, string>>({})

interface TrendChartLayout {
  margin: { t: number; r: number; b: number; l: number }
  W: number
  H: number
  maxY: number
  xStep: number
  toX: (i: number) => number
  toY: (v: number) => number
}
let trendChartLayout: TrendChartLayout | null = null

function formatTrendValue(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return '0.00'
  return v.toFixed(2)
}

const forecastSummaryText = computed(() => {
  const rows = forecastDetailRows.value
  if (rows.length === 0) return ''
  return rows.find((r) => (r.comprehensiveAnalysis || '').trim())?.comprehensiveAnalysis || ''
})

const forecastBasisPlaceholder = computed(() => {
  if (!forecastQueried.value) {
    return '请选择库房后点击「重新预测」获取预测数据。'
  }
  if (forecastModalDates.value.length === 0 || !forecastSummaryText.value.trim()) {
    return '正在预测中...'
  }
  return '暂无预测依据'
})

const enableCoordPick = ref(false)
const enableAutoZoomOnPointClick = ref(false)
/** false: 仅前3条；true: 展示全部（第4条起细灰线） */
const showAllComparisonFlows = ref(false)
/** 比价连线时是否在冶炼厂点位旁展示排名与利润等常驻提示 */
const showComparisonSmelterInfo = ref(true)
const lastClickedCoordText = ref('')
const mapToolsCollapsed = ref(true)

watch(mapToolsCollapsed, async (collapsed) => {
  if (!collapsed) {
    await nextTick()
    clampMapToolsFloatInWrap()
    mapRef.value?.invalidateSize()
  }
})

const mapToolsFloatRef = ref<HTMLElement | null>(null)
/** 贴右侧时相对地图容器顶边的 top（px）；null 表示使用 CSS 默认（靠上 + max-height，避免随内容高度整体上移） */
const mapToolsFloatTopPx = ref<number | null>(null)
/** 为右下角 Leaflet 缩放、全屏等保留空隙，拖动/钳制时底边不得压住控件 */
const EMAP_FLOAT_TR_CORNER_RESERVE_PX = 76

const mapToolsFloatStyle = computed(() => {
  if (mapToolsFloatTopPx.value == null) return {}
  const top = mapToolsFloatTopPx.value
  return {
    top: `${top}px`,
    right: '0',
    left: 'auto',
    transform: 'none',
    maxHeight: `calc(100% - ${top}px - ${EMAP_FLOAT_TR_CORNER_RESERVE_PX}px)`,
    overflowX: 'hidden',
    overflowY: 'auto',
  } as Record<string, string>
})

let mapToolsDragPid: number | null = null
let mapToolsDragSY = 0
let mapToolsDragOY = 0
let mapToolsDragSession = false
const mapToolsPointerMoveOpts: AddEventListenerOptions = { passive: false }

function onBubbleDragPointerDown(e: PointerEvent) {
  const t = e.target as HTMLElement
  if (t.closest('.emap-map-tools-tab')) return
  onMapToolsDragDown(e)
}

function onMapToolsHeadPointerDown(e: PointerEvent) {
  const t = e.target as HTMLElement
  if (t.closest('.emap-map-tools-collapse')) return
  onMapToolsDragDown(e)
}

function onMapToolsDragMove(e: PointerEvent) {
  if (!mapToolsDragSession) return
  if (mapToolsDragPid != null && e.pointerId !== mapToolsDragPid) return
  e.preventDefault()
  const wrap = mapWrapRef.value
  const dock = mapToolsFloatRef.value
  if (!wrap || !dock || mapToolsFloatTopPx.value == null) return
  const wih = wrap.clientHeight
  const dh = dock.offsetHeight
  const pad = 8
  let ny = mapToolsDragOY + (e.clientY - mapToolsDragSY)
  const maxY = Math.max(pad, wih - dh - pad - EMAP_FLOAT_TR_CORNER_RESERVE_PX)
  ny = Math.min(Math.max(pad, ny), maxY)
  mapToolsFloatTopPx.value = ny
}

function endMapToolsDrag(e: PointerEvent) {
  if (!mapToolsDragSession) return
  if (mapToolsDragPid != null && e.pointerId !== mapToolsDragPid) return
  mapToolsDragSession = false
  mapToolsDragPid = null
  window.removeEventListener('pointermove', onMapToolsDragMove, mapToolsPointerMoveOpts)
  window.removeEventListener('pointerup', endMapToolsDrag, true)
  window.removeEventListener('pointercancel', endMapToolsDrag, true)
  try {
    mapToolsFloatRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* 已释放 */
  }
  void nextTick(() => {
    clampMapToolsFloatInWrap()
    mapRef.value?.invalidateSize()
  })
}

function onMapToolsDragDown(e: PointerEvent) {
  if (mapToolsDragSession) return
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const wrap = mapWrapRef.value
  const dock = mapToolsFloatRef.value
  if (!wrap || !dock) return
  const wr = wrap.getBoundingClientRect()
  const dr = dock.getBoundingClientRect()
  if (mapToolsFloatTopPx.value == null) {
    mapToolsFloatTopPx.value = dr.top - wr.top
  }
  mapToolsDragOY = mapToolsFloatTopPx.value
  mapToolsDragSY = e.clientY
  mapToolsDragPid = e.pointerId
  mapToolsDragSession = true
  try {
    dock.setPointerCapture(e.pointerId)
  } catch {
    /* 部分环境下 capture 不可用，仍依赖 window 上的 pointermove */
  }
  window.addEventListener('pointermove', onMapToolsDragMove, mapToolsPointerMoveOpts)
  window.addEventListener('pointerup', endMapToolsDrag, true)
  window.addEventListener('pointercancel', endMapToolsDrag, true)
}

function teardownMapToolsDragListeners() {
  window.removeEventListener('pointermove', onMapToolsDragMove, mapToolsPointerMoveOpts)
  window.removeEventListener('pointerup', endMapToolsDrag, true)
  window.removeEventListener('pointercancel', endMapToolsDrag, true)
  mapToolsDragSession = false
  mapToolsDragPid = null
}

/** 右侧上下拖动：仅钳制垂直方向，保证完整落在地图容器内 */
function clampMapToolsFloatInWrap() {
  const wrap = mapWrapRef.value
  const dock = mapToolsFloatRef.value
  if (!wrap || !dock) return
  const pad = 8
  const wih = wrap.clientHeight
  const dh = dock.offsetHeight
  if (dh <= 0) return
  if (mapToolsFloatTopPx.value != null) {
    const maxY = Math.max(pad, wih - dh - pad - EMAP_FLOAT_TR_CORNER_RESERVE_PX)
    const y = Math.min(Math.max(pad, mapToolsFloatTopPx.value), maxY)
    if (y !== mapToolsFloatTopPx.value) mapToolsFloatTopPx.value = y
  }
}
const nearestWarehouseBusy = ref(false)
const geoNearestToastVisible = ref(false)
const geoNearestToastMessage = ref('')
const comparisonPrereqToastVisible = ref(false)
const comparisonPrereqToastMessage = ref('')
const selectedWarehouse = ref<MapPoint | null>(null)
/** 锁定后禁止切换至其他库房（拖拽地图时防误触） */
const warehouseSelectionLocked = ref(false)
/** 用户点击弹窗关闭按钮时，锁定期间不再自动重开 */
let lockedWarehousePopupDismissedByUser = false
let emapMapPopupCloseCaptureOff: (() => void) | null = null
const comparisonType = ref<'base' | 'tax3'>('base')
/** 与品类 id 对应：默认全选、吨数默认 1（与智能比价一致可改） */
const categoryPrefs = reactive<Record<number, { selected: boolean; tons: string }>>({})
let categoryPrefsHydrating = false

function ensureCategoryPrefsForList(list: TlCategoryRow[]) {
  for (const c of list) {
    if (categoryPrefs[c.id] === undefined) {
      categoryPrefs[c.id] = { selected: false, tons: '0' }
    }
  }
}

function persistCategoryPrefsSnapshot() {
  const list = categories.value
  if (!list.length) return
  const snap: Record<string, { selected: boolean; tons: string }> = {}
  for (const c of list) {
    const pref = categoryPrefs[c.id]
    if (pref) {
      snap[String(c.id)] = { selected: !!pref.selected, tons: String(pref.tons ?? '0') }
    }
  }
  try {
    localStorage.setItem(EMAP_CATEGORY_PREFS_KEY, JSON.stringify(snap))
  } catch {
    /* 隐私模式 / 配额 */
  }
}

function applyCategoryPrefsFromStorage(list: TlCategoryRow[]) {
  if (!list.length) return
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(EMAP_CATEGORY_PREFS_KEY) || 'null')
  } catch {
    return
  }
  if (!raw || typeof raw !== 'object') return
  const obj = raw as Record<string, unknown>
  for (const c of list) {
    const entry = obj[String(c.id)]
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const tonsRaw = e.tons
    const tons = tonsRaw != null && tonsRaw !== '' ? String(tonsRaw) : '0'
    categoryPrefs[c.id] = { selected: e.selected === true, tons }
  }
}

watch(
  categories,
  (list) => {
    categoryPrefsHydrating = true
    try {
      ensureCategoryPrefsForList(list)
      applyCategoryPrefsFromStorage(list)
    } finally {
      categoryPrefsHydrating = false
    }
    persistCategoryPrefsSnapshot()
  },
  { deep: true, immediate: true },
)

watch(categoryPrefs, () => {
  if (categoryPrefsHydrating) return
  persistCategoryPrefsSnapshot()
}, { deep: true })

/** 仓库切换时：清空预测数据 */
watch(selectedWarehouse, () => {
  forecastModalDates.value = []
  forecastModalValues.value = []
  forecastDetailRows.value = []
  forecastError.value = ''
})

const confirmedCategoryIds = ref<number[]>([])
const confirmedTotalTons = ref(0)
const confirmedPriceMode = ref<'base' | 'tax3'>('base')
const comparisonRanks = ref<ComparisonRankItem[]>([])
const lastComparisonSortKey = ref('')
const allWarehousePoints = ref<MapPoint[]>([])

/** 收货价格日期缓存：key = "库房id||品类名" → 日期字符串 */
const receiptPriceDateCache = ref<Map<string, string>>(new Map())

type WarehouseTypeStatRow = { label: string; count: number; color: string }

const warehouseTypeStats = computed((): WarehouseTypeStatRow[] => {
  const by = new Map<string, { count: number; color: string }>()
  for (const p of allWarehousePoints.value) {
    const row = p.raw
    const label =
      pickStr(row, ['类型', 'type', 'warehouse_type_name', '类型名']).trim() || '未分类'
    const color = p.pinColor ?? DEFAULT_WAREHOUSE_COLOR
    const cur = by.get(label)
    if (!cur) by.set(label, { count: 1, color })
    else cur.count += 1
  }
  return [...by.entries()]
    .map(([label, { count, color }]) => ({ label, count, color }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
})

type SmelterTypeStatRow = { label: string; count: number; color: string }

const smelterTypeStats = computed((): SmelterTypeStatRow[] => {
  const by = new Map<string, { count: number; color: string }>()
  for (const p of allSmelterPoints.value) {
    const row = p.raw
    const label =
      pickStr(row, ['冶炼厂类型', 'factory_type', 'smelter_type', '冶炼厂类型名']).trim() || '未分类'
    const color = p.pinColor ?? DEFAULT_SMELTER_COLOR
    const cur = by.get(label)
    if (!cur) by.set(label, { count: 1, color })
    else cur.count += 1
  }
  return [...by.entries()]
    .map(([label, { count, color }]) => ({ label, count, color }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
})

function toggleWarehouseTypeVisibility(label: string) {
  const s = new Set(hiddenWarehouseTypes.value)
  if (s.has(label)) s.delete(label)
  else s.add(label)
  hiddenWarehouseTypes.value = s
  applyWarehouseTypeVisibility()
}

function toggleSmelterTypeVisibility(label: string) {
  const s = new Set(hiddenSmelterTypes.value)
  if (s.has(label)) s.delete(label)
  else s.add(label)
  hiddenSmelterTypes.value = s
  applySmelterVisibility()
}

function toggleAllWarehousesVisibility() {
  allWarehousesHidden.value = !allWarehousesHidden.value
  applyWarehouseTypeVisibility()
}

function toggleAllSmeltersVisibility() {
  allSmeltersHidden.value = !allSmeltersHidden.value
  applySmelterVisibility()
}

function applyWarehouseTypeVisibility() {
  const markerLayer = markerLayerRef.value
  if (!markerLayer) return
  const hidden = hiddenWarehouseTypes.value
  for (const p of allWarehousePoints.value) {
    const m = warehouseMarkerById.get(p.id)
    if (!m) continue
    const typeName =
      pickStr(p.raw, ['类型', 'type', 'warehouse_type_name', '类型名']).trim() || '未分类'
    const markerLatLng = m.getLatLng()
    const isOnMap = markerLatLng != null && mapRef.value?.hasLayer(m)
    if (allWarehousesHidden.value || hidden.has(typeName)) {
      if (isOnMap) m.remove()
    } else {
      if (!isOnMap) m.addTo(markerLayer)
    }
  }
}

function applySmelterVisibility() {
  const markerLayer = markerLayerRef.value
  if (!markerLayer) return
  const hidden = hiddenSmelterTypes.value
  for (const p of allSmelterPoints.value) {
    const m = smelterMarkerById.get(p.id)
    if (!m) continue
    const typeName =
      pickStr(p.raw, ['冶炼厂类型', 'factory_type', 'smelter_type', '冶炼厂类型名']).trim() || '未分类'
    const markerLatLng = m.getLatLng()
    const isOnMap = markerLatLng != null && mapRef.value?.hasLayer(m)
    if (allSmeltersHidden.value || hidden.has(typeName)) {
      if (isOnMap) m.remove()
    } else {
      if (!isOnMap) m.addTo(markerLayer)
    }
  }
}

function syncEmapFullscreenFlag() {
  const shell = emapShellRef.value
  const fs =
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
    null
  emapFullscreen.value = !!(shell && fs === shell)
}

async function toggleEmapFullscreen() {
  const el = emapShellRef.value
  if (!el) return
  try {
    if (
      document.fullscreenElement === el ||
      (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement === el
    ) {
      if (document.exitFullscreen) await document.exitFullscreen()
      else
        await (
          document as Document & { webkitExitFullscreen?: () => Promise<void> }
        ).webkitExitFullscreen?.()
    } else {
      if (el.requestFullscreen) await el.requestFullscreen()
      else
        await (
          el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
        ).webkitRequestFullscreen?.()
    }
  } catch {
    /* 用户拒绝或浏览器不支持 */
  } finally {
    await nextTick()
    mapRef.value?.invalidateSize()
  }
}

function onEmapFullscreenChange() {
  syncEmapFullscreenFlag()
  void nextTick(() => mapRef.value?.invalidateSize())
}
const allSmelterPoints = ref<MapPoint[]>([])
/** 隐藏的库房类型标签集合 */
const hiddenWarehouseTypes = ref<Set<string>>(new Set())
/** 隐藏的冶炼厂类型标签集合 */
const hiddenSmelterTypes = ref<Set<string>>(new Set())
/** 隐藏全部库房 / 冶炼厂打点 */
const allWarehousesHidden = ref(false)
const allSmeltersHidden = ref(false)

/** 库房 id → 标记，用于选中时把其余库房变浅 */
const warehouseMarkerById = new Map<string, L.Marker>()
/** 冶炼厂 id → 标记（省筛选、悬停恢复样式） */
const smelterMarkerById = new Map<string, L.Marker>()
/** 选择省份后，鼠标悬停的外省点 id，该点临时取消变淡 */
const hoverProvinceLiftId = ref<string | null>(null)
const emapProvinceFilter = ref('')
/** 按省筛选时：右侧列表整体收起（仍显示标题条） */
const provinceFacilitiesPanelCollapsed = ref(false)
const provinceListWarehouseSectionOpen = ref(true)
const provinceListSmelterSectionOpen = ref(true)
const emapMapSearchText = ref('')
const emapSearchFeedback = ref('')

/** 与高德类似：按点位名称匹配，下拉选择 */
const EMAP_POINT_SEARCH_MAX_RESULTS = 50
const emapPointSearchOpen = ref(false)
const emapPointSearchActiveIdx = ref(0)
let emapPointSearchBlurTimer: ReturnType<typeof setTimeout> | null = null

function scoreEmapPointTitleMatch(title: string, qLower: string): number {
  const t = title.trim().toLowerCase()
  if (!qLower || !t) return 0
  if (t === qLower) return 1000
  if (t.startsWith(qLower)) return 800
  if (t.includes(qLower)) return 400
  return 0
}

const emapPointSearchCandidates = computed(() => {
  const q = emapMapSearchText.value.trim().toLowerCase()
  if (!q) return []
  const pool = [...allWarehousePoints.value, ...allSmelterPoints.value]
  return pool
    .map((p) => ({ p, s: scoreEmapPointTitleMatch(p.title, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.title.localeCompare(b.p.title, 'zh-CN'))
    .slice(0, EMAP_POINT_SEARCH_MAX_RESULTS)
    .map((x) => x.p)
})

const emapProvinceWarehousePoints = computed(() => {
  const pr = emapProvinceFilter.value.trim()
  if (!pr) return []
  return allWarehousePoints.value
    .filter((p) => provincesRoughlyEqual(provinceFromRow(p.raw), pr))
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
})

const emapProvinceSmelterPoints = computed(() => {
  const pr = emapProvinceFilter.value.trim()
  if (!pr) return []
  return allSmelterPoints.value
    .filter((p) => provincesRoughlyEqual(provinceFromRow(p.raw), pr))
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
})

let resizeObs: ResizeObserver | null = null
let forecastTrendResizeHandler: (() => void) | null = null
let geoNearestToastTimer: ReturnType<typeof setTimeout> | null = null
let comparisonPrereqToastTimer: ReturnType<typeof setTimeout> | null = null
const flowAnimTimerIds: number[] = []
const flowOverlayCleanups: Array<() => void> = []

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k]
    if (v == null || v === '') continue
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return null
}

function pickLatLng(row: Record<string, unknown>): [number, number] | null {
  const lat =
    pickNumber(row, ['latitude', 'lat', 'gcj02_lat', 'Latitude', 'LAT', 'y']) ??
    pickNumber(row, ['纬度'])
  const lng =
    pickNumber(row, ['longitude', 'lng', 'lon', 'gcj02_lng', 'Longitude', 'LNG', 'x']) ??
    pickNumber(row, ['经度'])
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}

function warehouseLabel(row: Record<string, unknown>): string {
  return warehouseDisplayName(
    pickStr(row, ['仓库名', 'warehouse_name', 'name', '仓库', '库房名', 'title']),
  )
}

function smelterLabel(row: Record<string, unknown>): string {
  return pickStr(row, ['冶炼厂名', 'factory_name', 'name', '冶炼厂', '厂名', 'title'])
}

function warehouseId(row: Record<string, unknown>): string {
  const id = pickStr(row, ['仓库id', '库房id', 'warehouse_id', 'id', 'warehouseId'])
  return id || warehouseLabel(row) || newId()
}

/** 与 /tl/get_warehouses 等返回列对齐（含「库房id」），供绑定距离、calculate_distance 使用 */
function warehouseNumericIdFromRow(row: Record<string, unknown>): number | null {
  const keys = ['仓库id', '库房id', 'warehouse_id', 'warehouseId', 'WarehouseId', 'id']
  const n = pickNumber(row, keys)
  if (n != null && n > 0) return n
  const s = pickStr(row, keys)
  if (s) {
    const m = Number(String(s).trim())
    if (Number.isFinite(m) && m > 0) return m
  }
  return null
}

function smelterId(row: Record<string, unknown>): string {
  const id = pickStr(row, ['冶炼厂id', 'factory_id', 'smelter_id', 'id', 'smelterId'])
  return id || smelterLabel(row) || newId()
}

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function addressText(row: Record<string, unknown>): string {
  return pickStr(row, [
    '地址',
    '库房地址',
    '仓库地址',
    'address',
    'warehouse_address',
    'WarehouseAddress',
    'detail_address',
    '详细地址',
    'addr',
    'location',
    '省市区',
    'region',
  ])
}

/** 从记录中解析省级名称，供筛选与统计（与地址解析规则尽量宽松） */
function provinceFromRow(row: Record<string, unknown>): string {
  const direct = pickStr(row, ['省', '省份', 'province', 'Province'])
  if (direct) return direct
  const blob = [addressText(row), pickStr(row, ['省市区', 'region'])].find((x) => String(x).trim() !== '')
  if (!blob) return ''
  const k = String(blob).replace(/\s+/g, '')
  const muni = k.match(/^(北京市|上海市|天津市|重庆市)/)
  if (muni) return muni[1]
  const p = k.match(/^(.*?(?:省|自治区|特别行政区))/)
  if (p) return p[1]
  return ''
}

/** 省级是否视为同一省（山东 / 山东省、前缀包含等） */
function provincesRoughlyEqual(rowProv: string, filterProv: string): boolean {
  const a = rowProv.trim().replace(/\s+/g, '')
  const b = filterProv.trim().replace(/\s+/g, '')
  if (!a || !b) return false
  if (a === b) return true
  if (a.startsWith(b) || b.startsWith(a)) return true
  const strip = (s: string) =>
    s
      .replace(/特别行政区$/g, '')
      .replace(/壮族自治区|维吾尔自治区|回族自治区|自治区$/g, '')
      .replace(/省$/g, '')
      .replace(/市$/g, '')
  const sa = strip(a)
  const sb = strip(b)
  return sa.length >= 2 && sb.length >= 2 && sa === sb
}

function bindMarkerProvinceHover(marker: L.Marker, p: MapPoint) {
  marker.on('mouseover', () => {
    if (!emapProvinceFilter.value.trim()) return
    const pv = provinceFromRow(p.raw)
    if (!provincesRoughlyEqual(pv, emapProvinceFilter.value)) {
      hoverProvinceLiftId.value = p.id
      refreshAllMarkerVisualState()
    }
  })
  marker.on('mouseout', () => {
    if (hoverProvinceLiftId.value === p.id) {
      hoverProvinceLiftId.value = null
      refreshAllMarkerVisualState()
    }
  })
}

function scrollEmapPointSearchActiveIntoView() {
  const idx = emapPointSearchActiveIdx.value
  document.getElementById(`emap-point-search-${idx}`)?.scrollIntoView({ block: 'nearest' })
}

function onEmapPointSearchFocus() {
  if (emapPointSearchBlurTimer != null) {
    clearTimeout(emapPointSearchBlurTimer)
    emapPointSearchBlurTimer = null
  }
  if (emapMapSearchText.value.trim()) {
    emapPointSearchOpen.value = true
    emapPointSearchActiveIdx.value = 0
  }
}

function onEmapPointSearchBlur() {
  emapPointSearchBlurTimer = setTimeout(() => {
    emapPointSearchOpen.value = false
    emapPointSearchBlurTimer = null
  }, 180)
}

function onEmapPointSearchInput() {
  const q = emapMapSearchText.value.trim()
  emapPointSearchActiveIdx.value = 0
  if (q) emapPointSearchOpen.value = true
  else emapPointSearchOpen.value = false
}

function onEmapPointSearchKeyArrow(dir: 'up' | 'down') {
  if (!emapPointSearchOpen.value || !emapMapSearchText.value.trim()) return
  const list = emapPointSearchCandidates.value
  if (!list.length) return
  let i = emapPointSearchActiveIdx.value
  if (i < 0 || i >= list.length) i = 0
  if (dir === 'down') i = Math.min(list.length - 1, i + 1)
  else i = Math.max(0, i - 1)
  emapPointSearchActiveIdx.value = i
  void nextTick(() => scrollEmapPointSearchActiveIntoView())
}

/**
 * 勾选「点击点位是否放大」并点库房时：不把库房放在视口正中央，而是略靠右，
 * 给左侧比价结果面板留出可视区域（用 project/unproject 平移地图中心）。
 */
function setMapViewWithWarehouseLeftPanelBias(
  map: L.Map,
  latlng: L.LatLngExpression,
  zoom: number,
  options?: { animate?: boolean },
): void {
  const z = zoom
  const ll = L.latLng(latlng)
  const animate = options?.animate !== false
  const wpx = Math.max(160, map.getSize().x)
  const biasPx = Math.round(Math.min(320, Math.max(96, wpx * 0.22)))
  const whPx = map.project(ll, z)
  const centerPx = whPx.subtract(L.point(biasPx, 0))
  const centerLL = map.unproject(centerPx, z)
  map.setView(centerLL, z, { animate })
}

function toggleWarehouseSelectionLock() {
  warehouseSelectionLocked.value = !warehouseSelectionLocked.value
  refreshWarehouseMarkerLockInteractivity()
  syncLockedWarehousePopupPin()
}

/** 锁定库房时禁用其他库房图钉的指针事件，避免拖拽地图误触 */
function refreshWarehouseMarkerLockInteractivity() {
  const locked = warehouseSelectionLocked.value
  const lockedId =
    selectedWarehouse.value?.kind === 'warehouse' ? selectedWarehouse.value.id : null
  warehouseMarkerById.forEach((marker, id) => {
    const el = marker.getElement() as HTMLElement | null
    if (!el) return
    const block = locked && lockedId != null && id !== lockedId
    el.style.pointerEvents = block ? 'none' : ''
    if (block) {
      marker.closeTooltip()
      if (marker.isPopupOpen()) marker.closePopup()
    }
  })
}

/** 锁定后固定当前库房信息卡片：不被其它点位/地图点击顶掉，用户可点弹窗关闭按钮自行关掉 */
function syncLockedWarehousePopupPin() {
  const pinned = { autoClose: false, closeOnClick: false }
  const normal = { autoClose: true, closeOnClick: true }
  const locked =
    warehouseSelectionLocked.value && selectedWarehouse.value?.kind === 'warehouse'
  const lockedId = locked ? selectedWarehouse.value!.id : null
  const map = mapRef.value

  if (map) {
    // Leaflet 地图级 closePopupOnClick 会在点击空白处时关掉弹窗，仅改 popup.closeOnClick 不够
    map.options.closePopupOnClick = !locked
  }

  const applyPopupOpts = (marker: L.Marker, isPinned: boolean) => {
    const popup = marker.getPopup()
    if (!popup) return
    const o = isPinned ? pinned : normal
    popup.options.autoClose = o.autoClose
    popup.options.closeOnClick = o.closeOnClick
  }

  warehouseMarkerById.forEach((marker, id) => {
    applyPopupOpts(marker, lockedId != null && id === lockedId)
  })
  smelterMarkerById.forEach((marker) => applyPopupOpts(marker, false))

  if (lockedId != null) {
    lockedWarehousePopupDismissedByUser = false
    const lockedMarker = warehouseMarkerById.get(lockedId)
    if (lockedMarker && !lockedMarker.isPopupOpen()) lockedMarker.openPopup()
    ensureComparisonOverlayWhenLocked()
  }
}

/** 锁定期间若比价冶炼厂常驻卡片被意外清掉，按当前排行补回 */
function ensureComparisonOverlayWhenLocked() {
  const wh = selectedWarehouse.value
  if (!warehouseSelectionLocked.value || !wh || wh.kind !== 'warehouse') return
  if (!comparisonRanks.value.length || warehouseDistanceMonitorOn.value) return
  const tipLayer = topTipLayerRef.value
  if (!tipLayer) return
  let tipCount = 0
  tipLayer.eachLayer(() => {
    tipCount += 1
  })
  if (tipCount === 0) renderComparisonOverlay(wh, comparisonRanks.value)
}

function onLockedWarehousePopupClosed(e: L.LeafletEvent) {
  if (!warehouseSelectionLocked.value) return
  const wh = selectedWarehouse.value
  if (!wh || wh.kind !== 'warehouse') return
  const lockedMarker = warehouseMarkerById.get(wh.id)
  if (!lockedMarker) return

  const pop = (e as unknown as { popup?: L.Popup }).popup
  if (!pop) return
  const source = (pop as unknown as { _source?: L.Marker })._source
  if (source !== lockedMarker) return

  if (lockedWarehousePopupDismissedByUser) {
    lockedWarehousePopupDismissedByUser = false
    return
  }
  requestAnimationFrame(() => {
    if (
      warehouseSelectionLocked.value &&
      selectedWarehouse.value?.id === wh.id &&
      !lockedMarker.isPopupOpen()
    ) {
      lockedMarker.openPopup()
    }
  })
}

/** 锁定期间若其它点位弹窗被打开，关掉并恢复当前库房卡片 */
function guardLockedWarehousePopupOpen(e: L.LeafletEvent) {
  if (!warehouseSelectionLocked.value) return
  const wh = selectedWarehouse.value
  if (!wh || wh.kind !== 'warehouse') return
  const lockedMarker = warehouseMarkerById.get(wh.id)
  if (!lockedMarker) return

  const pop = (e as unknown as { popup?: L.Popup }).popup
  if (!pop) return
  const source = (pop as unknown as { _source?: L.Marker })._source
  if (source === lockedMarker) return

  requestAnimationFrame(() => {
    pop.close()
    if (!lockedMarker.isPopupOpen()) lockedMarker.openPopup()
  })
}

function isWarehouseSelectionChangeBlocked(p: MapPoint): boolean {
  return (
    p.kind === 'warehouse' &&
    warehouseSelectionLocked.value &&
    selectedWarehouse.value?.kind === 'warehouse' &&
    selectedWarehouse.value.id !== p.id
  )
}

function focusMapPointFromSearch(p: MapPoint, opts?: { silent?: boolean }) {
  const map = mapRef.value
  if (!map) {
    emapSearchFeedback.value = '地图尚未就绪'
    return
  }
  if (isWarehouseSelectionChangeBlocked(p)) {
    if (!opts?.silent) {
      emapSearchFeedback.value = '已锁定当前库房，请先取消锁定再切换'
    }
    return
  }
  const nMatch = emapPointSearchCandidates.value.length
  const zoom = Math.max(map.getZoom(), 11)
  if (p.kind === 'warehouse' && enableAutoZoomOnPointClick.value) {
    setMapViewWithWarehouseLeftPanelBias(map, [p.lat, p.lng], zoom, { animate: true })
  } else {
    map.setView([p.lat, p.lng], zoom, { animate: true })
  }
  openMarkerPopupNear(p.lat, p.lng)
  if (p.kind === 'warehouse') {
    selectedWarehouse.value = p
    forecastError.value = ''
    void runComparisonForWarehouse(p)
  }
  if (!opts?.silent) {
    emapSearchFeedback.value =
      nMatch > 1 ? `已选择：${p.title}（${nMatch} 处名称匹配，可继续输入缩小）` : `已定位：${p.title}`
  } else {
    emapSearchFeedback.value = ''
  }
  if (emapPointSearchBlurTimer != null) {
    clearTimeout(emapPointSearchBlurTimer)
    emapPointSearchBlurTimer = null
  }
  emapPointSearchOpen.value = false
  emapPointSearchActiveIdx.value = 0
}

function runEmapPointSearch() {
  const map = mapRef.value
  const q = emapMapSearchText.value.trim()
  emapSearchFeedback.value = ''
  if (!map) {
    emapSearchFeedback.value = '地图尚未就绪'
    return
  }
  if (!q) {
    emapSearchFeedback.value = '请输入名称'
    return
  }
  const list = emapPointSearchCandidates.value
  if (!list.length) {
    emapSearchFeedback.value = '未匹配到库房或冶炼厂'
    emapPointSearchOpen.value = true
    return
  }
  let i = emapPointSearchActiveIdx.value
  if (i < 0 || i >= list.length) i = 0
  focusMapPointFromSearch(list[i]!)
}

/** 仅允许安全子集，防止样式注入 */
function safeCssColor(raw: string, fallback: string): string {
  const s = raw.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return s
  if (/^rgba?\(\s*[\d.\s%,]+\)$/i.test(s) && s.length <= 80) return s
  if (/^hsla?\(\s*[\d.\s%,deg]+\)$/i.test(s) && s.length <= 80) return s
  return fallback
}

function buildTypeColorMap(types: Record<string, unknown>[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const t of types) {
    const id = pickNumber(t, ['类型id', 'id', 'type_id', '类型ID'])
    const c = pickStr(t, ['颜色配置', '库房类型颜色配置', 'color', '颜色', 'color_config'])
    if (id == null || !c) continue
    m.set(id, safeCssColor(c, DEFAULT_WAREHOUSE_COLOR))
  }
  return m
}

/** 冶炼厂类型颜色映射（类型 id → marker 颜色），与 buildTypeColorMap 同构但偏好的字段名不同 */
function buildSmelterTypeColorMap(types: Record<string, unknown>[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const t of types) {
    const id = pickNumber(t, ['类型id', 'id', 'type_id', '类型ID'])
    const rawColor = t['颜色配置']
    let c = ''
    if (rawColor != null && typeof rawColor === 'object' && !Array.isArray(rawColor)) {
      c = String((rawColor as Record<string, unknown>).marker ?? '').trim()
    }
    if (!c) c = pickStr(t, ['颜色配置', 'color', '颜色', 'color_config'])
    if (id == null || !c) continue
    m.set(id, safeCssColor(c, DEFAULT_SMELTER_COLOR))
  }
  return m
}

/** 地图图钉颜色：与「库房类型维护」一致，按 类型id 使用 get_warehouse_types 中的颜色配置；无类型或接口未覆盖时再退回单条库房字段 */
function resolveWarehousePinColor(
  row: Record<string, unknown>,
  typeColorById: Map<number, string>,
): string {
  const tid = pickNumber(row, [
    '仓库类型id',
    'warehouse_type_id',
    'type_id',
    '类型id',
    '库房类型id',
    '类型ID',
  ])
  if (tid != null && typeColorById.has(tid)) return typeColorById.get(tid)!

  const main = pickStr(row, ['颜色配置'])
  if (main) return safeCssColor(main, DEFAULT_WAREHOUSE_COLOR)

  const whColorObj = row['仓库颜色配置']
  if (whColorObj != null && typeof whColorObj === 'object' && !Array.isArray(whColorObj)) {
    const marker = (whColorObj as { marker?: unknown }).marker
    if (marker != null && String(marker).trim() !== '') {
      return safeCssColor(String(marker).trim(), DEFAULT_WAREHOUSE_COLOR)
    }
  }
  const own = pickStr(row, ['仓库颜色配置', 'color', '颜色', 'color_config'])
  if (own) return safeCssColor(own, DEFAULT_WAREHOUSE_COLOR)
  return DEFAULT_WAREHOUSE_COLOR
}

/** 冶炼厂地图图钉颜色：按 冶炼厂类型id 使用 get_factory_types 中的颜色配置；无类型时退回默认橙色 */
function resolveSmelterPinColor(
  row: Record<string, unknown>,
  smelterTypeColorById: Map<number, string>,
): string {
  const tid = pickNumber(row, [
    '冶炼厂类型id',
    'factory_type_id',
    'smelter_type_id',
    'type_id',
    '类型id',
  ])
  if (tid != null && smelterTypeColorById.has(tid)) return smelterTypeColorById.get(tid)!

  const colorConfig = row['冶炼厂颜色配置'] ?? row['颜色配置']
  if (colorConfig != null && typeof colorConfig === 'object' && !Array.isArray(colorConfig)) {
    const marker = (colorConfig as { marker?: unknown }).marker
    if (marker != null && String(marker).trim() !== '') {
      return safeCssColor(String(marker).trim(), DEFAULT_SMELTER_COLOR)
    }
  }
  const own = pickStr(row, ['颜色配置', 'color', '颜色', 'color_config'])
  if (own) return safeCssColor(own, DEFAULT_SMELTER_COLOR)
  return DEFAULT_SMELTER_COLOR
}

/** 解析库房→冶炼厂运费列表（/tl/get_warehouses 字段「库房到冶炼厂运费」） */
function pickWarehouseSmelterFreights(
  raw: Record<string, unknown>,
): { smelter: string; freight: number | null }[] {
  const arr = raw['库房到冶炼厂运费']
  if (!Array.isArray(arr) || !arr.length) return []
  const out: { smelter: string; freight: number | null }[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const smelter = pickStr(o, [
      '目标冶炼厂',
      '冶炼厂',
      '冶炼厂名',
      'factory_name',
      '目标冶炼厂名',
      'smelter_name',
    ])
    const freight = pickNumber(o, ['运费', 'freight', 'freight_rate'])
    if (!smelter && freight === null) continue
    out.push({ smelter: smelter || '—', freight })
  }
  return out
}

/** 从 /tl/warehouse_receipt_prices 拉取最新收货价格日期并缓存 */
async function refreshReceiptPriceDateCache() {
  try {
    const rpRaw = (await tlGetJson('/tl/warehouse_receipt_prices?only_latest=true&page=1&page_size=500')) as Record<string, unknown>
    const rpData = (rpRaw?.data ?? rpRaw) as Record<string, unknown>
    const rpList = Array.isArray(rpData?.list) ? rpData.list : Array.isArray(rpData) ? rpData : []
    const m = new Map<string, string>()
    for (const r of rpList as Record<string, unknown>[]) {
      const whId = r['库房id'] ?? r['仓库id'] ?? r.warehouse_id ?? r.warehouseId
      const whName = String(r['库房名称'] ?? r['仓库名'] ?? r.warehouse_name ?? '').trim()
      const catName = String(r['品类名'] ?? r['品类'] ?? r['回收品类'] ?? r.category_name ?? '').trim()
      const date = String(r['更新时间'] ?? r['定价日期'] ?? r.updated_at ?? r.price_date ?? '').slice(0, 10)
      if (date) {
        if (whId != null && catName) m.set(`${whId}||${catName}`, date)
        if (whName && catName) m.set(`${whName}||${catName}`, date)
      }
    }
    receiptPriceDateCache.value = m
    console.log('[emap] receiptPriceDateCache loaded, size:', m.size, 'sample keys:', [...m.keys()].slice(0, 5))
  } catch (e) {
    console.warn('[emap] refreshReceiptPriceDateCache failed:', e)
  }
}

/** 解析库房收货价格按品种（/tl/get_warehouses 字段「收货价格按品种」） */
function pickWarehouseReceiptPricesByCategory(
  raw: Record<string, unknown>,
): { category: string; price: number | null; date: string }[] {
  const arr = raw['收货价格按品种']
  if (!Array.isArray(arr) || !arr.length) return []
  const cache = receiptPriceDateCache.value
  const whId = raw['仓库id'] ?? raw['库房id'] ?? raw['id'] ?? raw.warehouse_id
  const whName = String(raw['仓库名'] ?? raw['库房名称'] ?? raw.warehouse_name ?? '').trim()
  const out: { category: string; price: number | null; date: string }[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const category = pickStr(o, [
      '品类',
      '品类名',
      '品种',
      'category',
      'category_name',
      '回收品种',
    ])
    const price = pickNumber(o, ['价格', '收货价格', 'price', 'receive_price'])
    let date = pickStr(o, ['价格日期', '定价日期', '日期', 'price_date', 'priceDate', 'date', '更新时间', 'updated_at', 'updatedAt']) || ''
    // 如果原数据无日期，从全局缓存中按 库房id+品类名 或 库房名称+品类名 查找
    if (!date && category && cache.size > 0) {
      if (whId != null) date = cache.get(`${whId}||${category}`) || ''
      if (!date && whName) date = cache.get(`${whName}||${category}`) || ''
      if (!date) console.log('[emap] cache miss:', { whId, whName, category, cacheSize: cache.size })
    }
    if (!category && price === null) continue
    out.push({ category: category || '—', price, date: date.length > 10 ? date.slice(0, 10) : date })
  }
  return out
}

function warehouseReceiptPriceBlockHtml(
  prices: { category: string; price: number | null; date: string }[],
): string {
  if (!prices.length) {
    return `<div class="emap-wh-hover-row"><span class="emap-wh-hover-k">收货价格</span><span class="emap-wh-hover-v">—</span></div>`
  }
  const items = prices
    .map((p) => {
      const val =
        p.price === null
          ? '—'
          : `${p.price.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元/吨`
      const dateSpan = p.date ? `<span class="emap-wh-hover-date">${escapeHtml(p.date)}</span>` : '<span></span>'
      return `<div class="emap-wh-hover-freight-item"><span class="emap-wh-hover-freight-smelter">${escapeHtml(
        p.category,
      )}</span>${dateSpan}<span class="emap-wh-hover-freight-val">${escapeHtml(val)}</span></div>`
    })
    .join('')
  return `<div class="emap-wh-hover-freight"><div class="emap-wh-hover-freight-head">收货价格</div><div class="emap-wh-hover-freight-scroll">${items}</div></div>`
}

function pickWarehouseStockByCategory(
  raw: Record<string, unknown>,
): { category: string; stock: number | null; date: string }[] {
  const arr = raw['库存按品种']
  if (!Array.isArray(arr) || !arr.length) return []
  const out: { category: string; stock: number | null; date: string }[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const category = pickStr(o, [
      '品类名',
      '品类',
      '品种',
      'category',
      'category_name',
      '回收品种',
    ])
    const stock = pickNumber(o, ['当前库存', 'current_stock', 'stock'])
    const date = pickStr(o, ['库存日期', 'inventory_date', 'stock_date', 'stockDate', 'date', '更新时间', 'updated_at'])
    if (!category && stock === null) continue
    out.push({ category: category || '—', stock, date })
  }
  return out
}

function warehouseStockBlockHtml(
  stocks: { category: string; stock: number | null; date: string }[],
): string {
  if (!stocks.length) {
    return `<div class="emap-wh-hover-row"><span class="emap-wh-hover-k">库存按品种</span><span class="emap-wh-hover-v">—</span></div>`
  }
  const items = stocks
    .map((s) => {
      const val =
        s.stock === null
          ? '—'
          : `${s.stock.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 吨`
      const dateSpan = s.date ? `<span class="emap-wh-hover-date">${escapeHtml(s.date)}</span>` : '<span></span>'
      return `<div class="emap-wh-hover-freight-item"><span class="emap-wh-hover-freight-smelter">${escapeHtml(
        s.category,
      )}</span>${dateSpan}<span class="emap-wh-hover-freight-val">${escapeHtml(val)}</span></div>`
    })
    .join('')
  return `<div class="emap-wh-hover-freight emap-wh-stock-block"><div class="emap-wh-hover-freight-head">库存按品种</div><div class="emap-wh-hover-freight-scroll">${items}</div></div>`
}

function formatWarehouseCurrentStock(raw: Record<string, unknown>): string {
  const stock = pickNumber(raw, ['当前库存', 'current_stock', 'stock'])
  if (stock === null) return '—'
  const date = pickStr(raw, ['库存日期', 'inventory_date'])
  const base = `${stock.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 吨`
  return date ? `${base}（${date}）` : base
}

function warehouseSmelterFreightBlockHtml(
  freights: { smelter: string; freight: number | null }[],
): string {
  if (!freights.length) {
    return `<div class="emap-wh-hover-row"><span class="emap-wh-hover-k">运费</span><span class="emap-wh-hover-v">—</span></div>`
  }
  const items = freights
    .map((f) => {
      const val = f.freight === null ? '—' : `${f.freight} 元/吨`
      return `<div class="emap-wh-hover-freight-item"><span class="emap-wh-hover-freight-smelter">${escapeHtml(
        f.smelter,
      )}</span><span class="emap-wh-hover-freight-val">${escapeHtml(val)}</span></div>`
    })
    .join('')
  return `<div class="emap-wh-hover-freight"><div class="emap-wh-hover-freight-head">运费</div><div class="emap-wh-hover-freight-scroll">${items}</div></div>`
}

/** 接口值为万吨/年，展示为吨/年 */
function formatHazardLicenseQty(wanTonPerYear: number | null): string {
  if (wanTonPerYear === null) return '—'
  const tonPerYear = wanTonPerYear * 10000
  const text = Number.isInteger(tonPerYear)
    ? tonPerYear.toLocaleString('zh-CN')
    : tonPerYear.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  return `${text} 吨/年`
}

/** 库房信息卡片 HTML：悬浮 tooltip 与点击弹窗共用 */
function warehouseHoverTooltipHtml(p: MapPoint): string {
  const raw = p.raw
  const name =
    warehouseDisplayName(
      pickStr(raw, ['仓库名', 'warehouse_name', 'name', '仓库', '库房名', 'title']) || p.title,
    )
  const typeName =
    pickStr(raw, ['类型', 'type', 'warehouse_type_name', '类型名']).trim() || '—'
  const addr = addressText(raw)
  const contact = pickStr(raw, ['库房联系人', '联系人', 'contact', '联络人'])
  const phone = pickStr(raw, ['电话', '手机', '联系电话', 'mobile', 'tel'])
  const haz = pickNumber(raw, ['危废经营许可数量', 'hazard_license_count', '危废许可数量'])
  const monthly = pickNumber(raw, ['月均收货', 'monthly_avg_receipt', '月均采购'])
  const monthlyDelivery = pickNumber(raw, ['当月发货量'])
  const yearlyDelivery = pickNumber(raw, ['年度累计发货量'])
  const stockText = formatWarehouseCurrentStock(raw)
  const stocksByCategory = pickWarehouseStockByCategory(raw)
  const stockBlock = warehouseStockBlockHtml(stocksByCategory)
  const smelterFreights = pickWarehouseSmelterFreights(raw)
  const receiptPrices = pickWarehouseReceiptPricesByCategory(raw)
  const hazText = formatHazardLicenseQty(haz)
  const monthlyText =
    monthly === null
      ? '—'
      : `${Number.isInteger(monthly) ? monthly.toLocaleString('zh-CN') : monthly.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 吨`
  /** 发货统计字段：仅普通合作库房 / 垂直库房 / 战略库房显示 */
  const showDeliveryStats =
    typeName === '普通合作库房' || typeName === '垂直库房' || typeName === '战略库房'
  const formatDeliveryValue = (val: number | null): string => {
    const n = val ?? 0
    return `${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 吨`
  }
  const receiptBlock = warehouseReceiptPriceBlockHtml(receiptPrices)
  const freightBlock = warehouseSmelterFreightBlockHtml(smelterFreights)
  const tipRow = (label: string, value: string) =>
    `<div class="emap-wh-hover-row"><span class="emap-wh-hover-k">${escapeHtml(
      label,
    )}</span><span class="emap-wh-hover-v">${escapeHtml(value)}</span></div>`
  const metric = (label: string, value: string) =>
    `<div class="emap-wh-hover-metric"><span class="emap-wh-hover-k">${escapeHtml(
      label,
    )}</span><span class="emap-wh-hover-v">${escapeHtml(value)}</span></div>`
  const dual = (a: string, b: string) => `<div class="emap-wh-hover-dual">${a}${b}</div>`
  const deliveryStatsRow = showDeliveryStats
    ? dual(
        metric('当月发货量', formatDeliveryValue(monthlyDelivery)),
        metric('年度累计发货量', formatDeliveryValue(yearlyDelivery)),
      )
    : ''
  return `<div class="emap-wh-hover-tip"><div class="emap-wh-hover-inner">${tipRow('库房名称', name)}${tipRow(
    '库房类型',
    typeName,
  )}${tipRow(
    '地址',
    addr || '—',
  )}${dual(metric('联系人', contact || '—'), metric('电话', phone || '—'))}${tipRow(
    '危废经营许可数量',
    hazText,
  )}${tipRow('月均收货', monthlyText)}${deliveryStatsRow}${tipRow('当前库存（汇总）', stockText)}${stockBlock}${receiptBlock}${freightBlock}</div></div>`
}

function smelterPopupHtml(p: MapPoint): string {
  const row = p.raw
  const xrbShip = pickStr(row, ['循融宝发货', 'xunrongbao_ship', 'xrb_ship'])
  const xrbShipLower = xrbShip.toLowerCase()
  const xrbShipText =
    xrbShipLower === 'true' || xrbShip === '1'
      ? '是'
      : xrbShipLower === 'false' || xrbShip === '0'
        ? '否'
        : xrbShip
  const xrbBlock =
    xrbShip !== ''
      ? `<div class="emap-popup-type"><span class="emap-popup-type-label">循融宝发货：</span><span class="emap-popup-type-value">${escapeHtml(
          xrbShipText,
        )}</span></div>`
      : ''
  return `<div class="emap-popup"><strong>${escapeHtml(p.title)}</strong><br/>${xrbBlock}<span class="emap-popup-subtitle text-muted small">${escapeHtml(
    p.subtitle,
  )}</span></div>`
}

function initMap() {
  const el = mapElRef.value
  if (!el || mapRef.value) return

  const map = L.map(el, {
    zoomControl: true,
    // 需要 SVG 才能让虚线 dashoffset 动画生效
    preferCanvas: false,
  }).setView([32.12, 118.78], 5)

  L.tileLayer(GAODE_TILE, {
    attribution: '&copy; 高德地图',
    maxZoom: 18,
    minZoom: 3,
  }).addTo(map)

  // 距离监测线与距离标签：独立 pane，层级高于 marker，避免缩小时被仓库/冶炼厂图标遮挡
  if (!map.getPane(distanceLinePaneName)) {
    const p = map.createPane(distanceLinePaneName)
    p.style.zIndex = '2000'
    p.style.pointerEvents = 'none'
  }
  if (!map.getPane(distanceLabelPaneName)) {
    const p = map.createPane(distanceLabelPaneName)
    p.style.zIndex = '2010'
    p.style.pointerEvents = 'none'
  }
  if (!map.getPane(emapRankComparisonTipPaneName)) {
    const p = map.createPane(emapRankComparisonTipPaneName)
    p.style.zIndex = '680'
    p.style.pointerEvents = 'none'
  }
  if (!map.getPane(emapWarehouseHoverTipPaneName)) {
    const p = map.createPane(emapWarehouseHoverTipPaneName)
    p.style.zIndex = '710'
    p.style.pointerEvents = 'none'
  }
  if (!map.getPane(emapComparisonFlowPaneName)) {
    const p = map.createPane(emapComparisonFlowPaneName)
    p.style.zIndex = '620'
    p.style.pointerEvents = 'none'
  }

  const markerLayer = L.layerGroup().addTo(map)
  const flowLayer = L.layerGroup().addTo(map)
  const topTipLayer = L.layerGroup().addTo(map)
  mapRef.value = map
  markerLayerRef.value = markerLayer
  flowLayerRef.value = flowLayer
  topTipLayerRef.value = topTipLayer
  flowPathSvgRendererRef.value = L.svg({ padding: 0.5, pane: emapComparisonFlowPaneName })

  if (mapWrapRef.value) {
    resizeObs = new ResizeObserver(() => {
      map.invalidateSize()
      clampMapToolsFloatInWrap()
    })
    resizeObs.observe(mapWrapRef.value)
  }

  map.on('click', (evt: L.LeafletMouseEvent) => {
    if (enableCoordPick.value) {
      const lat = evt.latlng.lat.toFixed(6)
      const lng = evt.latlng.lng.toFixed(6)
      lastClickedCoordText.value = `坐标：${lat}, ${lng}`
    }
    // 点击地图空白区域：取消当前仓库选中并清空比价/距离线覆盖物（锁定时不取消）
    if (selectedWarehouse.value?.kind === 'warehouse') {
      if (warehouseSelectionLocked.value) {
        requestAnimationFrame(() => syncLockedWarehousePopupPin())
        return
      }
      selectedWarehouse.value = null
      clearComparisonOverlays()
    }
  })

  const onMapContainerCaptureClick = (ev: MouseEvent) => {
    const el = ev.target as HTMLElement | null
    if (el?.closest?.('.leaflet-popup-close-button')) {
      lockedWarehousePopupDismissedByUser = true
    }
  }
  map.getContainer().addEventListener('click', onMapContainerCaptureClick, true)
  emapMapPopupCloseCaptureOff = () => {
    map.getContainer().removeEventListener('click', onMapContainerCaptureClick, true)
    emapMapPopupCloseCaptureOff = null
  }

  map.on('popupclose', onLockedWarehousePopupClosed)

  map.on('popupopen', (e: L.LeafletEvent) => {
    guardLockedWarehousePopupOpen(e)
    const pop = (e as unknown as { popup?: L.Popup }).popup
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nudgeOpenLeafletPopupAwayFromEmapRankTips(map, pop)
        runEmapRankTipOverlapLayoutNow()
      })
    })
  })
}

/** 球面大圆距离（米），用于「离我最近的库房」 */
function greatCircleDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function openMarkerPopupNear(lat: number, lng: number) {
  const group = markerLayerRef.value
  if (!group) return
  const eps = 1e-5
  let done = false
  group.eachLayer((ly) => {
    if (done) return
    const m = ly as L.Marker
    if (typeof m.getLatLng !== 'function' || typeof m.openPopup !== 'function') return
    const p = m.getLatLng()
    if (Math.abs(p.lat - lat) < eps && Math.abs(p.lng - lng) < eps) {
      m.openPopup()
      done = true
    }
  })
}

function dismissGeoNearestToast() {
  if (geoNearestToastTimer != null) {
    clearTimeout(geoNearestToastTimer)
    geoNearestToastTimer = null
  }
  geoNearestToastVisible.value = false
}

/** 同一条右上角提示：更新文案并重新计时 10 分钟 */
function showOrUpdateGeoNearestToast(message: string) {
  if (geoNearestToastTimer != null) {
    clearTimeout(geoNearestToastTimer)
    geoNearestToastTimer = null
  }
  geoNearestToastMessage.value = message
  geoNearestToastVisible.value = true
  geoNearestToastTimer = setTimeout(() => {
    dismissGeoNearestToast()
  }, GEO_NEAREST_TOAST_MS)
}

function dismissComparisonPrereqToast() {
  if (comparisonPrereqToastTimer != null) {
    clearTimeout(comparisonPrereqToastTimer)
    comparisonPrereqToastTimer = null
  }
  comparisonPrereqToastVisible.value = false
}

function showComparisonPrereqToast(message: string) {
  if (comparisonPrereqToastTimer != null) {
    clearTimeout(comparisonPrereqToastTimer)
    comparisonPrereqToastTimer = null
  }
  comparisonPrereqToastMessage.value = message
  comparisonPrereqToastVisible.value = true
  comparisonPrereqToastTimer = setTimeout(() => {
    dismissComparisonPrereqToast()
  }, COMPARISON_PREREQ_TOAST_MS)
}

function focusNearestWarehouseFromGeolocation() {
  const map = mapRef.value
  const list = allWarehousePoints.value
  if (!map) {
    window.alert('地图尚未就绪')
    return
  }
  if (!list.length) {
    window.alert('当前没有库房数据，请先加载地图')
    return
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    window.alert('当前环境不支持浏览器定位')
    return
  }
  nearestWarehouseBusy.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      nearestWarehouseBusy.value = false
      const uLat = pos.coords.latitude
      const uLng = pos.coords.longitude
      let best: MapPoint | null = null
      let bestM = Infinity
      for (const p of list) {
        const m = greatCircleDistanceMeters(uLat, uLng, p.lat, p.lng)
        if (m < bestM) {
          bestM = m
          best = p
        }
      }
      if (!best) return
      const zoom = Math.max(map.getZoom(), 12)
      map.setView([best.lat, best.lng], zoom, { animate: true })
      openMarkerPopupNear(best.lat, best.lng)
      showOrUpdateGeoNearestToast(`已定位到最近仓库：${best.title}`)
    },
    (err) => {
      nearestWarehouseBusy.value = false
      const msg =
        err.code === 1
          ? '已拒绝定位权限，请在浏览器设置中允许本站获取位置'
          : err.code === 2
            ? '暂时无法获取位置'
            : err.code === 3
              ? '定位超时，请重试'
              : `定位失败：${err.message || '未知错误'}`
      window.alert(msg)
    },
    { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
  )
}

function warehouseIcon(cssColor: string, dimmed = false): L.DivIcon {
  const bg = safeCssColor(cssColor, DEFAULT_WAREHOUSE_COLOR)
  const dimClass = dimmed ? ' emap-pin-inner--dimmed' : ''
  return L.divIcon({
    className: 'emap-marker emap-marker--warehouse',
    html: `<div class="emap-pin-inner${dimClass}" style="background:${bg};"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -18],
  })
}

function refreshAllMarkerVisualState() {
  const sel = selectedWarehouse.value
  const selId = sel?.kind === 'warehouse' ? sel.id : null
  const validSelId = selId && warehouseMarkerById.has(selId) ? selId : null
  const filterOn = Boolean(emapProvinceFilter.value.trim())
  const selMatchesProvinceFilter =
    sel?.kind === 'warehouse' &&
    filterOn &&
    provincesRoughlyEqual(provinceFromRow(sel.raw), emapProvinceFilter.value)

  for (const p of allWarehousePoints.value) {
    const m = warehouseMarkerById.get(p.id)
    if (!m) continue
    let dimmed = false
    if (hoverProvinceLiftId.value === p.id) dimmed = false
    else {
      if (filterOn) {
        const ok = provincesRoughlyEqual(provinceFromRow(p.raw), emapProvinceFilter.value)
        if (!ok) dimmed = true
      }
      // 按省筛选时：点击省外仓库不再把省内其它仓库压暗（省外仍按筛选规则变淡）
      if (!dimmed && validSelId && validSelId !== p.id) {
        const pInFilterProvince =
          filterOn && provincesRoughlyEqual(provinceFromRow(p.raw), emapProvinceFilter.value)
        if (!(pInFilterProvince && !selMatchesProvinceFilter)) dimmed = true
      }
    }
    m.setIcon(warehouseIcon(p.pinColor ?? DEFAULT_WAREHOUSE_COLOR, dimmed))
  }

  for (const p of allSmelterPoints.value) {
    const m = smelterMarkerById.get(p.id)
    if (!m) continue
    let dimmed = false
    if (hoverProvinceLiftId.value === p.id) dimmed = false
    else if (filterOn) {
      dimmed = !provincesRoughlyEqual(provinceFromRow(p.raw), emapProvinceFilter.value)
    }
    m.setIcon(smelterIcon(dimmed, smelterComparisonTriLargeOn(), p.pinColor))
  }
}

watch(selectedWarehouse, (wh) => {
  if (!wh) warehouseSelectionLocked.value = false
  if (warehouseDistanceMonitorOn.value) {
    exitWarehouseDistanceMonitorMode(false)
    comparisonModalVisible.value = false
  }
  refreshAllMarkerVisualState()
  refreshWarehouseMarkerLockInteractivity()
  syncLockedWarehousePopupPin()
})

watch(warehouseSelectionLocked, () => {
  refreshWarehouseMarkerLockInteractivity()
  syncLockedWarehousePopupPin()
})

watch([comparisonRanks, warehouseDistanceMonitorOn, compareLoading], () => {
  refreshAllMarkerVisualState()
})

/** 从阿里云 DataV 加载省界并绘制红色轮廓 */
async function refreshProvinceOutlineLayer() {
  const map = mapRef.value
  if (provinceOutlineLayerRef.value && map) {
    map.removeLayer(provinceOutlineLayerRef.value)
    provinceOutlineLayerRef.value = null
  }
  const pr = emapProvinceFilter.value.trim()
  if (!map || !pr) return
  const adcode = emapProvinceFilterToAdcode(pr)
  if (!adcode) return
  const url = `${EMAP_LOCAL_PROVINCE_GEOJSON_PATH}/${adcode}.json`
  try {
    const { data } = await axios.get(url, { timeout: 22000 })
    const layer = L.geoJSON(data as never, {
      style: {
        color: '#dc2626',
        weight: 3,
        opacity: 0.95,
        fillColor: '#dc2626',
        fillOpacity: 0.06,
      },
      interactive: false,
    })
    layer.addTo(map)
    provinceOutlineLayerRef.value = layer
  } catch (e) {
    console.warn(
      `[emap] 本地省界轮廓加载失败：${url}。请在 public/province 下放置 ${adcode}.json`,
      pr,
      e,
    )
  }
}

/** 省界轮廓 ∪ 该省点位，一起 fitBounds */
function fitViewToProvinceFilter() {
  const map = mapRef.value
  const pr = emapProvinceFilter.value.trim()
  if (!map || !pr) return
  const bounds = L.latLngBounds([])
  const outline = provinceOutlineLayerRef.value
  if (outline) {
    const ob = outline.getBounds()
    if (ob.isValid()) bounds.extend(ob)
  }
  for (const p of allWarehousePoints.value) {
    if (provincesRoughlyEqual(provinceFromRow(p.raw), pr)) bounds.extend([p.lat, p.lng])
  }
  for (const p of allSmelterPoints.value) {
    if (provincesRoughlyEqual(provinceFromRow(p.raw), pr)) bounds.extend([p.lat, p.lng])
  }
  if (!bounds.isValid()) return
  const maxZoom = outline ? 10 : 14
  map.fitBounds(bounds.pad(0.12), { maxZoom, animate: true })
}

watch(emapProvinceFilter, () => {
  provinceFacilitiesPanelCollapsed.value = false
  provinceListWarehouseSectionOpen.value = true
  provinceListSmelterSectionOpen.value = true
  hoverProvinceLiftId.value = null
  refreshAllMarkerVisualState()
  void (async () => {
    await refreshProvinceOutlineLayer()
    await nextTick()
    fitViewToProvinceFilter()
    void nextTick(() => clampMapToolsFloatInWrap())
  })()
})

function smelterIcon(dimmed = false, large = false, color?: string): L.DivIcon {
  const baseTri = dimmed ? 'emap-smelter-tri emap-smelter-tri--dimmed' : 'emap-smelter-tri'
  const triCls = large ? `${baseTri} emap-smelter-tri--large` : baseTri
  const markerCls = large ? 'emap-marker emap-marker--smelter emap-marker--smelter-lg' : 'emap-marker emap-marker--smelter'
  const h = large ? 28 : 14
  const ax = large ? 16 : 8
  const colorStyle = color ? `border-bottom-color:${safeCssColor(color, DEFAULT_SMELTER_COLOR)};` : ''
  return L.divIcon({
    className: markerCls,
    html: `<div class="${triCls}" style="${colorStyle}" aria-hidden="true"></div>`,
    iconSize: large ? [32, 28] : [16, 14],
    iconAnchor: [ax, h],
    popupAnchor: [0, -h],
  })
}

function liftWarehouseHoverTooltip(marker: L.Marker) {
  const tip = marker.getTooltip()
  const el = tip?.getElement?.() as HTMLElement | null | undefined
  if (el?.parentElement) el.parentElement.appendChild(el)
}

function renderMarkers(points: MapPoint[], options?: { preserveMapView?: boolean }) {
  const map = mapRef.value
  const markerLayer = markerLayerRef.value
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  clearComparisonOverlays()
  warehouseMarkerById.clear()
  smelterMarkerById.clear()
  hoverProvinceLiftId.value = null

  allWarehousePoints.value = points.filter((p) => p.kind === 'warehouse')
  allSmelterPoints.value = points.filter((p) => p.kind === 'smelter')
  for (const p of points) {
    const icon =
      p.kind === 'warehouse'
        ? warehouseIcon(p.pinColor ?? DEFAULT_WAREHOUSE_COLOR, false)
        : smelterIcon(false, false, p.pinColor)
    const marker = L.marker([p.lat, p.lng], { icon })
    const popupHtml =
      p.kind === 'warehouse'
        ? warehouseHoverTooltipHtml(p)
        : smelterPopupHtml(p)
    const tooltipHtml = popupHtml
    marker.bindPopup(popupHtml)
    if (p.kind === 'warehouse') {
      marker.bindTooltip(tooltipHtml, {
        sticky: false,
        direction: 'top',
        opacity: 1,
        className: 'emap-marker-hover-tip',
        pane: emapWarehouseHoverTipPaneName,
      })
    } else {
      marker.bindTooltip(tooltipHtml, {
        sticky: false,
        direction: 'top',
        opacity: 1,
        className: 'emap-marker-hover-tip',
      })
    }
    marker.on('popupopen', () => {
      marker.closeTooltip()
    })
    marker.on('tooltipopen', () => {
      if (marker.isPopupOpen()) marker.closeTooltip()
      if (p.kind === 'warehouse') liftWarehouseHoverTooltip(marker)
    })
    if (p.kind === 'warehouse') {
      marker.on('click', () => {
        if (isWarehouseSelectionChangeBlocked(p)) return
        selectedWarehouse.value = p
        forecastError.value = ''
        if (enableAutoZoomOnPointClick.value) {
          const zoom = Math.max(map.getZoom(), 9)
          setMapViewWithWarehouseLeftPanelBias(map, [p.lat, p.lng], zoom, { animate: true })
        }
        void runComparisonForWarehouse(p)
      })
    } else {
      marker.on('click', () => {
        if (!enableAutoZoomOnPointClick.value) return
        const zoom = Math.max(map.getZoom(), 9)
        map.setView([p.lat, p.lng], zoom, { animate: true })
      })
    }
    marker.addTo(markerLayer)
    bindMarkerProvinceHover(marker, p)
    if (p.kind === 'warehouse') warehouseMarkerById.set(p.id, marker)
    else smelterMarkerById.set(p.id, marker)
  }

  refreshAllMarkerVisualState()
  applyWarehouseTypeVisibility()
  applySmelterVisibility()
  refreshWarehouseMarkerLockInteractivity()
  syncLockedWarehousePopupPin()

  if (options?.preserveMapView) return

  const bounds = L.latLngBounds([])
  for (const p of points) bounds.extend([p.lat, p.lng])
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.12), { maxZoom: 14, animate: true })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 比价请求中或已有比价连线且未切到「库房距离监测」时，冶炼厂三角放大 */
function smelterComparisonTriLargeOn(): boolean {
  return (
    compareLoading.value ||
    (comparisonRanks.value.length > 0 && !warehouseDistanceMonitorOn.value)
  )
}

/** 大三角时略抬高常驻排名提示，避免压住标记 */
function comparisonRankTipYOffset(): number {
  return smelterComparisonTriLargeOn() ? -24 : -8
}

function comparisonRankBadgeClass(rank: number): string {
  if (rank === 1) return 'emap-rank-tip-badge emap-rank-tip-badge--r1'
  if (rank === 2) return 'emap-rank-tip-badge emap-rank-tip-badge--r2'
  if (rank === 3) return 'emap-rank-tip-badge emap-rank-tip-badge--r3'
  return 'emap-rank-tip-badge emap-rank-tip-badge--muted'
}

function comparisonRankTipHtml(row: ComparisonRankItem): string {
  const rk = escapeHtml(String(row.rank))
  const name = escapeHtml(row.smelter)
  const badgeCls = comparisonRankBadgeClass(row.rank)
  return `<div class="emap-rank-tip-inner"><span class="${badgeCls}">${rk}</span><div class="emap-rank-tip-body"><div class="emap-rank-tip-name">${name}</div><div>净货款: ${formatNum(row.netProfit)}</div><div>总货款: ${formatNum(row.totalRecovery)}</div><div>总运费: ${formatNum(row.totalFreight)}</div></div></div>`
}

/** 比价常驻 tip：方向轮询 + 像素防重叠 */
type EmapRankTipDir = 'top' | 'right' | 'left' | 'bottom'

const EMAP_RANK_TIP_DIRECTIONS: readonly EmapRankTipDir[] = ['top', 'right', 'left', 'bottom']

/** 防重叠时依次叠加的像素位移（相对上一位置累加） */
const EMAP_RANK_TIP_SPIRAL_DELTAS: readonly [number, number][] = [
  [9, 0],
  [-9, 0],
  [0, 9],
  [0, -9],
  [14, 0],
  [-14, 0],
  [0, 14],
  [0, -14],
  [11, 11],
  [-11, 11],
  [11, -11],
  [-11, -11],
  [18, 8],
  [-18, 8],
  [18, -8],
  [-18, -8],
  [8, 16],
  [-8, 16],
  [8, -16],
  [-8, -16],
]

type EmapRankTipLayoutMeta = {
  base: L.Point
  rank: number
  listIdx: number
  bump: L.Point
  spiral: number
}

const emapRankTipLayoutMeta = new WeakMap<L.Tooltip, EmapRankTipLayoutMeta>()

let emapRankTipLayoutOff: (() => void) | null = null
let emapRankTipLayoutDebounceTimer: ReturnType<typeof setTimeout> | null = null
/** 左侧比价面板 / 浮层尺寸变化时重算避让 */
let emapRankTipUiLayoutTimer: ReturnType<typeof setTimeout> | null = null

function emapRankTipDirectionForIdx(listIdx: number): EmapRankTipDir {
  return EMAP_RANK_TIP_DIRECTIONS[listIdx % EMAP_RANK_TIP_DIRECTIONS.length]!
}

function emapRankTipBasePixelOffset(direction: EmapRankTipDir, liftY: number): L.Point {
  switch (direction) {
    case 'top':
      return L.point(0, liftY)
    case 'bottom':
      return L.point(0, 12 + Math.round(Math.abs(liftY) * 0.35))
    case 'right':
      return L.point(12, Math.round(liftY * 0.42))
    case 'left':
      return L.point(-12, Math.round(liftY * 0.42))
    default:
      return L.point(0, liftY)
  }
}

function stopEmapRankTipLayoutHandlers(): void {
  emapRankTipLayoutOff?.()
  emapRankTipLayoutOff = null
  if (emapRankTipLayoutDebounceTimer != null) {
    clearTimeout(emapRankTipLayoutDebounceTimer)
    emapRankTipLayoutDebounceTimer = null
  }
  if (emapRankTipUiLayoutTimer != null) {
    clearTimeout(emapRankTipUiLayoutTimer)
    emapRankTipUiLayoutTimer = null
  }
}

function emapRankTipRectInMapFrame(map: L.Map, el: HTMLElement) {
  const mc = map.getContainer().getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return {
    left: r.left - mc.left,
    top: r.top - mc.top,
    right: r.right - mc.left,
    bottom: r.bottom - mc.top,
  }
}

type EmapRankTipRect = NonNullable<ReturnType<typeof emapRankTipRectInMapFrame>>

function emapRankTipRectsOverlap(a: EmapRankTipRect, b: EmapRankTipRect, pad: number): boolean {
  return !(
    a.right + pad <= b.left ||
    b.right + pad <= a.left ||
    a.bottom + pad <= b.top ||
    b.bottom + pad <= a.top
  )
}

/** 将任意 DOM 与地图容器的相交区域转为地图容器内坐标（用于与 tooltip 同坐标系比相交） */
function emapElementClippedToMapFrame(map: L.Map, el: HTMLElement | null): EmapRankTipRect | null {
  if (!el) return null
  if (!el.getClientRects().length) return null
  const mc = map.getContainer().getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const il = Math.max(mc.left, r.left)
  const ir = Math.min(mc.right, r.right)
  const it = Math.max(mc.top, r.top)
  const ib = Math.min(mc.bottom, r.bottom)
  if (ir - il < 6 || ib - it < 6) return null
  return {
    left: il - mc.left,
    top: it - mc.top,
    right: ir - mc.left,
    bottom: ib - mc.top,
  }
}

/** 仓库相关 UI：点击弹窗、左侧比价面板、左下角操作条（与冶炼厂比价 tooltip 不同层，需参与避让） */
function emapWarehouseObstacleRectsForRankTips(map: L.Map): EmapRankTipRect[] {
  const out: EmapRankTipRect[] = []
  const pane = map.getPane('popupPane')
  if (pane) {
    const r = emapElementClippedToMapFrame(map, pane.querySelector('.leaflet-popup') as HTMLElement | null)
    if (r) out.push(r)
  }
  const wrap = mapWrapRef.value
  if (wrap) {
    const panel = emapElementClippedToMapFrame(map, wrap.querySelector('.emap-cmp-panel') as HTMLElement | null)
    if (panel) out.push(panel)
    const fl = emapElementClippedToMapFrame(map, wrap.querySelector('.emap-floating-actions') as HTMLElement | null)
    if (fl) out.push(fl)
    const prov = emapElementClippedToMapFrame(
      map,
      wrap.querySelector('.emap-province-facilities') as HTMLElement | null,
    )
    if (prov) out.push(prov)
  }
  return out
}

function bumpEmapRankTooltip(tip: L.Tooltip): boolean {
  const meta = emapRankTipLayoutMeta.get(tip)
  if (!meta) return false
  const [dx, dy] = EMAP_RANK_TIP_SPIRAL_DELTAS[meta.spiral % EMAP_RANK_TIP_SPIRAL_DELTAS.length]!
  meta.spiral += 1
  meta.bump = L.point(meta.bump.x + dx, meta.bump.y + dy)
  tip.options.offset = L.point(meta.base.x + meta.bump.x, meta.base.y + meta.bump.y)
  tip.update()
  return true
}

/** 将 Leaflet 打开的点位弹窗整体挪开，避免盖住比价冶炼厂常驻 tip（仅挪弹窗，不依赖 tip 避让） */
const EMAP_POPUP_NUDGE_SPIRAL: readonly [number, number][] = [
  [16, -12],
  [-16, -12],
  [16, 12],
  [-16, 12],
  [24, 0],
  [-24, 0],
  [0, -20],
  [0, 20],
  [32, -14],
  [-32, -14],
  [28, 18],
  [-28, 18],
  [0, -28],
  [36, 0],
  [-36, 0],
]

function emapPopupOffsetAsPoint(pop: L.Popup): L.Point {
  const o = pop.options.offset
  if (o == null) return L.point(0, 0)
  if (Array.isArray(o)) return L.point(Number(o[0]), Number(o[1]))
  const pt = o as L.Point
  return L.point(pt.x, pt.y)
}

function nudgeOpenLeafletPopupAwayFromEmapRankTips(map: L.Map, popup?: L.Popup): void {
  const pop =
    popup ?? ((map as unknown as { _popup?: L.Popup })._popup as L.Popup | undefined)
  if (!pop || typeof pop.update !== 'function') return

  const pad = 10
  for (let iter = 0; iter < 30; iter++) {
    const el = pop.getElement() as HTMLElement | null
    if (!el || !el.getClientRects().length) return
    const pr = emapElementClippedToMapFrame(map, el)
    if (!pr) return

    const tipEls: HTMLElement[] = []
    for (const paneName of [emapRankComparisonTipPaneName, 'tooltipPane']) {
      const root = map.getPane(paneName)
      if (!root) continue
      root.querySelectorAll('.leaflet-tooltip.emap-rank-tip').forEach((n) => tipEls.push(n as HTMLElement))
    }
    let overlapping = false
    for (const te of tipEls) {
      const tr = emapElementClippedToMapFrame(map, te as HTMLElement)
      if (tr && emapRankTipRectsOverlap(pr, tr, pad)) {
        overlapping = true
        break
      }
    }
    if (!overlapping) return

    const [dx, dy] = EMAP_POPUP_NUDGE_SPIRAL[iter % EMAP_POPUP_NUDGE_SPIRAL.length]!
    const o = emapPopupOffsetAsPoint(pop)
    pop.options.offset = L.point(o.x + dx, o.y + dy)
    pop.update()
  }
}

function resolveEmapRankTipOverlaps(map: L.Map, tipLayer: L.LayerGroup): void {
  const tips: L.Tooltip[] = []
  tipLayer.eachLayer((ly) => {
    if (ly instanceof L.Tooltip) tips.push(ly)
  })
  if (!tips.length) return

  const obstacles0 = emapWarehouseObstacleRectsForRankTips(map)
  if (tips.length < 2 && !obstacles0.length) return

  const padObstacle = 7
  const padTip = 5
  const maxPass = 56

  for (let pass = 0; pass < maxPass; pass++) {
    const obstacles = emapWarehouseObstacleRectsForRankTips(map)
    const rects = tips.map((tip) => {
      const el = tip.getElement() as HTMLElement | null
      if (!el) return null
      return emapRankTipRectInMapFrame(map, el)
    })

    let bumped = false

    obstaclePass: for (const obs of obstacles) {
      for (let i = 0; i < tips.length; i++) {
        const ri = rects[i]
        if (!ri) continue
        if (!emapRankTipRectsOverlap(ri, obs, padObstacle)) continue
        if (bumpEmapRankTooltip(tips[i]!)) {
          bumped = true
          break obstaclePass
        }
      }
    }

    if (!bumped) {
      for (let i = 0; i < tips.length; i++) {
        for (let j = 0; j < i; j++) {
          const ri = rects[i]
          const rj = rects[j]
          if (!ri || !rj) continue
          if (!emapRankTipRectsOverlap(ri, rj, padTip)) continue

          const mi = emapRankTipLayoutMeta.get(tips[i]!)
          const mj = emapRankTipLayoutMeta.get(tips[j]!)
          if (!mi || !mj) continue

          const moveI = mi.rank > mj.rank || (mi.rank === mj.rank && mi.listIdx > mj.listIdx)
          const targetTip = moveI ? tips[i]! : tips[j]!
          if (bumpEmapRankTooltip(targetTip)) {
            bumped = true
            break
          }
        }
        if (bumped) break
      }
    }

    if (!bumped) break
  }
}

function startEmapRankTipLayoutHandlers(map: L.Map, tipLayer: L.LayerGroup): void {
  stopEmapRankTipLayoutHandlers()
  const run = () => {
    if (!mapRef.value || !topTipLayerRef.value) return
    resolveEmapRankTipOverlaps(mapRef.value, topTipLayerRef.value)
  }
  const schedule = () => {
    if (emapRankTipLayoutDebounceTimer != null) clearTimeout(emapRankTipLayoutDebounceTimer)
    emapRankTipLayoutDebounceTimer = setTimeout(() => {
      emapRankTipLayoutDebounceTimer = null
      run()
    }, 85)
  }
  const onPopupOpen = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
  }
  map.on('zoomend', schedule)
  map.on('moveend', schedule)
  map.on('popupopen', onPopupOpen)
  emapRankTipLayoutOff = () => {
    map.off('zoomend', schedule)
    map.off('moveend', schedule)
    map.off('popupopen', onPopupOpen)
    if (emapRankTipLayoutDebounceTimer != null) {
      clearTimeout(emapRankTipLayoutDebounceTimer)
      emapRankTipLayoutDebounceTimer = null
    }
  }
  requestAnimationFrame(() => {
    resolveEmapRankTipOverlaps(map, tipLayer)
  })
}

function runEmapRankTipOverlapLayoutNow(): void {
  const map = mapRef.value
  const tipLayer = topTipLayerRef.value
  if (!map || !tipLayer) return
  let n = 0
  tipLayer.eachLayer((ly) => {
    if (ly instanceof L.Tooltip) n += 1
  })
  if (!n) return
  resolveEmapRankTipOverlaps(map, tipLayer)
}

function scheduleEmapRankTipOverlapFromUi(): void {
  if (emapRankTipUiLayoutTimer != null) clearTimeout(emapRankTipUiLayoutTimer)
  emapRankTipUiLayoutTimer = setTimeout(() => {
    emapRankTipUiLayoutTimer = null
    runEmapRankTipOverlapLayoutNow()
  }, 75)
}

watch(
  [comparisonModalVisible, comparisonSectionCollapsed, forecastSectionCollapsed, selectedWarehouse],
  () => {
    void nextTick(() => scheduleEmapRankTipOverlapFromUi())
  },
)

function activeRow(row: Record<string, unknown>): boolean {
  const st = row.status ?? row['状态']
  if (st === 0 || st === '0') return false
  const v = row.is_active ?? row.isActive ?? row.active
  if (v === false || v === 0 || v === '0') return false
  return true
}

function toDisplayNum(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function formatNum(n: number): string {
  return toDisplayNum(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 明细行 `冶炼厂循融宝发货`：1 表示该厂在库里开了循融宝 */
function detailRowXunRongBaoOn(row: Record<string, unknown>): boolean {
  const v = row['冶炼厂循融宝发货']
  return v === 1 || v === '1'
}

function detailRowXunRongBaoSurcharge(row: Record<string, unknown>): number | null {
  return pickNumber(row, ['循融宝加价元每吨'])
}

/**
 * 循融宝厂：金额类字段优先读 `含循融宝` 子对象（与接口「含循融宝」口径一致）；子对象缺字段时再回退顶层。
 * 品类名、吨数等仍用外层 `row`。
 */
function comparisonDetailValueSource(row: Record<string, unknown>): Record<string, unknown> {
  if (!detailRowXunRongBaoOn(row)) return row
  const branch = row['含循融宝']
  if (branch != null && typeof branch === 'object' && !Array.isArray(branch)) {
    return branch as Record<string, unknown>
  }
  return row
}

/** 循融宝明细行上 `不含循融宝` 子对象；非循融宝或无对象时为 `null` */
function comparisonDetailExcludedValueSource(row: Record<string, unknown>): Record<string, unknown> | null {
  if (!detailRowXunRongBaoOn(row)) return null
  const branch = row['不含循融宝']
  if (branch != null && typeof branch === 'object' && !Array.isArray(branch)) {
    return branch as Record<string, unknown>
  }
  return null
}

/** 从明细行取数：`含循融宝` 优先，否则顶层（见 comparisonDetailValueSource） */
function pickNumberComparisonDetail(row: Record<string, unknown>, keys: string[]): number | null {
  const src = comparisonDetailValueSource(row)
  const a = pickNumber(src, keys)
  if (a != null && Number.isFinite(a)) return a
  if (src !== row) return pickNumber(row, keys)
  return null
}

/** 比价表「总货款」：优先顶层/含循融宝「总货款」 */
function pickComparisonTotalGoods(row: Record<string, unknown>): number | null {
  const top = pickNumber(row, ['总货款'])
  if (top != null && Number.isFinite(top)) return top
  return pickNumberComparisonDetail(row, [
    '总货款',
    '总价',
    '总回收价',
    'total_recovery',
    '报价金额',
    '物料总价',
    'material_sum',
  ])
}

/** 比价表「总运费」：优先「运费」，再回退「总运费」 */
function pickComparisonFreight(row: Record<string, unknown>): number | null {
  const top = pickNumber(row, ['运费'])
  if (top != null && Number.isFinite(top)) return top
  return pickNumberComparisonDetail(row, ['运费', '总运费', '运费合计'])
}

/** 比价表「净货款」 */
function pickComparisonNetGoods(row: Record<string, unknown>): number | null {
  const top = pickNumber(row, ['净货款'])
  if (top != null && Number.isFinite(top)) return top
  return pickNumberComparisonDetail(row, ['净货款', '利润_基准', '利润_含3%', '利润'])
}

function pickComparisonValuePerTon(row: Record<string, unknown>): number | null {
  const top = pickNumber(row, ['每吨净值'])
  if (top != null && Number.isFinite(top)) return top
  return pickNumberComparisonDetail(row, ['每吨净值'])
}

function pickComparisonGrossProfit(row: Record<string, unknown>): number | null {
  const src = comparisonDetailValueSource(row)
  if (Object.prototype.hasOwnProperty.call(src, '毛利') && src['毛利'] == null) return null
  const v = pickNumber(src, ['毛利', 'gross_profit'])
  if (v != null && Number.isFinite(v)) return v
  if (src !== row) {
    if (Object.prototype.hasOwnProperty.call(row, '毛利') && row['毛利'] == null) return null
    return pickNumber(row, ['毛利', 'gross_profit'])
  }
  return null
}

function pickComparisonGrossProfitPerTon(row: Record<string, unknown>): number | null {
  const src = comparisonDetailValueSource(row)
  if (Object.prototype.hasOwnProperty.call(src, '每吨毛利') && src['每吨毛利'] == null) return null
  const v = pickNumber(src, ['每吨毛利', 'gross_profit_per_ton'])
  if (v != null && Number.isFinite(v)) return v
  if (src !== row) {
    if (Object.prototype.hasOwnProperty.call(row, '每吨毛利') && row['每吨毛利'] == null) return null
    return pickNumber(row, ['每吨毛利', 'gross_profit_per_ton'])
  }
  return null
}

function accumulateComparisonMoneyFromRows(rows: Record<string, unknown>[]): {
  totalGoods: number
  freight: number
  netGoods: number
  grossProfit: number | null
  valuePerTon: number | null
  grossProfitPerTon: number | null
  qtySum: number
} {
  let totalGoods = 0
  let freight = 0
  let netGoods = 0
  let grossProfitSum = 0
  let grossProfitAny = false
  let grossProfitAllNull = true
  let vptNum = 0
  let vptDen = 0
  let gptNum = 0
  let gptDen = 0
  let qtySum = 0
  for (const row of rows) {
    const qty = pickNumber(row, ['吨数', 'quantity', 'qty', '需求吨数', 'weight']) ?? 0
    const qtyEff = Math.max(0, qty)
    qtySum += qtyEff
    const tg = pickComparisonTotalGoods(row)
    const fr = pickComparisonFreight(row)
    const ng = pickComparisonNetGoods(row)
    const gp = pickComparisonGrossProfit(row)
    const vpt = pickComparisonValuePerTon(row)
    const gpt = pickComparisonGrossProfitPerTon(row)
    if (tg != null && Number.isFinite(tg)) totalGoods += tg
    if (fr != null && Number.isFinite(fr)) freight += fr
    if (ng != null && Number.isFinite(ng)) netGoods += ng
    if (gp != null && Number.isFinite(gp)) {
      grossProfitSum += gp
      grossProfitAny = true
      grossProfitAllNull = false
    } else if (!Object.prototype.hasOwnProperty.call(row, '毛利') || row['毛利'] != null) {
      grossProfitAllNull = false
    }
    if (vpt != null && Number.isFinite(vpt) && qtyEff > 0) {
      vptNum += vpt * qtyEff
      vptDen += qtyEff
    }
    if (gpt != null && Number.isFinite(gpt) && qtyEff > 0) {
      gptNum += gpt * qtyEff
      gptDen += qtyEff
    }
  }
  return {
    totalGoods,
    freight,
    netGoods,
    grossProfit: grossProfitAny ? grossProfitSum : grossProfitAllNull ? null : grossProfitSum,
    valuePerTon: vptDen > 0 ? vptNum / vptDen : null,
    grossProfitPerTon: gptDen > 0 ? gptNum / gptDen : null,
    qtySum,
  }
}

/** 与嵌入页 Ut() 一致：明细行取价口径（循融宝厂优先 `含循融宝`） */
function pickDetailUnitPrice(row: Record<string, unknown>, priceMode: 'base' | 'tax3'): number | null {
  if (priceMode === 'tax3') {
    return pickNumberComparisonDetail(row, [
      '含3%税价',
      '3%含税价',
      '含税价',
      '单价',
      '基准价',
      '报价',
      'unit_price',
      '最优价',
      '3pct_price',
    ])
  }
  return pickNumberComparisonDetail(row, [
    '单价',
    '基准价',
    '报价',
    'unit_price',
    '最优价',
    '不含税价',
    'base_price',
  ])
}

/** 仅读 `不含循融宝` 子对象（循融宝厂拆行用） */
function pickDetailUnitPriceExcluded(row: Record<string, unknown>, priceMode: 'base' | 'tax3'): number | null {
  const ex = comparisonDetailExcludedValueSource(row)
  if (!ex) return null
  if (priceMode === 'tax3') {
    return pickNumber(ex, [
      '含3%税价',
      '3%含税价',
      '含税价',
      '单价',
      '基准价',
      '报价',
      'unit_price',
      '最优价',
      '3pct_price',
    ])
  }
  return pickNumber(ex, [
    '单价',
    '基准价',
    '报价',
    'unit_price',
    '最优价',
    '不含税价',
    'base_price',
  ])
}

function formatComparisonCategoryPricesHtml(row: ComparisonRankItem): string {
  const raw = row.categoryPrices
  const entries = raw ? Object.entries(raw) : []
  if (!entries.length) {
    if (row.unitPrice > 0) {
      return `${escapeHtml('均价')}: ¥${Number(toDisplayNum(row.unitPrice)).toLocaleString('zh-CN')}`
    }
    return '—'
  }
  return entries
    .map(([cat, v]) => {
      const label = escapeHtml(String(cat || '').trim() || '—')
      if (v == null || !Number.isFinite(v)) return `${label}: —`
      return `${label}: ¥${Number(v).toLocaleString('zh-CN')}`
    })
    .join('<br>')
}

/** 与嵌入页：总回收价为 0 或无效时显示 — */
function formatComparisonTotalRecoveryCell(n: number): string {
  const i = Number(n)
  if (!Number.isFinite(i) || i === 0) return '—'
  return `¥${i.toLocaleString('zh-CN')}`
}

/** 与嵌入页：总运费保留两位小数 */
function formatComparisonFreightCell(n: number): string {
  return `¥${Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** 明细「单价」「运费单价」：无有效值时单元格留空（不显示 —） */
function formatComparisonOptionalMoneyCell(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return ''
  return `¥${Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function comparisonFreightUnitMoneyCellText(row: ComparisonRankItem): string {
  return formatComparisonOptionalMoneyCell(row.freightUnitPrice)
}

/** 各品种单价：弹层用纯文本（无 HTML） */
function formatComparisonCategoryPricesPlain(row: ComparisonRankItem): string {
  const raw = row.categoryPrices
  const entries = raw ? Object.entries(raw) : []
  if (!entries.length) {
    if (row.unitPrice > 0) {
      return `均价: ¥${Number(toDisplayNum(row.unitPrice)).toLocaleString('zh-CN')}`
    }
    return '—'
  }
  return entries
    .map(([cat, v]) => {
      const label = String(cat || '').trim() || '—'
      if (v == null || !Number.isFinite(v)) return `${label}: —`
      return `${label}: ¥${Number(v).toLocaleString('zh-CN')}`
    })
    .join('\n')
}

function formatComparisonNetProfitCell(row: ComparisonRankItem): string {
  return `¥${toDisplayNum(row.netProfit).toLocaleString('zh-CN')}`
}

function formatComparisonGrossProfitCell(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `¥${toDisplayNum(n).toLocaleString('zh-CN')}`
}

function formatValuePerTonCell(row: ComparisonRankItem): string {
  if (row.valuePerTon != null && Number.isFinite(row.valuePerTon)) {
    return `¥${toDisplayNum(row.valuePerTon).toLocaleString('zh-CN')}`
  }
  if (!row.qtySum || row.qtySum <= 0 || !Number.isFinite(row.netProfit)) return '—'
  const perTon = row.netProfit / row.qtySum
  return `¥${toDisplayNum(perTon).toLocaleString('zh-CN')}`
}

function comparisonXunRongBaoTitle(row: ComparisonRankItem): string {
  if (row.xunRongBaoExcludedPricing) {
    return '不含循融宝口径；运费与含循融宝行一致。'
  }
  const n = row.xunRongBaoSurchargeYuanPerTon
  const suffix = '列表金额与排序为含循融宝口径。'
  if (n != null && Number.isFinite(n)) {
    return `${n} 元/吨（在不含税基准上加价后重算含税列）；${suffix}`
  }
  return `该冶炼厂已开循融宝。${suffix}`
}

function detailRowsForSmelterName(
  smelter: string,
  detailRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const s = smelter.trim()
  if (!s) return []
  return detailRows.filter((row) => {
    const name = pickStr(row, [
      '冶炼厂',
      'smelter',
      'smelter_name',
      '冶炼厂名',
      'factory_name',
      'name',
    ])
    if (!name) return false
    return name === s || name.includes(s) || s.includes(name)
  })
}

/** 循融宝厂：在「含循融宝」行后追加一行「不含循融宝」聚合；最后统一按利润重排 */
function buildExcludedComparisonRankFromDetails(
  base: ComparisonRankItem,
  detailRows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem | null {
  const rows = detailRowsForSmelterName(base.smelter, detailRows)
  if (!rows.length) return null
  if (!rows.some(detailRowXunRongBaoOn)) return null
  if (!rows.some((row) => comparisonDetailExcludedValueSource(row))) return null

  const categoryPrices: Record<string, number | null> = {}
  let totalRecovery = 0
  let totalFreight = 0
  let netGoods = 0
  let grossProfitSum = 0
  let grossProfitAny = false
  let grossProfitAllNull = true
  let vptNum = 0
  let vptDen = 0
  let gptNum = 0
  let gptDen = 0
  let qtySum = 0
  let unitNum = 0
  let unitDen = 0
  let strictLineNum = 0
  let strictLineDen = 0
  let strictFpuNum = 0
  let strictFpuDen = 0

  for (const row of rows) {
    if (!detailRowXunRongBaoOn(row)) continue
    const ex = comparisonDetailExcludedValueSource(row)
    if (!ex) continue
    const cat = pickStr(row, ['品类', 'category', '品种', '产品品种', 'category_name']) || '—'
    const upDetail = pickDetailUnitPriceExcluded(row, priceMode)
    categoryPrices[cat] = upDetail != null && Number.isFinite(upDetail) ? upDetail : null
    const qty = pickNumber(row, ['吨数', 'quantity', 'qty', '需求吨数', 'weight']) ?? 0
    const qtyEff = Math.max(0, qty)
    const up = pickNumber(ex, ['单价', '基准价', '含3%税价', '报价', 'unit_price', '最优价'])
    const tot =
      pickNumber(ex, ['总货款']) ??
      pickNumber(ex, ['总回收价', 'total_recovery']) ??
      pickNumber(ex, ['总价', '报价金额', '物料总价', 'material_sum'])
    const tf = pickNumber(ex, ['运费', '总运费', '运费合计'])
    const ng = pickNumber(ex, ['净货款', '利润_基准', '利润_含3%', '利润'])
    const gp = pickNumber(ex, ['毛利'])
    const vpt = pickNumber(ex, ['每吨净值'])
    const gpt = pickNumber(ex, ['每吨毛利'])
    if (tot != null && Number.isFinite(tot)) totalRecovery += tot
    else if (up != null && qty > 0) totalRecovery += up * qty
    if (tf != null && Number.isFinite(tf)) totalFreight += tf
    if (ng != null && Number.isFinite(ng)) netGoods += ng
    if (gp != null && Number.isFinite(gp)) {
      grossProfitSum += gp
      grossProfitAny = true
      grossProfitAllNull = false
    } else if (!Object.prototype.hasOwnProperty.call(ex, '毛利') || ex['毛利'] != null) {
      grossProfitAllNull = false
    }
    if (vpt != null && Number.isFinite(vpt) && qtyEff > 0) {
      vptNum += vpt * qtyEff
      vptDen += qtyEff
    }
    if (gpt != null && Number.isFinite(gpt) && qtyEff > 0) {
      gptNum += gpt * qtyEff
      gptDen += qtyEff
    }
    qtySum += qtyEff
    if (up != null && qty > 0) {
      unitNum += up * qty
      unitDen += qty
    }
    const strictLine = pickNumber(ex, ['单价'])
    if (strictLine != null && Number.isFinite(strictLine) && qtyEff > 0) {
      strictLineNum += strictLine * qtyEff
      strictLineDen += qtyEff
    }
    const strictFpu = pickNumber(ex, ['运费单价', 'freight_per_ton'])
    if (strictFpu != null && Number.isFinite(strictFpu) && qtyEff > 0) {
      strictFpuNum += strictFpu * qtyEff
      strictFpuDen += qtyEff
    }
  }

  if (qtySum <= 0 && totalRecovery <= 0 && strictLineDen <= 0) return null

  let netProfit = netGoods > 0 ? netGoods : totalRecovery - totalFreight
  if (netGoods <= 0) {
    const firstExRow = rows.find((r) => detailRowXunRongBaoOn(r) && comparisonDetailExcludedValueSource(r))
    if (firstExRow) {
      const ex0 = comparisonDetailExcludedValueSource(firstExRow)
      if (ex0) {
        const p =
          priceMode === 'tax3'
            ? pickNumber(ex0, ['利润_含3%', '利润', '净货款'])
            : pickNumber(ex0, ['利润_基准', '利润', '净货款'])
        if (p != null && Number.isFinite(p)) netProfit = p
      }
    }
  }

  const unitPrice =
    unitDen > 0
      ? unitNum / unitDen
      : (() => {
          const r0 = rows.find((r) => detailRowXunRongBaoOn(r) && comparisonDetailExcludedValueSource(r))
          const ex = r0 ? comparisonDetailExcludedValueSource(r0) : null
          return ex ? pickNumber(ex, ['单价', '基准价', '报价']) ?? 0 : 0
        })()

  return {
    rank: base.rank,
    smelter: base.smelter,
    unitPrice: toDisplayNum(unitPrice),
    netProfit: toDisplayNum(netProfit),
    totalRecovery: toDisplayNum(totalRecovery),
    totalFreight: toDisplayNum(totalFreight),
    qtySum: toDisplayNum(qtySum),
    valuePerTon: vptDen > 0 ? toDisplayNum(vptNum / vptDen) : null,
    grossProfit: grossProfitAny ? toDisplayNum(grossProfitSum) : grossProfitAllNull ? null : toDisplayNum(grossProfitSum),
    grossProfitPerTon: gptDen > 0 ? toDisplayNum(gptNum / gptDen) : null,
    categoryPrices,
    lineUnitPrice: strictLineDen > 0 ? toDisplayNum(strictLineNum / strictLineDen) : undefined,
    freightUnitPrice: strictFpuDen > 0 ? toDisplayNum(strictFpuNum / strictFpuDen) : undefined,
    xunRongBao: false,
    xunRongBaoExcludedPricing: true,
  }
}

function expandComparisonRanksWithXunRongBaoExcludedRows(
  ranks: ComparisonRankItem[],
  detailRows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  if (!detailRows.length) return ranks
  const out: ComparisonRankItem[] = []
  for (const r of ranks) {
    if (r.xunRongBaoExcludedPricing) {
      out.push(r)
      continue
    }
    const exRow = buildExcludedComparisonRankFromDetails(r, detailRows, priceMode)
    if (exRow) {
      out.push(r.xunRongBao ? r : { ...r, xunRongBao: true })
      out.push(exRow)
      continue
    }
    out.push(r)
  }
  return out
}

/** 比价表：按利润降序重编排名（含/不含循融宝拆行参与同一排序） */
function rerankComparisonByProfitDesc(items: ComparisonRankItem[]): ComparisonRankItem[] {
  const sorted = [...items].sort((a, b) => {
    if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit
    const aw = a.xunRongBao ? 1 : 0
    const bw = b.xunRongBao ? 1 : 0
    if (bw !== aw) return bw - aw
    return a.rank - b.rank
  })
  return sorted.map((x, i) => ({ ...x, rank: i + 1 }))
}

function openComparisonCellDetail(label: string, text: string) {
  const t = String(text ?? '').trim()
  if (!t) return
  comparisonCellDetail.value = { label, text: String(text) }
}

function closeComparisonCellDetail() {
  comparisonCellDetail.value = null
}

function clearMapComparisonGraphicsOnly() {
  stopEmapRankTipLayoutHandlers()
  cancelFlowOverlayAnimations()
  stopFlowAnimations()
  flowLayerRef.value?.clearLayers()
  topTipLayerRef.value?.clearLayers()
}

function clearComparisonOverlays() {
  warehouseDistanceMonitorOn.value = false
  warehouseDistanceTableRows.value = []
  clearMapComparisonGraphicsOnly()
  comparisonRanks.value = []
  lastComparisonSortKey.value = ''
  compareError.value = ''
  comparisonModalVisible.value = false
  comparisonCellDetail.value = null
}

function stopFlowAnimations() {
  while (flowAnimTimerIds.length) {
    const id = flowAnimTimerIds.pop()
    if (id != null) window.clearInterval(id)
  }
}

function cancelFlowOverlayAnimations() {
  for (const fn of flowOverlayCleanups) {
    try {
      fn()
    } catch {
      /* noop */
    }
  }
  flowOverlayCleanups.length = 0
}

function getSelectedCategoryPayload(): { ids: number[]; totalTons: number; tonsByCategory: Array<{ 品类id: number; 吨数: number }> } {
  const ids: number[] = []
  let totalTons = 0
  const tonsByCategory: Array<{ 品类id: number; 吨数: number }> = []
  for (const c of categories.value) {
    const pref = categoryPrefs[c.id]
    if (!pref?.selected) continue
    const t = parseFloat(String(pref.tons ?? '').replace(/,/g, ''))
    if (Number.isFinite(t) && t > 0) {
      ids.push(c.id)
      totalTons += t
      tonsByCategory.push({ 品类id: c.id, 吨数: t })
    }
  }
  return { ids, totalTons, tonsByCategory }
}

function confirmComparisonConditions() {
  compareError.value = ''
  const { ids, totalTons } = getSelectedCategoryPayload()
  if (!ids.length || totalTons <= 0) {
    compareError.value = '请至少勾选一个品类并填写大于 0 的吨数（单位：吨）'
    return
  }
  confirmedCategoryIds.value = [...ids]
  confirmedTotalTons.value = totalTons
  confirmedPriceMode.value = comparisonType.value
  toolbarCollapsed.value = true
  try {
    sessionStorage.setItem(EMAP_TOOLBAR_COLLAPSED_KEY, '1')
  } catch {
    /* 隐私模式等 */
  }

  // 已选中仓库且正在展示比价时，确认参数后自动重新比价
  const wh = selectedWarehouse.value
  if (wh && wh.kind === 'warehouse' && (comparisonModalVisible.value || comparisonRanks.value.length > 0)) {
    void runComparisonForWarehouse(wh)
  }
}

/** 与嵌入页智能比价相同字段（中文键名） */
function buildSmartComparisonBody(
  warehouseId: number,
  smelterIds: number[],
  tonsByCategory: Array<{ 品类id: number; 吨数: number }>,
  priceMode: 'base' | 'tax3',
): Record<string, unknown> {
  const isTax3 = priceMode === 'tax3'
  return {
    选中仓库id列表: [warehouseId],
    冶炼厂id列表: smelterIds,
    品类id列表: tonsByCategory.map((x) => x.品类id),
    品类吨数列表: tonsByCategory,
    price_type: isTax3 ? '3pct' : null,
    运费计价方式: 'per_ton',
    每车吨数: 35,
    最优价计税口径列表: isTax3 ? ['3pct'] : ['base'],
    最优价排序口径: isTax3 ? '3pct' : 'base',
  }
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/** 二次贝塞尔曲线点列（控制点垂直于弦，略鼓起的弧线） */
function quadraticBezierLatLng(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  segments: number,
  bend: number,
): L.LatLngTuple[] {
  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2
  const dx = lat2 - lat1
  const dy = lng2 - lng1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = (-dy / len) * bend * len * 0.25
  const ny = (dx / len) * bend * len * 0.25
  const cx = midLat + nx
  const cy = midLng + ny
  const out: L.LatLngTuple[] = []
  const n = Math.max(8, Math.floor(segments))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const omt = 1 - t
    const lat = omt * omt * lat1 + 2 * omt * t * cx + t * t * lat2
    const lng = omt * omt * lng1 + 2 * omt * t * cy + t * t * lng2
    out.push([lat, lng])
  }
  return out
}

/**
 * 同一库房出发的多条流向方位接近时会叠在一起；按在列表中的次序分配正负与强弱不同的弧度，
 * 使贝塞尔鼓包方向交替、弯曲量拉开（bend 越大弧线越鼓）。
 */
function comparisonFlowBend(listIdx: number, totalFlows: number): number {
  if (totalFlows <= 1) return 0.52
  const u = listIdx / (totalFlows - 1)
  const magnitude = 0.3 + u * 0.85
  const sign = listIdx % 2 === 0 ? 1 : -1
  return sign * magnitude
}

type ComparisonFlowPalette = {
  base: string
  main: string
  baseClass: string
  lineClass: string
  moverInnerClass: string
  baseWeight: number
  dashWeight: number
  opacity: number
  showMover: boolean
  dashArray: string
}

function comparisonFlowPalette(rank: number): ComparisonFlowPalette {
  const top3 = {
    baseWeight: 6,
    dashWeight: 4,
    opacity: 1,
    showMover: true,
    dashArray: '12 38',
  }
  if (rank <= 1) {
    return {
      base: 'rgba(5, 150, 105, 0.45)',
      main: '#10b981',
      baseClass: 'emap-flow-line-base emap-flow-line-base--best',
      lineClass: 'emap-flow-line emap-flow-line--best',
      moverInnerClass: 'emap-flow-mover emap-flow-mover--best',
      ...top3,
    }
  }
  if (rank === 2) {
    return {
      base: 'rgba(234, 88, 12, 0.45)',
      main: '#f97316',
      baseClass: 'emap-flow-line-base emap-flow-line-base--orange',
      lineClass: 'emap-flow-line emap-flow-line--orange',
      moverInnerClass: 'emap-flow-mover emap-flow-mover--orange',
      ...top3,
    }
  }
  if (rank === 3) {
    return {
      base: 'rgba(59, 130, 246, 0.4)',
      main: '#3b82f6',
      baseClass: 'emap-flow-line-base emap-flow-line-base--third',
      lineClass: 'emap-flow-line emap-flow-line--third',
      moverInnerClass: 'emap-flow-mover emap-flow-mover--third',
      ...top3,
    }
  }
  return {
    base: 'rgba(100, 116, 139, 0.48)',
    main: 'rgba(203, 213, 225, 0.88)',
    baseClass: 'emap-flow-line-base emap-flow-line-base--muted',
    lineClass: 'emap-flow-line emap-flow-line--muted',
    moverInnerClass: 'emap-flow-mover emap-flow-mover--muted',
    baseWeight: 4,
    dashWeight: 2.6,
    opacity: 0.92,
    showMover: false,
    dashArray: '10 22',
  }
}

/** 沿折线移动的箭头组（▶▶▶），随路径切线转向 */
function attachFlowMoverAlongCurve(
  flowLayer: L.LayerGroup,
  curve: L.LatLngTuple[],
  durationMs: number,
  moverInnerClass: string,
): void {
  if (curve.length < 2) return
  const state = { cancelled: false, raf: 0 }
  const marker = L.marker(curve[0], {
    icon: L.divIcon({
      className: 'emap-flow-mover-wrap',
      html: `<div class="${moverInnerClass}" aria-hidden="true"><span class="emap-flow-arrow-triple"><span>▶</span><span>▶</span><span>▶</span></span></div>`,
      iconSize: [36, 20],
      iconAnchor: [18, 10],
    }),
    interactive: false,
    pane: emapComparisonFlowPaneName,
  }).addTo(flowLayer)
  let start = performance.now()
  const step = () => {
    if (state.cancelled) return
    const now = performance.now()
    const u = ((now - start) % durationMs) / durationMs
    const f = u * (curve.length - 1)
    const idx = Math.min(Math.floor(f), curve.length - 2)
    const localT = f - idx
    const p0 = curve[idx]!
    const p1 = curve[idx + 1]!
    const lat = p0[0] + (p1[0] - p0[0]) * localT
    const lng = p0[1] + (p1[1] - p0[1]) * localT
    marker.setLatLng([lat, lng])
    const br = bearingDeg(p0[0], p0[1], p1[0], p1[1])
    const tri = marker.getElement()?.querySelector('.emap-flow-arrow-triple') as HTMLElement | null
    /* translateY：三角字形视觉重心略低于几何中心，与粗线对齐 */
    if (tri) tri.style.transform = `translateY(-1.5px) rotate(${br - 90}deg)`
    state.raf = requestAnimationFrame(step)
  }
  state.raf = requestAnimationFrame(step)
  flowOverlayCleanups.push(() => {
    state.cancelled = true
    cancelAnimationFrame(state.raf)
    try {
      flowLayer.removeLayer(marker)
    } catch {
      /* 可能已被 clearLayers */
    }
  })
}

/** 冶炼厂利润排行：按比价类型取后端已算好的利润 */
function pickProfitFromSmelterRankRow(
  row: Record<string, unknown>,
  priceMode: 'base' | 'tax3',
): number {
  const nested = row['最优价口径合计']
  const nestObj =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : null
  if (priceMode === 'tax3') {
    const n =
      pickNumber(row, ['利润_含3%合计', '利润_含3%']) ??
      (nestObj ? pickNumber(nestObj, ['3pct', 'tax3']) : null) ??
      pickNumber(row, ['利润'])
    return n ?? 0
  }
  const n =
    pickNumber(row, ['利润_基准合计', '利润_基准']) ??
    (nestObj ? pickNumber(nestObj, ['base']) : null) ??
    pickNumber(row, ['利润'])
  return n ?? 0
}

function parseSmelterProfitRankArray(
  arr: unknown,
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  if (!Array.isArray(arr)) return []
  const out: ComparisonRankItem[] = []
  let fallback = 0
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const smelter = pickStr(row, [
      '冶炼厂',
      'smelter',
      'smelter_name',
      '冶炼厂名',
      'factory_name',
      'name',
      '厂名',
    ])
    if (!smelter) continue
    fallback += 1
    const rank = pickNumber(row, ['rank', '名次', '排序', '排行', '排名']) ?? fallback
    const netProfit =
      pickComparisonNetGoods(row) ??
      pickProfitFromSmelterRankRow(row, priceMode)
    const totalRecovery = pickComparisonTotalGoods(row) ?? 0
    const totalFreight = pickComparisonFreight(row) ?? 0
    const qtySum = pickNumber(row, ['吨数', 'quantity', 'qtySum', 'qty', '需求吨数']) ?? 0
    const unitPriceRaw = pickNumber(row, [
      '单价',
      '回收单价',
      'unit_price',
      '最优价',
      'price',
      '基准价',
      '3%含税价',
    ])
    const unitPrice = unitPriceRaw != null ? unitPriceRaw : qtySum > 0 ? totalRecovery / qtySum : 0
    out.push({
      rank,
      smelter,
      unitPrice: toDisplayNum(unitPrice),
      netProfit: toDisplayNum(netProfit ?? 0),
      totalRecovery: toDisplayNum(totalRecovery),
      totalFreight: toDisplayNum(totalFreight),
      qtySum: toDisplayNum(qtySum),
      valuePerTon:
        pickComparisonValuePerTon(row) != null
          ? toDisplayNum(pickComparisonValuePerTon(row)!)
          : null,
      grossProfit:
        pickComparisonGrossProfit(row) != null
          ? toDisplayNum(pickComparisonGrossProfit(row)!)
          : pickComparisonGrossProfit(row),
      grossProfitPerTon:
        pickComparisonGrossProfitPerTon(row) != null
          ? toDisplayNum(pickComparisonGrossProfitPerTon(row)!)
          : pickComparisonGrossProfitPerTon(row),
    })
  }
  return out.sort((a, b) => a.rank - b.rank)
}

/** 用接口 data 明细行的单价/总价/总运费按冶炼厂合并到排行行 */
function mergeComparisonRanksWithDetailRows(
  ranks: ComparisonRankItem[],
  detailRows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  if (!detailRows.length) return ranks
  return ranks.map((r) => {
    const rows = detailRows.filter((row) => {
      const name = pickStr(row, [
        '冶炼厂',
        'smelter',
        'smelter_name',
        '冶炼厂名',
        'factory_name',
        'name',
      ])
      if (!name) return false
      return name === r.smelter || name.includes(r.smelter) || r.smelter.includes(name)
    })
    if (!rows.length) return r
    const categoryPrices: Record<string, number | null> = {}
    let unitNum = 0
    let unitDen = 0
    let strictLineNum = 0
    let strictLineDen = 0
    let strictFpuNum = 0
    let strictFpuDen = 0
    let xunRongBao = false
    let xunRongBaoSurchargeYuanPerTon: number | null = null
    for (const row of rows) {
      const cat = pickStr(row, ['品类', 'category', '品种', '产品品种', 'category_name']) || '—'
      const upDetail = pickDetailUnitPrice(row, priceMode)
      categoryPrices[cat] = upDetail != null && Number.isFinite(upDetail) ? upDetail : null
      const qty = pickNumber(row, ['吨数', 'quantity', 'qty', '需求吨数', 'weight']) ?? 0
      const qtyEff = Math.max(0, qty)
      const up = pickNumberComparisonDetail(row, [
        '单价',
        '基准价',
        '含3%税价',
        '报价',
        'unit_price',
        '最优价',
      ])
      if (up != null && qty > 0) {
        unitNum += up * qty
        unitDen += qty
      }
      const strictLine = pickNumberComparisonDetail(row, ['单价'])
      if (strictLine != null && Number.isFinite(strictLine) && qtyEff > 0) {
        strictLineNum += strictLine * qtyEff
        strictLineDen += qtyEff
      }
      const strictFpu = pickNumberComparisonDetail(row, ['运费单价', 'freight_per_ton'])
      if (strictFpu != null && Number.isFinite(strictFpu) && qtyEff > 0) {
        strictFpuNum += strictFpu * qtyEff
        strictFpuDen += qtyEff
      }
      if (detailRowXunRongBaoOn(row)) {
        xunRongBao = true
        const s = detailRowXunRongBaoSurcharge(row)
        if (xunRongBaoSurchargeYuanPerTon == null && s != null && Number.isFinite(s)) {
          xunRongBaoSurchargeYuanPerTon = s
        }
      }
    }
    const money = accumulateComparisonMoneyFromRows(rows)
    const unitPrice =
      unitDen > 0
        ? unitNum / unitDen
        : (pickNumberComparisonDetail(rows[0] as Record<string, unknown>, ['单价', '基准价', '报价']) ?? 0)
    const netProfit =
      money.netGoods > 0 ? money.netGoods : money.totalGoods - money.freight > 0 ? money.totalGoods - money.freight : r.netProfit
    return {
      ...r,
      categoryPrices,
      unitPrice: toDisplayNum(unitPrice),
      totalRecovery: toDisplayNum(money.totalGoods > 0 ? money.totalGoods : r.totalRecovery),
      totalFreight: toDisplayNum(money.freight > 0 ? money.freight : r.totalFreight),
      netProfit: toDisplayNum(netProfit),
      qtySum: toDisplayNum(money.qtySum > 0 ? money.qtySum : r.qtySum),
      valuePerTon: money.valuePerTon != null ? toDisplayNum(money.valuePerTon) : null,
      grossProfit:
        money.grossProfit != null && Number.isFinite(money.grossProfit)
          ? toDisplayNum(money.grossProfit)
          : money.grossProfit,
      grossProfitPerTon:
        money.grossProfitPerTon != null && Number.isFinite(money.grossProfitPerTon)
          ? toDisplayNum(money.grossProfitPerTon)
          : money.grossProfitPerTon,
      lineUnitPrice: strictLineDen > 0 ? toDisplayNum(strictLineNum / strictLineDen) : undefined,
      freightUnitPrice: strictFpuDen > 0 ? toDisplayNum(strictFpuNum / strictFpuDen) : undefined,
      ...(xunRongBao ? { xunRongBao: true, xunRongBaoSurchargeYuanPerTon } : {}),
    }
  })
}

function pickComparisonPayload(raw: Record<string, unknown>): Record<string, unknown> | null {
  const data = raw['data']
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return null
}

function walkObjectArraysDeep(input: unknown, depth = 0): Record<string, unknown>[][] {
  if (depth > 4 || input == null) return []
  const out: Record<string, unknown>[][] = []
  if (Array.isArray(input)) {
    const rows = input.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    if (rows.length) out.push(rows)
    return out
  }
  if (typeof input !== 'object') return out
  const obj = input as Record<string, unknown>
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      const rows = v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      if (rows.length) out.push(rows)
      continue
    }
    if (v && typeof v === 'object') out.push(...walkObjectArraysDeep(v, depth + 1))
  }
  return out
}

function parseRankRowsLoose(
  rows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  const out: ComparisonRankItem[] = []
  let fallback = 0
  for (const row of rows) {
    const smelter = pickStr(row, [
      '冶炼厂名称',
      '冶炼厂',
      '冶炼厂名',
      'smelter_name',
      'smelter',
      'factory_name',
      'name',
    ])
    const netProfitRaw =
      pickComparisonNetGoods(row) ??
      (priceMode === 'tax3'
        ? (pickNumberComparisonDetail(row, ['利润_含3%', '利润']) ?? 0)
        : (pickNumberComparisonDetail(row, ['利润_基准', '利润']) ?? 0))
    const hasProfitLike =
      pickComparisonNetGoods(row) != null ||
      pickNumberComparisonDetail(row, ['利润', '利润_基准', '利润_含3%', '净收益', 'profit']) != null
    if (!smelter || !hasProfitLike) continue
    fallback += 1
    const rank = pickNumber(row, ['排名', '排行', '排序', 'rank', '名次']) ?? fallback
    const netProfit = netProfitRaw
    const totalRecovery = pickComparisonTotalGoods(row) ?? 0
    const totalFreight = pickComparisonFreight(row) ?? 0
    const qtySum = pickNumber(row, ['吨数', 'quantity', 'qty', '需求吨数']) ?? 0
    const unitPriceRaw = pickNumberComparisonDetail(row, [
      '单价',
      '回收单价',
      'unit_price',
      '最优价',
      'price',
      '基准价',
      '3%含税价',
    ])
    const unitPrice = unitPriceRaw != null ? unitPriceRaw : qtySum > 0 ? totalRecovery / qtySum : 0
    const strictLineUp = pickNumberComparisonDetail(row, ['单价'])
    const strictFpu = pickNumberComparisonDetail(row, ['运费单价', 'freight_per_ton'])
    out.push({
      rank,
      smelter,
      unitPrice: toDisplayNum(unitPrice),
      netProfit: toDisplayNum(netProfit),
      totalRecovery: toDisplayNum(totalRecovery),
      totalFreight: toDisplayNum(totalFreight),
      qtySum: toDisplayNum(qtySum),
      lineUnitPrice:
        strictLineUp != null && Number.isFinite(strictLineUp) ? toDisplayNum(strictLineUp) : undefined,
      freightUnitPrice:
        strictFpu != null && Number.isFinite(strictFpu) ? toDisplayNum(strictFpu) : undefined,
      valuePerTon:
        pickComparisonValuePerTon(row) != null
          ? toDisplayNum(pickComparisonValuePerTon(row)!)
          : null,
      grossProfit:
        pickComparisonGrossProfit(row) != null
          ? toDisplayNum(pickComparisonGrossProfit(row)!)
          : pickComparisonGrossProfit(row),
      grossProfitPerTon:
        pickComparisonGrossProfitPerTon(row) != null
          ? toDisplayNum(pickComparisonGrossProfitPerTon(row)!)
          : pickComparisonGrossProfitPerTon(row),
    })
  }
  return out.sort((a, b) => a.rank - b.rank)
}

function rankingsFromComparisonResponse(
  raw: Record<string, unknown>,
  detailRows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  const payload = pickComparisonPayload(raw)
  const fromApi = parseSmelterProfitRankArray(
    raw['冶炼厂利润排行'] ?? payload?.['冶炼厂利润排行'] ?? payload?.['smelter_profit_rank'],
    priceMode,
  )
  if (fromApi.length) {
    const mergedTop = mergeComparisonRanksWithDetailRows(fromApi, detailRows, priceMode)
    if (!detailRows.length) return rerankComparisonByProfitDesc(mergedTop)
    // 有些接口只返回前几名排行；其余冶炼厂从明细聚合补齐，便于“展示全部比价线”绘制全量流向
    const allFromDetail = aggregateComparisonRows(detailRows, priceMode)
    const existed = new Set(mergedTop.map((x) => x.smelter.trim()))
    const extras = allFromDetail.filter((x) => !existed.has(x.smelter.trim()))
    const combined = [...mergedTop, ...extras]
    return rerankComparisonByProfitDesc(
      expandComparisonRanksWithXunRongBaoExcludedRows(combined, detailRows, priceMode),
    )
  }
  for (const rows of walkObjectArraysDeep(payload ?? raw)) {
    const parsed = parseRankRowsLoose(rows, priceMode)
    if (parsed.length) {
      const merged = mergeComparisonRanksWithDetailRows(parsed, detailRows, priceMode)
      return rerankComparisonByProfitDesc(
        expandComparisonRanksWithXunRongBaoExcludedRows(merged, detailRows, priceMode),
      )
    }
  }
  return rerankComparisonByProfitDesc(
    expandComparisonRanksWithXunRongBaoExcludedRows(
      aggregateComparisonRows(detailRows, priceMode),
      detailRows,
      priceMode,
    ),
  )
}

function aggregateComparisonRows(
  rows: Record<string, unknown>[],
  priceMode: 'base' | 'tax3',
): ComparisonRankItem[] {
  const grouped = new Map<
    string,
    {
      smelter: string
      materialSum: number
      freightSum: number
      freightCount: number
      totalFreightSum: number
      qtySum: number
      categoryPrices: Record<string, number | null>
      strictLineNum: number
      strictLineDen: number
      strictFpuNum: number
      strictFpuDen: number
      xunRongBao: boolean
      xunRongBaoSurchargeYuanPerTon: number | null
    }
  >()
  for (const row of rows) {
    const smelter =
      pickStr(row, ['smelter_name', '冶炼厂', '冶炼厂名', 'smelter', 'factory_name']) || '未知冶炼厂'
    const unitPrice =
      pickNumberComparisonDetail(row, [
        'unit_price',
        '单价',
        '最优价',
        '价格',
        'price',
        'base_price',
        '不含税价',
        '3pct_price',
      ]) ?? 0
    const freight = pickNumberComparisonDetail(row, ['freight_per_ton', '运费单价', 'freight', '运费每吨']) ?? 0
    const lineTotalFreight = pickComparisonFreight(row)
    const qty = pickNumber(row, ['quantity', '吨数', '数量', 'qty', 'weight', '需求吨数']) ?? 1
    const key = smelter
    if (!grouped.has(key)) {
      grouped.set(key, {
        smelter,
        materialSum: 0,
        freightSum: 0,
        freightCount: 0,
        totalFreightSum: 0,
        qtySum: 0,
        categoryPrices: {},
        strictLineNum: 0,
        strictLineDen: 0,
        strictFpuNum: 0,
        strictFpuDen: 0,
        xunRongBao: false,
        xunRongBaoSurchargeYuanPerTon: null,
      })
    }
    const g = grouped.get(key)!
    const cat = pickStr(row, ['品类', 'category', '品种', '产品品种', 'category_name']) || '—'
    const upLine = pickDetailUnitPrice(row, priceMode)
    g.categoryPrices[cat] = upLine != null && Number.isFinite(upLine) ? upLine : null
    const qtyEff = Math.max(0, qty)
    const lineRecovery = pickComparisonTotalGoods(row)
    if (lineRecovery != null && Number.isFinite(lineRecovery)) g.materialSum += lineRecovery
    else g.materialSum += unitPrice * qtyEff
    g.freightSum += freight
    g.freightCount += 1
    if (lineTotalFreight != null && Number.isFinite(lineTotalFreight)) g.totalFreightSum += lineTotalFreight
    g.qtySum += qtyEff
    const strictLine = pickNumberComparisonDetail(row, ['单价'])
    if (strictLine != null && Number.isFinite(strictLine) && qtyEff > 0) {
      g.strictLineNum += strictLine * qtyEff
      g.strictLineDen += qtyEff
    }
    const strictFpuOnly = pickNumberComparisonDetail(row, ['运费单价', 'freight_per_ton'])
    if (strictFpuOnly != null && Number.isFinite(strictFpuOnly) && qtyEff > 0) {
      g.strictFpuNum += strictFpuOnly * qtyEff
      g.strictFpuDen += qtyEff
    }
    if (detailRowXunRongBaoOn(row)) {
      g.xunRongBao = true
      const s = detailRowXunRongBaoSurcharge(row)
      if (g.xunRongBaoSurchargeYuanPerTon == null && s != null && Number.isFinite(s)) {
        g.xunRongBaoSurchargeYuanPerTon = s
      }
    }
  }
  return [...grouped.values()]
    .map((g) => {
      const smelterRows = rows.filter(
        (r) =>
          (pickStr(r, ['smelter_name', '冶炼厂', '冶炼厂名', 'smelter', 'factory_name']) || '未知冶炼厂') ===
          g.smelter,
      )
      const money = accumulateComparisonMoneyFromRows(smelterRows)
      const avgFreightPerTon = g.freightCount > 0 ? g.freightSum / g.freightCount : 0
      const totalFreightFromLine =
        money.freight > 0 ? money.freight : g.totalFreightSum > 0 ? g.totalFreightSum : avgFreightPerTon * g.qtySum
      const totalGoods = money.totalGoods > 0 ? money.totalGoods : g.materialSum
      let netProfit =
        money.netGoods > 0 ? money.netGoods : totalGoods - totalFreightFromLine
      if (money.netGoods <= 0) {
        const sample = smelterRows[0]
        if (sample) {
          const backendProfit = pickComparisonNetGoods(sample)
          if (backendProfit != null && Number.isFinite(backendProfit)) netProfit = backendProfit
        }
      }
      const unitPrice = g.qtySum > 0 ? totalGoods / g.qtySum : 0
      return {
        smelter: g.smelter,
        unitPrice: toDisplayNum(unitPrice),
        netProfit: toDisplayNum(netProfit),
        totalRecovery: toDisplayNum(totalGoods),
        totalFreight: toDisplayNum(totalFreightFromLine),
        qtySum: toDisplayNum(g.qtySum),
        valuePerTon: money.valuePerTon != null ? toDisplayNum(money.valuePerTon) : null,
        grossProfit:
          money.grossProfit != null && Number.isFinite(money.grossProfit)
            ? toDisplayNum(money.grossProfit)
            : money.grossProfit,
        grossProfitPerTon:
          money.grossProfitPerTon != null && Number.isFinite(money.grossProfitPerTon)
            ? toDisplayNum(money.grossProfitPerTon)
            : money.grossProfitPerTon,
        categoryPrices: g.categoryPrices,
        lineUnitPrice: g.strictLineDen > 0 ? toDisplayNum(g.strictLineNum / g.strictLineDen) : undefined,
        freightUnitPrice: g.strictFpuDen > 0 ? toDisplayNum(g.strictFpuNum / g.strictFpuDen) : undefined,
        ...(g.xunRongBao
          ? { xunRongBao: true as const, xunRongBaoSurchargeYuanPerTon: g.xunRongBaoSurchargeYuanPerTon }
          : {}),
      }
    })
    .sort((a, b) => b.netProfit - a.netProfit)
    .map((x, idx) => ({ ...x, rank: idx + 1 }))
}

function findSmelterPoint(name: string): MapPoint | null {
  const exact = allSmelterPoints.value.find((x) => x.title === name)
  if (exact) return exact
  const loose = allSmelterPoints.value.find(
    (x) => x.title.includes(name) || name.includes(x.title),
  )
  return loose ?? null
}

function findWarehousePointByNumericId(wid: number): MapPoint | null {
  for (const p of allWarehousePoints.value) {
    const id = warehouseNumericIdFromRow(p.raw)
    if (id != null && id === wid) return p
    const sid = Number(String(p.id).trim())
    if (Number.isFinite(sid) && sid === wid && sid > 0) return p
  }
  return null
}

function linkOutboundTargetId(row: Record<string, unknown>): number | null {
  const direct = pickNumber(row, [
    'to_warehouse_id',
    '目标库房id',
    '目标仓库id',
    '对标库房id',
    '对标仓库id',
    'target_warehouse_id',
    'to_id',
    'target_id',
  ])
  if (direct != null && direct > 0) return direct
  const nestedKeys = [
    '对标库房',
    'to_warehouse',
    'target_warehouse',
    '目标库房',
    '目标仓库',
  ]
  for (const k of nestedKeys) {
    const v = row[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const n = pickNumber(v as Record<string, unknown>, [
        'id',
        '仓库id',
        'warehouse_id',
        '库房id',
        'warehouseId',
      ])
      if (n != null && n > 0) return n
    }
  }
  return null
}

function linkOutboundTargetName(row: Record<string, unknown>, toId: number): string {
  const nestedKeys = ['对标库房', 'to_warehouse', 'target_warehouse', '目标库房', '目标仓库']
  let toName = pickStr(row, [
    'to_warehouse_name',
    '目标库房名',
    '对标库房名',
    'target_warehouse_name',
  ])
  if (!toName) {
    for (const k of nestedKeys) {
      const v = row[k]
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        toName = pickStr(v as Record<string, unknown>, ['仓库名', 'warehouse_name', 'name', '库房名'])
        if (toName) break
      }
    }
  }
  const tgt = findWarehousePointByNumericId(toId)
  if (tgt?.title) return warehouseDisplayName(tgt.title)
  return warehouseDisplayName(toName) || `库房 #${toId}`
}

async function buildWarehouseDistanceTableRows(
  warehouse: MapPoint,
  whId: number,
  links: Record<string, unknown>[],
  tierByTargetId: Map<number, string>,
  spreadByTargetId: Map<number, string>,
): Promise<WarehouseDistanceTableRow[]> {
  const entries: { tid: number; linkRow: Record<string, unknown> }[] = []
  for (const row of links) {
    const tid = linkOutboundTargetId(row)
    if (tid != null && tid > 0) entries.push({ tid, linkRow: row })
  }
  const rows = await Promise.all(
    entries.map(async ({ tid, linkRow }) => {
      const tgt = findWarehousePointByNumericId(tid)
      let distanceText = '—'
      let distanceKm: number | null = null
      if (tgt) {
        try {
          const d = await fetchTlCalculateDistance(warehouse.lng, warehouse.lat, tgt.lng, tgt.lat, {
            fromWarehouseId: whId,
            toWarehouseId: tid,
          })
          distanceKm = d.distanceKm
          distanceText = `${d.distanceKm.toFixed(2)} km`
        } catch {
          const m = greatCircleDistanceMeters(warehouse.lat, warehouse.lng, tgt.lat, tgt.lng)
          distanceKm = m / 1000
          distanceText = `${distanceKm.toFixed(2)} km`
        }
      }
      return {
        toId: tid,
        toName: linkOutboundTargetName(linkRow, tid),
        distanceText,
        distanceKm,
        tierPriceDiff: tierByTargetId.get(tid) ?? formatWarehouseLinkTierDisplay(linkRow),
        realTimeDiff: spreadByTargetId.get(tid) ?? '—',
      }
    }),
  )
  return rows.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) {
      return a.toName.localeCompare(b.toName, 'zh-CN')
    }
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    const d = a.distanceKm - b.distanceKm
    if (d !== 0) return d
    return a.toName.localeCompare(b.toName, 'zh-CN')
  })
}

/** 出库绑定行「阶梯价差」：与库房距离配置页 parseTierFields 行为一致（纯数字 / JSON 字符串等） */
function formatWarehouseLinkTierDisplay(row: Record<string, unknown>): string {
  const keys = ['阶梯价差', 'ladder_price_diff', 'tier_price_diff', 'step_price_diff']
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, k)) continue
    const v = row[k]
    if (v === null || v === undefined) return '—'
    if (v === '') return '—'
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
    }
    if (typeof v === 'string') {
      const s = v.trim()
      if (s === '') return '—'
      const n = Number(s)
      if (Number.isFinite(n) && s === String(n)) {
        return n.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
      }
      return s
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v)
      } catch {
        return '—'
      }
    }
  }
  return '—'
}

/** 距离监测中点标签：浏览器原生 title（完整地址等） */
function warehouseBindTargetPlainSummary(
  tgt: MapPoint,
  tierDisplay: string,
  realtimeSpreadDisplay: string,
): string {
  const row = tgt.raw
  const lines: string[] = [tgt.title]
  const typeName = pickStr(row, ['类型', 'type', 'warehouse_type_name', '类型名']).trim()
  if (typeName) lines.push(`类型：${typeName}`)
  const pv = provinceFromRow(row).trim()
  if (pv) lines.push(`省份：${pv}`)
  const addr = addressText(row).trim()
  if (addr) lines.push(`地址：${addr}`)
  lines.push(`阶梯价差：${tierDisplay}`)
  lines.push(`实时价差：${realtimeSpreadDisplay}`)
  return lines.join('\n')
}

function warehouseBindDistRow(label: string, value: string): string {
  return `<div class="emap-wh-bind-dist-row"><span class="emap-wh-bind-dist-k">${escapeHtml(
    label,
  )}</span><span class="emap-wh-bind-dist-v">${escapeHtml(value)}</span></div>`
}

function warehouseBindDistMetric(label: string, value: string): string {
  return `<div class="emap-wh-bind-dist-metric"><span class="emap-wh-bind-dist-metric-k">${escapeHtml(
    label,
  )}</span><span class="emap-wh-bind-dist-metric-v">${escapeHtml(value)}</span></div>`
}

/** 距离监测常驻 tip 内容（与比价冶炼厂 tip 相同：锚在目标点 + Leaflet 箭头指向该点） */
function warehouseBindMidpointLabelHtml(
  kmStr: string,
  tgt: MapPoint,
  tierDisplay: string,
  realtimeSpreadDisplay: string,
): string {
  const row = tgt.raw
  const typeName = pickStr(row, ['类型', 'type', 'warehouse_type_name', '类型名']).trim() || '—'
  const pv = provinceFromRow(row).trim() || '—'
  const addr = addressText(row).trim()
  const addrShort = addr ? (addr.length > 48 ? `${addr.slice(0, 47)}…` : addr) : '—'
  const dual =
    `<div class="emap-wh-bind-dist-dual">${warehouseBindDistRow('类型', typeName)}${warehouseBindDistRow(
      '省份',
      pv,
    )}</div>` + warehouseBindDistRow('地址', addrShort)
  const metrics = `<div class="emap-wh-bind-dist-metrics">${warehouseBindDistMetric(
    '阶梯价差',
    tierDisplay,
  )}${warehouseBindDistMetric('实时价差', realtimeSpreadDisplay)}</div>`
  const titleAttr = escapeHtml(
    warehouseBindTargetPlainSummary(tgt, tierDisplay, realtimeSpreadDisplay).replace(/\n/g, ' — '),
  )
  return `<div class="emap-wh-bind-dist-tip-inner" title="${titleAttr}"><div class="emap-wh-bind-dist-head"><span class="emap-wh-bind-dist-km">${escapeHtml(
    kmStr,
  )}</span></div><div class="emap-wh-bind-dist-title">${escapeHtml(
    tgt.title,
  )}</div><div class="emap-wh-bind-dist-body">${dual}${metrics}</div></div>`
}

async function drawWarehouseBindingDistanceLines(warehouse: MapPoint) {
  const flowLayer = flowLayerRef.value
  const tipLayer = topTipLayerRef.value
  if (!flowLayer || !tipLayer) throw new Error('地图流向图层未初始化，请刷新页面后重试')
  const distanceRenderer = L.svg({ padding: 0.5, pane: distanceLinePaneName })
  const whId = warehouseNumericIdFromRow(warehouse.raw)
  if (whId == null) throw new Error('该库房缺少仓库 id，无法查询绑定')
  const links = await fetchTlWarehouseLinksOutbound(whId)
  const targetIds = new Set<number>()
  const tierByTargetId = new Map<number, string>()
  for (const row of links) {
    const tid = linkOutboundTargetId(row)
    if (tid != null && tid > 0) {
      targetIds.add(tid)
      tierByTargetId.set(tid, formatWarehouseLinkTierDisplay(row))
    }
  }
  if (!targetIds.size) {
    throw new Error('该库房暂无出库绑定（请先在「库房距离监测配置」中维护）')
  }
  /* 加载实时价差 */
  const spreadByTargetId = new Map<number, string>()
  try {
    const spreadItems = await fetchTlRealtimeSpreadList({ from_warehouse_id: whId, page: 1, size: 200 })
    for (const item of spreadItems) {
      const o = item as Record<string, unknown>
      const toId = Number(o['对标库房id'] ?? 0)
      const spread = o['实时价差']
      if (toId > 0 && spread != null) spreadByTargetId.set(toId, String(spread))
    }
  } catch { /* 实时价差加载失败不影响连线 */ }
  warehouseDistanceTableRows.value = await buildWarehouseDistanceTableRows(
    warehouse,
    whId,
    links,
    tierByTargetId,
    spreadByTargetId,
  )
  const rendererOpt = { renderer: distanceRenderer }
  let drawn = 0
  for (const row of warehouseDistanceTableRows.value) {
    const tid = row.toId
    const tgt = findWarehousePointByNumericId(tid)
    if (!tgt) continue
    const latlngs: L.LatLngTuple[] = [
      [warehouse.lat, warehouse.lng],
      [tgt.lat, tgt.lng],
    ]
    L.polyline(latlngs, {
      color: '#c084fc',
      weight: 6,
      opacity: 0.98,
      dashArray: '10 10',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'emap-wh-bind-line',
      interactive: false,
      pane: distanceLinePaneName,
      ...rendererOpt,
    }).addTo(flowLayer)

    const kmStr = row.distanceText
    const dir = emapRankTipDirectionForIdx(drawn)
    const base = emapRankTipBasePixelOffset(dir, comparisonRankTipYOffset())
    const tierLine = row.tierPriceDiff
    const spreadLine = row.realTimeDiff
    L.tooltip({
      permanent: true,
      direction: dir,
      offset: base,
      className: 'emap-wh-bind-dist-tip',
      pane: emapRankComparisonTipPaneName,
      opacity: 1,
    })
      .setLatLng([tgt.lat, tgt.lng])
      .setContent(warehouseBindMidpointLabelHtml(kmStr, tgt, tierLine, spreadLine))
      .addTo(tipLayer)
    drawn++
  }
  if (!drawn) {
    throw new Error('绑定的库房在地图上无坐标或未加载，无法连线')
  }
}

function focusWarehouseDistanceBindTarget(toId: number) {
  const map = mapRef.value
  if (!map) {
    compareError.value = '地图尚未就绪'
    return
  }
  const p = findWarehousePointByNumericId(toId)
  if (!p) {
    compareError.value = '该库房在地图上暂无坐标或未加载，无法定位'
    return
  }
  compareError.value = ''
  warehouseDistanceFocusToId.value = toId
  const zoom = Math.max(map.getZoom(), 11)
  setMapViewWithWarehouseLeftPanelBias(map, [p.lat, p.lng], zoom, { animate: true })
  const relayout = () => scheduleEmapRankTipOverlapFromUi()
  map.once('moveend', relayout)
  void nextTick(relayout)
}

function exitWarehouseDistanceMonitorMode(restoreComparisonOverlay = true) {
  warehouseDistanceMonitorOn.value = false
  warehouseDistanceTableRows.value = []
  warehouseDistanceFocusToId.value = null
  clearMapComparisonGraphicsOnly()
  const wh = selectedWarehouse.value
  if (restoreComparisonOverlay && wh && comparisonRanks.value.length) {
    const title = wh.title?.trim()
    comparisonModalTitle.value = title ? `比价预测结果：${title}` : '比价预测结果'
    void renderComparisonOverlay(wh, comparisonRanks.value)
  }
}

async function onWarehouseDistanceMonitorClick() {
  const wh = selectedWarehouse.value
  if (!wh || wh.kind !== 'warehouse') return
  if (warehouseDistanceMonitorOn.value) {
    exitWarehouseDistanceMonitorMode(true)
    if (!comparisonRanks.value.length) {
      comparisonModalVisible.value = false
    }
    return
  }
  comparisonModalVisible.value = true
  const title = wh.title?.trim()
  comparisonModalTitle.value = title ? `库房距离监测：${title}` : '库房距离监测'
  clearMapComparisonGraphicsOnly()
  warehouseDistanceTableRows.value = []
  warehouseDistanceLoading.value = true
  try {
    await drawWarehouseBindingDistanceLines(wh)
    comparisonSectionCollapsed.value = true
    forecastSectionCollapsed.value = true
    warehouseDistanceMonitorOn.value = true
    compareError.value = ''
  } catch (e) {
    compareError.value = e instanceof Error ? e.message : String(e)
    warehouseDistanceMonitorOn.value = false
    warehouseDistanceTableRows.value = []
  } finally {
    warehouseDistanceLoading.value = false
  }
}

function renderComparisonOverlay(warehouse: MapPoint, ranks: ComparisonRankItem[]) {
  stopEmapRankTipLayoutHandlers()
  warehouseDistanceMonitorOn.value = false
  warehouseDistanceTableRows.value = []
  cancelFlowOverlayAnimations()
  stopFlowAnimations()
  const flowLayer = flowLayerRef.value
  const tipLayer = topTipLayerRef.value
  const flowRenderer = flowPathSvgRendererRef.value
  const map = mapRef.value
  if (!flowLayer || !tipLayer) return
  flowLayer.clearLayers()
  tipLayer.clearLayers()
  const list = ranks.slice(0, MAX_MAP_FLOW_TARGETS)
  type FlowEntry = { row: ComparisonRankItem; listIdx: number; smelter: MapPoint }
  const entries: FlowEntry[] = []
  const seenSmelterKey = new Set<string>()
  for (let i = 0; i < list.length; i++) {
    const row = list[i]!
    const sk = row.smelter.trim()
    if (seenSmelterKey.has(sk)) continue
    seenSmelterKey.add(sk)
    const smelter = findSmelterPoint(row.smelter)
    if (!smelter) continue
    entries.push({ row, listIdx: entries.length, smelter })
  }
  const visibleEntries = showAllComparisonFlows.value
    ? entries
    : entries.filter((e) => e.row.rank <= 3)
  /** 先画其余线，再画前三，避免重叠时被后画的低档线盖住 */
  const back = visibleEntries.filter((e) => e.row.rank > 3)
  const front = visibleEntries.filter((e) => e.row.rank <= 3)
  const totalFlows = visibleEntries.length
  const rankTipY = comparisonRankTipYOffset()
  let rankTipsAdded = 0
  const drawOne = (e: FlowEntry) => {
    const { row, listIdx, smelter } = e
    const bend = comparisonFlowBend(listIdx, totalFlows)
    const curve = quadraticBezierLatLng(
      warehouse.lat,
      warehouse.lng,
      smelter.lat,
      smelter.lng,
      64,
      bend,
    )
    const palette = comparisonFlowPalette(row.rank)
    const staggerClass = palette.showMover ? `emap-flow-stagger-${listIdx % 6}` : ''
    const rendererOpt = flowRenderer ? { renderer: flowRenderer } : {}
    const baseOpts = {
      color: palette.base,
      weight: palette.baseWeight,
      opacity: palette.opacity,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      className: palette.baseClass,
      interactive: false,
      pane: emapComparisonFlowPaneName,
      ...rendererOpt,
    }
    const dashOpts = {
      color: palette.main,
      weight: palette.dashWeight,
      opacity: palette.opacity,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      dashArray: palette.dashArray,
      className: [palette.lineClass, staggerClass].filter(Boolean).join(' '),
      interactive: false,
      pane: emapComparisonFlowPaneName,
      ...rendererOpt,
    }
    L.polyline(curve, baseOpts).addTo(flowLayer)
    L.polyline(curve, dashOpts).addTo(flowLayer)
    if (palette.showMover) {
      attachFlowMoverAlongCurve(flowLayer, curve, 2200 + (listIdx % 4) * 280, palette.moverInnerClass)
    }
    if (showComparisonSmelterInfo.value) {
      const tipClass =
        row.rank <= 3 ? 'emap-rank-tip emap-rank-tip--top3' : 'emap-rank-tip emap-rank-tip--dim'
      const dir = emapRankTipDirectionForIdx(listIdx)
      const base = emapRankTipBasePixelOffset(dir, rankTipY)
      const tip = L.tooltip({
        permanent: true,
        direction: dir,
        offset: base,
        className: tipClass,
        pane: emapRankComparisonTipPaneName,
      })
        .setLatLng([smelter.lat, smelter.lng])
        .setContent(comparisonRankTipHtml(row))
        .addTo(tipLayer)
      emapRankTipLayoutMeta.set(tip, {
        base,
        rank: row.rank,
        listIdx,
        bump: L.point(0, 0),
        spiral: 0,
      })
      rankTipsAdded += 1
    }
  }
  for (const e of back) drawOne(e)
  for (const e of front) drawOne(e)
  if (map && rankTipsAdded > 0) {
    startEmapRankTipLayoutHandlers(map, tipLayer)
  }
}

watch(showAllComparisonFlows, () => {
  const wh = selectedWarehouse.value
  if (!wh || !comparisonRanks.value.length || warehouseDistanceMonitorOn.value) return
  renderComparisonOverlay(wh, comparisonRanks.value)
})

watch(showComparisonSmelterInfo, () => {
  const wh = selectedWarehouse.value
  if (!wh || !comparisonRanks.value.length || warehouseDistanceMonitorOn.value) return
  renderComparisonOverlay(wh, comparisonRanks.value)
})

type RunComparisonOptions = {
  /** 仅「重新比价」按钮为 true；地图点仓库缺条件时静默，不挡操作 */
  announceMissingPrereq?: boolean
}

async function runComparisonForWarehouse(warehouse: MapPoint, options?: RunComparisonOptions) {
  if (warehouseDistanceMonitorOn.value) {
    warehouseDistanceMonitorOn.value = false
    clearMapComparisonGraphicsOnly()
  }
  const { ids: categoryIds, totalTons, tonsByCategory } = getSelectedCategoryPayload()
  if (!categoryIds.length || totalTons <= 0) {
    if (options?.announceMissingPrereq) {
      showComparisonPrereqToast(
        '请先在上方「回收品类」中勾选品类并填写大于 0 的吨数，再进行比价。',
      )
    }
    return
  }

  compareLoading.value = true
  compareError.value = ''
  try {
    const whId = warehouseNumericIdFromRow(warehouse.raw)
    if (whId == null) throw new Error('该库房缺少仓库id，无法自动比价')
    const smelterIds = allSmelterPoints.value
      .map((s) => pickNumber(s.raw, ['冶炼厂id', 'factory_id', 'smelter_id', 'id']))
      .filter((x): x is number => x != null)
    if (!smelterIds.length) throw new Error('暂无可比价的冶炼厂')

    const body = buildSmartComparisonBody(
      whId,
      smelterIds,
      tonsByCategory,
      comparisonType.value,
    )
    const raw = await postTlGetComparison(body)
    const payload = pickComparisonPayload(raw)
    const sortKey = raw['最优价排序口径'] ?? payload?.['最优价排序口径']
    lastComparisonSortKey.value =
      sortKey != null && String(sortKey).trim() !== '' ? String(sortKey).trim() : ''
    const detailRows = tlUnwrapComparisonDetails(raw)
    const ranks = rankingsFromComparisonResponse(raw, detailRows, comparisonType.value)
    comparisonRanks.value = ranks
    if (ranks.length) {
      renderComparisonOverlay(warehouse, ranks)
    } else {
      flowLayerRef.value?.clearLayers()
      topTipLayerRef.value?.clearLayers()
    }
    openComparisonModal()
  } catch (err) {
    clearComparisonOverlays()
    compareError.value = err instanceof Error ? err.message : String(err)
  } finally {
    compareLoading.value = false
  }
}

function uniqSortedJoinZh(values: string[]): string {
  const u = [...new Set(values.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )
  return u.length ? u.join('、') : '—'
}

function uniqSortedJoinZhOptional(values: string[]): string | undefined {
  const u = [...new Set(values.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )
  return u.length ? u.join('、') : undefined
}

function parseForecastDetailError(e: unknown): string {
  const err = e as { response?: { data?: { message?: string; detail?: string } }; message?: string }
  const data = err.response?.data
  return (
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.detail === 'string' && data.detail) ||
    (typeof err.message === 'string' && err.message) ||
    '获取预测明细失败'
  )
}

function resetForecastData() {
  forecastModalMeta.value = null
  forecastModalDates.value = []
  forecastModalValues.value = []
  forecastDetailRows.value = []
  forecastQueried.value = false
}

function formatForecastDetailDate(iso: string): string {
  const s = String(iso ?? '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[2]}-${m[3]}`
  return s
}

function truncateForecastAnalysis(analysis: string | null | undefined, maxLen = 72): string {
  const t = (analysis ?? '').trim()
  if (!t) return '—'
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen)}…`
}

/**
 * 打开预测依据详情抽屉，展示 v2 六大段分析
 */
function openForecastAnalysisDrawer(row: ForecastDetailRow) {
  forecastAnalysisDrawerTitle.value = `预测依据 · ${row.targetDate}`
  forecastAnalysisDrawerText.value = row.comprehensiveAnalysis || row.analysis
  forecastAnalysisDrawerMeta.value = [
    `预测日期：${row.targetDate}`,
    `预计发货量：${row.predictedWeight.toFixed(2)} 吨`,
    row.shipProbability ? `发货概率：${row.shipProbability}` : '',
    row.confidenceLevel ? `预测置信度：${row.confidenceLevel}` : '',
    row.expectedShipDate ? `预计发货时间：${row.expectedShipDate}` : '',
    row.regionalManager ? `大区经理：${row.regionalManager}` : '',
    row.productVariety ? `品类：${row.productVariety}` : '',
    row.smelter ? `冶炼厂：${row.smelter}` : '',
  ].filter(Boolean)
  forecastAnalysisDrawerSections.value = []
  forecastAnalysisDrawerVisible.value = true
}

function closeForecastAnalysisDrawer() {
  forecastAnalysisDrawerVisible.value = false
}

/** 将 predictApi 的 PredictResultRow 转为本地 ForecastDetailRow */
function toForecastDetailRow(r: PredictResultRow): ForecastDetailRow {
  return {
    targetDate: r.targetDate,
    predictedWeight: r.expectedShipment,
    analysis: r.analysis,
    regionalManager: r.regionalManager,
    productVariety: r.productVariety,
    smelter: r.smelter,
    shipProbability: r.shipProbability,
    expectedShipDate: r.expectedShipDate,
    confidenceLevel: r.confidenceLevel,
    mainFactors: r.mainFactors,
    comprehensiveAnalysis: r.comprehensiveAnalysis,
    historyAnalysis: r.historyAnalysis,
    priceSensitivityAnalysis: r.priceSensitivityAnalysis,
    priceCompetitivenessAnalysis: r.priceCompetitivenessAnalysis,
    holidayAnalysis: r.holidayAnalysis,
    weatherAnalysis: r.weatherAnalysis,
  }
}

const comparisonSummary = computed(() => {
  const sorted = [...comparisonRanks.value].sort((a, b) => a.rank - b.rank)
  const first = sorted[0]
  const second = sorted[1]
  const bestProfit = first?.netProfit ?? 0
  const marginToSecond = first && second ? bestProfit - second.netProfit : 0
  return {
    bestSmelter: first?.smelter ?? '',
    bestProfit: toDisplayNum(bestProfit),
    marginToSecond: toDisplayNum(marginToSecond),
  }
})

function openComparisonModal() {
  if (warehouseDistanceMonitorOn.value) {
    exitWarehouseDistanceMonitorMode(false)
  }
  const wh = selectedWarehouse.value?.title?.trim()
  comparisonModalTitle.value = wh ? `比价预测结果：${wh}` : '比价预测结果'
  compareError.value = ''
  comparisonSectionCollapsed.value = false
  forecastSectionCollapsed.value = false
  comparisonModalVisible.value = true
  const sel = selectedWarehouse.value
  if (sel && comparisonRanks.value.length) {
    void renderComparisonOverlay(sel, comparisonRanks.value)
  }
}

function closeComparisonModal() {
  if (warehouseDistanceMonitorOn.value) {
    exitWarehouseDistanceMonitorMode(false)
  }
  comparisonModalVisible.value = false
  comparisonSectionCollapsed.value = false
  forecastSectionCollapsed.value = false
  comparisonCellDetail.value = null
  warehouseDistanceTableRows.value = []
}

function drawForecastTrendChart(highlightIndex = -1) {
  const canvas = forecastTrendCanvasRef.value
  if (!canvas) return
  const dates = forecastModalDates.value
  const values = forecastModalValues.value
  if (dates.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const wrap = canvas.parentElement
  const width = Math.max((wrap?.clientWidth ?? 560) - 8, 320)
  const height = 320
  canvas.width = width
  canvas.height = height

  const dpr = window.devicePixelRatio || 1
  if (dpr > 1) {
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)
  }

  const margin = { t: 28, r: 20, b: 44, l: 60 }
  const W = width - margin.l - margin.r
  const H = height - margin.t - margin.b
  const n = dates.length

  const maxV = Math.max(...values, 0)
  const maxY = maxV <= 0 ? 1 : maxV * 1.1
  const xStep = n <= 1 ? W / 2 : W / (n - 1)
  const toX = (i: number) => margin.l + i * xStep
  const toY = (v: number) => margin.t + H - (v / maxY) * H

  trendChartLayout = { margin, W, H, maxY, xStep, toX, toY }

  // 背景
  ctx.fillStyle = '#0c1a2e'
  ctx.fillRect(0, 0, width, height)

  // Y 轴网格 + 标签
  const ySteps = 5
  ctx.lineWidth = 1
  for (let i = 0; i <= ySteps; i++) {
    const y = margin.t + H - (i / ySteps) * H
    const val = (i / ySteps) * maxY
    ctx.strokeStyle = i === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(34, 211, 238, 0.06)'
    ctx.beginPath()
    ctx.moveTo(margin.l, y)
    ctx.lineTo(margin.l + W, y)
    ctx.stroke()
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(val.toFixed(1), margin.l - 8, y)
  }

  // X 轴基线
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(margin.l, margin.t + H)
  ctx.lineTo(margin.l + W, margin.t + H)
  ctx.stroke()

  // 悬浮竖线
  if (highlightIndex >= 0 && highlightIndex < n) {
    const hx = toX(highlightIndex)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(hx, margin.t)
    ctx.lineTo(hx, margin.t + H)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 面积渐变（暗色主题）
  const gradient = ctx.createLinearGradient(0, margin.t, 0, margin.t + H)
  gradient.addColorStop(0, 'rgba(34, 211, 238, 0.15)')
  gradient.addColorStop(0.7, 'rgba(34, 211, 238, 0.03)')
  gradient.addColorStop(1, 'rgba(34, 211, 238, 0)')
  ctx.beginPath()
  ctx.moveTo(toX(0), margin.t + H)
  ctx.lineTo(toX(0), toY(values[0]))
  for (let i = 1; i < n; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2
    ctx.bezierCurveTo(cpX, toY(values[i - 1]), cpX, toY(values[i]), toX(i), toY(values[i]))
  }
  ctx.lineTo(toX(n - 1), margin.t + H)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // 折线（平滑曲线 + 发光）
  ctx.beginPath()
  ctx.moveTo(toX(0), toY(values[0]))
  for (let i = 1; i < n; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2
    ctx.bezierCurveTo(cpX, toY(values[i - 1]), cpX, toY(values[i]), toX(i), toY(values[i]))
  }
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(34, 211, 238, 0.45)'
  ctx.shadowBlur = 10
  ctx.stroke()
  ctx.shadowBlur = 0

  // 数据点
  values.forEach((v, i) => {
    const x = toX(i)
    const y = toY(v)
    const active = i === highlightIndex
    if (active) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.2)'
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0c1a2e'
      ctx.beginPath()
      ctx.arc(x, y, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = '#0c1a2e'
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // X 轴标签
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = '11px system-ui, sans-serif'
  const maxLabs = Math.max(2, Math.floor(W / 50))
  const labStep = Math.max(1, Math.ceil(n / maxLabs))
  dates.forEach((d, i) => {
    if (i % labStep !== 0 && i !== n - 1) return
    const x = toX(i)
    const label = d.length >= 10 ? d.slice(5) : d
    ctx.fillStyle = i === highlightIndex ? '#22d3ee' : '#64748b'
    ctx.fillText(label, x, margin.t + H + 10)
  })

  // 轴标题
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#64748b'
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillText('重量（吨）', margin.l, margin.t - 10)
  ctx.textAlign = 'center'
  ctx.fillText('预测日期', margin.l + W / 2, height - 6)
  ctx.textAlign = 'start'
}

function trendCanvasPointer(ev: MouseEvent): { x: number; y: number } {
  const canvas = forecastTrendCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const scaleX = (canvas.width / dpr) / rect.width
  const scaleY = (canvas.height / dpr) / rect.height
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  }
}

function findNearestTrendPoint(px: number, _py: number): number {
  if (!trendChartLayout) return -1
  const values = forecastModalValues.value
  if (values.length === 0) return -1
  let best = 0
  let bestDist = Math.abs(px - trendChartLayout!.toX(0))
  values.forEach((_v, i) => {
    const dx = Math.abs(px - trendChartLayout!.toX(i))
    if (dx < bestDist) {
      bestDist = dx
      best = i
    }
  })
  return best
}

function updateTrendTooltipPosition(index: number) {
  const canvas = forecastTrendCanvasRef.value
  if (!canvas || !trendChartLayout || index < 0) return
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const scaleX = rect.width / (canvas.width / dpr)
  const scaleY = rect.height / (canvas.height / dpr)
  const left = trendChartLayout.toX(index) * scaleX
  const top = trendChartLayout.toY(forecastModalValues.value[index] ?? 0) * scaleY
  trendTooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translate(-50%, calc(-100% - 14px))',
  }
}

function onTrendChartMouseMove(ev: MouseEvent) {
  if (!trendChartLayout || forecastModalValues.value.length === 0) return
  const { x, y } = trendCanvasPointer(ev)
  const hit = findNearestTrendPoint(x, y)
  if (hit === trendHoverIndex.value) return
  trendHoverIndex.value = hit
  if (hit >= 0) updateTrendTooltipPosition(hit)
  drawForecastTrendChart(hit)
}

function onTrendChartMouseLeave() {
  if (trendHoverIndex.value < 0) return
  trendHoverIndex.value = -1
  trendTooltipStyle.value = {}
  drawForecastTrendChart(-1)
}

function escapeForecastCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportForecastTrendCsv() {
  const dates = forecastModalDates.value
  const values = forecastModalValues.value
  if (dates.length === 0) {
    window.alert('没有可导出的数据')
    return
  }
  const m = forecastModalMeta.value
  const metaLines = m
    ? [
        ['字段', '值'].join(','),
        ['仓库', m.warehouse].map(escapeForecastCsvCell).join(','),
        ['大区经理', m.regional_manager].map(escapeForecastCsvCell).join(','),
        ...(m.smelter ? [['冶炼厂', m.smelter].map(escapeForecastCsvCell).join(',')] : []),
        ['品类', m.product_variety].map(escapeForecastCsvCell).join(','),
      ]
    : []
  const headers = ['预测日期', '预测重量(吨)']
  const rowsData = dates.map((d, i) => [d, values[i]?.toFixed(2) ?? '0.00'].map(escapeForecastCsvCell))
  const csvContent = [...metaLines, '', headers.join(','), ...rowsData.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `预测趋势_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

watch(comparisonModalVisible, (v) => {
  if (v) {
    trendHoverIndex.value = -1
    trendTooltipStyle.value = {}
    nextTick(() => {
      drawForecastTrendChart()
      forecastTrendResizeHandler = () => drawForecastTrendChart(trendHoverIndex.value)
      window.addEventListener('resize', forecastTrendResizeHandler)
    })
  } else if (forecastTrendResizeHandler) {
    window.removeEventListener('resize', forecastTrendResizeHandler)
    forecastTrendResizeHandler = null
  }
})

watch([forecastModalDates, forecastModalValues, forecastSectionCollapsed], () => {
  if (comparisonModalVisible.value && !forecastSectionCollapsed.value && forecastModalDates.value.length > 0) {
    trendHoverIndex.value = -1
    trendTooltipStyle.value = {}
    nextTick(() => drawForecastTrendChart())
  }
})


/** 触发预测并获取已落库结果（针对该库房总送货量，不区分品类） */
async function triggerPredictSync(warehouse: MapPoint): Promise<PredictResultRow[]> {
  const whTitle = warehouse.title.trim()

  // Step 1: 触发预测
  console.log('[预测] 触发预测:', whTitle)
  await triggerPrediction({ warehouse: whTitle })

  // Step 2: 拉取已落库的预测结果
  const rows = await fetchAllPredictResults({ warehouse: whTitle })
  console.log('[预测] 获取结果:', rows.length, '条')
  return rows
}

async function runForecastForWarehouse(warehouse: MapPoint) {
  forecastLoading.value = true
  forecastError.value = ''
  forecastQueried.value = true
  try {
    const whTitle = warehouse.title.trim()
    const rows = await triggerPredictSync(warehouse)

    // 客户端图表聚合（复用 predictApi）
    const chart = aggregateChartFromResults(rows)
    forecastModalDates.value = chart.dates
    forecastModalValues.value = chart.totalByDate

    const rms = rows.map((r) => r.regionalManager)
    const vars = rows.map((r) => r.productVariety)
    const sms = rows.map((r) => r.smelter ?? '')

    forecastModalMeta.value = {
      warehouse: whTitle,
      regional_manager: uniqSortedJoinZh(rms),
      product_variety: uniqSortedJoinZh(vars),
      smelter: uniqSortedJoinZhOptional(sms),
    }
    // 明细列表也过滤历史日期，与图表保持一致（仅保留今天及以后）
    const today = new Date().toISOString().slice(0, 10)
    forecastDetailRows.value = rows
      .filter((r) => r.targetDate >= today)
      .map(toForecastDetailRow)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate, 'zh-CN'))
    if (comparisonModalVisible.value && !forecastSectionCollapsed.value) {
      nextTick(() => drawForecastTrendChart())
    }
  } catch (e) {
    resetForecastData()
    forecastError.value = parseForecastDetailError(e)
  } finally {
    forecastLoading.value = false
  }
}

/** 地图弹层/副标题展示：仅地址等，不含 id（兼容旧缓存「地址 · id: n」） */
function mapPointSubtitleForDisplay(raw: Record<string, unknown>, legacySubtitle: string): string {
  const addr = addressText(raw).trim()
  if (addr) return addr
  return legacySubtitle
    .split(' · ')
    .map((s) => s.trim())
    .filter((part) => part && !/^id:\s*/i.test(part))
    .join(' · ')
}

function reviveMapPointFromCache(p: unknown): MapPoint | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  if (o.kind !== 'warehouse' && o.kind !== 'smelter') return null
  if (typeof o.id !== 'string' || !o.id.trim()) return null
  const lat = Number(o.lat)
  const lng = Number(o.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const raw =
    o.raw != null && typeof o.raw === 'object' && !Array.isArray(o.raw)
      ? (o.raw as Record<string, unknown>)
      : {}
  const titleRaw = typeof o.title === 'string' ? o.title : String(o.title ?? '')
  const title =
    o.kind === 'warehouse' ? warehouseDisplayName(titleRaw) : titleRaw
  const cachedSubtitle = typeof o.subtitle === 'string' ? o.subtitle : String(o.subtitle ?? '')
  const subtitle = mapPointSubtitleForDisplay(raw, cachedSubtitle)
  if (o.kind === 'warehouse') {
    const pinColor = typeof o.pinColor === 'string' && o.pinColor.trim() ? o.pinColor : undefined
    return { kind: 'warehouse', id: o.id, title, subtitle, lat, lng, pinColor, raw }
  }
  return { kind: 'smelter', id: o.id, title, subtitle, lat, lng, raw }
}

function readEmapMarkersCache(): MapPoint[] | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(EMAP_MARKERS_CACHE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as { v?: unknown; points?: unknown }
    if (parsed.v !== 1 || !Array.isArray(parsed.points)) return null
    const points: MapPoint[] = []
    for (const x of parsed.points) {
      const pt = reviveMapPointFromCache(x)
      if (pt) points.push(pt)
    }
    if (points.length !== parsed.points.length) return null
    return points
  } catch {
    return null
  }
}

function writeEmapMarkersCache(points: MapPoint[]) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(EMAP_MARKERS_CACHE_KEY, JSON.stringify({ v: 1, points, ts: Date.now() }))
  } catch {
    /* 存储配额或无痕模式 */
  }
}

function restoreEmapMarkersFromCache(): boolean {
  const points = readEmapMarkersCache()
  if (points === null) return false
  if (!points.length) {
    loadError.value =
      '接口未返回可打点的库房或冶炼厂经纬度，请在业务系统补全坐标后刷新。'
  } else {
    loadError.value = ''
  }
  renderMarkers(points)
  return true
}

async function loadCategories() {
  categoriesError.value = ''
  categoriesLoading.value = true
  try {
    const apiRows = await fetchTlCategories()
    const apiNameById = new Map<number, string>()
    for (const row of apiRows) {
      const name = pickCategoryDisplayName(row.name)
      if (name) apiNameById.set(row.id, name)
    }
    const apiIds = new Set(apiRows.map((c) => c.id))
    categories.value = EMAP_FIXED_CATEGORY_ORDER.filter((def) => apiIds.has(def.id)).map((def) => ({
      id: def.id,
      name: apiNameById.get(def.id) || def.name,
    }))
    ensureCategoryPrefsForList(categories.value)
  } catch (e) {
    categories.value = []
    categoriesError.value = e instanceof Error ? e.message : String(e)
  } finally {
    categoriesLoading.value = false
  }
}

/** 并发拉取库房/冶炼厂时递增，避免先返回的请求覆盖后发起的更新 */
let markersLoadSeq = 0

type MarkersLoadUi = 'full' | 'silent'

async function loadAndPlot(ui: MarkersLoadUi = 'full') {
  const seq = ++markersLoadSeq
  loadError.value = ''
  const preserveWarehouseContext =
    ui === 'full' && selectedWarehouse.value?.kind === 'warehouse'
  const savedWhId = preserveWarehouseContext ? selectedWarehouse.value!.id : null
  const shouldRerunComparison =
    preserveWarehouseContext &&
    (comparisonRanks.value.length > 0 || comparisonModalVisible.value)
  const mapBefore = mapRef.value
  const savedCenter =
    preserveWarehouseContext && mapBefore ? mapBefore.getCenter() : null
  const savedZoom =
    preserveWarehouseContext && mapBefore ? mapBefore.getZoom() : null
  if (ui === 'full') {
    loading.value = true
    markersSyncing.value = false
  } else {
    markersSyncing.value = true
  }
  void loadCategories()
  try {
    const [whRows, smRows] = await Promise.all([fetchTlWarehousesAll(), fetchTlSmeltersAll()])

    // 先拉取收货价格日期缓存，确保后续渲染卡片时数据已就绪
    await refreshReceiptPriceDateCache()
    let typeRows: Record<string, unknown>[] = []
    let factoryTypeRows: Record<string, unknown>[] = []
    try {
      ;[typeRows, factoryTypeRows] = await Promise.all([
        fetchTlWarehouseTypes(false),
        fetchTlFactoryTypes(false),
      ])
    } catch {
      /* 类型接口不可用时仍可按单条记录上的颜色字段配色 */
    }
    const typeColorById = buildTypeColorMap(typeRows)
    const smelterTypeColorById = buildSmelterTypeColorMap(factoryTypeRows)

    const points: MapPoint[] = []

    for (const row of whRows) {
      if (!activeRow(row)) continue
      const title = warehouseLabel(row) || '库房'
      const id = warehouseId(row)
      const subtitle = addressText(row).trim()
      const pinColor = resolveWarehousePinColor(row, typeColorById)
      const coord = pickLatLng(row)

      if (coord) {
        points.push({
          kind: 'warehouse',
          id,
          title,
          subtitle,
          lat: coord[0],
          lng: coord[1],
          pinColor,
          raw: row,
        })
      }
    }

    for (const row of smRows) {
      if (!activeRow(row)) continue
      const title = smelterLabel(row) || '冶炼厂'
      const id = smelterId(row)
      const subtitle = addressText(row).trim()
      const pinColor = resolveSmelterPinColor(row, smelterTypeColorById)
      const coord = pickLatLng(row)

      if (coord) {
        points.push({ kind: 'smelter', id, title, subtitle, lat: coord[0], lng: coord[1], pinColor, raw: row })
      }
    }

    if (seq !== markersLoadSeq) return

    if (!points.length) {
      loadError.value = '接口未返回可打点的库房或冶炼厂经纬度，请在业务系统补全坐标后刷新。'
    }
    renderMarkers(points, { preserveMapView: preserveWarehouseContext })
    writeEmapMarkersCache(points)

    if (savedWhId) {
      const wh = allWarehousePoints.value.find(
        (p) => p.kind === 'warehouse' && p.id === savedWhId,
      )
      if (wh) {
        selectedWarehouse.value = wh
        if (savedCenter != null && savedZoom != null && mapRef.value) {
          mapRef.value.setView(savedCenter, savedZoom, { animate: false })
        }
        refreshAllMarkerVisualState()
        refreshWarehouseMarkerLockInteractivity()
        if (shouldRerunComparison) {
          void runComparisonForWarehouse(wh)
        }
      }
    }
  } catch (e) {
    if (seq !== markersLoadSeq) return
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq === markersLoadSeq) {
      loading.value = false
      markersSyncing.value = false
    }
  }
}

function onManualRefreshMarkers() {
  void loadAndPlot('full')
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', onEmapFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onEmapFullscreenChange)
  await nextTick()
  initMap()
  const restored = restoreEmapMarkersFromCache()
  await loadAndPlot(restored ? 'silent' : 'full')
  void nextTick(() => {
    mapRef.value?.invalidateSize()
    clampMapToolsFloatInWrap()
  })
})

onBeforeUnmount(() => {
  if (emapPointSearchBlurTimer != null) {
    clearTimeout(emapPointSearchBlurTimer)
    emapPointSearchBlurTimer = null
  }
  teardownMapToolsDragListeners()
  document.removeEventListener('fullscreenchange', onEmapFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onEmapFullscreenChange)
  dismissGeoNearestToast()
  dismissComparisonPrereqToast()
  emapMapPopupCloseCaptureOff?.()
  stopEmapRankTipLayoutHandlers()
  cancelFlowOverlayAnimations()
  stopFlowAnimations()
  if (forecastTrendResizeHandler) {
    window.removeEventListener('resize', forecastTrendResizeHandler)
    forecastTrendResizeHandler = null
  }
  resizeObs?.disconnect()
  resizeObs = null
  try {
    mapRef.value?.stop()
    mapRef.value?.remove()
  } catch {
    /* ignore – container may already be gone */
  }
  mapRef.value = null
  warehouseMarkerById.clear()
  smelterMarkerById.clear()
  markerLayerRef.value = null
  flowLayerRef.value = null
  topTipLayerRef.value = null
  flowPathSvgRendererRef.value = null
})
</script>

<style scoped>
.emap-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px);
  min-height: 420px;
}

.emap-shell.emap-shell--dashboard:fullscreen {
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
}

.emap-shell.emap-shell--dashboard:-webkit-full-screen {
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
}

.emap-shell--dashboard {
  color: #e2e8f0;
  background:
    linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px),
    radial-gradient(ellipse 120% 70% at 50% -15%, rgba(14, 165, 233, 0.14), transparent 55%),
    radial-gradient(ellipse 60% 50% at 100% 80%, rgba(59, 130, 246, 0.08), transparent 45%),
    linear-gradient(180deg, #050b14 0%, #0a1628 42%, #060d18 100%);
  background-size: 28px 28px, 28px 28px, auto, auto, auto;
}

.emap-toolbar {
  margin: 12px 16px 0;
  padding: 14px 16px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 14px;
  background: rgba(6, 18, 40, 0.82);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.06) inset,
    0 12px 32px rgba(0, 0, 0, 0.45);
}

.emap-cmp-settings-bubble {
  position: absolute;
  top: 72px;
  left: 12px;
  z-index: 1002;
  cursor: default;
  padding: 6px;
}

.emap-cmp-settings-bubble--head {
  position: static;
  flex-direction: row;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
}

.emap-cmp-settings-head-btn {
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 2px;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.2;
}

.emap-cmp-settings-head-btn:hover {
  color: #f8fafc;
}

.emap-toolbar-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.emap-toolbar-collapse-btn {
  flex-shrink: 0;
  margin-top: 2px;
}

.emap-toolbar-heading-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emap-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.emap-toolbar-row--categories {
  align-items: flex-start;
  margin-bottom: 0;
}

.emap-toolbar-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.emap-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.emap-field-label {
  font-size: 11px;
  font-weight: 600;
  color: #7dd3fc;
  margin: 0;
  letter-spacing: 0.2px;
}

.emap-select {
  min-width: 132px;
}

.emap-cat-toolbar {
  flex: 1;
  min-width: 0;
}

.emap-cat-toolbar-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.emap-cat-toolbar-err {
  color: #fca5a5;
}

.emap-cat-toolbar-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  max-height: 120px;
  overflow-y: auto;
  padding: 6px 2px;
}

.emap-cat-toolbar-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.emap-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 5px 9px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(15, 40, 72, 0.95) 0%, rgba(8, 26, 52, 0.98) 100%);
  border: 1px solid rgba(56, 189, 248, 0.35);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #e2e8f0;
}

.emap-cat-pill:hover {
  border-color: #22d3ee;
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.25);
  transform: translateY(-1px);
}

.emap-cat-pill .form-check-input {
  margin: 0;
  flex-shrink: 0;
}

.emap-shell--dashboard .emap-cat-pill .emap-cat-name {
  color: #f1f5f9;
}

.emap-shell--dashboard .emap-cat-pill .form-check-input {
  border-width: 2px;
  border-color: rgba(125, 211, 252, 0.75);
}

.emap-cat-name {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emap-cat-tons {
  width: 4.5rem;
  flex-shrink: 0;
}

.emap-rank-scroll {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.emap-toolbar-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emap-toolbar-hint {
  line-height: 1.45;
}

/* 大屏下说明文字：接近参考图的白/浅灰主字，避免 text-muted 过暗 */
.emap-shell--dashboard .emap-toolbar-hint {
  color: #e2e8f0 !important;
}

.emap-shell--dashboard .emap-toolbar-hint strong {
  color: #f8fafc;
  font-weight: 700;
}

.emap-title {
  font-weight: 700;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  text-shadow: 0 0 24px rgba(34, 211, 238, 0.35);
}

.emap-map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  margin: 12px 16px 16px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(34, 211, 238, 0.32);
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.08) inset,
    0 16px 48px rgba(0, 0, 0, 0.5);
}

.emap-map-wrap::before,
.emap-map-wrap::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: #22d3ee;
  border-style: solid;
  z-index: 5;
  pointer-events: none;
  opacity: 0.85;
}

.emap-map-wrap::before {
  top: 10px;
  left: 10px;
  border-width: 2px 0 0 2px;
}

.emap-map-wrap::after {
  bottom: 10px;
  right: 10px;
  border-width: 0 2px 2px 0;
}

.emap-map {
  width: 100%;
  height: 100%;
  background: #0a1628;
}

.emap-wh-selection-lock {
  position: absolute;
  top: 10px;
  right: 56px;
  left: auto;
  transform: none;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100% - 24px));
  padding: 4px 8px 4px 10px;
  background: rgba(6, 18, 40, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.emap-wh-selection-lock-label {
  font-size: 12px;
  color: #cbd5e1;
  max-width: min(200px, 42vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emap-wh-selection-lock-btn {
  font-size: 11px;
  padding: 2px 8px;
  line-height: 1.35;
  white-space: nowrap;
  flex-shrink: 0;
}

.emap-floating-actions {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: min(520px, calc(100% - 24px));
  box-sizing: border-box;
  background: rgba(6, 18, 40, 0.88);
  border: 1px solid rgba(34, 211, 238, 0.28);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 9px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.emap-floating-actions-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.emap-floating-actions-err {
  line-height: 1.4;
  word-break: break-word;
}

.emap-map-tools-float {
  position: absolute;
  /* 高于 Leaflet 控件层 (约 1000)，避免事件被地图挡住 */
  z-index: 10050;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: auto;
  touch-action: none;
  max-width: calc(100% - 10px);
  box-sizing: border-box;
  /* 限高时仍可滚轮滚动，但不显示整列外侧滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.emap-map-tools-float::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* 靠上锚定 + 限高：内容变高时不再整体上移盖住「按省筛选」；过长时整列滚动 */
.emap-map-tools-float--default {
  right: 0;
  top: 12px;
  transform: none;
  max-height: calc(100% - 12px - 76px);
  overflow-x: hidden;
  overflow-y: auto;
}

.emap-map-tools-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  padding: 8px 6px 10px;
  border-radius: 999px;
  background: rgba(6, 18, 40, 0.94);
  border: 1px solid rgba(34, 211, 238, 0.4);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.emap-map-tools-bubble:active {
  cursor: grabbing;
}

.emap-map-tools-drag-hint {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(34, 211, 238, 0.45);
  border-radius: 50%;
  color: #7dd3fc;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.92;
  pointer-events: none;
}

.emap-map-tools {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: min(268px, 100%);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background: rgba(6, 18, 40, 0.9);
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  padding: 8px 10px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45);
  font-size: 12px;
  overflow: visible;
  color: #cbd5e1;
}

.emap-map-tools-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin: -4px -4px 6px;
  padding: 4px 6px;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  border: 1px dashed rgba(34, 211, 238, 0.28);
}

.emap-map-tools-head:active {
  cursor: grabbing;
}

.emap-map-tools-title {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  color: #f1f5f9;
}

.emap-map-tools-collapse {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: -2px -6px -2px 6px;
  padding: 0;
  border: 1px solid rgba(34, 211, 238, 0.5);
  border-radius: 8px;
  background: rgba(8, 26, 52, 0.9);
  color: #7dd3fc;
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.emap-map-tools-collapse:hover {
  background: rgba(34, 211, 238, 0.2);
  color: #f8fafc;
  border-color: rgba(34, 211, 238, 0.65);
}

.emap-map-tools-tab {
  position: relative;
  border: 1px solid rgba(34, 211, 238, 0.35);
  background: rgba(8, 26, 52, 0.92);
  color: #e2e8f0;
  padding: 10px 8px;
  border-radius: 999px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.emap-map-tools-tab:hover {
  background: rgba(12, 36, 68, 0.95);
}

/* 按省筛选：右侧列表（与地图工具同列，不占左侧比价/预测区） */
.emap-province-facilities {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: min(268px, 100%);
  box-sizing: border-box;
  background: rgba(6, 18, 40, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  color: #cbd5e1;
  font-size: 12px;
}

.emap-province-facilities-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: rgba(8, 26, 52, 0.65);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.35;
}

.emap-province-facilities-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.emap-province-facilities-chevron {
  flex-shrink: 0;
  color: #7dd3fc;
  font-size: 1rem;
}

.emap-province-facilities-head:hover {
  background: rgba(12, 36, 68, 0.85);
}

.emap-province-facilities-title {
  font-weight: 700;
  color: #f1f5f9;
  min-width: 0;
  word-break: break-word;
}

.emap-province-facilities-meta {
  font-size: 10px;
  color: #94a3b8;
}

/* 固定列表区高度，避免随条数撑高整列、压住全屏与上方工具 */
.emap-province-facilities-body {
  height: 236px;
  max-height: 236px;
  overflow-y: auto;
  padding: 0 8px 8px;
  border-top: 1px solid rgba(34, 211, 238, 0.15);
}

.emap-province-facilities-section {
  margin-top: 8px;
}

.emap-province-facilities-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 8px;
  background: rgba(8, 26, 52, 0.75);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.emap-province-facilities-section-toggle:hover {
  border-color: rgba(34, 211, 238, 0.45);
  color: #f1f5f9;
}

.emap-province-facilities-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
}

.emap-province-facilities-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  margin-bottom: 4px;
  border: none;
  border-radius: 6px;
  background: rgba(15, 39, 72, 0.55);
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1.35;
  cursor: pointer;
}

.emap-province-facilities-item:hover {
  background: rgba(59, 130, 246, 0.35);
}

.emap-province-facilities-item-title {
  font-weight: 600;
  color: #f8fafc;
  word-break: break-word;
}

.emap-province-facilities-item-sub {
  margin-top: 2px;
  font-size: 10px;
  color: #94a3b8;
  word-break: break-word;
}

.emap-province-facilities-empty {
  padding: 8px 6px;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}

.emap-tools-slide-enter-active,
.emap-tools-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.emap-tools-slide-enter-from,
.emap-tools-slide-leave-to {
  transform: translateX(14px);
  opacity: 0;
}

.emap-tools-slide-enter-to,
.emap-tools-slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.emap-tool-check {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  color: #cbd5e1;
}

.emap-tool-check .form-check-input {
  margin: 0;
}

.emap-tool-coord {
  font-size: 11px;
  line-height: 1.35;
  word-break: break-all;
}

.emap-tool-block {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(34, 211, 238, 0.18);
}

.emap-tool-block-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
}

.emap-tool-search-wrap {
  position: relative;
  z-index: 2;
}

.emap-tool-search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.emap-tool-search-row .form-control {
  min-width: 0;
}

.emap-point-search-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  max-height: 240px;
  overflow-y: auto;
  background: rgba(6, 18, 40, 0.98);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  z-index: 4;
}

.emap-point-search-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid rgba(34, 211, 238, 0.12);
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.35;
}

.emap-point-search-item:last-child {
  border-bottom: none;
}

.emap-point-search-item:hover,
.emap-point-search-item--active {
  background: rgba(59, 130, 246, 0.35);
}

.emap-point-search-item-title {
  font-weight: 600;
  color: #f1f5f9;
}

.emap-point-search-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 3px;
  font-size: 10px;
  color: #94a3b8;
}

.emap-point-search-item-kind {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(34, 211, 238, 0.15);
  color: #7dd3fc;
}

.emap-point-search-item-sub {
  min-width: 0;
  word-break: break-all;
}

.emap-point-search-empty {
  padding: 10px;
  font-size: 11px;
  color: #94a3b8;
}

.emap-tool-hint {
  font-size: 10px;
  line-height: 1.35;
  margin-top: 4px !important;
}

.emap-geo-nearest-toast {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1100;
  max-width: min(360px, calc(100% - 28px));
  padding: 10px 40px 10px 12px;
  background: rgba(6, 18, 40, 0.96);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 10px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
  word-break: break-word;
}

.emap-geo-nearest-toast-close {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emap-geo-nearest-toast-close:hover {
  color: #f1f5f9;
  background: rgba(34, 211, 238, 0.12);
}

.emap-geo-nearest-toast-body {
  margin: 0;
}

/* 静默同步：底边轻提示，不遮罩地图 */
.emap-markers-sync-hint {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 1090;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.35;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(34, 211, 238, 0.28);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  max-width: min(420px, calc(100% - 32px));
}

.emap-markers-sync-hint-spin {
  flex-shrink: 0;
  border-width: 2px;
}

/* 非模态：仅占地图顶部一条，不挡点击 */
.emap-comparison-prereq-toast {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  z-index: 1150;
  max-width: min(300px, calc(100% - 24px));
  padding: 7px 34px 7px 10px;
  background: rgba(6, 18, 40, 0.94);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

.emap-comparison-prereq-toast-close {
  position: absolute;
  top: 2px;
  right: 4px;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emap-comparison-prereq-toast-close:hover {
  color: #f1f5f9;
  background: rgba(34, 211, 238, 0.12);
}

.emap-comparison-prereq-toast-msg {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: #e2e8f0;
  word-break: break-word;
}

.emap-cmp-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  width: min(920px, calc(100% - 24px));
  max-height: min(70vh, calc(100% - 132px));
  background: rgba(6, 18, 40, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.3);
  backdrop-filter: blur(14px);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  padding: 10px 12px;
  overflow: auto;
  color: #e2e8f0;
}

/* 仅保留标题栏时收窄宽度，避免仍占满 720px */
.emap-cmp-panel.emap-cmp-panel--compact {
  width: fit-content;
  max-width: min(420px, calc(100% - 24px));
  overflow: hidden;
}

.emap-cmp-panel.emap-cmp-panel--compact .emap-cmp-panel-head {
  margin-bottom: 0;
}

.emap-cmp-panel.emap-cmp-panel--compact .emap-cmp-panel-title {
  flex: 0 1 auto;
  max-width: min(220px, calc(100vw - 200px));
}

.emap-cmp-panel.emap-cmp-panel--distance {
  width: min(560px, calc(100% - 24px));
  max-width: min(560px, calc(100% - 24px));
}

.emap-wh-dist-section {
  margin-top: 2px;
}

.emap-wh-dist-loading {
  text-align: center;
  padding: 20px 8px;
  font-size: 13px;
}

.emap-wh-dist-table-wrap {
  max-height: min(52vh, 420px);
  overflow: auto;
}

.emap-wh-dist-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.emap-wh-dist-locate {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(34, 211, 238, 0.4);
  border-radius: 6px;
  background: rgba(8, 26, 52, 0.85);
  color: #7dd3fc;
  cursor: pointer;
  line-height: 1;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.emap-wh-dist-locate:hover {
  background: rgba(12, 36, 68, 0.95);
  border-color: #22d3ee;
  color: #e0f2fe;
}

.emap-wh-dist-locate .bi {
  font-size: 14px;
}

.emap-wh-dist-name-text {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  line-height: 1.4;
  padding-top: 3px;
}

.emap-wh-dist-table tr.emap-wh-dist-row--focus {
  background: rgba(34, 211, 238, 0.12) !important;
}

.emap-wh-dist-table tr.emap-wh-dist-row--focus .emap-wh-dist-locate {
  border-color: #22d3ee;
  color: #e0f2fe;
  background: rgba(14, 116, 144, 0.35);
}

.emap-wh-dist-table .emap-wh-dist-col-name {
  min-width: 10em;
  max-width: 16em;
}

.emap-wh-dist-table .emap-wh-dist-col-km {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.emap-cmp-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.emap-cmp-panel-head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.emap-cmp-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emap-cmp-panel-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emap-cmp-panel-toggle {
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 6px;
  background: rgba(8, 26, 52, 0.9);
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1;
  padding: 6px 8px;
  cursor: pointer;
}

.emap-cmp-panel-toggle:hover {
  background: rgba(12, 36, 68, 0.95);
  border-color: #22d3ee;
}

.emap-cmp-panel-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 26px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
}

.emap-cmp-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}

.emap-cmp-summary-card {
  background: linear-gradient(180deg, rgba(12, 36, 68, 0.95) 0%, rgba(6, 22, 48, 0.98) 100%);
  border: 1px solid rgba(56, 189, 248, 0.28);
  border-radius: 8px;
  padding: 6px 8px;
  min-width: 0;
}

.emap-cmp-summary-label {
  font-size: 10px;
  line-height: 1.25;
  color: #7dd3fc;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emap-cmp-summary-value {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 固定列宽：厂名可省略；金额列保证完整显示（列多时允许横向滚动） */
.emap-cmp-table-wrap {
  max-height: none;
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 8px;
}

.emap-cmp-table {
  width: 100%;
  min-width: 880px;
  table-layout: fixed;
  font-size: 11px;
}

.emap-cmp-forecast {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(34, 211, 238, 0.24);
  border-radius: 10px;
  background: rgba(8, 26, 52, 0.56);
}

.emap-cmp-forecast-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.emap-cmp-forecast-title {
  font-size: 13px;
  font-weight: 700;
  color: #7dd3fc;
}

.emap-cmp-forecast-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 固定列宽：厂名省略；金额列完整显示 */
.emap-cmp-table th,
.emap-cmp-table td {
  text-align: center;
  vertical-align: middle;
  padding-left: 6px;
  padding-right: 6px;
  min-width: 0;
}

.emap-cmp-table .emap-cmp-col-rank {
  width: 3rem;
  white-space: nowrap;
  vertical-align: middle;
}

/** 排名数字 + 循融宝时右上角圈「循」 */
.emap-cmp-rank-wrap {
  position: relative;
  display: inline-block;
  padding: 2px 10px 0 0;
  min-height: 1.1em;
}

.emap-cmp-rank-num {
  display: inline-block;
}

.emap-cmp-xrb-on-rank {
  position: absolute;
  top: -5px;
  right: -2px;
  width: 15px;
  height: 15px;
  box-sizing: border-box;
  font-size: 9px;
  font-weight: 600;
  line-height: 13px;
  text-align: center;
  border-radius: 50%;
  color: #e0f2fe;
  background: rgba(14, 165, 233, 0.35);
  border: 1px solid rgba(56, 189, 248, 0.75);
  cursor: default;
  user-select: none;
}

.emap-cmp-table .emap-cmp-col-smelter {
  width: 13%;
  max-width: 0;
}

.emap-cmp-table .emap-cmp-col-unit {
  width: 8%;
  font-size: 11px;
}

.emap-cmp-table .emap-cmp-col-cats {
  width: 16%;
  vertical-align: middle;
  padding-top: 6px;
  padding-bottom: 6px;
  text-align: left;
}

.emap-cmp-table .emap-cmp-col-money {
  width: 10%;
  min-width: 4.75rem;
  overflow: visible;
}

.emap-cmp-table td.emap-cmp-col-money,
.emap-cmp-table th.emap-cmp-col-money {
  overflow: visible;
}

.emap-cmp-col-money .emap-cmp-cell-truncate {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.emap-cmp-cell-truncate {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  text-align: center;
}

.emap-cmp-col-smelter .emap-cmp-cell-truncate {
  text-align: center;
}

.emap-cmp-cell-truncate:focus-visible {
  outline: 2px solid rgba(34, 211, 238, 0.65);
  outline-offset: 1px;
}

.emap-cmp-cats-clip {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  max-height: 2.9em;
  line-height: 1.45;
  word-break: break-word;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
}

.emap-cmp-cell-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 12050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 8, 20, 0.55);
  backdrop-filter: blur(4px);
}

.emap-cmp-cell-detail-card {
  width: min(520px, calc(100vw - 40px));
  max-height: min(70vh, 560px);
  display: flex;
  flex-direction: column;
  background: rgba(10, 24, 48, 0.98);
  border: 1px solid rgba(34, 211, 238, 0.4);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
  color: #e2e8f0;
}

.emap-cmp-cell-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(34, 211, 238, 0.22);
}

.emap-cmp-cell-detail-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  min-width: 0;
}

.emap-cmp-cell-detail-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 24px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  border-radius: 6px;
}

.emap-cmp-cell-detail-close:hover {
  color: #f1f5f9;
  background: rgba(34, 211, 238, 0.12);
}

.emap-cmp-cell-detail-body {
  padding: 14px 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
  min-height: 0;
}

.emap-cmp-cell-detail-foot {
  padding: 10px 14px 12px;
  border-top: 1px solid rgba(34, 211, 238, 0.18);
  display: flex;
  justify-content: flex-end;
}

.emap-cmp-table td.emap-cmp-table-empty {
  white-space: normal;
  max-width: none;
}

.emap-side-card {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  width: 340px;
  max-width: calc(100% - 24px);
  background: rgba(6, 18, 40, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  font-size: 12px;
  color: #e2e8f0;
}

.emap-side-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #f1f5f9;
}

.emap-side-line {
  margin-bottom: 6px;
  word-break: break-all;
}

.emap-side-actions {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  flex-wrap: wrap;
}

.emap-side-block {
  margin-top: 8px;
}

.emap-side-subtitle {
  font-weight: 600;
  margin-bottom: 4px;
}

.emap-rank-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.emap-side-error {
  margin-top: 8px;
  color: #fca5a5;
}

.emap-fc-modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 8, 18, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.emap-fc-modal-content {
  background: linear-gradient(180deg, #0c1a30 0%, #081424 100%);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 12px;
  width: min(720px, 96vw);
  max-width: 96%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.55);
  color: #e2e8f0;
}

.emap-fc-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(34, 211, 238, 0.2);
}

.emap-fc-modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.emap-fc-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #94a3b8;
  padding: 0 4px;
}

.emap-fc-close-btn:hover {
  color: #e2e8f0;
}

.emap-fc-modal-body {
  padding: 20px;
}

.emap-fc-chart-wrap {
  position: relative;
  width: 100%;
  min-height: 300px;
  margin-bottom: 16px;
}

.emap-fc-chart-wrap canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.emap-chart-tooltip {
  position: absolute;
  z-index: 10;
  pointer-events: none;
  padding: 7px 11px;
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.emap-chart-tooltip-date {
  color: #64748b;
  font-size: 11px;
  margin-bottom: 1px;
}

.emap-chart-tooltip-price {
  font-weight: 600;
  font-size: 13px;
  color: #e2e8f0;
}

.emap-fc-chart-empty {
  padding: 48px 16px;
  text-align: center;
  font-size: 14px;
  color: #94a3b8;
}

.emap-fc-chart-meta {
  background: rgba(8, 26, 52, 0.75);
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.emap-fc-chart-meta p {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}

.emap-fc-chart-meta strong {
  color: #7dd3fc;
  margin-right: 6px;
}

.emap-fc-analysis {
  background: rgba(8, 26, 52, 0.75);
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.emap-fc-analysis-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.emap-fc-analysis-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.emap-fc-analysis-hint {
  font-size: 11px;
  white-space: nowrap;
}

.emap-fc-analysis-scroll {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.emap-fc-analysis-row {
  display: grid;
  grid-template-columns: 52px 72px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(34, 211, 238, 0.12);
  border-radius: 6px;
  background: rgba(6, 18, 40, 0.65);
  color: #cbd5e1;
  font-size: 11px;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
}

.emap-fc-analysis-row:hover {
  border-color: rgba(34, 211, 238, 0.35);
  background: rgba(10, 28, 56, 0.85);
}

.emap-fc-analysis-date {
  color: #22d3ee;
  font-weight: 600;
}

.emap-fc-analysis-weight {
  color: #94a3b8;
  white-space: nowrap;
}

.emap-fc-analysis-snippet {
  color: #e2e8f0;
  word-break: break-word;
}

.emap-fc-analysis-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.emap-fc-analysis-badge--高 { background: #166534; color: #bbf7d0; }
.emap-fc-analysis-badge--中 { background: #1e40af; color: #bfdbfe; }
.emap-fc-analysis-badge--低 { background: #9a3412; color: #fed7aa; }

.emap-fc-analysis-confidence {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.emap-fc-chart-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.emap-fc-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(34, 211, 238, 0.2);
  text-align: right;
}

.emap-map-corner {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: min(280px, calc(100vw - 24px));
}

.emap-legend {
  background: rgba(6, 18, 40, 0.9);
  border: 1px solid rgba(34, 211, 238, 0.28);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
  color: #e2e8f0;
  width: 100%;
}

.emap-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emap-legend-item--toggle {
  display: grid;
  grid-template-columns: 18px 14px 1fr;
  align-items: center;
  gap: 6px;
}

.emap-legend-item--toggle .emap-legend-dot,
.emap-legend-item--toggle .emap-legend-tri {
  justify-self: center;
}

.emap-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 1px solid rgba(34, 211, 238, 0.5);
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.45);
}

.emap-legend-dot--wh {
  background: #38bdf8;
}

.emap-legend-tri {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 12px solid #fb923c;
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.55));
}

.emap-legend-stats {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(34, 211, 238, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(200px, 32vh);
  overflow-y: auto;
}

.emap-legend-stats-title {
  font-size: 11px;
  font-weight: 600;
  color: #7dd3fc;
  letter-spacing: 0.02em;
}

.emap-legend-stats-total {
  font-weight: 500;
  color: #94a3b8;
}

.emap-legend-stat-row {
  display: grid;
  grid-template-columns: 18px 14px 1fr auto;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  line-height: 1.35;
  color: #cbd5e1;
}

.emap-legend-eye-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emap-legend-eye-btn:hover {
  color: #e2e8f0;
}

.emap-legend-stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 1px solid rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.emap-legend-stat-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emap-legend-stat-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #f1f5f9;
}

.emap-fs-btn {
  flex-shrink: 0;
  border: 1px solid rgba(34, 211, 238, 0.45);
  background: rgba(8, 26, 52, 0.95);
  color: #e0f2fe;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.emap-fs-btn:hover {
  background: rgba(14, 116, 144, 0.55);
  border-color: #22d3ee;
  color: #f0f9ff;
}

.emap-alert-dashboard {
  background: rgba(120, 53, 15, 0.35);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fde68a;
}

.emap-shell--dashboard :deep(.form-select),
.emap-shell--dashboard :deep(.form-control) {
  background-color: rgba(8, 22, 44, 0.92);
  border-color: rgba(56, 189, 248, 0.35);
  color: #e2e8f0;
}

.emap-shell--dashboard :deep(.form-select:focus),
.emap-shell--dashboard :deep(.form-control:focus) {
  border-color: #22d3ee;
  box-shadow: 0 0 0 0.2rem rgba(34, 211, 238, 0.2);
}

.emap-shell--dashboard :deep(.table) {
  --bs-table-bg: transparent;
  --bs-table-color: #f1f5f9;
  /* BS 5.3 斑马纹行单独用 striped-color，不设则仍为深色字 */
  --bs-table-striped-color: #f1f5f9;
  --bs-table-striped-bg: rgba(34, 211, 238, 0.08);
  --bs-table-active-color: #f8fafc;
  --bs-table-active-bg: rgba(34, 211, 238, 0.14);
  --bs-table-hover-color: #f8fafc;
  --bs-table-hover-bg: rgba(34, 211, 238, 0.12);
  border-color: rgba(34, 211, 238, 0.2);
  color: #f1f5f9;
}

.emap-shell--dashboard :deep(.table thead th) {
  color: #f8fafc;
  font-weight: 600;
}

.emap-shell--dashboard :deep(.table tbody td) {
  color: #f1f5f9;
}

.emap-shell--dashboard :deep(.table tbody td.text-success) {
  color: #4ade80 !important;
}

.emap-shell--dashboard :deep(.table > :not(caption) > * > *) {
  border-bottom-color: rgba(34, 211, 238, 0.15);
}

/* 全局说明灰字：大屏上提亮（含品类行小字、坐标、空状态等） */
.emap-shell--dashboard :deep(.text-muted) {
  color: #a8c4dc !important;
}

.emap-shell--dashboard :deep(.btn-primary) {
  background: linear-gradient(180deg, #0891b2 0%, #0e7490 100%);
  border-color: rgba(34, 211, 238, 0.55);
  color: #f0fdfa;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.25);
}

.emap-shell--dashboard :deep(.btn-primary:hover) {
  background: linear-gradient(180deg, #06b6d4 0%, #0891b2 100%);
  border-color: #22d3ee;
}

.emap-shell--dashboard :deep(.btn-secondary) {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(148, 163, 184, 0.45);
  color: #e2e8f0;
}

.emap-shell--dashboard :deep(.btn-secondary:hover) {
  background: rgba(51, 65, 85, 0.95);
  border-color: #94a3b8;
  color: #f8fafc;
}

.emap-shell--dashboard :deep(.btn-success) {
  background: linear-gradient(180deg, #059669 0%, #047857 100%);
  border-color: rgba(52, 211, 153, 0.5);
  color: #ecfdf5;
}

.emap-shell--dashboard :deep(.btn-outline-secondary) {
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.4);
}

.emap-shell--dashboard :deep(.btn-outline-secondary:hover) {
  background: rgba(51, 65, 85, 0.75);
  border-color: #94a3b8;
  color: #f8fafc;
}

.emap-shell--dashboard :deep(.btn-outline-primary) {
  color: #7dd3fc;
  border-color: rgba(56, 189, 248, 0.55);
  background: rgba(8, 26, 52, 0.5);
}

.emap-shell--dashboard :deep(.btn-outline-primary:hover) {
  background: rgba(14, 116, 144, 0.45);
  border-color: #22d3ee;
  color: #f0f9ff;
}

.emap-shell--dashboard :deep(.btn-outline-success) {
  color: #6ee7b7;
  border-color: rgba(52, 211, 153, 0.5);
  background: rgba(6, 40, 32, 0.35);
}

.emap-shell--dashboard :deep(.btn-outline-success:hover) {
  background: rgba(6, 78, 59, 0.55);
  border-color: #34d399;
  color: #ecfdf5;
}

.emap-shell--dashboard :deep(.btn-outline-dark) {
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.35);
}

.emap-shell--dashboard :deep(.btn-outline-dark:hover) {
  background: rgba(51, 65, 85, 0.65);
  border-color: #cbd5e1;
  color: #fff;
}

.emap-shell--dashboard :deep(.btn-outline-info) {
  color: #c4b5fd;
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(15, 23, 42, 0.35);
}

.emap-shell--dashboard :deep(.btn-outline-info:hover) {
  background: rgba(76, 29, 149, 0.45);
  border-color: #a78bfa;
  color: #f5f3ff;
}

.emap-shell--dashboard :deep(.form-check-input) {
  background-color: rgba(8, 22, 44, 0.85);
  border-color: rgba(56, 189, 248, 0.45);
}

.emap-shell--dashboard :deep(.form-check-input:checked) {
  background-color: #0891b2;
  border-color: #22d3ee;
}

</style>

<style>
.emap-marker {
  background: transparent;
  border: none;
}

/* 与比价冶炼厂常驻 tip 相同：setLatLng 在目标库房 + direction/offset 轮询；紫色卡片 + Leaflet 三角指向锚点 */
.leaflet-tooltip.emap-wh-bind-dist-tip {
  padding: 0;
  background: rgba(88, 28, 135, 0.92);
  border: 1px solid rgba(216, 180, 254, 0.55);
  color: #fae8ff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.38);
  white-space: normal;
  box-sizing: border-box;
  /* 避免 content 上 min-width:0 等把盒宽压成极窄竖条 */
  min-width: 248px;
  max-width: min(300px, 92vw);
}

.leaflet-tooltip.emap-wh-bind-dist-tip .leaflet-tooltip-content-wrapper {
  padding: 0;
  background: transparent;
  border-radius: 10px;
  min-width: 248px;
  max-width: min(300px, 92vw);
  box-sizing: border-box;
}

.leaflet-tooltip.emap-wh-bind-dist-tip .leaflet-tooltip-content {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  min-width: 248px;
  max-width: min(300px, 92vw);
}

.leaflet-tooltip.emap-wh-bind-dist-tip.leaflet-tooltip-top:before {
  border-top-color: rgba(88, 28, 135, 0.92);
}

.leaflet-tooltip.emap-wh-bind-dist-tip.leaflet-tooltip-bottom:before {
  border-bottom-color: rgba(88, 28, 135, 0.92);
}

.leaflet-tooltip.emap-wh-bind-dist-tip.leaflet-tooltip-left:before {
  border-left-color: rgba(88, 28, 135, 0.92);
}

.leaflet-tooltip.emap-wh-bind-dist-tip.leaflet-tooltip-right:before {
  border-right-color: rgba(88, 28, 135, 0.92);
}

.emap-wh-bind-dist-tip-inner {
  font-size: 11px;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-head {
  display: flex;
  align-items: center;
  padding: 7px 10px 6px;
  border-bottom: 1px solid rgba(216, 180, 254, 0.22);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px 10px 0 0;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-km {
  display: inline-block;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #fdf4ff;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(216, 180, 254, 0.18);
  border: 1px solid rgba(233, 213, 255, 0.35);
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  color: #faf5ff;
  padding: 7px 10px 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 10px 9px;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-row {
  display: grid;
  grid-template-columns: minmax(2.8em, max-content) minmax(0, 1fr);
  column-gap: 5px;
  align-items: start;
  font-size: 10px;
  line-height: 1.4;
  min-width: 0;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-k {
  color: #d8b4fe;
  flex-shrink: 0;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-k::after {
  content: '：';
  color: #c4b5fd;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-v {
  color: #f5f3ff;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed rgba(216, 180, 254, 0.28);
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 5px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(216, 180, 254, 0.2);
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-metric-k {
  font-size: 9px;
  font-weight: 600;
  color: #d8b4fe;
  letter-spacing: 0.04em;
}

.emap-wh-bind-dist-tip-inner .emap-wh-bind-dist-metric-v {
  font-size: 12px;
  font-weight: 800;
  color: #fdf4ff;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.emap-marker--warehouse .emap-pin-inner {
  width: 13px;
  height: 13px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 1.5px solid #fff;
  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.25);
  margin: 2px;
}

.emap-marker--warehouse .emap-pin-inner--dimmed {
  opacity: 0.7;
  filter: saturate(0.55) brightness(1.35);
  border-color: rgba(255, 255, 255, 0.84);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}
.emap-marker--smelter .emap-smelter-tri {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 14px solid #c2410c;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.28));
}

.emap-marker--smelter .emap-smelter-tri--large {
  border-left-width: 16px;
  border-right-width: 16px;
  border-bottom-width: 28px;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.32));
}

.emap-marker--smelter .emap-smelter-tri--dimmed {
  opacity: 0.42;
  filter: saturate(0.5) brightness(1.35) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12));
}

.emap-popup {
  min-width: 0;
  max-width: 100%;
}

.emap-popup strong {
  font-size: 14px;
  display: block;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emap-popup-subtitle {
  display: block;
  margin-top: 4px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emap-popup--warehouse .emap-popup-type {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emap-popup--warehouse .emap-popup-type-label {
  color: #7dd3fc;
  font-weight: 500;
}

.emap-popup--warehouse .emap-popup-type-value {
  font-weight: 600;
}

.emap-flow-line {
  stroke-dasharray: 12 38;
  animation: emap-flow 0.85s linear infinite;
}

/* 比价流向：折线不参与命中，避免挡住仓库/冶炼厂图钉 */
.leaflet-container svg path[class*='emap-flow-line'] {
  pointer-events: none !important;
}

.leaflet-container svg path.emap-flow-line-base--best {
  filter: drop-shadow(0 0 4px rgba(5, 150, 105, 0.85));
}
.leaflet-container svg path.emap-flow-line-base--orange {
  filter: drop-shadow(0 0 3px rgba(234, 88, 12, 0.75));
}
.leaflet-container svg path.emap-flow-line-base--red {
  filter: drop-shadow(0 0 3px rgba(220, 38, 38, 0.78));
}
.leaflet-container svg path.emap-flow-line-base--third {
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.72));
}
.leaflet-container svg path.emap-flow-line-base--muted {
  filter: drop-shadow(0 0 2px rgba(148, 163, 184, 0.5));
}
.leaflet-container svg path.emap-flow-line--muted {
  animation: emap-flow 1.2s linear infinite;
}

/* 距离监测线：更显眼（加粗 + 高对比 + 光晕） */
.leaflet-container svg path.emap-wh-bind-line {
  stroke: #d8b4fe !important;
  stroke-width: 6 !important;
  stroke-opacity: 1 !important;
  filter: drop-shadow(0 0 2px rgba(192, 132, 252, 0.9)) drop-shadow(0 0 6px rgba(168, 85, 247, 0.6));
}

.leaflet-container .leaflet-marker:has(.emap-flow-mover-wrap) {
  pointer-events: none !important;
}

/* 流向箭头：与 iconAnchor 对齐，内容在 iconSize 框内几何居中 */
.leaflet-div-icon.emap-flow-mover-wrap {
  border: none !important;
  background: transparent !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box;
}

.leaflet-div-icon.emap-flow-mover-wrap > div {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 0;
  margin: 0;
  padding: 0;
}

.emap-flow-stagger-1 {
  animation-delay: -0.12s;
}
.emap-flow-stagger-2 {
  animation-delay: -0.24s;
}
.emap-flow-stagger-3 {
  animation-delay: -0.36s;
}
.emap-flow-stagger-4 {
  animation-delay: -0.48s;
}
.emap-flow-stagger-5 {
  animation-delay: -0.6s;
}

.emap-flow-arrow-triple {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 0;
  transform-origin: center center;
}

.emap-flow-arrow-triple > span {
  display: block;
  line-height: 1;
}

.emap-flow-mover--best {
  color: #059669;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.emap-flow-mover--orange {
  color: #ea580c;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.emap-flow-mover--red {
  color: #dc2626;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.emap-flow-mover--third {
  color: #3b82f6;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.35);
}
.emap-flow-mover--muted {
  color: #64748b;
  text-shadow: none;
}

.emap-flow-arrow-wrap {
  background: transparent;
  border: none;
}

.emap-flow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  text-shadow: 0 0 2px #fff, 0 0 2px #fff;
}

.emap-flow-arrow--3d {
  font-size: 14px;
  font-weight: 800;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.95),
    0 3px 6px rgba(0, 0, 0, 0.45),
    0 0 10px rgba(37, 99, 235, 0.35);
  filter: saturate(1.15);
  animation: emap-arrow-float 0.9s ease-in-out infinite;
}

.emap-rank-tip {
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  border: none;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  font-size: 11px;
  line-height: 1.35;
  padding: 6px 8px;
  pointer-events: none !important;
  overflow: visible;
}

.leaflet-tooltip.emap-rank-tip .leaflet-tooltip-content {
  margin: 0;
}

.emap-rank-tip-inner {
  position: relative;
  padding: 2px 28px 0 2px;
  min-width: 0;
}

.emap-rank-tip-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
  line-height: 1;
  border: 2px solid rgba(15, 23, 42, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

/* 与比价流向线 comparisonFlowPalette 主色一致：1 绿、2 橙、3 红；其余同 muted 灰白线 */
.emap-rank-tip-badge--r1 {
  background: linear-gradient(160deg, #6ee7b7 0%, #10b981 100%);
  border-color: rgba(6, 95, 70, 0.55);
  color: #064e3b;
}

.emap-rank-tip-badge--r2 {
  background: linear-gradient(160deg, #fdba74 0%, #f97316 100%);
  border-color: rgba(180, 83, 9, 0.55);
  color: #7c2d12;
}

.emap-rank-tip-badge--r3 {
  background: linear-gradient(160deg, #fca5a5 0%, #ef4444 100%);
  border-color: rgba(153, 27, 27, 0.5);
  color: #7f1d1d;
}

.emap-rank-tip-badge--muted {
  background: linear-gradient(165deg, rgba(248, 250, 252, 0.96) 0%, rgba(203, 213, 225, 0.92) 100%);
  border-color: rgba(100, 116, 139, 0.55);
  color: #334155;
}

.emap-rank-tip-body {
  min-width: 0;
}

.emap-rank-tip-name {
  font-weight: 600;
  margin-bottom: 3px;
  padding-right: 2px;
  word-break: break-word;
}

.leaflet-tooltip.emap-rank-tip--dim .emap-rank-tip-inner {
  padding-right: 22px;
}

.leaflet-tooltip.emap-rank-tip--dim .emap-rank-tip-badge {
  width: 18px;
  height: 18px;
  font-size: 9px;
  opacity: 0.92;
}

.leaflet-tooltip.emap-rank-tip--top3 {
  border: 1px solid rgba(34, 211, 238, 0.35);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.leaflet-tooltip.emap-rank-tip--dim {
  opacity: 0.5;
  font-size: 10px;
  padding: 4px 6px;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* 仓库/冶炼厂悬浮与点击弹窗：横向卡片；过长用省略号，不撑出框 */
.leaflet-tooltip.emap-marker-hover-tip {
  background: rgba(6, 18, 40, 0.96) !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(34, 211, 238, 0.35) !important;
  border-radius: 8px !important;
  padding: 8px 10px !important;
  font-size: 12px;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  white-space: normal !important;
  max-width: min(280px, 85vw);
  overflow: hidden;
  box-sizing: border-box;
}

.leaflet-tooltip.emap-marker-hover-tip:has(.emap-wh-hover-tip) {
  max-width: none;
  width: auto;
  padding: 6px 8px !important;
}

/* 库房信息卡片：宽度定标，高度不超过 16:9 对应高度（内容少则盒子变矮）；同行标签+值、双列指标提高利用率 */
.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-tip,
.leaflet-popup-content .emap-wh-hover-tip {
  --emap-wh-w: min(520px, calc(100vw - 36px));
  box-sizing: border-box;
  width: var(--emap-wh-w);
  max-width: 100%;
  overflow: hidden;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-inner,
.leaflet-popup-content .emap-wh-hover-inner {
  box-sizing: border-box;
  padding: 6px 8px;
  max-height: calc(var(--emap-wh-w) * 18 / 16);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-row,
.leaflet-popup-content .emap-wh-hover-row {
  display: grid;
  grid-template-columns: minmax(5em, max-content) minmax(0, 1fr);
  column-gap: 6px;
  align-items: start;
  font-size: 11px;
  line-height: 1.35;
  min-width: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-dual,
.leaflet-popup-content .emap-wh-hover-dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 10px;
  min-width: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-metric,
.leaflet-popup-content .emap-wh-hover-metric {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 4px;
  align-items: baseline;
  font-size: 11px;
  line-height: 1.35;
  min-width: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-k,
.leaflet-popup-content .emap-wh-hover-k {
  color: #94a3b8;
  flex-shrink: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-k::after,
.leaflet-popup-content .emap-wh-hover-k::after {
  content: '：';
  color: #64748b;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-v,
.leaflet-popup-content .emap-wh-hover-v {
  color: #e2e8f0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight,
.leaflet-popup-content .emap-wh-hover-freight {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex-shrink: 1;
  min-height: 0;
}


.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-head,
.leaflet-popup-content .emap-wh-hover-freight-head {
  font-size: 11px;
  line-height: 1.35;
  color: #94a3b8;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-head::after,
.leaflet-popup-content .emap-wh-hover-freight-head::after {
  content: '：';
  color: #64748b;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-scroll,
.leaflet-popup-content .emap-wh-hover-freight-scroll {
  max-height: none;
  overflow-y: visible;
  overflow-x: hidden;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-stock-block .emap-wh-hover-freight-scroll,
.leaflet-popup-content .emap-wh-stock-block .emap-wh-hover-freight-scroll {
  min-height: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-item,
.leaflet-popup-content .emap-wh-hover-freight-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  column-gap: 8px;
  align-items: start;
  font-size: 11px;
  line-height: 1.35;
  min-width: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-smelter,
.leaflet-popup-content .emap-wh-hover-freight-smelter {
  color: #e2e8f0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-freight-val,
.leaflet-popup-content .emap-wh-hover-freight-val {
  color: #cbd5e1;
  white-space: nowrap;
  flex-shrink: 0;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-date,
.leaflet-popup-content .emap-wh-hover-date {
  font-size: 10px;
  color: #94a3b8;
  margin-left: 4px;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-wh-hover-date-line,
.leaflet-popup-content .emap-wh-hover-date-line {
  grid-column: 1 / -1;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.3;
}

.leaflet-tooltip.emap-marker-hover-tip .leaflet-tooltip-content {
  margin: 0;
  max-width: 100%;
  overflow: hidden;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-popup {
  max-width: 100%;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-popup strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  word-break: normal;
}

.leaflet-tooltip.emap-marker-hover-tip .emap-popup-subtitle {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  word-break: normal;
}

/* 冶炼厂也用 .emap-popup-type，需与仓库同样 nowrap，否则 tooltip 按内容收缩会极窄 */
.leaflet-tooltip.emap-marker-hover-tip .emap-popup .emap-popup-type {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 6px 0;
}

.emap-shell--dashboard .leaflet-tooltip.emap-marker-hover-tip .text-muted {
  color: #94a3b8 !important;
}

/* 大屏主题：压暗瓦片、与面板色调统一（仅 .emap-shell--dashboard 内） */
.emap-shell--dashboard .leaflet-container {
  background: #0a1628;
}
.emap-shell--dashboard .leaflet-tile-pane {
  filter: brightness(0.58) contrast(1.08) saturate(0.72) hue-rotate(-6deg);
}

.emap-shell--dashboard .leaflet-popup-content-wrapper {
  background: rgba(6, 18, 40, 0.96);
  color: #e2e8f0;
  border: 1px solid rgba(34, 211, 238, 0.32);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  max-width: min(400px, calc(100vw - 32px));
}

.emap-shell--dashboard .leaflet-popup-content {
  box-sizing: border-box;
  max-width: min(380px, calc(100vw - 48px));
  margin: 10px 14px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.leaflet-popup-content:has(.emap-wh-hover-tip) {
  max-width: min(520px, calc(100vw - 48px)) !important;
  width: min(520px, calc(100vw - 48px)) !important;
  margin: 0;
  padding: 0;
}

.leaflet-popup-content-wrapper:has(.emap-wh-hover-tip) {
  max-width: min(520px, calc(100vw - 32px)) !important;
  width: min(520px, calc(100vw - 32px)) !important;
}

.emap-shell--dashboard .leaflet-popup-content:has(.emap-wh-hover-tip) {
  max-width: min(520px, calc(100vw - 48px));
  width: min(520px, calc(100vw - 48px));
  margin: 0;
  padding: 0;
}

.emap-shell--dashboard .leaflet-popup-content-wrapper:has(.emap-wh-hover-tip) {
  max-width: min(520px, calc(100vw - 32px));
  width: min(520px, calc(100vw - 32px));
}

.emap-shell--dashboard .leaflet-popup-tip {
  background: rgba(6, 18, 40, 0.96);
  border: 1px solid rgba(34, 211, 238, 0.25);
  box-shadow: none;
}

.emap-shell--dashboard .leaflet-popup-content .text-muted {
  color: #94a3b8 !important;
}

.emap-shell--dashboard .leaflet-popup-content a {
  color: #7dd3fc;
}

@keyframes emap-flow {
  0% {
    stroke-dashoffset: 50;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes emap-arrow-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-1px) scale(1.04);
  }
}
</style>
