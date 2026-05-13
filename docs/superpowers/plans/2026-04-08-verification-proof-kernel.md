# Verification Proof Kernel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Runtime.trial` 与 `Reflection.verify*` 背后的共享执行逻辑压成单一 `VerificationProofKernel`，让 canonical route 和 expert route 只保留薄适配器。

**Architecture:** 在 `packages/logix-core/src/internal/verification/**` 引入唯一 proof-kernel 内核，统一 session、evidence、exit normalization、shared layer wiring。`trialRun.ts` 退成极薄 wrapper，`trialRunModule.ts` 只负责 canonical route 的输入装配与报告组装，`kernelContract.ts` 与 `fullCutoverGate.ts` 只负责 expert route 的 diff/gate 语义。用 contract tests、route scan 和 docs/ledger 回写把这条边界封死。

**Tech Stack:** TypeScript, Effect v4, Vitest, pnpm, Logix runtime internals

---

## Scope Check

本计划只覆盖一个子系统：verification proof kernel。

包含：
- `packages/logix-core/src/internal/verification/**`
- `packages/logix-core/src/internal/observability/trialRunModule.ts`
- `packages/logix-core/src/internal/reflection/{kernelContract.ts,fullCutoverGate.ts}`
- 与该链路直接相关的 contract tests、runtime trial tests、docs 和 legacy ledgers

不包含：
- 新公开 API
- CLI / sandbox / examples 的新功能扩张
- `compare` 独立新能力
- 与 verification proof-kernel 无关的 observability 总体重构

## File Structure

### New Units

- Create: `packages/logix-core/src/internal/verification/proofKernel.types.ts`
  - proof-kernel 的统一输入输出合同。
- Create: `packages/logix-core/src/internal/verification/proofKernel.ts`
  - 唯一 proof execution 内核，负责：
    - 建 session
    - 挂 collector
    - 组 layer
    - 执行 program
    - 归一化 exit / ok / error / evidence
- Create: `packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts`
  - proof-kernel 核心合同测试。
- Create: `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`
  - canonical route / expert route 是否都改吃 proof-kernel 的结构门禁。

### Existing Units To Modify

- Modify: `packages/logix-core/src/internal/verification/trialRun.ts`
  - 退成 effect-first 极薄 wrapper，只转发到 proof-kernel。
- Modify: `packages/logix-core/src/internal/observability/trialRunModule.ts`
  - canonical route adapter，只保留：
    - root/program 装配
    - buildEnv / missing dependency 推导
    - manifest / staticIr / artifacts / report 组装
  - 不再自己持有 session / collector / exit normalization 主逻辑。
- Modify: `packages/logix-core/src/internal/reflection/kernelContract.ts`
  - `runOnce` 改吃 proof-kernel，只保留 trace diff 与 contract report 语义。
- Modify: `packages/logix-core/src/internal/reflection/fullCutoverGate.ts`
  - gate run 改吃 proof-kernel，只保留 allowlist 判定与 full cutover gate 语义。
- Modify: `packages/logix-core/src/Runtime.ts`
  - 注释与命名对齐 proof-kernel 结构，必要时只调整 import / comments。
- Modify: `packages/logix-core/src/internal/reflection-api.ts`
  - 注释与 expert route 说明对齐 proof-kernel owner。
- Modify: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
  - 固化 canonical route / expert route / no legacy helper 边界。
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
  - 继续覆盖 expert route 对共享 proof-kernel 的消费。
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts`
- Modify: `packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts`
- Modify: `packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts`
- Modify: `packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- Modify: `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`

### Boundary Decisions Locked In This Plan

- `proofKernel` 不进入公开 surface。
- `trialRun.ts` 可以保留，但只允许是 proof-kernel 的极薄 wrapper。
- `trialRunModule.ts` 可以保留，但只允许持有 canonical route 自己的组装与报告语义。
- `kernelContract.ts` 和 `fullCutoverGate.ts` 不再直接做 shared run/evidence wiring。
- 如果 `trialRunModule.ts` 在实施中继续膨胀，优先拆出 `trialRunModule.report.ts`，不要把 proof-kernel 逻辑塞回去。

