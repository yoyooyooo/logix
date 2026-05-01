# Residual Owner And Artifact Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 清掉 Batch 11 之后剩余的老 owner 与 artifact 残留，继续拆散 `InternalContracts` 的最后一批 active consumers，并把 workflow artifact 命名从当前仓的 active truth 中收口。

**Architecture:** 这一批只收 Batch 11 之后剩下的两类尾巴：第一类是 form DSL、examples、长期 tests 里仍然直连 `repo-internal/InternalContracts` 的 consumer；第二类是 `controlProgramSurface / control-program.surface.json / control_program_ir_v1` 这类 artifact 命名与旧 owner 文件物理退出的准备工作。执行顺序固定为：先把 Batch 12 planning 状态写进总提案，再收剩余 consumer 到 `runtime/read/field` 小 owner，随后改 CLI / control-plane artifact 命名与相关 witness，最后视解析链情况处理 `Debug / Observability / Reflection / Kernel` 等旧 owner 文件的物理退出或最后一层桥接整理。简单迁移不补新测试文件，断言继续折回现有长期 witness、focused tests 与 typecheck。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, Markdown docs

---

## File Map

### Planning and authority

- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- Modify: `docs/ssot/runtime/{04-capabilities-and-runtime-control-plane,09-verification-control-plane}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

### Remaining `InternalContracts` consumers

- Modify: `packages/logix-form/src/internal/{dsl/**,form/**}`
- Modify: `examples/logix/src/{patterns,scenarios}/**`
- Modify: `examples/logix-react/src/{demos,modules}/**`
- Modify: `examples/logix-sandbox-mvp/src/ir/**`
- Modify: `packages/logix-form/test/**/*.test.ts`
- Modify: `packages/logix-query/test/**/*.test.ts`
- Modify: `packages/logix-react/test/{Hooks,RuntimeProvider,integration,browser/perf-boundaries}/**`
- Modify: `packages/logix-core/test/{FieldKernel,Reflection,Runtime,Logic,internal/**}/**`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`

### Workflow artifact naming and control-plane residue

- Modify: `packages/logix-cli/src/internal/commands/{describe,irExport,irValidate,irDiff}.ts`
- Modify: `examples/logix-cli-playground/scripts/check-ir-consistency.mjs`
- Modify: `packages/logix-core/src/{Observability,Reflection}.ts`
- Modify: `packages/logix-core/src/internal/{observability/controlSurfaceManifest,observability/controlProgramSurface,workflow/compiler,workflow/model}.ts`
- Modify: related tests under `packages/logix-core/test/{observability,Reflection,Contracts}/**`

### Old owner file exit preparation

- Modify or delete: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel}.ts`
- Modify: `packages/logix-core/src/internal/{debug-api,evidence-api,reflection-api,kernel-api}.ts`
- Modify: `packages/logix-core/package.json`
- Modify: `vitest.shared.ts`

### Guardrails for this batch

- 不重开任何 public surface；只处理残余 owner 与 artifact 命名。
- 不新增 migration-only 测试文件；只改现有长期 witness、focused tests 与 typecheck 门禁。
- 若旧 owner 文件的物理删除仍受当前解析链阻塞，只允许留下最薄 bridge，不得继续承载真实 owner 逻辑。
- `controlProgramSurface` 命名若继续保留，必须明确它只是 internal control-plane artifact；若改名，CLI / evidence / compare 面必须一起改，不允许双轨长期并存。
- `repo-internal/InternalContracts` 默认继续瘦身；除非确有证据，不再接受新增 consumer。

## Chunk 1: Batch Frame

### Task 1: 把 Batch 12 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 新增 Batch 12 条目**

要求：
- 名称固定为 `Residual Owner And Artifact Cleanup`
- `status=planning`
- 范围明确写：
  - 剩余 `InternalContracts` consumer 扇出
  - workflow artifact 命名收口
  - 旧 owner 文件物理退出或最后一层桥接整理

- [x] **Step 2: 更新“当前最可能的下一批”**

要求：
- 改成这批为主
- 说明 deep internal runtime 已收口一轮，剩余是残余 owner 与 artifact cleanup

- [x] **Step 3: 跑最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Final `InternalContracts` Fan-Out

### Task 2: 先把剩余 `InternalContracts` consumer 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: representative long-term tests under `packages/logix-form/test/**`, `packages/logix-query/test/**`, `packages/logix-react/test/**`

- [x] **Step 1: 收紧长期 owner 断言**

要求：
- 断言 `repo-internal/InternalContracts` 不再是 active source / example / canonical test 的默认入口
- 长期 tests 优先使用 `runtime-contracts / read-contracts / field-contracts`

- [x] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.InternalContractsBoundary.test.ts
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
- 至少一项失败
- 失败原因直接指向剩余 active consumer 仍绑在 `InternalContracts`

### Task 3: 扇出最后一批 active consumer

**Files:**
- Modify: `packages/logix-form/src/internal/{dsl/**,form/**}`
- Modify: `examples/logix/src/{patterns,scenarios}/**`
- Modify: `examples/logix-react/src/{demos,modules}/**`
- Modify: `examples/logix-sandbox-mvp/src/ir/**`
- Modify: `packages/logix-form/test/**/*.test.ts`
- Modify: `packages/logix-query/test/**/*.test.ts`
- Modify: `packages/logix-react/test/{Hooks,RuntimeProvider,integration,browser/perf-boundaries}/**`
- Modify: `packages/logix-core/test/{FieldKernel,Reflection,Runtime,Logic,internal/**}/**`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`

- [x] **Step 1: 继续按能力迁移**

要求：
- field grammar / rowId / validate / transaction patch 全部改到 `field-contracts`
- runtime store / imports scope / host scheduler / tick service 全部改到 `runtime-contracts`
- read/query/resource/replay 全部改到 `read-contracts`

- [x] **Step 2: 删掉 examples 与长期 tests 里的大口子入口**

要求：
- active examples 与长期 tests 不再把 `InternalContracts` 当默认入口
- 若个别长期 tests 必须继续覆盖聚合口，只能留下极少量 boundary witness，不得再做默认 teaching path

- [x] **Step 3: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C examples/logix-react typecheck
```

Expected:
PASS

## Chunk 3: Workflow Artifact Cleanup

### Task 4: 先把 workflow artifact 命名改成红灯

**Files:**
- Modify: `packages/logix-core/test/{observability,Reflection,Contracts}/**`
- Modify: `packages/logix-cli/test/**`

- [x] **Step 1: 收紧 artifact 命名断言**

要求：
- 不再把 `controlProgramSurface` / `control-program.surface.json` 当不可挑战的长期命名
- 测试改成围绕新的 internal control-plane artifact 命名或至少围绕“非公开 truth”定位断言

- [x] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/observability/KernelObservabilitySurface.test.ts test/CoreReflection.exportStaticIr.basic.test.ts
pnpm -C packages/logix-cli exec vitest run test/Integration/cli.ir-diff.fields.test.ts test/Integration/cli.describe-json.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向旧 workflow artifact 命名仍被长期事实化

### Task 5: 收口 workflow artifact 命名

**Files:**
- Modify: `packages/logix-cli/src/internal/commands/{describe,irExport,irValidate,irDiff}.ts`
- Modify: `examples/logix-cli-playground/scripts/check-ir-consistency.mjs`
- Modify: `packages/logix-core/src/{Observability,Reflection}.ts`
- Modify: `packages/logix-core/src/internal/{observability/controlSurfaceManifest,observability/controlProgramSurface,workflow/compiler,workflow/model}.ts`
- Modify: related tests under `packages/logix-core/test/{observability,Reflection,Contracts}/**`

- [x] **Step 1: 改 artifact 命名与说明**

要求：
- workflow artifact 改成不再误导为公开 assembly truth 的命名
- CLI / manifest / validate / diff / example script 一起切

- [x] **Step 2: 改 docstring 与 expert helper 叙述**

要求：
- `Observability.ts` / `Reflection.ts` 的说明改成 internal control-plane artifact 口径
- 不继续把 workflow artifact 写成稳定 public-facing noun

- [x] **Step 3: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/observability/KernelObservabilitySurface.test.ts test/CoreReflection.exportStaticIr.basic.test.ts
pnpm -C packages/logix-cli exec vitest run test/Integration/cli.ir-diff.fields.test.ts test/Integration/cli.describe-json.test.ts
```

Expected:
PASS

## Chunk 4: Old Owner File Exit

### Task 6: 处理旧 owner 文件的最终物理退出或最薄桥接

**Files:**
- Modify or delete: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel}.ts`
- Modify: `packages/logix-core/src/internal/{debug-api,evidence-api,reflection-api,kernel-api}.ts`
- Modify: `packages/logix-core/package.json`
- Modify: `vitest.shared.ts`

- [x] **Step 1: 验证是否还能物理删除**

要求：
- 若当前解析链已不再依赖这些 root 文件，直接删掉并把 repo-internal 指到真正 owner
- 若仍有解析链阻塞，只保留最薄 bridge，且 bridge 文件不得再承载真实实现

- [x] **Step 2: 对齐 allowlist 与测试 alias**

要求：
- `package.json` 与 `vitest.shared.ts` 必须和最终选择一致
- 不允许出现一边指 root、一边指 internal 的长期漂移

- [x] **Step 3: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/KernelBoundary.test.ts test/PublicSurface/Core.RootExportsBoundary.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 5: Completion Gate

### Task 7: 统一跑收尾验证并回写批次状态

**Files:**
- Verify only

- [x] **Step 1: 跑 focused tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts \
  test/Contracts/KernelBoundary.test.ts \
  test/observability/KernelObservabilitySurface.test.ts
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useDispatch.test.tsx \
  test/RuntimeProvider/runtime-debug-trace-integration.test.tsx
```

Expected:
PASS

- [x] **Step 2: 跑整仓类型检查**

Run:
```bash
pnpm typecheck
```

Expected:
PASS

- [x] **Step 3: 搜索剩余残留**

Run:
```bash
rg -n "@logixjs/core/repo-internal/InternalContracts|controlProgramSurface|workflow\\.surface\\.json|packages/logix-core/src/(Debug|Observability|Reflection|Kernel)\\.ts" \
  packages examples docs/ssot docs/standards docs/proposals \
  --glob '!docs/archive/**' --glob '!packages/logix-sandbox/public/**'
```

Expected:
- 只剩 proposal 历史材料、极少数 boundary witness，或明确允许的最后桥接
- 不再有 active source / canonical docs 把这些残留当默认入口

- [x] **Step 4: 回写 Batch 12 实际完成结果**

要求：
- 更新 `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- 把 Batch 12 从 `planning` 改成 `implemented`
- 只写真实完成的残余 owner 与 artifact cleanup 结果
