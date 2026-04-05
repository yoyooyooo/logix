# Watcher 性能与 Flow（impl）（LLM 薄入口）

本文件只保留导航；正文拆分到同目录分节文档中，按需加载。

## 边界与外链（避免重复叙述）

- Flow/Watcher 的公共 API 口径：`../api/03-logic-and-flow.md`
- 事务窗口与“长链路 = 多次入口”的约束口径：`../runtime/05-runtime-implementation.01-module-runtime-make.md`
- 本目录仅补充性能模型、成本拆解与调优抓手；若结论影响公共契约，回写到 runtime SSoT 再改实现

## 最短链路

- 我在定位 dispatch→watcher handler 的链路：读 `04-watcher-performance-and-flow.01-dispatch-to-handler.md`
- 我在看性能模型/调优建议：读 `04-watcher-performance-and-flow.02-cost-model.md` → `04-watcher-performance-and-flow.04-tuning-guidance.md`

## 分节索引

- `04-watcher-performance-and-flow.01-dispatch-to-handler.md`
- `04-watcher-performance-and-flow.02-cost-model.md`
- `04-watcher-performance-and-flow.03-browser-benchmark.md`
- `04-watcher-performance-and-flow.04-tuning-guidance.md`
