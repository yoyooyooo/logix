# C2A3 Runtime Adjunct Escape Hatch Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `C2A3` 结论真正消费到 `@logixjs/core`，让 `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` 全部退出 public core，并把 repo 内依赖这组旧 adjunct escape hatch 的实现、examples、docs 与长期 witness 收口到当前 owner。

**Architecture:** 这一批只消费 `C2A3 Public-Zero Runtime Adjunct Contract`，不混 `C2A2 / C2B`。执行顺序固定为：先把 Batch 8 planning 状态写进总提案，再把 core root/subpath witness 改成红灯，随后切掉 `@logixjs/core` 的公开 reach，之后通过 package-local bridge 把 repo 内调用点统一收口，最后做 apps/docs 与 live SSoT 回写。纯迁移步骤不新增 migration-only 测试文件，优先复用现有长期 witness、focused tests 与 typecheck。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, package exports, Markdown docs

**Batch Scope:** 只消费 [core-runtime-adjunct-escape-hatch-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/core-runtime-adjunct-escape-hatch-contract.md) 的冻结结果。本批不重开 `C2A2 / C2B`，不自动执行 `git add / git commit / git push`，也不为简单迁移强行补 TDD。

---

## File Map

### Core public reach

- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify or delete: `packages/logix-core/src/{MatchBuilder,ScopeRegistry,Root,Env,Platform,Middleware,EffectOp}.ts`
- Create: `packages/logix-core/src/internal/scope-registry.ts`
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`

### Core witness and owner tests

- Modify: `packages/logix-core/test/PublicSurface/{Core.RootExportsBoundary,Core.InternalContractsBoundary}.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/test/{ScopeRegistry.test.ts,PlatformSignals.test.ts,PlatformSignals.NoHandler.test.ts}`
- Modify: `packages/logix-core/test/Middleware/{Middleware.DebugLogger,Middleware.DebugObserver}.test.ts`
- Modify: `packages/logix-core/test/EffectOp/EffectOp.Core.test.ts`
- Modify: `packages/logix-core/test/Runtime/HierarchicalInjector/{hierarchicalInjector.root-provider,hierarchicalInjector.root-resolve.override}.test.ts`

### Repo-internal bridge choke points

- Create: `packages/logix-test/src/internal/hostScheduler.ts`
- Create: `packages/logix-react/src/internal/coreBridge.ts`
- Create: `packages/logix-query/src/internal/coreBridge.ts`
- Create: `packages/logix-form/src/internal/coreBridge.ts`
- Create: `examples/logix/src/internal/coreBridge.ts`
- Create: `examples/logix-react/src/internal/coreBridge.ts`
- Create: `examples/logix-sandbox-mvp/src/internal/coreBridge.ts`

### Internal package fallout

- Modify: `packages/logix-test/src/{Act.ts,TestProgram.ts}`
- Modify: `packages/logix-react/src/internal/{provider/env.ts,provider/RuntimeProvider.tsx,store/RuntimeExternalStore.ts,store/resolveImportedModuleRef.ts}`
- Modify: `packages/logix-query/src/{Engine.ts,internal/middleware/middleware.ts,internal/query-declarations.ts,internal/logics/invalidate.ts}`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**/*.ts,internal/form/**/*.ts}`
- Modify: `packages/logix-devtools-react/src/internal/ui/{graph/FieldGraphView.tsx,shell/DevtoolsShell.tsx}`
- Modify: `packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`
- Modify: `packages/logix-react/test/{Hooks/useRootResolve.test.tsx,Hooks/**/*.test.tsx,integration/**/*.test.tsx,browser/perf-boundaries/**/*.test.tsx,internal/**/*.test.tsx,RuntimeProvider/**/*.test.tsx}`
- Modify: `packages/logix-query/test/**/*.test.ts`

### Examples and docs fallout

