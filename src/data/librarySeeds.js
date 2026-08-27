import {
  crawlerListRows,
  normalizedOcrExtractTaskRows,
  rawReportInformationRows,
  structured3MajorRows,
  structuredNotesRows,
  uploadReportInformationRows,
} from './sourceTables'
import { allStatusLabelMap } from './uploadSeeds'

const quarterLabelMap = {
  1: '一季报',
  2: '半年报',
  3: '三季报',
  4: '年报',
}

const typeLabelMap = {
  financial: '财务报告',
  audit: '审计报告',
  prospectus: '招股说明书',
  hk: '港股财务报告',
}

const quarterNameMap = {
  1: '第一季度报告',
  2: '半年度报告',
  3: '第三季度报告',
  4: '年度报告',
}

const fileTitleHintMap = {
  financial: ['合并资产负债表', '合并利润表', '合并现金流量表', '财务报表附注'],
  audit: ['审计意见', '关键审计事项', '财务报表审计范围', '附注审计说明'],
  prospectus: ['募集资金用途', '风险因素', '发行概况', '财务摘要'],
  hk: ['综合收益表', '综合资产负债表', '现金流量表', '财务附注'],
}

const fallbackNodeTemplates = {
  financial: [
    { name: '合并资产负债表', targetCode: 'AN14' },
    { name: '合并利润表', targetCode: 'AN15' },
    { name: '合并现金流量表', targetCode: 'AN16' },
    { name: '主营业务分析', targetCode: 'AN01_A' },
  ],
  audit: [
    { name: '审计意见', targetCode: null },
    { name: '关键审计事项', targetCode: null },
    { name: '形成意见的基础', targetCode: null },
  ],
  prospectus: [
    { name: '发行概况', targetCode: null },
    { name: '风险因素', targetCode: null },
    { name: '募集资金运用', targetCode: null },
  ],
  hk: [
    { name: '综合资产负债表', targetCode: 'AN14' },
    { name: '综合收益表', targetCode: 'AN15' },
    { name: '现金流量表', targetCode: 'AN16' },
  ],
}

const formatMarkdownTable = (markdown, fallbackTitle) => {
  if (!markdown) {
    return `| 项目 | 数值 |\n| --- | --- |\n| ${fallbackTitle || '暂无原始表格数据'} | - |`
  }

  return markdown
}

const buildFallbackRawTables = (typeKey, scopeKey, rowId) => {
  return (fallbackNodeTemplates[typeKey] || fallbackNodeTemplates.financial).map((item, index) => ({
    id: `${scopeKey}-${typeKey}-fallback-raw-${rowId}-${index}`,
    name: item.name,
    pageRange: `${88 + index * 4}-${91 + index * 4}`,
    location: `${typeLabelMap[typeKey]} / ${item.name}`,
    markdown: formatMarkdownTable('', item.name),
    targetCode: item.targetCode,
  }))
}

const buildFallbackTargetTables = (typeKey, scopeKey, rowId) => {
  return buildFallbackRawTables(typeKey, scopeKey, rowId)
    .filter((item) => item.targetCode)
    .map((item, index) => ({
      id: `${scopeKey}-${typeKey}-fallback-target-${rowId}-${index}`,
      code: item.targetCode,
      name: item.name,
      matchedData: `模拟命中 ${6 + index * 2} 个字段`,
      rawTableLocation: item.location,
      reportLocation: `PDF 第 ${item.pageRange.split('-')[0]} 页`,
      markdown: item.markdown,
      structured: buildStructuredRows(item.name, typeKey),
    }))
}

const buildReportName = (row, typeKey) => {
  const quarterName = quarterNameMap[row.report_quarter] || '年度报告'

  if (typeKey === 'audit') {
    return `${row.company_name}${row.report_year}年度审计报告.pdf`
  }

  if (typeKey === 'prospectus') {
    return `${row.company_name}招股说明书.pdf`
  }

  if (typeKey === 'hk') {
    return `${row.company_name}${row.report_year}${quarterName}-港股财务报告.pdf`
  }

  return `${row.company_name}${row.report_year}${quarterName}.pdf`
}

