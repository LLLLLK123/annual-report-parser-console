<script setup>
defineProps({
  activeView: { type: String, required: true },
  navItems: { type: Array, required: true },
  isAuthenticated: { type: Boolean, required: true },
  currentUser: { type: Object, default: null },
  showAccountMenu: { type: Boolean, required: true },
  showPasswordPanel: { type: Boolean, required: true },
  passwordForm: { type: Object, required: true },
  passwordMessage: { type: String, required: true },
})

const emit = defineEmits([
  'navigate',
  'toggle-account-menu',
  'toggle-password-panel',
  'submit-password-change',
  'logout',
])
</script>

<template>
  <header class="landing-topbar">
    <div class="brand">
      <div class="brand-mark">⚡</div>
      <div>
        <strong>Deloitte</strong>
        <span>FINANCIAL INTELLIGENCE</span>
      </div>
    </div>

    <nav class="landing-nav">
      <button
        v-for="item in navItems"
        :key="item.href"
        :class="['nav-link', { active: activeView === item.href.slice(1) }]"
        type="button"
        @click="emit('navigate', item.href.slice(1))"
      >
        {{ item.label }}
      </button>
    </nav>

    <div class="topbar-actions">
      <button class="account-trigger" type="button" @click="emit('toggle-account-menu')">
        <span class="account-trigger-icon">◌</span>
        <span>{{ isAuthenticated ? currentUser?.username : '登录' }}</span>
      </button>

      <div v-if="showAccountMenu" class="account-menu">
        <div class="account-menu-head">
          <div class="account-menu-avatar">◌</div>
          <div>
            <strong>{{ currentUser?.displayName || '未登录' }}</strong>
            <span>{{ isAuthenticated ? `${currentUser?.roleLabel} · 已登录` : '请先登录' }}</span>
          </div>
        </div>

        <button v-if="isAuthenticated" class="account-menu-item" type="button" @click="emit('toggle-password-panel')">
          修改密码
        </button>
        <button v-if="isAuthenticated" class="account-menu-item danger" type="button" @click="emit('logout')">
          退出登录
        </button>

        <div v-if="showPasswordPanel && isAuthenticated" class="password-panel">
          <label class="field small">
            <span>当前密码</span>
            <input v-model="passwordForm.currentPassword" type="password" placeholder="请输入当前密码" />
          </label>
          <label class="field small">
            <span>新密码</span>
            <input v-model="passwordForm.nextPassword" type="password" placeholder="请输入新密码" />
          </label>
          <label class="field small">
            <span>确认新密码</span>
            <input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
          </label>
          <p v-if="passwordMessage" class="form-message hint compact">{{ passwordMessage }}</p>
          <button class="quad-enter password-submit" type="button" @click="emit('submit-password-change')">
            确认修改
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
