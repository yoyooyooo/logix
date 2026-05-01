---
title: Form Authority Drift Writeback Contract
status: living
owner: form-authority-drift-writeback
target-candidates:
  - docs/ssot/form/README.md
  - docs/ssot/form/04-convergence-direction.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
  - docs/proposals/README.md
last-updated: 2026-04-21
---

# Form Authority Drift Writeback Contract

## 目标

把 `F1` 之后的 authority drift 收成单一 writeback contract。

当前问题定义固定为：

- `@logixjs/form` root exact surface 已收口
- 当前主矛盾落在 supporting authority、inventory、README 与 stale planning residue 没一起回写
- 这组后续工作不再按“root export 仍过宽”叙述

## 当前 adopted claim

### authority claims

1. `@logixjs/form` root exact surface 已冻结为 `Form.make / Form.Rule / Form.Error`
2. `@logixjs/form/locales` 只保留 optional plain locale asset subpath 身份
3. `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 已退出 public root

### governance gates

4. 当前 writeback 任务先修 authority drift，不重开 `F1` survivor set
5. 跨领域类比只允许作为 heuristic，不进入 Form authority 证据链

## 执行入口

- implementation plan:
  - [2026-04-21-form-authority-drift-writeback-implementation.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-21-form-authority-drift-writeback-implementation.md)

## in scope

- authority leaf wording correction
- form subtree routing 与 proposal 路由补齐
- inventory / active proposal lane 的事实回写
- 与以上直接冲突的 supporting sentence 清理

## out of scope

- runtime implementation 改造
- example / package manifest 的 live residue 切除
- error / decode / render contract
- `active-shape / settlement / reason` 的语义闭环实施

## Lane Decision

当前继续停在 `docs/proposals/**`，理由固定为：

- 当前仍在裁决这份工件自己的 `consume gate / reopen bar / retrieval quarantine` 最小预算
- 当前不只是“按既定事实机械回写”，还需要决定哪些 stale hazard 属于 blocking path
- 一旦这三件事收口，且 blocking rows 全部关闭，本页才适合转 `docs/next/**` 或直接 consumed

当前 consumed gate 固定为：

- authority rows 全部关闭
- routing / inventory mirror 全部关闭
- active docs 内不再存在冲突句子
- lane decision 已记录
- 高冲突 stale hazard 已被 quarantine，或被显式降为 non-blocking parked item

## Writeback Targets And Proof Anchors

当前文件集合固定拆成两类：

- `target-candidates`
  - 只表示本提案预期会直接改写的文件
- `proof anchors`
  - 表示本提案必须对齐、但未必一定发生改写的 authority / governance 锚点

当前 proof anchors 固定为：

- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/standards/docs-governance.md`
- `docs/review-plan/runs/2026-04-21-form-authority-drift-writeback-review.md`

## Authority Classes / Owner Map

| target | class | precedence | role |
| --- | --- | --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | `source authority` | `P0` | root exact surface 与 locales / support primitive root exit 的单点权威 |
| `docs/ssot/runtime/08-domain-packages.md` | `source authority` | `P0` | locales registration、merge order 与 bucket mapping 的单点权威；本提案只把它当 proof anchor |
| `docs/ssot/runtime/06-form-field-kernel-boundary.md` | `boundary mirror` | `P1` | form 与 field-kernel 的 cross-layer 边界读法 |
| `docs/ssot/form/04-convergence-direction.md` | `governance mirror` | `P1` | post-`F1` 当前主战场与 freeze gate 的读法 |
| `docs/ssot/form/README.md` | `routing mirror` | `P1` | form 子树入口与 proposal cluster 导航 |
| `docs/proposals/public-api-surface-inventory-and-disposition-plan.md` | `inventory mirror` | `P2` | `F1` snapshot 与 post-`F1` follow-up cluster |
| `docs/proposals/README.md` | `proposal-routing mirror` | `P2` | active proposal lane 导航 |
| conflicting stale proposals | `stale planning hazard` | `P3` | 只负责被 quarantine / de-preference，不反向持有 authority |

冲突时的裁决顺序固定为：

`source authority -> boundary / governance mirror -> routing / inventory mirror -> stale planning hazard`

proof 列只允许使用下面这组固定词表：

- `owner page synced`
- `supporting route synced`
- `inventory mirror synced`
- `proposal lane indexed`
- `lane decision recorded`
- `consume gate recorded`
- `no stale contradictory sentence`
- `stale hazard quarantined or parked`

## Claim / Writeback / Proof Matrix

| id | type | claim_or_gate | canonical owner | touched mirrors | stale hazards | required writeback | proof | close condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C1` | `authority` | root exact surface 继续只认 `Form.make / Form.Rule / Form.Error` | `form/13` | `runtime/06`, `form/README`, inventory | `form-exact-api-freeze-candidate` | 所有 active mirrors 不再写出旧 root survivor set | `owner page synced + supporting route synced + inventory mirror synced` | active mirrors 与 `form/13` 一致 |
| `C2` | `authority` | `./locales` 只认 optional plain locale asset subpath | `form/13 + runtime/08` | inventory | old locale / package surface discussions | inventory 与 active docs 不再把 locales 讲成 registration / helper owner | `owner page synced + inventory mirror synced` | active docs 只保留 asset subpath 读法 |
| `C3` | `authority` | `Path / Schema*` 已退出 public root | `form/13 + runtime/06` | `form/README`, inventory | `form-exact-api-freeze-candidate`, `form-semantic-closure-contract` | active mirrors 不再把 `Path / Schema*` 写成 root survivor | `owner page synced + supporting route synced + inventory mirror synced + no stale contradictory sentence + stale hazard quarantined or parked` | active docs 一致，冲突 stale hazard 已处理 |
| `G1` | `gate` | 本提案不重开 `F1` survivor set | `this-proposal` | `form/04`, inventory | all `F1`-adjacent stale plans | scope 说明与 reopen bar 落盘 | `lane decision recorded + consume gate recorded` | 后续 round 不再把 survivor set 带回本页 |
| `G2` | `gate` | 跨领域类比只作 heuristic，不进证据链 | `this-proposal` | none | none | 仅在 scope / gate 中保留为审稿规则 | `lane decision recorded` | reviewer 与主 agent 汇总不再拿类比当直接证据 |

## Reopen Gate

本提案只有在同时满足下面条件时才允许重开或扩大范围：

1. active authority 之间出现新的直接矛盾
2. live consumer / tests 证明当前 root freeze 或 mirror 读法失真
3. retrieval quarantine 仍无法压住高冲突 stale hazard
4. 新增动作不引入第二 authority，不改写 `F1` 已冻结 survivor set

凡涉及下面这些议题，默认不得回灌到本页：

- `F1` survivor set 重审
- single declaration carrier 改写
- owner split 改写
- `P0` semantic closure 本体
- example / manifest live residue cutover

它们必须回到各自 follow-up proposal 或 authority owner。

## Pending / Hold

`pending / hold` 当前统一按下面格式阅读：

- `当前默认建议`：主 agent 当前推荐的临时读法
- `暂缓原因`：为什么此轮不冻结
- `freeze owner`：当前谁负责维持这条 hold 的边界
- `reopen evidence`：满足什么证据后再重开
- `blocking proof`：它是否阻塞本提案 consumed
- `expected consumer`：后续更可能落到哪份 authority 或 proposal
- `drop condition`：什么情况下直接删除、降级或 supersede

| id | topic | 当前默认建议 | 暂缓原因 | freeze owner | reopen evidence | blocking proof | expected consumer | drop condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AH1` | `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 最终 owner 形态 | 继续按“已退出 root、暂留 direct-owner support / residue”理解 | 当前证据只够支持 root exit，不够直接证明 internalize 或 delete | `runtime/06 + form/13` | direct-owner consumer、tests 与 authority wording 全部收紧 | `non-blocking`，前提是 active docs 已无冲突 root 读法 | `runtime/06` + related follow-up proposal | 若后续 direct-owner 路由也退出，则在 related proposal consumed 时关闭 |
| `AH2` | `Form.Rule.field / root / list / fields` 的最终 public status | 继续按 supporting pending 理解，不进入主教学 | exact authority 还没逐项冻结 `Rule` namespace 成员 | `runtime/06 + form/09` | `P0` closure 完成后，重新评估 declaration pressure | `non-blocking`，前提是当前 proposal 不再把它们当 root survivor | `form/13` 或 `form/09` | 若未来证据表明它们只是 DSL gap residue，则在 exact freeze 时 supersede |
| `AH3` | 高冲突 stale planning hazard 的最小处理 | 只处理 active 检索里会持续产出冲突读法的 stale hazard | 当前 proposal 不负责全量 stale governance | `this-proposal + proposal lane` | high-conflict stale proposal 仍在 active retrieval 里抢占读法 | `blocking` 只针对高冲突 stale hazard；其余批量 supersede 为 `non-blocking` parked | `docs/proposals/README.md` + related stale plans | 若 hazard 已被 superseded banner、de-preference 或 conflict index 压住，则关闭 |

## Planning Slices

### A1. authority owner sync

目标：

- 把 `source authority / mirrors / stale hazards` 的 owner precedence 写死
- `runtime/06` 与 `form/04` 的 active wording 对齐到 matrix
### A2. routing and inventory sync

- `form/README` 补当前 proposal cluster
- `docs/proposals/README.md` 增加四份 active proposal 路由
- `public-api-surface-inventory-and-disposition-plan.md` 的 `F1` snapshot 改成当前 live facts
- lane decision 与 consume gate 落盘

### A3. retrieval quarantine and stale-plan split

目标：

- `A3a`：只处理 active retrieval 会持续产出冲突读法的 stale hazard
- `A3b`：其余 stale-plan housekeeping 统一降为 non-blocking parked item
- 当前最小 hazard 集：
  - `form-exact-api-freeze-candidate.md`
  - `form-semantic-closure-contract.md`

### A4. Proof Obligations / Acceptance

blocking acceptance 固定至少包含：

- `owner page synced`
- `supporting route synced`
- `inventory mirror synced`
- `proposal lane indexed`
- `lane decision / consume gate recorded`
- `no stale contradictory sentence in active docs`
- high-conflict stale hazard 已 quarantine 或显式 parked

## Suggested Verification

```bash
rtk rg -n "Form\\.Path|SchemaPathMapping|SchemaErrorMapping" \
  docs/ssot/runtime/06-form-field-kernel-boundary.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/ssot/form/README.md

rtk rg -n "Form\\.Path|Form\\.SchemaPathMapping|Form\\.SchemaErrorMapping" \
  docs/proposals/form-exact-api-freeze-candidate.md \
  docs/proposals/form-semantic-closure-contract.md

rtk git diff --check -- \
  docs/ssot/runtime/06-form-field-kernel-boundary.md \
  docs/ssot/form/README.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/proposals/README.md \
  docs/proposals/form-authority-drift-writeback-contract.md
```

## 当前一句话结论

post-`F1` 的 authority follow-up 先做 owner-map-first writeback closure：先收 source authority、mirrors、consume gate 与最小 retrieval quarantine，再决定哪些 stale planning 问题值得继续扩大范围。
