<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  downstreamRows: { type: Array, required: true },
  referenceDate: { type: String, required: true },
})

const activeScopeKey = ref('public')
const activeReportType = ref('all')
const activeTriggerStatus = ref('all')
const activeAlertFilter = ref('all')
const selectedAlert = ref(null)

const downstreamStatusClassMap = {
  normal: 'success',
  triggered: 'danger',
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

const dateWindow = computed(() => {
  const start = parseDate(`${props.referenceDate} 00:00:00`)
  const end = parseDate(`${props.referenceDate} 23:59:59`)
  return { start, end }
})

const inWindow = (value) => {
  const date = parseDate(value)
  if (!date) return false
  return date >= dateWindow.value.start && date <= dateWindow.value.end
}

const scopeOptions = [
  { key: 'public', label: '公众报告' },
  { key: 'private', label: '非公众报告' },
]

const scopeRows = computed(() => {
  return props.downstreamRows.filter((row) => row.scopeKey === activeScopeKey.value)
})

const reportTypeOptions = computed(() => {
  const values = [...new Set(scopeRows.value.map((row) => row.reportTypeKey).filter(Boolean))]
  return [
    { value: 'all', label: '全部类型' },
    ...values.map((value) => ({
      value,
      label: scopeRows.value.find((row) => row.reportTypeKey === value)?.reportTypeLabel || value,
    })),
  ]
})

const triggerStatusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'triggered', label: '已触发' },
  { value: 'normal', label: '未触发' },
]

const ruleStatusClass = (triggered, notApplicable = false) => {
  if (notApplicable) return 'muted'
  return triggered ? 'danger' : 'success'
}

const chainSteps = (row) => {
  const tables = row.threeMajorTables || []
  const an14 = tables.find((item) => item.code === 'AN14')
  const an15 = tables.find((item) => item.code === 'AN15')
  const an16 = tables.find((item) => item.code === 'AN16')

  return [
    {
      key: 'sync',
      label: '前一日入表',
      triggered: row.yesterdaySyncTriggered,
      notApplicable: false,
    },
    {
      key: 'an14',
      label: 'AN14 资产负债表',
      triggered: !an14?.notApplicable && !an14?.entered,
      notApplicable: !!an14?.notApplicable,
    },
    {
      key: 'an15',
      label: 'AN15 利润表',
      triggered: !an15?.notApplicable && !an15?.entered,
      notApplicable: !!an15?.notApplicable,
    },
    {
      key: 'an16',
      label: 'AN16 现金流量表',
      triggered: !an16?.notApplicable && !an16?.entered,
      notApplicable: !!an16?.notApplicable,
    },
    {
      key: 'code',
      label: 'Code 完整性',
      triggered: row.missingCodeTriggered,
      notApplicable: !(row.reportTypeKey === 'financial' || row.reportTypeKey === 'hk'),
    },
    {
      key: 'rows',
      label: '行数阈值',
      triggered: row.lowRowTriggered,
      notApplicable: !(row.reportTypeKey === 'financial' || row.reportTypeKey === 'hk'),
    },
  ]
}

const alertRuleDefinitions = {
  yesterday: {
    title: '前一日未入表',
    definition: '如果该报告在监测日对应的前一日，没有成功进入任意下游结果表，则触发这条告警。',
  },
  an14: {
    title: 'AN14 资产负债表未入表',
    definition: '财务/港股财报在下游结果中应存在 AN14 对应结果；若 AN14 未进入，则触发告警。',
  },
  an15: {
    title: 'AN15 利润表未入表',
    definition: '财务/港股财报在下游结果中应存在 AN15 对应结果；若 AN15 未进入，则触发告警。',
  },
  an16: {
    title: 'AN16 现金流量表未入表',
    definition: '财务/港股财报在下游结果中应存在 AN16 对应结果；若 AN16 未进入，则触发告警。',
  },
  code: {
    title: '三表存在缺少 Code 的记录',
    definition: '当三表结构化结果中存在已入表但未映射标准 code 的记录时，触发这条告警。',
  },
  low_an14: {
    title: 'AN14 行数过少',
    definition: '如果 AN14 已入表，但行数低于经验阈值，则判定结构化结果可能不完整并触发告警。',
  },
  low_an15: {
    title: 'AN15 行数过少',
    definition: '如果 AN15 已入表，但行数低于经验阈值，则判定结构化结果可能不完整并触发告警。',
  },
  low_an16: {
    title: 'AN16 行数过少',
    definition: '如果 AN16 已入表，但行数低于经验阈值，则判定结构化结果可能不完整并触发告警。',
  },
}

