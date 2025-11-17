# 7. 实施路线图回顾（Phase 1 → 3）

结合主线文档，本补篇推荐的实施顺序是：

1. **Phase 1：IDE Copilot（Headless）**
   - 以单文件 Copilot 为主，验证 Bound API 对 LLM 的友好度；
   - 关键指标：`Pass@1`（TSC + Parser 同时通过的比例）与 Fluent 白盒覆盖率。

2. **Phase 2：Canvas Orchestrator（Galaxy View 集成）**
   - 在 Galaxy View 中挂载 Agent，允许用户对单条规则发起自然语言修改请求；
   - Agent 基于 AST + IntentRule 做局部 patch，Parser 校验后更新 Graph；
   - Eject / Raw Block 只提供“跳转代码”和“Eject 到代码”的交互，不提供可视化编辑。

3. **Phase 3：Semantic Refactoring（语义级重构）**
   - Agent 在 IR / Module / 拓扑层面规划重构（例如拆 Module / 抽 Pattern），再下沉到具体代码 patch；
   - 必须依托 IntentRule 拓扑与 Module 关系，而不是纯文本/AST 重写；
   - 关键指标：典型业务 Flow 的回归脚本通过率与 Graph 拓扑稳定性。

通过以上“立法 → 执法 → 上岗”的路径，可以保证：

- 对人类开发者：始终可以在类型与文档层清晰理解 Agent 的权限与行为边界；
- 对平台：Parser 与 IntentRule 成为统一事实源，不被 Agent 的实现细节牵着走；
- 对 Agent：拥有清晰的五种技能与写作子集，不必猜测哪些写法是“平台可接受的”。
