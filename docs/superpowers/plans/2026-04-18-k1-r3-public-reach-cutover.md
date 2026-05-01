# K1 + R3 Public Reach Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `K1 + R3` 结论真正消费到公开 exports、README、apps/docs、examples 和直接 public-surface tests 中，消除仍然能被用户直接读到或 import 到的旧 orchestration / React host residue。

**Architecture:** 这一批不做新的架构裁决，只消费已经冻结的 contract。先收公开出口和用户入口，再收 examples 与直接依赖公开面的 tests，最后做 targeted verification。所有“已退出当前舞台”的对象，从 live SSoT、README、apps/docs、examples、public exports 中整体移除，不保留墓碑口径。

**Tech Stack:** TypeScript, pnpm, Vitest, Markdown docs, package `exports`, React examples

**Batch Scope:** 只消费已冻结的 `K1 + R3` 结论，不进入新的 freeze，不扩到 `C1/C2/F1/Q1/I1/D1/T1-T4`。本批次明确排除 `apps/docs/public/api-reference/**` 这类已生成产物，它们留到后续单独生成/重建批次处理。

---

## Chunk 1: Batch Frame

### Task 1: 总提案批次状态落盘

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 核对总提案里的批次字段**

确认本批次范围写清：
- `K1 + R3 Public Reach Cutover`
- `status=planning`
- 范围只覆盖已冻结结论的消费

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: React Public Reach

### Task 2: 收掉 `@logixjs/react` 的公开 residue 出口

**Files:**
- Modify: `packages/logix-react/package.json`
- Modify: `packages/logix-react/src/index.ts`
- Delete: `packages/logix-react/src/ExpertHooks.ts`
- Delete: `packages/logix-react/src/ReactPlatform.ts`
- Delete: `packages/logix-react/src/Platform.ts`
- Delete: `packages/logix-react/src/internal/hooks/useProcesses.ts`
- Delete: `packages/logix-react/src/internal/platform/index.ts`
- Delete: `packages/logix-react/src/internal/platform/ReactPlatformLayer.ts`

- [ ] **Step 1: 先写或更新公开 reachability 断言**

文件：
`packages/logix-react/test/PublicSurface/publicReachability.test.ts`

把公开 exports 固定到：
- `.`
- `./RuntimeProvider`
- `./Hooks`
- `./FormProjection`
- `./package.json`
- `./internal/*`

- [ ] **Step 2: 跑 reachability 测试，确认当前失败**

Run:
```bash
pnpm -C packages/logix-react exec vitest run test/PublicSurface/publicReachability.test.ts
```

Expected:
失败，指出 `./ExpertHooks`、`./ReactPlatform`、`./Platform` 仍在 exports 中

- [ ] **Step 3: 修改 `package.json` 和 root barrel**

移除：
- `./ExpertHooks`
- `./ReactPlatform`
- `./Platform`

并从 root barrel 移除相应 re-export。

- [ ] **Step 4: 删除对应壳文件和内部入口**

删除上面列出的文件，确保没有残留 re-export。

- [ ] **Step 5: 重新运行 reachability 测试**

Run:
```bash
pnpm -C packages/logix-react exec vitest run test/PublicSurface/publicReachability.test.ts
```

Expected:
PASS

### Task 3: 清理直接依赖已删除 React residue 的测试

**Files:**
- Delete: `packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx`
- Delete: `packages/logix-react/test/Platform/Platform.NoTearingBoundary.test.tsx`
- Delete: `packages/logix-react/test/Platform/reactPlatformLifecycle.test.ts`
- Delete: `packages/logix-react/test/Hooks/useProcesses.test.tsx`
- Delete: `packages/logix-react/test-dts/public-subpaths.surface.ts`

- [ ] **Step 1: 删除对应测试与 dts 断言**

这些文件全部依赖已冻结删除的公开面，不做迁移式保留。

- [ ] **Step 2: 检查 `packages/logix-react/test` 下是否还有直接引用**

Run:
```bash
rg -n "ExpertHooks|useProcesses\\(|ReactPlatform\\b|ReactPlatformLayer\\b|@logixjs/react/(ExpertHooks|ReactPlatform|Platform)" packages/logix-react/test
```

Expected:
无命中

## Chunk 3: Core Public Reach

### Task 4: 收掉 `@logixjs/core` 的第一层 orchestration exports

**Files:**
- Modify: `packages/logix-core/package.json`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/test/Logix/Logix.test.ts`

- [ ] **Step 1: 更新 allowlist 测试**

从 root allowlist 移除：
- `Flow`
- `Link`

- [ ] **Step 2: 运行 allowlist 测试，确认当前失败**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected:
失败，指出旧 root export 或旧 public subpath 仍存在

- [ ] **Step 3: 修改 `package.json` exports**

移除：
- `./Flow`
- `./Workflow`
- `./Link`
- `./Process`

- [ ] **Step 4: 修改 root barrel**

移除 root：
- `Flow`
- `Link`

保留 canonical spine 和其余 residual 家族。

- [ ] **Step 5: 更新 `Logix.test.ts` 中对 root `Link` 的直接断言**

要求：
- 删掉 `OrchestrationLinkApi.make` 的断言
- 不顺手扩改其他 core residual contract

- [ ] **Step 6: 再跑 contract tests**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Logix/Logix.test.ts
```

