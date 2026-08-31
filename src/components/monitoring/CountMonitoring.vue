<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeReportTypeKey, normalizeStatusKey, reportTypeLabelMap } from '../../data/uploadSeeds'

const props = defineProps({
  countSections: { type: Array, required: true },
  countRows: { type: Array, required: true },
  rangeOptions: { type: Array, required: true },
  referenceDate: { type: String, required: true },
})

const activeSectionKey = ref(props.countSections[0]?.key || 'public')
const activeRangeKey = ref(props.rangeOptions[0]?.key || 'today')
const activeReportType = ref('all')
const companyKeyword = ref('')
const crmKeyword = ref('')
const activeStatus = ref('all')
const activeReportPeriod = ref('all')
const taskPageSize = ref(10)
const taskCurrentPage = ref(1)
const taskJumpPageInput = ref('1')
const selectedTaskDetail = ref(null)

const COMPLETED_ROW_THRESHOLDS = {
  an14: 70,
  an15: 24,
  an16: 36,
}

const statusLabelMap = {
  pending: '待处理',
  processing: '处理中',
  success: '已完成',
  failed: '失败',
}

const statusClassMap = {
  pending: 'warning',
  processing: 'info',
  success: 'success',
  failed: 'danger',
}

const quarterLabelMap = {
  1: '一季报',
  2: '半年报',
  3: '三季报',
  4: '年报',
}

const parseDate = (value) => {
  if (!value) return null
  return new Date(value.replace(' ', 'T'))
}

const formatDayKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date, offset) => {
  const next = new Date(date)
  next.setDate(next.getDate() + offset)
  return next
}

const todayKey = formatDayKey(new Date())

const activeSection = computed(() => {
  return props.countSections.find((section) => section.key === activeSectionKey.value) || props.countSections[0]
})

const activeRange = computed(() => {
  return props.rangeOptions.find((option) => option.key === activeRangeKey.value) || props.rangeOptions[0]
})

const normalizedRows = computed(() => {
  return props.countRows.map((row) => ({
    ...row,
    normalizedReportType: normalizeReportTypeKey(row.report_type),
    normalizedStatus: normalizeStatusKey(row.all_status),
    createdAt: parseDate(row.create_time),
    updatedAt: parseDate(row.update_time),
    createdDay: row.create_time ? row.create_time.slice(0, 10) : '',
    updatedDay: row.update_time ? row.update_time.slice(0, 10) : '',
  }))
})

const sectionRows = computed(() => {
  const targetPublicFlag = activeSectionKey.value === 'public' ? 1 : 2
  return normalizedRows.value.filter((row) => row.is_public === targetPublicFlag)
})

const reportTypeOptions = computed(() => {
  const values = [...new Set(sectionRows.value.map((row) => row.normalizedReportType).filter(Boolean))]
  return [
    { value: 'all', label: '全部类型' },
    ...values.map((value) => ({ value, label: reportTypeLabelMap[value] || value })),
  ]
})

const filteredSectionRows = computed(() => {
  return sectionRows.value.filter((row) => {
    if (activeReportType.value !== 'all' && row.normalizedReportType !== activeReportType.value) return false
    if (activeStatus.value !== 'all' && row.normalizedStatus !== activeStatus.value) return false
    if (activeReportPeriod.value !== 'all' && String(row.report_quarter) !== activeReportPeriod.value) return false
    if (companyKeyword.value.trim() && !row.company_name?.toLowerCase().includes(companyKeyword.value.trim().toLowerCase())) return false
    if (crmKeyword.value.trim() && !row.crmcode?.toLowerCase().includes(crmKeyword.value.trim().toLowerCase())) return false
    return true
  })
})

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'success', label: '已完成' },
  { value: 'processing', label: '处理中' },
  { value: 'pending', label: '待处理' },
  { value: 'failed', label: '失败' },
]

const reportPeriodOptions = [
  { value: 'all', label: '全部报告期' },
  { value: '1', label: '一季报' },
  { value: '2', label: '半年报' },
  { value: '3', label: '三季报' },
  { value: '4', label: '年报' },
]

const dateWindow = computed(() => {
  const end = parseDate(`${todayKey} 23:59:59`)
  const days = activeRange.value?.days || 1
  const start = parseDate(`${todayKey} 00:00:00`)
  start.setDate(start.getDate() - days + 1)
  return { start, end }
})