const realFinancialPdfUrl = 'https://file.finance.sina.com.cn/211.154.219.97:9494/MRGG/CNSESZ_STOCK/2021/2021-4/2021-04-15/7046535.PDF'

const realFinancialStructured3MajorRows = {
  AN14: [
    { label: '货币资金', value: '2,289,930,662.70', unit: '元', code: 'FS_BS_CurrencyFunds_idou' },
    { label: '交易性金融资产', value: '5,000,000.00', unit: '元', code: 'FS_BS_FinaAsseHeldForTrad_idou' },
    { label: '应收账款', value: '5,331,087,824.31', unit: '元', code: 'FS_BS_AccountsReceivable_idou' },
    { label: '应收款项融资', value: '4,093,505,526.04', unit: '元', code: 'FS_BS_ReceivablesFinancing_idou' },
    { label: '资产总计', value: '23,410,737,751.72', unit: '元', code: 'FS_BS_TotalAssets_idou' },
    { label: '负债合计', value: '17,048,994,131.84', unit: '元', code: 'FS_BS_TotalLiabilities_idou' },
    { label: '所有者权益合计', value: '6,361,743,619.88', unit: '元', code: 'FS_BS_TotalOwnersEquity_idou' },
  ],
  AN15: [
    { label: '营业总收入', value: '12,246,478,061.74', unit: '元', code: 'FS_IS_TotalOperatingRevenue' },
    { label: '营业总成本', value: '12,079,436,551.98', unit: '元', code: 'FS_IS_TotalOperatingCosts' },
    { label: '营业利润', value: '-843,380,640.40', unit: '元', code: 'FS_IS_OperatingProfit' },
    { label: '利润总额', value: '-815,892,924.06', unit: '元', code: 'FS_IS_TotalProfit' },
    { label: '净利润', value: '-792,038,510.96', unit: '元', code: 'FS_IS_NetProfit' },
  ],
  AN16: [
    { label: '经营活动产生的现金流量净额', value: '603,017,422.22', unit: '元', code: 'FS_CF_NetCashFlowsFromOperatingActivities' },
    { label: '投资活动产生的现金流量净额', value: '110,791,215.50', unit: '元', code: 'FS_CF_NetCashFlowsFromInvestingActivities' },
    { label: '筹资活动产生的现金流量净额', value: '-912,213,967.13', unit: '元', code: 'FS_CF_NetCashFlowsFromFinancingActivities' },
    { label: '期末现金及现金等价物余额', value: '1,409,214,922.24', unit: '元', code: 'FS_CF_EndingBalanceCashAndCashEquivalents' },
  ],
}

const realFinancialStructuredNotesRows = {
  AN01_A: [
    { label: '建筑及装饰工程业务收入', value: '12,185,058,596.37', unit: '元', code: 'AU_oper_M01' },
    { label: '收入占比', value: '99.50', unit: '%', code: 'AU_oper_P05' },
    { label: '同比变化', value: '-5.94', unit: '%', code: 'AU_oper_M01_P01' },
    { label: '工程金融', value: '43,262,862.23', unit: '元', code: 'AU_oper_M02' },
  ],
}

const buildRealStructuredResult = (code, name) => {
  const majorRows = realFinancialStructured3MajorRows[code]
  const noteRows = realFinancialStructuredNotesRows[code]
  const rows = majorRows || noteRows || []

  return {
    title: `${code} ${name}结构化结果`,
    rows,
  }
}

