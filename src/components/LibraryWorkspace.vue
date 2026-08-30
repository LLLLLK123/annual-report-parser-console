<script setup>
import { computed, ref, watch } from 'vue'
import { libraryCollectionMap } from '../data/librarySeeds'
import { roles } from '../data/appShell'
import ReportDownloadMenu from './ReportDownloadMenu.vue'

const props = defineProps({ currentUser: { type: Object, default: null } })
const emit = defineEmits(['view-report'])
const companySearch = ref(''), crmSearch = ref(''), reportTypeFilter = ref(''), yearFilter = ref(''), periodFilter = ref('')
const scopeFilter = ref(''), statusFilter = ref(''), startDate = ref(''), endDate = ref('')
const pageSize = ref(10), currentPage = ref(1), jumpPageInput = ref('1')
const scopeLabelMap = { public: '公开', private: '非公开' }
const reportPeriod = (row) => row.reportPeriod || row.quarter || '年报'
const latestReportPeriod = (row) => row.latestReportPeriod || `${row.year || ''}${reportPeriod(row) === '年报' ? 'FY' : reportPeriod(row) === '半年报' ? 'H1' : reportPeriod(row) === '一季报' ? 'Q1' : 'Q3'}`
const isProblem = (row) => ['失败', '异常'].includes(row.parseStatus) || row.hasDataIssue

const allRows = computed(() => Object.entries(libraryCollectionMap).flatMap(([scopeKey, groups]) =>
  Object.values(groups).flat().map((row) => ({ ...row, scopeKey, scopeLabel: scopeLabelMap[scopeKey] }))))
const visibleRows = computed(() => props.currentUser?.role === roles.customer
  ? allRows.value.filter((row) => row.scopeKey === 'private' && row.uploaderUsername === props.currentUser?.username)
  : allRows.value)
