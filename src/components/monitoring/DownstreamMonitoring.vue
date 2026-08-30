<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  downstreamRows: { type: Array, required: true },
  referenceDate: { type: String, required: true },
})

const systemFilter = ref('all')
const reportTypeFilter = ref('all')
const scopeFilter = ref('all')
const interactionFilter = ref('all')

const systemOptions = [
  { value: 'all', label: '全部下游' },
  { value: 'evaluation', label: '财报智评' },
  { value: 'warehouse', label: '财报数仓' },
]

const reportTypeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'financial', label: '财务报告' },
  { value: 'audit', label: '审计报告' },
  { value: 'prospectus', label: '招股说明书' },
  { value: 'hk', label: '港股财报' },
]

const scopeOptions = [
  { value: 'all', label: '全部属性' },
  { value: 'public', label: '公开' },
  { value: 'private', label: '非公开' },
]

const interactionOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'abnormal', label: '异常' },
]

const systemDefinitions = [
  {
    key: 'evaluation',
    label: '财报智评',
    icon: '评',
    expected: 688,
    synced: 688,
    publicSynced: 532,
    privateSynced: 156,
    latestInteraction: '16:32:10',
    interaction: 'normal',
  },
  {
    key: 'warehouse',
    label: '财报数仓',
    icon: '库',
    expected: 1268,
    synced: 1243,
    publicSynced: 976,
    privateSynced: 267,
    latestInteraction: '16:31:45',
    interaction: 'normal',
  },
]

const formatToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayKey = formatToday()

const normalizeReportType = (row) => {
  const key = String(row.reportTypeKey || '').toLowerCase()
  const label = String(row.reportTypeLabel || '')
  if (key.includes('audit') || label.includes('审计')) return 'audit'
  if (key.includes('prospect') || label.includes('招股')) return 'prospectus'
  if (key.includes('hk') || label.includes('港股')) return 'hk'
  return 'financial'
}

const reportTypeRatio = computed(() => {
  if (reportTypeFilter.value === 'all') return 1
  if (!props.downstreamRows.length) return 0
  const matched = props.downstreamRows.filter((row) => normalizeReportType(row) === reportTypeFilter.value)
  return matched.length / props.downstreamRows.length
})

const systemSummaries = computed(() => {
  return systemDefinitions
    .filter((system) => {
      return (
        (systemFilter.value === 'all' || system.key === systemFilter.value) &&
        (interactionFilter.value === 'all' || system.interaction === interactionFilter.value)
      )
    })
    .map((system) => {
      const publicFactor = scopeFilter.value === 'private' ? 0 : 1
      const privateFactor = scopeFilter.value === 'public' ? 0 : 1
      const publicSynced = Math.round(system.publicSynced * reportTypeRatio.value * publicFactor)
      const privateSynced = Math.round(system.privateSynced * reportTypeRatio.value * privateFactor)
      const synced = publicSynced + privateSynced
      const scopeRatio = system.synced ? synced / system.synced : 0
      const expected = Math.max(synced, Math.round(system.expected * reportTypeRatio.value * scopeRatio))

      return {
        ...system,
        expected,
        synced,
        unsynced: Math.max(0, expected - synced),
        publicSynced,
        privateSynced,
        syncStatus: expected === synced ? 'normal' : 'abnormal',
      }
    })
})

const metrics = computed(() => {
  const syncNormal = systemSummaries.value.filter((item) => item.unsynced === 0).length
  return {
    systemTotal: systemSummaries.value.length,
    syncNormal,
    syncAbnormal: systemSummaries.value.length - syncNormal,
  }
})

const kpiCards = computed(() => [
  { label: '下游总量', value: metrics.value.systemTotal, icon: '总', tone: 'primary' },
  { label: '当日已同步', value: metrics.value.syncNormal, icon: '✓', tone: 'success' },
  { label: '当日未同步', value: metrics.value.syncAbnormal, icon: '!', tone: 'warning' },
])

const resetFilters = () => {
  systemFilter.value = 'all'
  reportTypeFilter.value = 'all'
  scopeFilter.value = 'all'
  interactionFilter.value = 'all'
}
</script>

<template>
  <section class="monitor-shell downstream-overview">
    <div class="monitor-section-header">
      <div class="monitor-section-intro">
        <h2>下游监测</h2>
      </div>
      <div class="downstream-update-time">数据最后更新时间：{{ todayKey }} 18:30:00</div>
    </div>

    <article class="workbench-panel downstream-filter-panel">
      <div class="downstream-filter-grid">
        <label class="field monitor-select-field">
          <span>下游系统</span>
          <select v-model="systemFilter">
            <option v-for="item in systemOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="field monitor-select-field">
          <span>报告类型</span>
          <select v-model="reportTypeFilter">
            <option v-for="item in reportTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="field monitor-select-field">
          <span>公开属性</span>
          <select v-model="scopeFilter">
            <option v-for="item in scopeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label class="field monitor-select-field">
          <span>交互状态</span>
          <select v-model="interactionFilter">
            <option v-for="item in interactionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <div class="downstream-filter-actions">
          <button class="quad-enter" type="button">查询</button>
          <button class="quad-link" type="button" @click="resetFilters">重置</button>
        </div>
      </div>
    </article>

    <div class="downstream-kpi-grid">
      <article v-for="card in kpiCards" :key="card.label" class="workbench-panel downstream-kpi-card" :class="`tone-${card.tone}`">
        <div class="downstream-kpi-head">
          <span>{{ card.label }}</span>
          <i>{{ card.icon }}</i>
        </div>
        <strong>{{ card.value }}</strong>
        <small>统计日期 {{ todayKey }}</small>
      </article>
    </div>

    <article class="workbench-panel downstream-summary-panel">
      <h3>下游系统监测汇总</h3>
      <div class="history-table-wrap">
        <table class="history-table downstream-system-table">
          <thead>
            <tr>
              <th>下游系统</th>
              <th>当日应同步报告数</th>
              <th>当日已同步报告数</th>
              <th>当日未同步报告数</th>
              <th>公开报告数</th>
              <th>非公开报告数</th>
              <th>同步状态</th>
              <th>最近交互时间</th>
              <th>交互状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in systemSummaries" :key="item.key">
              <td><div class="downstream-system-name"><i>{{ item.icon }}</i><strong>{{ item.label }}</strong></div></td>
              <td>{{ item.expected.toLocaleString() }}</td>
              <td class="value-success">{{ item.synced.toLocaleString() }}</td>
              <td class="value-warning">{{ item.unsynced.toLocaleString() }}</td>
              <td>{{ item.publicSynced.toLocaleString() }}</td>
              <td>{{ item.privateSynced.toLocaleString() }}</td>
              <td><span class="downstream-status" :class="item.syncStatus">{{ item.syncStatus === 'normal' ? '正常' : '异常' }}</span></td>
              <td>{{ item.latestInteraction }}</td>
              <td><span class="downstream-status" :class="item.interaction">{{ item.interaction === 'normal' ? '正常' : '异常' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

  </section>
</template>
