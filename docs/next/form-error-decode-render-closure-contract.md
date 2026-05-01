---
title: Form Error Decode Render Closure Contract
status: proposed
target:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/form/01-current-capability-map.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/next/form-live-residue-cutover-plan.md
  - packages/logix-form/src/Error.ts
  - packages/logix-form/src/internal/schema/SchemaErrorMapping.ts
  - packages/logix-form/src/internal/form/commands.ts
last-updated: 2026-04-21
---

# Form Error Decode Render Closure Contract

## 目标

把 Form 当前 `error / decode / render` 这条链，收成一份 `claim-indexed closure contract`。

本页的成功标准固定为：

- active authority
- witness / proof
- live implementation

三处都对齐到同一条 error / decode / render truth。

## 当前 adopted claim

当前 adopted claim 固定为 `EC1-EC5`。
具体 owner、proof、close condition 统一看下方 `Claim Closure Ledger`。

## 执行入口

- implementation plan:
  - [2026-04-21-form-error-decode-render-closure-implementation.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-21-form-error-decode-render-closure-implementation.md)

## Execution Snapshot

- `W1`
  - canonical decode leaf 已收口到 `FormErrorLeaf`
  - exact handle 已移除 `getState` 与 getter 面
- `W2`
  - submit gate 已写回最小 `$form.submitAttempt.summary / compareFeed`
  - decode invalid 与 error blocking 已能区分 `decodedVerdict / blockingBasis`

## Lane Role

当前已转入 `docs/next/**`，理由固定为：

- 主方向已收口
- 当前只剩 live residue handoff proof 与 consume gate 的执行性收尾

当前从 `docs/next/**` 升格或 consumed 的门槛固定为：

- `Claim Closure Ledger` 已固定
- blocking waves 已固定
- live residue handoff 已固定
- proposal 级 `Reopen Gate / Dependency Gate / Consume Gate` 已落盘

若后续出现新的主方向分歧，必须回到 `docs/proposals/**` 重新开 proposal。

## Consume Gate

本页只有在同时满足下面条件时才允许 consumed：

- 所有 claim 行都满足 close condition
- `form/13`、`form/03`、`form/06`、`runtime/09`、`runtime/10` 已无冲突读法
- code surface 与 exact surface 对齐
- `旧 helper precedence / render residue` 已移交或关闭
- proposal lane 去向已记录

## Authority Classes / Owner Writeback Matrix

| target | class | precedence | role |
| --- | --- | --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | `source authority` | `P0` | canonical carrier、exact handle、`Form.Error` support role |
| `docs/ssot/form/03-kernel-form-host-split.md` | `source authority` | `P0` | cross-source lowering、decode bridge、`Form.Error` data-support owner split |
| `docs/ssot/form/06-capability-scenario-api-support-map.md` | `witness page` | `P1` | scenario witness、projection witness、control-plane proof input |
| `docs/ssot/runtime/09-verification-control-plane.md` | `proof owner` | `P1` | declaration / witness / evidence 坐标与 compare 主轴 |
| `docs/ssot/runtime/10-react-host-projection-boundary.md` | `host owner` | `P1` | `Form.Error.field(path)`、helper-side precedence、repo-local wrapper residue 的 host-side边界 |
| `docs/ssot/form/01-current-capability-map.md` | `snapshot mirror` | `P2` | current capability 与未闭环能力快照 |
| `docs/next/form-live-residue-cutover-plan.md` | `external dependency` | `P2` | 旧 helper family、locale binding、example precedence 的 live residue 清理与 consume proof |
| `packages/logix-form/src/Error.ts` | `code witness` | `P3` | error support role 的实现见证 |
| `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts` | `code witness` | `P3` | decode leaf / bridge lowering 的实现见证 |
| `packages/logix-form/src/internal/form/commands.ts` | `code witness` | `P3` | handle live shape 与 submit-lane行为的实现见证 |

冲突时裁决顺序固定为：

`source authority -> witness/proof owner -> host owner -> snapshot mirror -> handoff consumer -> code witness`

## Claim Closure Ledger

