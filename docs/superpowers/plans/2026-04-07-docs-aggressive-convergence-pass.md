# Docs Aggressive Convergence Pass Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 拆掉已完成专题留下的 docs 治理壳层，压低 host projection 在 SSoT 里的存在感，并清理 `packages/examples` 第一接触面的旧口径。

**Architecture:** 先把 docs foundation 收成薄路由，移除已完成 followup 的 active lane 痕迹；再把 runtime/platform SSoT 里过度上浮的 React host projection 和过细的 package contract 细节下沉；最后清理 `packages/examples` 的 README、barrel 注释和 demo 标题，让用户第一次看到的主叙事回到 `Module / Logic / Program / Runtime`。这轮只做高可见面和事实源收口，不做大规模 runtime API 拆线。

**Tech Stack:** Markdown, TypeScript, React, pnpm, Vitest, ripgrep, TypeScript compiler

---

## File Structure

- Modify: `docs/README.md`
  - 根 docs 路由，只保留活跃 lane，不再给已完成 followup 做入口。
- Modify: `docs/next/README.md`
  - `next` 根入口，只保留“活跃专题缓冲区”语义。
- Modify: `docs/proposals/README.md`
  - proposal 根入口，去掉对已完成 runtime followups 的回指。
- Modify: `docs/standards/docs-governance.md`
  - 收成最小治理协议，移除过厚流程手册段落与 leaf page 模板。
- Modify: `docs/ssot/README.md`
  - 保持总入口薄化，去掉完成态 followup 的隐性依赖。
- Modify: `docs/ssot/runtime/README.md`
  - runtime 子树入口，不再把当前待升格入口指到已完成专题。
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
  - 公开主链收紧为 runtime 主线，不再把 `RuntimeProvider` 放进一等主链。
- Modify: `docs/ssot/runtime/02-hot-path-direction.md`
  - 移除完成态 `待升格回写` 壳层。
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
  - 维持 canonical authoring 主线，同时移除完成态 writeback 壳层。
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - 删除 React facade 过度上浮描述，保持 control plane 单一职责。
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
  - 移除完成态 writeback 壳层。
- Modify: `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  - 移除完成态 writeback 壳层。
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - 把 host projection 从“标准场景”降到 host-specific / expert 示例。
- Modify: `docs/ssot/runtime/08-domain-packages.md`
  - 只保留 service-first / program-first 结构判断，不在中央 SSoT bless 具体 root export 白名单。
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
  - 移除完成态 writeback 壳层。
- Modify: `docs/ssot/platform/01-layered-map.md`
  - 降低 `UI projection` 的具体存在感，保留边界，不保留具体 host escape hatch 列表。
- Modify: `docs/ssot/platform/02-anchor-profile-and-instantiation.md`
  - 移除完成态 writeback 壳层。
- Modify: `docs/standards/logix-api-next-guardrails.md`
  - 增加 host projection 不进入公开主链的护栏。
- Modify: `examples/logix/README.md`
  - 去掉 `Logix v3` 和 `Feature-first modules/processes` 旧描述。
- Modify: `packages/logix-react/README.md`
  - 快速上手改成 `Program.make(Module, config)` 主叙事，去掉默认 `processes` 和“局部模块”旧表述。
- Modify: `packages/logix-core/src/index.ts`
  - 调整 barrel 注释，明确 `Process / Workflow` 属于 expert/orchestration surface。
- Modify: `packages/logix-core/src/Module.ts`
  - 公开注释不再把 `ModuleImpl` 当作作者面核心词。
- Modify: `packages/logix-core/src/ModuleTag.ts`
  - 公开注释去掉对 `ModuleImpl` 的高可见描述。
- Modify: `packages/logix-core/src/ExternalStore.ts`
  - 错误文案改成面向 `Module / ModuleTag / runtime handle` 的说法。
- Modify: `packages/logix-react/src/ModuleScope.ts`
  - 公开类型优先暴露 `Module` 路径，降低 `ModuleImpl` 可见度。
- Modify: `packages/logix-react/src/Hooks.ts`
  - 将 `useProcesses` 从默认 hooks 入口移走。
- Create: `packages/logix-react/src/ExpertHooks.ts`
  - 承接 `useProcesses` 这类 expert host hook。
- Modify: `packages/logix-react/test/Hooks/useProcesses.test.tsx`
  - 跟随 `ExpertHooks` 入口更新导入。
- Modify: `examples/logix-react/src/App.tsx`
  - 导航按“主链场景 / 宿主投影 / expert”重排，降低 process 和 host override 曝光度。
- Modify: `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
  - 从 `ExpertHooks` 导入 `useProcesses`，标题与说明改成 expert host 示例。
- Modify: `examples/logix/src/scenarios/workflow-codegen-ir.ts`
  - 头部注释补 expert/orchestration 定位。
- Modify: `examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`
  - 标题文案收成当前口径。

## Chunk 1: Foundation Thin Shell

