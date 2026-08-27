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
const activeCompletedIssueFilter = ref('all')
const selectedCompletedAlert = ref(null)
const completedPageSize = ref(10)
const completedCurrentPage = ref(1)
const completedJumpPageInput = ref('1')

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

const completedIssueDefinitions = {
  no_an14: {
    title: '无资产负债表',
    definition: '已完成报告在结果表中应至少存在一张资产负债表（AN14）；若未进入，则判定流程存在缺表问题。',
  },
  no_an15: {
    title: '无利润表',
    definition: '已完成报告在结果表中应至少存在一张利润表（AN15）；若未进入，则判定流程存在缺表问题。',
  },
  no_an16: {
    title: '无现金流量表',
    definition: '已完成报告在结果表中应至少存在一张现金流量表（AN16）；若未进入，则判定流程存在缺表问题。',
  },
  low_an14: {
    title: '资产负债表行数低于阈值',
    definition: `已完成报告虽然存在资产负债表，但若行数低于经验阈值 ${COMPLETED_ROW_THRESHOLDS.an14}，则认为三表抽取疑似不完整。`,
  },
  low_an15: {
    title: '利润表行数低于阈值',
    definition: `已完成报告虽然存在利润表，但若行数低于经验阈值 ${COMPLETED_ROW_THRESHOLDS.an15}，则认为三表抽取疑似不完整。`,
  },
  low_an16: {
    title: '现金流量表行数低于阈值',
    definition: `已完成报告虽然存在现金流量表，但若行数低于经验阈值 ${COMPLETED_ROW_THRESHOLDS.an16}，则认为三表抽取疑似不完整。`,
  },
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
  if (activeReportType.value === 'all') return sectionRows.value
  return sectionRows.value.filter((row) => row.normalizedReportType === activeReportType.value)
})

const dateWindow = computed(() => {
  const end = parseDate(`${props.referenceDate} 23:59:59`)
  const days = activeRange.value?.days || 1
  const start = parseDate(`${props.referenceDate} 00:00:00`)
  start.setDate(start.getDate() - days + 1)
  return { start, end }
})

const inWindow = (date) => {
  if (!date) return false
  return date >= dateWindow.value.start && date <= dateWindow.value.end
}

const kpiSummary = computed(() => {
  const rows = filteredSectionRows.value
  const rangeRows = rows.filter((row) => inWindow(row.createdAt))
  const total = rows.filter((row) => row.createdAt && row.createdAt <= dateWindow.value.end).length
  const added = rangeRows.length
  const completed = rangeRows.filter((row) => row.normalizedStatus === 'success').length
  const failed = rangeRows.filter((row) => row.normalizedStatus === 'failed').length
  const pending = rangeRows.filter((row) => row.normalizedStatus === 'pending' || row.normalizedStatus === 'processing').length

  return [
    { key: 'total', label: '总量', value: total, note: `截至 ${props.referenceDate} 的累计任务数`, tone: '', icon: '▣' },
    { key: 'added', label: '新增', value: added, note: `${activeRange.value.label}内新增任务`, tone: 'tone-success', icon: '+' },
    { key: 'completed', label: '已完成', value: completed, note: `${activeRange.value.label}内已完成`, tone: 'tone-success', icon: '✓' },
    { key: 'pending', label: '待完成', value: pending, note: '包含处理中与待处理任务', tone: 'tone-warning', icon: '◌' },
    { key: 'failed', label: '失败', value: failed, note: `${activeRange.value.label}内失败任务`, tone: 'tone-danger', icon: '!' },
  ]
})