const realFinancialRawTables = [
  {
    id: 'real-17-raw-1',
    name: '合并资产负债表',
    pageRange: '89-94',
    location: '第十二节 财务报告 / 二、财务报表 / 合并资产负债表',
    targetCode: 'AN14',
    markdown: `| 项目 | 2020 年12 月31 日 | 2019 年12 月31 日 |
| --- | --- | --- |
| 货币资金 | 2,289,930,662.70 | 3,061,991,656.02 |
| 交易性金融资产 | 5,000,000.00 | 6,746,000.00 |
| 应收账款 | 5,331,087,824.31 | 12,272,492,050.89 |
| 应收款项融资 | 4,093,505,526.04 | - |
| 资产总计 | 23,410,737,751.72 | 24,444,193,026.03 |
| 负债合计 | 17,048,994,131.84 | 17,387,469,572.89 |
| 所有者权益合计 | 6,361,743,619.88 | 7,056,723,453.14 |`,
  },
  {
    id: 'real-17-raw-2',
    name: '合并利润表',
    pageRange: '95-98',
    location: '第十二节 财务报告 / 二、财务报表 / 合并利润表',
    targetCode: 'AN15',
    markdown: `| 项目 | 2020 年度 | 2019 年度 |
| --- | --- | --- |
| 一、营业总收入 | 12,246,478,061.74 | 13,046,256,284.52 |
| 二、营业总成本 | 12,079,436,551.98 | 12,369,593,092.85 |
| 三、营业利润 | -843,380,640.40 | 239,335,081.97 |
| 四、利润总额 | -815,892,924.06 | 219,316,718.30 |
| 五、净利润 | -792,038,510.96 | 132,599,656.70 |`,
  },
  {
    id: 'real-17-raw-3',
    name: '合并现金流量表',
    pageRange: '99-102',
    location: '第十二节 财务报告 / 二、财务报表 / 合并现金流量表',
    targetCode: 'AN16',
    markdown: `| 项目 | 2020 年度 | 2019 年度 |
| --- | --- | --- |
| 经营活动产生的现金流量净额 | 603,017,422.22 | -997,165,223.07 |
| 投资活动产生的现金流量净额 | 110,791,215.50 | -182,897,180.00 |
| 筹资活动产生的现金流量净额 | -912,213,967.13 | 722,467,556.89 |
| 期末现金及现金等价物余额 | 1,409,214,922.24 | 1,610,702,637.78 |`,
  },
  {
    id: 'real-17-raw-4',
    name: '主营业务分析',
    pageRange: '16-18',
    location: '第四节 经营情况讨论与分析 / 主营业务分析',
    targetCode: 'AN01_A',
    markdown: `| 项目 | 2020 | 2019 |
| --- | --- | --- |
| 建筑及建筑装饰业收入 | 12,185,058,596.37 | 12,953,938,212.45 |
| 收入占比 | 99.50% | 99.29% |
| 同比变化 | -5.94% | - |`,
  },
  {
    id: 'real-17-raw-5',
    name: '（一）建筑及装饰工程业务的收入确认',
    pageRange: '85-88',
    location: '第十二节 财务报告 / 一、审计报告 / 关键审计事项',
    markdown: `| 关键审计事项 | 在审计中如何应对该事项 |
| --- | --- |
| 建筑及装饰工程业务收入确认 | 测试和评价收入确认相关内控；选取合同样本检查预算总成本及完工进度；现场核查项目形象进度并与账面记录比较。 |`,
  },
]