## Chunk 1: Proof Kernel Contract

### Task 1: 引入 proof-kernel 合同和红灯测试

**Files:**
- Create: `packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts`
- Create: `packages/logix-core/src/internal/verification/proofKernel.types.ts`
- Create: `packages/logix-core/src/internal/verification/proofKernel.ts`

- [ ] **Step 1: 写失败的 proof-kernel 合同测试**

在 `packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts` 写两个最小用例：

```ts
import { describe, expect, it } from '@effect/vitest'
import { Effect, Exit } from 'effect'
import { runProofKernel } from '../../src/internal/verification/proofKernel.js'

describe('VerificationProofKernel contract', () => {
  it.effect('returns a unified proof result for a successful program', () =>
    Effect.gen(function* () {
      const result = yield* runProofKernel(Effect.succeed('ok'), {
        runId: 'run:test:proof-kernel:success',
        diagnosticsLevel: 'off',
      })

      expect(Exit.isSuccess(result.exit)).toBe(true)
      expect(result.ok).toBe(true)
      expect(result.evidence.runId).toBe('run:test:proof-kernel:success')
      expect(result.session.runId).toBe('run:test:proof-kernel:success')
    }),
  )

  it.effect('normalizes failure into a stable error summary', () =>
    Effect.gen(function* () {
      const result = yield* runProofKernel(Effect.fail(new Error('boom')), {
        runId: 'run:test:proof-kernel:failure',
        diagnosticsLevel: 'off',
      })

      expect(Exit.isFailure(result.exit)).toBe(true)
      expect(result.ok).toBe(false)
      expect(result.error?.message).toContain('boom')
    }),
  )
})
```

- [ ] **Step 2: 跑测试确认它先失败**

Run:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts
```

Expected:
- FAIL
- 原因应是 `proofKernel` 文件或导出不存在

- [ ] **Step 3: 写最小合同与 proof-kernel 骨架**

在 `packages/logix-core/src/internal/verification/proofKernel.types.ts` 定义最小合同：

```ts
export interface ProofKernelOptions {
  readonly runId?: RunId
  readonly source?: EvidencePackageSource
  readonly startedAt?: number
  readonly diagnosticsLevel?: DiagnosticsLevel
  readonly maxEvents?: number
  readonly layer?: Layer.Layer<any, any, any>
  readonly runtimeServicesInstanceOverrides?: RuntimeKernel.RuntimeServicesOverrides
}

export interface ProofKernelResult<A, E> {
  readonly session: RunSession
  readonly exit: Exit.Exit<A, E>
  readonly evidence: EvidencePackage
  readonly ok: boolean
  readonly error?: {
    readonly name: string
    readonly message: string
  }
}
```

在 `packages/logix-core/src/internal/verification/proofKernel.ts` 先写最小实现：

```ts
export const runProofKernel = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options?: ProofKernelOptions,
): Effect.Effect<ProofKernelResult<A, E>, never, R> =>
  Effect.gen(function* () {
    // 先把当前 trialRun.ts 的 session / collector / layer / exit / evidence 逻辑搬进来
    // 再补 ok / error normalization
  })
```

- [ ] **Step 4: 再跑 proof-kernel 合同测试**

Run:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 5: 手动 checkpoint 建议**

当前仓不要自动执行提交。若人类随后要求手动 checkpoint，建议命令：

```bash
git add packages/logix-core/src/internal/verification/proofKernel.types.ts \
        packages/logix-core/src/internal/verification/proofKernel.ts \
        packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts
