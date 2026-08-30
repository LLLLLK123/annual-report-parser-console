<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppTopbar from './components/AppTopbar.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ConfigWorkspace from './components/ConfigWorkspace.vue'
import ConfigDrawer from './components/ConfigDrawer.vue'
import HomeView from './components/HomeView.vue'
import LibraryWorkspace from './components/LibraryWorkspace.vue'
import LoginModal from './components/LoginModal.vue'
import MonitoringWorkspace from './components/monitoring/MonitoringWorkspace.vue'
import ModulePlaceholder from './components/ModulePlaceholder.vue'
import RecordDetailModal from './components/RecordDetailModal.vue'
import UploadModal from './components/UploadModal.vue'
import UploadWorkbench from './components/UploadWorkbench.vue'
import UserManagement from './components/UserManagement.vue'
import {
  entries,
  navItems,
  roles,
} from './data/appShell'
import { roleOptions, userAccountsSeed } from './data/userSeeds'
import {
  allStatusLabelMap,
  normalizeReportTypeKey,
  normalizeStatusKey,
  reportTypeLabelMap,
  uploadRecordsSeed,
  uploadTypes,
} from './data/uploadSeeds'
import { configReportTypes, targetFieldConfigSeed, targetTableConfigSeed } from './data/configSeeds'

const activeView = ref('home')
const isAuthenticated = ref(false)
const currentUser = ref(null)
const showLogin = ref(false)
const showAccountMenu = ref(false)
const showPasswordPanel = ref(false)
const showUploadModal = ref(false)
const showRecordModal = ref(false)
const showDeleteConfirm = ref(false)
const showUserDeleteConfirm = ref(false)
const loginError = ref('')
const loginSuccess = ref('')
const forgotHint = ref(false)
const pendingView = ref('')
const selectedUploadType = ref('')
const selectedRecord = ref(null)
const detailReturnView = ref('library')
const deletingRecord = ref(null)
const deletingUser = ref(null)
const historySearch = ref('')
const reportTypeFilter = ref([])
const reportYearFilter = ref([])
const reportQuarterFilter = ref([])
const statusFilter = ref([])
const uploadTimeOrder = ref('desc')
const pageSize = ref(10)
const currentPage = ref(1)
const jumpPageInput = ref('1')
const activeConfigReport = ref('financial')
const activeConfigSection = ref('table')
const tableConfigSearch = ref('')
const fieldConfigSearch = ref('')
const fieldExposureFilter = ref('全部敞口')
const fieldTableFilter = ref('全部表格')
const tableConfigPageSize = ref(10)
const tableConfigCurrentPage = ref(1)
const tableConfigJumpPageInput = ref('1')
const fieldConfigPageSize = ref(10)
const fieldConfigCurrentPage = ref(1)
const fieldConfigJumpPageInput = ref('1')
const showConfigDrawer = ref(false)
const showConfigDeleteConfirm = ref(false)
const configDrawerKind = ref('table')
const configDrawerMode = ref('view')
const configDraft = ref(null)
const deletingConfigItem = ref(null)
const showBackToTop = ref(false)
const loginForm = reactive({
  username: '',
  password: '',
})
const passwordForm = reactive({
  currentPassword: '',
  nextPassword: '',
  confirmPassword: '',
})
const passwordMessage = ref('')
const uploadForm = reactive({
  company: '',
  year: '2026',
  quarter: '年报',
  fileName: '',
})
const targetTableConfigMap = reactive(JSON.parse(JSON.stringify(targetTableConfigSeed)))
const targetFieldConfigMap = reactive(JSON.parse(JSON.stringify(targetFieldConfigSeed)))
const uploadRecords = reactive(JSON.parse(JSON.stringify(uploadRecordsSeed)))
const userStorageKey = 'idoc-user-accounts'

function loadUserAccounts() {
  try {
    const stored = window.localStorage.getItem(userStorageKey)
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) && parsed.length ? parsed : userAccountsSeed
  } catch {
    return userAccountsSeed
  }
}

const userAccounts = reactive(JSON.parse(JSON.stringify(loadUserAccounts())))

const viewRoleMap = {
  home: [roles.internal, roles.admin],
  upload: [roles.customer, roles.internal, roles.admin],
  library: [roles.internal, roles.admin],
  monitor: [roles.internal, roles.admin],
  config: [roles.admin],
  users: [roles.admin],
}

