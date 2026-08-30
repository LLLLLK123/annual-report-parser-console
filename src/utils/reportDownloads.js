import JSZip from 'jszip'
import * as XLSX from 'xlsx'

export const reportDownloadItems = [
  { key: 'zip', label: '下载全部 ZIP' },
  { key: 'xlsx', label: '结构化结果.xlsx' },
  { key: 'markdown', label: '全部表格.md' },
  { key: 'json', label: '全部解析数据.json' },
  { key: 'pdf', label: '原始报告.pdf' },
]

const cleanFileName = (value) => String(value || '报告').replace(/[\\/:*?"<>|]/g, '_').trim()
const reportPeriod = (record) => record?.reportPeriod || record?.quarter || record?.latestReportPeriod || '报告'
const reportBaseName = (record) => cleanFileName(`${record?.companyName || record?.company || '报告'}_${reportPeriod(record)}`)
const rawTablesOf = (context) => context.rawTables?.length ? context.rawTables : context.record?.rawTables || []
const targetTablesOf = (context) => context.record?.targetTables || []

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const normalizeStructuredRows = (context) => targetTablesOf(context).flatMap((table) => {
  const rows = table.structured?.rows || table.structuredRows || table.rows || []
  return rows.map((row) => ({
    targetName: table.name || table.title || '',
    targetCode: table.code || table.targetCode || table.table_code || '',
    fieldName: row.fieldName || row.label || row.name || row.item || row.report_item_name || '',
    fieldCode: row.fieldCode || row.code || row.metric_code || '',
    value: row.value ?? row.processed_value ?? row.raw_value ?? '',
    unit: row.unit || '',
  }))
})

const isMajorStatement = (row) => ['AN14', 'AN15', 'AN16'].includes(String(row.targetCode).toUpperCase()) ||
  /资产负债表|利润表|收益表|现金流量表/.test(row.targetName)

export const buildStructuredWorkbook = (context) => {
  const workbook = XLSX.utils.book_new()
  const rows = normalizeStructuredRows(context)
  const columns = (items) => items.map((row) => ({
    目标表: row.targetName,
    目标表编码: row.targetCode,
    字段名称: row.fieldName,
    字段编码: row.fieldCode,
    数值: row.value,
    单位: row.unit,
  }))
  const major = columns(rows.filter(isMajorStatement))
  const notes = columns(rows.filter((row) => !isMajorStatement(row)))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(major.length ? major : [{ 说明: '暂无三大报表结构化结果' }]), '三大报表')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(notes.length ? notes : [{ 说明: '暂无财务附注结构化结果' }]), '财务附注')
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
}

export const buildAllTablesMarkdown = (context) => {
  const sections = rawTablesOf(context).map((table, index) => {
    const title = table.name || table.table_title || `表格 ${index + 1}`
    const location = table.location || table.node_path || '未标注章节'
    const page = table.pageRange || [table.page_start, table.page_end].filter(Boolean).join('-') || '-'
    const markdown = table.markdown || table.markdown_table || '暂无 Markdown 数据'
    return `## ${location}\n\n### ${title}\n\n- 页码：${page}\n- 目标表编码：${table.targetCode || table.table_code || '-'}\n\n${markdown}`
  })
  return `# ${context.record?.reportName || context.record?.fileName || '报告'}全部表格\n\n${sections.join('\n\n---\n\n')}`
}

export const buildCompleteReportData = (context) => ({
  basicInfo: {
    companyName: context.record?.companyName || context.record?.company || '',
    crmCode: context.record?.crmCode || '',
    reportName: context.record?.reportName || context.record?.fileName || '',
    reportType: context.record?.reportType || context.record?.type || '',
    year: context.record?.year || '',
    reportPeriod: reportPeriod(context.record),
    latestReportPeriod: context.record?.latestReportPeriod || '',
    publicScope: context.record?.scopeLabel || context.record?.scopeKey || '',
    parseStatus: context.record?.parseStatus || '',
    fetchedAt: context.record?.fetchedAt || '',
  },
  counts: {
    rawTableCount: context.record?.rawTableCount ?? rawTablesOf(context).length,
    targetTableCount: context.record?.targetTableCount ?? targetTablesOf(context).length,
    matchedTableCount: context.record?.matchedTableCount ?? targetTablesOf(context).filter((item) => item.structured?.rows?.length).length,
  },
  rawTables: rawTablesOf(context),
  targetTables: targetTablesOf(context),
  structuredResults: normalizeStructuredRows(context),
  fullResultNodes: context.fullResultNodes?.length ? context.fullResultNodes : context.record?.fullResultTree || [],
})

const fetchOriginalPdf = async (record) => {
  if (!record?.fileUrl) throw new Error('当前报告没有可用的原始 PDF 地址。')
  let response
  try {
    response = await fetch(String(record.fileUrl).split('#')[0])
  } catch {
    throw new Error('原始 PDF 下载失败，可能是文件地址跨域或已失效。')
  }
  if (!response.ok) throw new Error(`原始 PDF 下载失败（HTTP ${response.status}）。`)
  return response.blob()
}

export const buildReportZip = async (context) => {
  const zip = new JSZip()
  const baseName = reportBaseName(context.record)
  const [pdfBlob, workbook] = await Promise.all([
    fetchOriginalPdf(context.record),
    Promise.resolve(buildStructuredWorkbook(context)),
  ])
  zip.file(`${baseName}_结构化结果.xlsx`, workbook)
  zip.file(`${baseName}_全部表格.md`, buildAllTablesMarkdown(context))
  zip.file(`${baseName}_全部解析数据.json`, JSON.stringify(buildCompleteReportData(context), null, 2))
  zip.file(`${baseName}_原始报告.pdf`, pdfBlob)
  return zip.generateAsync({ type: 'blob' })
}

export const downloadReportAsset = async (type, context) => {
  const baseName = reportBaseName(context.record)
  if (type === 'zip') return saveBlob(await buildReportZip(context), `${baseName}_全部数据.zip`)
  if (type === 'xlsx') return saveBlob(new Blob([buildStructuredWorkbook(context)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${baseName}_结构化结果.xlsx`)
  if (type === 'markdown') return saveBlob(new Blob([buildAllTablesMarkdown(context)], { type: 'text/markdown;charset=utf-8' }), `${baseName}_全部表格.md`)
  if (type === 'json') return saveBlob(new Blob([JSON.stringify(buildCompleteReportData(context), null, 2)], { type: 'application/json;charset=utf-8' }), `${baseName}_全部解析数据.json`)
  if (type === 'pdf') return saveBlob(await fetchOriginalPdf(context.record), `${baseName}_原始报告.pdf`)
  throw new Error('不支持的下载类型。')
}
