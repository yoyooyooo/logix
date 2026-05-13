# Deep Internal Runtime Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把 `K1` 从“公开面已删”推进到“实现层也不再把 orchestration 当现行公开心智”，同时继续收窄 `repo-internal`，为旧 root owner 文件最终退出源码树创造条件。

**Architecture:** 这一批只打 deep internal runtime，不再混 visible residue 或 user-facing docs sweep。执行顺序固定为：先把 Batch 11 planning 状态写进总提案，再用现有 boundary / focused tests 锁定 `Program / Module / AppRuntime / ProcessRuntime / WorkflowRuntime / InternalContracts` 的残留，再把 orchestration 从公开装配链与大口子 internal 合同里继续抽离，随后收窄 React/query/form/test/devtools 对 `InternalContracts` 的依赖，最后回写 live SSoT 与总提案。简单迁移不补新测试文件，断言优先折回现有长期 witness、focused tests 与 typecheck。

**Tech Stack:** TypeScript, pnpm, Vitest, Effect V4, Markdown docs

---

## File Map

### Planning and authority

- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- Modify: `docs/ssot/runtime/{03-canonical-authoring,04-capabilities-and-runtime-control-plane,09-verification-control-plane}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

### Core internal orchestration chain

- Modify: `packages/logix-core/src/{Runtime,Module}.ts`
- Modify: `packages/logix-core/src/internal/runtime/{AppRuntime,ModuleFactory}.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/{ModuleRuntime.impl,BoundApiRuntime}.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- Modify: `packages/logix-core/src/internal/workflow/{compiler,model}.ts`
- Modify: `packages/logix-core/src/internal/reflection/controlSurface.ts`

### Repo-internal owner split

- Modify: `packages/logix-core/src/internal/InternalContracts.ts`
- Modify: `packages/logix-core/src/internal/repoBridge/{runtime,read,field,effect-op}.ts`
- Create or split further under: `packages/logix-core/src/internal/{runtime-contracts,field-contracts,read-contracts,host-contracts}/**`

### Consumer fallout

- Modify: `packages/logix-react/src/internal/{provider,store,hooks}/**`
- Modify: `packages/logix-query/src/{Engine,Query}.ts`
- Modify: `packages/logix-query/src/internal/{query-declarations,logics,middleware}/**`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**,internal/form/**}`
- Modify: `packages/logix-test/src/{Act.ts,internal/api/TestProgram.ts}`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`
- Modify: `packages/logix-sandbox/src/Client.ts`
- Modify: `examples/logix/src/{patterns,scenarios}/**`
- Modify: `examples/logix-react/src/{demos,modules}/**`
- Modify: `examples/logix-sandbox-mvp/src/{RuntimeProvider,ir/**,components/**,features/**,hooks/**,pages/**}.tsx`

### Existing witness and focused verification

- Modify: `packages/logix-core/test/Contracts/{VerificationControlPlaneContract,ProgramImports.program-entry,RuntimeHotPathPolicy}.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/{AppRuntime,Runtime.OperationSemantics}.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/ModuleRuntime/**/*.test.ts`
- Modify: `packages/logix-core/test/internal/Reflection/**/*.test.ts`
- Modify: `packages/logix-react/test/{Hooks,RuntimeProvider,integration,browser/perf-boundaries}/**`
- Modify: `packages/logix-query/test/**/*.test.ts`
- Modify: `packages/logix-form/test/**/*.test.ts`

### Guardrails for this batch

- 这批只处理 internal runtime truth，不重新开放已删除的 public noun。
- 不新增 migration-only 测试文件；只改现有长期 witness、focused tests 与 typecheck 门禁。
- `Program.make(...)` 的公开 authoring 口径不得回长 `processes / workflows`。
- `repo-internal` 默认继续缩，不允许为了省事把新的深路径重新暴露出来。
- 若某个能力仍必须保留在 internal 层，也要落到更明确的 owner 名下，不能继续挂在巨型 `InternalContracts` 总口。
- 这批不处理 `useRuntime / shallow` 的最终 semantic fate，也不处理 `control-program.surface.json` 的 artifact 命名改造。

## Chunk 1: Batch Frame

### Task 1: 把 Batch 11 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 新增 Batch 11 条目**

要求：
- 名称固定为 `Deep Internal Runtime Cutover`
- `status=planning`
- 范围明确写：
  - 深层 orchestration internal runtime 清理
  - `InternalContracts` 继续拆 owner
  - React/query/form/test/devtools 对大口子 internal 的继续迁移
  - live SSoT 回写

- [x] **Step 2: 更新“当前最可能的下一批”**

要求：
- 改成这批为主
- 说明 visible residue 已清到当前事实，剩余主战场转入 deep internal runtime

- [x] **Step 3: 跑最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Orchestration Internal Truth

### Task 2: 先把 deep orchestration 残留改成红灯

**Files:**
- Modify: `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/AppRuntime.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/Runtime.OperationSemantics.test.ts`
- Modify: `packages/logix-core/test/internal/Reflection/**/*.test.ts`

- [x] **Step 1: 收紧 authoring 与 reflection witness**

要求：
- `Program.make(...)` 的公开 contract 不再允许任何 test 把 `processes / workflows` 当 canonical assembly surface
- control-surface / reflection witness 不再把 `workflowDefs` 当公开 assembly residue 的正当来源

- [x] **Step 2: 收紧 internal runtime witness**

要求：
- `AppRuntime` / `ModuleRuntime` 的 focused tests 改成表达“若仍有 process/runtime trigger 能力，它是 internal assembly path”
- 不再保留任何把公开 `Program.make(..., { processes })` 当当前事实的长期测试

- [x] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/internal/Runtime/AppRuntime.test.ts \
  test/internal/Runtime/Runtime.OperationSemantics.test.ts \
  test/internal/Reflection/Manifest.Determinism.test.ts
```

