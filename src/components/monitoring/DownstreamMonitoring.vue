<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  downstreamRows: { type: Array, required: true },
  referenceDate: { type: String, required: true },
})

const activeScopeKey = ref('public')
const activeReportType = ref('all')
const startDate = ref(props.referenceDate)
const endDate = ref(props.referenceDate)
const searchKeyword = ref('')
const selectedAlert = ref(null)
const resolvedAlertIds = ref([])
const pageSize = ref(10)
const currentPage = ref(1)
const jumpPageInput = ref('1')

const scopeOptions = [
  { key: 'public', label: '公众报告' },
  { key: 'private', label: '非公众报告' },
]

const downstreamTableConfigs = [
  {
    key: 'base_finance',
    label: 'base_finance',
    getStatus: (row) => row.baseFinanceSynced,
  },
  {
    key: 'base_finance_note_integrated',
    label: 'base_finance_note_integrated',
    getStatus: (row) => row.baseFinanceNoteSynced,
  },
]

const alertRuleDefinitions = {
  base_finance: {
    title: 'base_finance 当日未同步',
    definition: '在选定监测日期范围内，如果下游表 base_finance 当天没有同步成功记录，则触发该告警。',
  },
  base_finance_note_integrated: {
    title: 'base_finance_note_integrated 当日未同步',
    definition: '在选定监测日期范围内，如果下游表 base_finance_note_integrated 当天没有同步成功记录，则触发该告警。',
  },
}

const todayKey = props.referenceDate

const parseDate = (value) => {
  if (!value) return null
  return new Date(`${value}T00:00:00`)
}

const formatDayKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildDateRange = (start, end) => {
  const startObj = parseDate(start)
  const endObj = parseDate(end)
  if (!startObj || !endObj || startObj > endObj) return []

  const days = []
  const cursor = new Date(startObj)
  while (cursor <= endObj) {
    days.push(formatDayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

const normalizedRange = computed(() => {
  if (startDate.value <= endDate.value) {
    return { start: startDate.value, end: endDate.value }
  }

  return { start: endDate.value, end: startDate.value }
})

const dateValidationMessage = computed(() => {
  if (!startDate.value || !endDate.value) return '请选择开始日期和结束日期'
  if (startDate.value > todayKey || endDate.value > todayKey) return '开始日期和结束日期都不能大于今日'
  if (startDate.value > endDate.value) return '开始日期必须小于或等于结束日期'
  return ''
})

const currentScopeMeta = computed(() => {
  return scopeOptions.find((item) => item.key === activeScopeKey.value) || scopeOptions[0]
})

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

const filteredRows = computed(() => {
  return scopeRows.value.filter((row) => {
    return activeReportType.value === 'all' || row.reportTypeKey === activeReportType.value
  })
})

const rangeDays = computed(() => {
  if (dateValidationMessage.value) return []
  return buildDateRange(normalizedRange.value.start, normalizedRange.value.end)
})

const monitorLedgerRows = computed(() => {
  return rangeDays.value.flatMap((day) => {
    const rowsOfDay = filteredRows.value.filter((row) => row.syncTime.slice(0, 10) === day)

    return downstreamTableConfigs.map((table) => {
      const syncedRows = rowsOfDay.filter((row) => table.getStatus(row))
      const totalRows = rowsOfDay.length
      const synced = syncedRows.length > 0
      const latestSyncTime = syncedRows.length
        ? [...syncedRows].sort((a, b) => b.syncTime.localeCompare(a.syncTime))[0].syncTime
        : '-'

      return {
        id: `${day}-${table.key}`,
        monitorDate: day,
        tableKey: table.key,
        tableLabel: table.label,
        synced,
        alertKey: table.key,
        alertLabel: `${table.label} 当日未同步`,
        totalRows,
        syncedRows: syncedRows.length,
        latestSyncTime,
      }
    })
  })
})

const unresolvedIssueRows = computed(() => {
  return monitorLedgerRows.value.filter((row) => !row.synced && !resolvedAlertIds.value.includes(row.id))
})

const filteredIssueRows = computed(() => {
  return unresolvedIssueRows.value.filter((row) => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return true

    return [
      row.tableLabel,
      row.alertLabel,
      alertRuleDefinitions[row.alertKey]?.title,
      row.monitorDate,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })
})

const alertCount = computed(() => unresolvedIssueRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredIssueRows.value.length / pageSize.value)))

const paginatedIssueRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredIssueRows.value.slice(start, start + pageSize.value)
})

const selectedAlertDetail = computed(() => {
  if (!selectedAlert.value) return null

  const config = alertRuleDefinitions[selectedAlert.value.alertKey] || {
    title: selectedAlert.value.alertLabel,
    definition: '该规则定义暂未补充。',
  }

  return {
    ...selectedAlert.value,
    title: config.title,
    definition: config.definition,
    triggerReason:
      selectedAlert.value.totalRows === 0
        ? `在 ${selectedAlert.value.monitorDate} 这一天，当前筛选范围下没有任何记录进入监测口径，因此 ${selectedAlert.value.tableLabel} 没有发生同步，触发告警。`
        : `在 ${selectedAlert.value.monitorDate} 这一天，当前筛选范围下共检查 ${selectedAlert.value.totalRows} 条记录，但 ${selectedAlert.value.tableLabel} 的同步成功数为 0，因此触发告警。`,
  }
})

const setPage = (page) => {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  jumpPageInput.value = String(currentPage.value)
}

const goPrevPage = () => setPage(currentPage.value - 1)
const goNextPage = () => setPage(currentPage.value + 1)

const submitJumpPage = () => {
  const target = Number(jumpPageInput.value)
  if (Number.isNaN(target)) {
    jumpPageInput.value = String(currentPage.value)
    return
  }
  setPage(target)
}

