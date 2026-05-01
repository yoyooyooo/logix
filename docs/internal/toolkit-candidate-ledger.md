---
title: Toolkit Candidate Ledger
status: living
version: 2
---

# Toolkit Candidate Ledger

## 用途

这页用于持续维护 toolkit 候选台账。

它只服务维护者，不构成公开 API 的单点权威。

稳定规则统一看：

- [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)

## 当前活跃台账

稳定分类法、Closed Core Surfaces 与读法统一看：

- [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)

### Core Probes

| candidate | shape | evidence-grade | blocked-by | rationale |
| --- | --- | --- | --- | --- |
| field error 读取 contract | `law-guard` | `live-residue` | `Form.Error` 额外 selector primitive 未冻结 | `useFormField` 当前手搓 precedence，不宜先升 toolkit |
| field-ui 叶子合同 | `law-guard` | `live-residue` | `ui` 叶子 contract 未冻结 | `touched / dirty` 仍只是观察值 |
| list row identity public contract | `law-guard` | `live-residue` | list identity truth 未冻结；next spec: `/specs/149-list-row-identity-public-projection/spec.md` | `useFormList` 当前自带本地 row id 策略 |
| `serviceId / 步骤键` 规则 | `law-guard` | `canonical-core-surface` | identity truth 必须留在 core | 若有缺口，属于 core primitive，不是 toolkit sugar |
| `Kit.forModule` 边界 | `law-guard` | `historical-draft` | module-as-source truth 与唯一解析边界未重开 | 当前只作为历史问题线索，不作 toolkit 候选 |
| form meta lightweight derivation | `view-helper` | `live-residue` | core adjunct read corollary 的 exact noun / import shape 未冻结 | `rawFormMeta()` 之上的 `isValid / isPristine` 只是轻量一跳派生；shape 只描述 residue，不主张 future helper family；candidate-local closure 统一看 `/specs/148-toolkit-form-meta-derivation/spec.md` |

### Toolkit First Wave

当前无活跃候选。

历史收敛快照与去向：

- [Toolkit Form Meta Derivation](../proposals/toolkit-form-meta-derived-view.md)
- [specs/148-toolkit-form-meta-derivation/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/148-toolkit-form-meta-derivation/spec.md)

### Next Probe

- `149-list-row-identity-public-projection`

### Reject Residue

| candidate | shape | evidence-grade | rationale |
| --- | --- | --- | --- |
| `withFormDsl` | `wrapper-family` | `live-residue` | 过时 residue，当前 canonical authoring 已是 `Form.make(..., define)` |
| `useFormField` 完整 wrapper | `wrapper-family` | `live-residue` | 当前混了 value/error/ui/event 四层语义，不应整坨升格 |
| `useFormList` 完整 binder | `wrapper-family` | `live-residue` | row identity 策略未冻结，不能先升 toolkit |
| form error render helper（当前样本形状） | `render-adapter` | `live-residue` | 当前实现硬绑 `@logixjs/form/locales/zhCN`，还不是 driver-agnostic contract |
| React i18n bridge helper | `render-adapter` | `single-demo` | 仍是单 demo adapter 形态，不进 first-wave |
| Query snapshot view helper | `view-helper` | `single-demo` | 当前只有单 demo，且混有明显页面 policy |
| Query params / pager binder | `recipe` | `single-demo` | `selectedId` 清空、page reset、autoEnabled 都是 app-local policy |
| session / suspense / imports 薄别名 | `wrapper-family` | `live-residue` | core host acquisition 已足够明确，再包会长第二选择面 |
| demo UI 组件 | `wrapper-family` | `single-demo` | 只属于 demo UI / design-system adapter |
| call wrapper family | `wrapper-family` | `historical-draft` | 当前不冻结 `useService / callService / serviceStep / actionCall` 一类 noun |
| `旧 toolkit noun lineage` | `wrapper-family` | `historical-draft` | `093` 历史 draft 不再作为当前官方 noun family 沿用 |

## 当前一句话结论

这页是持续追加的维护者台账；稳定规则统一回 [../ssot/runtime/12-toolkit-candidate-intake.md](../ssot/runtime/12-toolkit-candidate-intake.md)，当前还没有活跃的 toolkit first-wave 候选。
