# C2B Verification And Evidence Surface Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `C2B` 结论真正消费到 `@logixjs/core`，让 `Debug / Observability / Reflection / Kernel` 全部退出 public core，并把 repo 内依赖这组 verification / evidence shell 的实现、examples、docs 与长期 witness 收口到当前 owner，只保留 `./ControlPlane` 作为 shared protocol shell。

**Architecture:** 这一批只消费 `VerificationControlPlane` 合同，不混 `C2A*` 或 manifest backfill。执行顺序固定为：先把 Batch 9 planning 状态写进总提案，再把 core root/subpath witness 改成红灯，随后收口 `@logixjs/core` 的 exports 与 root barrel，再通过 repo-only internal owner 把 `Debug / Observability / Reflection / Kernel` 的仓内依赖迁走，最后回写 user docs、live SSoT 与总提案。迁移期不新增 migration-only 测试文件，断言优先折回现有长期 witness、focused tests 与 typecheck。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, Markdown docs

---

## File Map

### Core public reach

- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify or delete: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel}.ts`
- Create: `packages/logix-core/src/internal/repoBridge/{debug-api,evidence-api,reflection-api,kernel-api}.ts`

### Core witness and owner tests

- Modify: `packages/logix-core/test/PublicSurface/{Core.RootExportsBoundary,CoreRootBarrel.allowlist}.test.ts`
- Modify: `packages/logix-core/test/Debug/**/*.test.ts`
- Modify: `packages/logix-core/test/Reflection/**/*.test.ts`
- Modify: `packages/logix-core/test/observability/**/*.test.ts`
- Modify: `packages/logix-core/test/Contracts/Contracts.045.KernelContractVerification.test.ts`

### Repo-internal fallout

- Modify: `packages/logix-query/src/Engine.ts`
- Modify: `packages/logix-form/src/internal/form/{rules.ts,artifacts.ts,impl.ts}`
- Modify: `packages/logix-test/src/internal/api/TestProgram.ts`
- Modify: `packages/logix-react/src/internal/{hooks,useSelector.ts,provider/**/*.tsx,store/**/*.ts}`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `examples/logix-react/src/demos/{AppDemoLayout,GlobalRuntimeLayout,LocalModuleLayout,AsyncLocalModuleLayout,SessionModuleLayout,SuspenseModuleLayout,LayerOverrideDemoLayout,PerfTuningLabLayout,TrialRunEvidenceDemo}.tsx`
- Modify: `examples/logix-sandbox-mvp/src/ir/{IrLogic,IrPage,IrPresets}.tsx`

### Docs and authority

- Modify: `apps/docs/content/docs/api/core/inspection*.md`
- Modify: `apps/docs/content/docs/guide/advanced/debugging-and-devtools*.md`
- Modify: `docs/ssot/runtime/{01-public-api-spine,04-capabilities-and-runtime-control-plane,09-verification-control-plane,11-toolkit-layer}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Guardrails for this batch

- 只保留 `./ControlPlane` 这一个公开 survivor。`Debug / Observability / Reflection / Kernel` 不得换壳保回 root 或新 public subpath。
- repo-only internal owner 允许继续存在，但必须通过 `@logixjs/core/repo-internal/*` 收口，不能继续走 root `Logix.Debug` 之类的写法。
- 对简单迁移不补新测试文件；只改现有长期 witness 或 focused verification 命令。
- user docs 不得继续教学 repo-internal owner；若当前没有公开等价面，就删掉这部分教学。

## Chunk 1: Batch Frame

### Task 1: 把 Batch 9 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 核对 Batch 9 条目**

要求：
- 名称固定为 `C2B Verification And Evidence Surface Cutover`
- `status=planning`
- 范围明确写：
  - 消费已冻结的 `C2B`
  - 收口 `Debug / Observability / Reflection / Kernel`
  - 保留 `./ControlPlane`
  - 迁移 repo 内依赖旧 verification / evidence shell public surface 的 packages / examples / docs

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Reach

### Task 2: 先把 core verification/evidence witness 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`

- [ ] **Step 1: 改 root/public boundary witness**

要求：
- root 不再承认：
  - `Debug`
  - `Observability`
  - `Reflection`
  - `Kernel`
- package exports / publishConfig.exports 不再承认：
  - `./Debug`
  - `./Observability`
  - `./Kernel`
- `./ControlPlane` 继续保留

- [ ] **Step 2: 更新 root barrel allowlist**

要求：
- `CoreRootBarrel.allowlist` 删除上述 root survivor
- `ControlPlane` 继续保留在 allowlist

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root barrel 或 package exports 仍泄漏 `Debug / Observability / Reflection / Kernel`

