<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { reportTypeLabelMap } from '../data/uploadSeeds'
import {
  rawReportInformationRows,
  structured3MajorRows,
  structuredNotesRows,
  uploadReportInformationRows,
} from '../data/sourceTables'
import ReportDownloadMenu from './ReportDownloadMenu.vue'

const props = defineProps({
  show: { type: Boolean, default: true },
  record: { type: Object, default: null },
})

const emit = defineEmits(['close', 'back'])

const selectedNodeId = ref(null)
const selectedTargetCatalogId = ref(null)
const nodeKeyword = ref('')
const targetOnly = ref(false)
const expandedTableSectionIds = ref([])
const showPdfDrawer = ref(false)
const detailView = ref('full')
const fullViewMode = ref('markdown')
const selectedFullNodeId = ref(null)
const expandedFullNodeIds = ref([])
const resultColumnWidths = ref({
  table: { first: 320, second: 620 },
  full: { first: 320, second: 620 },
})
let activeResizeCleanup = null

const resultGridStyle = computed(() => {
  const widths = resultColumnWidths.value[detailView.value]
  return {
    '--first-column-width': `${widths.first}px`,
    '--second-column-width': `${widths.second}px`,
  }
})

const startColumnResize = (event, dividerIndex) => {
  event.preventDefault()
  const grid = event.currentTarget.parentElement
  const gridRect = grid.getBoundingClientRect()
  const view = detailView.value

  const onPointerMove = (moveEvent) => {
    const widths = resultColumnWidths.value[view]
    const pointerX = moveEvent.clientX - gridRect.left

    if (dividerIndex === 1) {
      const maxFirst = Math.min(520, gridRect.width - widths.second - 380)
      widths.first = Math.min(maxFirst, Math.max(260, pointerX))
      return
    }

    const maxSecond = gridRect.width - widths.first - 380
    widths.second = Math.min(maxSecond, Math.max(360, pointerX - widths.first - 18))
  }
  const stopResize = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopResize)
    activeResizeCleanup = null
  }

  activeResizeCleanup?.()
  activeResizeCleanup = stopResize
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopResize)
}

onBeforeUnmount(() => activeResizeCleanup?.())

const parseMarkdownTable = (markdown) => {
  if (!markdown) return { headers: [], rows: [] }

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))

  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line) =>
    line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, index, array) => !(index === 0 || index === array.length - 1))

  return {
    headers: parseRow(lines[0]),
    rows: lines.slice(2).map(parseRow).filter((row) => row.length),
  }
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

// 目标表模式使用固定业务清单，不能根据当前报告的命中结果删减项目。
const targetTableCatalog = [
  '合并资产负债表', '合并利润表', '合并现金流量表',
  '营业收入构成-分行业', '营业收入构成-分产品', '营业收入构成-分地区', '营业收入构成-分销售模式',
  '占公司营业收入或营业利润10%以上情况-分行业', '占公司营业收入或营业利润10%以上情况-分产品',
  '占公司营业收入或营业利润10%以上情况-分地区', '占公司营业收入或营业利润10%以上情况-分销售模式',
  '营业收入与营业成本', '主要境外资产情况', '公司主要销售客户情况', '公司前5大客户资料',
  '公司主要供应商情况', '公司前5名供应商资料', '主要子公司及对公司净利润影响达10%以上的参股公司情况',
  '按欠款方归集的期末余额前五名的应收账款情况', '按预付对象归集的期末余额前五名的预付款情况',
  '按欠款方归集的期末余额前五名的其他应收款情况', '存货分类', '账龄超过1年的重要应付账款',
  '账龄超过1年的重要预收款项', '账龄超过1年的重要其他应付款', '本企业合营和联营企业情况',
  '其他关联方情况', '应收账款-分类披露', '应收账款按账龄披露', '应收账款按组合计提坏账准备',
  '应收账款-按单项计提坏账准备', '主营业务情况-分行业', '主营业务情况-分产品',
  '主营业务情况-分地区', '主营业务情况-分模式', '营业收入与营业成本', '主营业务情况-分行业',
  '主营业务情况-分产品', '主营业务情况-分地区', '主营业务情况-分模式',
  '母公司资产负债表', '母公司利润表', '母公司现金流量表',
]

