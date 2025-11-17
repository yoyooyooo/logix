# Quickstart: 045 Dual Kernel Contract（当前内核 + core-ng）

本 quickstart 描述“实现阶段”完成后，如何用最小步骤验证本特性已达标。

## 1) 验证目标（对应 spec.md）

- `@logix/react` 只依赖 `@logix/core`，不需要依赖 `@logix/core-ng`。
- 业务侧在创建 runtime 时选择“当前内核”或“core-ng”，完成轻量迁移后行为一致。
- 证据链路仍然走统一最小 IR（Static IR + Dynamic Trace），事件 Slim 且可序列化。
- 能解释“当前 runtime 生效的内核是什么/为何如此选择”：至少包含 `KernelImplementationRef` 与（或）`RuntimeServicesEvidence`（serviceId → implId 选择证据）。
- 性能：默认路径不回归；切换/装配点不引入热路径分支与隐形分配。

## 2) 最小试跑（M0：先验证 harness 可用）

在 `core-ng` 尚未接入前，先用 **core vs core** 验证对照验证 harness 自身可用且输出稳定（含 `instanceId/txnSeq/opSeq` 锚点）。

- 推荐命令：`pnpm -C packages/logix-core test -- Contracts.045.KernelContractVerification`

## 2.5) 最小试跑（M2：core vs core-ng，对照验证）

当 `core-ng`（045/US2）接入后，再跑 “两套内核分别跑一遍”：

1. 用“当前内核”创建一个 runtime，跑一段固定交互序列，导出 Static IR 摘要 + Dynamic Trace。
2. 用“core-ng”创建一个 runtime，跑同一段交互序列，导出同口径证据。
3. 对比两份证据：结果一致或差异被归类为“允许差异”，且能定位到稳定锚点（实例/事务/操作）。

> 注：本特性的多内核共存仅用于验证。两棵 runtime（两棵 DI 树）默认不共享实例/状态，这是刻意的隔离。

## 3) 质量门（实现阶段必须跑）

- `pnpm typecheck`
- `pnpm typecheck:test`
- `pnpm lint`
- `pnpm test`

## 4) 性能证据（实现阶段必须产出）

使用 `$logix-perf-evidence` 产出 before/after/diff（Node + 至少 1 条 headless browser run），并把报告落到 `specs/045-dual-kernel-contract/perf/*`（实现阶段新增）。

验收口径：

- 默认路径（仅当前内核）不回归：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT；交付结论必须 `profile=default`（或 `soak`），且 `pnpm perf diff` 满足 `comparable=true && regressions==0`。
- 引入契约/装配点后，事务/收敛热循环不得出现“每步动态分发/额外分配”

## 5) 常见失败信号（实现阶段应可解释）

- 证据包不可序列化（JSON.stringify 失败）或字段超大：必须有降级标记与摘要。
- `core-ng` 能力不全：必须显式失败并给出缺失点清单（禁止静默漂移）。
- 性能回归：必须被预算门槛拦截，不允许“带病切换”。

## 6) 下一步（045 之后的主线）

- 打开 `specs/046-core-ng-roadmap/quickstart.md`，按路线图优先推进 M1：`specs/039-trait-converge-int-exec-evidence/`（当前内核够硬 + 证据达标）。
