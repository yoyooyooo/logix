# Runtime Scenario/Compare Substrate Router

**Role**: `TRACE` 的 umbrella router  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Reason**: [challenge-implementation-trace-evidence-pack.md](./challenge-implementation-trace-evidence-pack.md)

## Why Now

`implementation trace evidence pack` 仍然 `not-ready`。

但原始父页已经发生 scope drift：

- `scenario carrier`
- `compare contract`
- `evidence summary`
- `row-heavy fixture`
- `benchmark reuse`

这些问题分属不同 owner、不同相位、不同产物层级，不能再绑在同一轮 success bar 里。

同时，下面三层已经分别冻结：

- `TRACE-S1 causal-links summary law`
- `TRACE-S2 row-level summary diff substrate law`
- `TRACE-S3 deterministic opaque id admission law`

所以父页不再承载设计问答，只保留 lineage、closed children、active residual 与 next residual。

## Current Freeze

- adopted split verdict：`TRACE parent downgraded to umbrella router`
- current verdict：父页不再直接回答 substrate 设计问题
- frozen decisions：
  - 父页只保留 lineage 与 handoff，不再承接新的 Required Questions
  - `TRACE-S1 / TRACE-S2 / TRACE-S3` 继续作为 closed children
  - active residual 固定为 `scenario execution carrier`
  - next residual 固定为 `compare truth substrate`
  - `bundlePatchRef constructor / sourceReceiptRef digest admissibility / focusRef.sourceRef priority` 并入 `compare truth substrate`
  - `row-heavy fixture` 并入 `scenario execution carrier` 的 acceptance
  - `benchmark reuse` 只作为 `scenario execution carrier` 的执行载体复用，不承接 perf truth
- closed children：
  - [challenge-runtime-causal-links-summary-law.md](./challenge-runtime-causal-links-summary-law.md)
  - [challenge-runtime-row-level-summary-diff-substrate.md](./challenge-runtime-row-level-summary-diff-substrate.md)
  - [challenge-runtime-deterministic-opaque-id-law.md](./challenge-runtime-deterministic-opaque-id-law.md)
  - [challenge-runtime-scenario-execution-carrier.md](./challenge-runtime-scenario-execution-carrier.md)
  - [challenge-runtime-compare-truth-substrate.md](./challenge-runtime-compare-truth-substrate.md)
- closed residual：
  - [challenge-runtime-compare-truth-substrate.md](./challenge-runtime-compare-truth-substrate.md)
- active residual：`none at contract layer`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-compare-substrate.md`

## Fixed Baseline

下面这些内容在本页全部冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `runtime.check / runtime.trial / runtime.compare` 的 control-plane owner
- `fixtures/env + steps + expect` 的 scenario 输入协议
- 不新增第二 diagnostics truth
- 不把 `trial.scenario` 推回公开 authoring surface

## Router Contract

本页只回答四件事：

1. 哪些 `TRACE` 子挑战已经冻结
2. 当前 active residual 是什么
3. 下一刀是谁
4. 新 findings 应写回哪个 child ledger

本页不再回答：

- exact scenario carrier shape
- exact compare pipeline shape
- exact evidence summary shape
- row-heavy fixture 细节
- benchmark reuse 细节

## Writeback Targets

- challenge queue：`discussion.md`
- parent challenge：`challenge-implementation-trace-evidence-pack.md`
- closed residual：
  - `[challenge-runtime-scenario-execution-carrier.md](./challenge-runtime-scenario-execution-carrier.md)`
  - `[challenge-runtime-compare-truth-substrate.md](./challenge-runtime-compare-truth-substrate.md)`
- active residual：`implementation proof execution -> benchmark evidence`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-runtime-scenario-compare-substrate.md`
