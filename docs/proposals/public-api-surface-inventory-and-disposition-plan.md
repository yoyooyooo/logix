---
title: Public API Surface Inventory And Disposition Plan
status: living
owner: public-api-surface-inventory
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/ssot/form/05-public-api-families.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/standards/logix-api-next-guardrails.md
  - packages/logix-react/README.md
last-updated: 2026-04-21
---

# Public API Surface Inventory And Disposition Plan

## 目标

冻结一份全仓 public surface 总清单，用来承接这轮 API 大审视的单一 proposal。

这份 proposal 只做四件事：

- 列出当前真的对外暴露了哪些 package / root / subpath / bin surface
- 为每类 surface 绑定对应的内部实现链路与 authority docs
- 给每类 surface 指定后续 `plan-optimality-loop` 的评审分块
- 冻结统一的 disposition vocabulary，保证最后每个 surface 都有明确去向

这份 proposal 不直接冻结最终 API patch，也不直接回写 live SSoT。

## 页面角色

- 本页是总清单与 review manifest，不是默认事实源
- 本页先冻结“要审什么、怎么分块、证据看哪里”
- 具体结论后续分块回写到 live SSoT / ADR / standards / package docs
- [React Host Specialized API Cut Contract](./react-host-specialized-api-cut-contract.md) 已完成收口；本页只保留 `C4 / R2` 的 inventory 关联与去向，不重复细判那几个 noun 的局部论证

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../ssot/form/05-public-api-families.md](../ssot/form/05-public-api-families.md)
- [../ssot/form/13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./react-host-specialized-api-cut-contract.md](./react-host-specialized-api-cut-contract.md)

## 当前问题定义

当前仓库已经完成北极星和阶段目标升级，但“实际对外暴露出来的 surface”仍散落在下面几层：

- package `exports`
- root barrel 与 wildcard subpath
- package README 与 docs promise
- exact surface tests
- package-local helper / specialized residue / expert route

这会带来五类问题：

1. live SSoT 已经压缩，代码 export 还保留旧入口或模糊入口
2. root surface、subpath surface、README promise 不总是同层
3. 某些 public noun 后面牵出整段内部实现链路，但 owner 还没冻结
4. root-only namespace 与 subpath-only family 同时存在，taxonomy 还不闭合
5. 有些 API 该删、该并、该下沉、该转 toolkit，但目前还没有全仓单一清单

这轮 proposal 的目标，就是先把这些对象全部拉到一张桌子上。

## 审视前提

这轮 API 审视固定采用面向未来的目标函数：

- 旧 API 默认不享有保留资格
- 任何历史便利面、旧 facade、旧 static-first 设计，都必须重新证明自己在 `Agent first runtime` 下仍有明确价值
- 如果某个 API 主要服务旧目标函数，例如“尽量静态化的 IR 驱动 authoring”，它要被直接挑战，而不是先假定继续存在
- 评审默认问的是“今天还应不应该存在”，不是“以前为什么加过它”
- 除北极星外，本轮 review 不默认冻结任何 noun、slot、owner、root/subpath 形状、现行 SSoT 句子、总清单分块、目标论点或当前实现 witness
- 任何现有 proposal、SSoT、README、tests、examples，只要妨碍更小、更一致、更可推导的结果，都必须允许被推翻

这条前提对 `workflow` 尤其重要：

- `workflow` 过去承接过“把一组通用、场景化能力包成静态化 API”的方向
- 当前主目标已经从“极致静态化内核”转向“Agent first 的运行时框架”
- 因此 `workflow` 现在是待挑战概念，不是默认应保留概念
- `process / workflow / flow / link` 这组 orchestration family 都要按这个目标函数重审

## 审视单位

后续每个被审对象，都必须落成一行 manifest，至少绑定下面这些列：

- `package`
- `entrypoint`
- `noun-family`
- `internal-chain`
- `authority-primary`
- `witnesses`
- `chunk`
- `static-first-risk`
- `candidate-disposition`
- `decision-owner`
- `future-authority`

其中：

- `candidate-disposition` 只承接语义去向
- `decision-owner` 只承接这条 surface 由哪份工件裁决
- `future-authority` 只承接裁决落地后的权威去向

最终每个 surface 必须落到且只落到一个语义 disposition bucket：

- `keep-canonical`
- `keep-expert`
- `upgrade`
- `merge`
- `demote-to-toolkit`
- `internalize`
- `delete`

`hold-by-related-proposal` 不再属于 disposition bucket。
若某条 surface 由子提案裁决，统一写到 `decision-owner`。

## Survival Proof Gate

对任何 legacy / static-first / non-canonical family，默认起点都是 `delete`。

只有同时补齐下面四项，才允许从 `delete` 升到其他语义 disposition：

- `owner`
- `future-authority`
- `de-sugared mapping`
- `why-not-delete`

这条 gate 适用于：

- `workflow / process / flow / link`
- React specialized residue
- domain kit 里的 core-adjacent type surface
- 任何只因历史便利或旧叙事而存活的 expert API

## 范围

### 主清单

当前纳入总清单的对外 package 与 surface：

- `@logixjs/core`
- `@logixjs/react`
- `@logixjs/form`
- `@logixjs/query`
- `@logixjs/i18n`
- `@logixjs/domain`
- `@logixjs/cli`
- `@logixjs/test`
- `@logixjs/sandbox`
- `@logixjs/devtools-react`

### 绑定证据

每个 chunk 默认同时看：

- 对应 `package.json` 的 `exports` / `bin`
- 对应 root barrel
- 对应 top-level public files
- 第一层 package-local adapter
- 深层 internal owner
- 相关 README / exact-surface tests / live SSoT

### 当前不纳入主清单

- `docs/archive/**`
- `apps/docs/**`
- `packages/**/internal/**`
- 代码里还不存在的 future package surface

说明：

- `apps/docs/**` 当前只算 downstream consumption，不作为这轮 authority inventory 的主对象

## 全量 public entrypoint inventory

## Phase-0 Manifest Snapshot