Expected:
PASS；若失败，先记录失败项并停下，不继续后续步骤

## Chunk 4: User Docs Cutover

### Task 5: 回写核心 live SSoT

**Files:**
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [ ] **Step 1: 回写 `runtime/03`**

要求：
- 不再把 `workflow / processes / workflows` 当当前公开作者面对象介绍

- [ ] **Step 2: 回写 `runtime/05`**

要求：
- 去掉仍在 live logic 组合页中保留的旧 orchestration 口径

- [ ] **Step 3: 回写 `runtime/07`**

要求：
- 标准场景里不再把已退出对象当当前用户入口

- [ ] **Step 4: 回写 `runtime/10`**

要求：
- 不再给额外 host residue 预留停靠位

- [ ] **Step 5: 回写 `guardrails`**

要求：
- 显式对齐已冻结的 delete-first 方向

- [ ] **Step 6: 跑文档格式检查**

Run:
```bash
git diff --check -- docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/05-logic-composition-and-override.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/standards/logix-api-next-guardrails.md
```

Expected:
`无输出`

### Task 6: 回写边缘 live docs

**Files:**
- Modify: `docs/standards/logix-api-next-postponed-naming-items.md`
- Modify: `docs/ssot/runtime/12-toolkit-candidate-intake.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 naming bucket**

要求：
- 已退出当前舞台的对象不再停留在 naming bucket

- [ ] **Step 2: 回写 toolkit intake**

要求：
- 旧 orchestration surface 不再作为当前 candidate 口径

- [ ] **Step 3: 回写总提案当前进展**

要求：
- 只更新已冻结 / 已开始落实 / 已冻结但未完全落实

- [ ] **Step 4: 跑文档格式检查**

Run:
```bash
git diff --check -- docs/standards/logix-api-next-postponed-naming-items.md docs/ssot/runtime/12-toolkit-candidate-intake.md docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

### Task 7: 回写 `packages/logix-react/README` 与 `apps/docs` 直接入口

**Files:**
- Modify: `packages/logix-react/README.md`
- Modify: `apps/docs/content/docs/api/react/meta.json`
- Modify: `apps/docs/content/docs/api/react/meta.cn.json`
- Modify: `apps/docs/content/docs/api/core/meta.json`
- Modify: `apps/docs/content/docs/api/core/meta.cn.json`
- Delete: `apps/docs/content/docs/api/react/use-processes.md`
- Delete: `apps/docs/content/docs/api/react/use-processes.cn.md`
- Delete: `apps/docs/content/docs/api/core/process.md`
- Delete: `apps/docs/content/docs/api/core/process.cn.md`
- Delete: `apps/docs/content/docs/api/core/link.md`
- Delete: `apps/docs/content/docs/api/core/link.cn.md`
- Delete: `apps/docs/content/docs/api/core/flow.md`
- Delete: `apps/docs/content/docs/api/core/flow.cn.md`

- [ ] **Step 1: 移除文档导航与 API 页面**

要求：
- `apps/docs` 入口页里不再列出这些对象
- 删除页面后，meta 不再引用它们

- [ ] **Step 2: README 同步移除 residue promise**

要求：
- 不再把 `useProcesses / ReactPlatform / ReactPlatformLayer` 当当前公开面讲
- 示例只回到 canonical host law

- [ ] **Step 3: 跑文档格式检查**

Run:
```bash
git diff --check -- packages/logix-react/README.md apps/docs/content/docs/api/react/meta.json apps/docs/content/docs/api/react/meta.cn.json apps/docs/content/docs/api/core/meta.json apps/docs/content/docs/api/core/meta.cn.json
```

Expected:
`无输出`

## Chunk 5: Guides And Examples

### Task 8: 清掉 still-active guides 的旧主叙事

**Files:**
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.md`
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/composability.mdx`
- Modify: `apps/docs/content/docs/guide/advanced/composability.cn.mdx`
- Modify: `apps/docs/content/docs/guide/essentials/thinking-in-logix.md`
- Modify: `apps/docs/content/docs/guide/essentials/thinking-in-logix.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/flows-and-effects.md`
- Modify: `apps/docs/content/docs/guide/essentials/flows-and-effects.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/effect-runtime.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/effect-runtime.cn.md`
- Modify: `apps/docs/content/docs/faq.md`
- Modify: `apps/docs/content/docs/faq.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.cn.md`

- [ ] **Step 1: 收 `cross-module-communication*` 与 `search-detail*`**

要求：
- 不再把 `Link / processes` 当现行入口

- [ ] **Step 2: 收 `composability*`**

要求：
- 组合地图回到 `imports / $.use / Root.resolve`

- [ ] **Step 3: 收 `thinking-in-logix*`、`flows-and-effects*`、`faq*`、`deep-dive*`**

要求：
- 不再把 `Flow`、`processes` 当当前主叙事对象