const realFinancialTargetTables = [
  {
    id: 'real-17-target-1',
    code: 'AN14',
    name: '合并资产负债表',
    matchedData: '命中结构化主表字段',
    rawTableLocation: '第十二节 财务报告 / 二、财务报表',
    reportLocation: 'PDF 第 89-110 页',
    markdown: `| 项目 | 2020 年12 月31 日 | 2019 年12 月31 日 |
| --- | --- | --- |
| 货币资金 | 2,289,930,662.70 | 3,061,991,656.02 |
| 交易性金融资产 | 5,000,000.00 | 6,746,000.00 |
| 应收账款 | 5,331,087,824.31 | 12,272,492,050.89 |
| 应收款项融资 | 4,093,505,526.04 |  |
| 资产总计 | 23,410,737,751.72 | 24,444,193,026.03 |
| 负债合计 | 17,048,994,131.84 | 17,387,469,572.89 |
| 所有者权益合计 | 6,361,743,619.88 | 7,056,723,453.14 |`,
    structured: buildRealStructuredResult('AN14', '合并资产负债表'),
  },
  {
    id: 'real-17-target-2',
    code: 'AN15',
    name: '合并利润表',
    matchedData: '命中结构化主表字段',
    rawTableLocation: '第十二节 财务报告 / 二、财务报表',
    reportLocation: 'PDF 第 89-110 页',
    markdown: `| 项目 | 2020 年度 | 2019 年度 |
| --- | --- | --- |
| 一、营业总收入 | 12,246,478,061.74 | 13,046,256,284.52 |
| 二、营业总成本 | 12,079,436,551.98 | 12,369,593,092.85 |
| 三、营业利润 | -843,380,640.40 | 239,335,081.97 |
| 五、净利润 | -792,038,510.96 | 132,599,656.70 |`,
    structured: buildRealStructuredResult('AN15', '合并利润表'),
  },
  {
    id: 'real-17-target-3',
    code: 'AN16',
    name: '合并现金流量表',
    matchedData: '命中结构化主表字段',
    rawTableLocation: '第十二节 财务报告 / 二、财务报表',
    reportLocation: 'PDF 第 89-110 页',
    markdown: `| 项目 | 2020 年度 | 2019 年度 |
| --- | --- | --- |
| 经营活动产生的现金流量净额 | 603,017,422.22 | -997,165,223.07 |
| 投资活动产生的现金流量净额 | 110,791,215.50 | -182,897,180.00 |
| 筹资活动产生的现金流量净额 | -912,213,967.13 | 722,467,556.89 |
| 期末现金及现金等价物余额 | 1,409,214,922.24 | 1,610,702,637.78 |`,
    structured: buildRealStructuredResult('AN16', '合并现金流量表'),
  },
  {
    id: 'real-17-target-4',
    code: 'AN01_A',
    name: '主营业务分析',
    matchedData: '命中附注与经营分析字段',
    rawTableLocation: '第四节 经营情况讨论与分析',
    reportLocation: 'PDF 第 16-33 页',
    markdown: `| 项目 | 2020 | 2019 |
| --- | --- | --- |
| 建筑及建筑装饰业收入 | 12,185,058,596.37 | 12,953,938,212.45 |
| 收入占比 | 99.50% | 99.29% |
| 同比变化 | -5.94% | - |`,
    structured: buildRealStructuredResult('AN01_A', '主营业务分析'),
  },
]

