import { demoAccounts, roles } from './appShell'

export const permissionOptions = [
  { key: 'upload', label: '上传工作台' },
  { key: 'library', label: '报告库' },
  { key: 'monitor', label: '运营监测' },
  { key: 'config', label: '解析配置' },
  { key: 'users', label: '用户管理' },
]

export const roleOptions = [
  { key: roles.customer, label: '普通客户' },
  { key: roles.internal, label: '内部人员' },
  { key: roles.admin, label: '管理员' },
]

export const rolePermissionDefaults = {
  [roles.customer]: ['upload'],
  [roles.internal]: ['upload', 'library', 'monitor'],
  [roles.admin]: permissionOptions.map(item => item.key),
}

export const userAccountsSeed = demoAccounts.map((account, index) => ({
  id: index + 1,
  ...account,
  status: 'active',
  permissions: [...rolePermissionDefaults[account.role]],
  updatedAt: '2026-08-30 10:00',
}))