- Modify or delete: `examples/logix/src/scenarios/{custom-runtime-platform,i18n-async-ready,i18n-message-token,middleware-effectop-basic,middleware-resource-query,middleware-runtime-effectop,trial-run-evidence}.ts`
- Modify: `examples/logix/src/scenarios/ir/reflectStaticIr.ts`
- Modify or delete: `examples/logix-react/src/demos/{DiShowcaseLayout,MiddlewareDemoLayout,PerfTuningLabLayout,TrialRunEvidenceDemo}.tsx`
- Modify: `examples/logix-react/src/modules/{counter-with-profile,field-form,complex-field-form,fields-setup-declare,querySearchDemo}.ts`
- Modify: `examples/logix-sandbox-mvp/src/ir/{IrPage.tsx,IrPresets.ts}`
- Modify: `apps/docs/content/docs/guide/learn/{cross-module-communication,cross-module-communication.cn}.md`
- Modify: `apps/docs/content/docs/guide/advanced/{composability.mdx,composability.cn.mdx,debugging-and-devtools.md,debugging-and-devtools.cn.md}`
- Modify: `docs/ssot/runtime/{01-public-api-spine,07-standardized-scenario-patterns,11-toolkit-layer,12-toolkit-candidate-intake}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Guardrails for this batch

- 先统一调用点，再切 root/subpath，避免 blind delete 造成大面积不确定 fallout。
- `InternalContracts` 的 repo fallout 必须通过 package-local bridge 收口；禁止继续把整个 namespace 机械搬到别的新 public 入口。
- 如果某个 bridge 最终无法回到现有 canonical surface，只允许向 `Module / Program / Runtime / Debug / ControlPlane` 增加最小 focused capability；禁止新开第二个 adjunct family。
- 对简单迁移不补新测试文件；只改现有长期 witness 或 focused verification 命令。

## Chunk 1: Batch Frame

### Task 1: 把 Batch 8 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 核对 Batch 8 条目**

要求：
- 名称固定为 `C2A3 Runtime Adjunct Escape Hatch Cutover`
- `status=planning`
- 范围明确写：
  - 消费已冻结的 `C2A3`
  - 收口 `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp`
  - 迁移 repo 内依赖旧 adjunct escape hatch public surface 的 packages / examples / docs

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Reach

### Task 2: 先把 core adjunct witness 改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`

- [ ] **Step 1: 改 root/public boundary witness**

要求：
- root 不再承认：
  - `MatchBuilder`
  - `ScopeRegistry`
  - `Root`
  - `Env`
  - `Platform`
  - `Middleware`
  - `InternalContracts`
  - `EffectOp`
- package exports / publishConfig.exports 不再承认：
  - `./MatchBuilder`
  - `./Root`
  - `./Env`
  - `./Platform`
  - `./Middleware`
  - `./EffectOp`

- [ ] **Step 2: 更新 root barrel allowlist**

要求：
- `CoreRootBarrel.allowlist` 删除上述 root survivor
- `Core.InternalContractsBoundary` 不再假定 root 上仍存在 `InternalContracts`

- [ ] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/PublicSurface/Core.InternalContractsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:
- 至少一项失败
- 失败原因指向 root barrel 或 package exports 仍泄漏旧 adjunct shell

### Task 3: 切掉 `@logixjs/core` 的 adjunct public reach

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify or delete: `packages/logix-core/src/{MatchBuilder,ScopeRegistry,Root,Env,Platform,Middleware,EffectOp}.ts`
- Create: `packages/logix-core/src/internal/scope-registry.ts`

- [ ] **Step 1: 收口 package exports**

要求：
- `package.json` 与 `publishConfig.exports` 删除：
  - `./MatchBuilder`
  - `./Root`
  - `./Env`
  - `./Platform`
  - `./Middleware`
  - `./EffectOp`
- 不为这 6 项新开替代公开 subpath

- [ ] **Step 2: 收口 root barrel**

要求：
- `src/index.ts` 删除：
  - `export * as MatchBuilder`
  - `export * as ScopeRegistry`
  - `export * as Root`
  - `export * as Env`
  - `export * as Platform`
  - `export * as Middleware`
  - `export * as InternalContracts`
  - `export * as EffectOp`
- 根注释与 public contract 文字同步切到当前 survivor set

- [ ] **Step 3: 处理 root facade 文件**