proof 列只允许使用下面这组固定词表：

- `owner parity`
- `code surface parity`
- `witness parity`
- `scenario proof parity`
- `consume decision recorded`
- `no active sanctioned helper precedence route`

| claim | canonical-owner | mirror-pages | live-witness | forbidden-surface | required-writeback | proof | close-condition | reopen-route | wave | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EC1 canonical carrier only` | `form/13 + form/03` | `form/01`, `form/06` | `packages/logix-form/src/Error.ts`, `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts` | raw string leaf 进入 canonical truth | carrier / lowering 口径对齐到 `FormErrorLeaf` | `owner parity + code surface parity + witness parity` | active docs 与 code witness 都不再把 raw string 当 canonical carrier | `本 proposal` | `W1` | `blocking` |
| `EC2 decode-origin lowering closes on same truth chain` | `form/03 + form/06 + runtime/09` | `form/13`, `form/01` | `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`, `packages/logix-form/src/internal/form/commands.ts` | decode bridge 长第二套 vocabulary | decode-origin facts 与 witness / evidence 坐标对齐 | `owner parity + witness parity + scenario proof parity` | decode leaf、scenario witness、compare 输入使用同一条 truth chain | `本 proposal` | `W2` | `blocking` |
| `EC3 exact handle surface flattened` | `form/13` | `form/01` | `packages/logix-form/src/internal/form/commands.ts` | `getState`、getter 面停留在公开 exact contract | handle exact surface 与 live shape 对齐 | `owner parity + code surface parity` | exact handle 不再泄漏 bridge residue / getter 面 | `本 proposal` | `W1` | `blocking` |
| `EC4 precedence owner stays single` | `runtime/10 + form/13` | `form/03`, `form/06` | `packages/logix-form/src/Error.ts` | helper-side precedence、repo-local sanctioned helper route | host owner 与 form owner 的边界对齐 | `owner parity + witness parity + no active sanctioned helper precedence route` | precedence 不再长第二套 sanctioned route | `本 proposal`，但 live residue 清理由 handoff consumer 承接 | `W2` | `blocking with handoff` |
| `EC5 render boundary stays formula-only` | `form/13 + runtime/09` | `form/06`, `form/01` | `packages/logix-form/src/Error.ts` | render execution / snapshot ownership 回流到本页 | render boundary 只保留 `leaf + snapshot + render-only context` 公式 | `owner parity + witness parity + scenario proof parity` | authority / witness / control-plane 对公式读法一致 | `本 proposal` | `W3` | `blocking` |

## in scope

- canonical carrier 与 decode lowering
- exact handle surface 与 submit-lane相关 live shape
- `Form.Error.field(path)` 与 precedence owner 的 closure
- render boundary 的 authority / witness / proof closure

## out of scope

- `active-shape / settlement / reason` 的完整语义闭环
- field-ui leaf exact shape
- toolkit wrapper 设计
- full render execution API
- 旧 helper family、locale binding、example precedence 的 live residue 清理本体

## Dependency Gate

本提案与 [Form Live Residue Cutover Plan](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/form-live-residue-cutover-plan.md) 的边界固定为：

- 本提案只持有 exact closure、owner truth、consume gate
- repo-local helper family 一类 live residue 清理由 `form-live-residue-cutover` 承接
- 本提案只要求 handoff row 存在，不直接代持 example cutover 事实

## Reopen Gate

本提案只有在出现下面任一事实时才允许重开：

- active authority 之间出现新的直接矛盾
- live witness 证明当前 freeze 失真
- witness / proof 无法接到既有 `runtime control plane`
- handoff consumer 无法承接旧 helper residue

凡涉及下面这些议题，默认不得回灌到本页：

- `reason contract` 本体
- field-ui exact leaf freeze
- `SchemaErrorMapping` 最终 public path 的终局命名
- toolkit noun / intake 设计

## Pending / Hold

`pending / hold` 当前统一按下面格式阅读：

- `当前默认建议`：主 agent 当前推荐的临时读法
- `暂缓原因`：为什么此轮不冻结
- `freeze owner`：当前谁负责维持这条 hold 的边界
- `reopen evidence`：满足什么证据后再重开
- `expected landing page`：后续更可能落到哪份 authority 或 proposal
- `blocking status`：是否阻塞本提案 consumed
- `drop condition`：什么情况下直接删除、降级或 supersede

| id | topic | 当前默认建议 | 暂缓原因 | freeze owner | reopen evidence | expected landing page | blocking status | drop condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EH1` | `Form.Error.item / list / root` 的 exact spelling | 继续按 support primitive / residue 理解，不进入 exact surface | 仍依赖 `reason contract` 与 render boundary 后续 closure | `form/13` | `reason contract` 与 render boundary 同时收口 | `form/13` | `parked` | 若后续不进入 exact surface，则在 owner 页直接说明为 supporting residue |
| `EH2` | render-only context 的 exact member shape | 当前只冻结公式，不冻结成员表 | 共享 consumer matrix 还不稳定 | `form/13 + runtime/09` | UI / Agent / compare 输入 family 固定 | `form/13 + runtime/09` | `parked` | 若公式已足够，成员表不再进入本提案 |
| `EH3` | `Form.Error` 是否保留 `toRenderInput` 这类 pure normalizer | 暂按候选 data-support 理解，不提前承诺 | 仍依赖 render execution 与 snapshot ownership 切开 | `form/13 + packages/logix-form/src/Error.ts` | render boundary freeze 证明它不偷 owner truth | `packages/logix-form/src/Error.ts` + `form/13` | `parked` | 若 handoff 到 render closure owner，则退出本提案 |
| `EH4` | `SchemaErrorMapping` 的最终 owner 形态与 public path | 继续按 root-exited direct-owner support 理解 | decode-origin bridge 仍在变化 | `runtime/06 + form/03` | decode bridge normalization 完成后 | `runtime/06` + related decode follow-up | `dependency-blocked` | 若最终不再走 public path，则在 related follow-up consumed 时关闭 |

