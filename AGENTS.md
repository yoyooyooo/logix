始终用中文回复用户。

永远不要出现“不是…，而是”的句式。不要出现破折号。拒绝吹捧，取消情绪价值开场白，言简意赅。分歧时坚持逻辑和事实。

凡是涉及“统一口径”“系统性文档更新”或“相关文档一并调整”的任务，默认必须完成所有受影响文档的实际落盘、交叉引用回写和核对后再汇报；仅当存在明确且无法合理假设的决策阻塞、继续落盘会引入口径错误时，才允许部分落盘，并且必须同时列出已完成文件、待完成文件、阻塞原因与下一步需要用户确认的点。

## Subagent 使用策略

- 默认由主 agent 直接执行任务，不强制启用 subagent。
- 仅当用户在当前请求中明确要求使用 subagent，或明确点名相关 skill 时，才启用 subagent 路径。
- 启用后由主 agent 负责消化输入、下发可执行 prompt、监控进度、做质量门和结果汇总。
- 当存在依赖关系时，可串行或并行编排；未显式触发时继续由主 agent 直连执行。
- 若用户已显式要求但平台能力限制导致无法调用 subagent，主 agent 需显式说明原因并回退直接执行。

## 当前主旋律

- AI Native first。
- 本仓当前核心目标，是把 Logix 打造成 React 的逻辑层补充，支撑 Agent 更稳定地生成、理解、组合、调试和验证逻辑。
- 平台化不是当前硬目标。若“平台存在感”与 API 清晰度、Agent 可用性、运行时性能、可诊断性冲突，优先后者。
- 静态化要做，但只做必要部分。只为类型边界、稳定诊断、最小 IR、可复现验证去静态化。
- 拒绝为了平台叙事、表面完备度或未来假设去做过度静态化、过多锚点、额外壳层和第二模型。
- 公开 API 与内部结构优先追求：更小、更一致、更可推导、更易被 LLM 生成和校验。

## 当前阶段

- 当前正处于下一轮激进改造期，重点已经从“提案讨论”进入“按新 SSoT 继续压缩公开面、清理旧壳层、准备推实现”的阶段。
- docs cutover 已完成，旧文档冻结在 `docs/legacy/`，新裁决已经开始收口到 `docs/ssot/`、`docs/adr/`、`docs/standards/`。
- 当前允许文档领先代码。若旧实现、旧注释、旧目录结构与新 SSoT 冲突，优先以新事实源为准，不为迁就现状代码回退口径。
- 当前默认继续清理旧命名、旧 facade、旧锚点化心智、旧“平台优先”残留；只保留能直接改善 Agent authoring、runtime clarity、performance 或 diagnostics 的部分。
- 若需要在实现与文档之间做裁决，默认优先推进更激进、更小、更一致的方案，再补迁移说明与验证。

## Forward-only 与零存量用户

- 当前仓库处于 forward-only 演进阶段，没有历史兼容负担。
- 任何地方都可以为了更优设计被推翻，不需要向历史版本兼容。
- 当前按零存量用户前提推进：可以直接重做对外 API、协议与默认行为。
- 不写兼容层，不设弃用期，用迁移说明和决策日志替代。
- 若未来出现真实存量用户或外部依赖，需要先更新这个前提，再重新裁决方案。

## 运行时硬约束

- 性能与可诊断性优先。任何触及 Logix Runtime 核心路径的改动，都必须给出可复现的性能基线或测量。
- 诊断链路必须可解释，诊断事件必须 slim、可序列化、可稳定比较。
- 保留最小 IR 与动态 trace，用于运行时解释、诊断、回放与证据对齐；不要把它扩张成平台优先的第二真相源。
- 标识去随机化。涉及实例、事务、操作链路时，优先保持稳定的 `instanceId / txnSeq / opSeq`。
- 事务窗口禁止 IO。
- 业务层不可直接写 `SubscriptionRef`。
- 不允许再长 `advanced`、`internal` 一类黑盒兜底槽位。任何新能力都应按职责落在明确模块里。

## 验证控制面

- 自我验证统一收敛到 `runtime control plane`。
- 第一版主干固定为 `runtime.check / runtime.trial / runtime.compare`。
- `runtime.check` 只做静态快检，不隐式代跑试运行。
- 默认门禁只允许跑到 `runtime.check + runtime.trial(mode="startup")`。
- `trial.scenario` 只服务验证，不进入公开 authoring surface，不沉淀为正式业务逻辑资产。
- 场景级验证的主入口固定为 `fixtures/env + steps + expect`。
- raw evidence / raw trace 只作下钻材料，不作为第一版默认比较面。
- `replay` 与宿主级深验证属于后续升级能力。

