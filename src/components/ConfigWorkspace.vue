<script setup>
defineProps({
  configReportTypes: { type: Array, required: true },
  activeConfigReport: { type: String, required: true },
  activeConfigSection: { type: String, required: true },
  activeConfigMeta: { type: Object, required: true },
  tableConfigSearch: { type: String, required: true },
  fieldConfigSearch: { type: String, required: true },
  fieldExposureFilter: { type: String, required: true },
  fieldTableFilter: { type: String, required: true },
  fieldExposureOptions: { type: Array, required: true },
  fieldTableOptions: { type: Array, required: true },
  filteredTargetTableConfigs: { type: Array, required: true },
  activeTargetTableConfigs: { type: Array, required: true },
  filteredTargetFieldConfigs: { type: Array, required: true },
  activeTargetFieldConfigs: { type: Array, required: true },
  paginatedTargetTableConfigs: { type: Array, required: true },
  paginatedTargetFieldConfigs: { type: Array, required: true },
  tableConfigTotalCount: { type: Number, required: true },
  tableConfigCurrentPage: { type: Number, required: true },
  tableConfigTotalPages: { type: Number, required: true },
  tableConfigPageSize: { type: Number, required: true },
  tableConfigJumpPageInput: { type: String, required: true },
  fieldConfigTotalCount: { type: Number, required: true },
  fieldConfigCurrentPage: { type: Number, required: true },
  fieldConfigTotalPages: { type: Number, required: true },
  fieldConfigPageSize: { type: Number, required: true },
  fieldConfigJumpPageInput: { type: String, required: true },
  splitRuleTokens: { type: Function, required: true },
  limitedRuleTokens: { type: Function, required: true },
  hiddenRuleTokenCount: { type: Function, required: true },
})

const emit = defineEmits([
  'switch-config-report',
  'update:active-config-section',
  'update:table-config-search',
  'reset-table-config-pagination',
  'open-config-drawer',
  'open-delete-config',
  'update:field-config-search',
  'update:field-exposure-filter',
  'update:field-table-filter',
  'reset-field-config-pagination',
  'update:table-config-page-size',
  'change-table-config-page-size',
  'table-config-prev-page',
  'table-config-next-page',
  'update:table-config-jump-page-input',
  'submit-table-config-jump-page',
  'update:field-config-page-size',
  'change-field-config-page-size',
  'field-config-prev-page',
  'field-config-next-page',
  'update:field-config-jump-page-input',
  'submit-field-config-jump-page',
])
</script>

