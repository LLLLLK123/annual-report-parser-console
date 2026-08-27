<script setup>
import { computed, ref, watch } from 'vue'
import { reportTypeLabelMap } from '../data/uploadSeeds'
import {
  rawReportInformationRows,
  structured3MajorRows,
  structuredNotesRows,
  uploadReportInformationRows,
} from '../data/sourceTables'

const props = defineProps({
  show: { type: Boolean, required: true },
  record: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const selectedNodeId = ref(null)

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

const selectedNode = computed(() => {
  const nodes = detailNodes.value
  return nodes.find((item) => item.id === selectedNodeId.value) || nodes[0] || null
})

const pdfEmbedUrl = computed(() => {
  if (!props.record?.fileUrl) return ''
  const firstPage = Number.parseInt(String(selectedNode.value?.pageRange || '1').split('-')[0], 10)
  const page = Number.isNaN(firstPage) ? 1 : firstPage
  return `${props.record.fileUrl}#page=${page}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const structuredRows = computed(() => {
  if (!props.record || !selectedNode.value?.targetCode) return []

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

  const noteRows = structuredNotesRows
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

  return noteRows
})

const parsedNodeTable = computed(() => parseMarkdownTable(selectedNode.value?.markdown || ''))

watch(
  () => [props.show, props.record?.id],
  () => {
    selectedNodeId.value = detailNodes.value[0]?.id || null
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="show && record" class="library-modal-mask" @click.self="emit('close')">
    <section class="library-modal">
      <div class="library-modal-head">
        <div>
          <span>任务数据</span>
          <h2>{{ record.fileName || record.company }}</h2>
          <p>最左侧是 PageIndex 结构目录，依次联动 PDF、原始表格，以及该节点对应的结构化结果。</p>
        </div>
        <button class="library-modal-close" type="button" @click="emit('close')">×</button>
      </div>

      <div class="library-preview-grid">
        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>PageIndex Node</span>
            <h3>节点结构 / 点击切换内容</h3>
          </div>
          <div class="library-node-list">
            <button
              v-for="node in detailNodes"
              :key="node.id"
              :class="['library-node-item', { active: selectedNode?.id === node.id }]"
              type="button"
              @click="selectedNodeId = node.id"
            >
              <strong>{{ node.name }}</strong>
              <span>页码：{{ node.pageRange }}</span>
              <small>{{ node.location }}</small>
            </button>
            <div v-if="!detailNodes.length" class="library-empty-table compact">
              当前记录暂无可用节点
            </div>
          </div>
        </article>

        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>原始 PDF</span>
            <h3>原文预览 / 节点定位</h3>
          </div>
          <div class="library-document-preview">
            <div class="library-pdf-frame-wrap">
              <iframe
                v-if="pdfEmbedUrl"
                :key="pdfEmbedUrl"
                :src="pdfEmbedUrl"
                class="library-pdf-frame"
                title="上传记录 PDF 预览"
              />
              <div v-else class="library-document-page upload-record-document-page">
                <strong>{{ record.fileName }}</strong>
                <span>暂无可用 PDF 链接</span>
              </div>
            </div>
            <div class="library-document-meta">
              <span>{{ record.company }}</span>
              <span>报告类型：{{ record.type }}</span>
              <span>当前节点：{{ selectedNode?.name || '未选择' }}</span>
              <span>原始报告定位：{{ selectedNode?.pageRange || '--' }} / {{ selectedNode?.location || '--' }}</span>
            </div>
          </div>
        </article>

        <article class="library-result-card">
          <div class="library-result-card-head">
            <span>原始表格</span>
            <h3>当前节点对应的原始表格</h3>
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
    </section>
  </div>
</template>
