<script setup>
import { computed } from 'vue'

const props = defineProps({
  downstreamRows: { type: Array, required: true },
  referenceDate: { type: String, required: true },
})

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

const systemSummaries = computed(() => {
  return systemDefinitions.map((system) => ({
    ...system,
    unsynced: Math.max(0, system.expected - system.synced),
    syncStatus: system.expected === system.synced ? 'normal' : 'abnormal',
  }))
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

</script>

<template>
  <section class="monitor-shell downstream-overview">
    <div class="monitor-section-header">
      <div class="monitor-section-intro">
        <h2>下游监测</h2>
      </div>
      <div class="downstream-update-time">数据最后更新时间：{{ todayKey }} 18:30:00</div>
    </div>

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