const trendPoints = computed(() => {
  const endDay = parseDate(`${props.referenceDate} 00:00:00`)
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
  const rows = filteredSectionRows.value.filter((row) => inWindow(row.createdAt))
  return [
    { key: 'success', label: '已完成', value: rows.filter((row) => row.normalizedStatus === 'success').length, color: '#59cb61' },
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

const completedRows = computed(() => {
  return filteredSectionRows.value
    .filter((row) => row.normalizedStatus === 'success' && inWindow(row.updatedAt))
    .map((row, index) => ({
      ...row,
      monitorTables: buildCompletedTableStatus(row, index),
    }))
})

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
  [activeSectionKey, activeRangeKey, activeReportType, activeCompletedIssueFilter, completedPageSize],
  () => {
    completedCurrentPage.value = 1
    completedJumpPageInput.value = '1'
  },
)

watch(completedTotalPages, (value) => {
  if (completedCurrentPage.value > value) {
    completedCurrentPage.value = value
  }
  completedJumpPageInput.value = String(completedCurrentPage.value)
})

const windowText = computed(() => `${formatDayKey(dateWindow.value.start)} 至 ${formatDayKey(dateWindow.value.end)}`)
</script>

<template>
  <section class="monitor-shell">
    <div class="monitor-section-header">
      <div class="monitor-section-intro">
        <span>数量监测</span>
        <h2>数量监测</h2>
        <p>先按公开 / 非公开两类来源拆开看，再用时间窗口和报告类型组合筛选数量变化。</p>
      </div>

      <div class="monitor-header-filters">
        <label class="field monitor-select-field">
          <span>报告范围</span>
          <select v-model="activeSectionKey">
            <option v-for="section in countSections" :key="section.key" :value="section.key">
              {{ section.title }}
            </option>
          </select>
        </label>

        <label class="field monitor-select-field">
          <span>报告类型</span>
          <select v-model="activeReportType">
            <option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="monitor-count-view">
      <article v-if="activeSection" class="workbench-panel monitor-source-panel">
        <div class="monitor-source-head">
          <div>
            <span>{{ activeSection.englishLabel }}</span>
            <h3>{{ activeSection.title }}</h3>
            <p>{{ activeSection.description }}</p>
          </div>
          <div class="monitor-source-badge">{{ activeSection.sourceTag }}</div>
        </div>

        <div class="monitor-range-switch">
          <button
            v-for="item in rangeOptions"
            :key="item.key"
            :class="['monitor-range-btn', { active: activeRangeKey === item.key }]"
            type="button"
            @click="activeRangeKey = item.key"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="monitor-window-note">
          <strong>统计窗口：</strong>{{ windowText }}
        </div>

        <div class="monitor-kpi-grid">
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

      <div class="monitor-chart-grid">
        <article class="workbench-panel monitor-chart-panel monitor-trend-chart">
          <div class="monitor-filter-head">
            <div>
              <span class="login-kicker">TREND</span>
              <h3>任务趋势</h3>
              <p class="monitor-placeholder-text">先看新增任务与完成任务的日趋势，满足当前交付展示。</p>
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
            <p class="monitor-placeholder-text">按历史记录一致的四种处理状态展示当前窗口内的数量结构。</p>
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

      <article class="workbench-panel monitor-detail-panel">
        <div class="monitor-filter-head">
          <div>
            <span class="login-kicker">COMPLETED TASK CHECK</span>
            <h3>已完成任务监测</h3>
            <p class="monitor-placeholder-text">这里只看当前窗口内已经完成的报告，重点检查三表是否齐全，以及三张表的行数是否低于阈值。</p>
          </div>
        </div>

        <div class="monitor-kpi-grid monitor-completed-kpi-grid">
          <article
            v-for="metric in completedIssueCards"
            :key="metric.key"
            :class="['workbench-panel monitor-kpi-card', metric.tone, 'monitor-kpi-card-clickable', { active: activeCompletedIssueFilter === metric.key }]"
            @click="toggleCompletedIssueFilter(metric.key)"
          >
            <span class="monitor-kpi-icon">{{ metric.icon }}</span>
            <span class="monitor-kpi-label">{{ metric.label }}</span>
            <strong class="monitor-kpi-value">{{ metric.value }}</strong>
            <p>{{ metric.note }}</p>
          </article>
        </div>

        <div class="monitor-filter-head monitor-completed-filter-row">
          <button
            v-if="activeCompletedIssueFilter !== 'all'"
            class="quad-link page-btn"
            type="button"
            @click="activeCompletedIssueFilter = 'all'"
          >
            清空规则筛选
          </button>
        </div>

        <div class="history-table-wrap">
          <table class="history-table monitor-history-table downstream-history-table">
            <thead>
              <tr>
                <th>主体名称</th>
                <th>报告类型</th>
                <th>报告期</th>
                <th>触发规则</th>
                <th>完成时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in paginatedCompletedIssues"
                :key="item.id"
                class="monitor-alert-row"
                @click="selectedCompletedAlert = item"
              >
                <td class="monitor-name-cell">
                  <strong>{{ item.row.company_name }}</strong>
                  <small>{{ item.row.crmcode }}</small>
                </td>
                <td>{{ reportTypeLabelMap[item.row.normalizedReportType] || item.row.normalizedReportType }}</td>
                <td>{{ item.row.report_year }}{{ quarterLabelMap[item.row.report_quarter] || item.row.report_quarter }}</td>
                <td><span class="status-pill danger">{{ item.label }}</span></td>
                <td>{{ item.row.update_time.slice(0, 16) }}</td>
              </tr>
              <tr v-if="!paginatedCompletedIssues.length">
                <td colspan="5" class="empty-row">当前筛选条件下暂无疑似问题</td>
              </tr>
            </tbody>
          </table>

          <div class="history-pagination">
            <div class="pagination-summary">
              共 <strong>{{ completedTotalCount }}</strong> 条，当前第
              <strong>{{ completedCurrentPage }}</strong> / <strong>{{ completedTotalPages }}</strong> 页
            </div>

            <div class="pagination-controls">
              <label class="page-size-select">
                <span>每页</span>
                <select v-model="completedPageSize">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span>条</span>
              </label>

              <button class="quad-link page-btn" type="button" :disabled="completedCurrentPage === 1" @click="goPrevCompletedPage">上一页</button>

              <button class="quad-link page-btn" type="button" :disabled="completedCurrentPage === completedTotalPages" @click="goNextCompletedPage">下一页</button>

              <form class="jump-form" @submit.prevent="submitCompletedJumpPage">
                <span>跳至</span>
                <input v-model="completedJumpPageInput" type="number" min="1" :max="completedTotalPages" />
                <span>页</span>
                <button class="quad-link page-btn" type="submit">确定</button>
              </form>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="selectedCompletedAlertDetail" class="monitor-drawer-mask" @click.self="selectedCompletedAlert = null">
      <aside class="monitor-detail-drawer">
        <div class="monitor-drawer-head">
          <div>
            <span>ALERT DETAIL</span>
            <h3>{{ selectedCompletedAlertDetail.title }}</h3>
          </div>
          <button class="monitor-drawer-close" @click="selectedCompletedAlert = null">×</button>
        </div>

        <div class="monitor-drawer-grid">
          <article class="monitor-drawer-item">
            <span>主体名称</span>
            <strong>{{ selectedCompletedAlertDetail.row.company_name }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>报告类型</span>
            <strong>{{ reportTypeLabelMap[selectedCompletedAlertDetail.row.normalizedReportType] || selectedCompletedAlertDetail.row.normalizedReportType }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>报告期</span>
            <strong>{{ selectedCompletedAlertDetail.row.report_year }}{{ quarterLabelMap[selectedCompletedAlertDetail.row.report_quarter] || selectedCompletedAlertDetail.row.report_quarter }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>完成时间</span>
            <strong>{{ selectedCompletedAlertDetail.row.update_time.slice(0, 16) }}</strong>
          </article>
        </div>

        <article class="monitor-pageindex-card">
          <strong>规则定义</strong>
          <p class="monitor-placeholder-text">{{ selectedCompletedAlertDetail.definition }}</p>
        </article>

        <article class="monitor-pageindex-card">
          <strong>本次为什么触发</strong>
          <p class="monitor-placeholder-text">{{ selectedCompletedAlertDetail.triggerReason }}</p>
        </article>

        <article class="monitor-pageindex-card">
          <strong>当前三表快照</strong>
          <p class="monitor-placeholder-text">
            {{
              selectedCompletedAlertDetail.row.monitorTables
                .filter((item) => !item.notApplicable)
                .map((item) => `${item.code}: ${item.entered ? `已入表，行数 ${item.count}` : '未入表'}`)
                .join(' / ')
            }}
          </p>
        </article>
      </aside>
    </div>
  </section>
</template>
