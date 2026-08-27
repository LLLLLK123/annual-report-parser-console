import {
  crawlerListRows,
  rawReportInformationRows,
  structured3MajorRows,
  structuredNotesRows,
  uploadReportInformationRows,
} from './sourceTables'
import { allStatusLabelMap, reportTypeLabelMap } from './uploadSeeds'

export const monitoringReferenceDate = '2026-08-26'

export const monitoringTabs = [
  { key: 'count', label: '数量监测' },
  { key: 'process', label: '流程监测' },
  { key: 'downstream', label: '下游监测' },
]

export { crawlerListRows, rawReportInformationRows, uploadReportInformationRows, structured3MajorRows, structuredNotesRows }

export const monitoringCountSections = [
  {
    key: 'public',
    title: '公众报告',
    englishLabel: 'PUBLIC REPORTS',
    sourceTag: '爬虫来源',
    description: '对应 crawler_list 中 is_public = 1 的公开报告任务，后续统计总量、新增、已完成、待完成、失败等指标。',
    metrics: ['总量', '新增', '已完成', '待完成', '失败'],
  },
  {
    key: 'private',
    title: '非公众报告',
    englishLabel: 'PRIVATE REPORTS',
    sourceTag: '上传来源',
    description: '对应 crawler_list 中 is_public = 2 的非公开报告任务，当前由上传工作台进入，后续承接上传后的数量统计与处理情况。',
    metrics: ['总量', '新增', '已完成', '待完成', '失败'],
  },
]

export const monitoringRangeOptions = [
  { key: 'today', label: '今日', days: 1 },
  { key: 'week', label: '近7天', days: 7 },
  { key: 'month', label: '近30天', days: 30 },
]

export const monitoringProcessStages = [
  {
    key: 'created',
    title: '新增报告',
    englishLabel: 'NEW REPORT',
    description: '基于 crawler_list 创建时间观察公开抓取与手工上传两类任务的进入情况。',
  },
  {
    key: 'pageindex',
    title: 'PageIndex解析',
    englishLabel: 'PAGEINDEX',
    description: '监测 crawler_list.pageindex_status 与 raw_report_information 原始召回结果，为后续技术详情页预留承接位置。',
  },
  {
    key: 'extract',
    title: '目标字段提取',
    englishLabel: 'FIELD EXTRACTION',
    description: '监测 upload_report_information 等中间结果表，观察目标字段提取阶段的执行与积压情况。',
  },
  {
    key: 'storage',
    title: '入库',
    englishLabel: 'STORAGE',
    description: '监测 structured_3major 与 structed_notes 等最终结果表，观察入库完成情况与异常状态。',
  },
]

const quarterLabelMap = {
  1: '一季报',
  2: '半年报',
  3: '三季报',
  4: '年报',
}

const createProcessSteps = (row) => {
  const baseSteps = [
    { key: 'task_prepare', stageKey: 'created', title: '当前待处理年报查询', successNote: '已获取当前任务基础变量，并写回处理中状态。', failNote: '任务还未进入处理队列。', progress: 12 },
    { key: 'pageindex_query', stageKey: 'pageindex', title: 'PageIndex结果查询 / 提交', successNote: '已完成 PageIndex 复用判断、提交与任务ID回写。', failNote: row.error_msg || 'PageIndex 提交或查询失败。', progress: 30 },
    { key: 'raw_insert', stageKey: 'pageindex', title: 'raw_report_information 入库', successNote: '原始节点与高召回表格已回写到 raw_report_information。', failNote: row.error_msg || '原始召回结果尚未入库。', progress: 46 },
    { key: 'processed_insert', stageKey: 'pageindex', title: 'processed_report_information 入库', successNote: '拆表、跨页合并、表格补充已完成并写入 processed 表池。', failNote: row.error_msg || 'processed 表池尚未生成。', progress: 60 },
    { key: 'upload_select', stageKey: 'extract', title: '三表选表与 upload 入库', successNote: '三表 Task 读取、候选 Prompt、选表结果处理及 upload 入库完成。', failNote: row.error_msg || '三表选表或 upload 入库未完成。', progress: 76 },
    { key: 'three_major_store', stageKey: 'extract', title: '三表科目映射与 structured_3major 入库', successNote: '三表代码解析、科目映射、structured_3major 入库已完成。', failNote: row.error_msg || '三表结构化结果尚未完成。', progress: 88 },
    { key: 'notes_store', stageKey: 'storage', title: '附注抽取与 structed_notes 入库', successNote: '附注批次选表、抽取、structed_notes 入库与校验完成。', failNote: row.error_msg || '附注抽取或 structed_notes 入库未完成。', progress: 96 },
    { key: 'finish_writeback', stageKey: 'storage', title: 'all_status 成功回写', successNote: '最终校验通过，all_status 成功回写。', failNote: row.error_msg || '最终回写未完成。', progress: 100 },
  ]

  return baseSteps.map((step) => {
    if (row.process_percent >= step.progress) {
      return {
        ...step,
        status: row.all_status === 'failed' && row.process_percent === step.progress ? 'failed' : 'completed',
        description: row.all_status === 'failed' && row.process_percent === step.progress ? step.failNote : step.successNote,
      }
    }

    if (row.all_status !== 'failed' && row.current_stage_key === step.stageKey) {
      return {
        ...step,
        status: 'active',
        description: step.successNote,
      }
    }

    return {
      ...step,
      status: 'pending',
      description: step.failNote,
    }
  })
}