## 并行开发安全

- 默认假设工作区存在其他并行任务的未提交改动。
- 禁止为了“让 diff 干净”而丢弃改动：禁止任何形式的 `git restore`、`git checkout -- <path>`、`git reset`、`git clean`、`git stash`。
- 禁止自动执行 `git add`、`git commit`、`git push`、`git rebase`、`git merge`、`git cherry-pick`，除非用户明确要求。
- 禁止删除或覆盖与本任务无关的文件；如确需删除或大范围移动，必须先征得用户明确同意。
- 如需查看差异，只使用只读命令，如 `git status`、`git diff`。

## Workflow

1. 每个新会话在第一次回答用户前，先用 shell 读取并通读 `.codex/skills/project-guide/SKILL.md`，除非用户明确声明不需要或已加载 `$project-guide`。
2. 与项目相关的任务，优先通过 `project-guide` 获取 docs 路由、代码落点与质量门。
3. 完成一个特性后，至少跑通相关类型检查与测试。
4. 若改动触及核心路径、诊断协议或对外 API，必须同步更新对应 SSoT、ADR、standards 和必要的用户文档。
5. 若改动会改变核心判断，必须主动回写新的事实源，避免并行真相源漂移。

## Docs 路由

- `docs/README.md` 是新 docs 根入口。
- `docs/ssot/` 放当前事实源。
- `docs/adr/` 放重大裁决。
- `docs/standards/` 放跨主题规范。
- `docs/next/` 放待升格文档。
- `docs/legacy/` 是冻结历史文档库，只查阅、引用，不继续增量维护。

当前与 logix-api-next 直接相关的高优先级事实源：

- `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- `docs/adr/2026-04-04-logix-api-next-charter.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/standards/effect-v4-baseline.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/08-domain-packages.md`

当前若出现“旧代码长这样”和“新文档要求不一样”的冲突，先看上面这些新事实源，再决定实现如何继续收敛。

## 当前工程定位

- `packages/logix-core` 是运行时主线。
- `packages/logix-react` 是 React 集成与宿主语义落点。
- `packages/logix-sandbox` 是运行时验证与对齐实验场。
- `examples/logix` 是核心场景 dogfooding。

当前默认把本仓视为 AI Native 运行时实验场，而不是平台化前置工程。

## logix-core 目录铁律

在 `packages/logix-core/src` 内改动时，默认遵守：

- `src/*.ts` 直系文件是子模块，必须有实际实现代码，不能只是纯 re-export。
- 子模块共享实现统一放在 `src/internal/**`，禁止从 `src/internal/**` 反向 import 任意 `src/*.ts`。
- 核心实现继续下沉到 `src/internal/runtime/core/**`。
- `src/internal/*.ts` 与 `src/internal/runtime/*.ts` 只做 re-export 或薄适配，保持浅层 API 到深层实现的单向拓扑。

## Effect 与测试小抄

- 主分支已经切到 Effect V4。当前 workspace override 固定为 `effect@4.0.0-beta.28`、`@effect/vitest@4.0.0-beta.28`、`@effect/platform-node@4.0.0-beta.28`。
- 所有新代码、新测试、新文档默认按 Effect V4 写，禁止按 V3 心智新增实现。
- 仓库里若仍出现 `v3`、旧 API 写法、旧包描述或旧迁移备注，默认视为历史残留，不构成当前实现依据。
- `Effect.Effect<A, E, R>` 的泛型顺序固定为 成功值 / 业务错误 / 依赖环境。
- 统一使用 Tag class：`class X extends Context.Tag("X")<X, Service>() {}`。
- Promise 若需要进入业务错误通道，使用 `Effect.tryPromise`，不要直接假设 reject 会进入 `E`。
- 若固有认知与当前类型错误、TS 提示、本地 d.ts 冲突，一律以本地类型定义和编译器为准。
- 运行时与 Layer 重度相关的测试，优先使用 `@effect/vitest`。
- Agent 禁止调用 watch 模式测试。优先使用一次性命令。
- 若对 Effect API 有疑问，优先使用 context7 查询最新写法。

## 常用验证

- `pnpm check:effect-v4-matrix`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`
- 若需要全量对照，再跑 `pnpm test`

## 额外判断原则

- 若某个设计只是为了补齐“未来可能存在的平台叙事”，但当前不能直接改善 Agent authoring、runtime clarity、performance 或 diagnostics，默认先不做。
- 若某个静态对象、锚点或 profile 不能显著减少分叉、提升验证质量或换来稳定诊断收益，默认先删掉或后置。
- 若某个能力会长出第二套 runtime、第二套事务语义、第二套调试事实源，默认拒绝。