const targetCodeByName = {
  '合并资产负债表': 'AN14',
  '合并利润表': 'AN15',
  '合并现金流量表': 'AN16',
  '营业收入构成-分行业': 'AN01_A',
  '营业收入构成-分产品': 'AN01_B',
  '营业收入构成-分地区': 'AN01_C',
  '营业收入构成-分销售模式': 'AN01_D',
  '占公司营业收入或营业利润10%以上情况-分行业': 'AN02_A',
  '占公司营业收入或营业利润10%以上情况-分产品': 'AN02_B',
  '占公司营业收入或营业利润10%以上情况-分地区': 'AN02_C',
  '占公司营业收入或营业利润10%以上情况-分销售模式': 'AN02_D',
  '营业收入与营业成本': 'AN03',
  '主要境外资产情况': 'AN04',
  '公司主要销售客户情况': 'AN05_A',
  '公司前5大客户资料': 'AN05_B',
  '公司主要供应商情况': 'AN06_A',
  '公司前5名供应商资料': 'AN06_B',
  '主要子公司及对公司净利润影响达10%以上的参股公司情况': 'AN07',
  '按欠款方归集的期末余额前五名的应收账款情况': 'AN08_A',
  '按预付对象归集的期末余额前五名的预付款情况': 'AN08_B',
  '按欠款方归集的期末余额前五名的其他应收款情况': 'AN08_C',
  '存货分类': 'AN09',
  '账龄超过1年的重要应付账款': 'AN10_A',
  '账龄超过1年的重要预收款项': 'AN10_B',
  '账龄超过1年的重要其他应付款': 'AN10_C',
  '本企业合营和联营企业情况': 'AN11_A',
  '其他关联方情况': 'AN11_B',
  '应收账款-分类披露': 'AN12_A',
  '应收账款按账龄披露': 'AN12_B',
  '应收账款按组合计提坏账准备': 'AN12_C',
  '应收账款-按单项计提坏账准备': 'AN12_D',
  '主营业务情况-分行业': 'AN13_A',
  '主营业务情况-分产品': 'AN13_B',
  '主营业务情况-分地区': 'AN13_C',
  '主营业务情况-分模式': 'AN13_D',
  '母公司资产负债表': 'AN14_M',
  '母公司利润表': 'AN15_M',
  '母公司现金流量表': 'AN16_M',
}

const normalizeTargetName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_－—–-]/g, '')
  .replace(/[（）()：:，,、]/g, '')

const inferTargetCode = (name, existingCode) => {
  if (existingCode) return existingCode

  const normalizedName = normalizeTargetName(name)
  if (!normalizedName) return null

  const matchedEntry = Object.entries(targetCodeByName).find(([targetName]) => {
    const normalizedTargetName = normalizeTargetName(targetName)
    return normalizedTargetName && (
      normalizedName === normalizedTargetName ||
      normalizedName.includes(normalizedTargetName) ||
      normalizedTargetName.includes(normalizedName)
    )
  })

  return matchedEntry?.[1] || null
}

const buildFallbackMarkdown = (name) => {
  if (name.includes('资产负债表')) {
    return `| 项目 | 本期 | 上期 |
| --- | --- | --- |
| 货币资金 | -- | -- |
| 应收账款 | -- | -- |
| 资产总计 | -- | -- |`
  }

  if (name.includes('利润表') || name.includes('收益表')) {
    return `| 项目 | 本期 | 上期 |
| --- | --- | --- |
| 营业收入 | -- | -- |
| 营业成本 | -- | -- |
| 净利润 | -- | -- |`
  }

  if (name.includes('现金流量表')) {
    return `| 项目 | 本期 | 上期 |
| --- | --- | --- |
| 经营活动现金流量净额 | -- | -- |
| 投资活动现金流量净额 | -- | -- |
| 筹资活动现金流量净额 | -- | -- |`
  }

  if (name.includes('主营业务分析')) {
    return `| 项目 | 本期 | 上期 |
| --- | --- | --- |
| 主营业务收入 | -- | -- |
| 收入占比 | -- | -- |
| 同比变化 | -- | -- |`
  }

  return `| 字段 | 内容 |
| --- | --- |
| 当前节点 | ${name} |
| 状态 | 暂无真实表格数据 |`
}

