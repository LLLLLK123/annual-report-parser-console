<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  uploadTypes: { type: Array, required: true },
  paginatedUploadRecords: { type: Array, required: true },
  reportTypeOptions: { type: Array, required: true },
  reportYearOptions: { type: Array, required: true },
  reportQuarterOptions: { type: Array, required: true },
  statusOptions: { type: Array, required: true },
  historySearch: { type: String, required: true },
  reportTypeFilter: { type: Array, required: true },
  reportYearFilter: { type: Array, required: true },
  reportQuarterFilter: { type: Array, required: true },
  statusFilter: { type: Array, required: true },
  uploadTimeOrder: { type: String, required: true },
  totalRecordCount: { type: Number, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  jumpPageInput: { type: String, required: true },
  uploadStatusClass: { type: Function, required: true },
  filterSummary: { type: Function, required: true },
  applyReportTypeFilterAction: { type: Function, required: true },
  applyReportYearFilterAction: { type: Function, required: true },
  applyReportQuarterFilterAction: { type: Function, required: true },
  applyStatusFilterAction: { type: Function, required: true },
})

const emit = defineEmits([
  'open-upload-modal',
  'update:history-search',
  'update:report-type-filter',
  'update:report-year-filter',
  'update:report-quarter-filter',
  'update:status-filter',
  'search-input',
  'toggle-upload-time-order',
  'download-report',
  'view-record-data',
  'request-delete-record',
  'update:page-size',
  'change-page-size',
  'prev-page',
  'next-page',
  'update:jump-page-input',
  'submit-jump-page',
])

const reportTypeDraft = ref([])
const reportYearDraft = ref([])
const reportQuarterDraft = ref([])
const statusDraft = ref([])

const syncDraftsFromProps = () => {
  reportTypeDraft.value = [...props.reportTypeFilter]
  reportYearDraft.value = [...props.reportYearFilter]
  reportQuarterDraft.value = [...props.reportQuarterFilter]
  statusDraft.value = [...props.statusFilter]
}

watch(
  () => [props.reportTypeFilter, props.reportYearFilter, props.reportQuarterFilter, props.statusFilter],
  syncDraftsFromProps,
  { immediate: true, deep: true },
)

const clearDraftValue = (target) => {
  target.value = []
}

const summaryFromOptionValues = (label, values, options) => {
  return label
}

const closeFilterMenu = (event) => {
  event.currentTarget.closest('details')?.removeAttribute('open')
}

const applyReportTypeFilter = (event) => {
  props.applyReportTypeFilterAction([...reportTypeDraft.value])
  closeFilterMenu(event)
}

const applyReportYearFilter = (event) => {
  props.applyReportYearFilterAction([...reportYearDraft.value])
  closeFilterMenu(event)
}

const applyReportQuarterFilter = (event) => {
  props.applyReportQuarterFilterAction([...reportQuarterDraft.value])
  closeFilterMenu(event)
}

const applyStatusFilter = (event) => {
  props.applyStatusFilterAction([...statusDraft.value])
  closeFilterMenu(event)
}

const cancelFilter = (event) => {
  syncDraftsFromProps()
  closeFilterMenu(event)
}

const resetReportTypeFilter = (event) => {
  reportTypeDraft.value = []
  props.applyReportTypeFilterAction([])
  closeFilterMenu(event)
}

const resetReportYearFilter = (event) => {
  reportYearDraft.value = []
  props.applyReportYearFilterAction([])
  closeFilterMenu(event)
}

const resetReportQuarterFilter = (event) => {
  reportQuarterDraft.value = []
  props.applyReportQuarterFilterAction([])
  closeFilterMenu(event)
}

const resetStatusFilter = (event) => {
  statusDraft.value = []
  props.applyStatusFilterAction([])
  closeFilterMenu(event)
}
</script>

