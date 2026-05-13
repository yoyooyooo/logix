---
title: Toolkit Candidate Harvest From Examples And Call Surfaces
status: superseded
owner: toolkit-candidate-harvest
target-candidates:
  - docs/ssot/runtime/12-toolkit-candidate-intake.md
  - docs/internal/toolkit-candidate-ledger.md
  - specs/147-toolkit-layer-ssot/spec.md
last-updated: 2026-04-18
---

# Toolkit Candidate Harvest From Examples And Call Surfaces

## historical status

这份 proposal 保留为一轮历史快照。

其中关于 `form meta derived view` 属于 `toolkit-first-wave` 的判断，已经被后续的 core-gap 改判覆盖。
当前应以这些 live 页面为准：

- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
- [../internal/toolkit-candidate-ledger.md](../internal/toolkit-candidate-ledger.md)
- [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md)

## 目标

基于 `examples/logix-react/**`、`call` 相关样本与当前已冻结的 toolkit 定位，收口当前阶段能冻结的四类对象：

1. `closed-core-surface`
2. `core-gap`
3. `toolkit-first-wave`
4. `reject-residue`

这份 proposal 不追求穷尽清单。
它只追求：

- 冻结候选分类法
- 冻结 closed core surfaces
- 冻结 reject / stale-draft 集
- 冻结一小批 proof 足够强的 first-wave toolkit candidates

## authority 边界

这份 proposal 只持有 candidate ledger。

下面这些规则不在本页重复定义，统一回链：