const detailNodes = computed(() => {
  if (!props.record) return []

  if (props.record.rawTables?.length) {
    return props.record.rawTables.map((item, index) => {
      const nodeName = item.name || item.table_title || `表格 ${index + 1}`
      return {
        id: item.id || `${props.record.id}-raw-${index}`,
        name: nodeName,
        pageRange: item.pageRange || `${item.page_start || 1}-${item.page_end || item.page_start || 1}`,
        location: item.location || item.node_path || 'PageIndex 节点',
        markdown: item.markdown || item.markdown_table || buildFallbackMarkdown(nodeName),
        targetCode: inferTargetCode(nodeName, item.targetCode || item.table_code),
      }
    })
  }

  const uploadMatches = uploadReportInformationRows.filter(
    (item) => item.file_id === props.record.pageindexDocId,
  )
  const rawMatches = rawReportInformationRows.filter(
    (item) =>
      item.file_id === props.record.pageindexDocId ||
      String(item.file_id) === String(props.record.documentId || ''),
  )

  const merged = [...uploadMatches, ...rawMatches]
  if (merged.length) {
    return merged.map((item, index) => {
      const nodeName = item.table_title || item.node_title || `Node ${index + 1}`
      return {
        id: `${props.record.id}-node-${item.id}-${index}`,
        name: nodeName,
        pageRange: `${item.page_start || 1}-${item.page_end || item.page_start || 1}`,
        location: item.node_path || 'PageIndex 节点',
        markdown: item.markdown_table || buildFallbackMarkdown(nodeName),
        targetCode: inferTargetCode(nodeName, item.table_code),
      }
    })
  }

  const typeKey = props.record.typeKey || 'financial'
  return (fallbackNodeTemplates[typeKey] || fallbackNodeTemplates.financial).map((item, index) => ({
    id: `${props.record.id}-fallback-${index}`,
    name: item.name,
    pageRange: `${88 + index * 4}-${91 + index * 4}`,
    location: `${reportTypeLabelMap[typeKey] || props.record.type} / ${item.name}`,
    markdown: buildFallbackMarkdown(item.name),
    targetCode: inferTargetCode(item.name, item.targetCode),
  }))
})

const targetCatalogRows = computed(() => {
  const recordTargets = props.record?.targetTables || []

  return targetTableCatalog.map((name, index) => {
    const normalizedName = normalizeTargetName(name)
    const expectedCode = targetCodeByName[name]
    const matchedNode = detailNodes.value.find((node) => {
      const normalizedNodeName = normalizeTargetName(node.name)
      return (expectedCode && node.targetCode === expectedCode) ||
        (normalizedNodeName && (
          normalizedNodeName === normalizedName ||
          normalizedNodeName.includes(normalizedName) ||
          normalizedName.includes(normalizedNodeName)
        ))
    })
    const matchedTarget = recordTargets.find((target) => {
      const normalizedTargetName = normalizeTargetName(target.name || target.tableName || target.task_name)
      return (expectedCode && target.code === expectedCode) ||
        (normalizedTargetName && (
          normalizedTargetName === normalizedName ||
          normalizedTargetName.includes(normalizedName) ||
          normalizedName.includes(normalizedTargetName)
        ))
    })

    return {
      id: `target-catalog-${index}`,
      name,
      code: expectedCode || matchedNode?.targetCode || matchedTarget?.code || null,
      exists: Boolean(matchedNode),
      nodeId: matchedNode?.id || null,
      target: matchedTarget || null,
    }
  })
})

const selectedTargetCatalogItem = computed(() =>
  targetCatalogRows.value.find((item) => item.id === selectedTargetCatalogId.value) || null,
)

const visibleTargetCatalogRows = computed(() => {
  const keyword = normalizeTargetName(nodeKeyword.value)
  return keyword
    ? targetCatalogRows.value.filter((item) => normalizeTargetName(item.name).includes(keyword))
    : targetCatalogRows.value
})

const matchedTargetNodeIds = computed(() => new Set(
  targetCatalogRows.value.filter((item) => item.exists && item.nodeId).map((item) => item.nodeId),
))

const selectedNode = computed(() => {
  const node = detailNodes.value.find((item) => item.id === selectedNodeId.value)
  if (node) return node

  if (targetOnly.value && selectedTargetCatalogItem.value) {
    const targetItem = selectedTargetCatalogItem.value
    return {
      id: targetItem.id,
      name: targetItem.name,
      pageRange: targetItem.target?.pageRange || '--',
      location: targetItem.target?.rawTableLocation || '目标表清单',
      markdown: targetItem.target?.markdown || buildFallbackMarkdown(targetItem.name),
      targetCode: targetItem.code,
      isMissingTargetNode: !targetItem.nodeId,
    }
  }

  return filteredNodes.value[0] || null
})