<template>
  <main class="module-main">
    <section class="upload-workbench">
      <div class="workbench-top">
        <div class="workbench-head">
          <span class="hero-label">UPLOAD WORKBENCH</span>
          <h1>上传工作台</h1>
          <!-- <p>上半区直接选择报告类型上传文件，下半区沉淀历史记录与处理明细。</p> -->
        </div>
      </div>

      <section class="workbench-panel upload-panel">
        <div class="panel-head">
          <div>
            <span>文件上传</span>
            <h2>选择报告类型并提交解析任务</h2>
          </div>
        </div>

        <div class="upload-type-grid">
          <article v-for="item in uploadTypes" :key="item.key" class="upload-type-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
            <button class="quad-enter" type="button" @click="emit('open-upload-modal', item.title)">上传文件</button>
          </article>
        </div>
      </section>

      <section class="workbench-panel history-panel">
        <div class="panel-head">
          <div>
            <span>历史清单</span>
            <h2>历史记录</h2>
          </div>
        </div>

        <div class="history-table-wrap">
          <div class="history-toolbar">
            <label class="history-search">
              <input
                :value="historySearch"
                type="text"
                placeholder="点击输入主体名称"
                @input="emit('update:history-search', $event.target.value)"
                @input.capture="emit('search-input')"
              />
            </label>
          </div>

          <table class="history-table">
            <thead>
              <tr>
                <th>公司</th>
                <th>
                  <details class="filter-menu table-filter">
                    <summary class="table-filter-trigger">
                      <span>{{ summaryFromOptionValues('报告类型', reportTypeFilter, reportTypeOptions) }}</span>
                      <span class="table-filter-arrow">▾</span>
                    </summary>
                    <div class="filter-menu-panel">
                      <div class="filter-menu-tools">
                        <button class="filter-clear" type="button" @click="resetReportTypeFilter">清空</button>
                      </div>
                      <label v-for="item in reportTypeOptions" :key="item.value" class="filter-option">
                        <input v-model="reportTypeDraft" :value="item.value" type="checkbox" />
                        <span>{{ item.label }}</span>
                      </label>
                      <div class="filter-actions">
                        <button class="quad-link filter-action-btn" type="button" @click="cancelFilter">取消</button>
                        <button class="quad-enter filter-action-btn" type="button" @click="applyReportTypeFilter">确认</button>
                      </div>
                    </div>
                  </details>
                </th>
                <th>
                  <details class="filter-menu table-filter">
                    <summary class="table-filter-trigger">
                      <span>{{ filterSummary('报告年份', reportYearFilter) }}</span>
                      <span class="table-filter-arrow">▾</span>
                    </summary>
                    <div class="filter-menu-panel">
                      <div class="filter-menu-tools">
                        <button class="filter-clear" type="button" @click="resetReportYearFilter">清空</button>
                      </div>
                      <label v-for="item in reportYearOptions" :key="item" class="filter-option">
                        <input v-model="reportYearDraft" :value="item" type="checkbox" />
                        <span>{{ item }}</span>
                      </label>
                      <div class="filter-actions">
                        <button class="quad-link filter-action-btn" type="button" @click="cancelFilter">取消</button>
                        <button class="quad-enter filter-action-btn" type="button" @click="applyReportYearFilter">确认</button>
                      </div>
                    </div>
                  </details>
                </th>
                <th>
                  <details class="filter-menu table-filter">
                    <summary class="table-filter-trigger">
                      <span>{{ filterSummary('报告季度', reportQuarterFilter) }}</span>
                      <span class="table-filter-arrow">▾</span>
                    </summary>
                    <div class="filter-menu-panel">
                      <div class="filter-menu-tools">
                        <button class="filter-clear" type="button" @click="resetReportQuarterFilter">清空</button>
                      </div>
                      <label v-for="item in reportQuarterOptions" :key="item" class="filter-option">
                        <input v-model="reportQuarterDraft" :value="item" type="checkbox" />
                        <span>{{ item }}</span>
                      </label>
                      <div class="filter-actions">
                        <button class="quad-link filter-action-btn" type="button" @click="cancelFilter">取消</button>
                        <button class="quad-enter filter-action-btn" type="button" @click="applyReportQuarterFilter">确认</button>
                      </div>
                    </div>
                  </details>
                </th>
                <th>
                  <details class="filter-menu table-filter">
                    <summary class="table-filter-trigger">
                      <span>{{ summaryFromOptionValues('处理状态', statusFilter, statusOptions) }}</span>
                      <span class="table-filter-arrow">▾</span>
                    </summary>
                    <div class="filter-menu-panel">
                      <div class="filter-menu-tools">
                        <button class="filter-clear" type="button" @click="resetStatusFilter">清空</button>
                      </div>
                      <label v-for="item in statusOptions" :key="item.value" class="filter-option">
                        <input v-model="statusDraft" :value="item.value" type="checkbox" />
                        <span>{{ item.label }}</span>
                      </label>
                      <div class="filter-actions">
                        <button class="quad-link filter-action-btn" type="button" @click="cancelFilter">取消</button>
                        <button class="quad-enter filter-action-btn" type="button" @click="applyStatusFilter">确认</button>
                      </div>
                    </div>
                  </details>
                </th>
                <th>
                  <button class="sort-header-btn" type="button" @click="emit('toggle-upload-time-order')">
                    <span>上传时间</span>
                    <span class="sort-arrow">{{ uploadTimeOrder === 'asc' ? '↑' : '↓' }}</span>
                  </button>
                </th>
                <th>关联报告</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedUploadRecords" :key="row.id">
                <td><b>{{ row.company }}</b></td>
                <td>{{ row.type }}</td>
                <td>{{ row.year }}</td>
                <td>{{ row.quarter }}</td>
                <td><span :class="['status-pill', uploadStatusClass(row.status)]">{{ row.status }}</span></td>
                <td>{{ row.uploadedAt }}</td>
                <td><button class="quad-link" type="button" @click="emit('download-report', row)">查看报告</button></td>
                <td>
                  <div class="table-actions">
                    <button
                      :class="['quad-link', 'record-view-btn', { disabled: row.statusKey !== 'success' }]"
                      type="button"
                      :disabled="row.statusKey !== 'success'"
                      @click="row.statusKey === 'success' && emit('view-record-data', row)"
                    >
                      查看数据
                    </button>
                    <button class="quad-link danger-link" type="button" @click="emit('request-delete-record', row)">删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!paginatedUploadRecords.length">
                <td colspan="8" class="empty-row">暂无符合条件的历史记录</td>
              </tr>
            </tbody>
          </table>

          <div class="history-pagination">
            <div class="pagination-summary">
              共 <strong>{{ totalRecordCount }}</strong> 条，当前第
              <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页
            </div>

            <div class="pagination-controls">
              <label class="page-size-select">
                <span>每页</span>
                <select :value="pageSize" @change="emit('update:page-size', Number($event.target.value)); emit('change-page-size')">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span>条</span>
              </label>

              <button class="quad-link page-btn" type="button" :disabled="currentPage === 1" @click="emit('prev-page')">上一页</button>

              <button class="quad-link page-btn" type="button" :disabled="currentPage === totalPages" @click="emit('next-page')">下一页</button>

              <form class="jump-form" @submit.prevent="emit('submit-jump-page')">
                <span>跳至</span>
                <input
                  :value="jumpPageInput"
                  type="number"
                  min="1"
                  :max="totalPages"
                  @input="emit('update:jump-page-input', $event.target.value)"
                />
                <span>页</span>
                <button class="quad-link page-btn" type="submit">确定</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
