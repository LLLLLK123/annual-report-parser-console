<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  processStages: { type: Array, required: true },
  processTasks: { type: Array, required: true },
})

const stageLabelMap = {
  created: '新增报告',
  pageindex: 'PageIndex解析',
  extract: '目标字段提取',
  storage: '入库',
}

const processStatusClassMap = {
  待处理: 'warning',
  处理中: 'info',
  已完成: 'success',
  失败: 'danger',
}

const localTasks = ref([])
const activeStageKey = ref('all')
const selectedTaskId = ref(null)

const syncTasks = () => {
  localTasks.value = props.processTasks.map((item) => ({
    ...item,
    process_steps: item.process_steps.map((step) => ({ ...step })),
    process_logs: [...item.process_logs],
  }))
}

watch(() => props.processTasks, syncTasks, { immediate: true, deep: true })

const stageCards = computed(() => {
  return props.processStages.map((stage) => ({
    ...stage,
    count: localTasks.value.filter((task) => task.current_stage_key === stage.key).length,
  }))
})

const filteredTasks = computed(() => {
  const rows = [...localTasks.value].sort((a, b) => {
    return new Date(b.update_time.replace(' ', 'T')).getTime() - new Date(a.update_time.replace(' ', 'T')).getTime()
  })

  if (activeStageKey.value === 'all') return rows
  return rows.filter((task) => task.current_stage_key === activeStageKey.value)
})

const selectedTask = computed(() => {
  return localTasks.value.find((task) => task.id === selectedTaskId.value) || null
})

const isTaskReparseDisabled = (task) => task.all_status === 'processing'

function openTaskDetail(task) {
  selectedTaskId.value = task.id
}

function closeTaskDetail() {
  selectedTaskId.value = null
}

function reparseTask(task) {
  const target = localTasks.value.find((item) => item.id === task.id)
  if (!target) return

  target.all_status = 'processing'
  target.statusLabel = '处理中'
  target.pageindex_status = 'submitted'
  target.current_stage_key = 'pageindex'
  target.current_stage_label = 'PageIndex解析'
  target.current_stage_status = '处理中'
  target.process_percent = 30
  target.update_time = '2026-08-26 15:12:00'
  target.process_logs = [
    ...target.process_logs,
    '2026-08-26T15:12:00.101 [info] 用户触发重新解析',
    `2026-08-26T15:12:00.148 [info] 02.8 PageIndex ID回写 docId=${target.process_task_id}`,
    '2026-08-26T15:12:00.214 [info] 03 PageIndex结果查询',
  ]
  target.process_steps = target.process_steps.map((step) => {
    if (step.progress < 30) {
      return { ...step, status: 'completed' }
    }
    if (step.progress === 30) {
      return { ...step, status: 'active', description: '已重新提交至 PageIndex 解析服务。' }
    }
    return { ...step, status: 'pending' }
  })
}
</script>