## Waves

### W1. authority-owner sync

目标：

- canonical carrier 与 exact handle surface 的 owner truth 对齐
- raw string leaf 退出 canonical truth
- live handle shape 与 exact surface 对齐

proof bundle：

- `owner parity`
- `code surface parity`
- `witness parity`

### W2. live implementation cut

目标：

- `SchemaErrorMapping`、`commands.ts`、`Error.ts` 的实现见证与 authority 对齐
- precedence owner 继续单点化
- 旧 helper residue 只通过 handoff consumer 承接

proof bundle：

- `owner parity`
- `code surface parity`
- `witness parity`
- `scenario proof parity`
- `no active sanctioned helper precedence route`

### W3. witness/control-plane proof

目标：

- `declaration / witness / evidence` 三坐标接到既有 `runtime control plane`
- render boundary 与 scenario proof / compare proof 对齐

proof bundle：

- `owner parity`
- `witness parity`
- `scenario proof parity`
- `consume decision recorded`

### W4. parked holds

目标：

- 只保留 non-blocking 或 dependency-blocked hold
- 不再参与当前 consumed gate

## Suggested Verification

```bash
rtk rg -n "getState|field\\(path\\).*get|fieldArray\\(path\\).*get" \
  packages/logix-form/src

rtk rg -n "manualError \\?\\? ruleError \\?\\? schemaError|useFormField|useFormList|useFormMeta" \
  docs/next/form-live-residue-cutover-plan.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md

rtk git diff --check -- \
  docs/next/form-error-decode-render-closure-contract.md \
  docs/ssot/form/13-exact-surface-contract.md \
  docs/ssot/form/01-current-capability-map.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  packages/logix-form/src/Error.ts \
  packages/logix-form/src/internal/schema/SchemaErrorMapping.ts \
  packages/logix-form/src/internal/form/commands.ts
```

## 当前一句话结论

这条链的后续工作已经压成 `claim-indexed closure contract`：先收 authority owner，再收 live implementation，再收 witness / control-plane proof；旧 helper residue 只通过 handoff consumer 处理，不在本页共管。