const inWindow = (date) => {
  if (!date) return false
  return date >= dateWindow.value.start && date <= dateWindow.value.end
}

const monitoredWindowRows = computed(() => filteredSectionRows.value.filter(
  (row) => inWindow(row.createdAt) || inWindow(row.updatedAt),
))

const kpiSummary = computed(() => {
  const rows = monitoredWindowRows.value
  const total = rows.length
  const completed = rows.filter((row) => row.normalizedStatus === 'success').length
  const processing = rows.filter((row) => row.normalizedStatus === 'processing').length
  const pending = rows.filter((row) => row.normalizedStatus === 'pending').length
  const failed = rows.filter((row) => row.normalizedStatus === 'failed').length

  const abnormal = rows.filter((row, index) => {
    if (row.normalizedStatus === 'failed') return true
    if (row.normalizedStatus !== 'success') return false
    return buildCompletedAlertItems({ ...row, monitorTables: buildCompletedTableStatus(row, index) }).length > 0
  }).length

  const rangeLabel = activeRangeKey.value === 'today' ? '当日' : activeRange.value.label

  return [
    { key: 'total', label: '总量', value: total, note: `${rangeLabel}已处理报告总量`, tone: '', icon: '▣' },
    { key: 'completed', label: '已完成', value: completed, note: `${rangeLabel}已完成报告数`, tone: 'tone-success', icon: '✓' },
    { key: 'processing', label: '处理中', value: processing, note: `${rangeLabel}处理中报告数`, tone: 'tone-info', icon: '↻' },
    { key: 'pending', label: '待处理', value: pending, note: `${rangeLabel}待处理报告数`, tone: 'tone-warning', icon: '◌' },
    { key: 'failed', label: '失败', value: failed, note: `${rangeLabel}失败报告数`, tone: 'tone-danger', icon: '!' },
    { key: 'abnormal', label: '异常预警', value: abnormal, note: '识别失败或三表校验异常', tone: 'tone-danger', icon: '⚠' },
  ]
})

const taskMonitorRows = computed(() => monitoredWindowRows.value.map((row, index) => {
    const monitorTables = buildCompletedTableStatus(row, index)
    const alerts = row.normalizedStatus === 'success' ? buildCompletedAlertItems({ ...row, monitorTables }) : []
    return { ...row, monitorTables, alerts }
  }))

const taskTotalCount = computed(() => taskMonitorRows.value.length)
const taskTotalPages = computed(() => Math.max(1, Math.ceil(taskTotalCount.value / taskPageSize.value)))
const paginatedTaskRows = computed(() => {
  const start = (taskCurrentPage.value - 1) * taskPageSize.value
  return taskMonitorRows.value.slice(start, start + taskPageSize.value)
})

const setTaskPage = (page) => {
  taskCurrentPage.value = Math.min(Math.max(1, page), taskTotalPages.value)
  taskJumpPageInput.value = String(taskCurrentPage.value)
}

const submitTaskJumpPage = () => setTaskPage(Number(taskJumpPageInput.value) || 1)

const resetCountFilters = () => {
  activeRangeKey.value = props.rangeOptions[0]?.key || 'today'
  activeReportType.value = 'all'
  activeReportPeriod.value = 'all'
  activeStatus.value = 'all'
  companyKeyword.value = ''
  crmKeyword.value = ''
}

const trendPoints = computed(() => {
  const endDay = parseDate(`${todayKey} 00:00:00`)
  const days = activeRange.value?.days || 1

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(endDay, index - days + 1)
    const dayKey = formatDayKey(current)
    const dayRows = filteredSectionRows.value.filter((row) => row.createdDay === dayKey)
    const completedRows = filteredSectionRows.value.filter((row) => row.updatedDay === dayKey && row.normalizedStatus === 'success')

    return {
      key: dayKey,
      label: dayKey.slice(5),
      added: dayRows.length,
      completed: completedRows.length,
    }
  })
})

const maxTrendValue = computed(() => {
  const values = trendPoints.value.flatMap((point) => [point.added, point.completed])
  return Math.max(...values, 1)
})