要求：
- `MatchBuilder / Root / Env / Platform / Middleware / EffectOp` 如果只是 public facade，就直接删除 root facade 文件
- `ScopeRegistry.ts` 当前承载实际实现，先移动到 `src/internal/scope-registry.ts`，再删除 root file
- 删除后，core 内部测试统一改到 internal owner 或新的 focused owner

- [ ] **Step 4: 跑 core reach verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/PublicSurface/Core.InternalContractsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: Bridge Normalization

### Task 4: 先把 repo 调用点收口到 package-local bridge

**Files:**
- Create: `packages/logix-test/src/internal/hostScheduler.ts`
- Create: `packages/logix-react/src/internal/coreBridge.ts`
- Create: `packages/logix-query/src/internal/coreBridge.ts`
- Create: `packages/logix-form/src/internal/coreBridge.ts`
- Create: `examples/logix/src/internal/coreBridge.ts`
- Create: `examples/logix-react/src/internal/coreBridge.ts`
- Create: `examples/logix-sandbox-mvp/src/internal/coreBridge.ts`
- Modify: `packages/logix-test/src/{Act.ts,TestProgram.ts}`
- Modify: `packages/logix-react/src/internal/{provider/env.ts,provider/RuntimeProvider.tsx,store/RuntimeExternalStore.ts,store/resolveImportedModuleRef.ts}`
- Modify: `packages/logix-query/src/{Engine.ts,internal/middleware/middleware.ts,internal/query-declarations.ts,internal/logics/invalidate.ts}`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**/*.ts,internal/form/**/*.ts}`
- Modify: `examples/logix/src/{patterns/field-reuse.ts,scenarios/external-store-tick.ts,scenarios/ir/reflectStaticIr.ts}`
- Modify: `examples/logix-react/src/{modules/**/*.ts,demos/**/*.tsx}`
- Modify: `examples/logix-sandbox-mvp/src/ir/{IrPage.tsx,IrPresets.ts}`

- [ ] **Step 1: 建 package-local bridge**

要求：
- 每个 bridge 只暴露当前 package 真正需要的最小 capability
- 禁止继续转发整个 `Logix.InternalContracts` namespace
- 先允许 bridge 暂时代理旧 public 调用，目标是把调用点集中到单文件

- [ ] **Step 2: 迁移调用点到 bridge**

要求：
- `packages/logix-test` 只通过本地 `hostScheduler` helper 访问测试调度能力
- `packages/logix-react` 只通过本地 `coreBridge` 访问 runtime-store / imports-scope / env helper
- `packages/logix-query` 只通过本地 bridge 访问 `EffectOp` 类型、middleware 契约和任何临时 resource helper
- `packages/logix-form` 只通过本地 bridge 访问 field-kernel / txn / validation 辅助
- examples 与 sandbox ir 页面不再直接出现 `Logix.InternalContracts`

- [ ] **Step 3: 跑归一化阶段 verification**

Run:
```bash
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
pnpm -C examples/logix-sandbox-mvp typecheck
```

Expected:
PASS

### Task 5: 把 bridge 实现改到最终 owner

**Files:**
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`
- Modify: `packages/logix-test/src/internal/hostScheduler.ts`
- Modify: `packages/logix-react/src/internal/coreBridge.ts`
- Modify: `packages/logix-query/src/internal/coreBridge.ts`
- Modify: `packages/logix-form/src/internal/coreBridge.ts`

- [ ] **Step 1: 列 capability matrix**

要求：
- 把当前 bridge 依赖分成 4 组并逐组落 owner：
  - host/test scheduler
  - runtime store / imports scope / txn instrumentation
  - field-kernel declaration / install / validate / patch helpers
  - temporary read/resource helpers from `C2A2`
- 每组都必须写清：
  - 最终 owner file
  - 是否走本地重写
  - 是否需要补最小 focused capability 到 `Module / Runtime / Debug / ControlPlane`

- [ ] **Step 2: 先清容易项**