const realFinancialFullResultTree = [
  {
    id: 'real-tree-1',
    title: '第一节 重要提示、目录和释义',
    pageRange: '1-8',
    location: '第一节 重要提示、目录和释义',
    type: 'text',
    markdown: `# 第一节 重要提示、目录和释义

本节包含年报整体说明、风险提示、目录结构与术语释义，可用于演示完整目录树中的文字节点。

## 重要提示

公司董事会、监事会及董事、监事、高级管理人员保证年度报告内容真实、准确、完整，不存在虚假记载、误导性陈述或者重大遗漏。

## 目录概览

1. 重要提示、目录和释义
2. 公司简介和主要财务指标
3. 董事会报告
4. 经营情况讨论与分析
5. 财务报告`,
  },
  {
    id: 'real-tree-2',
    title: '第四节 经营情况讨论与分析',
    pageRange: '16-33',
    location: '第四节 经营情况讨论与分析',
    type: 'section',
    markdown: `# 第四节 经营情况讨论与分析

本章节主要覆盖主营业务、收入结构、区域市场、项目执行以及未来经营计划。

## 经营概览

报告期内公司围绕建筑装饰工程主业，持续推进重点项目交付、存量应收管理和现金流优化，同时加强对重点区域市场的资源配置。`,
    children: [
      {
        id: 'real-tree-2-1',
        title: '主营业务分析',
        pageRange: '16-18',
        location: '第四节 经营情况讨论与分析 / 主营业务分析',
        type: 'table',
        markdown: realFinancialRawTables[3].markdown,
        targetCode: 'AN01_A',
      },
      {
        id: 'real-tree-2-2',
        title: '行业情况说明',
        pageRange: '19-21',
        location: '第四节 经营情况讨论与分析 / 行业情况说明',
        type: 'text',
        markdown: `## 行业情况说明

报告期内公司继续聚焦建筑装饰工程主业，并围绕重点客户、重点区域推进项目执行与回款管理。

### 市场环境

建筑装饰行业整体竞争加剧，项目获取、履约效率、回款周期和精细化成本管理成为影响业绩表现的关键因素。

### 公司应对

- 强化重点客户深耕
- 优化项目过程管控
- 推进区域协同与组织提效
- 加强风险识别与现金回收`,
      },
      {
        id: 'real-tree-2-3',
        title: '公司未来发展的展望',
        pageRange: '28-30',
        location: '第四节 经营情况讨论与分析 / 公司未来发展的展望',
        type: 'text',
        markdown: `## 公司未来发展的展望

公司未来将继续围绕主业聚焦、现金流改善、项目质量提升和重点客户协同四条主线推进经营管理。

### 重点方向

1. 聚焦高质量项目获取
2. 提升履约效率与交付能力
3. 强化预算、结算与回款联动
4. 推动核心区域和核心客户协同经营`,
      },
    ],
  },
  {
    id: 'real-tree-3',
    title: '第十二节 财务报告',
    pageRange: '85-110',
    location: '第十二节 财务报告',
    type: 'section',
    markdown: `# 第十二节 财务报告

本章节包含审计报告、合并三大报表以及财务报表附注，是结构化抽取的核心来源。`,
    children: [
      {
        id: 'real-tree-3-1',
        title: '一、审计报告',
        pageRange: '85-88',
        location: '第十二节 财务报告 / 一、审计报告',
        type: 'section',
        markdown: `## 一、审计报告

审计报告部分包括审计意见、形成意见的基础、关键审计事项以及管理层责任说明。

注册会计师重点关注收入确认、合同履约进度、应收账款减值以及重大项目结算等事项。`,
        children: [
          {
            id: 'real-tree-3-1-1',
            title: '关键审计事项',
            pageRange: '85-88',
            location: '第十二节 财务报告 / 一、审计报告 / 关键审计事项',
            type: 'table',
            markdown: realFinancialRawTables[4].markdown,
          },
          {
            id: 'real-tree-3-1-2',
            title: '管理层和治理层对财务报表的责任',
            pageRange: '87-88',
            location: '第十二节 财务报告 / 一、审计报告 / 管理层和治理层对财务报表的责任',
            type: 'text',
            markdown: `### 管理层和治理层对财务报表的责任

管理层负责按照企业会计准则编制财务报表，并设计、执行和维护必要的内部控制，以使财务报表不存在由于舞弊或错误导致的重大错报。`,
          },
        ],
      },
      {
        id: 'real-tree-3-2',
        title: '二、财务报表',
        pageRange: '89-102',
        location: '第十二节 财务报告 / 二、财务报表',
        type: 'section',
        markdown: `## 二、财务报表

财务报表部分包含合并资产负债表、合并利润表和合并现金流量表。

该部分是结构化提取的核心来源，涵盖三表主表字段以及附注、经营分析等延展表。`,
        children: [
          {
            id: 'real-tree-3-2-1',
            title: '合并资产负债表',
            pageRange: '89-94',
            location: '第十二节 财务报告 / 二、财务报表 / 合并资产负债表',
            type: 'table',
            markdown: realFinancialRawTables[0].markdown,
            targetCode: 'AN14',
          },
          {
            id: 'real-tree-3-2-2',
            title: '合并利润表',
            pageRange: '95-98',
            location: '第十二节 财务报告 / 二、财务报表 / 合并利润表',
            type: 'table',
            markdown: realFinancialRawTables[1].markdown,
            targetCode: 'AN15',
          },
          {
            id: 'real-tree-3-2-3',
            title: '合并现金流量表',
            pageRange: '99-102',
            location: '第十二节 财务报告 / 二、财务报表 / 合并现金流量表',
            type: 'table',
            markdown: realFinancialRawTables[2].markdown,
            targetCode: 'AN16',
          },
          {
            id: 'real-tree-3-2-4',
            title: '财务报表附注',
            pageRange: '103-110',
            location: '第十二节 财务报告 / 二、财务报表 / 财务报表附注',
            type: 'text',
            markdown: `### 财务报表附注

财务报表附注对会计政策、重要会计估计、主要科目变动原因、关联交易、承诺事项及或有事项等进行了补充说明。

该部分通常与主表一起构成完整的结构化抽取链路。`,
          },
        ],
      },
    ],
  },
]