const filteredNodes = computed(() => {
  const keyword = nodeKeyword.value.trim().toLowerCase()
  return detailNodes.value.filter((item) =>
    (!targetOnly.value || matchedTargetNodeIds.value.has(item.id)) &&
    (!keyword ||
    [item.name, item.location, item.targetCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))),
  )
})

const selectTargetCatalogItem = (item) => {
  selectedTargetCatalogId.value = item.id
  selectedNodeId.value = item.nodeId || null
}

const reportPeriod = computed(() => props.record?.reportPeriod || props.record?.quarter || '年报')
const latestReportPeriod = computed(() => props.record?.latestReportPeriod || `${props.record?.year || ''}${reportPeriod.value === '年报' ? 'FY' : reportPeriod.value === '半年报' ? 'H1' : reportPeriod.value === '一季报' ? 'Q1' : 'Q3'}`)
const pdfEmbedUrl = computed(() => {
  if (!props.record?.fileUrl) return ''

  const firstPage = Number.parseInt(
    String(selectedNode.value?.pageRange || '1').split('-')[0],
    10,
  )

  const page = Number.isNaN(firstPage) ? 1 : firstPage

  return `${props.record.fileUrl}#page=${page}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const currentTargetCode = computed(() => selectedTargetCatalogItem.value?.code || selectedNode.value?.targetCode || '')
const currentTargetName = computed(() => selectedTargetCatalogItem.value?.name || selectedNode.value?.name || '暂无目标表')

const detailRawTableCount = computed(() => props.record?.rawTables?.length || props.record?.rawTableCount || detailNodes.value.length)
const detailTargetTableCount = computed(() => targetCatalogRows.value.length)
const detailMatchedTableCount = computed(() => targetCatalogRows.value.filter((item) => item.exists).length)

const structuredRows = computed(() => {
  if (!props.record || !currentTargetCode.value) return []

  // 优先读取当前报告自身的目标表结构化结果
  const normalizedCurrentName = normalizeTargetName(currentTargetName.value)
  const recordTarget = props.record.targetTables?.find((item) => {
    const normalizedTargetName = normalizeTargetName(item.name || item.tableName || item.task_name)
    return item.code === currentTargetCode.value ||
      (normalizedTargetName && normalizedCurrentName && (
        normalizedTargetName === normalizedCurrentName ||
        normalizedTargetName.includes(normalizedCurrentName) ||
        normalizedCurrentName.includes(normalizedTargetName)
      ))
  })

  if (recordTarget?.structured?.rows?.length) {
    return recordTarget.structured.rows
  }

  // 找不到时，再回退到 sourceTables.js
  const majorRows = structured3MajorRows
    .filter(
      (item) =>
        item.crm_code === props.record.crmCode &&
        item.basic_year === Number(props.record.year) &&
        (selectedNode.value?.name || currentTargetName.value).includes(item.title),
    )
    .map((item) => ({
      label: item.report_item_name,
      value: item.processed_value || item.raw_value || '--',
      unit: item.unit || '--',
      code: item.metric_code || '--',
    }))

  if (majorRows.length) return majorRows

  const noteRows = structuredNotesRows
    .filter(
      (item) =>
        item.crm_code === props.record.crmCode &&
        item.basic_year === Number(props.record.year) &&
        item.title === currentTargetCode.value,
    )
    .map((item) => ({
      label: item.item,
      value: item.value || '--',
      unit: item.unit || '--',
      code: item.code || '--',
    }))

  if (noteRows.length) return noteRows

  if (parsedNodeTable.value.rows.length) {
    const headers = parsedNodeTable.value.headers
    const valueIndex = headers.length > 1 ? 1 : 0
    return parsedNodeTable.value.rows.slice(0, 12).map((row, index) => ({
      label: row[0] || `字段 ${index + 1}`,
      value: row[valueIndex] || '--',
      unit: '--',
      code: `${currentTargetCode.value}_${String(index + 1).padStart(2, '0')}`,
    }))
  }

  return []
})

const parsedNodeTable = computed(() => parseMarkdownTable(selectedNode.value?.markdown || ''))

const fullResultNodes = computed(() => {
  const sourceTree = props.record?.fullResultTree?.length
    ? props.record.fullResultTree
    : [{
        id: `${props.record?.id}-full-root`,
        title: props.record?.reportType || props.record?.type || '报告正文',
        pageRange: '1',
        location: props.record?.fileName || props.record?.reportName || '报告正文',
        type: 'section',
        markdown: `# ${props.record?.fileName || props.record?.reportName || '报告正文'}`,
        children: detailNodes.value.map((node) => ({
          id: `${node.id}-full`,
          title: node.name,
          pageRange: node.pageRange,
          location: node.location,
          type: node.targetCode ? 'target-table' : 'table',
          targetCode: node.targetCode,
          markdown: node.markdown,
        })),
      }]

  const flatten = (nodes, depth = 0, parentId = null) => nodes.flatMap((node, index) => {
    const pageIndex = Number.parseInt(String(node.pageRange || '1').split('-')[0], 10)
    const current = {
      id: node.id || `${parentId || 'root'}-${index}`,
      title: node.title || node.name || `节点 ${index + 1}`,
      pageRange: node.pageRange || '--',
      location: node.location || '--',
      markdown: node.markdown || '',
      type: node.type || 'text',
      targetCode: node.targetCode || null,
      pageIndex: Number.isNaN(pageIndex) ? 1 : pageIndex,
      depth,
      parentId,
      hasChildren: Boolean(node.children?.length),
    }
    current.json = {
      title: current.title,
      node_id: current.id,
      node_type: current.type,
      page_range: current.pageRange,
      page_index: current.pageIndex,
      location: current.location,
      target_code: current.targetCode,
      markdown: current.markdown,
      children_count: node.children?.length || 0,
    }
    return [current, ...flatten(node.children || [], depth + 1, current.id)]
  })

  return flatten(sourceTree)
})

