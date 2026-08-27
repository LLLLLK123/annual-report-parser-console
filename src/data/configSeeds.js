import { financeAdpSubjectMappingRows, normalizedOcrExtractTaskRows } from './sourceTables'

const formatExamples = (value) => {
  if (!value) return ''
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return value
    return parsed
      .map((item) => {
        const title = item.title ? `标题：${item.title}` : ''
        const reason = item.reason ? `说明：${item.reason}` : ''
        return [title, reason].filter(Boolean).join('；')
      })
      .join('\n')
  } catch {
    return value
  }
}

export const configReportTypes = [
  { key: 'financial', title: '财务报告', subtitle: '目标表与目标字段规则主配置', tag: 'FINANCIAL' },
  { key: 'audit', title: '审计报告', subtitle: '审计正文与附注规则配置', tag: 'AUDIT' },
  { key: 'prospectus', title: '招股说明书', subtitle: '章节与核心字段识别配置', tag: 'PROSPECTUS' },
  { key: 'hk', title: '港股财务报告', subtitle: '港股口径与双语字段配置', tag: 'HK REPORT' },
]

const financialTargetTableConfigs = normalizedOcrExtractTaskRows.map((row) => ({
  id: row.id,
  bizTable: row.biz_table_desc,
  taskName: row.task_name,
  titleCode: row.task_name.includes('资产负债表')
    ? 'AN14'
    : row.task_name.includes('利润表')
      ? 'AN15'
      : row.task_name.includes('现金流量表')
        ? 'AN16'
        : row.task_name.includes('分行业')
          ? 'AN01_A'
          : row.task_name.includes('分产品')
            ? 'AN01_B'
            : row.task_name.includes('分地区')
              ? 'AN01_C'
              : '',
  sectionTitle: row.section_title || '财务报告正文',
  titleKeywords: row.title_keywords_display,
  contentKeywords: row.content_keywords_display,
  scope: ['年报', row.is_audit_report ? '审计报告' : '', row.is_prospectus ? '招股说明书' : ''].filter(Boolean).join(' / '),
  updatedAt: row.update_time.slice(0, 16),
  prompt: row.prompt,
  jsonSchema: row.json_schema,
  jsonExample: row.json_example,
  positiveExamples: formatExamples(row.positive_examples),
  negativeExamples: formatExamples(row.negative_examples),
  tableDefinition: row.table_definition,
}))

const financialTargetFieldConfigs = financeAdpSubjectMappingRows.map((row) => ({
  id: row.id,
  subjectCode: row.subject_code,
  adpSubject: row.adp_subject_name,
  targetSubject: row.target_subject_name,
  exposure: row.report_category,
  structTitle: row.struct_title_name,
  titleCode: row.ocr_title,
  ocrCode: row.ocr_code,
  keywordBag: row.items || row.adp_keywords,
  preCode: row.pre_code,
  preName: row.pre_name,
  postCode: row.post_code,
  postName: row.post_name,
  finalCode: row.code,
  prompt: `基于 ${row.struct_title_name} 中 ${row.ocr_code} 的识别结果，将 OCR 别名映射为 ${row.target_subject_name}。`,
}))

export const targetTableConfigSeed = {
  financial: financialTargetTableConfigs,
  audit: [],
  prospectus: [],
  hk: [],
}

export const targetFieldConfigSeed = {
  financial: financialTargetFieldConfigs,
  audit: [],
  prospectus: [],
  hk: [],
}