const realFinancialCase = {
  id: 'public-financial-real-17',
  reportName: '深圳广田集团股份有限公司2020年年度报告.pdf',
  crmCode: 'IB001193',
  year: '2020',
  quarter: '年报',
  reportType: '财务报告',
  latestPeriod: '2020年报',
  fetchedAt: '2026-08-20 18:39',
  parseStatus: '已完成',
  companyName: '深圳广田集团股份有限公司',
  latestReportPeriod: '2020年报',
  allReportPeriods: ['2020年报', '2019年报'],
  rawTableCount: 207,
  targetTableCount: 36,
  matchedTableCount: 36,
  fileUrl: realFinancialPdfUrl,
  pdfPreview: {
    fileName: '深圳广田集团股份有限公司2020年年度报告.pdf',
    pageHint: '当前定位：PDF 第 89-110 页',
    sectionPath: '第十二节 财务报告 > 二、财务报表',
    note: '已接入真实 PDF URL；后续可直接替换为真实 PDF 在线预览组件。',
  },
  rawTables: realFinancialRawTables,
  targetTables: realFinancialTargetTables,
  fullResultTree: realFinancialFullResultTree,
  reportTreePreview: ['第十二节 财务报告', '一、审计报告', '二、财务报表', '第四节 经营情况讨论与分析'],
  reportTreeDataPreview: ['AN14 合并资产负债表', 'AN15 合并利润表', 'AN16 合并现金流量表', 'AN01_A 主营业务分析'],
}

const buildStructuredRows = (tableName, typeKey) => {
  const majorRows = structured3MajorRows.slice(0, 4).map((item) => ({
    label: item.report_item_name,
    value: item.processed_value || item.raw_value || '--',
    unit: item.unit || '',
    code: item.metric_code || '--',
  }))

  const noteRows = structuredNotesRows.slice(0, 2).map((item) => ({
    label: item.item,
    value: item.value || '--',
    unit: item.unit || '',
    code: item.code || '--',
  }))

  return {
    title: `${typeLabelMap[typeKey]} · ${tableName}结构化结果`,
    rows: [...majorRows, ...noteRows],
  }
}

const buildTreePreview = (typeKey) => {
  if (typeKey === 'audit') {
    return {
      directory: ['审计意见', '形成意见的基础', '关键审计事项', '管理层责任'],
      data: ['段落节点', '页码定位', '审计正文命中', '附注引用关系'],
    }
  }

  if (typeKey === 'prospectus') {
    return {
      directory: ['发行概况', '风险因素', '募集资金运用', '财务会计信息'],
      data: ['章节目录', '标题链路', '关键字段定位', '原文上下文提取'],
    }
  }

  if (typeKey === 'hk') {
    return {
      directory: ['综合财务报表', '附注', '管理层讨论', '公司治理'],
      data: ['中英文字段定位', '页码映射', '表格识别节点', '双语标题关系'],
    }
  }

  return {
    directory: ['董事会报告', '财务报表', '合并资产负债表', '附注'],
    data: ['节点层级', '标题链路', '页码定位', '原始报告窗口联动'],
  }
}

