<template>
  <div class="home-page">
    <!-- 卡片首页 -->
    <div v-if="!activePage" class="home-content">
      <div class="modules-grid">
        <!-- AI 定价分析 -->
        <div class="home-panel main-panel">
          <div class="home-panel-title">
            <i class="bi bi-graph-up-arrow me-1"></i>
            AI 定价分析
          </div>
          <div class="module-cards">
            <div class="module-card" @click="activePage = 'benchmarkAnalysis'">
              <div class="module-icon" style="background: #e8f0fe; color: #1a73e8;">
                <i class="bi bi-bar-chart-line"></i>
              </div>
              <div class="module-info">
                <h4>库房AI定价对标分析</h4>
                <p>基于 AI 算法对库房定价进行多维度对标分析</p>
              </div>
            </div>
            <div class="module-card" @click="activePage = 'selfPricing'">
              <div class="module-icon" style="background: #fef3e2; color: #e8860c;">
                <i class="bi bi-calculator"></i>
              </div>
              <div class="module-info">
                <h4>库房自有定价分析</h4>
                <p>基于成本、运费、毛利等数据的自有库房定价分析</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 基础配置 -->
        <div class="home-panel config-panel">
          <div class="home-panel-title">
            <i class="bi bi-gear me-1"></i>
            基础配置
          </div>
          <div class="module-cards">
            <div class="module-card" @click="activePage = 'cityBenchmark'">
              <div class="module-icon" style="background: #e6f4ea; color: #137333;">
                <i class="bi bi-geo-alt"></i>
              </div>
              <div class="module-info">
                <h4>对标城市定价</h4>
                <p>配置各对标城市的基准定价数据</p>
              </div>
            </div>
            <div class="module-card" @click="activePage = 'smelterPrice'">
              <div class="module-icon" style="background: #fce8e6; color: #c5221f;">
                <i class="bi bi-building"></i>
              </div>
              <div class="module-info">
                <h4>冶炼厂标定价格</h4>
                <p>管理各冶炼厂的标准定价信息</p>
              </div>
            </div>
            <div class="module-card" @click="activePage = 'marginManage'">
              <div class="module-icon" style="background: #f3e8fd; color: #8430ce;">
                <i class="bi bi-cash-stack"></i>
              </div>
              <div class="module-info">
                <h4>库房差价和毛利管理</h4>
                <p>库房差价设定与毛利数据管理</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 库房AI定价对标分析 -->
    <div v-else-if="activePage === 'benchmarkAnalysis'" class="sub-page">
      <div class="sub-page-header">
        <h3 class="sub-page-title">库房AI定价对标分析</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <div class="sub-page-body">
        <div class="table-toolbar">
          <div class="toolbar-filters">
            <select v-model="analysisFilterProvince" class="form-select filter-input">
              <option value="">全部省份</option>
              <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
            </select>
            <input
              v-model.trim="analysisFilterCity"
              class="form-control filter-input"
              placeholder="按城市筛选"
            />
            <input
              v-model.trim="analysisFilterCounty"
              class="form-control filter-input"
              placeholder="按县筛选"
            />
            <button class="btn filter-btn" @click="loadBenchmarkAnalysis">
              <i class="bi bi-search"></i>
              查询
            </button>
            <button class="btn filter-btn" @click="loadBenchmarkAnalysis" :disabled="analysisLoading">
              <i class="bi bi-arrow-clockwise"></i>
              重新计算
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table analysis-table">
            <thead>
              <tr>
                <th>省</th>
                <th>城市</th>
                <th>区</th>
                <th>库房名称</th>
                <th>对标城市</th>
                <th>对标城市定价</th>
                <th>冶炼厂标定价格</th>
                <th>运费</th>
                <th>对标城市差额</th>
                <th>毛利（配置版）</th>
                <th>毛利（计算版）</th>
                <th>库房定价</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="analysisLoading">
                <td colspan="12" class="text-center py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  加载中…
                </td>
              </tr>
              <tr v-else-if="analysisData.length === 0">
                <td colspan="12" class="text-center py-4 text-muted">暂无数据</td>
              </tr>
              <tr v-for="row in analysisData" :key="row.id">
                <td>{{ row.province }}</td>
                <td>{{ row.city }}</td>
                <td>{{ row.county }}</td>
                <td>{{ row.warehouse }}</td>
                <td>{{ row.benchmark_city || '-' }}</td>
                <td>{{ row.benchmark_price ? row.benchmark_price.toFixed(2) : '-' }}</td>
                <td>{{ row.calibrated_price ? row.calibrated_price.toFixed(2) : '-' }}</td>
                <td>{{ row.freight ? row.freight.toFixed(2) : '-' }}</td>
                <td>{{ row.benchmark_diff ? row.benchmark_diff.toFixed(2) : '-' }}</td>
                <td>{{ row.margin_config ? row.margin_config.toFixed(2) : '-' }}</td>
                <td>{{ row.margin_calculated ? row.margin_calculated.toFixed(2) : '-' }}</td>
                <td>{{ row.price ? row.price.toFixed(2) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="analysisTotal > analysisPageSize" class="table-pagination">
          <span class="pagination-info">共 {{ analysisTotal }} 条</span>
          <button class="page-btn" :disabled="analysisPage <= 1" @click="changeAnalysisPage(analysisPage - 1)">上一页</button>
          <span class="page-current">第 {{ analysisPage }} 页</span>
          <button class="page-btn" :disabled="analysisPage * analysisPageSize >= analysisTotal" @click="changeAnalysisPage(analysisPage + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 对标城市定价 -->
    <div v-else-if="activePage === 'cityBenchmark'" class="sub-page">
      <div class="sub-page-header">
        <div class="header-actions">
          <button class="btn add-btn" @click="openAddForm">
            <i class="bi bi-plus-lg me-1"></i>
            新增对标城市定价
          </button>
        </div>
        <h3 class="sub-page-title">对标城市定价</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <div class="sub-page-body">
        <div class="table-toolbar">
          <div class="toolbar-filters">
            <span v-if="regionLoadError" class="align-self-center text-warning small">{{ regionLoadError }}</span>
            <select v-model="filterProvince" class="form-select filter-input">
              <option value="">全部省份</option>
              <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
            </select>
            <select v-model="filterCity" class="form-select filter-input" title="先选省份可缩小城市范围">
              <option value="">全部城市</option>
              <option v-for="c in filterCityOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <input
              v-model="filterDate"
              type="date"
              class="form-control filter-input"
            />
            <button class="btn filter-btn" @click="loadCityBenchmarks">
              <i class="bi bi-search"></i>
              查询
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>省份</th>
                <th>对标城市</th>
                <th>定价</th>
                <th>日期</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tableLoading">
                <td colspan="5" class="text-center py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  加载中…
                </td>
              </tr>
              <tr v-else-if="tableData.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">暂无数据</td>
              </tr>
              <tr v-for="row in tableData" :key="row.id">
                <td>{{ row.province }}</td>
                <td>{{ row.city }}</td>
                <td>{{ row.price.toFixed(2) }}</td>
                <td>{{ row.date }}</td>
                <td class="col-actions">
                  <button class="action-btn action-edit" @click="openEditForm(row)">
                    <i class="bi bi-pencil-square"></i>
                    修改
                  </button>
                  <button class="action-btn action-delete" @click="handleDelete(row)">
                    <i class="bi bi-trash3"></i>
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="total > pageSize" class="table-pagination">
          <span class="pagination-info">共 {{ total }} 条</span>
          <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="page-current">第 {{ page }} 页</span>
          <button class="page-btn" :disabled="page * pageSize >= total" @click="changePage(page + 1)">下一页</button>
        </div>
      </div>

      <!-- 新增/编辑弹窗 -->
      <div v-if="showForm" class="form-mask" @click.self="showForm = false">
        <div class="form-card">
          <div class="form-card-header">
            <h6>{{ editingRow ? '修改对标城市定价' : '新增对标城市定价' }}</h6>
            <button class="form-close-btn" @click="showForm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <div class="form-field">
              <label class="form-label">省份</label>
              <select v-model="form.province" class="form-control">
                <option value="">请选择省份</option>
                <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">对标城市</label>
              <select v-model="form.city" class="form-control" :disabled="!form.province">
                <option value="">{{ form.province ? '请选择城市' : '请先选择省份' }}</option>
                <option v-for="c in formCityOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">定价</label>
              <input
                v-model.number="form.price"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                placeholder="请输入定价"
              />
            </div>
            <div class="form-field">
              <label class="form-label">日期</label>
              <input v-model="form.date" type="date" class="form-control" />
            </div>
            <div v-if="formError" class="alert alert-warning py-2 mb-2">{{ formError }}</div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showForm = false">取消</button>
            <button class="btn form-btn-submit" :disabled="formLoading" @click="submitForm">
              {{ formLoading ? '提交中…' : '确定' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 冶炼厂标定价格 -->
    <div v-else-if="activePage === 'smelterPrice'" class="sub-page">
      <div class="sub-page-header">
        <div class="header-actions" style="display:flex; gap:8px; flex-wrap: wrap;">
          <button class="btn add-btn add-btn--outline" @click="downloadSmelterImportTemplate">
            <i class="bi bi-download me-1"></i>
            下载模板
          </button>
          <button class="btn add-btn add-btn--outline" @click="triggerSmelterExcelImport">
            <i class="bi bi-upload me-1"></i>
            Excel 导入
          </button>
          <button class="btn add-btn" @click="openSmelterBatch">
            <i class="bi bi-list-ul me-1"></i>
            批量新增
          </button>
          <button class="btn add-btn" @click="openSmelterAdd">
            <i class="bi bi-plus-lg me-1"></i>
            新增
          </button>
          <button class="btn add-btn" @click="showHistory = true">
            <i class="bi bi-clock-history me-1"></i>
            历史记录
          </button>
        </div>
        <h3 class="sub-page-title">冶炼厂标定价格</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <input
        ref="smelterExcelFileInput"
        type="file"
        accept=".xlsx,.xlsm"
        style="display:none"
        @change="handleSmelterExcelImport"
      />
      <div class="sub-page-body">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>冶炼厂</th>
                <th>标定价格</th>
                <th>日期</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="smelterLoading">
                <td colspan="4" class="text-center py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  加载中…
                </td>
              </tr>
              <tr v-else-if="smelterData.length === 0">
                <td colspan="4" class="text-center py-4 text-muted">暂无数据</td>
              </tr>
              <tr v-for="row in smelterData" :key="row.id">
                <td>{{ row.smelter }}</td>
                <td>{{ row.price.toFixed(2) }}</td>
                <td>{{ row.date }}</td>
                <td class="col-actions">
                  <button class="action-btn action-edit" @click="openSmelterEdit(row)">
                    <i class="bi bi-pencil-square"></i>
                    修改
                  </button>
                  <button class="action-btn action-delete" @click="handleSmelterDelete(row)">
                    <i class="bi bi-trash3"></i>
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 修改价格弹窗 -->
      <div v-if="showSmelterForm" class="form-mask" @click.self="showSmelterForm = false">
        <div class="form-card">
          <div class="form-card-header">
            <h6>修改标定价格</h6>
            <button class="form-close-btn" @click="showSmelterForm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <div class="form-field">
              <label class="form-label">标定价格</label>
              <input
                v-model.number="smelterForm.price"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                placeholder="请输入标定价格"
              />
            </div>
            <div class="form-field">
              <label class="form-label">日期</label>
              <input v-model="smelterForm.date" type="date" class="form-control" />
            </div>
            <div v-if="smelterFormError" class="alert alert-warning py-2 mb-2">{{ smelterFormError }}</div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showSmelterForm = false">取消</button>
            <button class="btn form-btn-submit" :disabled="smelterFormLoading" @click="submitSmelterForm">
              {{ smelterFormLoading ? '提交中…' : '确定' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 新增标定价格弹窗 -->
      <div v-if="showSmelterAddForm" class="form-mask" @click.self="showSmelterAddForm = false">
        <div class="form-card">
          <div class="form-card-header">
            <h6>新增标定价格</h6>
            <button class="form-close-btn" @click="showSmelterAddForm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <div class="form-field">
              <label class="form-label">冶炼厂</label>
              <div class="search-select" ref="smelterSelectRef">
                <input
                  ref="smelterInputRef"
                  v-model.trim="smelterInputText"
                  class="form-control"
                  placeholder="下拉选择或直接输入冶炼厂名称"
                  @focus="openSmelterDropdown"
                  @input="showSmelterDropdown = true"
                />
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">标定价格</label>
              <input
                v-model.number="smelterAddForm.price"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                placeholder="请输入标定价格"
              />
            </div>
            <div class="form-field">
              <label class="form-label">日期</label>
              <input v-model="smelterAddForm.date" type="date" class="form-control" />
            </div>
            <div v-if="smelterAddError" class="alert alert-warning py-2 mb-2">{{ smelterAddError }}</div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showSmelterAddForm = false">取消</button>
            <button class="btn form-btn-submit" :disabled="smelterAddLoading" @click="submitSmelterAdd">
              {{ smelterAddLoading ? '提交中…' : '确定' }}
            </button>
          </div>
        </div>
        <Teleport to="body">
          <div
            v-if="showSmelterDropdown && filteredSmelterOptions.length"
            class="smelter-dropdown-portal"
            :style="smelterDropdownStyle"
          >
            <div class="search-select-options">
              <div
                v-for="s in filteredSmelterOptions"
                :key="s.id"
                class="search-select-item"
                :class="{ active: s.id === smelterAddForm.smelter_id }"
                @mousedown.prevent="selectSmelterOption(s)"
              >
                {{ s.name }}
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- 历史记录弹窗 -->
      <div v-if="showHistory" class="form-mask" @click.self="showHistory = false">
        <div class="form-card history-card">
          <div class="form-card-header">
            <h6>标定价格修改历史</h6>
            <button class="form-close-btn" @click="showHistory = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body" style="padding: 0;">
            <table class="data-table history-table">
              <thead>
                <tr>
                  <th>冶炼厂</th>
                  <th>标定价格</th>
                  <th>更改时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="historyLoading">
                  <td colspan="3" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    加载中…
                  </td>
                </tr>
                <tr v-else-if="historyData.length === 0">
                  <td colspan="3" class="text-center py-4 text-muted">暂无记录</td>
                </tr>
                <tr v-for="item in historyData" :key="item.id">
                  <td>{{ item.smelter }}</td>
                  <td>{{ item.price.toFixed(2) }}</td>
                  <td>{{ formatTime(item.change_time) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="historyTotal > historyPageSize" class="form-card-footer" style="justify-content: center;">
            <button class="page-btn" :disabled="historyPage <= 1" @click="changeHistoryPage(historyPage - 1)">上一页</button>
            <span class="page-current">第 {{ historyPage }} 页</span>
            <button class="page-btn" :disabled="historyPage * historyPageSize >= historyTotal" @click="changeHistoryPage(historyPage + 1)">下一页</button>
          </div>
        </div>
      </div>

      <!-- 批量新增弹窗 -->
      <div v-if="showSmelterBatchForm" class="form-mask" @click.self="showSmelterBatchForm = false">
        <div class="form-card history-card smelter-batch-card">
          <div class="form-card-header">
            <h6>批量新增标定价格</h6>
            <button class="form-close-btn" @click="showSmelterBatchForm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <p class="text-muted small mb-3">
              最多 500 条；任一条校验失败则整批不写入。定价日期留空时由后端使用当天。
            </p>
            <div class="table-wrap">
              <table class="data-table batch-table">
                <thead>
                  <tr>
                    <th style="min-width: 180px;">冶炼厂</th>
                    <th style="min-width: 120px;">标定价格</th>
                    <th style="min-width: 140px;">定价日期</th>
                    <th class="col-actions" style="width: 72px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in smelterBatchRows" :key="idx">
                    <td>
                      <select v-model.number="row.smelter_id" class="form-control form-control-sm">
                        <option :value="0">请选择冶炼厂</option>
                        <option v-for="s in smelterOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
                      </select>
                    </td>
                    <td>
                      <input
                        v-model.number="row.price"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control form-control-sm"
                        placeholder="标定价格"
                      />
                    </td>
                    <td>
                      <input v-model="row.date" type="date" class="form-control form-control-sm" />
                    </td>
                    <td class="col-actions">
                      <button
                        type="button"
                        class="action-btn action-delete"
                        :disabled="smelterBatchRows.length <= 1"
                        @click="removeSmelterBatchRow(idx)"
                      >
                        <i class="bi bi-trash3"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="btn add-btn add-btn--outline mt-2" :disabled="smelterBatchRows.length >= 500" @click="addSmelterBatchRow">
              <i class="bi bi-plus-lg me-1"></i>
              添加一行
            </button>
            <div v-if="smelterBatchError" class="alert alert-warning py-2 mt-2 mb-0">{{ smelterBatchError }}</div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showSmelterBatchForm = false">取消</button>
            <button class="btn form-btn-submit" :disabled="smelterBatchLoading" @click="submitSmelterBatch">
              {{ smelterBatchLoading ? '提交中…' : '提交' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Excel 导入结果 -->
      <div v-if="showSmelterImportResult" class="form-mask" @click.self="showSmelterImportResult = false">
        <div class="form-card history-card">
          <div class="form-card-header">
            <h6>Excel 导入结果</h6>
            <button class="form-close-btn" @click="showSmelterImportResult = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <p v-if="smelterImportResultMsg" class="mb-2">{{ smelterImportResultMsg }}</p>
            <div v-if="smelterImportResult" class="import-result-stats small text-muted mb-2">
              <span>工作表：{{ smelterImportResult.sheet }}</span>
              <span class="ms-2">解析 {{ smelterImportResult.parsed_rows }} 行</span>
              <span class="ms-2 text-success">成功 {{ smelterImportResult.inserted }} 条</span>
              <span v-if="smelterImportResult.skipped_errors" class="ms-2 text-warning">
                跳过 {{ smelterImportResult.skipped_errors }} 行
              </span>
            </div>
            <div v-if="smelterImportResult?.errors?.length" class="mb-3">
              <div class="fw-semibold small mb-1">失败行说明</div>
              <ul class="import-error-list small mb-0">
                <li v-for="(err, i) in smelterImportResult.errors" :key="i">{{ err }}</li>
              </ul>
            </div>
            <div v-if="smelterImportResult?.samples?.length">
              <div class="fw-semibold small mb-1">成功样例（最多 20 条）</div>
              <div class="table-wrap">
                <table class="data-table history-table">
                  <thead>
                    <tr>
                      <th>Excel 行</th>
                      <th>冶炼厂 id</th>
                      <th>标定价格</th>
                      <th>定价日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(s, i) in smelterImportResult.samples" :key="i">
                      <td>{{ s.Excel行 }}</td>
                      <td>{{ s.冶炼厂id }}</td>
                      <td>{{ s.标定价格 }}</td>
                      <td>{{ s.定价日期 }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-submit" @click="showSmelterImportResult = false">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 库房差价和毛利管理 -->
    <div v-else-if="activePage === 'marginManage'" class="sub-page">
      <div class="sub-page-header">
        <div class="header-actions" style="display:flex; gap:8px;">
          <button class="btn add-btn add-btn--outline" @click="triggerMarginImport">
            <i class="bi bi-upload me-1"></i>
            导入表格数据
          </button>
          <button class="btn add-btn" @click="openMarginAdd">
            <i class="bi bi-plus-lg me-1"></i>
            新增
          </button>
        </div>
        <h3 class="sub-page-title">库房差价和毛利管理</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <input ref="marginFileInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="handleMarginImport" />
      <div class="sub-page-body">
        <div class="table-toolbar">
          <div class="toolbar-filters">
            <select v-model="marginFilterProvince" class="form-select filter-input">
              <option value="">全部省份</option>
              <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
            </select>
            <select v-model="marginFilterCity" class="form-select filter-input" title="先选省份可缩小城市范围">
              <option value="">全部城市</option>
              <option v-for="c in marginFilterCityOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <button class="btn filter-btn" @click="() => loadMargins()">
              <i class="bi bi-search"></i>
              查询
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>省份</th>
                <th>城市</th>
                <th>库房名称</th>
                <th>对标城市</th>
                <th>对标城市差额</th>
                <th>毛利</th>
                <th>定价</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="marginLoading">
                <td colspan="8" class="text-center py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  加载中…
                </td>
              </tr>
              <tr v-else-if="marginData.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">暂无数据</td>
              </tr>
              <tr v-for="row in marginData" :key="row.id">
                <td>{{ row.province }}</td>
                <td>{{ row.city }}</td>
                <td>{{ row.warehouse_name }}</td>
                <td>{{ row.benchmark_city }}</td>
                <td>{{ row.benchmark_diff.toFixed(2) }}</td>
                <td>{{ row.margin.toFixed(2) }}</td>
                <td>{{ row.price.toFixed(2) }}</td>
                <td class="col-actions">
                  <button class="action-btn action-edit" @click="openMarginEdit(row)">
                    <i class="bi bi-pencil-square"></i>
                    修改
                  </button>
                  <button class="action-btn action-delete" @click="handleMarginDelete(row)">
                    <i class="bi bi-trash3"></i>
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="marginTotal > marginPageSize" class="table-pagination">
          <span class="pagination-info">共 {{ marginTotal }} 条</span>
          <button class="page-btn" :disabled="marginPage <= 1" @click="changeMarginPage(marginPage - 1)">上一页</button>
          <span class="page-current">第 {{ marginPage }} 页</span>
          <button class="page-btn" :disabled="marginPage * marginPageSize >= marginTotal" @click="changeMarginPage(marginPage + 1)">下一页</button>
        </div>
      </div>

      <!-- 新增/编辑弹窗 -->
      <div v-if="showMarginForm" class="form-mask" @click.self="showMarginForm = false">
        <div class="form-card">
          <div class="form-card-header">
            <h6>{{ marginEditing ? '修改库房差价和毛利' : '新增库房差价和毛利' }}</h6>
            <button class="form-close-btn" @click="showMarginForm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body">
            <div class="form-field">
              <label class="form-label">省份</label>
              <select v-model="marginForm.province" class="form-control" :disabled="!!marginEditing">
                <option value="">请选择省份</option>
                <option v-for="p in provinceOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">城市</label>
              <select v-model="marginForm.city" class="form-control" :disabled="!!marginEditing || !marginForm.province">
                <option value="">{{ marginForm.province ? '请选择城市' : '请先选择省份' }}</option>
                <option v-for="c in marginFormCityOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">库房名称</label>
              <div class="search-select" ref="warehouseSelectRef">
                <div
                  class="form-control search-select-trigger"
                  :class="{ 'is-disabled': !!marginEditing }"
                  @click="!marginEditing && toggleWarehouseDropdown()"
                >
                  <span v-if="marginForm.warehouse_name">{{ marginForm.warehouse_name }}</span>
                  <span v-else class="text-muted">请选择库房</span>
                  <i class="bi bi-chevron-down search-select-arrow" :class="{ open: showWarehouseDropdown }"></i>
                </div>
                <div v-if="showWarehouseDropdown" class="search-select-dropdown">
                  <div class="search-select-search">
                    <i class="bi bi-search"></i>
                    <input
                      ref="warehouseSearchInputRef"
                      v-model.trim="warehouseSearchQuery"
                      class="search-select-search-input"
                      placeholder="输入名称搜索…"
                      @mousedown.prevent
                    />
                  </div>
                  <div class="search-select-options">
                    <div v-if="warehouseSearchLoading" class="search-select-empty">
                      <span class="spinner-border spinner-border-sm me-1"></span>搜索中…
                    </div>
                    <template v-else>
                      <div
                        v-for="w in warehouseSearchResults"
                        :key="w.id"
                        class="search-select-item"
                        :class="{ active: w.name === marginForm.warehouse_name }"
                        @mousedown.prevent="selectWarehouse(w)"
                      >
                        {{ w.name }}
                      </div>
                      <div v-if="warehouseSearchQuery && !warehouseSearchResults.length" class="search-select-empty">无匹配库房</div>
                      <div v-if="!warehouseSearchQuery" class="search-select-empty">请输入关键词搜索</div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">对标城市</label>
              <select
                v-model="marginForm.benchmark_city"
                class="form-control"
                :disabled="marginBenchmarkCityLoading"
              >
                <option value="">{{ marginBenchmarkCityLoading ? '加载中…' : '请选择对标城市' }}</option>
                <option v-for="c in marginBenchmarkCityOptions" :key="c" :value="c">{{ c }}</option>
              </select>
              <p v-if="marginBenchmarkCityLoadError" class="text-danger small mb-0 mt-1">{{ marginBenchmarkCityLoadError }}</p>
            </div>
            <div class="form-field">
              <label class="form-label">对标城市差额</label>
              <input v-model.number="marginForm.benchmark_diff" type="number" step="0.01" class="form-control" placeholder="请输入差额" />
            </div>
            <div class="form-field">
              <label class="form-label">毛利</label>
              <input v-model.number="marginForm.margin" type="number" step="0.01" class="form-control" placeholder="请输入毛利" />
            </div>
            <div class="form-field">
              <label class="form-label">定价</label>
              <input v-model.number="marginForm.price" type="number" step="0.01" class="form-control" placeholder="请输入定价" />
            </div>
            <div v-if="marginFormError" class="alert alert-warning py-2 mb-2">{{ marginFormError }}</div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showMarginForm = false">取消</button>
            <button class="btn form-btn-submit" :disabled="marginFormLoading" @click="submitMarginForm">
              {{ marginFormLoading ? '提交中…' : '确定' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 导入预览弹窗 -->
      <div v-if="showImportPreview" class="form-mask" @click.self="showImportPreview = false">
        <div class="form-card history-card">
          <div class="form-card-header">
            <h6>导入预览（共 {{ importTotalRows }} 行）</h6>
            <button class="form-close-btn" @click="showImportPreview = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="form-card-body" style="padding: 0;">
            <div class="table-wrap">
              <table class="data-table history-table">
                <thead>
                  <tr>
                    <th v-for="col in importColumns" :key="col">{{ col }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in importPreviewData" :key="idx">
                    <td v-for="col in importColumns" :key="col">{{ row[col] ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="form-card-footer">
            <button class="btn form-btn-cancel" @click="showImportPreview = false">取消</button>
            <button class="btn form-btn-submit" :disabled="importLoading" @click="confirmImport">
              {{ importLoading ? '导入中…' : '确认导入' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 库房自有定价分析 -->
    <div v-else-if="activePage === 'selfPricing'" class="sub-page">
      <div class="sub-page-header">
        <h3 class="sub-page-title">库房自有定价分析</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <div class="sub-page-body">
        <div class="table-toolbar">
          <div class="toolbar-filters">
            <div class="search-select sp-warehouse-select">
              <div
                class="form-control search-select-trigger"
                @click="toggleSelfPricingWarehouseDropdown()"
              >
                <span v-if="selfPricingWarehouseName">{{ selfPricingWarehouseName }}</span>
                <span v-else-if="spWarehouseLoading" class="text-muted">加载库房列表中…</span>
                <span v-else class="text-muted">请选择源库房（支持搜索）</span>
                <i class="bi bi-chevron-down search-select-arrow" :class="{ open: spShowDropdown }"></i>
              </div>
              <div v-if="spShowDropdown" class="search-select-dropdown">
                <div class="search-select-search">
                  <i class="bi bi-search"></i>
                  <input
                    ref="spSearchInputRef"
                    v-model.trim="spSearchQuery"
                    class="search-select-search-input"
                    placeholder="输入名称或编号搜索…"
                    @mousedown.prevent
                  />
                </div>
                <div class="search-select-options">
                  <div v-for="w in spFilteredOptions" :key="w.id" class="search-select-item" :class="{ active: w.id === selfPricingWarehouseId }" @mousedown.prevent="selectSelfPricingWarehouse(w)">
                    {{ w.name }}
                  </div>
                  <div v-if="!spFilteredOptions.length" class="search-select-empty">{{ spSearchQuery ? '无匹配库房' : '请输入关键词搜索' }}</div>
                </div>
              </div>
            </div>
            <button class="btn filter-btn" :disabled="selfPricingWarehouseId === 0 || selfPricingLoading" @click="loadSelfPricingLinks">
              <i class="bi bi-arrow-clockwise"></i>
              刷新
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="spErrorMsg" class="alert alert-warning sp-error-msg">
          <i class="bi bi-exclamation-triangle me-2"></i>{{ spErrorMsg }}
        </div>

        <div class="sp-layout">
          <!-- 左侧：对标库房列表 -->
          <div class="sp-table-panel">
            <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>对标库房</th>
                      <th>库房距离</th>
                      <th>阶梯价差</th>
                      <th>实时价差</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="selfPricingLoading">
                      <td colspan="4" class="text-center py-4">
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        加载中…
                      </td>
                    </tr>
                    <tr v-else-if="!selfPricingWarehouseId">
                      <td colspan="4" class="text-center py-4 text-muted">请先选择源库房</td>
                    </tr>
                    <tr v-else-if="selfPricingLinks.length === 0">
                      <td colspan="4" class="text-center py-4 text-muted">该库房暂无对标库房绑定</td>
                    </tr>
                    <tr v-for="row in selfPricingLinks" :key="`${row.fromId}-${row.toId}`">
                      <td>{{ row.toName }}</td>
                      <td>{{ row.distanceText }}</td>
                      <td>{{ row.tierPriceDiff }}</td>
                      <td>{{ row.realTimeDiff }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 右侧：AI 分析 -->
            <div class="sp-ai-panel">
              <button
                type="button"
                class="btn sp-ai-btn"
                :disabled="!selfPricingWarehouseId || selfPricingLinks.length === 0 || spAiLoading"
                @click="runSelfPricingAiAnalysis"
              >
                <i class="bi bi-robot me-1"></i>
                {{ spAiLoading ? '分析中…' : 'AI 分析' }}
              </button>
              <div class="sp-ai-result">
                <div v-if="spAiLoading" class="text-center text-muted py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>正在分析…
                </div>
                <template v-else-if="spAiSuggestion">
                  <!-- 与自己的库房比 -->
                  <div v-if="spAiSuggestion['与自己的库房比']" class="sp-ai-card">
                    <div class="sp-ai-card-title">
                      <i class="bi bi-arrow-left-right me-1"></i>与自己的库房比
                    </div>
                    <div class="sp-ai-card-body">
                      <div class="sp-ai-row">
                        <span class="sp-ai-label">定价是否合理</span>
                        <span :class="spAiSuggestion['与自己的库房比']['定价是否合理'] ? 'text-success' : 'text-danger'">
                          {{ spAiSuggestion['与自己的库房比']['定价是否合理'] ? '合理' : '不合理' }}
                        </span>
                      </div>
                      <div v-if="spAiSuggestion['与自己的库房比']['建议定价'] != null" class="sp-ai-row">
                        <span class="sp-ai-label">建议定价</span>
                        <span class="sp-ai-value sp-highlight">{{ fmtNum(spAiSuggestion['与自己的库房比']['建议定价'] ?? null) }}</span>
                      </div>
                      <div v-if="spAiSuggestion['与自己的库房比']['建议原因']" class="sp-ai-reason">
                        {{ spAiSuggestion['与自己的库房比']['建议原因'] }}
                      </div>
                    </div>
                  </div>

                  <!-- 与竞品库房比 -->
                  <div v-if="spAiSuggestion['与竞品库房比']" class="sp-ai-card">
                    <div class="sp-ai-card-title">
                      <i class="bi bi-bar-chart me-1"></i>与竞品库房比
                    </div>
                    <div class="sp-ai-card-body">
                      <div class="sp-ai-row">
                        <span class="sp-ai-label">定价是否合理</span>
                        <span :class="spAiSuggestion['与竞品库房比']['定价是否合理'] ? 'text-success' : 'text-danger'">
                          {{ spAiSuggestion['与竞品库房比']['定价是否合理'] ? '合理' : '不合理' }}
                        </span>
                      </div>
                      <div v-if="spAiSuggestion['与竞品库房比']['调价建议']" class="sp-ai-row">
                        <span class="sp-ai-label">调价建议</span>
                        <span class="sp-ai-value sp-highlight">{{ spAiSuggestion['与竞品库房比']['调价建议'] }}</span>
                      </div>
                      <div v-if="spAiSuggestion['与竞品库房比']['建议原因']" class="sp-ai-reason">
                        {{ spAiSuggestion['与竞品库房比']['建议原因'] }}
                      </div>
                    </div>
                  </div>

                  <!-- 配置价差比 -->
                  <div v-if="spAiSuggestion['配置价差比']" class="sp-ai-card">
                    <div class="sp-ai-card-title">
                      <i class="bi bi-pie-chart me-1"></i>配置价差比
                    </div>
                    <div class="sp-ai-card-body">
                      <div v-if="spAiSuggestion['配置价差比']['定价总建议']" class="sp-ai-row">
                        <span class="sp-ai-label">定价总建议</span>
                        <span class="sp-ai-value sp-highlight">{{ spAiSuggestion['配置价差比']['定价总建议'] }}</span>
                      </div>
                      <div v-if="spAiSuggestion['配置价差比']['建议原因']" class="sp-ai-reason">
                        {{ spAiSuggestion['配置价差比']['建议原因'] }}
                      </div>
                    </div>
                  </div>
                </template>
                <p v-else class="text-center text-muted py-4 mb-0">点击「AI 分析」按钮开始分析</p>
              </div>
            </div>
          </div>
      </div>
    </div>

    <!-- 其他子页面 -->
    <div v-else class="sub-page">
      <div class="sub-page-header">
        <h3 class="sub-page-title">{{ pageTitle }}</h3>
        <button class="back-btn" @click="activePage = ''">
          <i class="bi bi-arrow-left"></i>
          返回
        </button>
      </div>
      <div class="sub-page-body">
        <div class="content-placeholder">
          <div class="placeholder-icon"><i :class="pageIcon"></i></div>
          <h3>{{ pageTitle }}</h3>
          <p>该功能正在建设中，敬请期待…</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { warehouseDisplayName } from '@/utils/warehouseDisplayName'
import { useChinaRegion } from '@/composables/useChinaRegion'
import {
  fetchCityBenchmarks,
  createCityBenchmark,
  updateCityBenchmark,
  deleteCityBenchmark,
  type CityBenchmarkRow,
  type CityBenchmarkForm,
} from '@/api/cityBenchmarkApi'
import {
  fetchSmelterPrice,
  createSmelterPrice,
  updateSmelterPrice,
  fetchSmelterPriceHistory,
  deleteSmelterPrice,
  batchCreateSmelterPrice,
  batchCreateSmelterPriceOneByOne,
  SmelterBatchUnavailableError,
  importSmelterCalibrationExcel,
  type SmelterPriceRow,
  type SmelterPriceHistoryRow,
  type SmelterCalibrationExcelImportResult,
  type SmelterCalibrationPriceCreate,
} from '@/api/smelterPriceApi'
import * as XLSX from 'xlsx'
import { fetchTlSmeltersAll, searchTlWarehouses, fetchTlWarehousesAll, fetchTlWarehouseLinksOutbound, fetchTlRealtimeSpreadList } from '@/api/tlApi'
import {
  fetchBenchmarkAnalysis,
  type BenchmarkAnalysisRow,
} from '@/api/benchmarkAnalysisApi'
import {
  fetchWarehouseMargins,
  createWarehouseMargin,
  updateWarehouseMargin,
  deleteWarehouseMargin,
  importWarehouseMargins,
  type WarehouseMarginRow,
  type WarehouseMarginForm,
} from '@/api/warehouseMarginApi'

const activePage = ref('')

onMounted(() => {
  const key = sessionStorage.getItem('ai_pricing_active_page')
  if (key === 'smelterPrice') {
    activePage.value = 'smelterPrice'
    sessionStorage.removeItem('ai_pricing_active_page')
  }
})

const pageMeta: Record<string, { title: string; icon: string }> = {
  benchmarkAnalysis: { title: '库房AI定价对标分析', icon: 'bi bi-bar-chart-line' },
  selfPricing: { title: '库房自有定价分析', icon: 'bi bi-calculator' },
  cityBenchmark: { title: '对标城市定价', icon: 'bi bi-geo-alt' },
  smelterPrice: { title: '冶炼厂标定价格', icon: 'bi bi-building' },
  marginManage: { title: '库房差价和毛利管理', icon: 'bi bi-cash-stack' },
}

const pageTitle = computed(() => pageMeta[activePage.value]?.title ?? '')
const pageIcon = computed(() => pageMeta[activePage.value]?.icon ?? 'bi bi-grid')

/* ===== 对标城市定价 / 省市区数据 ===== */
const chinaRegion = useChinaRegion()
const { ensureLoaded, provinceNames, citiesInProvince, allCityNames } = chinaRegion
const regionLoadError = chinaRegion.loadError

const provinceOptions = computed(() => [...provinceNames.value])

const formCityOptions = computed(() => {
  const base = form.value.province ? citiesInProvince(form.value.province) : []
  const c = form.value.city
  if (c && !base.includes(c)) return [c, ...base]
  return base
})

const analysisFilterCityOptions = computed(() =>
  analysisFilterProvince.value ? citiesInProvince(analysisFilterProvince.value) : allCityNames(),
)

const marginFilterCityOptions = computed(() =>
  marginFilterProvince.value ? citiesInProvince(marginFilterProvince.value) : allCityNames(),
)

const filterCityOptions = ref<string[]>([])
let filterCityTimer: ReturnType<typeof setTimeout> | null = null

async function loadFilterCities(province: string) {
  if (!province) { filterCityOptions.value = []; return }
  try {
    const res = await fetchCityBenchmarks({ province, page: 1, page_size: 500 })
    const seen = new Set<string>()
    for (const item of res.items) {
      if (item.city) seen.add(item.city)
    }
    filterCityOptions.value = [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch {
    filterCityOptions.value = []
  }
}

const marginFormCityOptions = computed(() => {
  const base = marginForm.value.province ? citiesInProvince(marginForm.value.province) : []
  const c = marginForm.value.city
  if (c && !base.includes(c)) return [c, ...base]
  return base
})

const tableData = ref<CityBenchmarkRow[]>([])
const tableLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterProvince = ref('')
const filterCity = ref('')
const filterDate = ref('')

watch(filterProvince, (val) => {
  filterCity.value = ''
  if (filterCityTimer) clearTimeout(filterCityTimer)
  if (val) {
    filterCityTimer = setTimeout(() => loadFilterCities(val), 300)
  } else {
    filterCityOptions.value = []
  }
}, { immediate: true })

const showForm = ref(false)
const editingRow = ref<CityBenchmarkRow | null>(null)
const formLoading = ref(false)
const formError = ref('')
const form = ref<CityBenchmarkForm>({ province: '', city: '', price: 0, date: '' })

async function loadCityBenchmarks() {
  tableLoading.value = true
  try {
    const res = await fetchCityBenchmarks({
      province: filterProvince.value || undefined,
      city: filterCity.value || undefined,
      date: filterDate.value || undefined,
      page: page.value,
      page_size: pageSize,
    })
    tableData.value = res.items
    total.value = res.total
  } catch (e) {
    tableData.value = []
    total.value = 0
    console.error('加载对标城市定价失败:', e)
  } finally {
    tableLoading.value = false
  }
}

function changePage(p: number) {
  page.value = p
  loadCityBenchmarks()
}

async function openAddForm() {
  await ensureLoaded()
  editingRow.value = null
  form.value = { province: '', city: '', price: 0, date: new Date().toISOString().slice(0, 10) }
  formError.value = ''
  showForm.value = true
}

async function openEditForm(row: CityBenchmarkRow) {
  await ensureLoaded()
  editingRow.value = row
  form.value = { province: row.province, city: row.city, price: row.price, date: row.date }
  formError.value = ''
  showForm.value = true
}

async function submitForm() {
  if (!form.value.province) { formError.value = '请输入省份'; return }
  if (!form.value.city) { formError.value = '请选择对标城市'; return }
  if (!form.value.price && form.value.price !== 0) { formError.value = '请输入定价'; return }
  if (!form.value.date) { formError.value = '请选择日期'; return }
  formLoading.value = true
  formError.value = ''
  try {
    if (editingRow.value) {
      await updateCityBenchmark(editingRow.value.id, form.value)
    } else {
      await createCityBenchmark(form.value)
    }
    showForm.value = false
    await loadCityBenchmarks()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : String(e)
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(row: CityBenchmarkRow) {
  if (!confirm(`确定删除「${row.province} - ${row.city}」的对标定价吗？`)) return
  try {
    await deleteCityBenchmark(row.id)
    await loadCityBenchmarks()
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

watch(activePage, async (val) => {
  if (val === 'cityBenchmark' || val === 'benchmarkAnalysis' || val === 'marginManage') {
    await ensureLoaded()
  }
  if (val === 'cityBenchmark') {
    page.value = 1
    filterProvince.value = ''
    filterCity.value = ''
    filterDate.value = ''
    loadCityBenchmarks()
  }
  if (val === 'smelterPrice') {
    loadSmelterPrice()
  }
  if (val === 'benchmarkAnalysis') {
    analysisPage.value = 1
    analysisFilterProvince.value = ''
    analysisFilterCity.value = ''
    analysisFilterCounty.value = ''
    loadBenchmarkAnalysis()
  }
  if (val === 'marginManage') {
    marginPage.value = 1
    marginFilterProvince.value = ''
    marginFilterCity.value = ''
    loadMargins()
  }
})

/* ===== 冶炼厂标定价格 ===== */
const smelterData = ref<SmelterPriceRow[]>([])
const smelterLoading = ref(false)
const showSmelterForm = ref(false)
const smelterFormLoading = ref(false)
const smelterFormError = ref('')
const smelterForm = ref({ price: 0, date: '' })
const smelterEditId = ref(0)
const showSmelterAddForm = ref(false)
const smelterAddLoading = ref(false)
const smelterAddError = ref('')
const smelterAddForm = ref({ smelter_id: 0, price: 0, date: '' })
const smelterOptions = ref<Array<{ id: number; name: string }>>([])
const smelterInputText = ref('')
const showSmelterDropdown = ref(false)
const smelterSelectRef = ref<HTMLElement | null>(null)
const smelterInputRef = ref<HTMLInputElement | null>(null)
const smelterDropdownPos = ref({ top: 0, left: 0, width: 0 })

const filteredSmelterOptions = computed(() => {
  const q = smelterInputText.value.toLowerCase()
  if (!q) return smelterOptions.value.slice(0, 50)
  return smelterOptions.value.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50)
})

const smelterDropdownStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${smelterDropdownPos.value.top}px`,
  left: `${smelterDropdownPos.value.left}px`,
  width: `${smelterDropdownPos.value.width}px`,
  zIndex: 9999,
}))

function openSmelterDropdown() {
  const el = smelterInputRef.value
  if (el) {
    const rect = el.getBoundingClientRect()
    smelterDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: rect.width }
  }
  showSmelterDropdown.value = true
}

function selectSmelterOption(s: { id: number; name: string }) {
  smelterAddForm.value.smelter_id = s.id
  smelterInputText.value = s.name
  showSmelterDropdown.value = false
}

watch(showSmelterAddForm, (v) => {
  if (v) {
    showSmelterDropdown.value = false
    setTimeout(() => document.addEventListener('click', handleSmelterClickOutside), 0)
  } else {
    document.removeEventListener('click', handleSmelterClickOutside)
  }
})

function handleSmelterClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (smelterSelectRef.value && !smelterSelectRef.value.contains(target)) {
    showSmelterDropdown.value = false
  }
}

const showHistory = ref(false)
const historyData = ref<SmelterPriceHistoryRow[]>([])
const historyLoading = ref(false)
const historyTotal = ref(0)
const historyPage = ref(1)
const historyPageSize = 20

async function loadSmelterPrice() {
  smelterLoading.value = true
  try {
    smelterData.value = await fetchSmelterPrice()
  } catch (e) {
    smelterData.value = []
    console.error('加载冶炼厂标定价格失败:', e)
  } finally {
    smelterLoading.value = false
  }
}

function openSmelterEdit(row: SmelterPriceRow) {
  smelterEditId.value = row.id
  smelterForm.value = { price: row.price, date: row.date }
  smelterFormError.value = ''
  showSmelterForm.value = true
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

async function loadSmelterOptions() {
  try {
    const rows = await fetchTlSmeltersAll()
    smelterOptions.value = rows
      .map((r) => ({
        id: Number(r['冶炼厂id'] ?? r.id ?? 0),
        name: String(r['冶炼厂'] ?? r.name ?? ''),
      }))
      .filter((s) => s.id > 0 && s.name)
  } catch {
    smelterOptions.value = []
  }
}

async function openSmelterAdd() {
  smelterAddForm.value = { smelter_id: 0, price: 0, date: todayYmd() }
  smelterInputText.value = ''
  smelterAddError.value = ''
  showSmelterAddForm.value = true
  await loadSmelterOptions()
}

interface SmelterBatchRow {
  smelter_id: number
  price: number | null
  date: string
}

const showSmelterBatchForm = ref(false)
const smelterBatchRows = ref<SmelterBatchRow[]>([])
const smelterBatchLoading = ref(false)
const smelterBatchError = ref('')

function newSmelterBatchRow(): SmelterBatchRow {
  return { smelter_id: 0, price: null, date: todayYmd() }
}

function addSmelterBatchRow() {
  if (smelterBatchRows.value.length >= 500) return
  smelterBatchRows.value.push(newSmelterBatchRow())
}

function removeSmelterBatchRow(idx: number) {
  if (smelterBatchRows.value.length <= 1) return
  smelterBatchRows.value.splice(idx, 1)
}

async function openSmelterBatch() {
  smelterBatchError.value = ''
  smelterBatchRows.value = [newSmelterBatchRow(), newSmelterBatchRow()]
  showSmelterBatchForm.value = true
  await loadSmelterOptions()
}

function validateSmelterBatchRows(): SmelterCalibrationPriceCreate[] | null {
  const rows = smelterBatchRows.value.filter((r) => r.smelter_id > 0 || r.price != null)
  if (!rows.length) {
    smelterBatchError.value = '请至少填写一行有效数据'
    return null
  }
  if (rows.length > 500) {
    smelterBatchError.value = '单次最多 500 条'
    return null
  }
  const payload: SmelterCalibrationPriceCreate[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const line = i + 1
    if (!row.smelter_id) {
      smelterBatchError.value = `第 ${line} 行：请选择冶炼厂`
      return null
    }
    if (row.price == null || Number.isNaN(row.price)) {
      smelterBatchError.value = `第 ${line} 行：请输入标定价格`
      return null
    }
    const item: SmelterCalibrationPriceCreate = {
      冶炼厂id: row.smelter_id,
      标定价格: row.price,
    }
    if (row.date) item.定价日期 = row.date
    payload.push(item)
  }
  return payload
}

async function finishSmelterBatchSuccess(inserted: number, usedFallback = false) {
  showSmelterBatchForm.value = false
  await loadSmelterPrice()
  alert(
    usedFallback
      ? `已逐条新增 ${inserted} 条（当前服务器未开通批量事务接口，非整批回滚模式）`
      : `已批量新增 ${inserted} 条冶炼厂标定价格`,
  )
}

async function submitSmelterBatch() {
  smelterBatchError.value = ''
  const payload = validateSmelterBatchRows()
  if (!payload) return
  smelterBatchLoading.value = true
  try {
    const res = await batchCreateSmelterPrice(payload)
    await finishSmelterBatchSuccess(res.inserted)
  } catch (e) {
    if (e instanceof SmelterBatchUnavailableError) {
      const ok = confirm(
        '当前环境尚未部署批量新增接口（POST /tl/smelter_calibration_prices/batch）。\n\n' +
          '是否改为逐条提交？\n' +
          '注意：非事务模式，若中途失败，已成功写入的数据不会自动回滚。',
      )
      if (!ok) {
        smelterBatchError.value =
          '已取消。请让后端部署批量接口，或使用单条「新增」/「Excel 导入」。'
        return
      }
      try {
        const res = await batchCreateSmelterPriceOneByOne(payload)
        await finishSmelterBatchSuccess(res.inserted, true)
      } catch (err) {
        smelterBatchError.value = err instanceof Error ? err.message : String(err)
      }
      return
    }
    smelterBatchError.value = e instanceof Error ? e.message : String(e)
  } finally {
    smelterBatchLoading.value = false
  }
}

const smelterExcelFileInput = ref<HTMLInputElement | null>(null)
const smelterExcelImportLoading = ref(false)
const showSmelterImportResult = ref(false)
const smelterImportResult = ref<SmelterCalibrationExcelImportResult | null>(null)
const smelterImportResultMsg = ref('')

function downloadSmelterImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['冶炼厂', '标定价格', '定价日期'],
    ['金利', 9500, '2026-05-29'],
    ['某某厂', 9480, ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导入数据')
  XLSX.writeFile(wb, '冶炼厂标定价格导入模板.xlsx')
}

function triggerSmelterExcelImport() {
  smelterExcelFileInput.value?.click()
}

async function handleSmelterExcelImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const ext = file.name.toLowerCase()
  if (!ext.endsWith('.xlsx') && !ext.endsWith('.xlsm')) {
    alert('请选择 .xlsx 或 .xlsm 文件')
    return
  }
  smelterExcelImportLoading.value = true
  try {
    const data = await importSmelterCalibrationExcel(file)
    smelterImportResult.value = data
    const partial = data.skipped_errors > 0
    smelterImportResultMsg.value = partial
      ? `部分成功：已导入 ${data.inserted} 条，${data.skipped_errors} 行跳过`
      : `已导入 ${data.inserted} 条冶炼厂标定价格`
    showSmelterImportResult.value = true
    if (data.inserted > 0) await loadSmelterPrice()
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  } finally {
    smelterExcelImportLoading.value = false
  }
}

async function submitSmelterAdd() {
  if (!smelterInputText.value) { smelterAddError.value = '请选择或输入冶炼厂'; return }
  if (!smelterAddForm.value.price && smelterAddForm.value.price !== 0) { smelterAddError.value = '请输入标定价格'; return }
  // 如果没有通过下拉选择，尝试从列表中匹配名称
  let smelterId = smelterAddForm.value.smelter_id
  if (!smelterId) {
    const match = smelterOptions.value.find((s) => s.name === smelterInputText.value)
    if (match) {
      smelterId = match.id
    } else {
      smelterAddError.value = '未找到匹配的冶炼厂，请从下拉列表中选择'; return
    }
  }
  smelterAddLoading.value = true
  smelterAddError.value = ''
  try {
    await createSmelterPrice(smelterId, smelterAddForm.value.price, smelterAddForm.value.date)
    showSmelterAddForm.value = false
    await loadSmelterPrice()
  } catch (e) {
    smelterAddError.value = e instanceof Error ? e.message : String(e)
  } finally {
    smelterAddLoading.value = false
  }
}

async function submitSmelterForm() {
  if (!smelterForm.value.price && smelterForm.value.price !== 0) { smelterFormError.value = '请输入标定价格'; return }
  if (!smelterForm.value.date) { smelterFormError.value = '请选择日期'; return }
  smelterFormLoading.value = true
  smelterFormError.value = ''
  try {
    await updateSmelterPrice(smelterEditId.value, smelterForm.value.price, smelterForm.value.date)
    showSmelterForm.value = false
    await loadSmelterPrice()
  } catch (e) {
    smelterFormError.value = e instanceof Error ? e.message : String(e)
  } finally {
    smelterFormLoading.value = false
  }
}

async function handleSmelterDelete(row: SmelterPriceRow) {
  if (!confirm(`确定删除${row.smelter}的标定价格吗？`)) return
  try {
    await deleteSmelterPrice(row.id)
    await loadSmelterPrice()
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

async function loadSmelterHistory() {
  historyLoading.value = true
  try {
    const res = await fetchSmelterPriceHistory({ page: historyPage.value, page_size: historyPageSize })
    historyData.value = res.items
    historyTotal.value = res.total
  } catch (e) {
    historyData.value = []
    historyTotal.value = 0
    console.error('加载历史记录失败:', e)
  } finally {
    historyLoading.value = false
  }
}

function changeHistoryPage(p: number) {
  historyPage.value = p
  loadSmelterHistory()
}

function formatTime(t: string): string {
  if (!t) return '-'
  return t.replace('T', ' ').slice(0, 19)
}

watch(showHistory, (v) => {
  if (v) {
    historyPage.value = 1
    loadSmelterHistory()
  }
})

/* ===== 库房AI定价对标分析 ===== */
const analysisData = ref<BenchmarkAnalysisRow[]>([])
const analysisLoading = ref(false)
const analysisTotal = ref(0)
const analysisPage = ref(1)
const analysisPageSize = 15
const analysisFilterProvince = ref('')
const analysisFilterCity = ref('')
const analysisFilterCounty = ref('')

async function loadBenchmarkAnalysis() {
  analysisLoading.value = true
  try {
    const res = await fetchBenchmarkAnalysis({
      province: analysisFilterProvince.value || undefined,
      city: analysisFilterCity.value || undefined,
      county: analysisFilterCounty.value || undefined,
      page: analysisPage.value,
      page_size: analysisPageSize,
    })
    analysisData.value = res.items
    analysisTotal.value = res.total
  } catch (e) {
    analysisData.value = []
    analysisTotal.value = 0
    console.error('加载对标分析数据失败:', e)
  } finally {
    analysisLoading.value = false
  }
}

function changeAnalysisPage(p: number) {
  analysisPage.value = p
  loadBenchmarkAnalysis()
}

/* ===== 库房差价和毛利管理 ===== */
const marginData = ref<WarehouseMarginRow[]>([])
const marginLoading = ref(false)
const marginTotal = ref(0)
const marginPage = ref(1)
const marginPageSize = 20
const marginFilterProvince = ref('')
const marginFilterCity = ref('')

const showMarginForm = ref(false)
const marginEditing = ref<WarehouseMarginRow | null>(null)
const marginFormLoading = ref(false)
const marginFormError = ref('')
const marginForm = ref<WarehouseMarginForm & { warehouse_id?: number }>({
  province: '', city: '', warehouse_name: '', benchmark_city: '', benchmark_diff: 0, margin: 0, price: 0, warehouse_id: undefined,
})

/** 对标城市下拉：GET /tl/province_benchmark_prices，有省份时带 province，未选省份不带该参数 */
const marginBenchmarkCityOptions = ref<string[]>([])
const marginBenchmarkCityLoading = ref(false)
const marginBenchmarkCityLoadError = ref('')

async function loadMarginBenchmarkCityOptions() {
  if (!showMarginForm.value) return
  marginBenchmarkCityLoading.value = true
  marginBenchmarkCityLoadError.value = ''
  try {
    const prov = (marginForm.value.province || '').trim()
    const res = await fetchCityBenchmarks({
      province: prov || undefined,
      page: 1,
      page_size: 500,
    })
    const seen = new Set<string>()
    for (const item of res.items) {
      if (item.city) seen.add(item.city)
    }
    let list = [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'))
    const cur = (marginForm.value.benchmark_city || '').trim()
    if (cur && !list.includes(cur)) list = [cur, ...list]
    marginBenchmarkCityOptions.value = list
  } catch (e) {
    marginBenchmarkCityOptions.value = []
    marginBenchmarkCityLoadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    marginBenchmarkCityLoading.value = false
  }
}

const marginFileInput = ref<HTMLInputElement | null>(null)
const showImportPreview = ref(false)
const importColumns = ref<string[]>([])
const importPreviewData = ref<Record<string, string>[]>([])
const importTotalRows = ref(0)
const importLoading = ref(false)
let pendingImportFile: File | null = null

function handleMarginFormClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (warehouseSelectRef.value && !warehouseSelectRef.value.contains(target)) {
    showWarehouseDropdown.value = false
    warehouseSearchQuery.value = ''
  }
}

watch(showMarginForm, (v) => {
  if (v) {
    showWarehouseDropdown.value = false
    warehouseSearchQuery.value = ''
    setTimeout(() => document.addEventListener('click', handleMarginFormClickOutside), 0)
    void loadMarginBenchmarkCityOptions()
  } else {
    document.removeEventListener('click', handleMarginFormClickOutside)
    marginBenchmarkCityOptions.value = []
    marginBenchmarkCityLoadError.value = ''
  }
})

const warehouseSearchResults = ref<Array<{ id: number; name: string }>>([])
const warehouseSearchLoading = ref(false)
const warehouseDetailMap = ref<Map<string, { id: number; province: string; city: string }>>(new Map())
const showWarehouseDropdown = ref(false)
const warehouseSearchQuery = ref('')
const warehouseSearchInputRef = ref<HTMLInputElement | null>(null)
let warehouseSearchTimer: ReturnType<typeof setTimeout> | null = null
const warehouseSelectRef = ref<HTMLElement | null>(null)

async function doWarehouseSearch(query: string) {
  if (!query) { warehouseSearchResults.value = []; return }
  warehouseSearchLoading.value = true
  try {
    const rows = await searchTlWarehouses(query)
    const results: Array<{ id: number; name: string }> = []
    const map = new Map<string, { id: number; province: string; city: string }>()
    for (const r of rows) {
      const name =
        warehouseDisplayName(String(r['仓库名'] ?? r['仓库名称'] ?? r['name'] ?? '').trim())
      const id = Number(r['仓库id'] ?? r['库房id'] ?? r.id ?? 0)
      if (!name) continue
      results.push({ id, name })
      if (id > 0) {
        map.set(name, {
          id,
          province: String(r['省'] ?? r['省份'] ?? '').trim(),
          city: String(r['市'] ?? r['城市'] ?? '').trim(),
        })
      }
    }
    warehouseSearchResults.value = results
    warehouseDetailMap.value = map
  } catch {
    warehouseSearchResults.value = []
  } finally {
    warehouseSearchLoading.value = false
  }
}

watch(warehouseSearchQuery, (val) => {
  if (warehouseSearchTimer) clearTimeout(warehouseSearchTimer)
  warehouseSearchTimer = setTimeout(() => doWarehouseSearch(val), 300)
})

function toggleWarehouseDropdown() {
  showWarehouseDropdown.value = !showWarehouseDropdown.value
  if (showWarehouseDropdown.value) {
    warehouseSearchQuery.value = ''
    nextTick(() => warehouseSearchInputRef.value?.focus())
  }
}

function selectWarehouse(item: { id: number; name: string }) {
  marginForm.value.warehouse_name = item.name
  marginForm.value.warehouse_id = item.id
  showWarehouseDropdown.value = false
  warehouseSearchQuery.value = ''
  warehouseSearchResults.value = []
  const detail = warehouseDetailMap.value.get(item.name)
  if (detail) {
    if (detail.province) marginForm.value.province = detail.province
    if (detail.city) marginForm.value.city = detail.city
  }
}

async function loadMargins(silent = false) {
  if (!silent) marginLoading.value = true
  try {
    const res = await fetchWarehouseMargins({
      province: marginFilterProvince.value || undefined,
      city: marginFilterCity.value || undefined,
      page: marginPage.value,
      page_size: marginPageSize,
    })
    marginData.value = res.items
    marginTotal.value = res.total
  } catch (e) {
    marginData.value = []
    marginTotal.value = 0
    console.error('加载库房差价和毛利失败:', e)
  } finally {
    if (!silent) marginLoading.value = false
  }
}

function changeMarginPage(p: number) {
  marginPage.value = p
  loadMargins()
}

async function openMarginAdd() {
  await ensureLoaded()
  marginEditing.value = null
  marginForm.value = { province: '', city: '', warehouse_name: '', benchmark_city: '', benchmark_diff: 0, margin: 0, price: 0, warehouse_id: undefined }
  marginFormError.value = ''
  showMarginForm.value = true
}

async function openMarginEdit(row: WarehouseMarginRow) {
  await ensureLoaded()
  marginEditing.value = row
  marginForm.value = {
    province: row.province, city: row.city, warehouse_name: row.warehouse_name,
    benchmark_city: row.benchmark_city, benchmark_diff: row.benchmark_diff, margin: row.margin, price: row.price,
  }
  marginFormError.value = ''
  showMarginForm.value = true
}

async function submitMarginForm() {
  const f = marginForm.value
  if (!f.province) { marginFormError.value = '请选择省份'; return }
  if (!f.city) { marginFormError.value = '请选择城市'; return }
  if (!f.warehouse_name) { marginFormError.value = '请输入库房名称'; return }
  if (!f.benchmark_city) { marginFormError.value = '请选择对标城市'; return }
  marginFormLoading.value = true
  marginFormError.value = ''
  try {
    if (marginEditing.value) {
      await updateWarehouseMargin(marginEditing.value.id, f)
    } else {
      if (!f.warehouse_id) { marginFormError.value = '请从列表中选择库房'; marginFormLoading.value = false; return }
      await createWarehouseMargin({ ...f, warehouse_id: f.warehouse_id })
    }
    showMarginForm.value = false
    await loadMargins(true)
  } catch (e) {
    marginFormError.value = e instanceof Error ? e.message : String(e)
  } finally {
    marginFormLoading.value = false
  }
}

async function handleMarginDelete(row: WarehouseMarginRow) {
  if (!confirm(`确定删除「${row.warehouse_name} - ${row.benchmark_city}」吗？`)) return
  try {
    await deleteWarehouseMargin(row.id)
    await loadMargins(true)
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

function triggerMarginImport() {
  marginFileInput.value?.click()
}

async function handleMarginImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importLoading.value = true
  try {
    await importWarehouseMargins(file)
    alert('导入成功')
    await loadMargins()
  } catch (e) {
    alert('导入失败：' + (e instanceof Error ? e.message : String(e)))
  } finally {
    importLoading.value = false
  }
}

async function confirmImport() {
  if (!pendingImportFile) return
  importLoading.value = true
  try {
    await importWarehouseMargins(pendingImportFile)
    showImportPreview.value = false
    pendingImportFile = null
    await loadMargins()
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  } finally {
    importLoading.value = false
  }
}

watch(analysisFilterProvince, () => {
  const opts = analysisFilterCityOptions.value
  if (analysisFilterCity.value && !opts.includes(analysisFilterCity.value)) analysisFilterCity.value = ''
})

watch(marginFilterProvince, () => {
  const opts = marginFilterCityOptions.value
  if (marginFilterCity.value && !opts.includes(marginFilterCity.value)) marginFilterCity.value = ''
})

watch(filterProvince, () => {
  const opts = filterCityOptions.value
  if (filterCity.value && !opts.includes(filterCity.value)) filterCity.value = ''
})

watch(
  () => form.value.province,
  () => {
    const opts = formCityOptions.value
    if (form.value.city && !opts.includes(form.value.city)) form.value.city = ''
  },
)

watch(
  () => marginForm.value.province,
  (newP, oldP) => {
    if (marginEditing.value) return
    const opts = marginFormCityOptions.value
    if (marginForm.value.city && !opts.includes(marginForm.value.city)) marginForm.value.city = ''
    if (oldP !== undefined && String(oldP).trim() !== String(newP ?? '').trim()) {
      marginForm.value.benchmark_city = ''
    }
    if (showMarginForm.value) void loadMarginBenchmarkCityOptions()
  },
)

/* ===== 库房自有定价分析 ===== */
type SelfPricingLink = {
  fromId: number
  fromName: string
  toId: number
  toName: string
  distanceText: string
  tierPriceDiff: string
  realTimeDiff: string
  remark: string
  aiAnalysis: string
  lastAnalysisTime: string
}

type AiSuggestion = {
  与自己的库房比?: { 定价是否合理?: boolean; 建议定价?: number; 建议原因?: string }
  与竞品库房比?: { 定价是否合理?: boolean; 调价建议?: string; 建议原因?: string }
  配置价差比?: { 定价总建议?: string; 建议原因?: string }
}

const selfPricingWarehouseId = ref(0)
const selfPricingWarehouseOptions = ref<Array<{ id: number; name: string }>>([])
const selfPricingWarehouseName = ref('')
const spWarehouseLoading = ref(false)
const spShowDropdown = ref(false)
const spSearchQuery = ref('')
const spSearchInputRef = ref<HTMLInputElement | null>(null)

const spFilteredOptions = computed(() => {
  const q = spSearchQuery.value.toLowerCase()
  const list = selfPricingWarehouseOptions.value
  if (!q) return list.slice(0, 100)
  return list.filter((w) => w.name.toLowerCase().includes(q) || String(w.id).includes(q)).slice(0, 100)
})

function toggleSelfPricingWarehouseDropdown() {
  spShowDropdown.value = !spShowDropdown.value
  if (spShowDropdown.value) {
    spSearchQuery.value = ''
    nextTick(() => spSearchInputRef.value?.focus())
  }
}

function selectSelfPricingWarehouse(w: { id: number; name: string }) {
  selfPricingWarehouseId.value = w.id
  selfPricingWarehouseName.value = w.name
  spShowDropdown.value = false
  spSearchQuery.value = ''
  loadSelfPricingLinks()
}

function handleSpClickOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.sp-warehouse-select')
  if (!el) spShowDropdown.value = false
}

watch(spShowDropdown, (v) => {
  if (v) {
    setTimeout(() => document.addEventListener('click', handleSpClickOutside), 0)
  } else {
    document.removeEventListener('click', handleSpClickOutside)
  }
})

const selfPricingLinks = ref<SelfPricingLink[]>([])
const selfPricingLoading = ref(false)
const spAiLoading = ref(false)
const spAiSuggestion = ref<AiSuggestion | null>(null)
const spErrorMsg = ref('')

function pickNum2(row: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

function pickStr2(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function fmtNum(v: number | null, decimals = 2): string {
  return v != null && Number.isFinite(v) ? v.toFixed(decimals) : '—'
}

async function loadSelfPricingWarehouseOptions() {
  spWarehouseLoading.value = true
  try {
    const rows = await fetchTlWarehousesAll()
    selfPricingWarehouseOptions.value = rows
      .map((r) => {
        const id = pickNum2(r, ['仓库id', '库房id', 'warehouse_id', 'id'])
        const name =
          warehouseDisplayName(pickStr2(r, ['仓库名', 'warehouse_name', 'name'])) || `库房#${id}`
        return { id, name }
      })
      .filter((x) => x.id > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  } catch (e) {
    console.error('[selfPricing] 加载仓库列表失败:', e)
    selfPricingWarehouseOptions.value = []
  } finally {
    spWarehouseLoading.value = false
  }
}

async function loadSelfPricingLinks() {
  const whId = selfPricingWarehouseId.value
  if (!whId) return
  selfPricingLoading.value = true
  selfPricingLinks.value = []
  spErrorMsg.value = ''
  try {
    const rows = await fetchTlWarehouseLinksOutbound(whId)
    const srcName = warehouseDisplayName(selfPricingWarehouseName.value) || `库房#${whId}`
    const links: SelfPricingLink[] = []

    for (const row of rows) {
      const o = row as Record<string, unknown>
      const tgtObj = (o['对标库房'] ?? o['to_warehouse'] ?? o['target_warehouse']) as Record<string, unknown> | undefined

      let toId = pickNum2(o, ['对标库房id', '目标库房id', 'to_warehouse_id', 'target_warehouse_id', 'to_id'])
      if (!toId && tgtObj) toId = pickNum2(tgtObj, ['仓库id', '库房id', 'warehouse_id', 'id'])

      let toName = pickStr2(o, ['对标库房名', '目标库房名', 'to_warehouse_name', 'target_warehouse_name'])
      if (!toName && tgtObj) toName = pickStr2(tgtObj, ['仓库名', 'warehouse_name', 'name'])
      if (!toName) toName = `库房#${toId}`
      toName = warehouseDisplayName(toName)

      let tierPriceDiff = '—'
      for (const k of ['阶梯价差', 'ladder_price_diff', 'tier_price_diff']) {
        const v = o[k]
        if (v != null && v !== '') { tierPriceDiff = String(v); break }
      }

      let distanceText = '…'
      for (const k of ['距离千米', 'distance_km', 'distanceKm', 'distance']) {
        const v = o[k]
        if (typeof v === 'number' && Number.isFinite(v)) { distanceText = `${v.toFixed(2)} km`; break }
        if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) { distanceText = `${Number(v).toFixed(2)} km`; break }
      }

      let realTimeDiff = '—'
      for (const k of ['实时价差', 'realtime_spread']) {
        const v = o[k]
        if (v != null && v !== '') { realTimeDiff = String(v); break }
      }

      let remark = ''
      for (const k of ['备注', 'remark']) { const v = o[k]; if (v != null && v !== '') { remark = String(v); break } }
      let aiAnalysis = ''
      for (const k of ['AI分析', 'ai_analysis', 'aiAnalysis']) { const v = o[k]; if (v != null && v !== '') { aiAnalysis = String(v); break } }
      let lastAnalysisTime = ''
      for (const k of ['上次分析时间', 'last_analysis_time', 'lastAnalysisTime']) { const v = o[k]; if (v != null && v !== '') { lastAnalysisTime = String(v); break } }

      if (toId > 0) {
        links.push({ fromId: whId, fromName: srcName, toId, toName, distanceText, tierPriceDiff, realTimeDiff, remark, aiAnalysis, lastAnalysisTime })
      }
    }

    selfPricingLinks.value = links

    // 实时价差
    try {
      const spreadItems = await fetchTlRealtimeSpreadList({ from_warehouse_id: whId, page: 1, size: 200 })
      const spreadMap: Record<string, string> = {}
      for (const item of spreadItems) {
        const o = item as Record<string, unknown>
        const fromId = Number(o['源库房id'] ?? 0)
        const toId = Number(o['对标库房id'] ?? 0)
        const spread = o['实时价差']
        if (fromId > 0 && toId > 0 && spread != null) spreadMap[`${fromId}-${toId}`] = String(spread)
      }
      for (const link of selfPricingLinks.value) {
        const key = `${link.fromId}-${link.toId}`
        if (spreadMap[key] != null) link.realTimeDiff = spreadMap[key]
      }
    } catch { /* ignore */ }
  } catch (e) {
    spErrorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    selfPricingLoading.value = false
  }
}

async function runSelfPricingAiAnalysis() {
  const whId = selfPricingWarehouseId.value
  if (!whId) return
  spAiLoading.value = true
  spAiSuggestion.value = null
  spErrorMsg.value = ''
  try {
    const token = localStorage.getItem('api_token')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const resp = await fetch(`/vertical-warehouse-ai/analysis?warehouse_id=${whId}`, { headers })
    let body: Record<string, unknown> = {}
    try { body = await resp.json() } catch { /* ignore */ }

    const hint = body['detail'] ?? body['msg'] ?? body['message']
    if (typeof hint === 'string' && hint) { spErrorMsg.value = hint; return }
    if (!resp.ok) { spErrorMsg.value = `请求失败（${resp.status}）`; return }

    const data = (body['data'] && typeof body['data'] === 'object' ? body['data'] : body) as Record<string, unknown>
    const aiRaw = data['ai建议']
    if (aiRaw && typeof aiRaw === 'object') spAiSuggestion.value = aiRaw as AiSuggestion
    else spErrorMsg.value = '该库房暂无 AI 分析结果'
  } catch (e) {
    spErrorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    spAiLoading.value = false
  }
}

watch(activePage, (val) => {
  if (val === 'selfPricing') {
    selfPricingWarehouseId.value = 0
    selfPricingWarehouseName.value = ''
    spShowDropdown.value = false
    spSearchQuery.value = ''
    selfPricingLinks.value = []
    spAiSuggestion.value = null
    spErrorMsg.value = ''
    loadSelfPricingWarehouseOptions()
  }
})
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 72px);
  background: #f5f7fa;
  display: grid;
  place-items: center;
}

/* === 首页卡片 === */
.home-content {
  max-width: 1280px;
  width: 100%;
  padding: 0 24px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.home-panel.main-panel {
  order: 1;
  grid-column: 1 / 8;
}

.home-panel.config-panel {
  order: 2;
  grid-column: 8 / -1;
}

.home-panel {
  margin: 0;
  min-height: 100%;
  border: 1px solid #d8e1ee;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  padding: 20px;
  animation: fadeInUp 0.35s ease both;
}

.home-panel-title {
  font-size: 16px;
  font-weight: 700;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e8eef7;
  color: #1e293b;
}

.module-cards {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

.home-panel.main-panel .module-card {
  min-height: 112px;
  padding: 18px;
  border-color: #cddcf4;
  box-shadow: 0 4px 12px rgba(22, 119, 217, 0.1);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.home-panel.main-panel .module-icon {
  width: 46px;
  height: 46px;
}

.home-panel.main-panel .module-info h4 {
  font-size: 17px;
  font-weight: 700;
}

.home-panel.main-panel .module-info p {
  font-size: 13px;
  color: #475467;
}

.module-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-height: 76px;
  padding: 12px 14px;
  border: 1px solid #dde5f1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.module-card:hover {
  border-color: #1a73e8;
  box-shadow: 0 6px 20px rgba(26, 115, 232, 0.15);
  transform: translateY(-3px);
}

.module-card:active {
  transform: translateY(-1px) scale(0.99);
}

.module-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.module-info h4 {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.module-info p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.35;
}

/* === 子页面 === */
.sub-page {
  max-width: 1280px;
  width: 100%;
  padding: 20px 24px 0;
  align-self: start;
  animation: fadeIn 0.25s ease both;
}

.sub-page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  margin-left: auto;
}

.back-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.sub-page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.sub-page-body {
  background: #fff;
  border: 1px solid #d8e1ee;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  animation: fadeInUp 0.3s ease both;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #94a3b8;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.content-placeholder h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #64748b;
}

.content-placeholder p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 1024px) {
  .home-panel.main-panel,
  .home-panel.config-panel {
    grid-column: 1 / -1;
  }
}

/* ===== 对标城市定价表格 ===== */
.header-actions {
  margin-right: auto;
}

.add-btn {
  background: #196cc0;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: #155a9e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 108, 192, 0.3);
}

.add-btn:active {
  transform: scale(0.97);
}

.add-btn--outline {
  background: #fff;
  color: #196cc0;
  border: 1px solid #196cc0;
}

.add-btn--outline:hover {
  background: #e8f0fe;
}

/* ===== 搜索下拉 ===== */
.search-select {
  position: relative;
}

.search-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  padding-right: 30px;
}

.search-select-trigger.is-disabled {
  cursor: not-allowed;
  background: #f3f4f6;
  color: #9ca3af;
}

.search-select-arrow {
  position: absolute;
  right: 10px;
  font-size: 12px;
  color: #94a3b8;
  transition: transform 0.2s;
}

.search-select-arrow.open {
  transform: rotate(180deg);
}

.search-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  margin-top: 2px;
  overflow: hidden;
  animation: slideDown 0.2s ease both;
}

.search-select-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #e8eef7;
  color: #94a3b8;
  font-size: 13px;
}

.search-select-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: #1e293b;
}

.search-select-search-input::placeholder {
  color: #94a3b8;
}

.search-select-options {
  max-height: 180px;
  overflow-y: auto;
}

.smelter-dropdown-portal {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  max-height: 220px;
  overflow-y: auto;
}

.search-select-item {
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  color: #1e293b;
}

.search-select-item:hover {
  background: #e8f0fe;
  color: #196cc0;
}

.search-select-item.active {
  background: #eff6ff;
  color: #196cc0;
  font-weight: 600;
}

.search-select-empty {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.table-toolbar {
  padding: 14px 16px;
  border-bottom: 1px solid #e8eef7;
}

.toolbar-filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-input {
  width: 180px;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid #d1d5db;
}

.filter-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}

.filter-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: #196cc0;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.filter-btn:hover {
  background: #155a9e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 108, 192, 0.3);
}

.filter-btn:active {
  transform: scale(0.97);
}

.table-wrap {
  overflow-x: auto;
}


.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead {
  background: #f8fafc;
}

.data-table th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}

.data-table tbody tr {
  transition: background 0.15s ease, transform 0.15s ease;
}

.data-table tbody tr:hover {
  background: #f0f7ff;
  transform: scale(1.003);
}

.col-actions {
  width: 160px;
  text-align: center;
}

.action-btn {
  border: none;
  background: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  transform: scale(1.08);
}

.action-btn:active {
  transform: scale(0.95);
}

.action-edit {
  color: #196cc0;
}

.action-edit:hover {
  background: #e8f0fe;
}

.action-delete {
  color: #dc2626;
}

.action-delete:hover {
  background: #fef2f2;
}

.table-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e8eef7;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
}

.page-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.page-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-current {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

/* ===== 表单弹窗 ===== */
.form-mask {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease both;
}

.form-card {
  width: min(480px, 100%);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.3);
  overflow: hidden;
  animation: scaleIn 0.25s ease both;
}

.form-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8eef7;
}

.form-card-header h6 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.form-close-btn {
  border: none;
  background: none;
  font-size: 18px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
}

.form-close-btn:hover {
  color: #1e293b;
}

.form-card-body {
  padding: 16px 20px;
}

.form-field {
  margin-bottom: 14px;
}

.form-field .form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.form-field .form-control {
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
}

.form-field .form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}

.form-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8eef7;
}

.form-btn-cancel {
  border: 1px solid #d1d5db;
  background: #f8fafc;
  color: #475569;
  border-radius: 8px;
  padding: 6px 18px;
  font-size: 14px;
  font-weight: 600;
}

.form-btn-cancel:hover {
  background: #f1f5f9;
}

.form-btn-submit {
  border: none;
  background: #196cc0;
  color: #fff;
  border-radius: 8px;
  padding: 6px 18px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.form-btn-submit:hover {
  background: #155a9e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 108, 192, 0.3);
}

.form-btn-submit:active:not(:disabled) {
  transform: scale(0.97);
}

.form-btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ===== 历史记录弹窗 ===== */
.history-card {
  width: min(640px, 100%);
}

.smelter-batch-card {
  width: min(920px, 100%);
}

.import-error-list {
  max-height: 220px;
  overflow-y: auto;
  padding-left: 1.25rem;
}

.history-table th,
.history-table td {
  padding: 8px 16px;
}

/* ===== 对标分析表格 ===== */
.analysis-table th,
.analysis-table td {
  padding: 8px 10px;
  font-size: 13px;
  white-space: nowrap;
}

/* ===== 库房自有定价分析 ===== */
.sp-warehouse-select {
  min-width: 300px;
  max-width: 420px;
}

.sp-error-msg {
  margin: 12px 0;
  font-size: 14px;
  border-radius: 8px;
}

.sp-source-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.sp-source-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

.sp-source-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 20px;
}

.sp-source-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-source-label {
  font-size: 12px;
  color: #94a3b8;
}

.sp-source-value {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.sp-layout {
  display: flex;
  gap: 0;
  min-height: 400px;
}

.sp-table-panel {
  flex: 1;
  min-width: 0;
  border-right: 1px solid #e8eef7;
}

.sp-data-table th,
.sp-data-table td {
  white-space: nowrap;
  font-size: 13px;
}

.sp-ratio-note {
  color: #6366f1;
  cursor: help;
  font-size: 12px;
}

.sp-ai-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: #fafbfe;
}

.sp-ai-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.sp-ai-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
}

.sp-ai-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.sp-ai-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.sp-ai-result {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.sp-ai-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}

.sp-ai-card-title {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.sp-ai-card-body {
  padding: 12px 14px;
}

.sp-ai-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.sp-ai-label {
  color: #64748b;
}

.sp-ai-value {
  font-weight: 600;
  color: #1e293b;
}

.sp-highlight {
  color: #6366f1;
  font-size: 14px;
}

.sp-ai-reason {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  border-left: 3px solid #6366f1;
  border-radius: 0 6px 6px 0;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}
</style>
