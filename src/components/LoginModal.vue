<script setup>
defineProps({
  show: { type: Boolean, required: true },
  demoAccounts: { type: Array, required: true },
  loginForm: { type: Object, required: true },
  loginError: { type: String, required: true },
  loginSuccess: { type: String, required: true },
  forgotHint: { type: Boolean, required: true },
  canSubmitLogin: { type: [Boolean, String], required: true },
})

const emit = defineEmits(['close', 'forgot-password', 'submit-login'])
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="emit('close')">
    <div class="login-modal">
      <button class="modal-close" type="button" @click="emit('close')">×</button>
      <div class="login-avatar">◌</div>
      <h2>欢迎回来</h2>
      <p class="login-subtitle">登录报告解析中台账户</p>

      <div class="demo-account-list">
        <article v-for="account in demoAccounts" :key="account.username" class="demo-account">
          <strong>{{ account.roleLabel }}</strong>
          <span>账号：{{ account.username }}</span>
          <span>密码：{{ account.password }}</span>
        </article>
      </div>

      <label class="field">
        <span>账号</span>
        <input v-model="loginForm.username" type="text" placeholder="请输入账号" />
      </label>

      <label class="field">
        <span>密码</span>
        <input v-model="loginForm.password" type="password" placeholder="请输入密码" />
      </label>

      <button class="forgot-link" type="button" @click="emit('forgot-password')">忘记密码？</button>

      <p v-if="loginError" class="form-message error">{{ loginError }}</p>
      <p v-else-if="loginSuccess" class="form-message success">{{ loginSuccess }}</p>
      <p v-else-if="forgotHint" class="form-message hint">
        当前为演示版本，请使用上方对应角色的测试账号登录；正式环境后续可接入真实账号体系。
      </p>

      <button class="primary-entry-btn login-submit" type="button" :disabled="!canSubmitLogin" @click="emit('submit-login')">
        立即登录
      </button>
    </div>
  </div>
</template>
