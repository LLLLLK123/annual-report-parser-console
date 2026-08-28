<script setup>
import { computed, ref, watch } from 'vue'
import {
  libraryCollectionMap,
  libraryScopes,
} from '../data/librarySeeds'
import { roles } from '../data/appShell'

const props = defineProps({
  currentUser: { type: Object, default: null },
})

const activeScope = ref('public')
const reportSearch = ref('')
const yearFilter = ref('')
const quarterFilter = ref('')
const reportTypeFilter = ref('')
const statusFilter = ref('')
const fetchedAtSort = ref('desc')
const activeHeaderFilter = ref('')
const selectedReportId = ref(null)
const selectedNodeId = ref(null)
const nodeKeyword = ref('')
const fullResultNodeId = ref(null)
const fullResultViewMode = ref('markdown')
const expandedFullResultNodeIds = ref([])
const showParseResultModal = ref(false)
const showFullResultModal = ref(false)
const expandedReportId = ref(null)
const pageSize = ref(10)
const currentPage = ref(1)
const jumpPageInput = ref('1')

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
  const scopeCollection = libraryCollectionMap[activeScope.value] || {}
  const rows = Object.values(scopeCollection).flat()
  if (currentRole.value === roles.customer) {
    return rows.filter((item) => item.uploaderUsername === props.currentUser?.username)
  }
  return rows
})

const yearOptions = computed(() => [...new Set(currentCollection.value.map((item) => item.year).filter(Boolean))])
const quarterOptions = computed(() => [...new Set(currentCollection.value.map((item) => item.quarter).filter(Boolean))])
const reportTypeOptions = computed(() => [...new Set(currentCollection.value.map((item) => item.reportType).filter(Boolean))])
const statusOptions = computed(() => [...new Set(currentCollection.value.map((item) => item.parseStatus).filter(Boolean))])

const filteredReports = computed(() => {
  const keyword = reportSearch.value.trim()
  const rows = currentCollection.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      (
      item.reportName.includes(keyword) ||
      item.crmCode.includes(keyword) ||
      item.companyName.includes(keyword)
      )
    const matchesYear = !yearFilter.value || item.year === yearFilter.value
    const matchesQuarter = !quarterFilter.value || item.quarter === quarterFilter.value
    const matchesType = !reportTypeFilter.value || item.reportType === reportTypeFilter.value
    const matchesStatus = !statusFilter.value || item.parseStatus === statusFilter.value
    return matchesKeyword && matchesYear && matchesQuarter && matchesType && matchesStatus
  })

  return [...rows].sort((a, b) => {
    if (!fetchedAtSort.value) return 0
    const timeA = new Date(a.fetchedAt.replace(' ', 'T')).getTime()
    const timeB = new Date(b.fetchedAt.replace(' ', 'T')).getTime()
    return fetchedAtSort.value === 'asc' ? timeA - timeB : timeB - timeA
  })
})

const totalReportCount = computed(() => filteredReports.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalReportCount.value / pageSize.value)))
const paginatedReports = computed(() => {
  const safePage = Math.min(currentPage.value, totalPages.value)
  const start = (safePage - 1) * pageSize.value
  return filteredReports.value.slice(start, start + pageSize.value)
})

const selectedReport = computed(() => {
  return filteredReports.value.find((item) => item.id === selectedReportId.value) || filteredReports.value[0] || null
})

const parseTargetNodes = computed(() => {
  const report = selectedReport.value
  if (!report) return []

  return (report.targetTables || []).map((targetTable, index) => {
    const matchedRawTable =
      (report.rawTables || []).find((rawTable) => rawTable.targetCode && rawTable.targetCode === targetTable.code) ||
      (report.rawTables || []).find((rawTable) => rawTable.name === targetTable.name) ||
      (report.rawTables || []).find((rawTable) => targetTable.rawTableLocation?.includes(rawTable.name)) ||
      null

    return {
      id: matchedRawTable?.id || `target-node-${targetTable.id}-${index}`,
      name: targetTable.name,
      pageRange: matchedRawTable?.pageRange || '--',
      location: matchedRawTable?.location || targetTable.rawTableLocation || '--',
      markdown: matchedRawTable?.markdown || targetTable.markdown || '',
      targetCode: targetTable.code || matchedRawTable?.targetCode || null,
      structured: targetTable.structured || null,
      targetTable,
    }
  })
})