const getUploadRecordTypeKey = (item) => normalizeReportTypeKey(item.typeKey || item.reportType || item.type)
const getUploadRecordStatusKey = (item) => normalizeStatusKey(item.statusKey || item.status)

const normalizedUploadRecords = computed(() => {
  return uploadRecords.map((item) => {
    const typeKey = getUploadRecordTypeKey(item)
    const statusKey = getUploadRecordStatusKey(item)
    return {
      ...item,
      typeKey,
      statusKey,
      type: reportTypeLabelMap[typeKey] || item.type || typeKey,
      status: allStatusLabelMap[statusKey] || item.status || statusKey,
    }
  })
})

const visibleUploadRecords = computed(() => {
  if (!currentUser.value?.username) return []
  return normalizedUploadRecords.value.filter((item) => item.uploaderUsername === currentUser.value.username)
})

const reportYearOptions = computed(() => [...new Set(visibleUploadRecords.value.map(item => item.year))])
const reportQuarterOptions = computed(() => [...new Set(visibleUploadRecords.value.map(item => item.quarter))])
const statusOptions = computed(() => {
  return [...new Set(visibleUploadRecords.value.map(item => getUploadRecordStatusKey(item)).filter(Boolean))].map((value) => ({
    value,
    label: allStatusLabelMap[value] || value,
  }))
})
const visibleReportTypeOptions = computed(() => {
  return [...new Set(visibleUploadRecords.value.map(item => getUploadRecordTypeKey(item)).filter(Boolean))].map((value) => ({
    value,
    label: reportTypeLabelMap[value] || value,
  }))
})

const filteredUploadRecords = computed(() => {
  return [...visibleUploadRecords.value]
    .filter((item) => {
      const matchesSearch =
        !historySearch.value.trim() || item.company.includes(historySearch.value.trim())
      const matchesType =
        !reportTypeFilter.value.length || reportTypeFilter.value.includes(item.typeKey)
      const matchesYear =
        !reportYearFilter.value.length || reportYearFilter.value.includes(item.year)
      const matchesQuarter =
        !reportQuarterFilter.value.length || reportQuarterFilter.value.includes(item.quarter)
      const matchesStatus =
        !statusFilter.value.length || statusFilter.value.includes(item.statusKey)

      return matchesSearch && matchesType && matchesYear && matchesQuarter && matchesStatus
    })
    .sort((a, b) => {
      const timeA = new Date(a.uploadedAt.replace(' ', 'T')).getTime()
      const timeB = new Date(b.uploadedAt.replace(' ', 'T')).getTime()
      return uploadTimeOrder.value === 'asc' ? timeA - timeB : timeB - timeA
    })
})

const totalRecordCount = computed(() => filteredUploadRecords.value.length)

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalRecordCount.value / pageSize.value))
})

const currentRole = computed(() => currentUser.value?.role || null)

const visibleNavItems = computed(() => {
  if (!isAuthenticated.value || !currentRole.value) {
    return navItems.filter(item => item.href === '#home')
  }

  return navItems.filter(item => hasAccessToView(item.href.slice(1)))
})

const visibleEntries = computed(() => {
  if (!isAuthenticated.value || !currentRole.value) {
    return []
  }

  return entries.filter(item => hasAccessToView(item.sectionId))
})