const buildAlertItems = (row) => {
  const tables = row.threeMajorTables || []
  const an14 = tables.find((item) => item.code === 'AN14')
  const an15 = tables.find((item) => item.code === 'AN15')
  const an16 = tables.find((item) => item.code === 'AN16')
  const alerts = []

  if (row.yesterdaySyncTriggered) {
    alerts.push({ key: 'yesterday', label: '前一日未入表' })
  }
  if (an14 && !an14.notApplicable && !an14.entered) {
    alerts.push({ key: 'an14', label: 'AN14 资产负债表未入表' })
  }
  if (an15 && !an15.notApplicable && !an15.entered) {
    alerts.push({ key: 'an15', label: 'AN15 利润表未入表' })
  }
  if (an16 && !an16.notApplicable && !an16.entered) {
    alerts.push({ key: 'an16', label: 'AN16 现金流量表未入表' })
  }
  if (row.missingCodeTriggered) {
    alerts.push({ key: 'code', label: '三表存在缺少 Code 的记录' })
  }
  if (an14 && !an14.notApplicable && an14.entered && an14.count < an14.threshold) {
    alerts.push({ key: 'low_an14', label: `AN14 行数过少（${an14.count}/${an14.threshold}）` })
  }
  if (an15 && !an15.notApplicable && an15.entered && an15.count < an15.threshold) {
    alerts.push({ key: 'low_an15', label: `AN15 行数过少（${an15.count}/${an15.threshold}）` })
  }
  if (an16 && !an16.notApplicable && an16.entered && an16.count < an16.threshold) {
    alerts.push({ key: 'low_an16', label: `AN16 行数过少（${an16.count}/${an16.threshold}）` })
  }

  return alerts
}

const getAlertTriggerReason = (row, alertKey) => {
  const tables = row.threeMajorTables || []
  const tableMap = Object.fromEntries(tables.map((item) => [item.code, item]))

  if (alertKey === 'yesterday') {
    return `该报告最后同步时间为 ${row.syncTime}，前一日入表数量为 ${row.yesterdayUpdateCount}，未大于 0，因此触发。`
  }
  if (alertKey === 'an14') {
    return `AN14 当前 entered = ${tableMap.AN14?.entered ? 'true' : 'false'}，说明资产负债表没有进入下游结果表。`
  }
  if (alertKey === 'an15') {
    return `AN15 当前 entered = ${tableMap.AN15?.entered ? 'true' : 'false'}，说明利润表没有进入下游结果表。`
  }
  if (alertKey === 'an16') {
    return `AN16 当前 entered = ${tableMap.AN16?.entered ? 'true' : 'false'}，说明现金流量表没有进入下游结果表。`
  }
  if (alertKey === 'code') {
    const hit = tables.find((item) => item.entered && item.hasCodeIssue)
    return `当前命中的表为 ${hit?.code || '未知表'}，该表已入表，但存在未映射 code 的记录，所以触发了完整性告警。`
  }
  if (alertKey === 'low_an14') {
    return `AN14 当前行数 ${tableMap.AN14?.count ?? 0}，阈值 ${tableMap.AN14?.threshold ?? '-'}，低于阈值，因此触发。`
  }
  if (alertKey === 'low_an15') {
    return `AN15 当前行数 ${tableMap.AN15?.count ?? 0}，阈值 ${tableMap.AN15?.threshold ?? '-'}，低于阈值，因此触发。`
  }
  if (alertKey === 'low_an16') {
    return `AN16 当前行数 ${tableMap.AN16?.count ?? 0}，阈值 ${tableMap.AN16?.threshold ?? '-'}，低于阈值，因此触发。`
  }

  return '当前告警已命中，但还没有补充更细的触发说明。'
}

const selectedAlertDetail = computed(() => {
  if (!selectedAlert.value) return null
  const config = alertRuleDefinitions[selectedAlert.value.key] || {
    title: selectedAlert.value.label,
    definition: '该规则定义暂未补充。',
  }

  return {
    ...selectedAlert.value,
    title: config.title,
    definition: config.definition,
    triggerReason: getAlertTriggerReason(selectedAlert.value.row, selectedAlert.value.key),
  }
})