要求：
- `Env`：react provider 的 env helper 改成本地实现，不再依赖 `@logixjs/core/Env`
- `Root.resolve`：repo 内 callsite 改成 `runtime.runSync(Effect.service(Tag).pipe(Effect.orDie))` 或直接删除 expert 场景
- `EffectOp / Middleware`：query/example/docs 不再依赖 `@logixjs/core/EffectOp` / `@logixjs/core/Middleware` shell
- `ScopeRegistry / MatchBuilder / Platform`：若只剩测试与样例，优先删 caller，不保留桥接

- [ ] **Step 3: 再清重项**

要求：
- `InternalContracts` 中仍被 form/react/query/test 需要的能力，只允许两种去向：
  - 回到现有 canonical owner
  - 下沉到 package-local bridge 的本地实现
- 若某能力两者都做不到，暂停该 capability cluster，单独记在计划执行记录里，不把整个 namespace 继续保回 root

- [ ] **Step 4: 收口 internal owner file**

要求：
- `packages/logix-core/src/internal/InternalContracts.ts` 最终不再被 root barrel 暴露
- 若该文件已无必要，直接删除
- 若仍作为 core internal aggregator 存在，只允许 core 自身 internal 使用

- [ ] **Step 5: 跑 bridge-final verification**

Run:
```bash
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
```

Expected:
PASS

## Chunk 4: Witness and Consumer Fallout

### Task 6: 清理长期 witness、tests 与 examples

**Files:**
- Modify: `packages/logix-core/test/{ScopeRegistry.test.ts,PlatformSignals.test.ts,PlatformSignals.NoHandler.test.ts}`
- Modify: `packages/logix-core/test/Middleware/{Middleware.DebugLogger,Middleware.DebugObserver}.test.ts`
- Modify: `packages/logix-core/test/EffectOp/EffectOp.Core.test.ts`
- Modify or delete: `packages/logix-react/test/Hooks/useRootResolve.test.tsx`
- Modify: `packages/i18n/test/I18n/I18n.ServiceIsolation.test.ts`
- Modify: `packages/logix-query/test/Engine.combinations.test.ts`
- Modify: `examples/logix/src/scenarios/{custom-runtime-platform,i18n-async-ready,i18n-message-token,middleware-effectop-basic,middleware-resource-query,middleware-runtime-effectop,trial-run-evidence}.ts`
- Modify or delete: `examples/logix-react/src/demos/{DiShowcaseLayout,MiddlewareDemoLayout,PerfTuningLabLayout,TrialRunEvidenceDemo}.tsx`

- [ ] **Step 1: 清掉 direct public-shell witnesses**

要求：
- `ScopeRegistry / Platform / Middleware / EffectOp` 的 core tests 改成 internal owner witness
- `useRootResolve` 相关 react witness 删除或改写成当前 canonical host semantics
- i18n 的 fixed-root singleton witness 改成 runtime-scope service lookup witness

- [ ] **Step 2: 清掉 dogfood examples 里的旧 expert route**

要求：
- `custom-runtime-platform` 若只服务旧 public Platform，直接删除
- `middleware-effectop-basic / middleware-runtime-effectop / middleware-resource-query` 不再作为用户可学的 expert route 场景
- `DiShowcaseLayout`、`i18n-*` 脚本里的 `Root.resolve(...)` 不再保留
- `TrialRunEvidenceDemo`、`PerfTuningLabLayout`、field-kernel 展示类样例不再直接教学 `Logix.InternalContracts`

- [ ] **Step 3: 跑 focused witness verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/ScopeRegistry.test.ts test/PlatformSignals.test.ts test/PlatformSignals.NoHandler.test.ts test/Middleware/Middleware.DebugLogger.test.ts test/Middleware/Middleware.DebugObserver.test.ts test/EffectOp/EffectOp.Core.test.ts
pnpm -C packages/logix-react exec vitest run test/Hooks/useRootResolve.test.tsx test/integration/runtimeProviderTickServices.regression.test.tsx
pnpm -C packages/i18n exec vitest run test/I18n/I18n.ServiceIsolation.test.ts
pnpm -C packages/logix-query exec vitest run test/Engine.combinations.test.ts
```

Expected:
PASS

## Chunk 5: Docs and Authority

### Task 7: 回写用户文档、live SSoT 与总提案

**Files:**
- Modify: `apps/docs/content/docs/guide/learn/{cross-module-communication,cross-module-communication.cn}.md`
- Modify: `apps/docs/content/docs/guide/advanced/{composability.mdx,composability.cn.mdx,debugging-and-devtools.md,debugging-and-devtools.cn.md}`
- Modify: `docs/ssot/runtime/{01-public-api-spine,07-standardized-scenario-patterns,11-toolkit-layer,12-toolkit-candidate-intake}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 清理用户 docs**

