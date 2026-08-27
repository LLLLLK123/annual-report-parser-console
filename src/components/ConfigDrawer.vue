<script setup>
defineProps({
  show: { type: Boolean, required: true },
  configDraft: { type: Object, default: null },
  configDrawerKind: { type: String, required: true },
  configDrawerMode: { type: String, required: true },
  splitRuleTokens: { type: Function, required: true },
})

const emit = defineEmits(['close', 'save'])
</script>

<template>
  <div v-if="show && configDraft" class="modal-mask config-drawer-mask" @click.self="emit('close')">
    <aside class="config-drawer">
      <div class="config-drawer-head">
        <div>
          <span class="login-kicker">{{ configDrawerKind === 'table' ? '目标表配置' : '目标字段配置' }}</span>
          <h2>
            {{
              configDrawerMode === 'create'
                ? configDrawerKind === 'table' ? '新增目标表规则' : '新增字段映射'
                : configDrawerMode === 'edit'
                  ? configDrawerKind === 'table' ? '编辑目标表规则' : '编辑映射关系'
                  : configDrawerKind === 'table' ? configDraft.taskName : configDraft.targetSubject
            }}
          </h2>
        </div>
        <button class="modal-close" type="button" @click="emit('close')">×</button>
      </div>

      <div v-if="configDrawerKind === 'table'" class="config-drawer-body">
        <div class="config-form-grid">
          <label class="field">
            <span>业务分类</span>
            <input v-model="configDraft.bizTable" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>任务名称</span>
            <input v-model="configDraft.taskName" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>标题编码</span>
            <input v-model="configDraft.titleCode" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>章节位置</span>
            <input v-model="configDraft.sectionTitle" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
        </div>

        <label class="field">
          <span>标题词袋</span>
          <textarea v-model="configDraft.titleKeywords" :readonly="configDrawerMode === 'view'" rows="3"></textarea>
        </label>

        <label class="field">
          <span>内容关键词</span>
          <textarea v-model="configDraft.contentKeywords" :readonly="configDrawerMode === 'view'" rows="3"></textarea>
        </label>

        <label class="field">
          <span>Prompt</span>
          <textarea v-model="configDraft.prompt" :readonly="configDrawerMode === 'view'" rows="6"></textarea>
        </label>

        <label class="field">
          <span>JSON Schema</span>
          <textarea v-model="configDraft.jsonSchema" :readonly="configDrawerMode === 'view'" rows="6"></textarea>
        </label>

        <label class="field">
          <span>JSON Example</span>
          <textarea v-model="configDraft.jsonExample" :readonly="configDrawerMode === 'view'" rows="5"></textarea>
        </label>

        <div class="config-form-grid">
          <label class="field">
            <span>正样例</span>
            <textarea v-model="configDraft.positiveExamples" :readonly="configDrawerMode === 'view'" rows="4"></textarea>
          </label>
          <label class="field">
            <span>负样例</span>
            <textarea v-model="configDraft.negativeExamples" :readonly="configDrawerMode === 'view'" rows="4"></textarea>
          </label>
        </div>
      </div>

      <div v-else class="config-drawer-body">
        <div class="config-form-grid">
          <label class="field">
            <span>标准科目名称</span>
            <input v-model="configDraft.targetSubject" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>所属敞口</span>
            <input v-model="configDraft.exposure" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>前 CODE</span>
            <input v-model="configDraft.preCode" :readonly="configDrawerMode === 'view'" type="text" placeholder="前置代码..." />
          </label>
          <label class="field">
            <span>后 CODE</span>
            <input v-model="configDraft.postCode" :readonly="configDrawerMode === 'view'" type="text" placeholder="后置代码..." />
          </label>
        </div>

        <div class="config-form-grid">
          <label class="field">
            <span>前置名称</span>
            <input v-model="configDraft.preName" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>后置名称</span>
            <input v-model="configDraft.postName" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
        </div>

        <label class="field">
          <span>所属财务表格</span>
          <input v-model="configDraft.structTitle" :readonly="configDrawerMode === 'view'" type="text" />
        </label>

        <label class="field">
          <span>OCR 原始识别关键词（使用 ^|^ 分隔）</span>
          <textarea v-model="configDraft.keywordBag" :readonly="configDrawerMode === 'view'" rows="5"></textarea>
        </label>

        <div class="config-alias-preview">
          <span>别名预览</span>
          <div class="config-chip-list">
            <span v-for="item in splitRuleTokens(configDraft.keywordBag)" :key="item" class="config-chip">
              {{ item }}
            </span>
          </div>
        </div>

        <div class="config-form-grid">
          <label class="field">
            <span>title 编码</span>
            <input v-model="configDraft.titleCode" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
          <label class="field">
            <span>ocr 编码</span>
            <input v-model="configDraft.ocrCode" :readonly="configDrawerMode === 'view'" type="text" />
          </label>
        </div>

        <label class="field">
          <span>最终映射 code</span>
          <input v-model="configDraft.finalCode" :readonly="configDrawerMode === 'view'" type="text" />
        </label>

        <label class="field">
          <span>规则说明</span>
          <textarea v-model="configDraft.prompt" :readonly="configDrawerMode === 'view'" rows="5"></textarea>
        </label>
      </div>

      <div class="config-drawer-actions">
        <button class="quad-link" type="button" @click="emit('close')">取消</button>
        <button v-if="configDrawerMode !== 'view'" class="primary-entry-btn" type="button" @click="emit('save')">保存修改</button>
      </div>
    </aside>
  </div>
</template>