const visibleFullResultNodes = computed(() => fullResultNodes.value.filter((node) => {
  if (!node.parentId) return true
  let parentId = node.parentId
  while (parentId) {
    if (!expandedFullNodeIds.value.includes(parentId)) return false
    parentId = fullResultNodes.value.find((item) => item.id === parentId)?.parentId || null
  }
  return true
}))

const tableTree = computed(() => {
  const roots = []
  filteredNodes.value.forEach((node) => {
    const path = String(node.location || '').split('/').map((item) => item.trim()).filter(Boolean)
    const sectionPath = path.length > 1 ? path.slice(0, -1) : ['其他表格']
    let branch = roots
    let parentPath = ''
    sectionPath.forEach((sectionName) => {
      parentPath = `${parentPath}/${sectionName}`
      let section = branch.find((item) => item.type === 'section' && item.name === sectionName)
      if (!section) {
        section = {
          id: `table-section-${parentPath}`,
          name: sectionName,
          type: 'section',
          children: [],
        }
        branch.push(section)
      }
      branch = section.children
    })
    branch.push({ ...node, type: 'table' })
  })
  return roots
})

const flattenTableTree = (nodes, depth = 0, visibleOnly = true) => nodes.flatMap((node) => {
  const current = { ...node, depth }
  if (node.type !== 'section') return [current]
  if (visibleOnly && !expandedTableSectionIds.value.includes(node.id)) return [current]
  return [current, ...flattenTableTree(node.children, depth + 1, visibleOnly)]
})

const allTableSectionIds = computed(() =>
  flattenTableTree(tableTree.value, 0, false).filter((node) => node.type === 'section').map((node) => node.id),
)

const visibleTableTreeNodes = computed(() => flattenTableTree(tableTree.value))

const toggleTableTreeNode = (node) => {
  if (node.type === 'section') {
    expandedTableSectionIds.value = expandedTableSectionIds.value.includes(node.id)
      ? expandedTableSectionIds.value.filter((id) => id !== node.id)
      : [...expandedTableSectionIds.value, node.id]
    return
  }
  selectedNodeId.value = node.id
}

const selectedFullNode = computed(() =>
  fullResultNodes.value.find((node) => node.id === selectedFullNodeId.value) || fullResultNodes.value[0] || null,
)