const createProcessLogs = (row) => {
  const basePath = row.file_url.startsWith('http')
    ? row.file_url
    : `/data/uploads/originals/${row.process_task_id}/${row.file_name}`
  const shortId = row.process_task_id

  const logs = [
    `${row.create_time.replace(' ', 'T')}.117 [info] 01 开始`,
    `${row.create_time.replace(' ', 'T')}.121 [info] 02 当前待处理年报查询`,
    `${row.create_time.replace(' ', 'T')}.127 [info] 02.1 当前年报变量获取`,
  ]

  if (row.pageindex_status === 'queued') {
    logs.push(`${row.create_time.replace(' ', 'T')}.401 [info] 02.2 all_status处理中回写，任务已进入队列`)
  }

  if (row.pageindex_status === 'submitted' || row.pageindex_status === 'running' || row.pageindex_status === 'success' || row.pageindex_status === 'ocr_synced' || row.pageindex_status === 'failed') {
    logs.push(`${row.update_time.replace(' ', 'T')}.211 [info] 02.8 PageIndex ID回写 docId=${shortId}`)
    logs.push(`${row.update_time.replace(' ', 'T')}.238 [info] 03 PageIndex结果查询`)
  }

  if (row.pageindex_status === 'running') {
    logs.push(`${row.update_time.replace(' ', 'T')}.457 [info] 04 目标Node高召回筛选`)
    logs.push(`${row.update_time.replace(' ', 'T')}.482 [info] 06 raw_report_information入库`)
  }

  if (row.pageindex_status === 'success' || row.pageindex_status === 'ocr_synced') {
    logs.push(`${row.update_time.replace(' ', 'T')}.582 [info] 08 拆表+跨页合并`)
    logs.push(`${row.update_time.replace(' ', 'T')}.614 [info] 11 processed_report_information入库`)
  }

  if (row.current_stage_key === 'extract' && row.all_status !== 'failed') {
    logs.push(`${row.update_time.replace(' ', 'T')}.731 [info] 14 TopN候选+各Task Prompt生成`)
    logs.push(`${row.update_time.replace(' ', 'T')}.764 [info] 20 三表upload入库`)
    logs.push(`${row.update_time.replace(' ', 'T')}.812 [info] 28 六张三表映射确认+structured_3major SQL`)
  }

  if (row.current_stage_key === 'storage' && row.all_status === 'success') {
    logs.push(`${row.update_time.replace(' ', 'T')}.873 [info] 52 当前附注批次structed_notes入库`)
    logs.push(`${row.update_time.replace(' ', 'T')}.914 [info] 57 all_status成功回写，任务结束`)
  }

  if (row.all_status === 'failed') {
    logs.push(`${row.update_time.replace(' ', 'T')}.851 [error] ${row.current_stage_label} 处理失败`)
    logs.push(`Failed to open file '${basePath}'. ${row.error_msg || '请检查上游文件与处理链路。'}`)
  }

  return logs
}

export const monitoringProcessTasks = crawlerListRows.map((row) => ({
  ...row,
  reportTypeLabel: reportTypeLabelMap[row.report_type] || row.report_type,
  statusLabel: allStatusLabelMap[row.all_status] || row.all_status,
  quarterLabel: quarterLabelMap[row.report_quarter] || '未知季度',
  process_steps: createProcessSteps(row),
  process_logs: createProcessLogs(row),
}))

const DOWNSTREAM_REFERENCE_DAY = '2026-08-26'

const dateOnly = (value) => (value ? value.slice(0, 10) : '')

const downstreamRowsBase = crawlerListRows
  .filter((row) => row.all_status === 'success' || row.all_status === 'processing' || row.all_status === 'failed')
  .map((row, index) => {
    const isPublicLabel = row.is_public === 1 ? '公众报告' : '非公众报告'
    const sameDayUpdated = dateOnly(row.update_time) === DOWNSTREAM_REFERENCE_DAY
    const baseFinanceSynced = row.all_status === 'success' && sameDayUpdated && index % 4 !== 0
    const baseFinanceNoteSynced = row.all_status === 'success' && sameDayUpdated && index % 5 !== 0
    const triggerReasons = []

    if (!baseFinanceSynced) triggerReasons.push('base_finance 未同步')
    if (!baseFinanceNoteSynced) triggerReasons.push('base_finance_note_integrated 未同步')

    const downstreamStatusKey = triggerReasons.length ? 'triggered' : 'normal'

    return {
      id: `downstream-${row.id}`,
      scopeKey: row.is_public === 1 ? 'public' : 'private',
      scopeLabel: isPublicLabel,
      reportTypeKey: row.report_type,
      reportTypeLabel: reportTypeLabelMap[row.report_type] || row.report_type,
      companyName: row.company_name,
      crmCode: row.crmcode,
      reportName: row.file_name,
      reportYear: row.report_year,
      reportQuarter: quarterLabelMap[row.report_quarter] || '未知季度',
      parseStatus: allStatusLabelMap[row.all_status] || row.all_status,
      parseStatusKey: row.all_status,
      downstreamStatus: downstreamStatusKey === 'normal' ? '未触发' : '已触发',
      downstreamStatusKey,
      syncTime: row.update_time.slice(0, 16),
      monitorDate: DOWNSTREAM_REFERENCE_DAY,
      baseFinanceSynced,
      baseFinanceNoteSynced,
      triggerReasons,
    }
  })

export const monitoringDownstreamRows = downstreamRowsBase