const filteredRows = computed(() => {
  return scopeRows.value.filter((row) => {
    const matchesType = activeReportType.value === 'all' || row.reportTypeKey === activeReportType.value
    const matchesTriggerStatus =
      activeTriggerStatus.value === 'all' || row.downstreamStatusKey === activeTriggerStatus.value
    const matchesRange = inWindow(row.syncTime)

    return matchesType && matchesTriggerStatus && matchesRange
  })
})

const issueRows = computed(() => {
  return filteredRows.value.flatMap((row) =>
    buildAlertItems(row).map((alert, index) => ({
      id: `${row.id}-${alert.key}-${index}`,
      row,
      ...alert,
    })),
  )
})

const kpiSummary = computed(() => {
  const rows = filteredRows.value
  const total = rows.length
  const alerts = issueRows.value
  const triggered = alerts.length
  const countByKey = (key) => alerts.filter((item) => item.key === key).length

  return [
    { key: 'all', label: '监测总数', value: total, note: '前一日纳入监测的报告数', tone: '', icon: '▣' },
    { key: 'triggered', label: '已触发', value: triggered, note: '当前一共触发的告警条数', tone: 'tone-danger', icon: '!' },
    { key: 'yesterday', label: '前一日未入表', value: countByKey('yesterday'), note: '昨日未成功进入下游表', tone: 'tone-warning', icon: 'Y' },
    { key: 'an14', label: 'AN14 未入', value: countByKey('an14'), note: '资产负债表未进入下游表', tone: 'tone-warning', icon: '14' },
    { key: 'an15', label: 'AN15 未入', value: countByKey('an15'), note: '利润表未进入下游表', tone: 'tone-warning', icon: '15' },
    { key: 'an16', label: 'AN16 未入', value: countByKey('an16'), note: '现金流量表未进入下游表', tone: 'tone-warning', icon: '16' },
    { key: 'code', label: '缺少 Code', value: countByKey('code'), note: '结构化结果存在未映射 code', tone: 'tone-danger', icon: 'C' },
    { key: 'low_an14', label: 'AN14 行数少', value: countByKey('low_an14'), note: '资产负债表行数低于阈值', tone: 'tone-warning', icon: 'L14' },
    { key: 'low_an15', label: 'AN15 行数少', value: countByKey('low_an15'), note: '利润表行数低于阈值', tone: 'tone-warning', icon: 'L15' },
    { key: 'low_an16', label: 'AN16 行数少', value: countByKey('low_an16'), note: '现金流量表行数低于阈值', tone: 'tone-warning', icon: 'L16' },
  ]
})

const displayedIssueRows = computed(() => {
  if (activeAlertFilter.value === 'all') return issueRows.value
  if (activeAlertFilter.value === 'triggered') return issueRows.value
  return issueRows.value.filter((item) => item.key === activeAlertFilter.value)
})

const currentScopeMeta = computed(() => {
  return scopeOptions.find((item) => item.key === activeScopeKey.value) || scopeOptions[0]
})

const windowText = computed(() => `${formatDayKey(dateWindow.value.start)}`)
</script>