git commit -m "refactor: introduce verification proof kernel contract"
```

## Chunk 2: Shared Runner Collapse

### Task 2: 把 `trialRun.ts` 压成 proof-kernel 的薄 wrapper

**Files:**
- Create: `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`
- Modify: `packages/logix-core/src/internal/verification/trialRun.ts`
- Test: `packages/logix-core/test/observability/ExecVmEvidence.off.test.ts`
- Test: `packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts`

- [ ] **Step 1: 写失败的 route 结构测试**

在 `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts` 先加第一条断言：

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const trialRunPath = resolve(fileURLToPath(new URL('../../src/internal/verification/trialRun.ts', import.meta.url)))

describe('Verification proof-kernel routes', () => {
  it('keeps trialRun as a thin wrapper around proofKernel', () => {
    const source = readFileSync(trialRunPath, 'utf8')
    expect(source.includes('./proofKernel')).toBe(true)
    expect(source.includes('makeRunSession(')).toBe(false)
    expect(source.includes('makeEvidenceCollector(')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认它先失败**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/observability/ExecVmEvidence.off.test.ts \
  packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts
```

Expected:
- `VerificationProofKernelRoutes.test.ts` FAIL
- 现有 observability tests 仍应 PASS

- [ ] **Step 3: 把 `trialRun.ts` 改成 proof-kernel wrapper**

目标形态：

```ts
import { runProofKernel, type ProofKernelOptions } from './proofKernel.js'

export interface TrialRunOptions extends ProofKernelOptions {}

export const trialRun = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options?: TrialRunOptions,
): Effect.Effect<TrialRunResult<A, E>, never, R> =>
  runProofKernel(program, options).pipe(
    Effect.map(({ session, exit, evidence }) => ({ session, exit, evidence })),
  )
```

- [ ] **Step 4: 跑 wrapper 结构测试和行为回归**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/observability/ExecVmEvidence.off.test.ts \
  packages/logix-core/test/observability/Observability.TrialRun.SessionIsolation.test.ts
```

Expected:
- 全部 PASS

- [ ] **Step 5: 手动 checkpoint 建议**

```bash
git add packages/logix-core/src/internal/verification/trialRun.ts \
        packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts
git commit -m "refactor: collapse trialRun into proof kernel"
```

### Task 3: 把 `trialRunModule.ts` 改成 canonical route adapter

**Files:**
- Modify: `packages/logix-core/src/internal/observability/trialRunModule.ts`
- Modify: `packages/logix-core/src/Runtime.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`

- [ ] **Step 1: 扩展 route 结构测试，先让 canonical route 红灯**

在 `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts` 再加一条断言：

```ts
const trialRunModulePath = resolve(fileURLToPath(new URL('../../src/internal/observability/trialRunModule.ts', import.meta.url)))

it('routes canonical Runtime.trial through proofKernel', () => {
  const source = readFileSync(trialRunModulePath, 'utf8')
  expect(source.includes('../verification/proofKernel')).toBe(true)
  expect(source.includes('makeRunSession(')).toBe(false)
  expect(source.includes('makeEvidenceCollector(')).toBe(false)
})
```

- [ ] **Step 2: 跑测试确认它先失败**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts
```

Expected:
- `VerificationProofKernelRoutes.test.ts` FAIL

- [ ] **Step 3: 抽 canonical route 适配点**

在 `packages/logix-core/src/internal/observability/trialRunModule.ts` 中只保留：
- root/program 装配
- buildEnv 与 missing dependency 解析
- manifest / staticIr / artifacts / environment 组装
- canonical report shape

proof-kernel 应承接：
- session
- collector
- layer wiring
- effect exit
- evidence export
- ok / error normalization

如果 `trialRunModule.ts` 改动后仍显得过重，立刻拆出：

```text
packages/logix-core/src/internal/observability/trialRunModule.report.ts
```

用于收纳 `TrialRunReport` 组装与预算裁剪逻辑。

- [ ] **Step 4: 跑 canonical route 回归**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
  packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts

pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
```

Expected:
- 全部 PASS

- [ ] **Step 5: 手动 checkpoint 建议**

```bash
git add packages/logix-core/src/internal/observability/trialRunModule.ts \
        packages/logix-core/src/Runtime.ts \
        packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
        packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
        packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
        packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts
