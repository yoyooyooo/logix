---
title: IR 与 Codegen 实践手册
---

# IR 与 Codegen 实践手册

## 1) 目标

- 所有高层 DSL 都能降解到统一最小 IR。
- 保持单一事实源：`Static IR + Dynamic Trace`，不引入并行真相源。
- 让 parser/codegen 的结果可稳定对比、可回放、可解释。

## 2) 设计原则

- DSL 层只表达控制律，不夹带宿主细节。
- parser 只接受可静态识别的结构；无法识别的片段明确降级并打标。
- codegen 产物与 IR 一一对应，避免“运行时还能做另一套解释”。

## 3) 实施步骤

1. 定义 IR 资产与稳定标识（节点 id、边 id、版本号、digest）。
2. 建立 DSL → Static IR 的编译链（含 fail-fast 校验）。
3. 建立 runtime 执行轨迹 → Dynamic Trace 的采样链。
4. 关联 Static/Dynamic（通过稳定标识可回链）。
5. 对 parser/codegen 增加 golden-case 与 drift 检查。

## 4) 常见漂移与防线

- 漂移 A：同一 DSL 输入在不同环境产出不同 IR。
  - 防线：固定序列化顺序 + digest 对比 + snapshot 用例。
- 漂移 B：运行轨迹无法回链到静态定义。
  - 防线：trace 事件带稳定锚点（如 instance/txn/op + ir node）。
- 漂移 C：业务层绕过 DSL 直接写 runtime 私有逻辑。
  - 防线：把绕过路径视为违规，并在评审与诊断层显式标记。

## 5) 验收清单

- 同输入在同版本产出 IR digest 稳定。
- parser/codegen 的失败路径可解释（错误可定位到 DSL 输入）。
- Dynamic Trace 能回链到 Static IR 的关键节点。
- 回放链路可复现关键控制决策（不是“只复现结果”）。
