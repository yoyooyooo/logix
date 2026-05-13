---
title: React Host Specialized API Cut Contract
status: consumed
owner: react-host-specialized-api-cut
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/07-standardized-scenario-patterns.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/ssot/runtime/12-toolkit-candidate-intake.md
  - docs/standards/logix-api-next-guardrails.md
  - packages/logix-react/README.md
last-updated: 2026-04-18
---

# React Host Specialized API Cut Contract

## 目标

把 React host specialized residue 的公开去向直接收口到可执行 contract。

本页只裁决四组对象：

- `useLocalModule(module/tag, options)`
- `useLocalModule(factory, deps)`
- `useLayerModule(...)`
- `ModuleScope family`
- `useModule(internal ProgramRuntimeBlueprint)`

本页不重述已存在的 React exact host law。
当前基线、toolkit 门禁与 canonical host formula 统一回链：

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/07-standardized-scenario-patterns.md](../ssot/runtime/07-standardized-scenario-patterns.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)

## 当前 claim

当前采用更小候选 `C'`：

1. `@logixjs/react` 的 closure 标准从“root barrel 干净”升级为“全 public reachability 干净”
2. 这组 residue 全部退出 sanctioned public contract
3. `useModule(internal ProgramRuntimeBlueprint)` 不再保留公开降级地位，只允许 internal/test residue
4. `ModuleScope` 裁决对象是整个 family，不只是一条 `make(...)`
5. 本页不再定义 future toolkit reopen gate；未来若要重开，统一回到 [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
6. 本页不顺手冻结 `useDispatch`、`useModule(ModuleRuntime)`、`useModule(ModuleRef)` 或 adjunct helper 的 exact surface

## Scope

### in scope

- specialized acquisition residue 的公开去向
- package public reachability 的 cut 面
- future authority 应归 core reopen 还是 toolkit intake
- 作为 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里 `C4` 的绑定输入

### out of scope

- `useDispatch(handle)` 的 exact contract
- `useModule(ModuleRuntime)` 与 `useModule(ModuleRef)` 的消费型句柄 contract
- adjunct read helper inventory
- `ScopeRegistry` / cross-root transport 的 owner 设计

若后续要重开这些对象，必须另开 contract，不复用本页。

## Closure Standard

本页的“退出公开面”统一按 `@logixjs/react` 全 public reachability 判断，至少覆盖：

- root export
- `./Hooks`
- `./ReactPlatform`
- `./ModuleScope`
- `package.json` export map 可达子路径
- root 级 aggregator object 可达属性
- README / examples / SSoT / standards 中的公开写法

只清 root barrel 不算完成。

## Disposition Matrix

| surface | public-disposition | residual-disposition | future-authority | reason-codes | writeback-owner |
| --- | --- | --- | --- | --- | --- |
| `useLayerModule(...)` | `delete-current-route` | `internal/test-only if needed` | `none` | `R1,R2,R3` | `runtime/10`, `guardrails`, `README`, package export surface |
| `useLocalModule(factory, deps)` | `delete-current-route` | `internal/test-only if needed` | `none` | `R1,R2,R3` | `runtime/10`, `guardrails`, `README`, package export surface |
| `useLocalModule(module/tag, options)` | `delete-current-route` | `no sanctioned public residue` | `toolkit-intake-only, unnamed future recipe` | `R1,R2,R4,R5` | `runtime/01`, `runtime/03`, `runtime/10`, `guardrails`, `README`, package export surface |
| `ModuleScope family` | `delete-current-family` | `no sanctioned public residue` | `none in this contract` | `R2,R3,R4,R5,R6` | `runtime/07`, `runtime/10`, `guardrails`, `README`, package export surface |
| `useModule(internal ProgramRuntimeBlueprint)` | `delete-current-route` | `internal/test-only if needed` | `core-reopen-only` | `R1,R2,R4` | `runtime/01`, `runtime/03`, `runtime/10`, `guardrails`, `README`, package export surface |

`ModuleScope family` 在本页指：

- `ModuleScope.make`
- `ModuleScope.Provider`
- `ModuleScope.use`
- `ModuleScope.useImported`
- `ModuleScope.Context`
- `ModuleScope.Bridge`

## Reason Codes

- `R1`：第二装配入口
- `R2`：第二 host law 或隐藏 host DSL
- `R3`：公开 reachability 侧门
- `R4`：历史 noun / lowering residue 回潮
- `R5`：第二套 toolkit 准入门禁
- `R6`：family 级 side DSL 混入高权限 transport 语义

## Future Authority

### 1. toolkit-intake-only

只适用于：

- `useLocalModule(module/tag, options)` 对应的“局部 program recipe 场景”

规则：

- 当前 noun 不保留
- 当前 object shape 不保留
- 未来若有真实重复场景，只能按 [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md) 重新 intake
- 不允许沿用历史 noun lineage 直接回流

### 2. core-reopen-only

只适用于：

- `useModule(internal ProgramRuntimeBlueprint)`

规则：

- 它不默认停靠 expert
- 它不进入 toolkit reopen bucket
- 若未来真要重开公开路线，必须单独发起 core contract reopen，并先证明存在无法机械回解到 `Program / Runtime / host law` 的真实场景

### 3. none in this contract

适用于：

- `useLayerModule(...)`
- `useLocalModule(factory, deps)`
- `ModuleScope family`

含义：

- 本页不给它们任何 sanctioned future bucket
- 若未来真的需要相关能力，必须先拆出新的 owner 议题，再另立 contract
- 对 `ModuleScope family` 来说，`scopeId / ScopeRegistry / cross-root transport` 不进入本页的 future reopen surface

## Proof Obligations

若这份候选要通过，后续实现与回写至少要满足：

1. 公开 import shape 不再暴露这组 residue
2. root aggregator 不再通过属性重新挂出这组 residue
3. README、examples、SSoT、standards 不再把它们写成公开路线
4. `useModule` 的公开 contract 不再包含 `internal ProgramRuntimeBlueprint`
5. `ModuleScope family` 的 family 级残留从标准场景文本中清空
6. future reopen 全部回收到 [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md) 或单独 core reopen
7. 本页之外的相邻 consumer route 继续沿用现 authority，不在本页追加 exact noun

## Writeback Matrix

| area | required writeback |
| --- | --- |
| runtime spine | `docs/ssot/runtime/01-public-api-spine.md` |
| canonical authoring | `docs/ssot/runtime/03-canonical-authoring.md` |
| scenario patterns | `docs/ssot/runtime/07-standardized-scenario-patterns.md` |
| react host boundary | `docs/ssot/runtime/10-react-host-projection-boundary.md` |
| toolkit authority | `docs/ssot/runtime/11-toolkit-layer.md`, `docs/ssot/runtime/12-toolkit-candidate-intake.md` |
| standards | `docs/standards/logix-api-next-guardrails.md` |
| public docs | `packages/logix-react/README.md` |
| package surface | `packages/logix-react/src/Hooks.ts`, `packages/logix-react/src/index.ts`, `packages/logix-react/src/ReactPlatform.ts`, `packages/logix-react/src/ModuleScope.ts`, `packages/logix-react/package.json` |

## 当前一句话结论

这组 specialized residue 的终局去向是“退出 `@logixjs/react` 全 public contract”；其中 `useLocalModule(module/tag, options)` 只保留一个 unnamed toolkit-intake future authority，`useModule(internal ProgramRuntimeBlueprint)` 只保留一个 core-reopen-only future authority，其余对象在本页不再拥有 sanctioned public future bucket。

## 去向

- 2026-04-18 已消化到：
  - [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
  - [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
  - [../ssot/runtime/07-standardized-scenario-patterns.md](../ssot/runtime/07-standardized-scenario-patterns.md)
  - [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
  - [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
  - [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
  - [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
  - [../../packages/logix-react/README.md](../../packages/logix-react/README.md)