git commit -m "refactor: route canonical trial through proof kernel"
```

## Chunk 3: Expert Route Adapters

### Task 4: 把 `kernelContract.ts` 改成 proof-kernel consumer

**Files:**
- Modify: `packages/logix-core/src/internal/reflection/kernelContract.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
- Test: `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`

- [ ] **Step 1: 扩展 route 结构测试，让 expert contract route 先红灯**

在 `VerificationProofKernelRoutes.test.ts` 增加：

```ts
const kernelContractPath = resolve(fileURLToPath(new URL('../../src/internal/reflection/kernelContract.ts', import.meta.url)))

it('routes CoreReflection.verifyKernelContract through proofKernel', () => {
  const source = readFileSync(kernelContractPath, 'utf8')
  expect(source.includes('../verification/proofKernel')).toBe(true)
  expect(source.includes(\"from '../verification/trialRun'\")).toBe(false)
})
```

- [ ] **Step 2: 跑测试确认它先失败**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts
```

Expected:
- `VerificationProofKernelRoutes.test.ts` FAIL

- [ ] **Step 3: 用 proof-kernel 替换局部 run wiring**

目标代码形态：

```ts
const result = yield* runProofKernel(program as any, {
  runId: run?.runId,
  diagnosticsLevel: options.diagnosticsLevel ?? 'light',
  maxEvents: options.maxEvents,
  layer: extraLayer,
  runtimeServicesInstanceOverrides: run?.runtimeServicesInstanceOverrides,
})

const ok = result.ok
const error = result.error
const runtimeSummary = extractRuntimeSummary(result.evidence)
const traceOps = extractKernelContractTraceOps(result.evidence)
```

要求删除本地重复逻辑：
- 不再自己从 `Exit` 推导 `ok`
- 不再自己从 `Exit` 拼 `error`
- 不再自己直接持有 shared run primitive

- [ ] **Step 4: 跑 expert contract 回归**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts
```

Expected:
- 全部 PASS

- [ ] **Step 5: 手动 checkpoint 建议**

```bash
git add packages/logix-core/src/internal/reflection/kernelContract.ts \
        packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts \
        packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts
git commit -m "refactor: route kernel contract verification through proof kernel"
```

### Task 5: 把 `fullCutoverGate.ts` 改成 proof-kernel consumer

**Files:**
- Modify: `packages/logix-core/src/internal/reflection/fullCutoverGate.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
- Test: `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`

- [ ] **Step 1: 扩展 route 结构测试，让 full-cutover gate route 先红灯**

在 `VerificationProofKernelRoutes.test.ts` 增加：

```ts
const fullCutoverGatePath = resolve(fileURLToPath(new URL('../../src/internal/reflection/fullCutoverGate.ts', import.meta.url)))