### Task 1: 收紧 docs foundation 与 active lane

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/next/README.md`
- Modify: `docs/proposals/README.md`
- Modify: `docs/standards/docs-governance.md`
- Modify: `docs/ssot/README.md`
- Modify: `docs/ssot/runtime/README.md`

- [ ] **Step 1: 收紧根 README 与 lane README**

删除 done followup 的入口文案，把 `next` 和 `proposals` 根页改成薄路由，执行细则统一只指向 `docs/standards/docs-governance.md`。

- [ ] **Step 2: 收紧 docs governance**

保留角色矩阵、lane 判定、最小元数据、最小回写面与禁止事项；删除过厚的流程模板、leaf page 模板与完成态 writeback 壳层。

- [ ] **Step 3: 运行 lane 壳层检查**

Run:

```bash
rg -n '^## 待升格回写|Runtime Docs Followups|当前无活跃 next 专题|当前无活跃专题' docs -g '!docs/archive/**'
```

Expected:

- 只剩计划文件或明确保留的历史记录命中
- 不再有 root/readme 对 done followup 的 active 引用

- [ ] **Step 4: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 2: Runtime SSoT Compression

### Task 2: 移除 leaf page 完成态 writeback 壳层

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/02-hot-path-direction.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
- Modify: `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/platform/01-layered-map.md`
- Modify: `docs/ssot/platform/02-anchor-profile-and-instantiation.md`

- [ ] **Step 1: 删除 leaf page 的 `待升格回写` 段落**

既然 `docs/next/**` 当前没有活跃专题，就把完成态回写壳层从 leaf SSoT 页面整体移除。

- [ ] **Step 2: 收紧 public spine / layered map / scenario patterns**

将公开主链收成 `Module / Logic / Program / Runtime`；把 `RuntimeProvider`、`imports scope`、`root escape hatch`、`useProcesses` 从“标准主叙事”降成 host-specific 或 expert surface。

- [ ] **Step 3: 收紧 domain package 页面**

保留 `service-first / program-first` 结构裁决，移除对 `Query.make / I18n.layer / Crud.make` 这类具体 root export 的中央 bless。

- [ ] **Step 4: 更新 guardrails**

在 `docs/standards/logix-api-next-guardrails.md` 明确 host projection 不进入公开主链。

- [ ] **Step 5: 运行 docs consistency 检查**

Run:

```bash
rg -n 'Runtime Docs Followups|followup bucket|RuntimeProvider|useProcesses|Query.make|I18n.layer|Crud.make' docs/ssot docs/standards -g '!docs/archive/**'
```

Expected:

- `RuntimeProvider` 不再出现在 public spine 主链
- `useProcesses` 不再被描述成标准场景入口
- 中央 SSoT 不再把具体 package root export 当事实源

- [ ] **Step 6: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 3: Packages And Examples First-Contact Cleanup

### Task 3: 清理第一接触面旧口径与 expert surface 曝光度

**Files:**
- Modify: `examples/logix/README.md`
- Modify: `packages/logix-react/README.md`
- Modify: `packages/logix-core/src/index.ts`
- Modify: `packages/logix-core/src/Module.ts`
- Modify: `packages/logix-core/src/ModuleTag.ts`
- Modify: `packages/logix-core/src/ExternalStore.ts`
- Modify: `packages/logix-react/src/ModuleScope.ts`
- Modify: `packages/logix-react/src/Hooks.ts`
- Create: `packages/logix-react/src/ExpertHooks.ts`
- Modify: `packages/logix-react/test/Hooks/useProcesses.test.tsx`
- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx`
- Modify: `examples/logix/src/scenarios/workflow-codegen-ir.ts`
- Modify: `examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`

- [ ] **Step 1: 清 README 与源码注释**

把 `Logix v3`、`Feature-first modules/processes`、`局部模块`、`ModuleImpl` 高可见注释改成当前口径。

- [ ] **Step 2: 把 `useProcesses` 移到 expert 入口**

创建 `packages/logix-react/src/ExpertHooks.ts`，从默认 `Hooks.ts` 移除 `useProcesses`，并同步更新对应测试和 demo 导入。

- [ ] **Step 3: 下调 demo 导航与标题的 host/expert 曝光度**

在 `examples/logix-react/src/App.tsx` 重排导航分区；在 `ProcessSubtreeDemo.tsx` 和 workflow IR 场景注释里明确 expert/orchestration 定位；把表单 demo 标题改到当前术语。

- [ ] **Step 4: 运行相关类型检查与测试**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
pnpm -C packages/logix-react typecheck
pnpm -C packages/logix-react exec vitest run test/Hooks/useProcesses.test.tsx
pnpm -C examples/logix-react exec tsc -p tsconfig.json --noEmit
git diff --check
```

Expected:

- TypeScript 通过
- `useProcesses` 相关测试通过
- diff 无格式错误

- [ ] **Step 5: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。
