# Visible Residue Clean Sweep Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 一口气清掉当前仓库仍然停在可见层的旧 residue，包括 core 旧 orchestration 装配槽位、legacy root shell、过宽的 `repo-internal` 通道、React `useModuleList` 公开残留，以及与这些事实不一致的 live SSoT / README / 总提案口径。

**Architecture:** 这批只打“看得见”的残留，不顺手重做更深的 runtime 核心算法。执行顺序固定为：先把 Batch 10 planning 状态写进总提案，再把 core / react 的可见 residue 边界改成红灯，随后收口 `Program` 公开装配面、删除仍挂在 `src/*.ts` 根层的旧 shell、把 `repo-internal/*` 从 wildcard 收成显式 allowlist，最后统一回写 live SSoT、README、examples 与总提案。简单迁移不补新测试文件，断言优先折回现有 boundary / witness / focused tests 与 typecheck。

**Tech Stack:** TypeScript, pnpm, Vitest, package exports, Markdown docs, Effect V4

---

## File Map

### Planning and authority

- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- Modify: `docs/ssot/runtime/{02-hot-path-direction,09-verification-control-plane,10-react-host-projection-boundary,11-toolkit-layer}.md`
- Modify: `docs/ssot/platform/01-layered-map.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `packages/logix-react/README.md`

### Core visible residue

- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/{Program,Module,index}.ts`
- Delete or internalize: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel,Workflow,Process,Flow,Link}.ts`
- Modify: `packages/logix-core/src/internal/{debug-api,evidence-api,reflection-api,kernel-api}.ts`
- Modify: `packages/logix-core/src/internal/repoBridge/{runtime,read,field,effect-op}.ts`
- Modify: `packages/logix-core/src/internal/{workflow/model,reflection/**,verification/**,debug/**,observability/**}.ts`

### Core boundary and witness

- Modify: `packages/logix-core/test/PublicSurface/{Core.RootExportsBoundary,Core.InternalContractsBoundary}.test.ts`
- Modify: `packages/logix-core/test/Contracts/{CoreRootBarrel.allowlist,KernelReflectionSurface,KernelReflectionInternalEdges,VerificationControlPlaneContract}.test.ts`
- Modify: focused witness under `packages/logix-core/test/{Debug,Reflection,observability,Contracts}/**`

### React visible residue

- Modify: `packages/logix-react/src/{Hooks,index}.ts`
- Delete: `packages/logix-react/src/internal/hooks/useModuleList.ts`
- Modify: `packages/logix-react/test/PublicSurface/publicReachability.test.ts`
- Modify: `packages/logix-react/test/Hooks/{useModule.keep-surface-contract,hooks,useDispatch}.test.tsx`

### Repo consumers and user-facing samples

- Modify: `packages/logix-react/src/internal/{hooks,provider,store}/**`
- Modify: `packages/logix-query/src/{Engine,Query}.ts`
- Modify: `packages/logix-query/src/internal/{logics,middleware,query-declarations}.ts`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**,internal/form/**}`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`
- Modify: `packages/logix-test/src/{Act.ts,internal/api/TestProgram.ts}`
- Modify: `packages/logix-sandbox/src/Client.ts`
- Modify: `examples/logix/src/{patterns,scenarios}/**`
- Modify: `examples/logix-react/src/{demos,modules}/**`
- Modify: `examples/logix-sandbox-mvp/src/{RuntimeProvider,ir/**,components/**,features/**,hooks/**,pages/**}.tsx`
- Modify: `packages/speckit-kit/ui/src/app/App.tsx`

### Guardrails for this batch

- 只消费当前已经能从 live SSoT、已冻结 proposal 和实际 exports 直接推出的 visible residue，不在实施过程中临时发明新的 public noun。
- 不新增 migration-only 测试文件；只改现有 public boundary、长期 witness、focused tests 与 typecheck 门禁。
- 退出历史舞台的 noun，不得只从 package exports 消失；它也必须从 active docs、README、canonical examples、根层 source shell 和总提案进展里一起消失。
- `repo-internal` 只允许保留显式 allowlist；不得继续用 wildcard 承接“以后再说”的大口子。
- 这批不处理 `control-program.surface.json` 一类更深层 control-plane 工件命名，也不重开 `useRuntime / shallow` 的最终 semantic fate；若执行中发现它们必须一起裁掉，停止并回到冻结流程。

## Chunk 1: Batch Frame

### Task 1: 把 Batch 10 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 新增 Batch 10 条目**

要求：
- 名称固定为 `Visible Residue Clean Sweep Cutover`
- `status=planning`
- 范围明确写：
  - 消费 `K1` 的可见 orchestration residue
  - 收口 legacy root shell 与 `repo-internal` wildcard
  - 消费 `R3` 中已明确的 `useModuleList` 公开残留
  - 回写 live SSoT / README / examples / 总提案

- [x] **Step 2: 更新“当前最可能的下一批”**

要求：
- 改成这批为主
- 保留“更深的 internal runtime 清理还在后面”这层说明

- [x] **Step 3: 跑最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Visible Residue

### Task 2: 先把 core visible residue 边界改成红灯

**Files:**
- Modify: `packages/logix-core/test/PublicSurface/{Core.RootExportsBoundary,Core.InternalContractsBoundary}.test.ts`
- Modify: `packages/logix-core/test/Contracts/{CoreRootBarrel.allowlist,KernelReflectionSurface,KernelReflectionInternalEdges}.test.ts`

- [x] **Step 1: 收紧 root / package exports 断言**

要求：
- root barrel 不再承认：
  - `Workflow`
  - `Process`
  - `Flow`
  - `Link`
  - `Debug`
  - `Observability`
  - `Reflection`
  - `Kernel`
- `package.json` 的 workspace `exports` 不再允许：
  - `./repo-internal/*`
- `repo-internal` 只允许显式 survivor：
  - `./repo-internal/InternalContracts`
  - `./repo-internal/debug-api`
  - `./repo-internal/evidence-api`
  - `./repo-internal/reflection-api`
  - `./repo-internal/kernel-api`
  - `./repo-internal/effect-op`

- [x] **Step 2: 收紧 legacy shell owner 断言**

要求：
- `KernelReflectionSurface` / `KernelReflectionInternalEdges` 不再把 `src/{Reflection,Kernel,Observability,Debug}.ts` 当作长期 owner
- `CoreRootBarrel.allowlist` 保持只承认当前 canonical survivor

- [x] **Step 3: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/PublicSurface/Core.RootExportsBoundary.test.ts \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts \
  test/Contracts/CoreRootBarrel.allowlist.test.ts \
  test/Contracts/KernelReflectionSurface.test.ts \
  test/Contracts/KernelReflectionInternalEdges.test.ts
```

Expected:
- 至少一项失败
- 失败原因直接指向 visible residue 仍挂在 root shell 或 `repo-internal/*` wildcard

### Task 3: 收口 core 可见 residue

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/{Program,Module,index}.ts`
- Delete or internalize: `packages/logix-core/src/{Debug,Observability,Reflection,Kernel,Workflow,Process,Flow,Link}.ts`
- Modify: `packages/logix-core/src/internal/{debug-api,evidence-api,reflection-api,kernel-api}.ts`
- Modify: `packages/logix-core/src/internal/repoBridge/{runtime,read,field,effect-op}.ts`
- Modify: `packages/logix-core/src/internal/{workflow/model,reflection/**,verification/**,debug/**,observability/**}.ts`

- [x] **Step 1: 收紧 `Program.make` 的公开装配面**

要求：
- `packages/logix-core/src/Program.ts` 的公开 `Config` 删除：
  - `processes`
  - `workflows`
- `Program.make(...)` 不再直接挂接 `WorkflowRuntime.mountAll(...)`
- 若 runtime 仍需要 orchestration 内部入口，只能通过 internal-only assembly path 继续存在

- [x] **Step 2: 删掉根层 legacy shell**

要求：
- 删除或 internalize：
  - `Debug.ts`
  - `Observability.ts`
  - `Reflection.ts`
  - `Kernel.ts`
  - `Workflow.ts`
  - `Process.ts`
  - `Flow.ts`
  - `Link.ts`
- repo 内仍需能力的地方，改到更小的 internal owner 或 repo bridge
- 根层 `src/*.ts` 不再承接这些已退场 noun

- [x] **Step 3: 把 `repo-internal` 从 wildcard 收成显式 allowlist**

要求：
- `packages/logix-core/package.json` workspace `exports` 改成显式条目
- `publishConfig.exports` 继续全部 `null`
- 不继续给 `repo-internal` 暴露“任意内部文件都能 import”的通道

- [x] **Step 4: 跑 core focused verification**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/PublicSurface/Core.RootExportsBoundary.test.ts \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts \
  test/Contracts/CoreRootBarrel.allowlist.test.ts \
  test/Contracts/KernelReflectionSurface.test.ts \
  test/Contracts/KernelReflectionInternalEdges.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts
pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:
PASS

## Chunk 3: React Visible Residue

### Task 4: 先把 React `useModuleList` 公开残留改成红灯

**Files:**
- Modify: `packages/logix-react/test/PublicSurface/publicReachability.test.ts`
- Modify: `packages/logix-react/test/Hooks/{useModule.keep-surface-contract,hooks,useDispatch}.test.tsx`

- [x] **Step 1: 收紧 `Hooks` public slice**

要求：
- `Hooks` public slice 不再承认 `useModuleList`
- `publicReachability` 继续只保留 `.`、`./RuntimeProvider`、`./Hooks`、`./FormProjection`
- `useDispatch` 继续保留在当前 canonical host route 里，等待 live SSoT 补齐

- [x] **Step 2: 先跑红灯**

Run:
```bash
pnpm -C packages/logix-react exec vitest run \
  test/PublicSurface/publicReachability.test.ts \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/hooks.test.tsx \
  test/Hooks/useDispatch.test.tsx
```

Expected:
- 至少一项失败
- 失败原因指向 `Hooks.ts` 仍把 `useModuleList` 当 public route 暴露

### Task 5: 收口 React 可见 residue

**Files:**
- Modify: `packages/logix-react/src/{Hooks,index}.ts`
- Delete: `packages/logix-react/src/internal/hooks/useModuleList.ts`
- Modify: `packages/logix-react/README.md`
- Modify: `packages/logix-react/test/PublicSurface/publicReachability.test.ts`
- Modify: `packages/logix-react/test/Hooks/{useModule.keep-surface-contract,hooks,useDispatch}.test.tsx`

- [x] **Step 1: 从 public Hooks 删除 `useModuleList`**

要求：
- `packages/logix-react/src/Hooks.ts` 删除 `useModuleList` re-export
- 若 `useModuleList.ts` 已无活跃 consumer，直接删除文件
- 不引入替代 public helper

- [x] **Step 2: 清理 README 与 examples 的显式 residue 教法**

要求：
- `packages/logix-react/README.md` 改到当前 host exact contract
- README 不再暗示存在列表级 helper family
- 若 examples 或 tests 只为了覆盖 `useModuleList` 的历史教法存在，直接删掉或并回更稳定写法

- [x] **Step 3: 跑 React focused verification**

Run:
```bash
pnpm -C packages/logix-react exec vitest run \
  test/PublicSurface/publicReachability.test.ts \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/hooks.test.tsx \
  test/Hooks/useDispatch.test.tsx
pnpm -C packages/logix-react exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

## Chunk 4: Repo Consumer Fallout

### Task 6: 迁移 repo consumers 到显式 owner

**Files:**
- Modify: `packages/logix-react/src/internal/{hooks,provider,store}/**`
- Modify: `packages/logix-query/src/{Engine,Query}.ts`
- Modify: `packages/logix-query/src/internal/{logics,middleware,query-declarations}.ts`
- Modify: `packages/logix-form/src/{Rule.ts,internal/dsl/**,internal/form/**}`
- Modify: `packages/logix-devtools-react/src/internal/**/*.tsx`
- Modify: `packages/logix-devtools-react/test/internal/**/*.test.tsx`
- Modify: `packages/logix-test/src/{Act.ts,internal/api/TestProgram.ts}`
- Modify: `packages/logix-sandbox/src/Client.ts`
- Modify: `examples/logix/src/{patterns,scenarios}/**`
- Modify: `examples/logix-react/src/{demos,modules}/**`
- Modify: `examples/logix-sandbox-mvp/src/{RuntimeProvider,ir/**,components/**,features/**,hooks/**,pages/**}.tsx`
- Modify: `packages/speckit-kit/ui/src/app/App.tsx`

- [x] **Step 1: 迁移 `repo-internal` imports 到显式条目**

要求：
- 所有 `@logixjs/core/repo-internal/*` import 只允许命中新的显式 allowlist
- 若某处仍依赖过宽 surface，优先改到更小 bridge
- 不新增新的 wildcard 风格 bridge

- [x] **Step 2: 清掉对已删除根层 shell 的引用**

要求：
- repo 内部实现、长期 witness、examples、sandbox 页面不再依赖已删除的根层旧公开壳层
- 若 consumer 只是 demo 展示旧 noun，直接删掉展示
- 若 consumer 真需要内部能力，改到 repo bridge 或 internal owner

- [x] **Step 3: 跑 focused package verification**

Run:
```bash
pnpm -C packages/logix-query exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-form exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-test exec tsc -p tsconfig.test.json --noEmit
pnpm -C packages/logix-devtools-react exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-sandbox exec tsc -p tsconfig.json --noEmit
pnpm -C examples/logix-react typecheck
```

Expected:
PASS

## Chunk 5: Live SSoT Precision

### Task 7: 把 live SSoT / standards / README 改到当前事实

**Files:**
- Modify: `docs/ssot/runtime/{02-hot-path-direction,09-verification-control-plane,10-react-host-projection-boundary,11-toolkit-layer}.md`
- Modify: `docs/ssot/platform/01-layered-map.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `packages/logix-react/README.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 精修 verification control plane 口径**

要求：
- `runtime/09` 不再把 `Reflection.verify*` 写成当前 public facade 路由
- 去掉 `public facade` 这类落后于当前事实的表述
- 改成：
  - public shared protocol 只有 `ControlPlane`
  - expert / repo-only route 停在 internal owner 或 repo bridge

- [x] **Step 2: 精修 hot-path / layered-map owner**

要求：
- `runtime/02` 与 `platform/01` 不再把 `src/{Observability,Reflection}.ts` 当 runtime control plane 主 owner
- 改到 `ControlPlane.ts` 与 `src/internal/{verification,reflection,debug,observability}/**` 的当前 owner 结构

- [x] **Step 3: 精修 React host exact contract**

要求：
- `runtime/10` 明确写出当前 canonical host route中的 `useDispatch`
- `useModuleList` 明确退出 public contract
- `runtime/11` 若提到 React residue reopen 条件，补一条：`useModuleList` 不属于 toolkit reopen 候选

- [x] **Step 4: 精修 `repo-internal` 规则**

要求：
- `guardrails` 补齐：
  - `repo-internal` 是仓内多包通道
  - 不是 public 候选池
  - 默认命运是继续收窄、继续下沉、继续删除
  - workspace `exports` 只能走显式 allowlist

- [x] **Step 5: 跑文档门禁**

Run:
```bash
git diff --check -- \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/ssot/runtime/02-hot-path-direction.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/ssot/runtime/11-toolkit-layer.md \
  docs/ssot/platform/01-layered-map.md \
  docs/standards/logix-api-next-guardrails.md \
  packages/logix-react/README.md
```

Expected:
`无输出`

## Chunk 6: Completion Gate

### Task 8: 统一跑收尾验证

**Files:**
- Verify only

- [x] **Step 1: 跑整批 focused tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run \
  test/PublicSurface/Core.RootExportsBoundary.test.ts \
  test/PublicSurface/Core.InternalContractsBoundary.test.ts \
  test/Contracts/CoreRootBarrel.allowlist.test.ts \
  test/Contracts/KernelReflectionSurface.test.ts \
  test/Contracts/KernelReflectionInternalEdges.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts
pnpm -C packages/logix-react exec vitest run \
  test/PublicSurface/publicReachability.test.ts \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/hooks.test.tsx \
  test/Hooks/useDispatch.test.tsx
```

Expected:
PASS

- [x] **Step 2: 跑整批 typecheck**

Run:
```bash
pnpm typecheck
```

Expected:
PASS

- [x] **Step 3: 人工搜索 visible residue**

Run:
```bash
rg -n "workflow|processes|useModuleList|repo-internal/\\*|Reflection\\.verify|public facade" \
  docs/ssot docs/standards docs/proposals packages/logix-core/src packages/logix-react/src packages/logix-react/README.md \
  --glob '!docs/archive/**' --glob '!packages/logix-sandbox/public/**'
```

Expected:
- 只剩明确允许的 internal / proposal / historical context
- 不再有 active public contract、README 或 live SSoT 把这些 residue 当当前 surface 教

- [x] **Step 4: 记录 Batch 10 实际完成结果**

要求：
- 回写 `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- 把 Batch 10 从 `planning` 改成 `implemented`
- 只写真实完成的结果，不预写后续更深层 internal runtime 清理