const paginatedUploadRecords = computed(() => {
  const safePage = Math.min(currentPage.value, totalPages.value)
  const start = (safePage - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUploadRecords.value.slice(start, end)
})

const activeConfigMeta = computed(() => {
  return configReportTypes.find(item => item.key === activeConfigReport.value) || configReportTypes[0]
})

const activeTargetTableConfigs = computed(() => {
  return targetTableConfigMap[activeConfigReport.value] || []
})

const activeTargetFieldConfigs = computed(() => {
  return targetFieldConfigMap[activeConfigReport.value] || []
})

const fieldExposureOptions = computed(() => {
  return ['全部敞口', ...new Set(activeTargetFieldConfigs.value.map(item => item.exposure))]
})

const fieldTableOptions = computed(() => {
  return ['全部表格', ...new Set(activeTargetFieldConfigs.value.map(item => item.structTitle))]
})

const filteredTargetTableConfigs = computed(() => {
  return activeTargetTableConfigs.value.filter((item) => {
    const search = tableConfigSearch.value.trim()
    const matchesSearch =
      !search ||
      item.taskName.includes(search) ||
      item.titleCode.includes(search) ||
      item.titleKeywords.includes(search) ||
      item.contentKeywords.includes(search)
    return matchesSearch
  })
})

const filteredTargetFieldConfigs = computed(() => {
  return activeTargetFieldConfigs.value.filter((item) => {
    const search = fieldConfigSearch.value.trim()
    const matchesSearch =
      !search ||
      item.adpSubject.includes(search) ||
      item.targetSubject.includes(search) ||
      item.keywordBag.includes(search) ||
      item.finalCode.includes(search)
    const matchesExposure =
      fieldExposureFilter.value === '全部敞口' || item.exposure === fieldExposureFilter.value
    const matchesTable =
      fieldTableFilter.value === '全部表格' || item.structTitle === fieldTableFilter.value
    return matchesSearch && matchesExposure && matchesTable
  })
})

const tableConfigTotalCount = computed(() => filteredTargetTableConfigs.value.length)
const tableConfigTotalPages = computed(() => Math.max(1, Math.ceil(tableConfigTotalCount.value / tableConfigPageSize.value)))
const paginatedTargetTableConfigs = computed(() => {
  const safePage = Math.min(tableConfigCurrentPage.value, tableConfigTotalPages.value)
  const start = (safePage - 1) * tableConfigPageSize.value
  return filteredTargetTableConfigs.value.slice(start, start + tableConfigPageSize.value)
})

const fieldConfigTotalCount = computed(() => filteredTargetFieldConfigs.value.length)
const fieldConfigTotalPages = computed(() => Math.max(1, Math.ceil(fieldConfigTotalCount.value / fieldConfigPageSize.value)))
const paginatedTargetFieldConfigs = computed(() => {
  const safePage = Math.min(fieldConfigCurrentPage.value, fieldConfigTotalPages.value)
  const start = (safePage - 1) * fieldConfigPageSize.value
  return filteredTargetFieldConfigs.value.slice(start, start + fieldConfigPageSize.value)
})

function hasAccessToView(view, user = currentUser.value) {
  const allowedRoles = viewRoleMap[view]
  if (!allowedRoles) return false
  if (view === 'home' && !isAuthenticated.value) return true
  if (!user) return false
  if (view === 'home') return user.role !== roles.customer
  if (view === 'users') return user.role === roles.admin && user.permissions?.includes('users')
  return Array.isArray(user.permissions)
    ? user.permissions.includes(view)
    : allowedRoles.includes(user.role)
}

function defaultViewForUser(user = currentUser.value) {
  if (!user) return 'home'
  if (user.role === roles.customer) return 'upload'
  return hasAccessToView('home', user) ? 'home' : (user.permissions?.[0] || 'upload')
}

function handleWindowScroll() {
  showBackToTop.value = window.scrollY > 360
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const canSubmitLogin = computed(() => loginForm.username.trim() && loginForm.password.trim())

function cloneConfigRow(row) {
  return JSON.parse(JSON.stringify(row))
}

function splitRuleTokens(value) {
  return (value || '')
    .split('^|^')
    .map(item => item.trim())
    .filter(Boolean)
}

function limitedRuleTokens(value, limit = 4) {
  return splitRuleTokens(value).slice(0, limit)
}

function hiddenRuleTokenCount(value, limit = 4) {
  return Math.max(splitRuleTokens(value).length - limit, 0)
}

function resetConfigFilters() {
  tableConfigSearch.value = ''
  fieldConfigSearch.value = ''
  fieldExposureFilter.value = '全部敞口'
  fieldTableFilter.value = '全部表格'
  tableConfigCurrentPage.value = 1
  tableConfigJumpPageInput.value = '1'
  fieldConfigCurrentPage.value = 1
  fieldConfigJumpPageInput.value = '1'
}

function switchConfigReport(key) {
  activeConfigReport.value = key
  resetConfigFilters()
  showConfigDrawer.value = false
  showConfigDeleteConfirm.value = false
}

function openConfigDrawer(kind, mode, row = null) {
  configDrawerKind.value = kind
  configDrawerMode.value = mode

  if (kind === 'table') {
    configDraft.value = row
      ? cloneConfigRow(row)
      : {
          id: Date.now(),
          bizTable: '',
          taskName: '',
          titleCode: '',
          sectionTitle: '',
          titleKeywords: '',
          contentKeywords: '',
          scope: activeConfigMeta.value.title,
          updatedAt: '2026-08-21 14:31',
          prompt: '',
          jsonSchema: '',
          jsonExample: '',
          positiveExamples: '',
          negativeExamples: '',
        }
  } else {
    configDraft.value = row
      ? cloneConfigRow(row)
      : {
          id: Date.now(),
          subjectCode: '',
          adpSubject: '',
          targetSubject: '',
          exposure: '',
          structTitle: '',
          titleCode: '',
          ocrCode: '',
          keywordBag: '',
          preCode: '',
          preName: '',
          postCode: '',
          postName: '',
          finalCode: '',
          prompt: '',
        }
  }

  showConfigDrawer.value = true
}

function closeConfigDrawer() {
  showConfigDrawer.value = false
  configDraft.value = null
}

function saveConfigDraft() {
  if (!configDraft.value) return
  const targetMap = configDrawerKind.value === 'table' ? targetTableConfigMap : targetFieldConfigMap
  const targetList = targetMap[activeConfigReport.value]
  const index = targetList.findIndex(item => item.id === configDraft.value.id)
  const payload = cloneConfigRow(configDraft.value)
  payload.updatedAt = '2026-08-21 14:31'

  if (index === -1) {
    targetList.unshift(payload)
  } else {
    targetList.splice(index, 1, payload)
  }

  if (configDrawerKind.value === 'table') {
    tableConfigCurrentPage.value = 1
    tableConfigJumpPageInput.value = '1'
  } else {
    fieldConfigCurrentPage.value = 1
    fieldConfigJumpPageInput.value = '1'
  }

  closeConfigDrawer()
}

function openDeleteConfig(kind, row) {
  configDrawerKind.value = kind
  deletingConfigItem.value = row
  showConfigDeleteConfirm.value = true
}

function closeDeleteConfig() {
  showConfigDeleteConfirm.value = false
  deletingConfigItem.value = null
}

function confirmDeleteConfig() {
  if (!deletingConfigItem.value) return
  const targetMap = configDrawerKind.value === 'table' ? targetTableConfigMap : targetFieldConfigMap
  const targetList = targetMap[activeConfigReport.value]
  const index = targetList.findIndex(item => item.id === deletingConfigItem.value.id)
  if (index !== -1) {
    targetList.splice(index, 1)
  }
  if (configDrawerKind.value === 'table') {
    if (tableConfigCurrentPage.value > tableConfigTotalPages.value) {
      tableConfigCurrentPage.value = tableConfigTotalPages.value
    }
    tableConfigJumpPageInput.value = String(tableConfigCurrentPage.value)
  } else {
    if (fieldConfigCurrentPage.value > fieldConfigTotalPages.value) {
      fieldConfigCurrentPage.value = fieldConfigTotalPages.value
    }
    fieldConfigJumpPageInput.value = String(fieldConfigCurrentPage.value)
  }
  closeDeleteConfig()
}

function resetTableConfigPagination() {
  tableConfigCurrentPage.value = 1
  tableConfigJumpPageInput.value = '1'
}

function resetFieldConfigPagination() {
  fieldConfigCurrentPage.value = 1
  fieldConfigJumpPageInput.value = '1'
}

function changeTableConfigPageSize() {
  resetTableConfigPagination()
}

function changeFieldConfigPageSize() {
  resetFieldConfigPagination()
}

function goToTableConfigPrevPage() {
  if (tableConfigCurrentPage.value <= 1) return
  tableConfigCurrentPage.value -= 1
  tableConfigJumpPageInput.value = String(tableConfigCurrentPage.value)
}

function goToTableConfigNextPage() {
  if (tableConfigCurrentPage.value >= tableConfigTotalPages.value) return
  tableConfigCurrentPage.value += 1
  tableConfigJumpPageInput.value = String(tableConfigCurrentPage.value)
}

function submitTableConfigJumpPage() {
  const parsed = Number(tableConfigJumpPageInput.value)
  if (!Number.isFinite(parsed)) {
    tableConfigJumpPageInput.value = String(tableConfigCurrentPage.value)
    return
  }
  tableConfigCurrentPage.value = Math.min(Math.max(parsed, 1), tableConfigTotalPages.value)
  tableConfigJumpPageInput.value = String(tableConfigCurrentPage.value)
}

function goToFieldConfigPrevPage() {
  if (fieldConfigCurrentPage.value <= 1) return
  fieldConfigCurrentPage.value -= 1
  fieldConfigJumpPageInput.value = String(fieldConfigCurrentPage.value)
}

function goToFieldConfigNextPage() {
  if (fieldConfigCurrentPage.value >= fieldConfigTotalPages.value) return
  fieldConfigCurrentPage.value += 1
  fieldConfigJumpPageInput.value = String(fieldConfigCurrentPage.value)
}

function submitFieldConfigJumpPage() {
  const parsed = Number(fieldConfigJumpPageInput.value)
  if (!Number.isFinite(parsed)) {
    fieldConfigJumpPageInput.value = String(fieldConfigCurrentPage.value)
    return
  }
  fieldConfigCurrentPage.value = Math.min(Math.max(parsed, 1), fieldConfigTotalPages.value)
  fieldConfigJumpPageInput.value = String(fieldConfigCurrentPage.value)
}

function openLogin() {
  showLogin.value = true
  showAccountMenu.value = false
  loginError.value = ''
  loginSuccess.value = ''
  forgotHint.value = false
}

function closeLogin() {
  showLogin.value = false
  loginError.value = ''
  loginSuccess.value = ''
  forgotHint.value = false
}

function submitLogin() {
  loginError.value = ''
  loginSuccess.value = ''
  forgotHint.value = false

  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    loginError.value = '请输入用户名和密码。'
    return
  }

  const matchedAccount = userAccounts.find(account => account.username === loginForm.username.trim())

  if (!matchedAccount || loginForm.password !== matchedAccount.password) {
    loginError.value = '用户名或密码不正确，请重新输入。'
    return
  }

  if (matchedAccount.status !== 'active') {
    loginError.value = '当前账号已停用，请联系管理员。'
    return
  }

  isAuthenticated.value = true
  currentUser.value = matchedAccount
  loginSuccess.value = ''
  showLogin.value = false
  showAccountMenu.value = false
  if (pendingView.value) {
    activeView.value = hasAccessToView(pendingView.value, matchedAccount) ? pendingView.value : defaultViewForUser(matchedAccount)
    pendingView.value = ''
  } else {
    activeView.value = defaultViewForUser(matchedAccount)
  }
}

function handleForgotPassword() {
  forgotHint.value = true
  loginError.value = ''
  loginSuccess.value = ''
}

function goHome() {
  activeView.value = 'home'
  showAccountMenu.value = false
  showPasswordPanel.value = false
}

function navigateTo(view) {
  if (view === 'home') {
    goHome()
    return
  }

  if (!isAuthenticated.value) {
    pendingView.value = view
    openLogin()
    loginError.value = '需先登录后才可进入对应页面。'
    return
  }

  if (!hasAccessToView(view)) {
    activeView.value = defaultViewForUser()
    showAccountMenu.value = true
    showPasswordPanel.value = false
    passwordMessage.value = `当前账号为${currentUser.value?.roleLabel}，暂未开放该模块权限。`
    return
  }

  activeView.value = view
  showAccountMenu.value = false
  showPasswordPanel.value = false
}

function uploadStatusClass(status) {
  return {
    已完成: 'success',
    处理中: 'info',
    待处理: 'warning',
    失败: 'danger',
  }[status] || 'muted'
}

function openUploadModal(type) {
  selectedUploadType.value = type
  uploadForm.company = ''
  uploadForm.year = '2026'
  uploadForm.quarter = '年报'
  uploadForm.fileName = ''
  showUploadModal.value = true
}

function closeUploadModal() {
  showUploadModal.value = false
}

function toggleUploadTimeOrder() {
  uploadTimeOrder.value = uploadTimeOrder.value === 'asc' ? 'desc' : 'asc'
  currentPage.value = 1
  jumpPageInput.value = '1'
}

function filterSummary(label, values) {
  return label
}

function downloadReport(row) {
  if (row.fileUrl && /^https?:\/\//i.test(row.fileUrl)) {
    const link = document.createElement('a')
    link.href = row.fileUrl
    link.download = row.fileName || `${row.company}.pdf`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }

  const fileContent = `报告名称：${row.fileName}\n主体：${row.company}\n报告类型：${row.type}\n报告年份：${row.year}\n报告季度：${row.quarter}\n上传时间：${row.uploadedAt}\n`
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = row.fileName
  link.click()
  URL.revokeObjectURL(url)
}

function viewRecordData(row) {
  if (row.statusKey !== 'success') return
  selectedRecord.value = row
  detailReturnView.value = 'upload'
  activeView.value = 'report-detail'
}

function closeRecordModal() {
  showRecordModal.value = false
  selectedRecord.value = null
}

function viewLibraryReport(row) {
  if (row.parseStatus !== '已完成') return
  selectedRecord.value = row
  detailReturnView.value = 'library'
  activeView.value = 'report-detail'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function leaveReportDetail() {
  activeView.value = detailReturnView.value
  selectedRecord.value = null
}

function requestDeleteRecord(row) {
  deletingRecord.value = row
  showDeleteConfirm.value = true
}

function cancelDeleteRecord() {
  showDeleteConfirm.value = false
  deletingRecord.value = null
}

function confirmDeleteRecord() {
  if (!deletingRecord.value) return
  const index = uploadRecords.findIndex(item => item.id === deletingRecord.value.id)
  if (index !== -1) {
    uploadRecords.splice(index, 1)
  }
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
    jumpPageInput.value = String(totalPages.value)
  }
  cancelDeleteRecord()
}

function onSearchInput() {
  currentPage.value = 1
  jumpPageInput.value = '1'
}

function updateReportTypeFilter(values) {
  reportTypeFilter.value = values
  onSearchInput()
}

function updateReportYearFilter(values) {
  reportYearFilter.value = values
  onSearchInput()
}

function updateReportQuarterFilter(values) {
  reportQuarterFilter.value = values
  onSearchInput()
}

function updateStatusFilter(values) {
  statusFilter.value = values
  onSearchInput()
}

function changePageSize() {
  currentPage.value = 1
  jumpPageInput.value = '1'
}

function goToPrevPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  jumpPageInput.value = String(currentPage.value)
}