<template>
  <main class="module-main">
    <section class="config-workspace">
      <div class="workbench-top">
        <div class="workbench-head">
          <span class="hero-label">PARSING CONFIGURATION</span>
          <h1>解析配置</h1>
          <p>参考目标表任务定义与字段映射规则，统一维护四类报告的目标表配置与目标字段配置。</p>
        </div>
      </div>

      <section class="workbench-panel config-switch-panel">
        <div class="config-type-grid">
          <button
            v-for="item in configReportTypes"
            :key="item.key"
            :class="['config-type-card', { active: activeConfigReport === item.key }]"
            type="button"
            @click="emit('switch-config-report', item.key)"
          >
            <span>{{ item.tag }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </button>
        </div>
      </section>

      <section class="workbench-panel config-tabs-panel">
        <div class="config-view-tabs">
          <button :class="['config-view-tab', { active: activeConfigSection === 'table' }]" type="button" @click="emit('update:active-config-section', 'table')">
            目标表配置
          </button>
          <button :class="['config-view-tab', { active: activeConfigSection === 'field' }]" type="button" @click="emit('update:active-config-section', 'field')">
            目标字段配置
          </button>
        </div>
      </section>

      <section v-if="activeConfigSection === 'table'" class="workbench-panel config-panel">
        <div class="panel-head config-panel-head">
          <div>
            <span>目标表清单</span>
            <h2>目标表配置</h2>
          </div>
          <div class="config-meta-card">
            <strong>{{ activeConfigMeta.title }}</strong>
            <span>{{ filteredTargetTableConfigs.length }} / {{ activeTargetTableConfigs.length }} 条目标表规则</span>
          </div>
        </div>

        <div class="config-toolbar">
          <label class="config-search">
            <input
              :value="tableConfigSearch"
              type="text"
              placeholder="搜索任务名称、标题编码、关键词..."
              @input="emit('update:table-config-search', $event.target.value); emit('reset-table-config-pagination')"
            />
          </label>
          <button class="quad-enter config-create-btn" type="button" @click="emit('open-config-drawer', 'table', 'create')">新增目标表</button>
        </div>

        <div class="config-table-wrap">
          <table class="config-table">
            <thead>
              <tr>
                <th>业务分类</th>
                <th>任务名称</th>
                <th>标题编码</th>
                <th>章节位置</th>
                <th>标题词袋</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in paginatedTargetTableConfigs"
                :key="`table-${activeConfigReport}-${row.id}`"
                class="config-row"
                @click="emit('open-config-drawer', 'table', 'view', row)"
              >
                <td>{{ row.bizTable }}</td>
                <td><strong>{{ row.taskName }}</strong></td>
                <td><span class="config-code">{{ row.titleCode }}</span></td>
                <td>{{ row.sectionTitle }}</td>
                <td>
                  <div class="config-chip-list compact">
                    <span
                      v-for="item in limitedRuleTokens(row.titleKeywords.replaceAll(' / ', '^|^'))"
                      :key="item"
                      class="config-chip"
                    >
                      {{ item }}
                    </span>
                    <span v-if="hiddenRuleTokenCount(row.titleKeywords.replaceAll(' / ', '^|^'))" class="config-chip more-chip">
                      +{{ hiddenRuleTokenCount(row.titleKeywords.replaceAll(' / ', '^|^')) }}...
                    </span>
                  </div>
                </td>
                <td>{{ row.updatedAt }}</td>
                <td @click.stop>
                  <div class="table-actions">
                    <button class="quad-link" type="button" @click="emit('open-config-drawer', 'table', 'edit', row)">编辑</button>
                    <button class="quad-link danger-link" type="button" @click="emit('open-delete-config', 'table', row)">删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredTargetTableConfigs.length">
                <td colspan="7" class="empty-row">暂无符合条件的目标表配置</td>
              </tr>
            </tbody>
          </table>

          <div class="history-pagination">
            <div class="pagination-summary">
              共 <strong>{{ tableConfigTotalCount }}</strong> 条，当前第
              <strong>{{ tableConfigCurrentPage }}</strong> / <strong>{{ tableConfigTotalPages }}</strong> 页
            </div>
            <div class="pagination-controls">
              <label class="page-size-select">
                <span>每页</span>
                <select :value="tableConfigPageSize" @change="emit('update:table-config-page-size', Number($event.target.value)); emit('change-table-config-page-size')">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span>条</span>
              </label>
              <button class="quad-link page-btn" type="button" :disabled="tableConfigCurrentPage === 1" @click="emit('table-config-prev-page')">上一页</button>
              <button class="quad-link page-btn" type="button" :disabled="tableConfigCurrentPage === tableConfigTotalPages" @click="emit('table-config-next-page')">下一页</button>
              <form class="jump-form" @submit.prevent="emit('submit-table-config-jump-page')">
                <span>跳至</span>
                <input
                  :value="tableConfigJumpPageInput"
                  type="number"
                  min="1"
                  :max="tableConfigTotalPages"
                  @input="emit('update:table-config-jump-page-input', $event.target.value)"
                />
                <span>页</span>
                <button class="quad-link page-btn" type="submit">确定</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="workbench-panel config-panel">
        <div class="panel-head config-panel-head">
          <div>
            <span>目标字段</span>
            <h2>目标字段配置</h2>
          </div>
          <div class="config-meta-card">
            <strong>{{ activeConfigMeta.title }}</strong>
            <span>{{ filteredTargetFieldConfigs.length }} / {{ activeTargetFieldConfigs.length }} 条字段映射规则</span>
          </div>
        </div>

        <div class="config-toolbar">
          <label class="config-search">
            <input
              :value="fieldConfigSearch"
              type="text"
              placeholder="搜索标准科目、OCR别名、映射code..."
              @input="emit('update:field-config-search', $event.target.value); emit('reset-field-config-pagination')"
            />
          </label>
          <select
            :value="fieldExposureFilter"
            class="config-filter"
            @change="emit('update:field-exposure-filter', $event.target.value); emit('reset-field-config-pagination')"
          >
            <option v-for="item in fieldExposureOptions" :key="item">{{ item }}</option>
          </select>
          <select
            :value="fieldTableFilter"
            class="config-filter"
            @change="emit('update:field-table-filter', $event.target.value); emit('reset-field-config-pagination')"
          >
            <option v-for="item in fieldTableOptions" :key="item">{{ item }}</option>
          </select>
          <button class="quad-enter config-create-btn" type="button" @click="emit('open-config-drawer', 'field', 'create')">添加新映射</button>
        </div>

        <div class="config-table-wrap">
          <table class="config-table">
            <thead>
              <tr>
                <th>标准科目</th>
                <th>敞口</th>
                <th>前 CODE</th>
                <th>后 CODE</th>
                <th>OCR 原始识别科目</th>
                <th>财务表格</th>
                <th>code</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in paginatedTargetFieldConfigs"
                :key="`field-${activeConfigReport}-${row.id}`"
                class="config-row"
                @click="emit('open-config-drawer', 'field', 'view', row)"
              >
                <td>
                  <div class="field-standard-cell">
                    <span class="field-dot"></span>
                    <div>
                      <strong>{{ row.targetSubject }}</strong>
                      <small>{{ row.adpSubject }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ row.exposure }}</td>
                <td>{{ row.preCode || '-' }}</td>
                <td>{{ row.postCode || '-' }}</td>
                <td>
                  <div class="config-chip-list compact">
                    <span v-for="item in limitedRuleTokens(row.keywordBag, 5)" :key="item" class="config-chip">{{ item }}</span>
                    <span v-if="hiddenRuleTokenCount(row.keywordBag, 5)" class="config-chip more-chip">
                      +{{ hiddenRuleTokenCount(row.keywordBag, 5) }}...
                    </span>
                  </div>
                </td>
                <td><span class="config-table-tag">{{ row.structTitle }}</span></td>
                <td>{{ row.finalCode }}</td>
                <td @click.stop>
                  <div class="table-actions">
                    <button class="quad-link" type="button" @click="emit('open-config-drawer', 'field', 'edit', row)">编辑</button>
                    <button class="quad-link danger-link" type="button" @click="emit('open-delete-config', 'field', row)">删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredTargetFieldConfigs.length">
                <td colspan="8" class="empty-row">暂无符合条件的目标字段配置</td>
              </tr>
            </tbody>
          </table>

          <div class="history-pagination">
            <div class="pagination-summary">
              共 <strong>{{ fieldConfigTotalCount }}</strong> 条，当前第
              <strong>{{ fieldConfigCurrentPage }}</strong> / <strong>{{ fieldConfigTotalPages }}</strong> 页
            </div>
            <div class="pagination-controls">
              <label class="page-size-select">
                <span>每页</span>
                <select :value="fieldConfigPageSize" @change="emit('update:field-config-page-size', Number($event.target.value)); emit('change-field-config-page-size')">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span>条</span>
              </label>
              <button class="quad-link page-btn" type="button" :disabled="fieldConfigCurrentPage === 1" @click="emit('field-config-prev-page')">上一页</button>
              <button class="quad-link page-btn" type="button" :disabled="fieldConfigCurrentPage === fieldConfigTotalPages" @click="emit('field-config-next-page')">下一页</button>
              <form class="jump-form" @submit.prevent="emit('submit-field-config-jump-page')">
                <span>跳至</span>
                <input
                  :value="fieldConfigJumpPageInput"
                  type="number"
                  min="1"
                  :max="fieldConfigTotalPages"
                  @input="emit('update:field-config-jump-page-input', $event.target.value)"
                />
                <span>页</span>
                <button class="quad-link page-btn" type="submit">确定</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