<template>
  <section class="monitor-shell">
    <template v-if="!selectedTask">
      <div class="monitor-section-intro">
        <!-- <span>流程监测</span> -->
        <h2>流程监测</h2>
        <!-- <p>按真实链路查看每份报告当前停留在哪个解析阶段，并进入单任务日志查看完整处理过程。</p> -->
      </div>

      <div class="monitor-stage-grid process-stage-grid">
        <button
          :class="['workbench-panel monitor-stage-panel process-stage-card', { active: activeStageKey === 'all' }]"
          type="button"
          @click="activeStageKey = 'all'"
        >
          <span>ALL TASKS</span>
          <h3>全部任务</h3>
          <p>查看当前所有报告解析任务。</p>
          <strong>{{ localTasks.length }}</strong>
        </button>

        <button
          v-for="stage in stageCards"
          :key="stage.key"
          :class="['workbench-panel monitor-stage-panel process-stage-card', { active: activeStageKey === stage.key }]"
          type="button"
          @click="activeStageKey = stage.key"
        >
          <span>{{ stage.englishLabel }}</span>
          <h3>{{ stage.title }}</h3>
          <p>{{ stage.description }}</p>
          <strong>{{ stage.count }}</strong>
        </button>
      </div>

      <section class="workbench-panel process-task-panel">
        <div class="panel-head">
          <div>
            <span>解析任务</span>
            <h2>{{ activeStageKey === 'all' ? '当前全部解析任务' : stageLabelMap[activeStageKey] }}</h2>
          </div>
        </div>

        <div class="process-task-list">
          <article
            v-for="task in filteredTasks"
            :key="task.id"
            class="process-task-card clickable"
            @click="openTaskDetail(task)"
          >
            <div class="process-task-main">
              <div class="process-task-title-row">
                <strong>{{ task.file_name }}</strong>
                <span :class="['status-pill', processStatusClassMap[task.statusLabel] || 'muted']">
                  {{ task.statusLabel }}
                </span>
              </div>

              <div class="process-task-meta">
                <span>{{ task.company_name }}</span>
                <span>{{ task.reportTypeLabel }}</span>
                <span>{{ task.report_year }}{{ task.quarterLabel }}</span>
              </div>

              <div class="process-task-progress">
                <span>当前阶段：{{ task.current_stage_label }}</span>
                <span>进度：{{ task.process_percent }}%</span>
              </div>

              <div class="process-progress-track">
                <div class="process-progress-fill" :style="{ width: `${task.process_percent}%` }"></div>
              </div>
            </div>

            <div class="process-task-actions">
              <button class="quad-link" type="button" @click.stop="openTaskDetail(task)">查看日志</button>
              <button
                :class="['quad-enter', 'process-reparse-btn', { disabled: isTaskReparseDisabled(task) }]"
                type="button"
                :disabled="isTaskReparseDisabled(task)"
                @click.stop="reparseTask(task)"
              >
                重新解析
              </button>
            </div>
          </article>

          <div v-if="!filteredTasks.length" class="empty-row process-empty">
            当前阶段下暂无任务
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <button class="quad-link process-back-btn" type="button" @click="closeTaskDetail">返回任务列表</button>

      <section class="workbench-panel process-detail-hero">
        <div class="process-detail-hero-main">
          <div>
            <h2>{{ selectedTask.file_name }}</h2>
            <p>解析任务 ID：{{ selectedTask.process_task_id }}</p>
            <div class="process-detail-meta">
              <span>{{ selectedTask.company_name }}</span>
              <span>{{ selectedTask.reportTypeLabel }}</span>
              <span>{{ selectedTask.report_year }}{{ selectedTask.quarterLabel }}</span>
              <span>当前阶段：{{ selectedTask.current_stage_label }}</span>
            </div>
          </div>

          <div class="process-detail-score">
            <strong>{{ selectedTask.process_percent }}%</strong>
            <span>综合进度</span>
          </div>
        </div>

        <div class="process-progress-track large">
          <div class="process-progress-fill" :style="{ width: `${selectedTask.process_percent}%` }"></div>
        </div>
      </section>

      <div class="process-detail-grid">
        <section class="workbench-panel process-timeline-panel">
          <div class="panel-head">
            <div>
              <span>流程详情</span>
              <h2>八阶段处理链路</h2>
            </div>
          </div>

          <div class="process-step-list">
            <article
              v-for="step in selectedTask.process_steps"
              :key="step.key"
              :class="['process-step-card', step.status]"
            >
              <div class="process-step-icon">
                <span v-if="step.status === 'completed'">✓</span>
                <span v-else-if="step.status === 'failed'">!</span>
                <span v-else-if="step.status === 'active'">●</span>
                <span v-else>○</span>
              </div>

              <div class="process-step-copy">
                <strong>{{ step.title }}</strong>
                <p>{{ step.description }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="workbench-panel process-logs-panel">
          <div class="panel-head">
            <div>
              <span>Parser Logs</span>
              <h2>解析日志</h2>
            </div>
            <button
              :class="['quad-enter', 'process-reparse-btn', { disabled: isTaskReparseDisabled(selectedTask) }]"
              type="button"
              :disabled="isTaskReparseDisabled(selectedTask)"
              @click="reparseTask(selectedTask)"
            >
              重新解析
            </button>
          </div>

          <div class="process-logs-console">
            <pre>{{ selectedTask.process_logs.join('\n') }}</pre>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>