const resolveAlert = (item) => {
  if (!resolvedAlertIds.value.includes(item.id)) {
    resolvedAlertIds.value = [...resolvedAlertIds.value, item.id]
  }
  if (selectedAlert.value?.id === item.id) {
    selectedAlert.value = null
  }
}

watch([activeScopeKey, activeReportType, startDate, endDate, searchKeyword, pageSize], () => {
  currentPage.value = 1
  jumpPageInput.value = '1'
})

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value
  jumpPageInput.value = String(currentPage.value)
})
</script>

<template>
  <section class="monitor-shell">
    <div class="monitor-section-header">
      <div class="monitor-section-intro">
        <span>下游监测</span>
        <h2>下游监测</h2>
        <p>这里只看两张下游表是否同步：base_finance 与 base_finance_note_integrated。</p>
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

        <div class="field monitor-select-field monitor-date-range-field">
          <span>时间范围</span>
          <div class="monitor-date-range-inputs">
            <input v-model="startDate" type="date" :max="todayKey" />
            <em>至</em>
            <input v-model="endDate" type="date" :max="todayKey" />
          </div>
        </div>
      </div>
    </div>

    <p v-if="dateValidationMessage" class="form-message error monitor-date-error">
      {{ dateValidationMessage }}
    </p>

    <article class="workbench-panel monitor-source-panel">
      <div class="monitor-source-head">
        <div>
          <span>DOWNSTREAM DELIVERY</span>
          <h3>{{ currentScopeMeta.label }}</h3>
          <p>默认监测当天，也支持设置开始与结束日期。当前仅检查两张下游表在所选时间范围内是否同步成功。</p>
        </div>
        <div class="monitor-source-badge">表级监测</div>
      </div>

      <div class="monitor-window-note">
        <strong>监测区间：</strong>{{ normalizedRange.start }} 至 {{ normalizedRange.end }}
      </div>

      <div class="monitor-kpi-grid monitor-downstream-single-kpi">
        <article class="workbench-panel monitor-kpi-card tone-danger">
          <span class="monitor-kpi-icon">!</span>
          <span class="monitor-kpi-label">告警量</span>
          <strong class="monitor-kpi-value">{{ alertCount }}</strong>
          <p>当前筛选条件下，尚未解决的下游同步告警总数</p>
        </article>
      </div>
    </article>

    <article class="workbench-panel monitor-detail-panel">
      <div class="monitor-filter-head monitor-filter-head-stacked">
        <div>
          <span class="login-kicker">DOWNSTREAM ALERTS</span>
          <h3>触发告警台账</h3>
          <p class="monitor-placeholder-text">支持按告警名称和表名模糊搜索。点击“解决”后，该告警会从当前台账中消失。</p>
        </div>

        <div class="monitor-inline-filters">
          <label class="field monitor-search-field">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索触发告警名称 / 表名"
            />
          </label>
        </div>
      </div>

      <div class="history-table-wrap">
        <table class="history-table monitor-history-table downstream-ledger-table">
          <thead>
            <tr>
              <th>触发告警名称</th>
              <th>表名</th>
              <th>触发时间</th>
              <th>是否解决</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in paginatedIssueRows"
              :key="item.id"
              class="monitor-alert-row"
              @click="selectedAlert = item"
            >
              <td>
                <strong>{{ alertRuleDefinitions[item.alertKey]?.title || item.alertLabel }}</strong>
              </td>
              <td>{{ item.tableLabel }}</td>
              <td>{{ item.monitorDate }}</td>
              <td>
                <button class="quad-link" type="button" @click.stop="resolveAlert(item)">解决</button>
              </td>
            </tr>
            <tr v-if="!paginatedIssueRows.length">
              <td colspan="4" class="empty-row">当前筛选条件下暂无未解决的下游同步告警</td>
            </tr>
          </tbody>
        </table>

        <div class="history-pagination">
          <div class="pagination-summary">
            共 <strong>{{ filteredIssueRows.length }}</strong> 条，当前第
            <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页
          </div>

          <div class="pagination-controls">
            <label class="page-size-select">
              <span>每页</span>
              <select v-model="pageSize">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <span>条</span>
            </label>

            <button class="quad-link page-btn" type="button" :disabled="currentPage === 1" @click="goPrevPage">上一页</button>
            <button class="quad-link page-btn" type="button" :disabled="currentPage === totalPages" @click="goNextPage">下一页</button>

            <form class="jump-form" @submit.prevent="submitJumpPage">
              <span>跳至</span>
              <input v-model="jumpPageInput" type="number" min="1" :max="totalPages" />
              <span>页</span>
              <button class="quad-link page-btn" type="submit">确定</button>
            </form>
          </div>
        </div>
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
            <span>触发时间</span>
            <strong>{{ selectedAlertDetail.monitorDate }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>表名</span>
            <strong>{{ selectedAlertDetail.tableLabel }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>检查记录数</span>
            <strong>{{ selectedAlertDetail.totalRows }}</strong>
          </article>
          <article class="monitor-drawer-item">
            <span>同步成功数</span>
            <strong>{{ selectedAlertDetail.syncedRows }}</strong>
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
          <strong>当前快照</strong>
          <p class="monitor-placeholder-text">
            监测表：{{ selectedAlertDetail.tableLabel }}<br />
            最近同步时间：{{ selectedAlertDetail.latestSyncTime }}<br />
            监测范围：{{ currentScopeMeta.label }} / {{ activeReportType === 'all' ? '全部类型' : reportTypeOptions.find((item) => item.value === activeReportType)?.label }}
          </p>
        </article>
      </aside>
    </div>
  </section>
</template>
