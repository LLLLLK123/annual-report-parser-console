<script setup>
defineProps({
  show: { type: Boolean, required: true },
  selectedUploadType: { type: String, required: true },
  uploadForm: { type: Object, required: true },
})

const emit = defineEmits(['close', 'submit'])
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="emit('close')">
    <div class="login-modal upload-modal">
      <button class="modal-close" type="button" @click="emit('close')">×</button>
      <span class="login-kicker">{{ selectedUploadType }}</span>
      <h2>填写上传信息</h2>
      <p class="login-subtitle">请输入主体名称、年份、季度，并上传对应文件。</p>

      <label class="field">
        <span>主体名称</span>
        <input v-model="uploadForm.company" type="text" placeholder="请输入主体名称" />
      </label>

      <div class="upload-form-grid">
        <label class="field">
          <span>年份</span>
          <select v-model="uploadForm.year">
            <option>2026</option>
            <option>2025</option>
            <option>2024</option>
          </select>
        </label>

        <label class="field">
          <span>季度</span>
          <select v-model="uploadForm.quarter">
            <option>年报</option>
            <option>一季报</option>
            <option>半年报</option>
            <option>三季报</option>
          </select>
        </label>
      </div>

      <button class="upload-dropzone" type="button">
        <strong>点击选择文件或直接拖拽上传</strong>
        <span>{{ uploadForm.fileName || '当前未选择文件' }}</span>
      </button>

      <button class="primary-entry-btn login-submit" type="button" @click="emit('submit')">提交上传</button>
    </div>
  </div>
</template>
