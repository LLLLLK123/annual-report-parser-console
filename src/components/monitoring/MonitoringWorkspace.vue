<script setup>
import { ref } from 'vue'
import CountMonitoring from './CountMonitoring.vue'
import DownstreamMonitoring from './DownstreamMonitoring.vue'
import ProcessMonitoring from './ProcessMonitoring.vue'
import {
  crawlerListRows,
  monitoringCountSections,
  monitoringDownstreamRows,
  monitoringProcessTasks,
  monitoringRangeOptions,
  monitoringReferenceDate,
  monitoringProcessStages,
  monitoringTabs,
} from '../../data/monitoringSeeds'

const activeTab = ref('count')
</script>

<template>
  <main class="module-main">
    <section class="monitoring-workspace">
      <div class="workbench-top">
        <div class="workbench-head">
          <span class="hero-label">OPERATIONS MONITORING</span>
          <h1>运营监测</h1>
          <!-- <p>监测报告接入、解析处理及数据链路运行情况</p> -->
        </div>
      </div>

      <section class="workbench-panel config-tabs-panel monitoring-tabs-panel">
        <div class="config-view-tabs">
          <button
            v-for="item in monitoringTabs"
            :key="item.key"
            :class="['config-view-tab', { active: activeTab === item.key }]"
            type="button"
            @click="activeTab = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <CountMonitoring
        v-if="activeTab === 'count'"
        :count-sections="monitoringCountSections"
        :count-rows="crawlerListRows"
        :range-options="monitoringRangeOptions"
        :reference-date="monitoringReferenceDate"
      />

      <ProcessMonitoring
        v-else-if="activeTab === 'process'"
        :process-stages="monitoringProcessStages"
        :process-tasks="monitoringProcessTasks"
      />

      <DownstreamMonitoring
        v-else
        :downstream-rows="monitoringDownstreamRows"
        :reference-date="monitoringReferenceDate"
      />
    </section>
  </main>
</template>
