---
title: Selector Type-Safety Ceiling Matrix
status: living
version: 7
---

# Selector Type-Safety Ceiling Matrix

## 目标

给 canonical selector shapes 一份单点裁决：哪些类型安全缺口只是当前未实现，哪些缺口来自 API 形态本身的理论上限。

本页服务 `useSelector(handle, selector, equalityFn?)` 的第二参数家族。它不冻结 exact noun，不代持 Form authoring contract，不代持 host route owner。

## 页面角色

- 本页只回答 selector shape 的类型安全上限
- exact host law 继续看 [10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- Form selector primitive 与 declaration owner 继续看 [../form/13-exact-surface-contract.md](../form/13-exact-surface-contract.md)
- 全局裁决优先级继续看 [../capability/02-api-projection-decision-policy.md](../capability/02-api-projection-decision-policy.md)
- 总护栏继续看 [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 裁决方法

每种 shape 只按四层判断：

1. 形态合法性
2. 输入静态约束
3. 输出类型可推导性
4. 单一解释链是否可保持

只允许两种结论：

- 理论可达但当前未实现
- 理论不可达且需要重开 API

## Matrix

| selector shape | 当前静态安全 | 理论上限 | 理论 blocker | 裁决 |
| --- | --- | --- | --- | --- |
| `useSelector(handle)` | 高，但属于 broad-state public host read | 返回 `StateOfHandle<H>` 的完全推导 | 类型安全可达不代表 subscription precision 可接受 | 退出终局 public host contract；只允许 repo-internal Devtools、debug 或 test harness 路线 |
| `useSelector(handle, (state) => value)` | 高 | 依赖 TS 函数签名得到精确返回类型；输入 state 受 handle 约束 | 类型层无法单独保证 runtime selector precision；必须经 core precision admission | expert-only；L0/L1 生成与 canonical examples 不把函数 selector 当默认配方 |
| internal sealed selector object residue | 中 | 若 internal selector object family 是封闭判别联合，可做到输入合法、返回值精确、equality contract 可校验 | 若继续接受宽对象入口，则非法输入拒绝永远闭合不了 | 只允许 internal/expert residue；不进入 public authoring 主叙事 |
| `fieldValue(valuePath)` typed selector carrier | 高 | literal path 在 typed handle 进入 single selector gate 时可拒绝非法输入、推导 exact result，并在 `fieldValue("")` 调用点提供 state path completion；widened string 在 typed handle 下拒绝 | 无 shape blocker；当前实现有有限递归深度预算 | 理论可达且已达成当前预算；trace ref: `TASK-009` |
| `fieldValues(valuePaths)` typed tuple selector carrier | 高 | non-empty literal tuple path 在 typed handle 进入 single selector gate 时可拒绝非法输入、推导 readonly tuple，并在固定 tuple 槽位提供 state path completion，例如 `fieldValues([""])` 与 `fieldValues(["count", ""])`；widened `string[]` 在 typed handle 下拒绝 | 只表达 tuple，不表达 object/struct projection descriptor；编辑器 completion 预算覆盖 10 个 tuple 槽位，不承诺无限数组槽位 | 已作为 `fieldValue` 的多 read tuple sibling 收口；只用于少量字段同属一个 UI 原子 |
| `rawFormMeta()` | 高 | 可完全返回稳定 `RawFormMeta` | 无 path、无 declaration metadata blocker | 理论可达且已接近达成 |
| `Form.Error.field(path)`，且 `path: string` | 中 | 可以稳定推到一份 explain union；若 path 进入类型系统，还可继续约束 path 合法性 | 宽 `string path` 下，field legality 与 path-sensitive result precision 无法同时闭合 | 当前 shape 对“稳定 explain union”理论可达；对“path-aware exact result”理论不可达，除非重开 path carrier |
| `Form.Companion.field(path)`，且 `path: string` | 中到高 | returned-carrier declaration contract 可把 companion bundle 类型按 field path 编入 `FormProgram`，并通过 selector gate 推导 exact result | imperative `void` callback 无法 soundly 自动收集 exact lower return；宽 `string path` 无法单独提供精确推导 | 理论可达且 returned-carrier path 已闭合；void callback 诚实降级 |
| `Form.Companion.byRowId(listPath, rowId, fieldPath)`，且 `listPath/fieldPath: string` | 中到高 | returned-carrier metadata 可让 row companion bundle 入型，rowId 保持运行时字符串 | imperative `void` callback 与未返回 carrier 时不能提供 exact metadata | 理论可达且 returned-carrier path 已闭合；void callback 诚实降级 |

## Current Hard Gap

当前已关闭的旧硬缺口是第二参数宽对象入口。`useSelector` 第二参数已经收紧到 sealed family，任意裸对象不再作为 canonical selector 输入通过类型检查。Trace ref: `CAP-PRESS-007-FU1`。

T2 后新增的硬裁决是：public no-arg `useSelector(handle)` 因 broad-state subscription risk 退出终局 host contract。它的类型推导不是问题，问题是 selector precision 与 host route 不可接受。任何整 state snapshot 读取只能停在 repo-internal Devtools、debug 或 test harness 路线。当前 public overload 已删除，`packages/logix-react/test-dts/canonical-hooks.surface.ts` 持续作为 negative witness。

若未来重新允许“任意对象在类型层先通过，再在运行时识别是不是 descriptor”，下面这些目标会重新变成理论 blocker：

- 编译期拒绝非法第二参数
- object selector family 的 exhaustiveness
- descriptor family 的单一解释链

当前仍开放的硬缺口转移为：

- `Form.Companion.field/byRowId` 的 returned-carrier declaration metadata 入型链已闭合；当前 `void` callback 下的 `field(path).companion({ deps, lower })` 仍不能精确推导
- `fieldValue(valuePath)` 的 literal path legality 与 path-based result inference 已在当前类型预算内闭合；trace ref: `TASK-009`
- `fieldValues(valuePaths)` 复用同一 path legality 与编辑器补全预算，返回 non-empty readonly tuple；当前固定 10 个 tuple 槽位可获得 typed handle state path completion，不引入 object/struct projection descriptor。
- `AUTH-REVIEW-companion-metadata-carrier` 已完成 authority writeback，returned-carrier path 已实现；trace ref: `TASK-009`
- 若未来要求 void callback 也有 exact inference，则必须先证明 TS 可 soundly 自动收集，或重开 exact authoring shape

## Selector Type-Safety Decision Record

| trace ref | decision | effect |
| --- | --- | --- |
| `CAP-PRESS-007-FU1` | `implementation-task` | single `useSelector(handle, selector, equalityFn?)` host gate remains; second host/read family, Form-owned hooks, immediate schema path builder, and permanent wide `string path` terminal stance are rejected |
| `CAP-PRESS-007-FU2` | `partial-implemented` | `fieldValue` typed path is implemented; exact companion lower-result metadata is green for returned-carrier declarations; void callback stays honest-unknown |

FU1 records the current split:

- landed: sealed selector family, `rawFormMeta()` stable return, `Form.Error.field(path)` explain union
- closed: `fieldValue(valuePath)` typed path inference through the single selector gate
- closed: `fieldValues(valuePaths)` typed tuple inference through the single selector gate
- closed for exact teaching path: `Form.Companion.field/byRowId` declaration-driven exact lower-result inference through returned carrier
- still honest-unknown: imperative void callback without returned carrier
- removed from public terminal host contract and type surface: no-arg `useSelector(handle)`
- next route: update examples/docs to teach returned-carrier exact typing, or explicitly request a new authoring-shape reopen
- admission rule: any public `Form.Path`, schema path builder, metadata object, or second helper family still requires concept admission before entering surface registry

## Canonical Reopen Triggers

出现下面任一情况，必须重开 selector shape，而不是继续接受当前口径：

- canonical shape 重新依赖宽 `string path`，同时目标要求 path legality 与 path-based exact result inference
- canonical shape 仍依赖宽对象第二参数，导致非法输入不能在编译期拒绝
- 为补类型安全，不得不引入第二 descriptor interpreter、第二 host helper family 或第二 authority 页面
- declaration-driven inference 需要的 metadata 无法沿单一 `authoring -> program -> host selector` 链传递

## Preferred Evolution Order

若目标是把这条 selector law 推到更高类型安全上限，默认顺序固定为：

1. 收紧 `useSelector` 第二参数为 sealed union
2. 把 `fieldValue` 从宽 `string` 推进到 typed path 或 typed descriptor
3. 把 `Form.Error.field(path)` 收到稳定 explain union
4. 把 `field(path).companion({ deps, lower })` 的结果类型编入 declaration metadata
5. 再让 `Form.Companion.field/byRowId` 读取同一解释链上的类型

Status:

- step 1 done by sealed selector family
- step 2 done by typed `fieldValue`; trace ref: `TASK-009`
- step 3 done by stable `Form.Error.field(path)` explain union
- step 4 and 5 are closed for returned-carrier companion metadata; trace ref: `TASK-009`; imperative `void` callback auto-collection remains outside the current guarantee and requires exact authoring-shape reopen if demanded

## Non-goals

- 不为类型安全重开第二 host gate
- 不为类型安全新增 `useField*` / `useCompanion*` hook family
- 不把 runtime 偷看 descriptor 负载误写成编译期安全
- 不把当前实现的 `unknown` 默认值当成理论上限

## 相关规范

- [10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [01-public-api-spine.md](./01-public-api-spine.md)
- [../form/13-exact-surface-contract.md](../form/13-exact-surface-contract.md)
- [../capability/02-api-projection-decision-policy.md](../capability/02-api-projection-decision-policy.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

single selector gate 本身没有挡住极致类型安全；宽对象第二参数缺口已由 sealed family 关闭。`fieldValue` typed path 与 call-site completion 已闭合；trace ref: `TASK-009`。companion declaration metadata 通过 returned-carrier route 进入 `FormProgram -> handle -> selector` 已闭合；imperative void callback 没有 sound auto-collection，继续诚实降级。

T2 之后，类型安全矩阵不能再把 no-arg `useSelector(handle)` 当作 public host success shape。函数 selector 也只表达理论类型上限；能否进入 host runtime 路线由 core precision admission 决定。
