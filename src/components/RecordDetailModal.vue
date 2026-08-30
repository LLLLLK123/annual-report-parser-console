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
    return props.record.rawTables.map((item, index) => ({
      id: item.id || `${props.record.id}-raw-${index}`,
      name: item.name || item.table_title || `表格 ${index + 1}`,
      pageRange: item.pageRange || `${item.page_start || 1}-${item.page_end || item.page_start || 1}`,
      location: item.location || item.node_path || 'PageIndex 节点',
      markdown: item.markdown || item.markdown_table || buildFallbackMarkdown(item.name || `表格 ${index + 1}`),
      targetCode: item.targetCode || item.table_code || null,
    }))
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
    return merged.map((item, index) => ({
      id: `${props.record.id}-node-${item.id}-${index}`,
      name: item.table_title || item.node_title || `Node ${index + 1}`,
      pageRange: `${item.page_start || 1}-${item.page_end || item.page_start || 1}`,
      location: item.node_path || 'PageIndex 节点',
      markdown: item.markdown_table || buildFallbackMarkdown(item.table_title || item.node_title || `Node ${index + 1}`),
      targetCode: item.table_code || null,
    }))
  }

  const typeKey = props.record.typeKey || 'financial'
  return (fallbackNodeTemplates[typeKey] || fallbackNodeTemplates.financial).map((item, index) => ({
    id: `${props.record.id}-fallback-${index}`,
    name: item.name,
    pageRange: `${88 + index * 4}-${91 + index * 4}`,
    location: `${reportTypeLabelMap[typeKey] || props.record.type} / ${item.name}`,
    markdown: buildFallbackMarkdown(item.name),
    targetCode: item.targetCode,
  }))
})

const selectedNode = computed(() => detailNodes.value.find((item) => item.id === selectedNodeId.value) || filteredNodes.value[0] || null)

const filteredNodes = computed(() => {
  const keyword = nodeKeyword.value.trim().toLowerCase()
  return detailNodes.value.filter((item) =>
    (!targetOnly.value || item.targetCode) &&
    (!keyword ||
    [item.name, item.location, item.targetCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))),
  )
})

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

const structuredRows = computed(() => {
  if (!props.record || !selectedNode.value?.targetCode) return []

  // 优先读取当前报告自身的目标表结构化结果
  const recordTarget = props.record.targetTables?.find(
    (item) => item.code === selectedNode.value.targetCode,
  )

  if (recordTarget?.structured?.rows?.length) {
    return recordTarget.structured.rows
  }

  // 找不到时，再回退到 sourceTables.js
  const majorRows = structured3MajorRows
    .filter(
      (item) =>
        item.crm_code === props.record.crmCode &&
        item.basic_year === Number(props.record.year) &&
        selectedNode.value.name.includes(item.title),
    )
    .map((item) => ({
      label: item.report_item_name,
      value: item.processed_value || item.raw_value || '--',
      unit: item.unit || '--',
      code: item.metric_code || '--',
    }))

  if (majorRows.length) return majorRows

  return structuredNotesRows
    .filter(
      (item) =>
        item.crm_code === props.record.crmCode &&
        item.basic_year === Number(props.record.year) &&
        item.title === selectedNode.value.targetCode,
    )
    .map((item) => ({
      label: item.item,
      value: item.value || '--',
      unit: item.unit || '--',
      code: item.code || '--',
    }))
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

watch(filteredNodes, (nodes) => {
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

      <nav class="report-detail-tabs" aria-label="解析结果类型">
        <button :class="{ active: detailView === 'full' }" :aria-current="detailView === 'full' ? 'page' : undefined" type="button" @click="detailView = 'full'">全量解析结果</button>
        <button :class="{ active: detailView === 'table' }" :aria-current="detailView === 'table' ? 'page' : undefined" type="button" @click="detailView = 'table'">表格解析结果</button>
      </nav>

      <section class="report-basic-grid">
        <div><span>主体名称</span><strong>{{ record.companyName || record.company }}</strong></div><div><span>CRM Code</span><strong>{{ record.crmCode || '-' }}</strong></div>
        <div><span>报告类型</span><strong>{{ record.reportType || record.type }}</strong></div><div><span>年份</span><strong>{{ record.year || '-' }}</strong></div>
        <div><span>报告期</span><strong>{{ reportPeriod }}</strong></div><div><span>最新报告期</span><strong>{{ latestReportPeriod }}</strong></div>
        <div><span>公开属性</span><strong>{{ record.scopeLabel || (record.isPublic === 1 ? '公开' : '非公开') }}</strong></div><div><span>解析状态</span><strong>{{ record.parseStatus || record.status }}</strong></div>
        <div><span>上传 / 获取时间</span><strong>{{ record.fetchedAt || record.uploadedAt }}</strong></div>
      </section>

      <section v-if="detailView === 'table'" class="report-detail-toolbar">
        <div class="report-kpis"><span>原始表格数量 <strong>{{ record.rawTableCount ?? detailNodes.length }}</strong></span><span>目标表格数量 <strong>{{ record.targetTableCount ?? detailNodes.filter((item) => item.targetCode).length }}</strong></span><span>命中表格数量 <strong>{{ record.matchedTableCount ?? detailNodes.filter((item) => item.targetCode).length }}</strong></span></div>
        <label class="target-only-toggle"><input v-model="targetOnly" type="checkbox" />只查看目标表</label>
      </section>

      <div v-if="detailView === 'table'" class="library-preview-grid resizable-result-grid" :style="resultGridStyle">
        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>章节导航</span>
            <h3>章节 / 表名</h3>
          </div>
          <div class="library-node-filter">
            <input
              v-model="nodeKeyword"
              type="text"
              placeholder="搜索章节或表名"
            />
          </div>
          <div class="report-full-tree-list table-result-tree-list">
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
              <strong>{{ selectedNode?.targetCode || '暂无目标表编码' }}</strong>
              <span v-if="selectedNode?.targetCode">目标表编码：{{ selectedNode.targetCode }}</span>
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
