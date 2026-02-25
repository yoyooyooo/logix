# Implementation Plan: 099 O-009 ReadQuery 严格门禁前移到构建期

**Branch**: `099-o009-readquery-build-gate` | **Date**: 2026-02-25 | **Spec**: `specs/099-o009-readquery-build-gate/spec.md`  
**Input**: Feature specification from `specs/099-o009-readquery-build-gate/spec.md`

## Summary

把 ReadQuery 的 strict gate 决策从运行时迁移到构建期：

1. 在 module/logic 编译阶段产出 selector 质量报告（lane/fallbackReason/readsDigest/strictGateVerdict）。
2. 运行时 `changesReadQueryWithMeta` 优先消费“已定级 selector”，减少热路径治理分支。
3. 对未定级输入走显式降级，不允许静默退化。
4. 统一构建报告与运行时 trace 的锚点字段，保证 Devtools 可解释链路。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-3, NS-10
- **Kill Features (KF)**: KF-3, KF-8

## Deepening Notes（事实与现状）

- 现状：`ReadQuery.compile` 同时承担 selector 编译、lane 判定与 fallbackReason 生成；strict gate 通过 `evaluateStrictGate` 在运行时判定。入口：`packages/logix-core/src/internal/runtime/core/ReadQuery.ts`。
- 现状：`ModuleRuntime.impl.ts` 的 `changesReadQueryWithMeta` 在 dynamic lane 下会读取 `ReadQueryStrictGateConfigTag` 并判定 PASS/WARN/FAIL。入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`。
- 现状：strict gate 测试覆盖 runtime warn/error 行为，但尚未覆盖“构建期报告 + 运行时仅消费定级结果”的链路。入口：`packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`。
- 风险：若构建产物缺失或漂移，运行时可能出现双判定或口径不一致，导致热路径分支回弹与诊断漂移。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、pnpm workspace  
**Storage**: N/A（构建期报告落盘到 `specs/099-o009-readquery-build-gate/`）  
**Testing**: Vitest + `@effect/vitest`（runtime 测试）  
**Target Platform**: Node.js 20+（核心）+ modern browsers（回归）  
**Project Type**: pnpm workspace（`packages/*` + `docs/*` + `specs/*`）  
**Performance Goals**: 在“已定级 selector”路径去除重复 strict gate 分支，默认档位无回归；见 SC-005 与 Perf Evidence Plan。  
**Constraints**: 统一最小 IR、稳定标识、事务窗口禁 IO、诊断事件 Slim 可序列化、forward-only 无兼容层。  
**Scale/Scope**: 仅聚焦 `ReadQuery` 编译与 `ModuleRuntime` 订阅消费路径，不重写 SelectorGraph 核心算法。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Answers

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 治理边界前移，目标是把“动态判定”改为“构建期裁决 + 运行时消费”，保持业务语义不变。
- **依赖/更新的 specs 与 SSoT**：本特性依赖并延续 `specs/057-*` 与 `specs/068-*` 的 ReadQuery/strict gate 契约；实现后需同步更新 runtime 中文文档（ReadQuery 与 watcher 路由说明）。
- **Effect/Logix 契约变化**：新增“构建期质量报告 + 运行时消费定级结果”契约，运行时 strict gate 的主判定语义将迁移到构建期。
- **IR/锚点漂移点（硬要求）**：
  - 漂移点 1：`ReadQueryStaticIr` 与构建报告字段不一致。
  - 漂移点 2：构建期 selectorId 与运行时 selectorId 算法不一致。
  - 漂移点 3：构建期 fallbackReason 枚举与 runtime 诊断枚举不一致。
  - 约束：三处字段必须由同一 schema/工厂导出，禁止并行字典。
- **稳定标识（硬要求）**：`selectorId/moduleId/instanceId/txnSeq/opSeq` 继续使用稳定来源；禁止随机/墙钟作为主锚点。
- **事务窗口（硬要求）**：构建期评估逻辑不得进入事务窗口；运行时新增代码不得引入事务内 IO/await。
- **写入纪律**：不改变 `SubscriptionRef` 可写性边界；业务侧仍不可写 `SubscriptionRef`。
- **Performance budget（硬要求）**：
  - 热路径：`changesReadQueryWithMeta` dynamic/static 选择分支与提交后 selector 消费。
  - 预算：默认 profile 下 `watchers.clickToPaint` / `converge.txnCommit` 不得产生回归；新增 O-009 Node 微基准用于观察 strict gate 决策前移收益。
  - 防线：`pnpm perf collect + perf diff`（default profile）与回归单测双门禁。
- **诊断成本（硬要求）**：
  - `diagnostics=off` 不应新增常驻对象分配。
  - `diagnostics=light/full` 仅输出 Slim 可序列化事件（构建报告摘要 + 运行时消费摘要）。
- **迁移说明（硬要求）**：
  - 运行时 strict gate 从“每次订阅时判定”迁移为“构建期裁决 + 运行时消费”；旧配置保留输入形态但判定时机变化。
  - 在 `contracts/migration.md` 与最终 PR 描述提供迁移步骤与破坏性影响。
- **Quality gates**：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 必过。

### Gate Result (Pre-Design)

- PASS（允许进入 Phase 0/1 文档产物与实现阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（改动前 vs 改动后）
- envId：`darwin-arm64.m-series.node20.chromium-headless`
- profile：`default`（交付结论）
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/099-o009-readquery-build-gate/perf/before.<sha>.darwin-arm64.m-series.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/099-o009-readquery-build-gate/perf/after.<sha>.darwin-arm64.m-series.default.json`
- diff：
  - `pnpm perf diff -- --before specs/099-o009-readquery-build-gate/perf/before...json --after specs/099-o009-readquery-build-gate/perf/after...json --out specs/099-o009-readquery-build-gate/perf/diff.before__after.default.json`
- 补充：新增 `ReadQuery` 构建门禁微基准（Node）并纳入 O-009 合同文档
- Failure Policy：`comparability=false` 或 `stabilityWarning/timeout/missing suite` 时禁止硬结论，必须复测并补充说明

## Project Structure

### Documentation (this feature)

```text
specs/099-o009-readquery-build-gate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── build-gate-contract.md
│   ├── runtime-consumption-contract.md
│   ├── perf-and-diagnostics-contract.md
│   └── migration.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── ReadQuery.ts
├── ModuleRuntime.impl.ts
└── (新增) ReadQueryBuildGate.ts

packages/logix-core/src/internal/runtime/
└── ModuleRuntime.ts

packages/logix-core/test/ReadQuery/
├── ReadQuery.compile.test.ts
├── ReadQuery.strictGate.test.ts
├── ReadQuery.buildGate.test.ts
└── ReadQuery.runtimeConsumption.test.ts

docs/ssot/runtime/logix-core/impl/
└── 04-watcher-performance-and-flow.01-dispatch-to-handler.md
```

**Structure Decision**:

- 构建期门禁逻辑抽离为独立 core 子模块（`ReadQueryBuildGate.ts`），避免继续膨胀 `ReadQuery.ts`。
- `ModuleRuntime.impl.ts` 只负责消费决策结果，不内嵌规则引擎。
- 测试按“编译/构建门禁/运行时消费”拆分文件，避免一个测试文件承载全链路。

## Design（关键机制）

### 1) 构建期 selector 质量报告

- 输入：module/logic 编译期可见的 selector 列表与 strict gate 配置。
- 输出：`SelectorQualityReport`（模块级）+ `SelectorQualityEntry`（selector 级）。
- 必要字段：`selectorId/lane/producer/fallbackReason?/readsDigest?/strictGateVerdict/rule?/diagnosticCode?`。
- 构建期直接判定 PASS/WARN/FAIL，`error` 模式下阻断构建。

### 2) 运行时消费定级结果

- `changesReadQueryWithMeta` 优先接受“已定级 compiled input”。
- 对已定级 selector：跳过 strict gate 规则匹配，仅执行订阅/选择器计算。
- 对未定级 selector：进入显式降级分支，写入稳定 `fallbackReason=missingBuildGrade`（或等价原因码）。

### 3) fallbackReason 与 strict gate 口径统一

- 继续使用冻结枚举：`missingDeps | unsupportedSyntax | unstableSelectorId`。
- 新增“未定级”场景时必须走扩展枚举并同步 schema/文档/测试，禁止自由字符串。

### 4) 诊断与 Devtools 链路

- 构建期：输出可序列化质量报告摘要（用于 CI 与 artifacts）。
- 运行时：输出“消费决策来源（build/jit/dynamic）”与锚点字段；默认 off 档位不发事件。
- 保持 `selectorId + moduleId + instanceId + txnSeq` 一致对齐。

### 5) Forward-only 迁移

- 不提供兼容层；旧“运行时 strict gate 反复判定”路径删除或降为兜底。
- 提供迁移文档：如何在构建阶段开启 gate、如何解释新增失败、如何处理未定级 selector。

## Deliverables by Phase

- **Phase 0（research）**：完成裁决与取舍文档 `research.md`。
- **Phase 1（design）**：完成 `data-model.md`、`contracts/*`、`quickstart.md`。
- **Phase 2（tasks）**：生成 `tasks.md` 并切换 spec 状态为 Planned。
- **Phase 3（implementation）**：实现代码 + 测试 + 文档同步 + 质量门 + PR/review 收敛。

### Gate Result (Post-Design)

- PASS（设计产物覆盖性能预算、诊断成本、IR/锚点漂移、稳定标识与迁移说明）