const buildFullResultTree = (typeKey, rawTables = []) => {
  const textIntroMap = {
    financial: '完整目录树包含经营分析、审计报告、财务报表与附注等章节，可同时承载文字节点与表格节点。',
    audit: '完整目录树包含审计意见、关键审计事项、形成意见基础和管理层责任等文字节点。',
    prospectus: '完整目录树包含发行概况、风险因素、募集资金用途、财务摘要等章节节点。',
    hk: '完整目录树包含综合财务报表、附注、管理层讨论与公司治理等章节节点。',
  }

  const sectionTitleMap = {
    financial: '财务报告',
    audit: '审计报告正文',
    prospectus: '招股说明书正文',
    hk: '港股财务报告正文',
  }

  return [
    {
      id: `${typeKey}-tree-preface`,
      title: '目录概览',
      pageRange: '1-3',
      location: `目录概览 / ${sectionTitleMap[typeKey] || '正文'}`,
      type: 'text',
      markdown: `# 目录概览

${textIntroMap[typeKey] || '当前目录树用于演示全量解析结果的章节结构。'}`
    },
    {
      id: `${typeKey}-tree-main`,
      title: sectionTitleMap[typeKey] || '正文',
      pageRange: rawTables[0]?.pageRange || '80-120',
      location: sectionTitleMap[typeKey] || '正文',
      type: 'section',
      markdown: `# ${sectionTitleMap[typeKey] || '正文'}

当前章节下包含若干文字节点与表格节点，支持目录树、Markdown/JSON 与 PDF 联动。`,
      children: rawTables.map((table, index) => ({
        id: `${typeKey}-tree-node-${index + 1}`,
        title: table.name,
        pageRange: table.pageRange || '--',
        location: table.location || table.name,
        type: index % 3 === 0 ? 'table' : 'text',
        targetCode: table.targetCode || null,
        markdown:
          index % 3 === 0
            ? table.markdown
            : `## ${table.name}

当前为 ${table.name} 对应的文字节点演示内容，用于模拟 PageIndex 全量目录树中的普通正文节点。

定位：${table.location || '--'}
页码：${table.pageRange || '--'}`,
      })),
    },
  ]
}