### Task 3: 切掉 `@logixjs/core` 的 verification/evidence public reach

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify or delete: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel}.ts`
- Create: `packages/logix-core/src/internal/repoBridge/{debug-api,evidence-api,reflection-api,kernel-api}.ts`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 删除：
  - `./Debug`
  - `./Observability`
  - `./Kernel`
- `Reflection` 本来只有 root reach，继续由 root barrel 删除即可
- `./ControlPlane` 保留

- [ ] **Step 2: 收口 root barrel**

要求：
- `src/index.ts` 删除：
  - `export * as Debug`
  - `export * as Observability`
  - `export * as Reflection`
  - `export * as Kernel`
- `ControlPlane` 继续保留

- [ ] **Step 3: 建 repo-only internal owner**

要求：
- 用 repo-only internal bridge 提供仓内继续需要的最小 capability：
  - debug sink / devtools snapshot / diagnostics-level helpers
  - evidence package / artifact exporter / protocolVersion
  - reflection manifest/static-ir/export/verify helpers
  - kernel evidence / experimental layer / full cutover gate helpers
- 不继续转发整个原 root shell；每个 bridge 只暴露当前仓内真正需要的 capability

- [ ] **Step 4: 跑 core reach verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: Repo Fallout

### Task 4: 迁移仓内实现与长期 witness 到 repo-only internal owner

**Files:**
- Modify: `packages/logix-query/src/Engine.ts`
- Modify: `packages/logix-form/src/internal/form/{rules.ts,artifacts.ts,impl.ts}`
- Modify: `packages/logix-test/src/internal/api/TestProgram.ts`
- Modify: `packages/logix-react/src/internal/{hooks,provider,store}/**`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `packages/logix-core/test/{Debug,Reflection,observability,Contracts.045.KernelContractVerification}.test.ts`

- [ ] **Step 1: 迁移 types 与 minimal helpers**

要求：
- `JsonValue`、artifact exporter、protocolVersion 之类的类型与 helper 改到 repo-only internal evidence owner
- `Debug.Event / Debug.Sink / RuntimeDebugEventRef` 改到 repo-only internal debug owner
- `CoreReflection.exportStaticIr / exportControlSurface / verify*` 改到 repo-only internal reflection owner
- `Kernel.*` 改到 repo-only internal kernel owner

- [ ] **Step 2: 迁移长期 witness**

要求：
- core 自身长期 tests 不再 import root `Debug / Reflection / Observability / Kernel`
- `packages/logix-devtools-react` 与 `packages/logix-react` 的 tests 继续表达当前长期行为 witness，但改到 repo-only internal owner

- [ ] **Step 3: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Debug/Debug.test.ts test/Debug/DevtoolsHub.test.ts test/CoreReflection.extractManifest.composedModule.test.ts test/CoreReflection.exportStaticIr.basic.test.ts test/observability/Observability.TrialRun.SessionIsolation.test.ts test/Contracts/Contracts.045.KernelContractVerification.test.ts
pnpm -C packages/logix-devtools-react exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

## Chunk 4: Examples and User Docs

### Task 5: 清理 examples 与 apps/docs 里的旧 verification/evidence 教法

**Files:**
- Modify or delete: `examples/logix-react/src/demos/{AppDemoLayout,GlobalRuntimeLayout,LocalModuleLayout,AsyncLocalModuleLayout,SessionModuleLayout,SuspenseModuleLayout,LayerOverrideDemoLayout,PerfTuningLabLayout,TrialRunEvidenceDemo}.tsx`
- Modify: `examples/logix-sandbox-mvp/src/ir/{IrLogic,IrPage,IrPresets}.tsx`
- Modify: `apps/docs/content/docs/api/core/inspection*.md`
- Modify: `apps/docs/content/docs/guide/advanced/debugging-and-devtools*.md`

- [ ] **Step 1: 删用户教学里的 repo-internal verification shell**

要求：
- apps/docs 不再教学 repo-internal debug/evidence/kernel route
- `inspection*` 页面改成当前 `ControlPlane` 或 runtime canonical 口径
- `debugging-and-devtools*` 页面只保留当前 `devtools: true`、`CoreDebug.layer(...)` 是否还公开这类最终 survivor 结论；若 `Debug` 已退出，则同步删掉其教学

- [ ] **Step 2: 改 examples**

要求：
- React demos 不再把 `Logix.Debug`、`Logix.Observability`、`Logix.Reflection`、`Logix.Kernel` 当 public core surface 展示
- 若某 demo 主要依赖已退出的 public shell，直接删掉
- sandbox ir 页面若仍需要内部能力，改到 repo-only internal owner，不把它们当公共示例教给用户

- [ ] **Step 3: 跑 examples verification**

Run:
```bash
pnpm -C examples/logix-react typecheck
pnpm -C examples/logix-sandbox-mvp typecheck
```

Expected:
PASS

## Chunk 5: SSoT and Finalization

### Task 6: 回写 live SSoT 与总提案

**Files:**
- Modify: `docs/ssot/runtime/{01-public-api-spine,04-capabilities-and-runtime-control-plane,09-verification-control-plane,11-toolkit-layer}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 live SSoT**

要求：
- `runtime/01` 删除 `Debug / Observability / Reflection / Kernel` 的 public core 叙述
- `runtime/04` 与 `runtime/09` 统一强调：公开 survivor 只剩 `./ControlPlane`
- `runtime/11` 与 `guardrails` 明确：未来若需要 DX 入口，只能走 toolkit reopen，不回流 verification/evidence shell

- [ ] **Step 2: 回写总提案**

要求：
- 新增 `Batch 9`
- `C2B` 状态改成 `implemented`
- `C2B` 从“已冻结但未完全落实”移出
- `@logixjs/core` 对应 manifest 行改成当前真实 disposition

- [ ] **Step 3: 跑批次最终 verification**

Run:
```bash
pnpm -C packages/logix-core exec tsc --noEmit
pnpm typecheck
rg -n "Logix\\.(Debug|Observability|Reflection|Kernel)\\b|@logixjs/core/(Debug|Observability|Reflection|Kernel)" packages apps examples docs --glob '!docs/archive/**' --glob '!packages/logix-sandbox/public/**' --glob '!**/dist/**'
```

Expected:
- 编译 PASS
- 活跃搜索面不再出现旧 public verification/evidence shell consumer

