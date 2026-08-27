import { crawlerListRows } from './sourceTables'

const quarterLabelMap = {
  1: '一季报',
  2: '半年报',
  3: '三季报',
  4: '年报',
}

export const reportTypeLabelMap = {
  financial: '财务报告',
  audit: '审计报告',
  prospectus: '招股说明书',
  hk: '港股财报',
}

export const allStatusLabelMap = {
  pending: '待处理',
  processing: '处理中',
  success: '已完成',
  failed: '失败',
}

const reportTypeAliasMap = {
  financial: 'financial',
  finance: 'financial',
  财务报告: 'financial',
  audit: 'audit',
  审计报告: 'audit',
  prospectus: 'prospectus',
  招股说明书: 'prospectus',
  hk: 'hk',
  港股财报: 'hk',
  港股财务报告: 'hk',
}

const statusAliasMap = {
  pending: 'pending',
  queued: 'pending',
  wait: 'pending',
  待处理: 'pending',
  processing: 'processing',
  prosscing: 'processing',
  running: 'processing',
  submitted: 'processing',
  处理中: 'processing',
  success: 'success',
  completed: 'success',
  done: 'success',
  已完成: 'success',
  failed: 'failed',
  fail: 'failed',
  error: 'failed',
  失败: 'failed',
}

export const normalizeReportTypeKey = (value) => {
  return reportTypeAliasMap[String(value || '').trim()] || String(value || '').trim()
}

export const normalizeStatusKey = (value) => {
  return statusAliasMap[String(value || '').trim()] || String(value || '').trim()
}

export const uploadTypes = [
  { key: 'financial', title: '财务报告上传', desc: '适用于年报、一季报、半年报、三季报。' },
  { key: 'audit', title: '审计报告上传', desc: '适用于审计意见、附注与审计正文解析。' },
  { key: 'prospectus', title: '招股说明书上传', desc: '适用于招股书章节、指标与表格提取。' },
  { key: 'hk', title: '港股财报上传', desc: '适用于港股披露格式与双语财报处理。' },
]

export const privateCrawlerListRows = crawlerListRows
  .filter((row) => row.is_public === 2)

export const uploadRecordsSeed = privateCrawlerListRows.map((row) => ({
  id: row.id,
  crmCode: row.crmcode,
  company: row.company_name,
  year: String(row.report_year),
  quarter: quarterLabelMap[row.report_quarter] || '未知季度',
  quarterValue: row.report_quarter,
  typeKey: normalizeReportTypeKey(row.report_type),
  type: reportTypeLabelMap[normalizeReportTypeKey(row.report_type)] || row.report_type,
  statusKey: normalizeStatusKey(row.all_status),
  status: allStatusLabelMap[normalizeStatusKey(row.all_status)] || row.all_status,
  uploadedAt: row.create_time.slice(0, 16),
  updatedAt: row.update_time.slice(0, 16),
  fileName: row.file_name,
  fileUrl: row.file_url,
  uploaderUsername: row.uploader_username,
  uploaderName: row.uploader_name,
  isPublic: row.is_public,
  pageindexStatus: row.pageindex_status,
  documentId: row.document_id,
  pageindexDocId: row.pageindex_doc_id,
  errorMsg: row.error_msg,
}))