const filteredParseNodes = computed(() => {
  const keyword = nodeKeyword.value.trim()
  if (!keyword) return parseTargetNodes.value
  return parseTargetNodes.value.filter((item) => item.name.includes(keyword) || item.targetCode?.includes(keyword))
})

const selectedNode = computed(() => {
  const nodes = filteredParseNodes.value
  return nodes.find((item) => item.id === selectedNodeId.value) || nodes[0] || null
})

const matchedStructuredTable = computed(() => {
  const node = selectedNode.value

  if (!node) return null

  return node.targetTable || null
})

const parsedNodeTable = computed(() => parseMarkdownTable(selectedNode.value?.markdown || ''))
const selectedNodePage = computed(() => {
  const pageRange = selectedNode.value?.pageRange || ''
  const firstPage = Number.parseInt(String(pageRange).split('-')[0], 10)
  return Number.isNaN(firstPage) ? 1 : firstPage
})

const pdfEmbedUrl = computed(() => {
  if (!selectedReport.value?.fileUrl) return ''
  if (selectedReport.value.fileUrl.includes('mock.public')) return ''
  return `${selectedReport.value.fileUrl}#page=${selectedNodePage.value}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const fullResultNodes = computed(() => {
  const report = selectedReport.value
  if (!report) return []
  const tree = report.fullResultTree || []

  const walk = (nodes, depth = 0, parentId = null) =>
    nodes.flatMap((node, index) => {
      const currentNode = {
        id: node.id,
        title: node.title,
        pageRange: node.pageRange || '--',
        location: node.location || '--',
        markdown: node.markdown || '',
        pageIndex: Number.parseInt(String(node.pageRange || '').split('-')[0], 10) || index + 1,
        type: node.type || 'text',
        targetCode: node.targetCode || null,
        depth,
        parentId,
        hasChildren: Boolean(node.children?.length),
        json: {
          title: node.title,
          node_id: node.id,
          node_type: node.type || 'text',
          page_range: node.pageRange || '--',
          page_index: Number.parseInt(String(node.pageRange || '').split('-')[0], 10) || null,
          location: node.location || '--',
          target_code: node.targetCode || null,
          markdown: node.markdown || '',
          children_count: node.children?.length || 0,
        },
      }

      return [currentNode, ...walk(node.children || [], depth + 1, node.id)]
    })

  return walk(tree)
})

const selectedFullResultNode = computed(() => {
  const nodes = fullResultNodes.value
  return nodes.find((item) => item.id === fullResultNodeId.value) || nodes[0] || null
})

const fullResultPdfEmbedUrl = computed(() => {
  if (!selectedReport.value?.fileUrl || !selectedFullResultNode.value) return ''
  if (selectedReport.value.fileUrl.includes('mock.public')) return ''
  return `${selectedReport.value.fileUrl}#page=${selectedFullResultNode.value.pageIndex}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`
})

const fullResultJsonPreview = computed(() => {
  if (!selectedFullResultNode.value) return ''
  return JSON.stringify(selectedFullResultNode.value.json, null, 2)
})

const visibleFullResultNodes = computed(() => {
  const expanded = new Set(expandedFullResultNodeIds.value)
  return fullResultNodes.value.filter((node) => {
    if (!node.parentId) return true
    let currentParentId = node.parentId
    while (currentParentId) {
      if (!expanded.has(currentParentId)) return false
      currentParentId = fullResultNodes.value.find((item) => item.id === currentParentId)?.parentId || null
    }
    return true
  })
})

const selectReport = (id) => {
  selectedReportId.value = id
}

const canOpenResult = (row) => row?.parseStatus === '已完成'

const toggleHeaderFilter = (key) => {
  activeHeaderFilter.value = activeHeaderFilter.value === key ? '' : key
}

const closeHeaderFilter = () => {
  activeHeaderFilter.value = ''
}

const handleReportRowClick = (row) => {
  selectedReportId.value = row.id
  if (!canOpenResult(row)) return
  expandedReportId.value = expandedReportId.value === row.id ? null : row.id
}

