# Research: 文档内联教学 Playground

**Date**: 2025-12-26  
**Feature**: [041-docs-inline-playground](./plan.md)

## Decision 1: 作者标记方式采用“显式 MDX 组件”

**Decision**: MVP 使用显式的 MDX 组件（例如 `<Playground ... />`）来标记可运行示例块与其配置（观察点/面板/难度级别），而不是在第一版就改造所有代码块渲染规则。

**Rationale**:
- 降低对 Markdown/代码块解析管线的侵入性，便于快速落地与迭代；
- 作者意图（观察点/默认面板/难度级别/运行配置）本质上是结构化数据，显式组件更清晰、更可校验；
- 后续如需更自然的写法，可在第二阶段再支持 “code fence meta → 组件” 的语法糖。

**Alternatives considered**:
- 解析 code fence meta（如 ```ts playground ...```）并在 `pre/code` 渲染层做条件替换：作者体验更像“代码块增强”，但需要更深的渲染管线理解与兼容性验证。

## Decision 2: 运行底座复用 `@logixjs/sandbox` 的 TrialRun 能力

**Decision**: 文档 Playground 运行使用 `@logixjs/sandbox` 的 `SandboxClient.trialRunModule(...)` 作为主入口（编译 + Worker 执行 + 结构化 RunResult 回传）。

**Rationale**:
- 复用现有 Worker Sandbox、编译与试运行协议，避免再造“第二套 runner”；与仓库的 Playground/Alignment Lab 方向一致；
- `trialRunModule` 已提供 `diagnosticsLevel / maxEvents / budgets(maxBytes)` 等控制面，可直接支撑“教学默认轻量、输出有界、按需高级观测”的目标。

**Alternatives considered**:
- 仅使用 `compile()` + `run()`：更通用，但需要自行封装“模块试运行/结果摘要/预算控制”等逻辑，重复建设。

## Decision 3: 运行资产采用“同源静态资源”以保证可复现

**Decision**: 文档站点通过同步 `packages/logix-sandbox/public/**` 到 `apps/docs/public/**` 来提供 kernel/worker/esbuild.wasm 等运行资产，确保同源加载，避免依赖外部 CDN。

**Rationale**:
- 教学文档的在线运行应尽量可复现；外部 CDN 会引入不可控变更与可用性风险；
- `SandboxClient` 的默认约定（`/sandbox/logix-core.js`、同目录 `worker.js`、`/esbuild.wasm`）与现有 public 资产布局天然匹配。

**Alternatives considered**:
- 运行时通过外部 CDN 拉取依赖：实现更省事，但不可控、不稳定，与“默认可复现”目标冲突。

## Decision 4: 取消与输出上限采用“双层兜底”

**Decision**:
- 取消：MVP 以“重置 Worker（销毁并重建 client/worker）”作为可靠兜底取消方式；
- 输出上限：同时使用 TrialRun 预算参数（maxEvents / maxBytes）与文档侧 ring buffer（只保留最近 N 条输出/trace）防止 UI 与内存失控。

**Rationale**:
- 当前 Sandbox 的 `TERMINATE` 语义不足以保证中断正在运行的程序时，重置 Worker 是更强的安全阀；
- 双层上限可以覆盖 “运行端未严格限流” 与 “UI 层误存储” 两类风险。

**Alternatives considered**:
- 仅依赖 Sandbox 内部 terminate/限流：实现更纯粹，但若实现不完备容易造成卡死与内存膨胀。

## Decision 5: 教学默认面板与高级观测按块启用

**Decision**: PlaygroundBlock 配置默认仅展示教学面板（说明/观察点、控制台、结果/状态摘要），高级观测（时间线/Trace/事件摘要）仅在作者标记为高级/Debug 的块中启用。

**Rationale**:
- 降低入门文档认知负担；避免为高级能力支付默认性能成本；
- 与 spec 的“教学优先 + 高级按需”裁决一致。

**Alternatives considered**:
- 所有示例默认展示全量观测：学习曲线陡峭，且对页面性能与信息噪声不友好。

## Decision 6: `runId` 必须由文档侧显式提供（确定性）

**Decision**: 文档侧为每个 PlaygroundBlock 派生稳定 blockId，并用本地递增序号生成 runId（例如 `${blockId}::r${seq}`），禁止依赖默认的时间戳生成。

**Rationale**:
- 满足“稳定标识、可复现”的宪法约束；
- 便于把输出/trace 与具体示例块、具体运行轮次关联起来。

**Alternatives considered**:
- 使用默认 `Date.now()`：实现简单，但不满足确定性与可比对需求。
