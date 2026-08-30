<script setup>
const technologies = [
  {
    key: 'pageindex',
    title: 'PageIndex｜长文档结构理解与精准定位',
    description: '面向年报、招股说明书等数百页长文档，基于 PageIndex 对目录、章节层级和内容结构进行解析，快速定位财务报表、附注及目标章节，为后续表格识别和结构化提取提供准确的页面范围。',
    tags: ['章节识别', '目录解析', '页面定位', '长文档理解'],
  },
  {
    key: 'ocr',
    title: 'MinerU + OCR｜复杂版面与表格识别',
    description: '结合 MinerU 与 OCR 识别能力，对 PDF 中的文本、表格及复杂版面进行解析，并针对扫描件、跨页表格等场景进行识别补充，尽可能保留原始财务文档的结构、行列关系和数据内容。',
    tags: ['版面分析', 'OCR识别', '表格还原', '扫描件支持'],
  },
  {
    key: 'mapping',
    title: 'AI + 财务规则｜原始数据智能标准化',
    description: '结合财务科目词袋、规则匹配和 AI 语义理解能力，对不同公司、不同格式、不同命名方式的财务数据进行识别和归一，将原始报表自动映射至内部标准目标表和目标字段。',
    tags: ['语义匹配', '科目归一', '目标表映射', '字段标准化'],
  },
  {
    key: 'output',
    title: '结构化输出｜从解析结果到可用数据',
    description: '平台对识别得到的原始表格和目标字段结果进行统一展示与结构化整理，在保留原始识别内容的基础上，支持按报告、章节及目标表查看解析结果，并提供 Excel、JSON、Markdown 等多种格式输出，便于后续使用和数据流转。',
    tags: ['原始表格', '结构化结果', '多格式输出', '结果下载'],
  },
]

const processSteps = [
  ['文档上传', 'PDF / 财务文档'],
  ['文档解析', '结构与版面分析'],
  ['章节定位', '定位目标章节'],
  ['表格识别', '还原原始表格'],
  ['目标表匹配', '映射标准结构'],
  ['结构化输出', '原始表格及目标字段结果展示，支持 Excel / JSON / Markdown 下载'],
  ['下游同步', '财报智评 / 财报数仓'],
]
</script>

<template>
  <section class="technology-intro" aria-labelledby="technology-intro-title">
    <header class="technology-intro-heading">
      <h2 id="technology-intro-title">智能解析，让财务文档真正成为可用数据</h2>
      <p>面向年报、审计报告、招股说明书及港股财报等复杂财务文档，iDoc 结合文档结构解析、OCR、AI 语义理解及财务规则能力，实现从原始 PDF 到标准化财务数据的自动处理。</p>
    </header>

    <article
      v-for="(technology, index) in technologies"
      :key="technology.key"
      :class="['technology-row', { reverse: index % 2 === 1 }]"
    >
      <div class="technology-copy">
        <h3>{{ technology.title }}</h3>
        <p>{{ technology.description }}</p>
        <div class="technology-tags">
          <span v-for="tag in technology.tags" :key="tag">{{ tag }}</span>
        </div>
      </div>

      <div :class="['technology-animation', `technology-animation-${technology.key}`]" aria-hidden="true">
        <template v-if="technology.key === 'pageindex'">
          <div class="pageindex-document"><strong>2024年度报告</strong><span>238 Pages</span><i>PDF</i></div>
          <div class="pageindex-arrow">→</div>
          <div class="pageindex-tree">
            <span class="tree-root">年度报告</span>
            <span class="tree-branch">财务报告</span>
            <span class="tree-target">合并资产负债表</span>
          </div>
          <div class="pageindex-location"><strong>P89</strong><span>定位成功 ✓</span></div>
        </template>

        <template v-else-if="technology.key === 'ocr'">
          <div class="ocr-page">
            <span class="ocr-title-line"></span><span class="ocr-text-line line-one"></span><span class="ocr-text-line line-two"></span>
            <div class="ocr-source-table"><i v-for="cell in 12" :key="cell"></i></div>
            <span class="ocr-detection title-box"></span><span class="ocr-detection text-box"></span><span class="ocr-detection table-box"></span>
          </div>
          <div class="ocr-extract-arrow">→</div>
          <div class="ocr-output-table"><span v-for="cell in 12" :key="cell" :class="{ head: cell <= 3 }"></span></div>
        </template>

        <template v-else-if="technology.key === 'mapping'">
          <div class="mapping-aliases"><span>营业收入</span><span>营业总收入</span><span>其中：营业收入</span><span>主营业务收入</span></div>
          <div class="mapping-engine"><strong>AI</strong><span>+ Rules</span></div>
          <div class="mapping-result"><small>标准字段</small><strong>营业收入</strong><span>字段编码：AN15</span><span>单位：万元</span></div>
        </template>

        <template v-else-if="technology.key === 'output'">
          <div class="output-source">
            <small>PDF 解析结果</small>
            <strong>原始表格</strong>
            <div class="output-mini-table"><i v-for="cell in 12" :key="cell" :class="{ head: cell <= 3 }"></i></div>
          </div>
          <div class="output-arrow">→</div>
          <div class="output-structured"><small>目标字段结果</small><strong>结构化结果</strong><span>营业收入</span><span>AN15</span></div>
          <div class="output-arrow">→</div>
          <div class="output-formats">
            <div><i>X</i><span>Excel</span></div>
            <div><i>{ }</i><span>JSON</span></div>
            <div><i>M↓</i><span>Markdown</span></div>
            <strong>可查看 · 可下载 · 可用于下游</strong>
          </div>
        </template>
      </div>
    </article>

    <footer class="technology-process">
      <div class="technology-process-copy">
        <h3>从原始文档到标准化数据的一体化处理链路</h3>
        <p>通过文档结构理解、版面识别和智能映射，iDoc 将非结构化财务文档转换为可查询、可下载、可追溯、可同步的标准化数据，并支持向后续业务系统和数据仓库提供结果。</p>
      </div>
      <div class="technology-process-flow">
        <template v-for="(step, index) in processSteps" :key="step[0]">
          <div class="process-node"><span>{{ index + 1 }}</span><strong>{{ step[0] }}</strong><small>{{ step[1] }}</small></div>
          <i v-if="index < processSteps.length - 1">→</i>
        </template>
      </div>
    </footer>
  </section>
</template>