const fullResultPdfUrl = computed(() => {
  if (!props.record?.fileUrl) return ''
  return `${props.record.fileUrl}#page=${selectedFullNode.value?.pageIndex || 1}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const toggleFullNode = (node) => {
  selectedFullNodeId.value = node.id
  if (!node.hasChildren) return
  expandedFullNodeIds.value = expandedFullNodeIds.value.includes(node.id)
    ? expandedFullNodeIds.value.filter((id) => id !== node.id)
    : [...expandedFullNodeIds.value, node.id]
}

watch(
  () => [props.show, props.record?.id],
  () => {
    selectedNodeId.value = detailNodes.value[0]?.id || null
    selectedTargetCatalogId.value = null
    nodeKeyword.value = ''
    targetOnly.value = false
    showPdfDrawer.value = false
    detailView.value = 'full'
    fullViewMode.value = 'markdown'
    selectedFullNodeId.value = fullResultNodes.value[0]?.id || null
    expandedFullNodeIds.value = fullResultNodes.value.filter((node) => node.hasChildren && node.depth === 0).map((node) => node.id)
    expandedTableSectionIds.value = allTableSectionIds.value
  },
  { immediate: true },
)

watch(targetOnly, (enabled) => {
  if (enabled) {
    const firstTarget = visibleTargetCatalogRows.value.find((item) => item.exists && item.nodeId)
    selectedTargetCatalogId.value = firstTarget?.id || null
    selectedNodeId.value = firstTarget?.nodeId || null
    return
  }

  selectedTargetCatalogId.value = null
  selectedNodeId.value = filteredNodes.value[0]?.id || detailNodes.value[0]?.id || null
})

watch(filteredNodes, (nodes) => {
  if (targetOnly.value) return
  if (!nodes.some((node) => node.id === selectedNodeId.value)) {
    selectedNodeId.value = nodes[0]?.id || null
  }
  expandedTableSectionIds.value = allTableSectionIds.value
})
</script>

<template>
  <main v-if="show && record" class="module-main report-detail-page">
    <section class="report-detail-shell">
      <div class="library-modal-head">
        <div>
          <button class="report-detail-back" type="button" @click="emit('back'); emit('close')">← 返回报告库</button>
          <h1>{{ record.fileName || record.reportName || record.company }}</h1>
        </div>
        <div class="report-detail-actions"><ReportDownloadMenu :record="record" :raw-tables="detailNodes" :full-result-nodes="fullResultNodes" /></div>
      </div>

      <!-- <nav class="report-detail-tabs" aria-label="解析结果类型">
        <button :class="{ active: detailView === 'full' }" :aria-current="detailView === 'full' ? 'page' : undefined" type="button" @click="detailView = 'full'">全量解析结果</button>
        <button :class="{ active: detailView === 'table' }" :aria-current="detailView === 'table' ? 'page' : undefined" type="button" @click="detailView = 'table'">表格解析结果</button>
      </nav> -->

      <section class="report-basic-grid">
        <div><span>主体名称</span><strong>{{ record.companyName || record.company }}</strong></div><div><span>CRM Code</span><strong>{{ record.crmCode || '-' }}</strong></div>
        <div><span>报告类型</span><strong>{{ record.reportType || record.type }}</strong></div><div><span>年份</span><strong>{{ record.year || '-' }}</strong></div>
        <div><span>报告期</span><strong>{{ reportPeriod }}</strong></div><div><span>最新报告期</span><strong>{{ latestReportPeriod }}</strong></div>
        <div><span>公开属性</span><strong>{{ record.scopeLabel || (record.isPublic === 1 ? '公开' : '非公开') }}</strong></div><div><span>解析状态</span><strong>{{ record.parseStatus || record.status }}</strong></div>
        <div><span>上传 / 获取时间</span><strong>{{ record.fetchedAt || record.uploadedAt }}</strong></div>
      </section>

      <nav class="report-detail-tabs" aria-label="解析结果类型">
        <button :class="{ active: detailView === 'full' }" :aria-current="detailView === 'full' ? 'page' : undefined" type="button" @click="detailView = 'full'">全量解析结果</button>
        <button :class="{ active: detailView === 'table' }" :aria-current="detailView === 'table' ? 'page' : undefined" type="button" @click="detailView = 'table'">表格解析结果</button>
      </nav>

      <section v-if="detailView === 'table'" class="report-detail-toolbar">
        <div class="report-kpis"><span>原始表格数量 <strong>{{ detailRawTableCount }}</strong></span><span>目标表格数量 <strong>{{ detailTargetTableCount }}</strong></span><span>命中表格数量 <strong>{{ detailMatchedTableCount }}</strong></span></div>
        <label class="target-only-toggle"><input v-model="targetOnly" type="checkbox" />只查看目标表</label>
      </section>

      <div v-if="detailView === 'table'" class="library-preview-grid resizable-result-grid" :style="resultGridStyle">
        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>{{ targetOnly ? '目标表导航' : '章节导航' }}</span>
            <h3>{{ targetOnly ? '目标表清单' : '章节 / 表名' }}</h3>
          </div>
          <div class="library-node-filter">
            <input
              v-model="nodeKeyword"
              type="text"
              :placeholder="targetOnly ? '搜索目标表名称' : '搜索章节或表名'"
            />
          </div>
          <div v-if="targetOnly" class="target-table-catalog-list table-result-tree-list">
            <button
              v-for="item in visibleTargetCatalogRows"
              :key="item.id"
              :class="['target-table-catalog-item', { active: item.nodeId && selectedTargetCatalogItem?.id === item.id }]"
              :disabled="!item.exists || !item.nodeId"
              type="button"
              @click="selectTargetCatalogItem(item)"
            >
              <span>{{ item.name }}</span>
              <i :class="['target-table-status-dot', item.exists ? 'present' : 'missing']" :title="item.exists ? '当前报告存在该目标表' : '当前报告不存在该目标表'" />
            </button>
            <div v-if="!visibleTargetCatalogRows.length" class="library-empty-table compact">
              未找到匹配的目标表名称
            </div>
          </div>
          <div v-else class="report-full-tree-list table-result-tree-list">
            <button
              v-for="node in visibleTableTreeNodes"
              :key="node.id"
              :class="['report-full-tree-item', { active: selectedNode?.id === node.id }]"
              :style="{ paddingLeft: `${16 + node.depth * 20}px` }"
              type="button"
              @click="toggleTableTreeNode(node)"
            >
              <span class="report-full-tree-arrow">{{ node.type === 'section' ? (expandedTableSectionIds.includes(node.id) ? '−' : '+') : '·' }}</span>
              <span>
                <strong>{{ node.name }}</strong>
                <small v-if="node.type === 'table'">页码：{{ node.pageRange }}<template v-if="node.targetCode"> · {{ node.targetCode }}</template></small>
              </span>
            </button>
            <div v-if="!visibleTableTreeNodes.length" class="library-empty-table compact">
              当前记录暂无匹配表名
            </div>
          </div>
        </article>

        <button class="result-column-resizer first" type="button" aria-label="拖动调整第一列宽度" @pointerdown="startColumnResize($event, 1)" />

        <article class="library-result-card">
          <div class="library-result-card-head">
            <div><span>原始表格</span><h3>当前节点对应的原始表格</h3></div>
            <button class="locate-source-button" type="button" @click="showPdfDrawer = true"><span aria-hidden="true">⌖</span>定位原文</button>
          </div>
          <div v-if="selectedNode" class="library-table-preview">
            <div class="library-table-preview-head">
              <strong>{{ selectedNode.name }}</strong>
              <span>页码：{{ selectedNode.pageRange }}</span>
              <span>定位：{{ selectedNode.location }}</span>
            </div>
            <div class="library-data-table-wrap">
              <table v-if="parsedNodeTable.headers.length" class="library-data-table">
                <thead>
                  <tr>
                    <th v-for="(header, index) in parsedNodeTable.headers" :key="`upload-head-${index}`">
                      {{ header || '-' }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in parsedNodeTable.rows" :key="`upload-row-${rowIndex}`">
                    <td v-for="(cell, cellIndex) in row" :key="`upload-cell-${rowIndex}-${cellIndex}`">
                      {{ cell || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="library-empty-table">当前节点暂无可展示的表格数据</div>
            </div>
          </div>
        </article>

        <button class="result-column-resizer second" type="button" aria-label="拖动调整第二列宽度" @pointerdown="startColumnResize($event, 2)" />

        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>结构化结果</span>
            <h3>三表 / 附注结构化输出</h3>
          </div>
          <div class="library-table-preview">
            <div class="library-table-preview-head">
              <strong>{{ currentTargetName }}</strong>
              <span v-if="currentTargetCode">目标表编码：{{ currentTargetCode }}</span>
              <span v-else>当前 node 暂未命中目标表</span>
            </div>
            <div class="library-data-table-wrap">
              <table v-if="structuredRows.length" class="library-data-table structured">
                <thead>
                  <tr>
                    <th>字段名称</th>
                    <th>数值</th>
                    <th>单位</th>
                    <th>编码</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in structuredRows" :key="`structured-${index}`">
                    <td>{{ item.label || '-' }}</td>
                    <td>{{ item.value || '-' }}</td>
                    <td>{{ item.unit || '-' }}</td>
                    <td>{{ item.code || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="library-empty-table">
                <div class="library-empty-copy">
                  <strong>该表非目标表</strong>
                  <span>当前 PageIndex node 没有对应的结构化结果，或该表未进入目标表抽取链路。</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-if="detailView === 'table' && showPdfDrawer" class="source-drawer-mask" @click.self="showPdfDrawer = false">
        <aside class="source-pdf-drawer" aria-label="原文定位">
          <header>
            <div><h2>原文定位</h2><p>当前节点页码：{{ selectedNode?.pageRange || '--' }}</p></div>
            <button type="button" aria-label="关闭原文定位" @click="showPdfDrawer = false">×</button>
          </header>
          <div class="source-pdf-drawer-body">
            <iframe v-if="pdfEmbedUrl" :key="pdfEmbedUrl" :src="pdfEmbedUrl" class="library-pdf-frame" title="原文定位预览" />
            <div v-else class="library-empty-table">暂无可用 PDF 链接</div>
          </div>
        </aside>
      </div>

      <div v-if="detailView === 'full'" class="library-full-result-grid detailed report-full-result-grid resizable-result-grid" :style="resultGridStyle">
        <article class="library-result-card report-full-tree-card">
          <div class="library-result-card-head">
            <span>目录树</span>
            <h3>报告章节</h3>
          </div>
          <div class="report-full-tree-list">
            <button
              v-for="node in visibleFullResultNodes"
              :key="node.id"
              :class="['report-full-tree-item', { active: selectedFullNode?.id === node.id }]"
              :style="{ paddingLeft: `${16 + node.depth * 20}px` }"
              type="button"
              @click="toggleFullNode(node)"
            >
              <span class="report-full-tree-arrow">{{ node.hasChildren ? (expandedFullNodeIds.includes(node.id) ? '−' : '+') : '·' }}</span>
              <span><strong>{{ node.title }}</strong><small>页码：{{ node.pageRange }}</small></span>
            </button>
          </div>
        </article>

        <button class="result-column-resizer first" type="button" aria-label="拖动调整第一列宽度" @pointerdown="startColumnResize($event, 1)" />

        <article class="library-result-card report-full-content-card">
          <div class="library-result-card-head">
            <span>节点内容</span>
            <h3>{{ selectedFullNode?.title || '未选择节点' }}</h3>
          </div>
          <div class="library-view-mode-switch">
            <button :class="['library-view-mode-btn', { active: fullViewMode === 'markdown' }]" type="button" @click="fullViewMode = 'markdown'">Markdown</button>
            <button :class="['library-view-mode-btn', { active: fullViewMode === 'json' }]" type="button" @click="fullViewMode = 'json'">JSON</button>
          </div>
          <div class="library-full-result-content">
            <pre class="library-code-block">{{ fullViewMode === 'json' ? JSON.stringify(selectedFullNode?.json || {}, null, 2) : (selectedFullNode?.markdown || '当前节点暂无内容') }}</pre>
          </div>
        </article>

        <button class="result-column-resizer second" type="button" aria-label="拖动调整第二列宽度" @pointerdown="startColumnResize($event, 2)" />

        <article class="library-result-card report-full-pdf-card">
          <div class="library-result-card-head">
            <span>原始 PDF</span>
            <h3>原文预览 / 节点定位</h3>
          </div>
          <div class="library-pdf-frame-wrap report-full-pdf-wrap">
            <iframe
              v-if="fullResultPdfUrl"
              :key="fullResultPdfUrl"
              :src="fullResultPdfUrl"
              class="library-pdf-frame"
              title="全量解析原文预览"
            />
            <div v-else class="library-empty-table">暂无可用 PDF 链接</div>
          </div>
          <div class="library-document-meta">
            <span>当前目录：{{ selectedFullNode?.title || '--' }}</span>
            <span>定位：{{ selectedFullNode?.pageRange || '--' }} / {{ selectedFullNode?.location || '--' }}</span>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