function goToNextPage() {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  jumpPageInput.value = String(currentPage.value)
}

function goToPage(page) {
  const target = Math.min(Math.max(page, 1), totalPages.value)
  currentPage.value = target
  jumpPageInput.value = String(target)
}

function submitJumpPage() {
  const parsed = Number(jumpPageInput.value)
  if (!Number.isFinite(parsed)) {
    jumpPageInput.value = String(currentPage.value)
    return
  }
  goToPage(parsed)
}

function toggleAccountMenu() {
  if (!isAuthenticated.value) {
    openLogin()
    return
  }
  showAccountMenu.value = !showAccountMenu.value
  showPasswordPanel.value = false
  passwordMessage.value = ''
}

function togglePasswordPanel() {
  showPasswordPanel.value = !showPasswordPanel.value
  passwordMessage.value = ''
}

function submitPasswordChange() {
  passwordMessage.value = ''
  if (!passwordForm.currentPassword || !passwordForm.nextPassword || !passwordForm.confirmPassword) {
    passwordMessage.value = '请完整填写当前密码、新密码和确认密码。'
    return
  }
  if (passwordForm.currentPassword !== currentUser.value?.password) {
    passwordMessage.value = '当前密码不正确。'
    return
  }
  if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
    passwordMessage.value = '两次输入的新密码不一致。'
    return
  }
  currentUser.value.password = passwordForm.nextPassword
  currentUser.value.updatedAt = new Date().toLocaleString('sv-SE').replace('T', ' ')
  passwordMessage.value = '密码修改成功。'
  passwordForm.currentPassword = ''
  passwordForm.nextPassword = ''
  passwordForm.confirmPassword = ''
}

