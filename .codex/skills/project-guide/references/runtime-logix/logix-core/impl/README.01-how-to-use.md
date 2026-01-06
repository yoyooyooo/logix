# 使用方式

- 当我们在讨论 **App/Module/Store 模块体系、Logic Middleware、Store 生命周期、调试/诊断机制** 等「架构级」能力时，**务必同步在本目录下补一份实现备忘**：
  - 描述预期的 Effect/Layer/Scope 组合方式；
  - 标出可能的坑（性能、可观测性、错误语义、与平台解析的耦合点等）；
  - 若有多种实现路径，明确当前“首选方案”与备选方案。
- 本目录中的文档可以比上一级 `../`（`logix-core/`）下的规范 **更细、更偏工程实现**，但一旦发现与核心规范冲突，应先修 `logix-core/` 规范，再修这里。

## 分层与回写规则（避免漂移）

- **Runtime SSoT（契约/语义口径）优先**：
  - 事务窗口/收敛窗口/0-1 commit/禁止 IO 等不变量，统一以 `../runtime/*` 与 `docs/specs/sdd-platform/ssot/contracts/00-execution-model.md` 为准；
  - Devtools 可导出事件与裁剪规则，统一以 `../observability/*` 为准。
- **impl 文档的定位**：只补充“为什么这样实现 / 风险点 / 性能与诊断代价 / 调试抓手 / 源码锚点”，尽量用**外链 + 说明**代替重复叙述契约。
- **冲突处理**：当 impl 与 SSoT 或 TypeScript 类型提示不一致时，先修 SSoT/类型，再回写 impl（impl 不应成为第二真相源）。
