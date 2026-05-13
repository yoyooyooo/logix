---
title: Frozen API Shape Risk Lanes
status: draft
version: 9
---

# Frozen API Shape Risk Lanes

## 目标

把当前 frozen API shape 拆成可单独打磨的高风险 lane，避免后续实现直接冲击总形状。

本页只承接 risk register 与下一步 pressure packet，不冻结 exact surface，不新增 public concept，不替代 owner authority。

## Source

- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/06-capability-scenario-api-support-map.md](../../ssot/form/06-capability-scenario-api-support-map.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [risk-lane-closure-check.md](./risk-lane-closure-check.md)

## Risk Lane Rules

- 每条 lane 只能强化 proof、实现、负边界、reopen bar 或 implementation packet。
- 每条 lane 必须显式列出关联 `CAP-* / VOB-* / PF-* / IE-* / PROJ-*`。
- 若 lane 需要改 API 形状，必须先打开 `COL-* / PRIN-* / authority writeback`。
- 若 lane 只发现 implementation residual，继续走 implementation task，不重开 frozen shape。
- 若 lane 证明当前形状被打穿，必须回到 [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md) 的 Reopen Gate。
- `TASK-003` 只允许在明确 productization 或 authority-intake 请求下启动，不由本页自动开启。

## Risk Vocabulary

| field | allowed values |
| --- | --- |
| risk_status | `active`, `queued`, `watch`, `closed`, `blocked` |
| pressure_type | `semantic`, `implementation`, `diagnostic`, `host`, `verification`, `performance` |
| next_packet_kind | `proof-refresh`, `implementation-scope`, `collision-review`, `principle-review`, `authority-intake`, `watch-only` |

## Risk Lane Index

| risk id | status | pressure type | frozen API slice | related caps / vobs | related proof / enabler | owner authority | next packet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RISK-01` | `closed` | `semantic` | `field(path).companion`, `Form.Companion.field`, `Form.Companion.byRowId` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`, pressure from `CAP-19..CAP-23` | `PF-03`, `PF-05`, `PF-06`, `PF-07`, `IE-03`, `IE-06` | `13`, `runtime/10` | [risk-01-companion-soft-fact-boundary-pressure-packet.md](./risk-01-companion-soft-fact-boundary-pressure-packet.md) |
| `RISK-02` | `closed` | `implementation` | `field(path).source`, `submitImpact`, source receipt evidence | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` | `PF-02`, `PF-08`, `IE-02`, `IE-04` | `13`, `runtime/09` | [risk-02-source-freshness-pressure-packet.md](./risk-02-source-freshness-pressure-packet.md) |
| `RISK-03` | `closed` | `semantic` | `field(...).rule`, `root`, `list`, `submit`, `Form.Error.field` | `CAP-02`, `CAP-03`, `CAP-04`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` | `PF-01`, `PF-04`, `PF-08`, `IE-04` | `13`, `runtime/09` | [risk-03-final-truth-reason-chain-pressure-packet.md](./risk-03-final-truth-reason-chain-pressure-packet.md) |
| `RISK-04` | `closed` | `implementation` | `fieldArray(path).*`, `fieldArray(path).byRowId(rowId).*` | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` | `PF-05`, `PF-06`, `IE-05` | `13`, `runtime/06`, `runtime/10` | [risk-04-row-identity-active-exit-pressure-packet.md](./risk-04-row-identity-active-exit-pressure-packet.md) |
| `RISK-05` | `closed` | `host` | `useModule`, `useImportedModule`, `useDispatch`, `useSelector`, `fieldValue`, `rawFormMeta` | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` | `PF-07`, `IE-06` | `runtime/10`, `runtime/01` | [risk-05-host-selector-gate-watch-packet.md](./risk-05-host-selector-gate-watch-packet.md) |
| `RISK-06` | `closed` | `verification` | `runtime.check`, `runtime.trial`, `runtime.compare`, `fixtures/env + steps + expect` | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01`, `VOB-02`, `VOB-03` | `PF-08`, `PF-09`, `IE-07`, `IE-08` | `runtime/09` | [risk-06-verification-control-plane-pressure-packet.md](./risk-06-verification-control-plane-pressure-packet.md) |

## RISK-01 Companion Soft Fact Boundary

Risk statement:

- `companion` 是当前最强的最小生成元之一，容易被实现或示例扩张成 final truth、render policy、remote IO 或 list/root companion baseline。

High-pressure capability set:

- primary: `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`
- secondary pressure: `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`

Required pressure checks:

- `lower(ctx)` 必须保持同步、纯计算、无 IO、无 writeback。
- `availability / candidates` 只能是 soft fact，不承接 final validity。
- row reorder / replace / cleanup 后，`Form.Companion.byRowId` 仍命中同一 canonical row owner。
- list/root companion baseline 继续保持 rejected，除非出现 roster-level soft fact 的不可规约证据。

Reopen bar:

- field-local companion 无法覆盖 `SC-C / SC-D / SC-E` 的 sanctioned read route。
- row-heavy proof 证明必须引入 list/root-level soft fact owner。
- final rule 必须直接读取 companion internal landing path 才能闭合。

Current packet:

- [risk-01-companion-soft-fact-boundary-pressure-packet.md](./risk-01-companion-soft-fact-boundary-pressure-packet.md)
- result: `closed-for-current-matrix`
- residual: none requiring public surface reopen

## RISK-02 Source Freshness And Receipt Boundary

Risk statement:

- source lane 当前覆盖 remote fact ingress 与 submit impact，但 `IE-02` 仍是 implementation partial。实现若不能稳定表达 freshness、stale drop、receipt identity 与 submit blocking，会反向冲击 frozen source shape。

High-pressure capability set:

- primary: `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`
- evidence pressure: `CAP-18`

Required pressure checks:

- `deps / key / concurrency / debounce` 必须产生可复现 source task identity。
- stale result 不能改写 later submit truth，也不能污染 current receipt。
- `submitImpact` 只能影响 submit lane，不让 source 拥有 final truth。
- source receipt 必须能回链到 reason evidence，但不能长成第二 evidence envelope。

Next packet:

| field | value |
| --- | --- |
| packet_id | `RISK-02-source-freshness-pressure-packet` |
| packet_kind | `implementation-scope` |
| target_caps | `CAP-05..CAP-09`, `CAP-18` |
| target_proofs | `PF-02`, `PF-08` |
| target_enablers | `IE-02`, `IE-04` |
| non_claims | new public source API, second evidence envelope, source-owned final truth |
| expected_output | narrow implementation scope or proof-refresh plan |

Reopen bar:

- source freshness cannot be represented without a new public source helper.
- receipt identity cannot be linked to evidence without a second evidence coordinate.
- submit blocking cannot be explained without moving final truth into source.

Current packet:

- [risk-02-source-freshness-pressure-packet.md](./risk-02-source-freshness-pressure-packet.md)
- result: `closed-for-current-matrix`
- residual: `IE-02` stays broader `partial` for remote source variants beyond current matrix

## RISK-03 Final Truth And Reason Chain

Risk statement:

- rule / submit / reason chain 是 final truth owner。任何 shortcut 都可能让 companion、source、manual error 或 verification report 形成第二 truth。

High-pressure capability set:

- `CAP-02`, `CAP-03`, `CAP-04`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18`

Required pressure checks:

- field/list/root rules 必须进入同一 final truth lane。
- `submitAttempt` 必须保持 snapshot stability。
- `Form.Error.field(path)` 只做 selector primitive，不改变 error precedence。
- `reasonSlotId` 必须能连接 UI、Agent、trial 与 report。

Reopen bar:

- final truth 无法经 rule / submit 合并。
- submit backlink 无法继续回链当前 evidence。
- error / pending / stale / cleanup 需要第二 reason object。

Current packet:

- [risk-03-final-truth-reason-chain-pressure-packet.md](./risk-03-final-truth-reason-chain-pressure-packet.md)
- result: `closed-for-current-matrix`
- residual: none requiring public surface reopen

## RISK-04 Row Identity And Active Exit

Risk statement:

- row identity lane 同时承接 write continuity、read owner、cleanup、nested remap。实现任何一个环节不稳，都会打穿 `byRowId` 与 selector primitive 的合理性。

High-pressure capability set:

- `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`

Required pressure checks:

- reorder / swap / move 不改变 canonical row owner。
- replace / remove 必须正确终止 old row live contribution。
- nested row owner 必须随外层 row remap。
- write-side `byRowId` 与 read-side `Form.Companion.byRowId` 必须命中同一 owner。

Reopen bar:

- index 或 React key 被迫成为 truth。
- row-owner selector 无法在不暴露 raw path 的前提下稳定消费。
- cleanup reason 需要第二 row truth 或第二 read family。

Current packet:

- [risk-04-row-identity-active-exit-pressure-packet.md](./risk-04-row-identity-active-exit-pressure-packet.md)
- result: `closed-for-current-matrix`
- residual: none requiring public surface reopen

## RISK-05 Host Selector Gate

Risk statement:

- host gate 当前形状较稳，主要风险来自 convenience helper、demo wrapper 或 toolkit 候选反向变成 canonical route。

High-pressure capability set:

- `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`

Watch checks:

- `useSelector(handle, selector, equalityFn?)` 继续是唯一 read gate。
- `fieldValue / rawFormMeta` 保持 core-owned helper convenience。
- `Form.Error / Form.Companion` 只作为 form-owned selector primitive。
- `@logixjs/form/react` 与 repo-local `useForm*` 不回到 authority。

Reopen bar:

- canonical host law 无法覆盖 domain selector primitive。
- wrapper family 能删除一个 existing boundary 且不引入第二 host truth。

Current packet:

- [risk-05-host-selector-gate-watch-packet.md](./risk-05-host-selector-gate-watch-packet.md)
- result: `closed-for-current-matrix`
- residual: toolkit wrapper family remains outside canonical host law

## RISK-06 Verification Control Plane

Risk statement:

- verification lane 同时接 trial、scenario carrier、report、compare/perf admissibility。最大风险是 verification artifact vocabulary、expectation evaluator 或 compare productization 反向冻结成 public surface。

High-pressure capability set:

- `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01`, `VOB-02`, `VOB-03`

Required pressure checks:

- `fixtures/env + steps + expect` 只服务 verification，不进入 authoring surface。
- scenario carrier feed 只产 internal producer feed。
- report shell 继续收口到 `VerificationControlPlaneReport`。
- `runtime.compare` 只按 control-plane stage 冻结，productization beyond stage 必须另走 authority intake。

Reopen bar:

- scenario proof 必须公开 carrier / verification artifact vocabulary 才能被用户使用。
- expectation evaluator 必须拥有 compare truth。
- compare 需要 raw evidence 作为默认比较协议。

Current packet:

- [risk-06-verification-control-plane-pressure-packet.md](./risk-06-verification-control-plane-pressure-packet.md)
- result: `closed-for-current-matrix`
- residual: `TASK-003` remains deferred root compare productization authority-intake

## Priority Queue

| priority | risk id | reason |
| --- | --- | --- |
| `none` | `none` | `RISK-01..RISK-06` all closed for current matrix scope |

Second-wave adversarial pressure no longer reopens this closed `RISK-*` queue by default. It is tracked in [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) as `CAP-PRESS-*`.

## 当前一句话结论

当前 frozen API shape 可以继续保持不动。`RISK-01..RISK-06` 均已完成当前矩阵 pressure packet 或 proof refresh，并已由 [risk-lane-closure-check.md](./risk-lane-closure-check.md) 收尾；第二轮主动挑战改走 [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)；后续 generic continue 不启动 deferred `TASK-003`。