function saveUser(payload) {
  const roleLabel = roleOptions.find(item => item.key === payload.role)?.label || payload.role
  const updatedAt = new Date().toLocaleString('sv-SE').replace('T', ' ')
  const index = userAccounts.findIndex(user => user.id === payload.id)
  if (index === -1) {
    userAccounts.unshift({ ...payload, id: Math.max(0, ...userAccounts.map(user => user.id)) + 1, roleLabel, updatedAt })
    return
  }
  Object.assign(userAccounts[index], payload, { roleLabel, updatedAt })
}

function requestDeleteUser(user) {
  if (user.id === currentUser.value?.id) return
  deletingUser.value = user
  showUserDeleteConfirm.value = true
}

function cancelDeleteUser() {
  deletingUser.value = null
  showUserDeleteConfirm.value = false
}

function confirmDeleteUser() {
  const index = userAccounts.findIndex(user => user.id === deletingUser.value?.id)
  if (index !== -1) userAccounts.splice(index, 1)
  cancelDeleteUser()
}

function logout() {
  isAuthenticated.value = false
  currentUser.value = null
  showAccountMenu.value = false
  showPasswordPanel.value = false
  showUploadModal.value = false
  loginForm.username = ''
  loginForm.password = ''
  passwordForm.currentPassword = ''
  passwordForm.nextPassword = ''
  passwordForm.confirmPassword = ''
  passwordMessage.value = ''
  pendingView.value = ''
  goHome()
}

