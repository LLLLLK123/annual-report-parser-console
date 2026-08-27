<script setup>
import { computed, ref } from 'vue'
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

const recentRows = computed(() => {
  return [...filteredSectionRows.value]
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    .slice(0, 8)
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
            <span class="login-kicker">RECENT TASKS</span>
            <h3>最近任务</h3>
            <p class="monitor-placeholder-text">这里显示当前数量监测口径下的最新任务，使用 crawler 全量数据，不受上传人限制。</p>
          </div>
        </div>

        <div class="history-table-wrap">
          <table class="history-table monitor-history-table">
            <thead>
              <tr>
                <th>主体名称</th>
                <th>报告类型</th>
                <th>报告年份</th>
                <th>报告季度</th>
                <th>处理状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in recentRows" :key="row.id">
                <td class="monitor-name-cell">
                  <strong>{{ row.company_name }}</strong>
                  <small>{{ row.crmcode }}</small>
                </td>
                <td>{{ reportTypeLabelMap[row.normalizedReportType] || row.normalizedReportType }}</td>
                <td>{{ row.report_year }}</td>
                <td>{{ row.report_quarter }}</td>
                <td>
                  <span :class="['status-pill', statusClassMap[row.normalizedStatus] || 'muted']">
                    {{ statusLabelMap[row.normalizedStatus] || row.normalizedStatus }}
                  </span>
                </td>
                <td>{{ row.create_time.slice(0, 16) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>
