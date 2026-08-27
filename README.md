# 年报结构化抽取运营台（Vue 3 Prototype）

这是基于现有黑绿 UI 风格重构的 Vue 3 / Vite 原型。

## 页面

- 统计看板
- 年报任务列表
- 单份年报详情
  - 抽取概览
  - Task 匹配
  - 抽取结果
  - 异常 / 人工处理
- 抽取规则配置
- 新建解析任务弹窗

## 运行

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址。

## 当前数据

当前使用 `src/data/mock.js` 中的 mock 数据。
后端接入时建议优先替换为以下 API：

- GET `/api/reports` 年报任务列表
- GET `/api/reports/:id` 单份年报总览
- GET `/api/reports/:id/tasks` Task 匹配结果
- GET `/api/reports/:id/results` 抽取结果
- GET `/api/reports/:id/issues` 异常 / 待人工事项
- GET `/api/tasks` 抽取规则
- POST `/api/reports` 新建解析任务
- PUT `/api/tasks/:code` 修改规则

## 后台流程与页面语义建议

- 02/03 → 文档解析
- 04 → 内容识别
- 08 → 表格处理
- 14/16/17 → Task 匹配
- 24 + 附注抽取 → 数据抽取
- 后续 SQL / 入库节点 → 入库完成

页面避免直接暴露工作流节点编号；“高级信息”再展示 raw / processed / debug 等内部字段。
