<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { permissionOptions, roleOptions, rolePermissionDefaults } from '../data/userSeeds'

const props = defineProps({
  users: { type: Array, required: true },
  currentUser: { type: Object, required: true },
})

const emit = defineEmits(['save-user', 'delete-user'])
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const pageSize = ref(10)
const currentPage = ref(1)
const showEditor = ref(false)
const editorMode = ref('create')
const formError = ref('')
const draft = reactive({
  id: null,
  username: '',
  displayName: '',
  password: '',
  role: 'customer',
  status: 'active',
  permissions: ['upload'],
})

const filteredUsers = computed(() => props.users.filter((user) => {
  const keyword = search.value.trim().toLowerCase()
  const matchesKeyword = !keyword ||
    user.username.toLowerCase().includes(keyword) ||
    user.displayName.toLowerCase().includes(keyword)
  const matchesRole = roleFilter.value === 'all' || user.role === roleFilter.value
  const matchesStatus = statusFilter.value === 'all' || user.status === statusFilter.value
  return matchesKeyword && matchesRole && matchesStatus
}))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)))
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

watch([search, roleFilter, statusFilter, pageSize], () => { currentPage.value = 1 })
watch(totalPages, value => { currentPage.value = Math.min(currentPage.value, value) })

function roleLabel(role) {
  return roleOptions.find(item => item.key === role)?.label || role
}

function permissionLabel(key) {
  return permissionOptions.find(item => item.key === key)?.label || key
}

function resetDraft() {
  Object.assign(draft, {
    id: null,
    username: '',
    displayName: '',
    password: '',
    role: 'customer',
    status: 'active',
    permissions: [...rolePermissionDefaults.customer],
  })
  formError.value = ''
}

function openCreate() {
  resetDraft()
  editorMode.value = 'create'
  showEditor.value = true
}

function openEdit(user) {
  Object.assign(draft, JSON.parse(JSON.stringify(user)))
  editorMode.value = 'edit'
  formError.value = ''
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  formError.value = ''
}

function changeRole() {
  draft.permissions = [...rolePermissionDefaults[draft.role]]
}

function togglePermission(key) {
  if (draft.role === 'admin' && key === 'users') return
  draft.permissions = draft.permissions.includes(key)
    ? draft.permissions.filter(item => item !== key)
    : [...draft.permissions, key]
}

function submitEditor() {
  if (!draft.username.trim() || !draft.displayName.trim() || !draft.password) {
    formError.value = '请完整填写用户名、显示名称和密码。'
    return
  }
  const duplicated = props.users.some(user =>
    user.username === draft.username.trim() && user.id !== draft.id)
  if (duplicated) {
    formError.value = '用户名已存在，请更换后重试。'
    return
  }
  if (!draft.permissions.length) {
    formError.value = '请至少选择一个可访问模块。'
    return
  }
  emit('save-user', JSON.parse(JSON.stringify({ ...draft, username: draft.username.trim(), displayName: draft.displayName.trim() })))
  closeEditor()
}
</script>

<template>
  <main class="user-management workspace-page">
    <section class="workspace-heading">
      <div>
        <h1>用户管理</h1>
      </div>
      <button class="primary-entry-btn user-add-button" type="button" @click="openCreate">新增用户</button>
    </section>

    <section class="user-management-panel">
      <div class="user-filter-row">
        <input v-model="search" type="search" placeholder="搜索用户名或显示名称" />
        <select v-model="roleFilter">
          <option value="all">全部角色</option>
          <option v-for="role in roleOptions" :key="role.key" :value="role.key">{{ role.label }}</option>
        </select>
        <select v-model="statusFilter">
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已停用</option>
        </select>
      </div>

      <div class="user-table-wrap">
        <table class="user-table">
          <thead><tr><th>用户名</th><th>显示名称</th><th>角色</th><th>状态</th><th>可访问模块</th><th>更新时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.id">
              <td><strong>{{ user.username }}</strong></td>
              <td>{{ user.displayName }}</td>
              <td><span class="user-role-badge">{{ roleLabel(user.role) }}</span></td>
              <td><span :class="['user-status-badge', user.status]">{{ user.status === 'active' ? '正常' : '已停用' }}</span></td>
              <td><div class="user-permission-list"><span v-for="key in user.permissions" :key="key">{{ permissionLabel(key) }}</span></div></td>
              <td>{{ user.updatedAt }}</td>
              <td><div class="user-row-actions"><button type="button" @click="openEdit(user)">编辑</button><button class="danger" type="button" :disabled="user.id === currentUser.id" @click="emit('delete-user', user)">删除</button></div></td>
            </tr>
            <tr v-if="!paginatedUsers.length"><td colspan="7" class="user-empty">暂无符合条件的用户</td></tr>
          </tbody>
        </table>
      </div>

      <div class="user-pagination">
        <span>共 <strong>{{ filteredUsers.length }}</strong> 条，当前第 <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong> 页</span>
        <div><span>每页</span><select v-model="pageSize"><option :value="10">10</option><option :value="20">20</option><option :value="50">50</option></select><button :disabled="currentPage <= 1" @click="currentPage--">上一页</button><button :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button></div>
      </div>
    </section>

    <div v-if="showEditor" class="modal-mask" @click.self="closeEditor">
      <section class="user-editor-modal">
        <button class="modal-close" type="button" @click="closeEditor">×</button>
        <h2>{{ editorMode === 'create' ? '新增用户' : '编辑用户' }}</h2>
        <div class="user-editor-grid">
          <label><span>用户名</span><input v-model="draft.username" :disabled="editorMode === 'edit'" placeholder="请输入登录用户名" /></label>
          <label><span>显示名称</span><input v-model="draft.displayName" placeholder="请输入显示名称" /></label>
          <label><span>登录密码</span><input v-model="draft.password" type="text" placeholder="请输入登录密码" /></label>
          <label><span>角色</span><select v-model="draft.role" :disabled="draft.id === currentUser.id" @change="changeRole"><option v-for="role in roleOptions" :key="role.key" :value="role.key">{{ role.label }}</option></select></label>
          <label><span>账户状态</span><select v-model="draft.status" :disabled="draft.id === currentUser.id"><option value="active">正常</option><option value="disabled">已停用</option></select></label>
        </div>
        <div class="permission-editor">
          <strong>模块权限</strong>
          <div><label v-for="option in permissionOptions" :key="option.key" :class="{ checked: draft.permissions.includes(option.key) }"><input type="checkbox" :checked="draft.permissions.includes(option.key)" :disabled="draft.role === 'admin' && option.key === 'users'" @change="togglePermission(option.key)" />{{ option.label }}</label></div>
        </div>
        <p v-if="formError" class="form-message error">{{ formError }}</p>
        <div class="user-editor-actions"><button class="quad-link" type="button" @click="closeEditor">取消</button><button class="primary-entry-btn" type="button" @click="submitEditor">保存</button></div>
      </section>
    </div>
  </main>
</template>