it('routes CoreReflection.verifyFullCutoverGate through proofKernel', () => {
  const source = readFileSync(fullCutoverGatePath, 'utf8')
  expect(source.includes('../verification/proofKernel')).toBe(true)
  expect(source.includes(\"from '../verification/trialRun'\")).toBe(false)
})
```

- [ ] **Step 2: 跑测试确认它先失败**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts
```

Expected:
- `VerificationProofKernelRoutes.test.ts` FAIL

- [ ] **Step 3: 用 proof-kernel 替换 gate run**

目标代码形态：

```ts
const gateResult = yield* runProofKernel(gateProgram, {
  runId: gateRun?.runId,
  diagnosticsLevel: options?.gateDiagnosticsLevel ?? 'off',
  layer: gateLayer,
  runtimeServicesInstanceOverrides: gateRun?.runtimeServicesInstanceOverrides,
})

const gateValue = Exit.isSuccess(gateResult.exit)
  ? gateResult.exit.value
  : (() => { throw new Error(gateResult.error?.message ?? 'trial-run failed') })()
```

本任务只替换 shared run logic，不动：
- allowlist diff 判断
- full cutover gate verdict 语义
- gate anchor / missing service 解释链

- [ ] **Step 4: 跑 gate 回归**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts
```

Expected:
- 全部 PASS

- [ ] **Step 5: 手动 checkpoint 建议**

```bash
git add packages/logix-core/src/internal/reflection/fullCutoverGate.ts \
        packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
        packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts \
        packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts
git commit -m "refactor: route full cutover gate through proof kernel"
```

## Chunk 4: Cleanup, Docs, And Final Gate

### Task 6: 对齐 docs、legacy ledgers 和代码注释

**Files:**
- Modify: `packages/logix-core/src/Runtime.ts`
- Modify: `packages/logix-core/src/internal/reflection-api.ts`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- Modify: `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`

- [ ] **Step 1: 写一条失败的 route ownership 断言**

在 `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts` 增加断言：

```ts
expect(typeof Logix.Runtime.trial).toBe('function')
expect(typeof CoreReflection.verifyKernelContract).toBe('function')
expect(typeof CoreReflection.verifyFullCutoverGate).toBe('function')
expect('trialRun' in (Logix as any).Observability).toBe(false)
expect('trialRunModule' in (Logix as any).Observability).toBe(false)
```

如果中间改坏 route boundary，这条会红。

- [ ] **Step 2: 跑测试确认当前红灯或保护住边界**

Run:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts
```

Expected:
- 若边界已被破坏则 FAIL
- 若未被破坏则 PASS，可以直接进入文档回写

- [ ] **Step 3: 更新事实源**

必须同步写清：
- canonical route 继续是 `runtime.*`
- expert route 继续是 `Reflection.verify*`
- proof-kernel 是共享执行内核
- `trialRunModule.ts` 是 canonical route adapter
- `kernelContract.ts` 与 `fullCutoverGate.ts` 是 expert route adapter

- [ ] **Step 4: 跑 docs + contract 最小回归**

Run:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts
rg -n 'proof-kernel|proof kernel|VerificationProofKernel|runtime\\.trial|Reflection\\.verify' \
  docs/ssot/runtime/09-verification-control-plane.md \
  specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md \
  specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md
```

Expected:
- contract test PASS
- route wording可读且无自相矛盾描述

- [ ] **Step 5: 手动 checkpoint 建议**

```bash
git add packages/logix-core/src/Runtime.ts \
        packages/logix-core/src/internal/reflection-api.ts \
        docs/ssot/runtime/09-verification-control-plane.md \
        specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md \
        specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md
git commit -m "docs: align verification routes around proof kernel"
```

### Task 7: 运行最终门禁并写执行结论

**Files:**
- Modify: `docs/superpowers/plans/2026-04-08-verification-proof-kernel.md`
- Test: `packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts`
- Test: `packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts`
- Test: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts`
- Test: `packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts`
- Test: `packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`

- [ ] **Step 1: 跑 contract suite**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts \
  packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts \
  packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts \
  packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts \
  packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts \
  packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts \
  packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts \
  packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts
```

Expected:
- PASS

- [ ] **Step 2: 跑 canonical route 回归**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
  packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
  packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts
```

Expected:
- PASS

- [ ] **Step 3: 跑编译和全仓类型检查**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
pnpm typecheck
```

Expected:
- PASS

- [ ] **Step 4: 跑最终结构门禁**

Run:

```bash
rg -n 'makeRunSession\\(|makeEvidenceCollector\\(' \
  packages/logix-core/src/internal/verification/trialRun.ts \
  packages/logix-core/src/internal/observability/trialRunModule.ts \
  packages/logix-core/src/internal/reflection/kernelContract.ts \
  packages/logix-core/src/internal/reflection/fullCutoverGate.ts \
  -g '*.ts'

rg -n '../verification/trialRun|../observability/trialRun|../../observability/trialRun' \
  packages/logix-core/src/internal/reflection \
  packages/logix-core/src/internal/observability/trialRunModule.ts \
  -g '*.ts'
```

Expected:
- 第一个 grep 只允许 `proofKernel.ts` 内部保留 shared run wiring
- 第二个 grep 只允许 route adapters 指向 `proofKernel`，不再直接指向 `trialRun`

- [ ] **Step 5: 记录执行结论和手动 checkpoint 建议**

把本计划底部补一段 `Execution Notes`，记录：
- proof-kernel 文件是否创建
- route adapters 是否完成迁移
- docs / ledgers 是否已回写
- 哪些命令通过

手动 checkpoint 建议：

```bash
git add packages/logix-core/src/internal/verification \
        packages/logix-core/src/internal/observability/trialRunModule.ts \
        packages/logix-core/src/internal/reflection/kernelContract.ts \
        packages/logix-core/src/internal/reflection/fullCutoverGate.ts \
        packages/logix-core/test/Contracts \
        packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts \
        packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts \
        packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts \
        packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts \
        docs/ssot/runtime/09-verification-control-plane.md \
        specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md \
        specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md
git commit -m "refactor: introduce verification proof kernel"
```

## Implementation Order

1. 先做 Chunk 1，拿到 proof-kernel 合同与最小内核
2. 再做 Chunk 2，把 canonical route 改成薄适配器
3. 再做 Chunk 3，把 expert route 改成薄适配器
4. 最后做 Chunk 4，回写 docs/ledger 并跑总门禁

## Stop Conditions

遇到以下任一情况，暂停执行并回到设计层重新裁决：
- `trialRunModule.ts` 迁移后需要新建第二套 report contract
- `kernelContract.ts` 或 `fullCutoverGate.ts` 无法只保留 route-specific 语义，仍需要复制 proof logic
- 为了过测试不得不恢复 `trialRunModule`、`kernelContract`、`fullCutoverGate` 各自持有一套 session/collector wiring
- canonical route 与 expert route 的输出语义出现分叉

## Execution Notes

- 2026-04-08：`packages/logix-core/src/internal/verification/proofKernel.{types,ts}` 已创建。
- 2026-04-08：`packages/logix-core/src/internal/verification/trialRun.ts` 已退成 proof-kernel 薄 wrapper。
- 2026-04-08：`packages/logix-core/src/internal/observability/trialRunModule.ts` 已退成 canonical route adapter，并通过 proof-kernel 共享执行 wiring。
- 2026-04-08：`packages/logix-core/src/internal/reflection/{kernelContract.ts,fullCutoverGate.ts}` 已改成 proof-kernel consumer。
- 2026-04-08：`docs/ssot/runtime/09-verification-control-plane.md` 与 `specs/130-runtime-final-cutover/inventory/{control-plane-entry-ledger.md,docs-consumer-matrix.md}` 已回写 proof-kernel 口径。
- 2026-04-08：已通过的关键验证：
  - `pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernel.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelRoutes.test.ts packages/logix-core/test/Contracts/KernelReflectionSurface.test.ts packages/logix-core/test/Contracts/KernelReflectionInternalEdges.test.ts packages/logix-core/test/Contracts/KernelReflectionExpertConsumers.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.serializable.test.ts packages/logix-core/test/Contracts/Contracts.047.FullCutoverGate.trial.test.ts`
  - `pnpm vitest run packages/logix-core/test/Runtime/Runtime.trial.runId.test.ts packages/logix-core/test/observability/Runtime.trial.runSessionIsolation.test.ts packages/logix-core/test/observability/Runtime.trial.runtimeServicesEvidence.test.ts packages/logix-core/test/observability/Runtime.trial.reExportBudget.test.ts`
  - `pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit`
  - `pnpm typecheck`
  - `rg -n 'makeRunSession\\(|makeEvidenceCollector\\(' packages/logix-core/src/internal/verification/trialRun.ts packages/logix-core/src/internal/observability/trialRunModule.ts packages/logix-core/src/internal/reflection/kernelContract.ts packages/logix-core/src/internal/reflection/fullCutoverGate.ts -g '*.ts'`
    - ZERO HIT
  - `rg -n '../verification/trialRun|../observability/trialRun|../../observability/trialRun' packages/logix-core/src/internal/reflection packages/logix-core/src/internal/observability/trialRunModule.ts -g '*.ts'`
    - ZERO HIT