- [ ] **Step 4: 收 `escape-hatches/concurrency*` 与 `effect-runtime*`**

要求：
- 不再用旧 `Flow` API 词汇；只保留当前更通用的运行策略表述

- [ ] **Step 5: 跑文档格式检查**

Run:
```bash
git diff --check -- apps/docs/content/docs/guide/learn/cross-module-communication.md apps/docs/content/docs/guide/learn/cross-module-communication.cn.md apps/docs/content/docs/guide/patterns/search-detail.md apps/docs/content/docs/guide/patterns/search-detail.cn.md apps/docs/content/docs/guide/advanced/composability.mdx apps/docs/content/docs/guide/advanced/composability.cn.mdx apps/docs/content/docs/guide/essentials/thinking-in-logix.md apps/docs/content/docs/guide/essentials/thinking-in-logix.cn.md apps/docs/content/docs/guide/essentials/flows-and-effects.md apps/docs/content/docs/guide/essentials/flows-and-effects.cn.md apps/docs/content/docs/guide/learn/escape-hatches/concurrency.md apps/docs/content/docs/guide/learn/escape-hatches/concurrency.cn.md apps/docs/content/docs/guide/learn/escape-hatches/effect-runtime.md apps/docs/content/docs/guide/learn/escape-hatches/effect-runtime.cn.md apps/docs/content/docs/guide/learn/deep-dive.md apps/docs/content/docs/guide/learn/deep-dive.cn.md apps/docs/content/docs/faq.md apps/docs/content/docs/faq.cn.md
```

Expected:
`无输出`

### Task 9: 删除 `examples/logix-react` 的旧 demo 入口

**Files:**
- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/src/scenarioAnchors.ts`
- Modify: `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- Delete: `examples/logix-react/src/demos/LinkDemoLayout.tsx`
- Delete: `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
- Delete: `examples/logix-react/src/modules/linkModules.ts`

- [ ] **Step 1: 先删导航和 scenario anchor**

要求：
- 从示例导航里去掉 `link-demo`、`expert-process-subtree`
- 从 scenario anchor 里去掉对应条目

- [ ] **Step 2: 删除 demo 文件和模块**

要求：
- 不保留墓碑注释
- 不保留空壳入口

- [ ] **Step 3: 清掉剩余示例中的 `ReactPlatformLayer` 露出**

要求：
- `AsyncLocalModuleLayout`
- `SessionModuleLayout`
继续只展示 canonical runtime / host 用法

- [ ] **Step 4: 跑最小 grep 验证**

Run:
```bash
rg -n "LinkDemoLayout|ProcessSubtreeDemo|ReactPlatformLayer|useProcesses\\(" examples/logix-react/src
```

Expected:
无命中，或只剩注释/计划外残留需继续处理

## Chunk 6: Batch Close

### Task 10: 批次级验证

**Files:**
- Test: `packages/logix-react/test/PublicSurface/publicReachability.test.ts`
- Test: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`
- Test: `packages/logix-core/test/Logix/Logix.test.ts`

- [ ] **Step 1: 运行 React public surface 验证**

Run:
```bash
pnpm -C packages/logix-react exec vitest run test/PublicSurface/publicReachability.test.ts
```

Expected:
PASS

- [ ] **Step 2: 运行 core public surface 验证**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Logix/Logix.test.ts
```

Expected:
PASS；若失败，先记录失败项并停下，不继续后续步骤

- [ ] **Step 3: 运行 docs/docs-nav/examples 三类最终检查**

Run export shape:
```bash
rg -n "\"\\./(ExpertHooks|ReactPlatform|Platform|Flow|Workflow|Link|Process)\"" packages/logix-react/package.json packages/logix-core/package.json
```

Expected:
无命中

Run docs reach:
```bash
rg -n "\\b(useProcesses|ExpertHooks|ReactPlatform|ReactPlatformLayer|Workflow|workflow|Process|processes|Flow|Link)\\b" packages/logix-react/README.md apps/docs/content/docs --glob '!**/dist/**' --glob '!**/node_modules/**'
```

Expected:
只剩本批次明确排除或后续批次处理的残留；若出现新的用户可见承诺，先记录并停下

Run examples reach:
```bash
rg -n "LinkDemoLayout|ProcessSubtreeDemo|ReactPlatformLayer|useProcesses\\(" examples/logix-react/src
```

Expected:
无命中，或只剩本批次明确排除的残留

### Task 11: 回写总提案进度

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 更新 `当前进展`**

把本批次从：
- `planning`

改成：
- `implemented` 或更明确的实施状态

并更新：
- 已开始落实
- 已冻结但未完全落实

- [ ] **Step 2: 跑总文档格式检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 7: Optional Next Batch

### Task 12: 记录 Batch 2 候选

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 明确下一批建议范围**

下一批建议只写候选，不实施：
- `C1`
- `C2`
- `F1/Q1/I1/D1`
- `T1-T4`

- [ ] **Step 2: 不触发实施**

本任务到此结束。等用户确认后，再为下一批单独写新 plan。
