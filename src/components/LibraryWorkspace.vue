<script setup>
import { computed, ref, watch } from 'vue'
import {
  getLibraryTypeLabel,
  libraryCollectionMap,
  libraryScopes,
  publicLibraryTypes,
} from '../data/librarySeeds'
import { roles } from '../data/appShell'

const props = defineProps({
  currentUser: { type: Object, default: null },
})

const activeScope = ref('public')
const activeType = ref('financial')
const reportSearch = ref('')
const selectedReportId = ref(null)
const selectedNodeId = ref(null)
const showParseResultModal = ref(false)

const currentRole = computed(() => props.currentUser?.role || null)

const visibleLibraryScopes = computed(() => {
  if (currentRole.value === roles.customer) {
    return libraryScopes.filter((item) => item.key === 'private')
  }
  return libraryScopes
})

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

  const headers = parseRow(lines[0])
  const rows = lines
    .slice(2)
    .map(parseRow)
    .filter((row) => row.length)

  return { headers, rows }
}

const currentCollection = computed(() => {
  const rows = libraryCollectionMap[activeScope.value]?.[activeType.value] || []
  if (currentRole.value === roles.customer) {
    return rows.filter((item) => item.uploaderUsername === props.currentUser?.username)
  }
  return rows
})

const filteredReports = computed(() => {
  const keyword = reportSearch.value.trim()
  return currentCollection.value.filter((item) => {
    if (!keyword) return true
    return (
      item.reportName.includes(keyword) ||
      item.crmCode.includes(keyword) ||
      item.companyName.includes(keyword)
    )
  })
})

const selectedReport = computed(() => {
  return filteredReports.value.find((item) => item.id === selectedReportId.value) || filteredReports.value[0] || null
})

const selectedNode = computed(() => {
  const nodes = selectedReport.value?.rawTables || []
  return nodes.find((item) => item.id === selectedNodeId.value) || nodes[0] || null
})

const matchedStructuredTable = computed(() => {
  const targetTables = selectedReport.value?.targetTables || []
  const node = selectedNode.value

  if (!node) return null

  return (
    targetTables.find((item) => node.targetCode && item.code === node.targetCode) ||
    targetTables.find((item) => item.name.includes(node.name) || node.name.includes(item.name)) ||
    targetTables.find((item) => item.rawTableLocation.includes(node.name) || node.location.includes(item.name)) ||
    null
  )
})

const parsedNodeTable = computed(() => parseMarkdownTable(selectedNode.value?.markdown || ''))
const selectedNodePage = computed(() => {
  const pageRange = selectedNode.value?.pageRange || ''
  const firstPage = Number.parseInt(String(pageRange).split('-')[0], 10)
  return Number.isNaN(firstPage) ? 1 : firstPage
})