const unique = (getter) => [...new Set(visibleRows.value.map(getter).filter(Boolean))]
const reportTypeOptions = computed(() => unique((row) => row.reportType))
const yearOptions = computed(() => unique((row) => row.year).sort((a, b) => Number(b) - Number(a)))
const periodOptions = computed(() => unique(reportPeriod))
const statusOptions = computed(() => unique((row) => row.parseStatus))
const cards = computed(() => [
  { key: 'all', label: '报告总量', value: visibleRows.value.length },
  ...['财务报告', '审计报告', '招股说明书', '港股财报'].map((label) => ({ key: label, label, value: visibleRows.value.filter((row) => row.reportType === label || (label === '港股财报' && row.reportType === '港股财务报告')).length })),
  { key: 'problem', label: '问题报告', value: visibleRows.value.filter(isProblem).length },
])
const filteredRows = computed(() => visibleRows.value.filter((row) => {
  const company = companySearch.value.trim().toLowerCase(), crm = crmSearch.value.trim().toLowerCase()
  const date = String(row.fetchedAt || '').slice(0, 10)
  return (!company || [row.companyName, row.reportName].some((v) => String(v || '').toLowerCase().includes(company)))
    && (!crm || String(row.crmCode || '').toLowerCase().includes(crm))
    && (!reportTypeFilter.value || row.reportType === reportTypeFilter.value || (reportTypeFilter.value === '港股财报' && row.reportType === '港股财务报告'))
    && (!yearFilter.value || row.year === yearFilter.value)
    && (!periodFilter.value || reportPeriod(row) === periodFilter.value)
    && (!scopeFilter.value || row.scopeKey === scopeFilter.value)
    && (!statusFilter.value || row.parseStatus === statusFilter.value)
    && (!startDate.value || date >= startDate.value) && (!endDate.value || date <= endDate.value)
}))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))
const paginatedRows = computed(() => filteredRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
const applyCard = (card) => { reportTypeFilter.value = ['all', 'problem'].includes(card.key) ? '' : card.label; statusFilter.value = card.key === 'problem' ? '失败' : '' }
const resetFilters = () => { companySearch.value = ''; crmSearch.value = ''; reportTypeFilter.value = ''; yearFilter.value = ''; periodFilter.value = ''; scopeFilter.value = ''; statusFilter.value = ''; startDate.value = ''; endDate.value = '' }
const jumpPage = () => { const page = Number(jumpPageInput.value); currentPage.value = Number.isFinite(page) ? Math.min(Math.max(page, 1), totalPages.value) : currentPage.value; jumpPageInput.value = String(currentPage.value) }
watch([companySearch, crmSearch, reportTypeFilter, yearFilter, periodFilter, scopeFilter, statusFilter, startDate, endDate, pageSize], () => { currentPage.value = 1; jumpPageInput.value = '1' })
</script>

<template>
  <main class="module-main"><section class="library-workspace unified-library">
    <div class="workbench-top"><div class="workbench-head"><h1>报告库</h1></div></div>
    <section class="library-stat-grid"><button v-for="card in cards" :key="card.key" class="library-stat-card" type="button" @click="applyCard(card)"><span>{{ card.label }}</span><strong>{{ card.value }}</strong></button></section>
    <section class="workbench-panel library-filter-panel"><div class="library-filter-grid">
      <label><span>主体名称</span><input v-model="companySearch" placeholder="输入主体名称" /></label>
      <label><span>CRM Code</span><input v-model="crmSearch" placeholder="输入 CRM Code" /></label>
      <label><span>报告类型</span><select v-model="reportTypeFilter"><option value="">全部类型</option><option v-for="item in reportTypeOptions" :key="item">{{ item }}</option></select></label>
      <label><span>年份</span><select v-model="yearFilter"><option value="">全部年份</option><option v-for="item in yearOptions" :key="item">{{ item }}</option></select></label>
      <label><span>报告期</span><select v-model="periodFilter"><option value="">全部报告期</option><option v-for="item in periodOptions" :key="item">{{ item }}</option></select></label>
      <label><span>公开属性</span><select v-model="scopeFilter"><option value="">全部属性</option><option value="public">公开</option><option value="private">非公开</option></select></label>
      <label><span>解析状态</span><select v-model="statusFilter"><option value="">全部状态</option><option v-for="item in statusOptions" :key="item">{{ item }}</option><option v-if="!statusOptions.includes('异常')">异常</option></select></label>
      <label class="library-date-field"><span>上传 / 获取时间</span><div><input v-model="startDate" type="date" /><b>至</b><input v-model="endDate" type="date" /></div></label>
      <button class="config-secondary-button" type="button" @click="resetFilters">重置</button>
    </div></section>
    <section class="workbench-panel library-list-panel"><div class="panel-head"><div><h2>报告清单</h2></div></div>
      <div class="library-table-wrap"><table class="history-table library-table unified-library-table">
        <thead><tr><th>主体名称</th><th>CRM Code</th><th>报告类型</th><th>年份</th><th>报告期</th><th>最新报告期</th><th>公开属性</th><th>解析状态</th><th>原始表格数量</th><th>目标表格数量</th><th>命中表格数量</th><th>上传 / 获取时间</th><th>查看数据</th><th>下载</th></tr></thead>
        <tbody>
          <tr v-for="row in paginatedRows" :key="`${row.scopeKey}-${row.id}`">
            <td><strong>{{ row.companyName }}</strong><small>{{ row.reportName }}</small></td><td>{{ row.crmCode || '-' }}</td><td>{{ row.reportType }}</td><td>{{ row.year || '-' }}</td><td>{{ reportPeriod(row) }}</td><td>{{ latestReportPeriod(row) }}</td><td><span class="library-scope-badge">{{ row.scopeLabel }}</span></td>
            <td><span :class="['history-status', row.parseStatus === '已完成' ? 'success' : row.parseStatus === '失败' || row.parseStatus === '异常' ? 'danger' : row.parseStatus === '处理中' ? 'info' : 'warning']">{{ row.parseStatus }}</span></td>
            <td class="library-count-cell">{{ row.rawTableCount ?? 0 }}</td><td class="library-count-cell">{{ row.targetTableCount ?? 0 }}</td><td class="library-count-cell">{{ row.matchedTableCount ?? 0 }}</td><td>{{ row.fetchedAt }}</td>
            <td><button class="history-action-button" type="button" :disabled="row.parseStatus !== '已完成'" @click="emit('view-report', row)">查看数据</button></td><td><ReportDownloadMenu :record="row" /></td>
          </tr><tr v-if="!paginatedRows.length"><td colspan="14" class="library-empty-row">暂无符合条件的报告</td></tr>
        </tbody>
      </table></div>
      <div class="library-pagination"><span>共 <strong>{{ filteredRows.length }}</strong> 条，当前第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页</span><div class="history-pagination-controls"><span>每页</span><select v-model.number="pageSize"><option :value="10">10</option><option :value="20">20</option><option :value="50">50</option></select><span>条</span><button type="button" :disabled="currentPage <= 1" @click="currentPage--">上一页</button><button type="button" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button><span>跳至</span><input v-model="jumpPageInput" type="number" min="1" :max="totalPages" /><span>页</span><button type="button" @click="jumpPage">确定</button></div></div>
    </section>
  </section></main>
</template>
