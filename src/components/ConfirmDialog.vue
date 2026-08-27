<script setup>
defineProps({
  show: { type: Boolean, required: true },
  kicker: { type: String, default: '删除确认' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  highlight: { type: String, default: '' },
  confirmText: { type: String, default: '确认删除' },
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="emit('close')">
    <div class="login-modal delete-confirm-modal">
      <button class="modal-close" type="button" @click="emit('close')">×</button>
      <span class="login-kicker">{{ kicker }}</span>
      <h2>{{ title }}</h2>
      <p class="delete-confirm-text">
        {{ content }}
        <strong v-if="highlight">{{ highlight }}</strong>
      </p>
      <div class="delete-confirm-actions">
        <button class="quad-link" type="button" @click="emit('close')">取消</button>
        <button class="primary-entry-btn danger-btn" type="button" @click="emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>