onMounted(() => {
  handleWindowScroll()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
})

watch(userAccounts, (accounts) => {
  window.localStorage.setItem(userStorageKey, JSON.stringify(accounts))
}, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
})
</script>

<template>
  <div class="landing-shell" id="home">
    <AppTopbar
      :active-view="activeView"
      :nav-items="visibleNavItems"
      :is-authenticated="isAuthenticated"
      :current-user="currentUser"
      :show-account-menu="showAccountMenu"
      :show-password-panel="showPasswordPanel"
      :password-form="passwordForm"
      :password-message="passwordMessage"
      @navigate="navigateTo"
      @toggle-account-menu="toggleAccountMenu"
      @toggle-password-panel="togglePasswordPanel"
      @submit-password-change="submitPasswordChange"
      @logout="logout"
    />

    <HomeView v-if="activeView === 'home'" :entries="visibleEntries" @navigate="navigateTo" />

    <RecordDetailModal
      v-else-if="activeView === 'report-detail'"
      :record="selectedRecord"
      @back="leaveReportDetail"
    />

    <UploadWorkbench
      v-else-if="activeView === 'upload'"
      :upload-types="uploadTypes"
      :paginated-upload-records="paginatedUploadRecords"
      :report-type-options="visibleReportTypeOptions"
      :report-year-options="reportYearOptions"
      :report-quarter-options="reportQuarterOptions"
      :status-options="statusOptions"
      :history-search="historySearch"
      :report-type-filter="reportTypeFilter"
      :report-year-filter="reportYearFilter"
      :report-quarter-filter="reportQuarterFilter"
      :status-filter="statusFilter"
      :upload-time-order="uploadTimeOrder"
      :total-record-count="totalRecordCount"
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :jump-page-input="jumpPageInput"
      :upload-status-class="uploadStatusClass"
      :filter-summary="filterSummary"
      :apply-report-type-filter-action="updateReportTypeFilter"
      :apply-report-year-filter-action="updateReportYearFilter"
      :apply-report-quarter-filter-action="updateReportQuarterFilter"
      :apply-status-filter-action="updateStatusFilter"
      @open-upload-modal="openUploadModal"
      @update:history-search="historySearch = $event"
      @update:report-type-filter="updateReportTypeFilter"
      @update:report-year-filter="updateReportYearFilter"
      @update:report-quarter-filter="updateReportQuarterFilter"
      @update:status-filter="updateStatusFilter"
      @search-input="onSearchInput"
      @toggle-upload-time-order="toggleUploadTimeOrder"
      @download-report="downloadReport"
      @view-record-data="viewRecordData"
      @request-delete-record="requestDeleteRecord"
      @update:page-size="pageSize = $event"
      @change-page-size="changePageSize"
      @prev-page="goToPrevPage"
      @next-page="goToNextPage"
      @update:jump-page-input="jumpPageInput = $event"
      @submit-jump-page="submitJumpPage"
    />

    <LibraryWorkspace
      v-else-if="activeView === 'library'"
      :current-user="currentUser"
      @view-report="viewLibraryReport"
    />

    <ConfigWorkspace
      v-else-if="activeView === 'config'"
      :config-report-types="configReportTypes"
      :active-config-report="activeConfigReport"
      :active-config-section="activeConfigSection"
      :active-config-meta="activeConfigMeta"
      :table-config-search="tableConfigSearch"
      :field-config-search="fieldConfigSearch"
      :field-exposure-filter="fieldExposureFilter"
      :field-table-filter="fieldTableFilter"
      :field-exposure-options="fieldExposureOptions"
      :field-table-options="fieldTableOptions"
      :filtered-target-table-configs="filteredTargetTableConfigs"
      :active-target-table-configs="activeTargetTableConfigs"
      :filtered-target-field-configs="filteredTargetFieldConfigs"
      :active-target-field-configs="activeTargetFieldConfigs"
      :paginated-target-table-configs="paginatedTargetTableConfigs"
      :paginated-target-field-configs="paginatedTargetFieldConfigs"
      :table-config-total-count="tableConfigTotalCount"
      :table-config-current-page="tableConfigCurrentPage"
      :table-config-total-pages="tableConfigTotalPages"
      :table-config-page-size="tableConfigPageSize"
      :table-config-jump-page-input="tableConfigJumpPageInput"
      :field-config-total-count="fieldConfigTotalCount"
      :field-config-current-page="fieldConfigCurrentPage"
      :field-config-total-pages="fieldConfigTotalPages"
      :field-config-page-size="fieldConfigPageSize"
      :field-config-jump-page-input="fieldConfigJumpPageInput"
      :split-rule-tokens="splitRuleTokens"
      :limited-rule-tokens="limitedRuleTokens"
      :hidden-rule-token-count="hiddenRuleTokenCount"
      @switch-config-report="switchConfigReport"
      @update:active-config-section="activeConfigSection = $event"
      @update:table-config-search="tableConfigSearch = $event"
      @reset-table-config-pagination="resetTableConfigPagination"
      @open-config-drawer="openConfigDrawer"
      @open-delete-config="openDeleteConfig"
      @update:field-config-search="fieldConfigSearch = $event"
      @update:field-exposure-filter="fieldExposureFilter = $event"
      @update:field-table-filter="fieldTableFilter = $event"
      @reset-field-config-pagination="resetFieldConfigPagination"
      @update:table-config-page-size="tableConfigPageSize = $event"
      @change-table-config-page-size="changeTableConfigPageSize"
      @table-config-prev-page="goToTableConfigPrevPage"
      @table-config-next-page="goToTableConfigNextPage"
      @update:table-config-jump-page-input="tableConfigJumpPageInput = $event"
      @submit-table-config-jump-page="submitTableConfigJumpPage"
      @update:field-config-page-size="fieldConfigPageSize = $event"
      @change-field-config-page-size="changeFieldConfigPageSize"
      @field-config-prev-page="goToFieldConfigPrevPage"
      @field-config-next-page="goToFieldConfigNextPage"
      @update:field-config-jump-page-input="fieldConfigJumpPageInput = $event"
      @submit-field-config-jump-page="submitFieldConfigJumpPage"
    />

    <MonitoringWorkspace v-else-if="activeView === 'monitor'" />

    <UserManagement
      v-else-if="activeView === 'users'"
      :users="userAccounts"
      :current-user="currentUser"
      @save-user="saveUser"
      @delete-user="requestDeleteUser"
    />

    <ModulePlaceholder
      v-else
      :title="entries.find(entry => entry.sectionId === activeView)?.title"
      @go-home="goHome"
    />

    <LoginModal
      :show="showLogin"
      :demo-accounts="userAccounts.filter(account => account.status === 'active')"
      :login-form="loginForm"
      :login-error="loginError"
      :login-success="loginSuccess"
      :forgot-hint="forgotHint"
      :can-submit-login="canSubmitLogin"
      @close="closeLogin"
      @forgot-password="handleForgotPassword"
      @submit-login="submitLogin"
    />

    <UploadModal
      :show="showUploadModal"
      :selected-upload-type="selectedUploadType"
      :upload-form="uploadForm"
      @close="closeUploadModal"
      @submit="closeUploadModal"
    />


    <ConfirmDialog
      :show="showDeleteConfirm && !!deletingRecord"
      title="确认删除这条记录？"
      content="删除后将移除"
      :highlight="deletingRecord?.company ? `${deletingRecord.company} 的历史记录，当前演示数据不会自动恢复。` : ''"
      @close="cancelDeleteRecord"
      @confirm="confirmDeleteRecord"
    />

    <ConfirmDialog
      :show="showUserDeleteConfirm && !!deletingUser"
      title="确认删除该用户？"
      content="删除后该账号将无法继续登录："
      :highlight="deletingUser?.username || ''"
      @close="cancelDeleteUser"
      @confirm="confirmDeleteUser"
    />

    <ConfigDrawer
      :show="showConfigDrawer"
      :config-draft="configDraft"
      :config-drawer-kind="configDrawerKind"
      :config-drawer-mode="configDrawerMode"
      :split-rule-tokens="splitRuleTokens"
      @close="closeConfigDrawer"
      @save="saveConfigDraft"
    />

    <ConfirmDialog
      :show="showConfigDeleteConfirm && !!deletingConfigItem"
      title="确认删除这条配置？"
      content="即将删除"
      :highlight="configDrawerKind === 'table' ? `${deletingConfigItem?.taskName || ''}，删除后当前演示配置将从列表中移除。` : `${deletingConfigItem?.targetSubject || ''}，删除后当前演示配置将从列表中移除。`"
      @close="closeDeleteConfig"
      @confirm="confirmDeleteConfig"
    />

    <button v-if="showBackToTop" class="back-to-top-btn" type="button" @click="scrollToTop">
      返回顶部
    </button>
  </div>
</template>
