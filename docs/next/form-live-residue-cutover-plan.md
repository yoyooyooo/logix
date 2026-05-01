---
title: Form Live Residue Cutover Plan
status: proposed
target:
  - examples/logix-react/src/demos/form/**
  - examples/logix-react/src/modules/**
  - examples/logix-sandbox-mvp/src/ir/IrPage.tsx
  - examples/logix-sandbox-mvp/src/ir/IrPresets.ts
  - examples/logix-form-poc/**
  - packages/logix-form/package.json
  - docs/internal/form-api-tutorial.md
  - docs/internal/README.md
  - docs/proposals/README.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# Form Live Residue Cutover Plan

## 目标

把 `F1` 之后仍留在代码、examples、manifest 与 demo helper 里的 live residue 收成可执行 cutover plan。

本页只处理 live residue。
authority writeback 与 `P0` semantic closure 继续交给其他 proposal。

## 当前 adopted claim

1. canonical route 已固定为：
   - `Form.make(...)`
   - returned `FormProgram`
   - core host law
   - `fieldValue / rawFormMeta / Form.Error.field`
2. repo-local `useForm* / useField* / useFieldArray* / withFormDsl` 只按 demo-local residue 理解
3. `Form.from / config.logic / @logixjs/form/react` 若仍出现在 live example、preset 或 manifest promise 中，只按 cutover debt 处理
4. toolkit intake 不能把 live residue 直接当成正证据

## 执行入口

- implementation plan:
  - [2026-04-21-form-live-residue-cutover-implementation.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-21-form-live-residue-cutover-implementation.md)

## Execution Snapshot

- `W1`
  - active demos / modules 已从 `useForm* / withFormDsl` 切到 direct handle / core selector
  - 旧 `examples/logix-react/src/form-support.ts` 已删除
  - 旧 `form-cases` 案例集与 `demo-runtime.ts` 已删除
  - sandbox active preset 已改到 `Form.make(..., define)`
- `W2`
  - `packages/logix-form/package.json` 已去掉 React public route 误导
- `WQ`
  - `examples/logix-form-poc/**` 已补 historical / quarantine banner

## Lane Decision

当前已转入 `docs/next/**`，理由固定为：

- 主方向已收口
- 当前只剩 `examples/logix-form-poc/**` 的最小 quarantine 预算与实际落盘收尾

当前从 `docs/next/**` 升格或 consumed 的门槛固定为：

- `Live Residue Ledger` 已固定
- blocking waves 全部收口
- retrieval quarantine 只剩执行型收尾
- proposal 级 `Reopen Gate` 与 `Consume Gate` 已固定

若后续出现新的主方向分歧，必须回到 `docs/proposals/**` 重新开 proposal。

## Consume Gate

本页只有在同时满足下面条件时才允许 consumed：

- active teaching route 不再产出旧 canonical 读法
- internal mirror 与 inventory witness 已同步
- manifest truth 不再暗示 React route
- high-conflict stale hazard 已 quarantine 或显式 parked
- proposal lane 去向已记录

## Live Residue Ledger

proof 列只允许使用下面这组固定词表：

- `owner parity`
- `live route parity`
- `internal mirror parity`
- `manifest parity`
- `quarantine parity`
- `consume decision recorded`

| claim | residue-class | authority-owner | live-target | mirror-target | stale-hazard | forbidden-surface | required-cutover | proof | wave | blocking-status | reopen-route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LR1 canonical route only` | `wrapper-family` | `form/13 + runtime/10 + runtime/06` | `examples/logix-react/src/demos/form/**`, `examples/logix-react/src/modules/**` | `docs/internal/form-api-tutorial.md`, `docs/internal/README.md` | `examples/logix-form-poc/**` | `useForm* / useField* / useFieldArray* / withFormDsl` 被讲成 sanctioned route | active demos 与 internal tutorial 全部回到 canonical route；旧 helper family 文件已删除 | `owner parity + live route parity + internal mirror parity` | `W1` | `blocking` | `本 proposal` |
| `LR2 old authoring route is cutover debt` | `authoring-residue` | `runtime/06 + form/13` | `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`, `examples/logix-sandbox-mvp/src/ir/IrPresets.ts`, `examples/logix-form-poc/**` | `docs/internal/form-api-tutorial.md` | historical presets / POC | `Form.from / config.logic / @logixjs/form/react` 继续作为 live teaching route | active examples 不再教授旧 authoring route | `owner parity + live route parity + quarantine parity` | `W1` | `blocking` | `本 proposal` |
| `LR3 manifest truth does not imply React route` | `manifest-residue` | `form/13 + runtime/10` | `packages/logix-form/package.json` | inventory witness | none | package manifest 继续暗示 React public route | 依赖与 peer 只保留真实运行 / 测试 / 构建含义 | `manifest parity + consume decision recorded` | `W2` | `blocking` | `本 proposal` |
| `LR4 live residue is not positive toolkit evidence` | `governance-residue` | `runtime/11 + runtime/12` | none | inventory witness | none | 用 live wrapper / demo residue 倒逼 toolkit 升格 | 只允许 claim 级 handoff，不允许 residue 直接升格 | `owner parity + consume decision recorded` | `W2` | `blocking` | `相关 toolkit proposal / authority` |
| `LR5 historical POC quarantine` | `stale-hazard` | `this-proposal` | `examples/logix-form-poc/README.md`, `examples/logix-form-poc/demo/README.md` | `docs/proposals/README.md` | `examples/logix-form-poc/**` | stale POC 抢占 active retrieval / teaching route | 最小动作固定为：`POC README/banner` + `proposal lane de-preference / consume note` | `quarantine parity + consume decision recorded` | `WQ` | `non-blocking unless still hijacks retrieval` | `本 proposal` |

## in scope

- example-local wrapper family
- sandbox preset / IR 样例里的旧 authoring route
- package manifest 与 README promise 的 live residue
- 仍会误导用户的 demo / cookbook 叙事

## out of scope

- exact authority wording
- `FormErrorLeaf` / decode / render contract
- `active-shape / settlement / reason` 语义闭环
- `isValid / isPristine` 的 exact noun freeze

## Reopen Gate

本提案只有在出现下面任一事实时才允许重开：

- active teaching route 仍产出旧 canonical 读法
- manifest truth 与 authority owner 再次冲突
- retrieval quarantine 仍无法压住高冲突 stale hazard
- live witness 证明当前 cutover 关闭条件失真

凡涉及下面这些议题，默认不得回灌到本页：

- `P0 semantic closure`
- `error / decode / render` owner truth
- toolkit intake 的 exact noun / policy
- `isValid / isPristine` exact corollary freeze

## Pending / Hold

`pending / hold` 当前统一按下面格式阅读：

- `当前默认建议`：主 agent 当前推荐的临时读法
- `暂缓原因`：为什么此轮不冻结
- `freeze-owner`：当前谁负责维持这条 hold 的边界
- `reopen-evidence`：满足什么证据后再重开
- `blocking-status`：是否阻塞本提案 consumed
- `expected-landing`：后续更可能落到哪份 authority 或 proposal
- `drop-rule`：什么情况下直接删除、降级或 supersede

| id | topic | 当前默认建议 | 暂缓原因 | freeze-owner | reopen-evidence | blocking-status | expected-landing | drop-rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LH1` | `isValid / isPristine` 是否形成 core adjunct corollary | 继续按 `core-gap` / app-local corollary 理解，不升 authority | adjunct noun、import shape 与 reopen gate 还没冻结 | `runtime/10 + runtime/12` | `P0` closure 后，adjunct route 稳定 | `non-blocking` | `runtime/10` + `runtime/12` | 若后续无 owner 采用，则留在 app-local |
| `LH3` | demo-local wrapper 是否保留少量 cookbook-only helper | 可以短期保留极薄 local helper，但不得暗示 future family | 某些 demo 还依赖过渡 ergonomics | `examples/logix-react + docs/internal` | active example 仍依赖 local helper，导致 `live route parity` 失败 | `parked` | `examples/logix-react` + docs/internal | 若不再服务 active example，直接删除 |

## Waves

### W1. blocking live route cutover

目标：

- active demos / modules 与旧 helper family 文件不再制造 sanctioned helper family 错觉
- sandbox active preset 不再教授 `Form.from / config.logic`
- internal tutorial 只保留 canonical route

proof bundle：

- `owner parity`
- `live route parity`
- `internal mirror parity`

### W2. blocking manifest and inventory parity

目标：

- `packages/logix-form/package.json` 不再暗示 React route
- inventory witness 与 proposal route 对当前 cutover 状态一致
- toolkit intake 不再把 live residue 当正证据

proof bundle：

- `manifest parity`
- `owner parity`
- `consume decision recorded`

### WQ. non-blocking retrieval quarantine

目标：

- `examples/logix-form-poc/README.md` 与 `examples/logix-form-poc/demo/README.md` 被降到 historical / quarantine 位
- `docs/proposals/README.md` 对 POC 给出 de-preference / consume note
- active retrieval 不再默认回到 POC current-teaching 读法

proof bundle：

- `quarantine parity`
- `consume decision recorded`

## Suggested Verification

```bash
rtk rg -n "\\bForm\\.from\\b|@logixjs/form/react\\b|useFormMeta|useFormField|useFormList|withFormDsl" \
  examples/logix-react/src \
  examples/logix-form-poc \
  examples/logix-sandbox-mvp/src \
  docs/internal \
  packages/logix-form/package.json

rtk git diff --check -- \
  examples/logix-react/src/modules \
  examples/logix-sandbox-mvp/src/ir/IrPage.tsx \
  examples/logix-sandbox-mvp/src/ir/IrPresets.ts \
  examples/logix-form-poc \
  packages/logix-form/package.json \
  docs/internal/README.md \
  docs/proposals/README.md \
  docs/next/form-live-residue-cutover-plan.md
```

## 当前一句话结论

live residue 的处理原则已经固定：先用 `Live Residue Ledger` 收 owner、live route、mirror、proof 与 quarantine，再按 `W1/W2/WQ` 切 blocking cutover 和非阻塞历史收尾。