const toggleExpandedRow = (row) => {
  if (!canOpenResult(row)) return
  expandedReportId.value = expandedReportId.value === row.id ? null : row.id
  selectedReportId.value = row.id
}

const openParseResultModal = () => {
  if (!selectedReport.value || !canOpenResult(selectedReport.value)) return
  nodeKeyword.value = ''
  showParseResultModal.value = true
}

const openFullResultModal = (row = selectedReport.value) => {
  if (!row || !canOpenResult(row)) return
  selectedReportId.value = row.id
  fullResultNodeId.value = row.fullResultTree?.[0]?.id || row.rawTables?.[0]?.id || null
  fullResultViewMode.value = 'markdown'
  expandedFullResultNodeIds.value = (row.fullResultTree || [])
    .filter((item) => item.children?.length)
    .map((item) => item.id)
  showFullResultModal.value = true
}

const closeParseResultModal = () => {
  showParseResultModal.value = false
}

const closeFullResultModal = () => {
  showFullResultModal.value = false
}

const toggleFullResultNode = (node) => {
  if (node.hasChildren) {
    const expanded = new Set(expandedFullResultNodeIds.value)
    if (expanded.has(node.id)) {
      expanded.delete(node.id)
    } else {
      expanded.add(node.id)
    }
    expandedFullResultNodeIds.value = [...expanded]
  }
  fullResultNodeId.value = node.id
}

const syncPagination = () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
  jumpPageInput.value = String(currentPage.value)
}

const goToPrevPage = () => {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
  jumpPageInput.value = String(currentPage.value)
}

const goToNextPage = () => {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
  jumpPageInput.value = String(currentPage.value)
}

const submitJumpPage = () => {
  const parsed = Number(jumpPageInput.value)
  if (!Number.isFinite(parsed)) {
    jumpPageInput.value = String(currentPage.value)
    return
  }
  currentPage.value = Math.min(Math.max(parsed, 1), totalPages.value)
  jumpPageInput.value = String(currentPage.value)
}

const changePageSize = () => {
  currentPage.value = 1
  jumpPageInput.value = '1'
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
  activeScope,
  () => {
    reportSearch.value = ''
    yearFilter.value = ''
    quarterFilter.value = ''
    reportTypeFilter.value = ''
    statusFilter.value = ''
    fetchedAtSort.value = 'desc'
    selectedReportId.value = currentCollection.value[0]?.id || null
    selectedNodeId.value = currentCollection.value[0]?.rawTables?.[0]?.id || null
    expandedReportId.value = null
    currentPage.value = 1
    jumpPageInput.value = '1'
  },
  { immediate: true },
)

watch(
  [reportSearch, yearFilter, quarterFilter, reportTypeFilter, statusFilter, fetchedAtSort],
  () => {
    currentPage.value = 1
    jumpPageInput.value = '1'
    expandedReportId.value = null
    activeHeaderFilter.value = ''
  },
)

watch(
  selectedReport,
  (report) => {
    selectedNodeId.value = report?.targetTables?.[0]?.id || report?.rawTables?.[0]?.id || null
    fullResultNodeId.value = report?.fullResultTree?.[0]?.id || report?.rawTables?.[0]?.id || null
    expandedFullResultNodeIds.value = (report?.fullResultTree || [])
      .filter((item) => item.children?.length)
      .map((item) => item.id)
    nodeKeyword.value = ''
  },
  { immediate: true },
)

watch(
  filteredParseNodes,
  (nodes) => {
    if (!nodes.length) {
      selectedNodeId.value = null
      return
    }
    if (!nodes.find((item) => item.id === selectedNodeId.value)) {
      selectedNodeId.value = nodes[0].id
    }
  },
  { immediate: true },
)

watch(filteredReports, () => {
  syncPagination()
})
</script>