const pdfEmbedUrl = computed(() => {
  if (!selectedReport.value?.fileUrl) return ''
  return `${selectedReport.value.fileUrl}#page=${selectedNodePage.value}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const selectReport = (id) => {
  selectedReportId.value = id
}

const openParseResultModal = () => {
  if (!selectedReport.value) return
  showParseResultModal.value = true
}

const closeParseResultModal = () => {
  showParseResultModal.value = false
}

watch(
  visibleLibraryScopes,
  (scopes) => {
    if (!scopes.find((item) => item.key === activeScope.value)) {
      activeScope.value = scopes[0]?.key || 'private'
    }
  },
  { immediate: true },
)

watch(
  [activeScope, activeType],
  () => {
    selectedReportId.value = currentCollection.value[0]?.id || null
    selectedNodeId.value = currentCollection.value[0]?.rawTables?.[0]?.id || null
  },
  { immediate: true },
)

watch(
  selectedReport,
  (report) => {
    selectedNodeId.value = report?.rawTables?.[0]?.id || null
  },
  { immediate: true },
)
</script>

<template>
  <main class="module-main">
    <section class="library-workspace">
      <div class="workbench-top">
        <div class="workbench-head">
          <span class="hero-label">REPORT LIBRARY</span>
          <h1>报告库</h1>
          <p>公众 / 非公众共用一套报告清单与解析结果入口，后续直接替换为真实查询结果即可。</p>
        </div>
      </div>

      <section class="workbench-panel library-scope-panel">
        <div class="library-scope-switch">
          <button
            v-for="scope in visibleLibraryScopes"
            :key="scope.key"
            :class="['config-view-tab', { active: activeScope === scope.key }]"
            type="button"
            @click="activeScope = scope.key"
          >
            {{ scope.label }}
          </button>
        </div>
      </section>

      <section class="workbench-panel library-type-panel">
        <div class="panel-head">
          <div>
            <span>{{ activeScope === 'public' ? '公众报告' : '非公众报告' }}</span>
            <h2>报告类型窗口</h2>
          </div>
        </div>

        <div class="library-type-switch">
          <button
            v-for="item in publicLibraryTypes"
            :key="item.key"
            :class="['config-type-card library-type-card', { active: activeType === item.key }]"
            type="button"
            @click="activeType = item.key"
          >
            <strong>{{ item.label }}</strong>
            <small>查看 {{ item.label }} 的搜索、清单和解析结果入口。</small>
          </button>
        </div>
      </section>

      <section class="library-finance-layout">
        <section class="workbench-panel library-list-panel">
          <div class="panel-head">
            <div>
              <span>{{ getLibraryTypeLabel(activeType) }}</span>
              <h2>搜索与报告清单</h2>
            </div>
          </div>

          <div class="library-search-bar">
            <input
              v-model="reportSearch"
              type="text"
              placeholder="搜索报告名称 / CRM Code / 主体名称"
            />
          </div>

          <div class="library-table-wrap">
            <table class="history-table library-table">
              <thead>
                <tr>
                  <th>报告名称</th>
                  <th>CRM Code</th>
                  <th>报告类型</th>
                  <th>最新报告期</th>
                  <th>获取时间</th>
                  <th>解析状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredReports"
                  :key="row.id"
                  :class="{ active: selectedReport?.id === row.id }"
                  @click="selectReport(row.id)"
                >
                  <td>
                    <strong>{{ row.reportName }}</strong>
                    <small>{{ row.companyName }}</small>
                  </td>
                  <td>{{ row.crmCode }}</td>
                  <td>{{ row.reportType }}</td>
                  <td>{{ row.latestPeriod }}</td>
                  <td>{{ row.fetchedAt }}</td>
                  <td>{{ row.parseStatus }}</td>
                </tr>
                <tr v-if="!filteredReports.length">
                  <td colspan="6" class="empty-row">暂无匹配的{{ getLibraryTypeLabel(activeType) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="workbench-panel library-result-panel">
          <div class="panel-head">
            <div>
              <span>解析结果</span>
              <h2>{{ selectedReport?.reportName || `${getLibraryTypeLabel(activeType)}窗口预留` }}</h2>
            </div>
          </div>

          <template v-if="selectedReport">
            <div class="library-result-summary">
              <article class="library-metric-card">
                <span>最新报告期</span>
                <strong>{{ selectedReport.latestReportPeriod }}</strong>
              </article>
              <article class="library-metric-card">
                <span>全部报告期</span>
                <strong>{{ selectedReport.allReportPeriods.join(' / ') }}</strong>
              </article>
              <article class="library-metric-card">
                <span>原始表格数量</span>
                <strong>{{ selectedReport.rawTableCount }}</strong>
              </article>
              <article class="library-metric-card">
                <span>目标表格数量</span>
                <strong>{{ selectedReport.targetTableCount }}</strong>
              </article>
              <article class="library-metric-card">
                <span>命中表格数量</span>
                <strong>{{ selectedReport.matchedTableCount }}</strong>
              </article>
            </div>

            <div class="library-result-grid single">
              <article class="library-result-card library-result-entry-card">
                <div class="library-result-card-head">
                  <span>解析结果入口</span>
                  <h3>单独窗口查看原文 / 原始表格 / 结构化结果</h3>
                </div>
                <ul class="library-result-list">
                  <li>
                    <strong>当前选中报告</strong>
                    <span>{{ selectedReport.reportName }}</span>
                  </li>
                </ul>
                <button class="quad-enter library-open-modal-btn" type="button" @click="openParseResultModal">
                  查看解析结果
                </button>
              </article>
            </div>
          </template>
        </section>
      </section>

      <div v-if="showParseResultModal && selectedReport" class="library-modal-mask" @click.self="closeParseResultModal">
        <section class="library-modal">
          <div class="library-modal-head">
            <div>
              <span>解析结果</span>
              <h2>{{ selectedReport.reportName }}</h2>
              <p>最左侧是 PageIndex 结构目录，依次联动 PDF、原始表格，以及该节点对应的结构化结果。</p>
            </div>
            <button class="library-modal-close" type="button" @click="closeParseResultModal">×</button>
          </div>

          <div class="library-preview-grid">
            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>PageIndex Node</span>
                <h3>节点结构 / 点击切换内容</h3>
              </div>
              <div class="library-node-list">
                <button
                  v-for="node in selectedReport.rawTables"
                  :key="node.id"
                  :class="['library-node-item', { active: selectedNode?.id === node.id }]"
                  type="button"
                  @click="selectedNodeId = node.id"
                >
                  <strong>{{ node.name }}</strong>
                  <span>页码：{{ node.pageRange }}</span>
                  <small>{{ node.location }}</small>
                </button>
                <div v-if="!selectedReport.rawTables.length" class="library-empty-table compact">
                  当前报告暂无 PageIndex 节点
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
                    title="原始PDF预览"
                  />
                  <div v-else class="library-document-page">
                    <strong>{{ selectedReport.pdfPreview.fileName }}</strong>
                    <span>暂无可用 PDF 链接</span>
                    <span>{{ selectedReport.pdfPreview.sectionPath }}</span>
                  </div>
                </div>
                <div class="library-document-meta">
                  <span>{{ selectedReport.pdfPreview.fileName }}</span>
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
                        <th v-for="(header, index) in parsedNodeTable.headers" :key="`node-head-${index}`">
                          {{ header || '-' }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in parsedNodeTable.rows" :key="`node-row-${rowIndex}`">
                        <td v-for="(cell, cellIndex) in row" :key="`node-cell-${rowIndex}-${cellIndex}`">
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
                  <strong>{{ matchedStructuredTable?.name || '暂无结构化结果' }}</strong>
                  <span v-if="matchedStructuredTable">命中目标表：{{ matchedStructuredTable.name }}</span>
                  <span v-else>当前 node 暂未命中目标表</span>
                </div>
                <div class="library-data-table-wrap">
                  <table
                    v-if="matchedStructuredTable?.structured?.rows?.length"
                    class="library-data-table structured"
                  >
                    <thead>
                      <tr>
                        <th>字段名称</th>
                        <th>数值</th>
                        <th>单位</th>
                        <th>编码</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(item, index) in matchedStructuredTable.structured.rows"
                        :key="`${matchedStructuredTable.id}-${index}`"
                      >
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
    </section>
  </main>
</template>