| package | entrypoint | noun-family | internal-chain | authority-primary | witnesses | chunk | static-first-risk | candidate-disposition | decision-owner | future-authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `@logixjs/core` | `.` | canonical spine | `packages/logix-core/src/{Module,Logic,Program,Runtime}.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/index.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Actions` | canonical subpath | `packages/logix-core/src/Actions.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Actions.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Bound` | canonical subpath | `packages/logix-core/src/Bound.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Bound.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Handle` | canonical subpath | `packages/logix-core/src/Handle.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Handle.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Logic` | canonical subpath | `packages/logix-core/src/Logic.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Logic.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Module` | canonical subpath | `packages/logix-core/src/Module.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Module.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./ModuleTag` | canonical subpath | `packages/logix-core/src/ModuleTag.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/ModuleTag.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Program` | canonical subpath | `packages/logix-core/src/Program.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Program.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./Runtime` | canonical subpath | `packages/logix-core/src/Runtime.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/Runtime.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `./State` | canonical subpath | `packages/logix-core/src/State.ts` | `runtime/01 + runtime/03` | `packages/logix-core/package.json; packages/logix-core/src/State.ts` | `C1` | `low` | `keep-canonical` | `this-proposal` | `runtime/01 + runtime/03` |
| `@logixjs/core` | `.` root-only `Reflection` | evidence/export residual | `packages/logix-core/src/internal/reflection-api.ts` | `runtime/09 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/internal/reflection-api.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/09 + runtime/11 + guardrails` |
| `@logixjs/core` | `.` root-only `MatchBuilder + ScopeRegistry + InternalContracts` | runtime adjunct escape hatch | `packages/logix-core/src/internal/{runtime/core/MatchBuilder,scope-registry,InternalContracts}.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/index.ts` | `C2` | `high` | `delete` | `this-proposal` | `runtime/07 + runtime/11 + runtime/12 + guardrails` |
| `@logixjs/core` | `./Workflow` | orchestration residue | `deleted by K1 cutover` | `runtime/03 + guardrails` | `packages/logix-core/package.json; docs/proposals/orchestration-existence-challenge.md` | `K1` | `high` | `delete` | `orchestration-existence-challenge` | `runtime/03 + guardrails` |
| `@logixjs/core` | `./Process` | orchestration residue | `deleted by K1 cutover` | `runtime/03 + guardrails` | `packages/logix-core/package.json; docs/proposals/orchestration-existence-challenge.md` | `K1` | `high` | `delete` | `orchestration-existence-challenge` | `runtime/03 + guardrails` |
| `@logixjs/core` | `./Flow` | orchestration residue | `deleted by K1 cutover` | `runtime/03 + guardrails` | `packages/logix-core/package.json; docs/proposals/orchestration-existence-challenge.md` | `K1` | `high` | `delete` | `orchestration-existence-challenge` | `runtime/03 + guardrails` |
| `@logixjs/core` | `./Link` | orchestration residue | `deleted by K1 cutover` | `runtime/03 + guardrails` | `packages/logix-core/package.json; docs/proposals/orchestration-existence-challenge.md` | `K1` | `high` | `delete` | `orchestration-existence-challenge` | `runtime/03 + guardrails` |
| `@logixjs/core` | `./ReadQuery` | read/projection residual | `packages/logix-core/src/ReadQuery.ts` | `runtime/01 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/ReadQuery.ts` | `C2` | `medium` | `delete` | `read-query-selector-law-internalization-contract` | `runtime/01 + runtime/10` |
| `@logixjs/core` | `./ExternalStore` | read/projection residual | `packages/logix-core/src/ExternalStore.ts` | `runtime/01 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/ExternalStore.ts` | `C2` | `medium` | `delete` | `external-store-runtime-seam-cutover-contract` | `runtime/04 + runtime/10 + runtime/11` |
| `@logixjs/core` | `./Resource` | read/projection residual | `packages/logix-core/src/Resource.ts` | `runtime/01 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/Resource.ts` | `C2` | `medium` | `delete` | `resource-query-owner-relocation-contract` | `runtime/04 + runtime/08` |
| `@logixjs/core` | `./Kernel` | runtime adjunct residual | `packages/logix-core/src/internal/kernel-api.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/internal/kernel-api.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/04 + runtime/09 + runtime/11 + guardrails` |
| `@logixjs/core` | `./Root` | runtime adjunct residual | `packages/logix-core/src/Root.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/Root.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/07 + runtime/12 + guardrails` |
| `@logixjs/core` | `./Env` | runtime adjunct residual | `packages/logix-core/src/Env.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/Env.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/07 + guardrails` |
| `@logixjs/core` | `./Platform` | runtime adjunct residual | `packages/logix-core/src/Platform.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/Platform.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/11 + runtime/12 + guardrails` |
| `@logixjs/core` | `./Middleware` | runtime adjunct residual | `packages/logix-core/src/Middleware.ts` | `runtime/01 + runtime/11 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/Middleware.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/11 + runtime/12 + guardrails` |
| `@logixjs/core` | `./ControlPlane` | control/evidence residual | `packages/logix-core/src/ControlPlane.ts` | `runtime/09 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/ControlPlane.ts` | `C2` | `medium` | `keep-canonical` | `this-proposal` | `runtime/09` |
| `@logixjs/core` | `./Debug` | control/evidence residual | `packages/logix-core/src/internal/debug-api.ts` | `runtime/09 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/internal/debug-api.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/09 + runtime/11 + guardrails` |
| `@logixjs/core` | `./Observability` | control/evidence residual | `packages/logix-core/src/internal/evidence-api.ts` | `runtime/09 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/internal/evidence-api.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/09 + runtime/11 + guardrails` |
| `@logixjs/core` | `./EffectOp` | control/evidence residual | `packages/logix-core/src/EffectOp.ts` | `runtime/09 + guardrails` | `packages/logix-core/package.json; packages/logix-core/src/EffectOp.ts` | `C2` | `medium` | `delete` | `this-proposal` | `runtime/11 + runtime/12 + guardrails` |
| `@logixjs/react` | `.` | canonical host root surface | `packages/logix-react/src/{index,Hooks,RuntimeProvider,FormProjection}.ts` | `runtime/10` | `packages/logix-react/package.json; packages/logix-react/src/index.ts; packages/logix-react/README.md` | `R1` | `low` | `keep-canonical` | `this-proposal` | `runtime/10` |
| `@logixjs/react` | `./RuntimeProvider` | canonical host route | `packages/logix-react/src/RuntimeProvider.ts` | `runtime/10` | `packages/logix-react/package.json; packages/logix-react/src/RuntimeProvider.ts; packages/logix-react/README.md` | `R1` | `low` | `keep-canonical` | `this-proposal` | `runtime/10` |
| `@logixjs/react` | `./Hooks` canonical slice | canonical host route | `packages/logix-react/src/Hooks.ts` | `runtime/10` | `packages/logix-react/package.json; packages/logix-react/src/Hooks.ts; packages/logix-react/README.md` | `R1` | `medium` | `keep-canonical` | `this-proposal` | `runtime/10` |
| `@logixjs/react` | `./Hooks` specialized slice | specialized bound block | `packages/logix-react/src/Hooks.ts` | `react-host-specialized-api-cut-contract` | `docs/proposals/react-host-specialized-api-cut-contract.md; packages/logix-react/src/Hooks.ts` | `R2` | `high` | `consumed` | `react-host-specialized-api-cut-contract` | `runtime/10 + react-host-specialized-api-cut-contract` |
| `@logixjs/react` | `./ModuleScope` | specialized bound block | `deleted by react-host-specialized-api-cut-contract` | `runtime/10 + guardrails` | `docs/proposals/react-host-specialized-api-cut-contract.md; packages/logix-react/package.json` | `R2` | `high` | `consumed` | `react-host-specialized-api-cut-contract` | `done` |
| `@logixjs/react` | `./ExpertHooks` | adjunct residue | `packages/logix-react/src/ExpertHooks.ts` | `runtime/10 + toolkit-layer` | `packages/logix-react/package.json; packages/logix-react/src/ExpertHooks.ts` | `R3` | `medium` | `delete` | `this-proposal` | `runtime/10 + runtime/11 + guardrails` |
| `@logixjs/react` | `./ReactPlatform` | wrapper/transport residue | `packages/logix-react/src/ReactPlatform.ts` | `runtime/10 + toolkit-layer` | `packages/logix-react/package.json; packages/logix-react/src/ReactPlatform.ts` | `R3` | `medium` | `delete` | `this-proposal` | `runtime/10 + runtime/11 + guardrails` |
| `@logixjs/react` | `./Platform` | wrapper/transport residue | `packages/logix-react/src/Platform.ts` | `runtime/10 + toolkit-layer` | `packages/logix-react/package.json; packages/logix-react/src/Platform.ts` | `R3` | `medium` | `delete` | `this-proposal` | `runtime/10 + runtime/11 + guardrails` |
| `@logixjs/form` | `.` | exact root surface | `packages/logix-form/src/{Form,Rule,Error}.ts + src/index.ts` | `form/13 + form/05` | `packages/logix-form/package.json; packages/logix-form/src/index.ts; packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts` | `F1` | `medium` | `keep-canonical` | `form/13-exact-surface-contract` | `form/13 + runtime/08` |
| `@logixjs/form` | `./locales` | builtin locale catalogs | `packages/logix-form/src/locales/index.ts` | `form/13 + runtime/08` | `packages/logix-form/package.json; packages/logix-form/src/locales/index.ts; packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts` | `F1` | `low` | `keep-canonical` | `form/13-exact-surface-contract` | `form/13 + runtime/08` |
| `@logixjs/query` | `.` | `make / Engine` minimal contract | `packages/logix-query/src/{Query,Engine}.ts + internal/engine/tanstack.ts` | `runtime/08` | `packages/logix-query/package.json; packages/logix-query/src/index.ts; packages/logix-query/test/{Query/Query.RootSurfaceBoundary,Query/Query.OutputModeBoundary}.test.ts` | `Q1` | `medium` | `keep-canonical` | `query-exact-surface-contract` | `runtime/08` |
| `@logixjs/i18n` | `.` | `I18n / I18nTag / token` minimal contract | `packages/i18n/src/index.ts + internal/{driver/i18n,token/token}.ts` | `runtime/08` | `packages/i18n/package.json; packages/i18n/src/index.ts; packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts` | `I1` | `medium` | `keep-canonical` | `i18n-exact-surface-contract` | `runtime/08` |
| `@logixjs/i18n` | `./I18n` | wildcard subpath contract | `packages/i18n/src/I18n.ts` | `runtime/08` | `packages/i18n/package.json; packages/i18n/src/I18n.ts` | `I1` | `high` | `delete` | `i18n-exact-surface-contract` | `runtime/08` |
| `@logixjs/i18n` | `./Token` | wildcard subpath contract | `packages/i18n/src/Token.ts` | `runtime/08` | `packages/i18n/package.json; packages/i18n/src/Token.ts` | `I1` | `high` | `delete` | `i18n-exact-surface-contract` | `runtime/08` |
| `@logixjs/domain` | `.` | thin type barrel | `packages/domain/src/index.ts` | `runtime/08` | `packages/domain/package.json; packages/domain/src/index.ts; packages/domain/test/Crud/Crud.PatternKitBoundary.test.ts` | `D1` | `low` | `delete` | `domain-exact-surface-contract` | `runtime/08` |
| `@logixjs/domain` | `./Crud` | rootless CRUD program kit | `packages/domain/src/{Crud.ts,internal/crud/Crud.ts}` | `runtime/08` | `packages/domain/package.json; packages/domain/src/Crud.ts; packages/domain/test/Crud/{Crud.PatternKitBoundary,Crud.basic}.test.ts` | `D1` | `medium` | `keep-canonical` | `domain-exact-surface-contract` | `runtime/08` |
| `@logixjs/cli` | `.` | root Commands namespace | `packages/logix-cli/src/index.ts + src/internal/entry.ts` | `runtime/09` | `packages/logix-cli/package.json; packages/logix-cli/src/index.ts; packages/logix-cli/test/Integration/output-contract.test.ts` | `T1` | `low` | `delete` | `cli-control-plane-surface-contract` | `runtime/09` |
| `@logixjs/cli` | `./Commands` | control-plane command family | `packages/logix-cli/src/Commands.ts + internal/commands/**` | `runtime/09` | `packages/logix-cli/package.json; packages/logix-cli/src/Commands.ts; packages/logix-cli/test/Integration/{check,trial,compare,cli.describe-json,cli.ir-validate.fields,cli.ir-diff.fields}.test.ts` | `T1` | `medium` | `delete` | `cli-control-plane-surface-contract` | `runtime/09` |
| `@logixjs/cli` | `bin:logix` | CLI shell | `packages/logix-cli/src/bin/logix.ts` | `runtime/09` | `packages/logix-cli/package.json; packages/logix-cli/src/bin/logix.ts; packages/logix-cli/test/Integration/output-contract.test.ts` | `T1` | `medium` | `keep-canonical` | `cli-control-plane-surface-contract` | `runtime/09` |
| `@logixjs/cli` | `bin:logix-devserver` | archived/expert residue | `packages/logix-cli/src/bin/logix-devserver.ts` | `runtime/09` | `packages/logix-cli/package.json; packages/logix-cli/src/bin/logix-devserver.ts` | `T1` | `high` | `delete` | `cli-control-plane-surface-contract` | `runtime/09` |
| `@logixjs/test` | `.` | test harness root | `packages/logix-test/src/{index,TestProgram}.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/index.ts; packages/logix-test/test/TestRuntime/TestRuntime.ControlPlaneContract.test.ts` | `T2` | `low` | `keep-canonical` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `./TestRuntime` | test harness | `packages/logix-test/src/TestRuntime.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/TestRuntime.ts` | `T2` | `low` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `./TestProgram` | test harness | `packages/logix-test/src/TestProgram.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/TestProgram.ts` | `T2` | `low` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `./Execution` | test harness | `packages/logix-test/src/Execution.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/Execution.ts; packages/logix-test/test/Execution/ExecutionResult.test.ts` | `T2` | `low` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `./Assertions` | test harness | `packages/logix-test/src/Assertions.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/Assertions.ts` | `T2` | `low` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `./Vitest` | test harness | `packages/logix-test/src/Vitest.ts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/Vitest.ts; packages/logix-test/test/Vitest/vitest_program.test.ts` | `T2` | `low` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/test` | `.` root-only `Act` | internal leak residue | `packages/logix-test/src/Act.ts + core/InternalContracts` | `runtime/04 + runtime/09` | `packages/logix-test/package.json; packages/logix-test/src/Act.ts; packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx` | `T2` | `high` | `delete` | `test-harness-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `.` | root browser host wiring surface | `packages/logix-sandbox/src/{index,Service}.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/index.ts; packages/logix-sandbox/test/Client/Client.TrialBoundary.test.ts` | `T3` | `low` | `keep-canonical` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./Client` | browser trial surface | `packages/logix-sandbox/src/Client.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Client.ts; packages/logix-sandbox/test/{Client/SandboxClient.listKernels,browser/sandbox-worker-smoke}.test.ts` | `T3` | `medium` | `delete` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./Protocol` | worker protocol | `packages/logix-sandbox/src/Protocol.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Protocol.ts` | `T3` | `medium` | `delete` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./Service` | effect service adapter | `packages/logix-sandbox/src/Service.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Service.ts; packages/logix-sandbox/test/Client/SandboxClientLayer.test.ts` | `T3` | `medium` | `delete` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./Types` | browser trial types | `packages/logix-sandbox/src/Types.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Types.ts; examples/logix-sandbox-mvp/src/sandbox-contract.ts` | `T3` | `medium` | `delete` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./Vite` | kernel infra / bundling bridge | `packages/logix-sandbox/src/Vite.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Vite.ts` | `T3` | `medium` | `delete` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/sandbox` | `./vite` | kernel infra / bundling bridge | `packages/logix-sandbox/src/Vite.ts` | `runtime/04 + runtime/09` | `packages/logix-sandbox/package.json; packages/logix-sandbox/src/Vite.ts; examples/logix-sandbox-mvp/vite.config.ts; apps/logix-galaxy-fe/vite.config.ts` | `T3` | `medium` | `keep-canonical` | `sandbox-surface-contract` | `runtime/09` |
| `@logixjs/devtools-react` | `.` | devtools appendix root | `packages/logix-devtools-react/src/index.tsx` | `runtime/01 + runtime/09` | `packages/logix-devtools-react/package.json; packages/logix-devtools-react/src/index.tsx; packages/logix-devtools-react/test/internal/devtools-react.integration.test.tsx` | `T4` | `medium` | `delete` | `devtools-appendix-surface-contract` | `runtime/09` |
| `@logixjs/devtools-react` | `./LogixDevtools` | devtools UI shell | `packages/logix-devtools-react/src/internal/ui/shell/LogixDevtools.tsx` | `runtime/01 + runtime/09` | `packages/logix-devtools-react/package.json; packages/logix-devtools-react/test/internal/devtools-react.integration.test.tsx` | `T4` | `medium` | `delete` | `devtools-appendix-surface-contract` | `runtime/09` |
| `@logixjs/devtools-react` | `./DevtoolsLayer` | snapshot/debug residue | `packages/logix-devtools-react/src/internal/snapshot/index.ts` | `runtime/01 + runtime/09` | `packages/logix-devtools-react/package.json; packages/logix-devtools-react/test/internal/{devtools-react.integration,ProcessEvents.integration,devtools-fractal-runtime.integration}.test.tsx` | `T4` | `medium` | `delete` | `devtools-appendix-surface-contract` | `runtime/09` |
| `@logixjs/devtools-react` | `./FieldGraphView` | field graph appendix | `packages/logix-devtools-react/src/internal/ui/graph/FieldGraphView.tsx` | `runtime/01 + runtime/09` | `packages/logix-devtools-react/package.json; packages/logix-devtools-react/test/FieldGraphView/FieldGraphView.test.tsx` | `T4` | `medium` | `delete` | `devtools-appendix-surface-contract` | `runtime/09` |

### `@logixjs/core`

Phase-0 inventory 已经完成历史盘点作用。当前事实以上方 manifest 行、冻结结论与“已实施”区为准：

- canonical spine 已收口到 `Module / Program / Runtime`
- `Actions / Bound / Handle / Logic / ModuleTag / State` 继续作为 canonical subpath
- `ReadQuery / ExternalStore / Resource`、runtime adjunct shell、verification/evidence shell 都已按批次退出 public core
- `ControlPlane` 是当前唯一保留的 verification shared protocol shell

### `@logixjs/react`

Phase-0 inventory 已经完成历史盘点作用。当前事实以上方 manifest 行、冻结结论与“已实施”区为准：

- canonical host route 只承认 root `.`、`./RuntimeProvider` 与 `./Hooks` canonical slice
- `./Hooks` specialized slice 已由相关子提案消费完成
- `ExpertHooks / ReactPlatform / Platform` 继续作为 `R3 delete-first` 的 residue witness，不再是当前公开 contract

### `@logixjs/form`

- root `.`：
  - `Form.make`
  - `Form.Rule`
  - `Form.Error`
- subpaths：
  - `./locales`
- 当前已知张力：
  - 当前主问题已转到 supporting authority / inventory / example / planning drift，不再是 root export width
  - `SchemaErrorMapping` 已收口到 canonical decode leaf，但 owner wording、witness 与 control-plane proof 仍在 follow-up 收尾
  - runtime handle 的 getter 面与 `getState` 已退出 exact live shape，但相关 docs / proof 仍需同步回写
  - `Form.Error` 的 live shape 仍比 exact authority 更宽；`item / list / root` exact spelling 继续待定
  - `Form.Rule.fields(...)` 仍属于 supporting pending，最终 public status 继续待定
  - package manifest 已去掉 React 依赖误导，但 inventory / proposal mirror 仍需一起对齐
- 主链锚点：
  - `packages/logix-form/package.json`
  - `packages/logix-form/src/index.ts`
  - `packages/logix-form/src/Form.ts`
  - `packages/logix-form/src/Rule.ts`
  - `packages/logix-form/src/Error.ts`
  - `packages/logix-form/src/internal/form/**`
- post-`F1` follow-up：
  - [Form Authority Drift Writeback Contract](./form-authority-drift-writeback-contract.md)
  - [Form Live Residue Cutover Plan](../next/form-live-residue-cutover-plan.md)
  - [Form Error Decode Render Closure Contract](../next/form-error-decode-render-closure-contract.md)
  - [Form P0 Semantic Closure Wave Plan](../next/form-p0-semantic-closure-wave-plan.md)
  - `packages/logix-form/src/internal/validators/**`

### `@logixjs/query`

- root `.`：
  - `make`
  - `Engine`
  - `TanStack`
- subpaths：
  - 当前没有额外显式 subpath
- 当前已知张力：
  - live SSoT 已把 Query 视为 domain package 主体之一，这一轮不能再缺席
  - root 当前同时承接 `make / Engine / TanStack`，需要核对哪部分属于 exact surface，哪部分只是 integration residue
- 主链锚点：
  - `packages/logix-query/package.json`
  - `packages/logix-query/src/index.ts`
  - `packages/logix-query/src/Query.ts`
  - `packages/logix-query/src/Engine.ts`
  - `packages/logix-query/src/TanStack.ts`

### `@logixjs/i18n`

- root `.`：
  - `I18n`
  - `Token`
- current top-level subpaths：
  - `./I18n`
  - `./Token`
- 当前已知张力：
  - `./*` 泛开放会让未来任意顶层文件自动变成 public API
  - live SSoT 已把 I18n 视为当前 domain package 主体之一，这一轮不能再缺席
- 主链锚点：
  - `packages/i18n/package.json`
  - `packages/i18n/src/index.ts`
  - `packages/i18n/src/I18n.ts`
  - `packages/i18n/src/Token.ts`

### `@logixjs/domain`

- root `.`：
  - 当前主要暴露 `Crud` 相关类型
- current top-level subpaths：
  - `./Crud`
- 当前已知张力：
  - package 描述为 program-first pattern kit，但当前代码 surface 极窄，需要核对它是应继续保留、扩成明确 surface，还是继续压缩
  - `./*` 泛开放会让未来任意顶层文件自动变成 public API
  - root 类型面已经把 kit 内部构造细节一起放出
  - `CrudCommandsHandle` 的类型面比运行时注入面更宽
- 主链锚点：
  - `packages/domain/package.json`
  - `packages/domain/src/index.ts`
  - `packages/domain/src/Crud.ts`
  - `packages/domain/src/internal/crud/Crud.ts`

### `@logixjs/cli`

- root `.`：
  - `Commands`
- subpaths：
  - `./Commands`
- bin：
  - `logix`
  - `logix-devserver`
- 当前已知张力：
  - CLI surface 同时是用户入口和 runtime control plane 的宿主门面，需要单独核对它与 `runtime.check / runtime.trial / runtime.compare` 的 owner 边界
  - `trial` 当前仍像 report shell
  - `describe / ir.* / anchor.* / contract-suite.run / transform.module / logix-devserver` 更像 archived 或 expert residue
- 主链锚点：
  - `packages/logix-cli/package.json`
  - `packages/logix-cli/src/index.ts`
  - `packages/logix-cli/src/Commands.ts`
  - `packages/logix-cli/src/internal/commands/**`

### `@logixjs/test`

- root `.`：
  - `TestRuntime`
  - `TestProgram`
  - `Execution`
  - `Assertions`
  - `Vitest`
  - `Act`
- subpaths：
  - `./TestRuntime`
  - `./TestProgram`
  - `./Execution`
  - `./Assertions`
  - `./Vitest`
- 当前已知张力：
  - root 有 `Act` namespace，但 `exports` 没有对应 subpath
  - `Act` 明显牵到 `InternalContracts`，需要审 owner 与公开级别
- 主链锚点：
  - `packages/logix-test/package.json`
  - `packages/logix-test/src/index.ts`
  - `packages/logix-test/src/Act.ts`
  - `packages/logix-test/src/TestRuntime.ts`
  - `packages/logix-test/src/internal/**`

### `@logixjs/sandbox`

- root `.`：
  - `Types`
  - `Protocol`
  - `Client`
  - `Service`
- subpaths：
  - `./Client`
  - `./Protocol`
  - `./Service`
  - `./Types`
  - `./Vite`
  - `./vite`
- 当前已知张力：
  - `Vite / vite` 双入口需要核对是否都合理
  - browser worker runtime 与 core verification/control-plane 的边界需要单列审视
  - `Client.trial` 直接拼 wrapper 并触发 `Runtime.trial`，这条边界需要核对 owner
- 主链锚点：
  - `packages/logix-sandbox/package.json`
  - `packages/logix-sandbox/src/index.ts`
  - `packages/logix-sandbox/src/Client.ts`
  - `packages/logix-sandbox/src/Protocol.ts`
  - `packages/logix-sandbox/src/Service.ts`
  - `packages/logix-sandbox/src/Vite.ts`

### `@logixjs/devtools-react`

- root `.`：
  - `LogixDevtools`
  - `DevtoolsLayer`
  - `FieldGraphView`
- current top-level subpaths：
  - `./DevtoolsLayer`
  - `./FieldGraphView`
  - `./LogixDevtools`
- 当前已知张力：
  - devtools 是否属于主清单正文还是附录，需要结合实际 owner 和 runtime evidence surface 决定
  - root import 自带样式副作用
  - `FieldGraphView` 与 snapshot family 直接依赖 `InternalContracts / Debug / Observability`
- 主链锚点：
  - `packages/logix-devtools-react/package.json`
  - `packages/logix-devtools-react/src/index.tsx`
  - `packages/logix-devtools-react/src/LogixDevtools.tsx`
  - `packages/logix-devtools-react/src/DevtoolsLayer.tsx`
  - `packages/logix-devtools-react/src/FieldGraphView.tsx`

## 内部链路绑定规则

后续每个 chunk 都按同一条链看：

`package exports -> root/subpath public file -> package-local adapter -> internal owner -> authority docs -> README / tests witness`

如果某个 public noun 找不到稳定 owner，或必须跨两条不同 internal chain 才能解释清楚，就默认把它视为高风险审视对象。

## 当前高张力对象

- `@logixjs/core`：
  - `InternalContracts`
  - `ScopeRegistry`
  - root-only 与 subpath-only 并存的 taxonomy
- `@logixjs/react`：
  - `Hooks.ts` 仍混合 canonical 与 non-day-one helper
  - `package.json` 的 wildcard export
  - `React specialized residue` 已由 consumed contract 从 public surface 清除，但 `R3` 仍待继续评审
  - `ReactPlatform`
- `@logixjs/form`：
  - `SchemaErrorMapping`
  - `FormHandle` 实际 getter 面
  - `Form.Error.item/list/root`
  - `Form.Rule.fields(...)`
- `@logixjs/query`：
  - `make / Engine / TanStack` 的 exact surface 边界
- `@logixjs/i18n`：
  - wildcard package contract
  - `I18n / Token` 的 exact root 与 subpath 对齐
- `@logixjs/domain`：
  - `./*` 泛开放 contract
  - `CrudCommandsHandle`
  - core-adjacent type exports
- tooling / adjunct：
  - `@logixjs/cli` 的 archived residue
  - `@logixjs/test` 的 `Act`
  - `@logixjs/sandbox` 的 `trial` / `Vite` 双入口
  - `@logixjs/devtools-react` 的 root side effect 与 `FieldProgram` coupling

## Challenge Override Set

在对应 chunk 重新证明价值之前，下面这些历史保留语句都只算 prior baseline witness，不算当前默认结论：

- `Workflow`
- `Process`
- `Flow`
- `Link`
- 以及任何明显服务 static-first 旧目标函数的 orchestration residue

这意味着：

- live SSoT 里仍把它们描述成 expert family 的旧语句，此轮只作背景，不作默认保留依据
- 这些对象的默认起点是“先证明为什么不删”，不是“先解释该放在哪”

## 分块方案

| chunk | 范围 | 主要 surface | 关键内部链路 | 主要问题 |
| --- | --- | --- | --- | --- |
| `G0` | inventory-normalize gate | 全部公开 package、全部 entrypoint、wildcard reachability、README/test witness | 全部 package `package.json`、root barrel、boundary tests、README | 先消掉 `missing-public-entrypoint`、`wildcard-unbounded-surface`、witness 漂浮，再进入主题块 |
| `K1` | orchestration existence challenge | `旧 orchestration 家族` | `packages/logix-core/src/{Workflow,Process,Flow,Link}.ts` 与相关 runtime/install 链路 | 这些 static-first residue 今天是否还配继续存在；默认起点是 `delete` |
| `C1` | core canonical spine | `Module / Logic / Program / Runtime / ModuleTag / Handle / State / Actions / Action / Bound` | `packages/logix-core/src/{Module,Logic,Program,Runtime}.ts` 与 `src/internal/runtime/core/**` | canonical spine 是否还有多余 noun，root/subpath 是否同层，哪些 surface 该并或删 |
| `C2` | core residual split contract | `C2` 单块是否还成立 | `packages/logix-core/src/index.ts` 与 `runtime/{01,04,09,11}` | 单块 residual 是否混 owner，是否应先拆 |
| `C2A` | core residual adjunct split contract | `C2A` 单块是否还成立 | `packages/logix-core/src/index.ts` 与 `runtime/{01,03,10,11}` | 单块 adjunct residual 是否混 owner，是否应先拆 |
| `C2A1` | core carry-over support | `Action / Actions / Bound / Handle / Logic / ModuleTag / State` | `packages/logix-core/src/{Action,Actions,Bound,Handle,Logic,ModuleTag,State}.ts` | `C1` carry-over support 哪些应公开，哪些应 internalize |
| `C2A2` | core read projection protocol | `ReadQuery / ExternalStore / Resource` | `packages/logix-core/src/{ReadQuery,ExternalStore,Resource}.ts` | umbrella owner map 已冻结；实施拆到三个子 proposal |
| `C2A3` | core runtime adjunct escape hatch | `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` | `packages/logix-core/src/{MatchBuilder,ScopeRegistry,Root,Env,Platform,Middleware,EffectOp}.ts` 与 `internal/InternalContracts.ts` | runtime adjunct 与 escape hatch 哪些应 internalize 或 toolkit |
| `C2B` | core verification and evidence | `ControlPlane / Debug / Observability / Reflection / Kernel` | `packages/logix-core/src/{ControlPlane,Debug,Observability,Reflection,Kernel}.ts` 与 `runtime/{04,09,11}` | verification/evidence/kernel owner 是否合并，哪些必须退出 root |
| `R1` | React canonical host route | `RuntimeProvider / useModule / useImportedModule / useSelector / useDispatch / fieldValue / rawFormMeta` | `packages/logix-react/src/{RuntimeProvider,Hooks,FormProjection}.ts` 与 `src/internal/{provider,hooks}/**` | host law 是否已闭合，adjunct read helper 是否归位，README 与 live SSoT 是否一致 |
| `R2` | React specialized bound block | `useLocalModule / useLayerModule / ModuleScope family / useModule(internal ProgramRuntimeBlueprint)` | 以 [React Host Specialized API Cut Contract](./react-host-specialized-api-cut-contract.md) 为 authority input；当前已 consumed 并完成 live writeback | 总清单只保留 inventory 关联与去向，不再双写子提案裁决 |
| `R3` | React adjunct / transport residue | `useModuleList / ExpertHooks / ReactPlatform / Platform / ScopeRegistry transport` | `packages/logix-react/src/{Hooks,ExpertHooks,ReactPlatform,Platform}.ts` 与 `packages/logix-core/src/ScopeRegistry.ts` | 这组对象是否还该继续公开，以及是否应转 toolkit / expert / internal |
| `F1` | Form exact surface | `@logixjs/form` root + `./locales` | `packages/logix-form/src/**` | exact surface、error truth、handle truth、support primitives 是否继续同包承接 |
| `Q1` | Query exact surface | `@logixjs/query` root | `packages/logix-query/src/{Query,Engine,TanStack}.ts` | `make / Engine / TanStack` 的 exact owner 与 integration residue 边界 |
| `I1` | I18n exact surface | `@logixjs/i18n` root + wildcard subpaths | `packages/i18n/src/{I18n,Token}.ts` | `I18n / Token` root vs subpath contract 以及 wildcard 风险 |
| `D1` | Domain exact surface | `@logixjs/domain` root + `./Crud` | `packages/domain/src/**` | `./*` contract、Crud exact kit surface、domain 与 toolkit 分工 |
| `T1` | CLI control-plane surface | `@logixjs/cli` root、`./Commands`、bin | `packages/logix-cli/src/**` | 主命令面与 archived residue 如何切开，`trial` 的 owner 是否合理 |
| `T2` | Test harness surface | `@logixjs/test` root 与 subpaths | `packages/logix-test/src/**` | canonical harness 与 `Act` internal leak 如何切开 |
| `T3` | Sandbox surface | `@logixjs/sandbox` root、subpaths、`Vite/vite` | `packages/logix-sandbox/src/**` | browser trial、kernel infra、双入口与 worker/compiler contract |
| `T4` | Devtools appendix | `@logixjs/devtools-react` root 与 subpaths | `packages/logix-devtools-react/src/**` | 是否留在公开附录、root side effect 是否可接受、debug/internal coupling 是否过深 |

## 建议评审顺序

1. `G0`
2. `K1`
3. `C1`
4. `R1`
5. `R2`
6. `R3`
7. `F1`
8. `Q1`
9. `I1`
10. `D1`
11. `C2`
12. `C2A`
13. `C2A1`
14. `C2A2`
15. `C2A3`
16. `C2B`
17. `T1`
18. `T2`
19. `T3`
20. `T4`

顺序理由：

- 先做 `G0`，保证 package universe、wildcard reachability 与 witness 集闭合
- 再做 `K1`，先回答 `workflow / process / flow / link` 这些历史概念是否还配继续存在
- 先冻结 canonical spine 和 React host law，再处理 React residue
- Form / Query / I18n / Domain 分开审，避免不同 owner law 混在一个块里
- tooling 与 devtools 放在后面，但不再用一个大兜底块重审全包治理

## 当前进展

### 已冻结

- `G0`
  当前 package universe、row-wise manifest、`semantic_disposition / decision_owner / future_authority` 三轴分离已经冻结。
- `C1`
  core canonical spine 已冻结为 `MPR-3 Spine`。当前固定公式是：
  `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`；root canonical noun 固定为 `Module / Program / Runtime`；`Logic` namespace、`ModuleTag` 和其余 support surface 全部退出 `C1`。
- `R2`
  `useLocalModule / useLayerModule / ModuleScope family / useModule(internal ProgramRuntimeBlueprint)` 的 specialized residue 子提案已经收口。
- `C2`
  单块 `C2` 已被冻结为 split contract：下一轮不再继续审一个大块 residual，而改走 `C2A / C2B` 两个更小 contract。
- `C2A`
  单块 `C2A` 已被冻结为 split contract：下一轮不再继续审一个大块 adjunct residual，而改走 `C2A1 / C2A2 / C2A3` 三个更小 contract。
- `C2A1`
  carry-over support 已冻结为 public-zero contract：`Action / Actions / Bound / Handle / Logic / ModuleTag / State` 全部退出 public core。
- `C2A2`
  read projection protocol 已冻结为 public-zero contract：`ReadQuery / ExternalStore / Resource` 全部退出 public core。
  终局 owner map 统一看 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md)。
  实施入口拆为：
  [ReadQuery Selector Law Internalization Contract](./read-query-selector-law-internalization-contract.md)、
  [ExternalStore Runtime Seam Cutover Contract](./external-store-runtime-seam-cutover-contract.md)、
  [Resource Query Owner Relocation Contract](./resource-query-owner-relocation-contract.md)。
- `C2A3`
  runtime adjunct / escape hatch 已冻结为 public-zero contract：`MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` 全部退出 public core。
- `C2B`
  verification / evidence / kernel surface 已冻结为 `VerificationControlPlane`：只保留 `./ControlPlane` 这一条 shared protocol shell，`Debug / Observability / Reflection / Kernel` 全部退出 public core。
- `F1`
  form exact surface 已冻结为更小的 core-first contract：`@logixjs/form` root 只保留 `Form.make / Form.Rule / Form.Error`，`./locales` 只保留 optional plain locale assets。
- `Q1`
  query exact surface 已冻结为 `make + Engine` 的最小 root contract：`TanStack` 退出 public root。
- `I1`
  i18n exact surface 已冻结为 `I18n-Tag-Token Minimal Contract`：root 只保留 `I18n / I18nTag / token(...)` 与 token contract types，`./I18n / ./Token / ./*` 全部退出。
- `D1`
  domain exact surface 已冻结为 `Rootless Crud Minimal Contract`：`@logixjs/domain` root 与 `./*` 全部退出，只保留 `@logixjs/domain/Crud` 这一条最小 CRUD 入口。
- `T1`
  CLI control-plane surface 已冻结为 `Route-Minimal Runtime CLI Contract`：公开 CLI surface 只保留 `bin: logix` 与 `check / trial / compare`。
- `T2`
  test harness surface 已冻结为 `Root-Minimized TestProgram Harness Contract`：公开面只保留 root `TestProgram`。
- `T3`
  sandbox surface 已冻结为 `Sandbox Host Wiring + vite Contract`：root 只留 `SandboxClientTag / SandboxClientLayer`，子路径只留 `vite`。
- `T4`
  devtools appendix 已冻结为 `Zero-Surface Devtools Appendix Contract`：`@logixjs/devtools-react` root、subpath、wildcard 与 root side effect 全部退出 exact public surface。
- `K1`
  orchestration surface cluster 已冻结为 delete-first contract。当前默认位是：
  `Workflow noun`、`Program.config.workflows`、`Flow`、`Link`、`旧 process link 公开入口`、`旧声明式 process link 公开入口`、`旧 process 定义入口`、`旧 process 定义读取辅助 / getMeta / attachMeta`、`Program.config.processes` 全部站在 `delete` 一侧；`useProcesses` 只向 `R3` 输出上游约束。
- `R3`
  React host residue 已冻结为 delete-first contract。当前默认位是：
  `useProcesses`、`ReactPlatform`、`ReactPlatformLayer` 全部站在 `delete` 一侧；若 `ReactPlatformLayer` 想活，只能走后续 bridge contract reopen。

### 已实施

- Batch 1 `K1 + R3 Public Reach Cutover` 已实施完成。
- Batch 2 `C1 MPR-3 Spine Cutover` 已实施完成。
- Batch 3 `Q1 + I1 + D1 Leaf Domain Package Cutover` 已实施完成。
- Batch 4 `T1 + T2 + T3 + T4 Tooling Appendix Cutover` 已实施完成。
- Batch 5 `F1 Form Exact Surface Cutover` 已实施完成。
- Batch 6 `C2A1 Carry-Over Support Cutover` 已实施完成。
- Batch 7 `C2A2 Read Projection Protocol Cutover` 已实施完成。
- live SSoT 与 standards 已完成首批回写：
  `runtime/03`、`runtime/05`、`runtime/07`、`runtime/10`、`runtime/12`、`platform/02`、`guardrails`、`postponed naming`
- `C1` 的 authority docs 已完成回写：
  `runtime/01`、`runtime/03`、`runtime/07`、`runtime/10`、`guardrails`
- `@logixjs/core` root canonical witness 已完成收口：
  root canonical mainline 现在只保留 `Module / Program / Runtime`
- `@logixjs/core` 的 repo fallout 已完成首批迁移：
  旧 root `Logic / ModuleTag / Bound / State` 写法已改到 subpath 或局部命名
- `packages/logix-react/README.md` 已按 `R3` 结论清理。
- `apps/docs` 的首批 API 入口与 guide 已完成清理。
- `examples/logix-react` 的旧 `Link / useProcesses` demo 已删除。
- `examples/logix` 中直接暴露旧 orchestration surface 的 scenario 与 customer-search glue 已删除或改写。
- `@logixjs/react` 的公开出口已完成收口：
  `./ExpertHooks`、`./ReactPlatform`、`./Platform` 已从 package exports 与 root barrel 移除。
- `@logixjs/core` 的公开出口已完成收口：
  `./Flow`、`./Workflow`、`./Link`、`./Process` 已从 package exports 与 root barrel 移除。
- `@logixjs/query` 的公开出口已完成收口：
  root 当前只保留 `make / Engine`，`TanStack` 已退出 public root。
- `@logixjs/i18n` 的公开出口已完成收口：
  root 当前只保留 `I18n / I18nTag / token(...)` 与 token contract types，`./I18n / ./Token / ./*` 已退出。
- `@logixjs/domain` 的公开出口已完成收口：
  `@logixjs/domain` root 与 `./*` 已退出，只保留 `@logixjs/domain/Crud` 这一条最小 CRUD 入口。
- `@logixjs/form` 的公开出口已完成收口：
  root 当前只保留 `Form.make / Form.Rule / Form.Error`，`./locales` 继续作为 optional plain locale asset subpath。
- `@logixjs/core` 的 carry-over support 已完成收口：
  `Action` root 已退出，`./Actions / ./Bound / ./Handle / ./Logic / ./ModuleTag / ./State` 已从 package exports 移除，repo 内相关类型与 docs 示例已迁到当前 owner。
- 直接为旧 public surface 做见证的 tests 已完成首批删除或改写：
  `packages/logix-react/test/PublicSurface` 对齐新 reachability；
  `packages/logix-core/test/{Process,Flow,Link}`、`test/internal/Workflow`、相关 workflow/browser perf witness 已删除；
  `KernelBoundary`、`Runtime.make.Program`、`Runtime.runProgram.onError`、`runtime-logix-chain` 已回写到当前口径。

### 还未冻结

- 无

### 已冻结但未完全落实

- `K1`
  public reach 已消费完成；深层 internal runtime 与实现链仍未进入当前批次。
- `R3`
  public reach 已消费完成；若后续需要继续下切 bridge/toolkit 边界，需另开冻结批次。

### 当前最可能的下一批

- 无

## 实施节奏

从当前开始，这份总提案按下面的节奏推进：

1. 先冻结一批
2. 为该批次写一份独立实施 plan
3. 实施前停下来让用户确认
4. 实施
5. 把已实施结果回写到本页的“当前进展”

额外实施约束：

- 迁移期允许用测试辅助 cutover
- 迁移期新增的测试断言，默认应折回现有、直接服务内核源码功能的长期测试文件
- 不把 migration-only test file 当作最终产物长期保留
- 若某个临时测试文件只服务迁移过程，它必须在同一批次内被并回长期测试或被删除
- 最终仓库中的测试文件，应优先表达稳定源码 contract、长期行为 witness 与真实 owner law，不保留历史迁移脚手架残留

冻结继续统一走 `plan-optimality-loop`。
实施前的计划统一走 `writing-plans`。
当前仓库中的总进度，以本页为单一总览。

## 当前实施批次

### Batch 1

- 名称：
  `K1 + R3 Public Reach Cutover`
- 当前状态：
  `split-into-follow-up-proposals`
- 范围：
  - 消费已冻结的 `K1`
  - 消费已冻结的 `R3`
  - 继续收口 `@logixjs/core` 与 `@logixjs/react` 的公开 exports / root barrel
  - 清理直接面向用户的 README、apps/docs、examples、public-surface tests
- 不包含：
  - 重新挑战 `K1` / `R3` 结论
  - 新一轮 `C1 / C2 / F1 / Q1 / I1 / D1 / T1-T4` 冻结
  - 深层 internal runtime 重构
- 实际完成：
  - `@logixjs/core` 与 `@logixjs/react` 的旧 orchestration / host residue subpath 已从公开 exports 移除
  - README、apps/docs、examples/logix-react、examples/logix 的直接用户入口已消费当前结论
  - 旧 public-surface witness tests 已删改到当前口径

### Batch 2

- 名称：
  `C1 MPR-3 Spine Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `C1`
  - 回写 `MPR-3 Spine` 到 live SSoT 与 guardrails
  - 收口 `@logixjs/core` root canonical mainline witness
  - 迁移仍在教授旧 root canonical 心智的 docs/examples/test 入口
- 不包含：
  - 重新挑战 `C1` 结论
  - 新一轮 `C2` freeze
  - `C2` residual 的最终 disposition
  - 深层 runtime 重构
- 实际完成：
  - `MPR-3 Spine` 已回写到 live SSoT 与 guardrails
  - `@logixjs/core` root barrel 已去掉 `Logic / ModuleTag / Bound / Handle / State / Actions`
  - 相关 witness tests 已并回现有长期测试文件
  - repo 内直接依赖旧 root canonical 写法的 docs/examples/tests 已完成首批迁移

### Batch 3

- 名称：
  `Q1 + I1 + D1 Leaf Domain Package Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `Q1`
  - 消费已冻结的 `I1`
  - 消费已冻结的 `D1`
  - 收口 leaf domain package 的 root/subpath/wildcard surface
  - 同步回写 domain package witness tests 与 docs promise
- 不包含：
  - `F1`
  - `T1` 到 `T4`
  - `C2A* / C2B`
  - 深层 runtime 重构
- 实际完成：
  - `@logixjs/query` root barrel 已移除 `TanStack`，相关 witness tests 与 consumer imports 已改到当前口径
  - `@logixjs/i18n` root barrel 与 package exports 已收口到最小 service-first contract
  - `@logixjs/domain` root 已退为零公开 contract，`./Crud` 已收口到最小 CRUD program-kit surface
  - `runtime/08` 与总提案 manifest 已回写当前 authority
  - `examples/logix` 与 `examples/logix-react` 中受 `Q1 / I1` 影响的旧 root imports 已迁到当前 contract，`pnpm typecheck` 已重新跑通

### Batch 4

- 名称：
  `T1 + T2 + T3 + T4 Tooling Appendix Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `T1`
  - 消费已冻结的 `T2`
  - 消费已冻结的 `T3`
  - 消费已冻结的 `T4`
  - 收口 tooling / appendix packages 的 root / subpath / bin / wildcard surface
  - 同步回写 repo consumers、authority docs 与总提案进度
- 不包含：
  - `F1`
  - `C2A* / C2B`
  - 深层 runtime 重构
- 当前已完成：
  - `T1` 的 CLI code path 已收口到 `logix check / trial / compare`，`packages/logix-cli` focused tests 与 package typecheck 已通过
  - `examples/logix-cli-playground` 与 `runtime/09` 已按最小 CLI contract 回写
  - `T2` 的 test harness code path 已收口到 root 单一 noun `TestProgram`
  - `packages/logix-test`、`examples/logix-react/test/module-flows.integration.test.ts`、`packages/logix-react/test/integration/runtime-yield-to-host.integration.test.tsx` 的 focused tests 已通过
  - `T3` 的 sandbox code path 已收口到 root `SandboxClientTag / SandboxClientLayer` 与 `@logixjs/sandbox/vite`
  - `packages/logix-sandbox` focused tests 与整仓 `pnpm typecheck` 已通过，`sandbox-mvp` 和 `apps/logix-galaxy-fe` 已迁到当前 contract
  - `T4` 的 devtools appendix 已收口为零公开面，`packages/logix-devtools-react` focused tests 已通过，`examples/logix-react`、`apps/logix-galaxy-fe` 与 `debugging-and-devtools*` 已移除公开包依赖与教法
  - `T1 / T2 / T3 / T4` 的 manifest 行、authority docs 与批次进度已回写到当前事实源

### Batch 5

- 名称：
  `F1 Form Exact Surface Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `F1`
  - 收口 `@logixjs/form` root exact surface
  - 保留 `./locales` 作为 optional plain locale asset subpath
  - 迁移 support primitive 的 repo consumers 与长期 witness tests
- 不包含：
  - `C2A* / C2B`
  - Form runtime 内核重构
  - 深层 runtime 重构
- 实际完成：
  - `@logixjs/form` root 已收口到 `Form.make / Form.Rule / Form.Error`
  - `Form.Path / SchemaPathMapping / SchemaErrorMapping` 已退出 root public surface，并改到 direct owner tests 或 repo-local helper
  - `@logixjs/form/locales` 继续保留为 optional plain locale asset subpath
  - `apps/docs/content/docs/form/{introduction,schema,validation}.{md,cn.md}` 已改到当前 public contract
  - `packages/logix-form` focused tests、package test typecheck、`examples/logix-react` typecheck 与整仓 `pnpm typecheck` 已通过

### Batch 6

- 名称：
  `C2A1 Carry-Over Support Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `C2A1`
  - 收口 `@logixjs/core` 的 carry-over support surface
  - 迁移 repo 内依赖旧 support surface 的 packages / examples / docs
- 不包含：
  - `C2A2`
  - `C2A3`
  - `C2B`
  - 深层 runtime 重构
- 实际完成：
  - `@logixjs/core` root 已移除 `Action`，`./Actions / ./Bound / ./Handle / ./Logic / ./ModuleTag / ./State` 已从 package exports 移除
  - core root witness 与 allowlist tests 已改到 public-zero carry-over support contract
  - `packages/domain / logix-query / logix-test / logix-react / logix-form` 的旧 root support type 依赖已迁到当前 owner
  - `examples/logix`、`examples/logix-form-poc`、`examples/logix-react`、`examples/logix-sandbox-mvp` 与 `apps/docs/content/docs/guide/recipes/unified-api*` 的旧 support surface 写法已迁到当前 owner
  - 整仓 `pnpm typecheck` 已重新跑通

### Batch 7

- 名称：
  `C2A2 Read Projection Protocol Cutover`
- 当前状态：
  `implemented`
- 范围：
  - umbrella owner map 已冻结
  - 实施拆成三个 follow-up proposal
  - 统一管理 `ReadQuery / ExternalStore / Resource` 的 exact landing 与后续回写
- 不包含：
  - `C2A1`
  - `C2A3`
  - `C2B`
  - 深层 runtime 重构
- 当前落点：
  - `@logixjs/core` root 与 package exports 已移除 `ReadQuery / ExternalStore / Resource`
  - umbrella owner map 已冻结为：
    `ReadQuery -> selector law internal`
    `ExternalStore -> runtime/react seam internal`
    `Resource -> Query.Engine.Resource`
  - `ReadQuery` 已回收到 selector law internal owner，repo-internal grouped route 与公开 helper noun 已收口
  - `ExternalStore` 已回收到 runtime / field / React seam internal owner，repo-internal grouped route 已收口
  - `Resource` 已迁到 `@logixjs/query` owner，公开 landing 固定为 `Query.Engine.Resource`
  - `packages/logix-query/src/**` 与 non-archive examples 已切离 core `ReadContracts.Resource` lineage
  - `workspace exports / allowlist`、`public d.ts surface`、`repo-internal route closure`、`docs/examples/tests residue` 已有 focused witness
    `old proposal de-authorize`

### Batch 8

- 名称：
  `C2A3 Runtime Adjunct Escape Hatch Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `C2A3`
  - 收口 `@logixjs/core` 的 `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`
  - 迁移 repo 内依赖旧 runtime adjunct / escape hatch public surface 的 packages / examples / docs
- 不包含：
  - `C2A2`
  - `C2B`
  - 更深的 `K1 / R3` internal runtime 清理
  - 深层 runtime 重构
- 实际完成：
  - `@logixjs/core` root 与 package exports 已移除 `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`
  - core root witness 与 allowlist tests 已对齐 public-zero adjunct contract，`ScopeRegistry / Platform / Middleware / EffectOp` 的长期 witness 已迁到 internal owner
  - `packages/logix-test / logix-react / logix-query / logix-form / logix-devtools-react` 的实现与长期 tests 已改到 repo-internal owner，不再依赖旧 public shell
  - `examples/logix`、`examples/logix-react`、`examples/logix-sandbox-mvp` 中直接教学旧 expert adjunct shell 的场景已删除或改写
  - `apps/docs` 与 live SSoT 已移除 `Root.resolve(...)` 和 runtime middleware shell 的当前教学口径
  - focused core/i18n tests、相关 package typecheck、examples typecheck 与整仓 `pnpm typecheck` 已通过

### Batch 9

- 名称：
  `C2B Verification And Evidence Surface Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费已冻结的 `C2B`
  - 收口 `@logixjs/core` 的 `Debug / Observability / Reflection / Kernel`
  - 保留 `@logixjs/core/ControlPlane`
  - 迁移 repo 内依赖旧 verification / evidence public shell 的 packages / examples / docs
- 不包含：
  - `C2A*`
  - 更深的 `K1 / R3` internal runtime 清理
  - manifest 全量回填
  - 深层 runtime 重构
- 实际完成：
  - `@logixjs/core` root 与 package exports 已收口到 `./ControlPlane` 单一 shared verification shell，`Debug / Observability / Reflection / Kernel` 已退出 public reach
  - 仓内实现、长期 witness 与 examples 已迁到 repo-internal owner，不再依赖旧 verification / evidence public shell
  - apps/docs 的 `debug / observability / inspection / debugging-and-devtools` 用户页面已删除，相关导航和交叉链接已同步清理
  - live SSoT 与 guardrails 已改到当前 `VerificationControlPlane` 口径
  - 活跃代码与当前 docs 搜索面已清空旧 public verification / evidence shell

### Batch 10

- 名称：
  `Visible Residue Clean Sweep Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 消费 `K1` 的可见 orchestration residue
  - 收口仍挂在 `src/*.ts` 根层的旧 `Debug / Observability / Reflection / Kernel / 旧 orchestration 家族`
  - 把 `@logixjs/core` 的 `repo-internal/*` wildcard 收成显式 allowlist
  - 消费 `R3` 中已明确的 `useModuleList` 公开残留
  - 回写 live SSoT、README、examples 与总提案进度
- 不包含：
  - `control-program.surface.json` 一类更深层 control-plane 工件命名调整
  - `useRuntime / shallow` 的最终 semantic fate
  - 更深的 internal runtime 核心重构
  - 新一轮 reopen freeze
- 实际完成：
  - `Program.make(...)` 的公开装配面已移除 `processes / workflows`；对应旧 process public witness 已删除，公开 authoring 不再承接 orchestration slot
  - `@logixjs/core` 的 `repo-internal/*` wildcard 已收成显式 allowlist，`repo-internal/runtime/core/env` 这类深路径已退出 active consumer 面
  - `useModuleList` 已从 `@logixjs/react/Hooks` 退出，相关 public reachability 与 host contract 已对齐
  - live SSoT、guardrails 与 `packages/logix-react/README.md` 已回写到当前 verification owner、control-plane code roots、React exact hook set 与 repo-internal 规则
  - focused core/react boundary tests、相关 package typecheck、examples typecheck 与整仓 `pnpm typecheck` 已通过

### Batch 11

- 名称：
  `Deep Internal Runtime Cutover`
- 当前状态：
  `implemented`
- 范围：
  - 深层 orchestration internal runtime 清理
  - `InternalContracts` 继续拆 owner
  - React/query/form/test/devtools 对大口子 internal 的继续迁移
  - live SSoT 回写
- 不包含：
  - `control-program.surface.json` 一类 artifact 命名调整
  - `useRuntime / shallow` 的最终 semantic fate
  - 新一轮 public surface reopen
- 实际完成：
  - `Module / Program / Runtime / trialRunModule` 已切断对公开 authoring corollary `processes / workflowDefs` 的依赖；`Program.make(...)` 不再把 orchestration slot 带入 deep internal 事实
  - `controlSurface` 已不再从 program internal 读取 `workflowDefs` 生成默认 manifest attachment；workflow 若继续存在，只按 internal control-plane artifact 理解
  - `repo-internal/runtime-contracts`、`repo-internal/read-contracts`、`repo-internal/field-contracts` 已落盘；active source 中 React 主链、Query 主链、Form rowId/validate 主链、LogixTest 调度入口与 Devtools 的 `FieldProgram` 类型入口已迁到更窄 owner
  - live SSoT 与 guardrails 已回写到“公开 authoring 不承接 orchestration slot、internal runtime 才是唯一残余入口、repo-internal 继续按小 owner 收窄”的当前口径
  - focused core/react tests 与整仓 `pnpm typecheck` 已通过

### Batch 12

- 名称：
  `Residual Owner And Artifact Cleanup`
- 当前状态：
  `implemented`
- 范围：
  - 剩余 `InternalContracts` consumer 扇出
  - workflow artifact 命名收口
  - 旧 owner 文件物理退出或最后一层桥接整理
- 不包含：
  - 新一轮 public surface reopen
  - `useRuntime / shallow` 的最终 semantic fate
- 实际完成：
  - 剩余 active source / examples / 代表性长期 tests 已继续从 `repo-internal/InternalContracts` 扇出到 `runtime-contracts / read-contracts / field-contracts`
  - CLI / smoke script / control-surface manifest 已把 `controlProgramSurface / control-program.surface.json` 收口到 `controlProgramSurface / control-program.surface.json`
  - `Observability` 对外 export 与相关 witness 已改到 control-program artifact 口径
  - `repo-internal/debug-api / evidence-api / reflection-api / kernel-api` 已直接指向 internal owner；旧 root owner 文件已从源码树物理退出
  - `git diff --check`、focused core/cli tests 与整仓 `pnpm typecheck` 已通过

## 完成条件

当下面条件全部满足，这轮总清单才算完成：

1. 当前每个公开 package 与 public entrypoint 都已进入 manifest
2. 当前每一行 manifest 都已绑定 `internal-chain / authority-primary / witnesses / chunk`
3. 当前每一行 manifest 都已拆开 `candidate-disposition / decision-owner / future-authority`
4. `G0` 已完成，wildcard reachability 与 witness 集已冻结
5. `K1` 已完成，`workflow / process / flow / link` 是否继续存在已有明确结论或明确 decision owner
6. [React Host Specialized API Cut Contract](./react-host-specialized-api-cut-contract.md) 与总清单已完成轻关联，不再双写范围
7. 没有只存在于 code、只存在于 README，或只存在于 tests 的漂浮 surface

## 非目标

- 本页不直接改实现代码
- 本页不直接改 `apps/docs/**`
- 本页不直接重写全部 live SSoT
- 本页不重复展开 React specialized 子提案已经覆盖的局部论证

## 当前一句话结论

这轮 public surface inventory、冻结批次与已实施批次已经全部回写到当前事实；当前总提案已完成自身使命。