<template>
  <section class="monitor-shell">
    <div class="monitor-section-header">
      <div class="monitor-section-intro">
        <span>下游监测</span>
        <h2>下游监测</h2>
        <p>监控结构化结果是否成功、完整、稳定地进入后续业务表，当前先展示同步状态、三表/附注就绪情况和明细台账。</p>
      </div>

      <div class="monitor-header-filters">
        <label class="field monitor-select-field">
          <span>报告范围</span>
          <select v-model="activeScopeKey">
            <option v-for="item in scopeOptions" :key="item.key" :value="item.key">
              {{ item.label }}
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

        <label class="field monitor-select-field">
          <span>触发状态</span>
          <select v-model="activeTriggerStatus">
            <option v-for="item in triggerStatusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <article class="workbench-panel monitor-source-panel">
      <div class="monitor-source-head">
        <div>
          <span>DOWNSTREAM DELIVERY</span>
          <h3>{{ currentScopeMeta.label }}</h3>
          <p>只看前一日的下游结果，按链条逐报告检查是否入表、AN14/AN15/AN16 是否分别进入、是否缺少 code，以及三表行数是否过少。</p>
        </div>
        <div class="monitor-source-badge">下游链路</div>
      </div>

      <div class="monitor-window-note">
        <strong>监测日期：</strong>{{ windowText }}（固定为前一日）
      </div>

      <div class="monitor-kpi-grid monitor-downstream-kpi-grid">
        <article
          v-for="metric in kpiSummary"
          :key="metric.key"
          :class="['workbench-panel monitor-kpi-card', metric.tone, 'monitor-kpi-card-clickable', { active: activeAlertFilter === metric.key || (metric.key === 'triggered' && activeAlertFilter === 'triggered') }]"
          @click="activeAlertFilter = metric.key"
        >
          <span class="monitor-kpi-icon">{{ metric.icon }}</span>
          <span class="monitor-kpi-label">{{ metric.label }}</span>
          <strong class="monitor-kpi-value">{{ metric.value }}</strong>
          <p>{{ metric.note }}</p>
        </article>
      </div>
    </article>

    <article class="workbench-panel monitor-detail-panel">
      <div class="monitor-filter-head">
        <div>
          <span class="login-kicker">DOWNSTREAM TASKS</span>
          <h3>触发告警台账</h3>
          <p class="monitor-placeholder-text">这里只显示已经触发的问题记录。点击上方卡片后，可以按具体规则查看对应的告警明细。</p>
        </div>
      </div>

      <div class="history-table-wrap">
        <table class="history-table monitor-history-table downstream-history-table">
          <thead>
            <tr>
              <th>主体名称</th>
              <th>报告类型</th>
              <th>报告期</th>
              <th>触发规则</th>
              <th>最后同步时间</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in displayedIssueRows"
              :key="item.id"
              class="monitor-alert-row"
              @click="selectedAlert = item"
            >
              <td class="monitor-name-cell">
                <strong>{{ item.row.companyName }}</strong>
                <small>{{ item.row.crmCode }}</small>
              </td>
              <td>{{ item.row.reportTypeLabel }}</td>
              <td>{{ item.row.reportYear }}{{ item.row.reportQuarter }}</td>
              <td>
                <span class="status-pill danger">{{ item.label }}</span>
              </td>
              <td>{{ item.row.syncTime }}</td>
            </tr>
            <tr v-if="!displayedIssueRows.length">
              <td colspan="5" class="empty-row">当前筛选条件下暂无触发告警</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="selectedAlertDetail" class="monitor-drawer-mask" @click.self="selectedAlert = null">
      <aside class="monitor-detail-drawer">
        <div class="monitor-drawer-head">
          <div>
            <span>ALERT DETAIL</span>
            <h3>{{ selectedAlertDetail.title }}</h3>
          </div>
          <button class="monitor-drawer-close" @click="selectedAlert = null">×</button>
        </div>

        <div class="monitor-drawer-grid">
          <article class="monitor-drawer-item">
            <span>主体名称</span>
            <strong>{{ selectedAlertDetail.row.companyName }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>报告类型</span>
            <strong>{{ selectedAlertDetail.row.reportTypeLabel }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>报告期</span>
            <strong>{{ selectedAlertDetail.row.reportYear }}{{ selectedAlertDetail.row.reportQuarter }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>最后同步时间</span>
            <strong>{{ selectedAlertDetail.row.syncTime }}</strong>
          </article>
        </div>

        <article class="monitor-pageindex-card">
          <strong>规则定义</strong>
          <p class="monitor-placeholder-text">{{ selectedAlertDetail.definition }}</p>
        </article>

        <article class="monitor-pageindex-card">
          <strong>本次为什么触发</strong>
          <p class="monitor-placeholder-text">{{ selectedAlertDetail.triggerReason }}</p>
        </article>

        <article class="monitor-pageindex-card">
          <strong>当前记录快照</strong>
          <p class="monitor-placeholder-text">
            触发状态：{{ selectedAlertDetail.row.downstreamStatus }}<br />
            前一日入表数量：{{ selectedAlertDetail.row.yesterdayUpdateCount }}<br />
            当前全部触发项：{{ buildAlertItems(selectedAlertDetail.row).map((item) => item.label).join(' / ') || '无' }}
          </p>
        </article>
      </aside>
    </div>
  </section>
</template>
