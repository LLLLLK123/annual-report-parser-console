<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { downloadReportAsset, reportDownloadItems } from '../utils/reportDownloads'

const props = defineProps({
  record: { type: Object, required: true },
  rawTables: { type: Array, default: null },
  fullResultNodes: { type: Array, default: null },
})

const trigger = ref(null)
const open = ref(false)
const busy = ref('')
const error = ref('')
const position = ref({ top: 0, left: 0 })
const menuStyle = computed(() => ({ top: `${position.value.top}px`, left: `${position.value.left}px` }))

const updatePosition = () => {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const width = 250
  position.value = {
    top: rect.bottom + 8,
    left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
  }
}
const toggle = () => { error.value = ''; updatePosition(); open.value = !open.value }
const closeOnOutside = (event) => { if (open.value && !trigger.value?.contains(event.target) && !event.target.closest('.report-download-popover')) open.value = false }
const closeOnViewportChange = () => { if (open.value) updatePosition() }
const runDownload = async (type) => {
  busy.value = type
  error.value = ''
  try {
    await downloadReportAsset(type, { record: props.record, rawTables: props.rawTables, fullResultNodes: props.fullResultNodes })
    open.value = false
  } catch (downloadError) {
    error.value = downloadError?.message || '下载失败，请稍后重试。'
  } finally {
    busy.value = ''
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', closeOnOutside, true)
  window.addEventListener('resize', closeOnViewportChange)
  window.addEventListener('scroll', closeOnViewportChange, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside, true)
  window.removeEventListener('resize', closeOnViewportChange)
  window.removeEventListener('scroll', closeOnViewportChange, true)
})
</script>

<template>
  <button ref="trigger" class="report-download-trigger" type="button" :disabled="Boolean(busy)" @click.stop="toggle">下载 <span>⌄</span></button>
  <Teleport to="body">
    <div v-if="open" class="report-download-popover" :style="menuStyle" @pointerdown.stop>
      <button v-for="item in reportDownloadItems" :key="item.key" type="button" :disabled="Boolean(busy)" @click="runDownload(item.key)">
        <span>{{ item.label }}</span><small v-if="busy === item.key">生成中...</small>
      </button>
      <p v-if="error" class="report-download-error">{{ error }}</p>
    </div>
  </Teleport>
</template>