要求：
- 不再把 `Root.resolve(...)` 教成当前可学路线
- 不再把 `@logixjs/core/Middleware` / `@logixjs/core/EffectOp` 教成当前 expert surface
- 若仍需保留背景说明，改成“历史/内部背景”，不保留当前 API 页面语气

- [ ] **Step 2: 回写 live SSoT**

要求：
- `runtime/01` 删除这组 adjunct shell 的 root 叙述
- `runtime/07` 和 `runtime/12` 去掉 `Root.resolve(...)` 作为当前场景锚点
- `runtime/11` 与 `guardrails` 明确：未来若真需要 DX 入口，只能走 toolkit reopen，不回流旧 adjunct family

- [ ] **Step 3: 回写总提案**

要求：
- 新增 `Batch 8`
- `C2A3` 状态改成 `implemented`
- `C2A3` 从“已冻结但未完全落实”移出
- `@logixjs/core` 对应 manifest 行改成当前真实 disposition
- “已实施”部分补上本批实际完成项

- [ ] **Step 4: 运行 docs diff 检查**

Run:
```bash
git diff --check -- apps/docs/content/docs/guide/learn/cross-module-communication.md apps/docs/content/docs/guide/learn/cross-module-communication.cn.md apps/docs/content/docs/guide/advanced/composability.mdx apps/docs/content/docs/guide/advanced/composability.cn.mdx apps/docs/content/docs/guide/advanced/debugging-and-devtools.md apps/docs/content/docs/guide/advanced/debugging-and-devtools.cn.md docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/11-toolkit-layer.md docs/ssot/runtime/12-toolkit-candidate-intake.md docs/standards/logix-api-next-guardrails.md docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 6: Final Verification

### Task 8: 做 `C2A3` 批次收口

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑全批 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/PublicSurface/Core.RootExportsBoundary.test.ts test/PublicSurface/Core.InternalContractsBoundary.test.ts test/Contracts/CoreRootBarrel.allowlist.test.ts test/ScopeRegistry.test.ts test/PlatformSignals.test.ts test/PlatformSignals.NoHandler.test.ts test/Middleware/Middleware.DebugLogger.test.ts test/Middleware/Middleware.DebugObserver.test.ts test/EffectOp/EffectOp.Core.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/i18n exec tsc -p tsconfig.json --noEmit
pnpm -C examples/logix typecheck
pnpm -C examples/logix-react typecheck
pnpm -C examples/logix-sandbox-mvp typecheck
pnpm typecheck
```

Expected:
- 全部 PASS

- [ ] **Step 2: 跑残留搜索**

Run:
```bash
rg -n "Logix\\.(MatchBuilder|ScopeRegistry|Root|Env|Platform|Middleware|InternalContracts|EffectOp)\\b|@logixjs/core/(MatchBuilder|ScopeRegistry|Root|Env|Platform|Middleware|InternalContracts|EffectOp)" packages apps examples docs --glob '!docs/archive/**' --glob '!packages/logix-sandbox/public/**'
```

Expected:
- 只允许命中：
  - core internal string id
  - 当前批次实施计划
  - archive 冻结文档之外的 0 个活跃 consumer

- [ ] **Step 3: 回写总提案状态**

要求：
- `Batch 8` 状态改成 `implemented`
- “已冻结但未完全落实”只剩 `C2B`、更深的 `K1 / R3` internal cleanup，以及总 manifest 未回填项
- “当前最可能的下一批”切到 `C2B`