const buildLinePath = (field) => {
  if (!trendPoints.value.length) return ''
  const width = 520
  const height = 180
  const paddingX = 18
  const paddingY = 18
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingY * 2

  return trendPoints.value
    .map((point, index) => {
      const x = paddingX + (usableWidth * index) / Math.max(trendPoints.value.length - 1, 1)
      const y = paddingY + usableHeight - (point[field] / maxTrendValue.value) * usableHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const distributionItems = computed(() => {
  const rows = monitoredWindowRows.value
  return [
    { key: 'success', label: '已完成', value: rows.filter((row) => row.normalizedStatus === 'success').length, color: '#4b67d9' },
    { key: 'processing', label: '处理中', value: rows.filter((row) => row.normalizedStatus === 'processing').length, color: '#58a6ff' },
    { key: 'pending', label: '待处理', value: rows.filter((row) => row.normalizedStatus === 'pending').length, color: '#f4bf4f' },
    { key: 'failed', label: '失败', value: rows.filter((row) => row.normalizedStatus === 'failed').length, color: '#ff7b72' },
  ]
})

const distributionTotal = computed(() => distributionItems.value.reduce((sum, item) => sum + item.value, 0))

const donutStyle = computed(() => {
  const total = distributionTotal.value || 1
  let current = 0
  const segments = distributionItems.value.map((item) => {
    const start = (current / total) * 100
    current += item.value
    const end = (current / total) * 100
    return `${item.color} ${start}% ${end}%`
  })
  return {
    background: `conic-gradient(${segments.join(', ')})`,
  }
})

const buildCompletedTableStatus = (row, index) => {
  if (row.normalizedReportType !== 'financial' && row.normalizedReportType !== 'hk') {
    return [
      { code: 'AN14', label: '资产负债表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: true },
      { code: 'AN15', label: '利润表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: true },
      { code: 'AN16', label: '现金流量表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: true },
    ]
  }

  const pattern = index % 6

  if (pattern === 0) {
    return [
      { code: 'AN14', label: '资产负债表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
      { code: 'AN15', label: '利润表', entered: true, count: 28, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
      { code: 'AN16', label: '现金流量表', entered: true, count: 42, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
    ]
  }

  if (pattern === 1) {
    return [
      { code: 'AN14', label: '资产负债表', entered: true, count: 84, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
      { code: 'AN15', label: '利润表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
      { code: 'AN16', label: '现金流量表', entered: true, count: 41, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
    ]
  }

  if (pattern === 2) {
    return [
      { code: 'AN14', label: '资产负债表', entered: true, count: 82, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
      { code: 'AN15', label: '利润表', entered: true, count: 26, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
      { code: 'AN16', label: '现金流量表', entered: false, count: 0, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
    ]
  }

  if (pattern === 3) {
    return [
      { code: 'AN14', label: '资产负债表', entered: true, count: 61, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
      { code: 'AN15', label: '利润表', entered: true, count: 28, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
      { code: 'AN16', label: '现金流量表', entered: true, count: 40, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
    ]
  }

  if (pattern === 4) {
    return [
      { code: 'AN14', label: '资产负债表', entered: true, count: 78, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
      { code: 'AN15', label: '利润表', entered: true, count: 18, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
      { code: 'AN16', label: '现金流量表', entered: true, count: 39, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
    ]
  }

  return [
    { code: 'AN14', label: '资产负债表', entered: true, count: 80, threshold: COMPLETED_ROW_THRESHOLDS.an14, notApplicable: false },
    { code: 'AN15', label: '利润表', entered: true, count: 28, threshold: COMPLETED_ROW_THRESHOLDS.an15, notApplicable: false },
    { code: 'AN16', label: '现金流量表', entered: true, count: 30, threshold: COMPLETED_ROW_THRESHOLDS.an16, notApplicable: false },
  ]
}

const buildCompletedAlertItems = (row) => {
  const tables = Object.fromEntries((row.monitorTables || []).map((item) => [item.code, item]))
  const alerts = []

  if (tables.AN14 && !tables.AN14.notApplicable && !tables.AN14.entered) {
    alerts.push({ key: 'no_an14', label: '无资产负债表' })
  }
  if (tables.AN15 && !tables.AN15.notApplicable && !tables.AN15.entered) {
    alerts.push({ key: 'no_an15', label: '无利润表' })
  }
  if (tables.AN16 && !tables.AN16.notApplicable && !tables.AN16.entered) {
    alerts.push({ key: 'no_an16', label: '无现金流量表' })
  }
  if (tables.AN14 && !tables.AN14.notApplicable && tables.AN14.entered && tables.AN14.count < tables.AN14.threshold) {
    alerts.push({ key: 'low_an14', label: `资产负债表行数低于阈值（${tables.AN14.count}/${tables.AN14.threshold}）` })
  }
  if (tables.AN15 && !tables.AN15.notApplicable && tables.AN15.entered && tables.AN15.count < tables.AN15.threshold) {
    alerts.push({ key: 'low_an15', label: `利润表行数低于阈值（${tables.AN15.count}/${tables.AN15.threshold}）` })
  }
  if (tables.AN16 && !tables.AN16.notApplicable && tables.AN16.entered && tables.AN16.count < tables.AN16.threshold) {
    alerts.push({ key: 'low_an16', label: `现金流量表行数低于阈值（${tables.AN16.count}/${tables.AN16.threshold}）` })
  }

  return alerts
}

const completedIssueRows = computed(() => {
  return completedRows.value.flatMap((row) =>
    buildCompletedAlertItems(row).map((alert, index) => ({
      id: `completed-${row.id}-${alert.key}-${index}`,
      row,
      ...alert,
    })),
  )
})

const completedIssueCards = computed(() => {
  const countByKey = (key) => completedIssueRows.value.filter((item) => item.key === key).length
  return [
    { key: 'no_an14', label: '无资产负债表', value: countByKey('no_an14'), note: 'AN14 未进入结果表', icon: '14', tone: 'tone-warning' },
    { key: 'no_an15', label: '无利润表', value: countByKey('no_an15'), note: 'AN15 未进入结果表', icon: '15', tone: 'tone-warning' },
    { key: 'no_an16', label: '无现金流量表', value: countByKey('no_an16'), note: 'AN16 未进入结果表', icon: '16', tone: 'tone-warning' },
    { key: 'low_an14', label: '资产负债表行数过少', value: countByKey('low_an14'), note: `低于阈值 ${COMPLETED_ROW_THRESHOLDS.an14}`, icon: 'L14', tone: 'tone-danger' },
    { key: 'low_an15', label: '利润表行数过少', value: countByKey('low_an15'), note: `低于阈值 ${COMPLETED_ROW_THRESHOLDS.an15}`, icon: 'L15', tone: 'tone-danger' },
    { key: 'low_an16', label: '现金流量表行数过少', value: countByKey('low_an16'), note: `低于阈值 ${COMPLETED_ROW_THRESHOLDS.an16}`, icon: 'L16', tone: 'tone-danger' },
  ]
})

const filteredCompletedIssues = computed(() => {
  if (activeCompletedIssueFilter.value === 'all') return completedIssueRows.value
  return completedIssueRows.value.filter((item) => item.key === activeCompletedIssueFilter.value)
})

const completedTotalCount = computed(() => filteredCompletedIssues.value.length)
const completedTotalPages = computed(() => Math.max(1, Math.ceil(completedTotalCount.value / completedPageSize.value)))

const paginatedCompletedIssues = computed(() => {
  const start = (completedCurrentPage.value - 1) * completedPageSize.value
  return filteredCompletedIssues.value.slice(start, start + completedPageSize.value)
})

const selectedCompletedAlertDetail = computed(() => {
  if (!selectedCompletedAlert.value) return null
  const config = completedIssueDefinitions[selectedCompletedAlert.value.key] || {
    title: selectedCompletedAlert.value.label,
    definition: '该规则定义暂未补充。',
  }

  const tableMap = Object.fromEntries((selectedCompletedAlert.value.row.monitorTables || []).map((item) => [item.code, item]))
  let triggerReason = '当前规则已触发，但尚未补充原因说明。'

  if (selectedCompletedAlert.value.key === 'no_an14') {
    triggerReason = `该报告当前 AN14 entered = ${tableMap.AN14?.entered ? 'true' : 'false'}，因此判定资产负债表未进入结果表。`
  } else if (selectedCompletedAlert.value.key === 'no_an15') {
    triggerReason = `该报告当前 AN15 entered = ${tableMap.AN15?.entered ? 'true' : 'false'}，因此判定利润表未进入结果表。`
  } else if (selectedCompletedAlert.value.key === 'no_an16') {
    triggerReason = `该报告当前 AN16 entered = ${tableMap.AN16?.entered ? 'true' : 'false'}，因此判定现金流量表未进入结果表。`
  } else if (selectedCompletedAlert.value.key === 'low_an14') {
    triggerReason = `该报告 AN14 已入表，但当前行数为 ${tableMap.AN14?.count ?? 0}，低于阈值 ${tableMap.AN14?.threshold ?? '-'}，因此触发。`
  } else if (selectedCompletedAlert.value.key === 'low_an15') {
    triggerReason = `该报告 AN15 已入表，但当前行数为 ${tableMap.AN15?.count ?? 0}，低于阈值 ${tableMap.AN15?.threshold ?? '-'}，因此触发。`
  } else if (selectedCompletedAlert.value.key === 'low_an16') {
    triggerReason = `该报告 AN16 已入表，但当前行数为 ${tableMap.AN16?.count ?? 0}，低于阈值 ${tableMap.AN16?.threshold ?? '-'}，因此触发。`
  }

  return {
    ...selectedCompletedAlert.value,
    title: config.title,
    definition: config.definition,
    triggerReason,
  }
})

const toggleCompletedIssueFilter = (key) => {
  activeCompletedIssueFilter.value = activeCompletedIssueFilter.value === key ? 'all' : key
}

const setCompletedPage = (page) => {
  completedCurrentPage.value = Math.min(Math.max(1, page), completedTotalPages.value)
  completedJumpPageInput.value = String(completedCurrentPage.value)
}

const goPrevCompletedPage = () => setCompletedPage(completedCurrentPage.value - 1)
const goNextCompletedPage = () => setCompletedPage(completedCurrentPage.value + 1)

const submitCompletedJumpPage = () => {
  const target = Number(completedJumpPageInput.value)
  if (Number.isNaN(target)) {
    completedJumpPageInput.value = String(completedCurrentPage.value)
    return
  }
  setCompletedPage(target)
}

watch(
  [activeSectionKey, activeRangeKey, activeReportType, activeReportPeriod, activeStatus, companyKeyword, crmKeyword, taskPageSize],
  () => {
    taskCurrentPage.value = 1
    taskJumpPageInput.value = '1'
  },
)

watch(taskTotalPages, (value) => {
  if (taskCurrentPage.value > value) taskCurrentPage.value = value
  taskJumpPageInput.value = String(taskCurrentPage.value)
})

const windowText = computed(() => `${formatDayKey(dateWindow.value.start)} 至 ${formatDayKey(dateWindow.value.end)}`)
</script>

<template>
  <section class="monitor-shell">
    <div class="monitor-section-intro"><h2>数量监测</h2></div>

    <div class="workbench-panel monitor-scope-tabs">
      <button
        v-for="section in countSections"
        :key="section.key"
        :class="['monitor-range-btn', { active: activeSectionKey === section.key }]"
        type="button"
        @click="activeSectionKey = section.key"
      >{{ section.key === 'public' ? '公众报告' : '非公众报告' }}</button>
    </div>

    <article class="workbench-panel count-filter-panel">
      <div class="count-filter-grid">
        <label class="field"><span>统计范围</span><select v-model="activeRangeKey"><option v-for="item in rangeOptions" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
        <label class="field"><span>报告类型</span><select v-model="activeReportType"><option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <!-- 暂时隐藏报告期、公司名称、CRM Code 和任务状态筛选，保留对应逻辑供后续调整。 -->
        <!--
        <label class="field"><span>报告期</span><select v-model="activeReportPeriod"><option v-for="item in reportPeriodOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        <label class="field"><span>公司名称</span><input v-model="companyKeyword" placeholder="请输入公司名称" /></label>
        <label class="field"><span>CRM Code</span><input v-model="crmKeyword" placeholder="请输入CRM Code" /></label>
        <label class="field"><span>任务状态</span><select v-model="activeStatus"><option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
        -->
      </div>
      <div class="count-filter-actions">
        <button class="primary-btn compact" type="button">查询</button>
        <button class="quad-link page-btn" type="button" @click="resetCountFilters">重置</button>
      </div>
    </article>

    <div class="monitor-count-view">
      <article v-if="activeSection" class="monitor-source-panel count-summary-panel">
        <div class="monitor-window-note"><strong>统计窗口：</strong>{{ windowText }}</div>
        <div class="monitor-kpi-grid count-kpi-grid">
          <article
            v-for="metric in kpiSummary"
            :key="metric.key"
            :class="['workbench-panel monitor-kpi-card', metric.tone]"
          >
            <span class="monitor-kpi-icon">{{ metric.icon }}</span>
            <span class="monitor-kpi-label">{{ metric.label }}</span>
            <strong class="monitor-kpi-value">{{ metric.value }}</strong>
            <p>{{ metric.note }}</p>
          </article>
        </div>
      </article>

      <article class="workbench-panel monitor-detail-panel count-task-panel">
        <div class="monitor-filter-head"><h3>报告数量监测清单</h3></div>
        <div class="history-table-wrap">
          <table class="history-table count-task-table">
            <thead><tr><th>报告名称</th><th>公司名称</th><th>CRM Code</th><th>报告类型</th><th>报告期</th><th>识别状态</th><th>三表是否缺失</th><th>任务是否低于阈值</th><th>新增时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="row in paginatedTaskRows" :key="row.id">
                <td>{{ row.file_name }}</td>
                <td>{{ row.company_name }}</td>
                <td>{{ row.crmcode }}</td>
                <td>{{ reportTypeLabelMap[row.normalizedReportType] || row.normalizedReportType }}</td>
                <td>{{ row.report_year }}{{ quarterLabelMap[row.report_quarter] || row.report_quarter }}</td>
                <td><span :class="['status-pill', statusClassMap[row.normalizedStatus]]">{{ statusLabelMap[row.normalizedStatus] }}</span></td>
                <td><span :class="['status-pill', row.alerts.some((item) => item.key.startsWith('no_')) ? 'danger' : 'success']">{{ row.alerts.some((item) => item.key.startsWith('no_')) ? '缺失' : '正常' }}</span></td>
                <td><span :class="['status-pill', row.alerts.some((item) => item.key.startsWith('low_')) ? 'danger' : 'success']">{{ row.alerts.some((item) => item.key.startsWith('low_')) ? '异常' : '正常' }}</span></td>
                <td>{{ row.create_time.slice(0, 16) }}</td>
                <td><button class="quad-link page-btn count-detail-btn" type="button" @click="selectedTaskDetail = row">查看详情</button></td>
              </tr>
              <tr v-if="!paginatedTaskRows.length"><td colspan="10" class="empty-row">当前筛选条件下暂无任务</td></tr>
            </tbody>
          </table>
          <div class="history-pagination">
            <div class="pagination-summary">共 <strong>{{ taskTotalCount }}</strong> 条，当前第 <strong>{{ taskCurrentPage }}</strong> / <strong>{{ taskTotalPages }}</strong> 页</div>
            <div class="pagination-controls">
              <label class="page-size-select"><span>每页</span><select v-model="taskPageSize"><option :value="10">10</option><option :value="20">20</option><option :value="50">50</option></select><span>条</span></label>
              <button class="quad-link page-btn" type="button" :disabled="taskCurrentPage === 1" @click="setTaskPage(taskCurrentPage - 1)">上一页</button>
              <button class="quad-link page-btn" type="button" :disabled="taskCurrentPage === taskTotalPages" @click="setTaskPage(taskCurrentPage + 1)">下一页</button>
              <form class="jump-form" @submit.prevent="submitTaskJumpPage"><span>跳至</span><input v-model="taskJumpPageInput" type="number" min="1" :max="taskTotalPages" /><span>页</span><button class="quad-link page-btn" type="submit">确定</button></form>
            </div>
          </div>
        </div>
      </article>

      <div class="monitor-chart-grid">
        <article class="workbench-panel monitor-chart-panel monitor-trend-chart">
          <div class="monitor-filter-head">
            <div>
              <span class="login-kicker">TREND</span>
              <h3>任务趋势</h3>
              <!-- <p class="monitor-placeholder-text">先看新增任务与完成任务的日趋势，满足当前交付展示。</p> -->
            </div>
            <div class="monitor-legend">
              <span><i class="legend-dot added"></i>新增任务</span>
              <span><i class="legend-dot completed"></i>完成任务</span>
            </div>
          </div>

          <svg viewBox="0 0 520 180" aria-label="数量趋势图">
            <g class="monitor-grid-lines">
              <line x1="18" y1="18" x2="502" y2="18" />
              <line x1="18" y1="72" x2="502" y2="72" />
              <line x1="18" y1="126" x2="502" y2="126" />
              <line x1="18" y1="162" x2="502" y2="162" />
            </g>
            <path :d="buildLinePath('added')" class="monitor-line added-line" />
            <path :d="buildLinePath('completed')" class="monitor-line completed-line" />
          </svg>

          <div class="monitor-axis">
            <span v-for="point in trendPoints" :key="point.key">{{ point.label }}</span>
          </div>

          <div class="monitor-trend-summary">
            <div v-for="point in trendPoints.slice(-Math.min(trendPoints.length, 5))" :key="`${point.key}-summary`" class="monitor-trend-day">
              <strong>{{ point.label }}</strong>
              <span>新增 {{ point.added }}</span>
              <span>完成 {{ point.completed }}</span>
            </div>
          </div>
        </article>

        <article class="workbench-panel monitor-chart-panel monitor-distribution-content">
          <div>
            <span class="login-kicker">STATUS DISTRIBUTION</span>
            <h3>状态分布</h3>
          </div>

          <div class="monitor-donut" :style="donutStyle">
            <div class="monitor-donut-hole">
              <strong>{{ distributionTotal }}</strong>
              <span>窗口内任务</span>
            </div>
          </div>

          <div class="monitor-distribution-list">
            <div v-for="item in distributionItems" :key="item.key" class="monitor-distribution-item">
              <div class="monitor-distribution-name">
                <i class="legend-dot" :style="{ background: item.color }"></i>
                {{ item.label }}
              </div>
              <strong>{{ item.value }}</strong>
              <span>{{ distributionTotal ? `${Math.round((item.value / distributionTotal) * 100)}%` : '0%' }}</span>
            </div>
          </div>
        </article>
      </div>

    </div>

    <div v-if="selectedTaskDetail" class="monitor-drawer-mask" @click.self="selectedTaskDetail = null">
      <aside class="monitor-detail-drawer count-task-detail-drawer">
        <div class="monitor-drawer-head">
          <h3>任务监测详情</h3>
          <button class="monitor-drawer-close" type="button" @click="selectedTaskDetail = null">×</button>
        </div>

        <div class="monitor-drawer-grid count-task-base-grid">
          <article class="monitor-drawer-item"><span>报告名称</span><strong>{{ selectedTaskDetail.file_name }}</strong></article>
          <article class="monitor-drawer-item"><span>主体名称</span><strong>{{ selectedTaskDetail.company_name }}</strong></article>
          <article class="monitor-drawer-item"><span>CRM Code</span><strong>{{ selectedTaskDetail.crmcode }}</strong></article>
          <article class="monitor-drawer-item"><span>报告类型</span><strong>{{ reportTypeLabelMap[selectedTaskDetail.normalizedReportType] || selectedTaskDetail.normalizedReportType }}</strong></article>
          <article class="monitor-drawer-item"><span>报告期</span><strong>{{ selectedTaskDetail.report_year }}{{ quarterLabelMap[selectedTaskDetail.report_quarter] || selectedTaskDetail.report_quarter }}</strong></article>
          <article class="monitor-drawer-item"><span>识别状态</span><strong>{{ statusLabelMap[selectedTaskDetail.normalizedStatus] }}</strong></article>
          <article class="monitor-drawer-item"><span>新增时间</span><strong>{{ selectedTaskDetail.create_time.slice(0, 16) }}</strong></article>
          <article class="monitor-drawer-item"><span>更新时间</span><strong>{{ selectedTaskDetail.update_time.slice(0, 16) }}</strong></article>
        </div>

        <div class="count-three-table-grid">
          <article
            v-for="table in selectedTaskDetail.monitorTables"
            :key="table.code"
            :class="['count-three-table-card', { danger: !table.notApplicable && (!table.entered || table.count < table.threshold) }]"
          >
            <div class="count-three-table-head"><span>{{ table.code }}</span><strong>{{ table.label }}</strong></div>
            <dl>
              <div><dt>是否入表</dt><dd>{{ table.notApplicable ? '不适用' : table.entered ? '已入表' : '缺失' }}</dd></div>
              <div><dt>当前行数</dt><dd>{{ table.entered ? table.count : '-' }}</dd></div>
              <div><dt>最低阈值</dt><dd>{{ table.notApplicable ? '-' : table.threshold }}</dd></div>
              <div><dt>检查结果</dt><dd>{{ table.notApplicable ? '不适用' : !table.entered ? `缺少${table.label}` : table.count < table.threshold ? `低于阈值 ${table.threshold - table.count} 行` : '正常' }}</dd></div>
            </dl>
          </article>
        </div>
      </aside>
    </div>
  </section>
</template>