<template>
  <main class="module-main" @click="closeHeaderFilter">
    <section class="library-workspace">
      <div class="workbench-top">
        <div class="workbench-head">
          <span class="hero-label">REPORT LIBRARY</span>
          <h1>报告库</h1>
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

      <section class="library-finance-layout">
        <section class="workbench-panel library-list-panel">
          <div class="panel-head">
            <div>
              <span>{{ activeScope === 'public' ? '公众报告' : '非公众报告' }}</span>
              <h2>报告清单</h2>
            </div>
          </div>

          <div class="library-search-bar">
            <input
              v-model="reportSearch"
              type="text"
              placeholder="搜索主体名称"
            />
          </div>

          <div class="library-table-wrap">
            <table class="history-table library-table">
              <thead>
                <tr>
                  <th>主体名称</th>
                  <th>
                    <div class="library-th-filter compact">
                      <button class="library-th-trigger" type="button" @click.stop="toggleHeaderFilter('year')">
                        <span>年份</span>
                        <span class="library-th-icon">▼</span>
                      </button>
                      <div v-if="activeHeaderFilter === 'year'" class="library-th-popover" @click.stop>
                        <button class="library-th-option" type="button" @click="yearFilter = ''; closeHeaderFilter()">全部</button>
                        <button
                          v-for="year in yearOptions"
                          :key="year"
                          :class="['library-th-option', { active: yearFilter === year }]"
                          type="button"
                          @click="yearFilter = year; closeHeaderFilter()"
                        >
                          {{ year }}
                        </button>
                      </div>
                    </div>
                  </th>
                  <th>
                    <div class="library-th-filter compact">
                      <button class="library-th-trigger" type="button" @click.stop="toggleHeaderFilter('quarter')">
                        <span>季度</span>
                        <span class="library-th-icon">▼</span>
                      </button>
                      <div v-if="activeHeaderFilter === 'quarter'" class="library-th-popover" @click.stop>
                        <button class="library-th-option" type="button" @click="quarterFilter = ''; closeHeaderFilter()">全部</button>
                        <button
                          v-for="quarter in quarterOptions"
                          :key="quarter"
                          :class="['library-th-option', { active: quarterFilter === quarter }]"
                          type="button"
                          @click="quarterFilter = quarter; closeHeaderFilter()"
                        >
                          {{ quarter }}
                        </button>
                      </div>
                    </div>
                  </th>
                  <th>
                    <div class="library-th-filter compact">
                      <button class="library-th-trigger" type="button" @click.stop="toggleHeaderFilter('reportType')">
                        <span>报告类型</span>
                        <span class="library-th-icon">▼</span>
                      </button>
                      <div v-if="activeHeaderFilter === 'reportType'" class="library-th-popover" @click.stop>
                        <button class="library-th-option" type="button" @click="reportTypeFilter = ''; closeHeaderFilter()">全部</button>
                        <button
                          v-for="type in reportTypeOptions"
                          :key="type"
                          :class="['library-th-option', { active: reportTypeFilter === type }]"
                          type="button"
                          @click="reportTypeFilter = type; closeHeaderFilter()"
                        >
                          {{ type }}
                        </button>
                      </div>
                    </div>
                  </th>
                  <th>
                    <div class="library-th-filter compact">
                      <button class="library-th-trigger" type="button" @click.stop="toggleHeaderFilter('status')">
                        <span>解析状态</span>
                        <span class="library-th-icon">▼</span>
                      </button>
                      <div v-if="activeHeaderFilter === 'status'" class="library-th-popover" @click.stop>
                        <button class="library-th-option" type="button" @click="statusFilter = ''; closeHeaderFilter()">全部</button>
                        <button
                          v-for="status in statusOptions"
                          :key="status"
                          :class="['library-th-option', { active: statusFilter === status }]"
                          type="button"
                          @click="statusFilter = status; closeHeaderFilter()"
                        >
                          {{ status }}
                        </button>
                      </div>
                    </div>
                  </th>
                  <th>
                    <button class="library-th-trigger sort-only" type="button" @click.stop="fetchedAtSort = fetchedAtSort === 'desc' ? 'asc' : 'desc'">
                      <span>上传时间</span>
                      <span class="library-th-icon">{{ fetchedAtSort === 'desc' ? '↓' : '↑' }}</span>
                    </button>
                  </th>
                  <th>查看全量解析结果</th>
                  <th>查看表格解析结果</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in paginatedReports" :key="row.id">
                  <tr
                    :class="{ active: selectedReport?.id === row.id }"
                    @click="handleReportRowClick(row)"
                  >
                    <td>
                      <strong>{{ row.companyName }}</strong>
                      <small>{{ row.reportName }}</small>
                    </td>
                    <td>{{ row.year }}</td>
                    <td>{{ row.quarter }}</td>
                    <td>{{ row.reportType }}</td>
                    <td>
                      <button
                        :class="['library-status-trigger', { clickable: canOpenResult(row) }]"
                        type="button"
                        :disabled="!canOpenResult(row)"
                        :title="canOpenResult(row) ? '点击展开表格统计' : '仅已完成报告可查看统计明细'"
                        @click.stop="toggleExpandedRow(row)"
                      >
                        {{ row.parseStatus }}
                      </button>
                    </td>
                    <td>{{ row.fetchedAt }}</td>
                    <td>
                      <button
                        :class="['ghost-action-btn', { disabled: !canOpenResult(row) }]"
                        type="button"
                        :disabled="!canOpenResult(row)"
                        :title="canOpenResult(row) ? '查看全量解析结果' : '仅已完成报告可查看'"
                        @click.stop="openFullResultModal(row)"
                      >
                        查看全量解析结果
                      </button>
                    </td>
                    <td>
                      <button
                        :class="['ghost-action-btn', 'primary', { disabled: !canOpenResult(row) }]"
                        type="button"
                        :disabled="!canOpenResult(row)"
                        :title="canOpenResult(row) ? '查看表格解析结果' : '仅已完成报告可查看'"
                        @click.stop="selectReport(row.id); openParseResultModal()"
                      >
                        查看表格解析结果
                      </button>
                    </td>
                  </tr>
                  <tr v-if="expandedReportId === row.id" class="library-expand-row">
                    <td colspan="8">
                      <div class="library-expand-content">
                        <span>原始表格数量：<strong>{{ row.rawTableCount }}</strong></span>
                        <span>目标表格数量：<strong>{{ row.targetTableCount }}</strong></span>
                        <span>命中表格数量：<strong>{{ row.matchedTableCount }}</strong></span>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="!filteredReports.length">
                  <td colspan="8" class="empty-row">暂无匹配的报告</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="history-pagination library-pagination">
            <span>共 <b>{{ totalReportCount }}</b> 条，当前第 <b>{{ currentPage }}</b> / <b>{{ totalPages }}</b> 页</span>
            <div class="history-pagination-controls">
              <span>每页</span>
              <select v-model.number="pageSize" @change="changePageSize">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <span>条</span>
              <button type="button" :disabled="currentPage <= 1" @click="goToPrevPage">上一页</button>
              <button type="button" :disabled="currentPage >= totalPages" @click="goToNextPage">下一页</button>
              <span>跳至</span>
              <input v-model="jumpPageInput" type="text" inputmode="numeric" />
              <span>页</span>
              <button type="button" @click="submitJumpPage">确定</button>
            </div>
          </div>
        </section>
      </section>

      <div v-if="showFullResultModal && selectedReport" class="library-modal-mask" @click.self="closeFullResultModal">
        <section class="library-modal library-full-result-modal">
          <div class="library-modal-head">
            <div>
              <span>全量解析结果</span>
              <h2>{{ selectedReport.reportName }}</h2>
            </div>
            <button class="library-modal-close" type="button" @click="closeFullResultModal">×</button>
          </div>

          <div class="library-full-result-grid detailed">
            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>目录树</span>
                <h3>章节 / 表格目录</h3>
              </div>
              <div class="library-node-list">
                <button
                  v-for="node in visibleFullResultNodes"
                  :key="node.id"
                  :class="['library-node-item', { active: selectedFullResultNode?.id === node.id }]"
                  type="button"
                  @click="toggleFullResultNode(node)"
                  :style="{ paddingLeft: `${16 + node.depth * 22}px` }"
                >
                  <strong>
                    {{ node.hasChildren ? (expandedFullResultNodeIds.includes(node.id) ? '▾ ' : '▸ ') : '' }}{{ node.title }}
                  </strong>
                  <span>页码：{{ node.pageRange }}</span>
                  <small>{{ node.location }}</small>
                </button>
                <div v-if="!visibleFullResultNodes.length" class="library-empty-table compact">
                  当前报告暂无目录树节点
                </div>
              </div>
            </article>

            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>原文输出</span>
                <h3>{{ selectedFullResultNode?.title || '当前目录内容' }}</h3>
              </div>
              <div class="library-view-mode-switch">
                <button
                  :class="['library-view-mode-btn', { active: fullResultViewMode === 'markdown' }]"
                  type="button"
                  @click="fullResultViewMode = 'markdown'"
                >
                  Markdown
                </button>
                <button
                  :class="['library-view-mode-btn', { active: fullResultViewMode === 'json' }]"
                  type="button"
                  @click="fullResultViewMode = 'json'"
                >
                  JSON
                </button>
              </div>
              <div class="library-full-result-content">
                <pre v-if="fullResultViewMode === 'json'" class="library-code-block">{{ fullResultJsonPreview }}</pre>
                <pre v-else class="library-code-block">{{ selectedFullResultNode?.markdown || '当前目录暂无 markdown 内容' }}</pre>
              </div>
            </article>

            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>原始 PDF</span>
                <h3>原文预览 / 目录定位</h3>
              </div>
              <div class="library-document-preview">
                <div class="library-pdf-frame-wrap">
                  <iframe
                    v-if="fullResultPdfEmbedUrl"
                    :key="fullResultPdfEmbedUrl"
                    :src="fullResultPdfEmbedUrl"
                    class="library-pdf-frame"
                    title="全量结果PDF预览"
                  />
                  <div v-else class="library-document-page">
                    <strong>{{ selectedReport.pdfPreview.fileName }}</strong>
                    <span>暂无可用 PDF 链接</span>
                    <span>{{ selectedFullResultNode?.location || '--' }}</span>
                  </div>
                </div>
                <div class="library-document-meta">
                  <span>{{ selectedReport.pdfPreview.fileName }}</span>
                  <span>当前目录：{{ selectedFullResultNode?.title || '未选择' }}</span>
                  <span>定位：{{ selectedFullResultNode?.pageRange || '--' }} / {{ selectedFullResultNode?.location || '--' }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      <div v-if="showParseResultModal && selectedReport" class="library-modal-mask" @click.self="closeParseResultModal">
        <section class="library-modal">
          <div class="library-modal-head">
            <div>
              <span>解析结果</span>
              <h2>{{ selectedReport.reportName }}</h2>
            </div>
            <button class="library-modal-close" type="button" @click="closeParseResultModal">×</button>
          </div>

          <div class="library-modal-kpis">
            <article class="library-modal-kpi">
              <span>原始表格数量</span>
              <strong>{{ selectedReport.rawTableCount }}</strong>
            </article>
            <article class="library-modal-kpi">
              <span>目标表格数量</span>
              <strong>{{ selectedReport.targetTableCount }}</strong>
            </article>
            <article class="library-modal-kpi">
              <span>命中表格数量</span>
              <strong>{{ selectedReport.matchedTableCount }}</strong>
            </article>
          </div>

          <div class="library-preview-grid">
            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>目标表名</span>
                <h3>表名</h3>
              </div>
              <div class="library-node-filter">
                <input
                  v-model="nodeKeyword"
                  type="text"
                  placeholder="搜索表名"
                />
              </div>
              <div class="library-node-list">
                <button
                  v-for="node in filteredParseNodes"
                  :key="node.id"
                  :class="['library-node-item', { active: selectedNode?.id === node.id }]"
                  type="button"
                  @click="selectedNodeId = node.id"
                >
                  <strong>{{ node.name }}</strong>
                  <span>页码：{{ node.pageRange }}</span>
                  <small>{{ node.location }}</small>
                </button>
                <div v-if="!filteredParseNodes.length" class="library-empty-table compact">
                  当前报告暂无可结构化目标表
                </div>
              </div>
            </article>

            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>原始 PDF</span>
                <h3>原文预览</h3>
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
                  <span>当前表名：{{ selectedNode?.name || '未选择' }}</span>
                  <span>原始报告定位：{{ selectedNode?.pageRange || '--' }} / {{ selectedNode?.location || '--' }}</span>
                </div>
              </div>
            </article>

            <article class="library-result-card">
              <div class="library-result-card-head">
                <span>原始表格</span>
                <h3>当前表对应的原文输出</h3>
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
                <h3>当前表对应的结构化输出</h3>
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
