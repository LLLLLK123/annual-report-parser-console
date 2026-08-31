export const roles = {
  customer: 'customer',
  internal: 'internal',
  admin: 'admin',
}

export const demoAccounts = [
  {
    username: 'client_demo',
    password: 'Client@2026',
    displayName: '客户账号',
    role: roles.customer,
    roleLabel: '普通客户',
  },
  {
    username: 'internal_demo',
    password: 'Internal@2026',
    displayName: '内部账号',
    role: roles.internal,
    roleLabel: '内部人员',
  },
  {
    username: 'demo_admin',
    password: 'Deloitte@2026',
    displayName: '管理员账号',
    role: roles.admin,
    roleLabel: '管理员',
  },
]

export const navItems = [
  { label: '上传工作台', href: '#upload', allowedRoles: [roles.customer, roles.internal, roles.admin] },
  { label: '报告库', href: '#library', allowedRoles: [roles.internal, roles.admin] },
  { label: '运营监测', href: '#monitor', allowedRoles: [roles.internal, roles.admin] },
  { label: '解析配置', href: '#config', allowedRoles: [roles.admin] },
  { label: '用户管理', href: '#users', allowedRoles: [roles.admin] },
]

export const entries = [
  {
    key: 'upload',
    sectionId: 'upload',
    badge: '01',
    title: '上传工作台',
    short: '多报告类型上传与历史任务承接',
    description:
      '承接财务报告、审计报告、招股说明书与港股财报的统一上传入口，并提供后续历史任务追踪能力。',
    points: ['财务报告上传', '审计报告上传', '招股说明书上传', '港股财报上传'],
    visualLabel: 'UPLOAD STREAM',
    allowedRoles: [roles.customer, roles.internal, roles.admin],
  },
  {
    key: 'library',
    sectionId: 'library',
    badge: '02',
    title: '报告库',
    short: '公众与非公众报告统一检索与回看',
    description:
      '沉淀报告资产，串联报告清单、解析状态、原始表格、目标表格与原始报告定位，形成可追溯的报告资产中心。',
    points: ['公众报告与非公众报告', '搜索与清单', '解析结果回溯'],
    visualLabel: 'REPORT GRAPH',
    allowedRoles: [roles.internal, roles.admin],
  },
  {
    key: 'monitor',
    sectionId: 'monitor',
    badge: '03',
    title: '运营监测',
    short: '数量、流程、下游链路统一观察',
    description:
      '围绕新增、完成、待完成、失败与入库链路形成全流程监测视角，帮助快速识别异常与瓶颈位置。',
    points: ['数量监测', '流程监测', '下游监测'],
    visualLabel: 'FLOW SIGNAL',
    allowedRoles: [roles.internal, roles.admin],
  },
  {
    key: 'config',
    sectionId: 'config',
    badge: '04',
    title: '解析配置',
    short: '目标表与目标字段规则管理',
    description:
      '面向不同报告类型维护目标表配置与目标字段配置，为 OCR 解析与结构化提取提供稳定规则基础。',
    points: ['目标表配置', '目标字段配置', '多报告类型扩展'],
    visualLabel: 'RULE ENGINE',
    allowedRoles: [roles.admin],
  },
  {
    key: 'users',
    sectionId: 'users',
    badge: '05',
    title: '用户管理',
    short: '账户、角色与模块权限管理',
    description: '统一维护平台账户、角色、启停状态和可访问模块。',
    points: ['用户新增与编辑', '角色与权限配置', '账户启停与删除'],
    visualLabel: 'ACCESS CONTROL',
    allowedRoles: [roles.admin],
  },
]