const createLibraryRows = (rows, typeKey, scopeKey) => {
  const matchedRows = rows.filter((row) => row.report_type === typeKey)
  const sourceRows = matchedRows.length ? matchedRows : rows

  return sourceRows.slice(0, 8).map((row, index) => {
    const titleHints = fileTitleHintMap[typeKey]
    const rawSlice = rawReportInformationRows.slice(index, index + 4)
    const targetSlice = uploadReportInformationRows.slice(index, index + 4)
    const treePreview = buildTreePreview(typeKey)
    const rawTables = rawSlice.length
      ? rawSlice.map((item, rawIndex) => {
          const fallbackTitle = titleHints[rawIndex % titleHints.length]
          return {
            id: `${scopeKey}-${typeKey}-raw-${item.id}-${rawIndex}`,
            name: item.table_title || item.node_title || fallbackTitle,
            pageRange: `${item.page_start || 1}-${item.page_end || item.page_start || 1}`,
            location: item.node_path || `${typeLabelMap[typeKey]} > ${fallbackTitle}`,
            markdown: formatMarkdownTable(item.markdown_table, fallbackTitle),
            targetCode: ['AN14', 'AN15', 'AN16', 'AN01_A'][rawIndex] || null,
          }
        })
      : buildFallbackRawTables(typeKey, scopeKey, row.id)
    const targetTables = targetSlice.length
      ? targetSlice.map((item, targetIndex) => {
          const fallbackTitle = titleHints[targetIndex % titleHints.length]
          const tableName = item.table_title || item.node_title || fallbackTitle
          return {
            id: `${scopeKey}-${typeKey}-target-${item.id}-${targetIndex}`,
            code: item.table_code || ['AN14', 'AN15', 'AN16', 'AN01_A'][targetIndex] || null,
            name: tableName,
            matchedData: `${(targetIndex + 2) * 5} 个命中字段`,
            rawTableLocation: item.node_path || `${typeLabelMap[typeKey]} > ${tableName}`,
            reportLocation: `PDF 第 ${item.page_start || 1} 页`,
            markdown: formatMarkdownTable(item.markdown_table, tableName),
            structured: buildStructuredRows(tableName, typeKey),
          }
        })
      : buildFallbackTargetTables(typeKey, scopeKey, row.id)

    return {
      id: `${scopeKey}-${typeKey}-${row.id}`,
      uploaderUsername: row.uploader_username || '',
      fileUrl: row.file_url || '',
      reportName: buildReportName(row, typeKey),
      crmCode: row.crmcode,
      year: String(row.report_year),
      quarter: quarterLabelMap[row.report_quarter] || '',
      reportType: typeLabelMap[typeKey],
      latestPeriod: `${row.report_year}${quarterLabelMap[row.report_quarter] || ''}`,
      fetchedAt: row.create_time.slice(0, 16),
      parseStatus: allStatusLabelMap[row.all_status] || row.all_status,
      companyName: row.company_name,
      latestReportPeriod: `${row.report_year}${quarterLabelMap[row.report_quarter] || ''}`,
      allReportPeriods: [
        `${row.report_year}${quarterLabelMap[row.report_quarter] || ''}`,
        `${row.report_year - 1}年报`,
      ],
      rawTableCount: 208 + index * 12 + (typeKey === 'financial' ? 20 : 0),
      targetTableCount: Math.max(16, normalizedOcrExtractTaskRows.length - (index % 4) * 3),
      matchedTableCount: 10 + (index % 5) * 2,
      pdfPreview: {
        fileName: buildReportName(row, typeKey),
        pageHint: `当前定位：PDF 第 ${80 + index * 9} 页`,
        sectionPath: `${typeLabelMap[typeKey]} > ${titleHints[index % titleHints.length]}`,
        note: row.file_url?.startsWith('http')
          ? '当前已接入真实 PDF 链接，可直接用于演示原文预览与页码定位。'
          : '这里后续可替换为真实 PDF 预览组件；当前先预留原文窗口和定位信息。',
      },
      rawTables,
      targetTables,
      fullResultTree: buildFullResultTree(typeKey, rawTables),
      reportTreePreview: treePreview.directory,
      reportTreeDataPreview: treePreview.data,
    }
  })
}

export const libraryScopes = [
  { key: 'public', label: '公众报告' },
  { key: 'private', label: '非公众报告' },
]

export const publicLibraryTypes = [
  { key: 'financial', label: '财务报告' },
  { key: 'audit', label: '审计报告' },
  { key: 'prospectus', label: '招股说明书' },
  { key: 'hk', label: '港股财务报告' },
]

export const libraryCollectionMap = {
  public: {
    financial: [
      realFinancialCase,
      ...createLibraryRows(
        crawlerListRows.filter((row) => row.is_public === 1 && row.crmcode !== 'IB001193'),
        'financial',
        'public',
      ),
    ],
    audit: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 1),
      'audit',
      'public',
    ),
    prospectus: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 1),
      'prospectus',
      'public',
    ),
    hk: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 1),
      'hk',
      'public',
    ),
  },
  private: {
    financial: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 2),
      'financial',
      'private',
    ),
    audit: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 2),
      'audit',
      'private',
    ),
    prospectus: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 2),
      'prospectus',
      'private',
    ),
    hk: createLibraryRows(
      crawlerListRows.filter((row) => row.is_public === 2),
      'hk',
      'private',
    ),
  },
}

export const getLibraryTypeLabel = (key) => typeLabelMap[key] || key