- toolkit 定位与门禁：
  - [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- toolkit intake 规则：
  - [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
- 官方 toolkit 二层 ADR：
  - [../adr/2026-04-18-official-toolkit-layer.md](../adr/2026-04-18-official-toolkit-layer.md)
- 总规格锚点：
  - [../../specs/147-toolkit-layer-ssot/spec.md](../../specs/147-toolkit-layer-ssot/spec.md)
- 持续追加的候选台账：
  - [../internal/toolkit-candidate-ledger.md](../internal/toolkit-candidate-ledger.md)

## 候选分类法

### 1. `closed-core-surface`

含义：

- 当前已存在的 canonical noun
- 必须继续停在 core
- 不进入 toolkit 候选池

### 2. `core-gap`

含义：

- 当前暴露出的真实 primitive 缺口
- 若要升格，默认优先回 core
- 在 core 未闭合前，不冻结 toolkit wrapper

### 3. `toolkit-first-wave`

含义：

- 当前证据密度最高
- 完全建立在既有 truth 之上
- 可以成为 toolkit 第一波候选

### 4. `reject-residue`

含义：

- 当前不升格
- 可能是 demo-local residue、single-demo policy、历史 draft noun，或应被明确拒绝的第二入口

## 形状标签

每个候选额外带一个 `shape` 标签：

- `view-helper`
- `render-adapter`
- `recipe`
- `wrapper-family`
- `law-guard`

## 证据等级

每个候选额外带一个 `evidence-grade`：

- `canonical-core-surface`
- `live-residue`
- `historical-draft`
- `single-demo`

当前 freeze 规则：

- `toolkit-first-wave` 默认只接受 `live-residue`
- `historical-draft` 只能作为 exclusion evidence，不得单独支撑 first-wave 判定
- `single-demo` 默认不进入 first-wave

## 素材范围

本轮主要观察这些样本：

- `examples/logix-react/src/form-support.ts`
- `examples/logix-react/src/demos/form/**`
- `examples/logix-react/src/modules/querySearchDemo.ts`
- `examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`
- `examples/logix-react/src/demos/DiShowcaseLayout.tsx`
- `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- `examples/logix-react/src/demos/form/cases/shared.tsx`
- `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- `packages/logix-core/src/Logic.ts`
- `specs/093-logix-kit-factory/spec.md`
- `specs/093-logix-kit-factory/domain-kit-guide.md`
- `specs/093-logix-kit-factory/quickstart.md`

## Closed Core Surfaces

这些对象当前已经是 canonical core surface，不进入 toolkit 讨论面：

| candidate | shape | evidence-grade | disposition | rationale |
| --- | --- | --- | --- | --- |
| `useModule(ModuleTag)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | root / shared instance lookup 已在 core host law 冻结 |
| `useModule(Program, options?)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | local instance acquisition 已在 core host law 冻结 |
| `host.imports.get(ModuleTag)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | parent-scope child resolution 已在 core host law 冻结 |
| `useImportedModule(parent, ModuleTag)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | canonical child resolution 的 hook 形态 |
| `useRuntime()` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | runtime scope 读取能力留在 core |
| `Root.resolve(...)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | root provider 读取 truth 留在 core |
| `$.use(Tag)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | logic side service consumption truth |
| `control-program service call` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | control-program call truth |
| `callById(...)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | workflow serviceId route truth |
| `withPolicy(...)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | workflow policy composition truth |
| `compose(...)` | `law-guard` | `canonical-core-surface` | `closed-core-surface` | workflow part composition truth |

## Core Probes

这些对象当前更像 primitive gap 或边界议题，默认先回 core：

| candidate | shape | evidence-grade | disposition | blocked-by | rationale |
| --- | --- | --- | --- | --- | --- |
| field error 读取 contract | `law-guard` | `live-residue` | `core-gap` | `Form.Error` 额外 selector primitive 未冻结 | `useFormField` 当前手搓 precedence，不宜先升 toolkit |
| field-ui 叶子合同 | `law-guard` | `live-residue` | `core-gap` | `ui` 叶子 contract 未冻结 | `touched / dirty` 仍只是观察值 |
| list row identity public contract | `law-guard` | `live-residue` | `core-gap` | list identity truth 未冻结 | `useFormList` 当前自带本地 row id 策略 |
| `serviceId / 步骤键` 规则 | `law-guard` | `canonical-core-surface` | `core-gap` | identity truth 必须留在 core | 若有缺口，属于 core primitive，不是 toolkit sugar |
| `Kit.forModule` 边界 | `law-guard` | `historical-draft` | `core-gap` | module-as-source truth 与唯一解析边界未重开 | 当前只作为历史问题线索，不作 toolkit 候选 |

## Toolkit First Wave

当前只冻结一小批 proof 足够强的 first-wave 候选：

| candidate | shape | evidence-grade | disposition | rationale |
| --- | --- | --- | --- | --- |
| form meta derived view | `view-helper` | `live-residue` | `toolkit-first-wave` | 建立在 `rawFormMeta()` 之上，跨多个 form demos 重复出现，主要收益是减少 UI 侧派生样板 |

## Reject Residue

当前明确不升格的对象：

| candidate | shape | evidence-grade | disposition | rationale |
| --- | --- | --- | --- | --- |
| `withFormDsl` | `wrapper-family` | `live-residue` | `reject-residue` | 过时 residue，当前 canonical authoring 已是 `Form.make(..., define)` |
| `useFormField` 完整 wrapper | `wrapper-family` | `live-residue` | `reject-residue` | 当前混了 value/error/ui/event 四层语义，不应整坨升格 |
| `useFormList` 完整 binder | `wrapper-family` | `live-residue` | `reject-residue` | row identity 策略未冻结，不能先升 toolkit |
| form error render helper（当前样本形状） | `render-adapter` | `live-residue` | `reject-residue` | 当前实现硬绑 `@logixjs/form/locales/zhCN`，还不是 driver-agnostic contract |
| React i18n bridge helper | `render-adapter` | `single-demo` | `reject-residue` | 仍是单 demo adapter 形态，不进 first-wave |
| Query snapshot view helper | `view-helper` | `single-demo` | `reject-residue` | 当前只有单 demo，且混有明显页面 policy |
| Query params / pager binder | `recipe` | `single-demo` | `reject-residue` | `selectedId` 清空、page reset、autoEnabled 都是 app-local policy |
| session / suspense / imports 薄别名 | `wrapper-family` | `live-residue` | `reject-residue` | core host acquisition 已足够明确，再包会长第二选择面 |
| demo UI 组件 | `wrapper-family` | `single-demo` | `reject-residue` | 只属于 demo UI / design-system adapter |
| call wrapper family | `wrapper-family` | `historical-draft` | `reject-residue` | 当前不冻结 `useService / callService / serviceStep / actionCall` 一类 noun |
| `旧 toolkit noun lineage` | `wrapper-family` | `historical-draft` | `reject-residue` | `093` 历史 draft 不再作为当前官方 noun family 沿用 |

## 093 Carry-forward Disposition

`093-logix-kit-factory` 当前只保留下面这些 carry-forward 结论：

### 保留的底层真相

- `control-program service call / callById`
- `$.use(Tag)`
- `serviceId` 不复制
- `stepKey` 必须稳定显式

### 当前拒绝继承的 noun family

- `Kit`
- 旧 toolkit noun lineage
- `forService`
- `forModule`
- `步骤键 helper`

### 仅留作 cookbook / recipe 素材

- 任何建立在 service port 之上的组合示意
- 任何对 control-program / Logic 既有 truth 的“等价展开”示意

## 当前冻结结论

这轮只冻结下面这些点：

1. 用四类分类法取代“尽量列全候选”的开放式目标
2. host / call acquisition canonical surface 固定留在 core
3. `093` 的 noun lineage 不进入当前 toolkit 计划
4. 当前 first-wave toolkit 候选只保留 `form meta derived view`

## 去向

- 2026-04-18 已升格到：
  - [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
  - [../internal/toolkit-candidate-ledger.md](../internal/toolkit-candidate-ledger.md)
  - [../../specs/147-toolkit-layer-ssot/spec.md](../../specs/147-toolkit-layer-ssot/spec.md)

## 当前一句话结论

这份 proposal 现在只保留为一次收敛快照；长期规则统一看 [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)，持续追加的候选统一看 [../internal/toolkit-candidate-ledger.md](../internal/toolkit-candidate-ledger.md)。