Expected:
- 至少一项失败
- 失败原因直接指向 orchestration 仍挂在公开 authoring 或 reflection 主链上

### Task 3: 把 orchestration 从公开装配残留继续下切到 internal truth

**Files:**
- Modify: `packages/logix-core/src/{Runtime,Module}.ts`
- Modify: `packages/logix-core/src/internal/runtime/{AppRuntime,ModuleFactory}.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/{ModuleRuntime.impl,BoundApiRuntime}.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- Modify: `packages/logix-core/src/internal/workflow/{compiler,model}.ts`
- Modify: `packages/logix-core/src/internal/reflection/controlSurface.ts`

- [x] **Step 1: 抽掉 `Module / Program` 对公开 orchestration assembly 的残留记账**

要求：
- `Module.ts` 内部 state 不再继续把 `workflowDefs` 视作和 canonical program state 同级的长期对象
- `Runtime.ts` 与 `trialRunModule.ts` 不再从 root impl 上把 `processes` 当公开 authoring corollary 读取

- [x] **Step 2: 把 internal runtime 的 orchestration 入口改成 internal-only assembly path**

要求：
- `AppRuntime / ModuleFactory / ModuleRuntime.impl` 若仍需要 process install 路径，只允许读取 internal assembly contract
- `WorkflowRuntime` 若仍保留，只能服务 internal compiled artifact，不得继续影射回公开 authoring

- [x] **Step 3: 收紧 reflection/control-surface**

要求：
- `controlSurface.ts` 不再把旧 `workflowDefs` public residue 当默认 manifest attachment
- 若 workflow artifact 仍需保留，必须明确它是 internal control-plane artifact

- [x] **Step 4: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/internal/Runtime/AppRuntime.test.ts \
  test/internal/Runtime/Runtime.OperationSemantics.test.ts \
  test/internal/Reflection/Manifest.Determinism.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: InternalContracts Split

### Task 4: 先把 `InternalContracts` 大口子改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
- Modify: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- Modify: `packages/logix-react/test/{Hooks,RuntimeProvider}/**`

- [x] **Step 1: 新增 owner 粒度断言**

要求：
- 测试不再只接受“有个 `InternalContracts` 就行”
- 明确断言 React/query/form/test/devtools 使用的是更窄的 runtime / read / field / host bridge

- [x] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useDispatch.test.tsx \
  test/RuntimeProvider/runtime-debug-trace-integration.test.tsx
```

Expected:
- 至少一项失败
- 失败原因指向 consumer 仍绑定大口子 `InternalContracts`

### Task 5: 拆散 `InternalContracts` 到更小 owner

**Files:**
- Modify: `packages/logix-core/src/internal/InternalContracts.ts`
- Modify: `packages/logix-core/src/internal/repoBridge/{runtime,read,field,effect-op}.ts`
- Create or split further under: `packages/logix-core/src/internal/{runtime-contracts,field-contracts,read-contracts,host-contracts}/**`
- Modify: `packages/logix-react/src/internal/{provider,store,hooks}/**`
- Modify: `packages/logix-query/src/{Engine,Query}.ts`
- Modify: `packages/logix-query/src/internal/{query-declarations,logics,middleware}/**`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**,internal/form/**}`
- Modify: `packages/logix-test/src/{Act.ts,internal/api/TestProgram.ts}`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`
- Modify: `packages/logix-sandbox/src/Client.ts`

- [x] **Step 1: 先按能力切 owner**

要求：
- runtime store / imports scope / host scheduler 归 runtime 或 host contract owner
- rowId / field list config / transaction patch 归 field contract owner
- read protocol 归 read contract owner
- effect-op 继续停在独立小 owner

- [x] **Step 2: 迁移 consumer**

要求：
- React 的 `resolveImportedModuleRef / RuntimeExternalStore / runtimeDebugBridge` 不再直接依赖大口子 `InternalContracts`
- query/form/test/devtools/sandbox 都改到更窄 bridge

- [x] **Step 3: 跑 focused verification**

Run:
```bash
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-devtools-react exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-sandbox exec tsc -p tsconfig.json --noEmit
```

Expected:
PASS

## Chunk 4: Live SSoT Alignment

### Task 6: 把 live SSoT 改到 deep internal runtime 事实

**Files:**
- Modify: `docs/ssot/runtime/{03-canonical-authoring,04-capabilities-and-runtime-control-plane,09-verification-control-plane}.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 精修 canonical authoring**

要求：
- 明确 `Program.make(...)` 不再承担任何 orchestration slot
- 若 internal runtime 仍保留 process/workflow 能力，文档只以 internal runtime truth 叙述，不回写成公开 authoring surface

- [x] **Step 2: 精修 control-plane / guardrails**

要求：
- `runtime/04`、`runtime/09`、guardrails 都明确：
  - expert verification 继续只停在 repo-internal / internal owner
  - orchestration artifact 若存在，也属于 internal control-plane 或 internal runtime
  - `repo-internal` 继续默认收窄

- [x] **Step 3: 跑文档门禁**

Run:
```bash
git diff --check -- \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/standards/logix-api-next-guardrails.md
```

Expected:
`无输出`

## Chunk 5: Completion Gate

### Task 7: 统一跑收尾验证并回写批次状态

**Files:**
- Verify only

- [x] **Step 1: 跑 focused tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/ProgramImports.program-entry.test.ts \
  test/internal/Runtime/AppRuntime.test.ts \
  test/internal/Runtime/Runtime.OperationSemantics.test.ts \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts
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

- [x] **Step 3: 搜索剩余 deep internal residue**

Run:
```bash
rg -n "Program\\.make\\(.+processes|Program\\.make\\(.+workflows|workflowDefs|installProcess|ProcessRuntime|WorkflowRuntime" \
  packages/logix-core/src packages/logix-react/src packages/logix-query/src packages/logix-form/src docs/ssot docs/standards \
  --glob '!docs/archive/**' --glob '!packages/logix-sandbox/public/**'
```

Expected:
- 只剩明确 internal owner、明确 runtime core、明确 proposal 历史材料
- 不再有 live SSoT 或 canonical authoring 把这些对象当公开主链

- [x] **Step 4: 回写 Batch 11 实际完成结果**

要求：
- 更新 `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- 把 Batch 11 从 `planning` 改成 `implemented`
- 只写真实完成的 deep internal 收口结果
