# Implementation Trace Evidence Pack Router

**Role**: `155` 的实现期证据路由页  
**Status**: Freeze Recorded  
**Feature**: [spec.md](./spec.md)  
**Active Candidate**: [candidate-ac3.3.md](./candidate-ac3.3.md)

## Why Now

`TRACE-S1 .. TRACE-S5` 的 contract layer 已冻结。  
当前剩余缺口已经从 contract 设计转成实现期证据：

- actual compare route code
- proof pack execution
- benchmark evidence

这三类问题已经跨了不同 owner、不同相位、不同产物层级，不能继续绑在同一轮 success bar 里。

因此本页退回 implementation-phase umbrella router，只保留 lineage、closed contract children、active residual、next residual 与 writeback routing。

## Current Freeze

- adopted split verdict：`implementation trace evidence pack downgraded to umbrella router`
- current verdict：实现期父页不再直接承接 proof design问答
- frozen decisions：
  - contract layer 已冻结到：
    - `TRACE-S1 causal-links summary law`
    - `TRACE-S2 row-level summary diff substrate law`
    - `TRACE-S3 deterministic opaque id admission law`
    - `TRACE-S4 scenario execution carrier law`
    - `TRACE-S5 compare truth substrate law`
  - implementation phase 已按 `implementation proof execution -> benchmark evidence` 排成顺序 residual chain
  - benchmark 只允许复用 execution carrier，不拥有 perf truth
  - `TRACE-I1 implementation proof execution law` 已冻结
  - `TRACE-I2 benchmark evidence law` 已冻结
  - `TRACE-S1 .. TRACE-S5` 继续通过 contract router 归档
- closed contract router：
  - [challenge-runtime-scenario-compare-substrate.md](./challenge-runtime-scenario-compare-substrate.md)
- closed residual：
  - [challenge-runtime-scenario-proof-execution.md](./challenge-runtime-scenario-proof-execution.md)
  - [challenge-runtime-benchmark-evidence.md](./challenge-runtime-benchmark-evidence.md)
- active residual：
  - `none at design layer`
  - implementation baseline 已固定为 `AC3.3`
  - 当前主线程先做 `TRACE-I1 evidence map + gap ledger`
- ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-implementation-trace-evidence-pack.md`

## Fixed Baseline

下面这些内容在本页全部冻结：

- `AC3.3` public contract
- `S1 / S2 / C003` 已冻结 law
- `TRACE-S1 .. TRACE-S5` 已冻结 law
- `runtime.check / runtime.trial / runtime.compare` 的 control-plane owner
- benchmark 只允许复用 execution carrier，不创建第二验证 lane
- 不新增第二 diagnostics object / report shell / helper family

## Router Contract

本页只回答四件事：

1. 哪些 contract children 已经冻结
2. 当前 active residual 是什么
3. 下一刀是谁
4. 新 findings 应写回哪个 child ledger

本页不再直接回答：

- 最小 proof pack roster
- compare hook 细节
- benchmark matrix / budget / profile
- implementation wiring 细节

## Writeback Targets

- challenge queue：`discussion.md`
- parent candidate：`candidate-ac3.3.md`
- design active residual：`none`
- downstream gap：`actual code / empirical evidence`
- implementation map：`[trace-i1-evidence-map.md](./trace-i1-evidence-map.md)`
- implementation gap ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-trace-i1-gap-ledger.md`
- child ledger：`../../docs/review-plan/runs/2026-04-22-form-api-shape-implementation-trace-evidence-pack.md`
