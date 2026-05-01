# Single Formula Public Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 React host projection 的 day-one 公开公式压成“两条 canonical 构造入口 + 一条 canonical child-resolution 规则”：`useModule(ModuleTag)`、`useModule(Program, options?)`、`useImportedModule(parent, ModuleTag)`；并把 docs/examples/SSoT 同步收口到这条公式。本轮采用 `keep-public-demote-docs` 裁决，保留 `ModuleImpl`、`useLocalModule`、`useLayerModule`、`ModuleScope` 的公开代码入口，但把它们统一降到 non-canonical、specialized 或 expert 说明位。

**Architecture:** 按拉马努金视角，这一轮只做“最小生成元”相关的高价值 cut，但分三道门执行。Phase A 先把 React 单公式裁决回写到 SSoT 和 standards，避免新旧真相源分裂。Phase B 再用 dts、hook tests、ripple suites 和 keep-surface contracts 钉死 React 构造态入口边界，只 hard reject `useModule(Module)` 这类模糊输入，同时显式保护 `ModuleRef / ModuleRuntime / selector / useImportedModule` 的消费面。Phase C 只在前两道门全绿后启动，用按桶 allowlist 门禁清理 API 文档、guide 和 examples，把 canonical 叙事收口到 `ModuleTag / Program`，同时保留明确标注的 expert 或 specialized 路径。

**Tech Stack:** TypeScript, Effect V4, React 19, Vitest, pnpm, Logix core, Logix react, docs app

---

## Ramanujan Lens

这份计划只追三条高价值方向：

1. React 构造态入口只保留两个 canonical 生成元：
   - `useModule(ModuleTag)`
   - `useModule(Program, options?)`
2. React canonical 规则固定为“两构造 + 一解析”：
   - `useModule(ModuleTag)`
   - `useModule(Program, options?)`
   - `useImportedModule(parent, ModuleTag)`，以及等价的 `parent.imports.get(ModuleTag)`
3. React 消费态 handle surface 继续保留：
   - `useModule(ModuleRef, selector?)`
   - `useModule(ModuleRuntime, selector?)`
4. expert 或 specialized route 只在明确标记的文档里出现：
   - `Root.resolve(Tag)`
   - `$.root.resolve(Tag)`
   - `useModule(ModuleImpl)`
   - `useLocalModule(...)`
   - `useLayerModule(...)`
   - `ModuleScope.make(...)`
   - internal contracts / raw field declarations

任何还能把同一件事讲出第二种日常公式的入口，都属于本计划的清扫面。

## Scope Check

这份计划覆盖一个强耦合子系统：React host projection 的 canonical 收口，以及与之直接相关的 SSoT / docs / examples 主叙事回写。

包含：

- React host projection 对应的 SSoT / standards 回写
- `packages/logix-react` 的 `useModule(...)` 公开输入联合收口
- React 相关 dts 合同、hook 行为测试、错误提示文案
- react API 文档、guide/recipe/tutorial 文档的统一改写
- core API reference 中的 canonical note 与 current-contract 对照整理
- `examples/logix` 与 `examples/logix-react` 的 canonical 示例清扫
- expert route 的默认叙事降级

不包含：

- perf 热链路重开
- `runtime.check / runtime.compare` 新能力扩张
- `LogicPlan` internal 深 rename
- `FieldKernel` 内核实现重写
- `packages/logix-core/src/Module.ts` 与 `packages/logix-core/test-dts/canonical-authoring.surface.ts` 的公开契约 cutover
- `ModuleDef.implement(...)` 在 core 源码层的物理删除
- specialized helper 代码导出的物理删除
- `docs/archive/**` 冻结文档修订

执行前先读：

- `AGENTS.md`
- `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/superpowers/plans/2026-04-09-core-spine-aggressive-cutover.md`
- `docs/superpowers/plans/2026-04-12-field-kernel-declaration-cutover.md`

建议搭配：

- `@project-guide`
- `@technical-design-review`
- `@verification-before-completion`

## File Structure

### Core React Surface

- Modify: `docs/ssot/runtime/01-public-api-spine.md`
  - 把 React day-one 公式与 specialized / expert containment 写成当前事实源。
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
  - 与 React 侧 day-one 叙事互相引用，避免 `Program.make` 与 React canonical path 漂移。
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - 明确写成“两构造入口 + 一条 child resolution 规则 + specialized/expert containment”。
- Modify: `docs/standards/logix-api-next-guardrails.md`
  - 把 `useModule(Module)`、`useModule(Program)`、`useImportedModule(parent, tag)`、specialized routes 的 guardrail 写清楚。
- Modify: `packages/logix-react/src/Hooks.ts`
  - 若 canonical / specialized hook 分层说明变化，导出层要一起收口。
- Modify: `packages/logix-react/src/internal/hooks/useLocalModule.ts`
  - specialized local-only helper 的叙事若变化，在这里同步。
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
  - 删除 `ModuleSource` 的公开 overload；保留 `ModuleTag / Program / ModuleRef / ModuleRuntime`，`ModuleImpl` 暂时保留为 non-canonical route。
- Modify: `packages/logix-react/src/internal/hooks/useLayerModule.ts`
  - specialized local-only helper 的叙事若变化，在这里同步。
- Modify: `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
  - dev error 文案只指向 `useModule(ParentProgram, { key })`、`useImportedModule(parent, ModuleTag)` 与 `useModule(Child.tag)`。
- Modify: `packages/logix-react/src/ReactPlatform.ts`
  - ReactPlatform 注释与 helper 分层口径同步。
- Modify: `packages/logix-react/README.md`
  - package README 必须随 cutover 同步，避免仓内形成第二真相源。
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
  - 把 `ModuleTag / Program` 固化为唯一 day-one 构造入口，同时保护 `ModuleRef / ModuleRuntime` 消费面。
- Modify: `packages/logix-react/test-dts/tsconfig.json`
  - 若新增夹具则纳入单独编译。
- Create: `packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx`
  - 用于验证 `useModule(Module)` 在 dev 环境给出明确诊断。
- Create: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
  - 用于保护 `ModuleRef / ModuleRuntime / selector / useImportedModule` 的既有消费面。
- Modify: `packages/logix-react/test/Hooks/useLocalModule.test.tsx`
  - 用于保护 `useLocalModule` 作为 specialized helper 的现有语义。
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.module.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`
- Modify: `packages/logix-react/test/Hooks/multiInstance.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.program-blueprint-identity.test.tsx`
- Modify: `packages/logix-react/test/Hooks/moduleScope.test.tsx`
- Modify: `packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useSelector.structMemo.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModuleSuspend.test.tsx`
- Modify: `packages/logix-react/test/Hooks/watcherPatterns.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useSelector.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useRootResolve.test.tsx`
  - 把旧 happy path 改成新 canonical path。
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
- Modify: `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
  - ripple suites。用来证明收口范围停在构造态入口，不会波及整片 hook surface。

### Public Docs

- Modify: `packages/logix-react/README.md`
  - README 也属于 day-one 公开叙事，必须与 `ModuleTag / Program` 公式同步。
- Modify: `apps/docs/content/docs/api/core/module.md`
- Modify: `apps/docs/content/docs/api/core/module.cn.md`
- Modify: `apps/docs/content/docs/api/core/runtime.md`
- Modify: `apps/docs/content/docs/api/core/runtime.cn.md`
  - 保持 reference 对当前公开 contract 的忠实描述，同时补 canonical note，不把“目标契约”伪装成“当前代码契约”。

- Modify: `apps/docs/content/docs/api/react/use-module.md`
- Modify: `apps/docs/content/docs/api/react/use-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-imported-module.md`
- Modify: `apps/docs/content/docs/api/react/use-imported-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-dispatch.md`
- Modify: `apps/docs/content/docs/api/react/use-dispatch.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-local-module.md`
- Modify: `apps/docs/content/docs/api/react/use-local-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-module-list.md`
- Modify: `apps/docs/content/docs/api/react/use-module-list.cn.md`
- Modify: `apps/docs/content/docs/api/react/provider.md`
- Modify: `apps/docs/content/docs/api/react/provider.cn.md`
- Modify: `apps/docs/content/docs/api/react/module-scope.md`
- Modify: `apps/docs/content/docs/api/react/module-scope.cn.md`
  - React API 页全部切到 `ModuleTag / Program / useImportedModule` 公式。

- Modify: `apps/docs/content/docs/guide/get-started/quick-start.md`
- Modify: `apps/docs/content/docs/guide/get-started/quick-start.cn.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-first-app.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-first-app.cn.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-complex-list.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-complex-list.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/modules-and-state.md`
- Modify: `apps/docs/content/docs/guide/essentials/modules-and-state.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/lifecycle.md`
- Modify: `apps/docs/content/docs/guide/essentials/lifecycle.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/describing-modules.md`
- Modify: `apps/docs/content/docs/guide/learn/describing-modules.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.md`
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/lifecycle-and-watchers.md`
- Modify: `apps/docs/content/docs/guide/learn/lifecycle-and-watchers.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/i18n.md`
- Modify: `apps/docs/content/docs/guide/patterns/i18n.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/pagination.md`
- Modify: `apps/docs/content/docs/guide/patterns/pagination.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/form-wizard.md`
- Modify: `apps/docs/content/docs/guide/patterns/form-wizard.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/route-scope-modals.md`
- Modify: `apps/docs/content/docs/guide/recipes/route-scope-modals.cn.md`
- Modify: `apps/docs/content/docs/form/introduction.md`
- Modify: `apps/docs/content/docs/form/introduction.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/migration-from-zustand.md`
- Modify: `apps/docs/content/docs/guide/recipes/migration-from-zustand.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/composability.mdx`
- Modify: `apps/docs/content/docs/guide/advanced/composability.cn.mdx`
- Modify: `apps/docs/content/docs/guide/advanced/concurrency-control-plane.md`
- Modify: `apps/docs/content/docs/guide/advanced/concurrency-control-plane.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/module-handle-extensions.md`
- Modify: `apps/docs/content/docs/guide/advanced/module-handle-extensions.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/suspense-and-async.md`
- Modify: `apps/docs/content/docs/guide/advanced/suspense-and-async.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.cn.md`
- Modify: `apps/docs/content/docs/form/quick-start.md`
- Modify: `apps/docs/content/docs/form/quick-start.cn.md`
- Modify: `apps/docs/content/docs/form/rules.md`
- Modify: `apps/docs/content/docs/form/rules.cn.md`
- Modify: `apps/docs/content/docs/form/derived.md`
- Modify: `apps/docs/content/docs/form/derived.cn.md`
  - 这些文件都在当前 grep 残留清单里，执行时必须全部落盘。

### Examples

- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/DiShowcaseLayout.tsx`
- Modify: `examples/logix-react/src/demos/FractalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LinkDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/MiddlewareDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case02-line-items.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case03-contacts.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case05-unique-code.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case07-wizard.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- Modify: `examples/logix-react/src/sections/GlobalRuntimeSections.tsx`
- Modify: `examples/logix/src/i18n-message-token.ts`
- Modify: `examples/logix/src/i18n-async-ready.ts`
- Modify: `examples/logix/src/patterns/field-reuse.ts`
  - examples 全部收口到 canonical 公式；expert route 必须明确标出 expert 身份。

## Implementation Rules

- 不为旧写法保留兼容层。
- 不新增第三种 canonical 构造态 hook 输入形态。
- 本轮只收紧“构造型第一参数来源”，不触碰 `ModuleRef / ModuleRuntime / selector` 消费形态。
- `useImportedModule(parent, ModuleTag)` 与 `parent.imports.get(ModuleTag)` 是 canonical child resolution 规则的一部分，不得被误降级成 expert。
- 本轮硬裁决固定为 `keep-public-demote-docs`：
  - `useLocalModule` 继续保留公开代码导出与测试，只退出 canonical docs，收口为 synchronous local-only specialized helper。
  - `ModuleImpl` 继续保留公开代码入口，只退出 canonical docs；若后续要 public hard reject，必须另开独立裁决。
  - `ModuleScope` 与 `useLayerModule` 继续保留公开代码导出，只收口叙事，不直接删代码。
- 先冻结命中清单再改文件。任何 `rg` 新命中的 docs、README、tests、examples，若不在任务清单里，先补清单再继续。
- 所有 docs sweep 必须依赖按桶 allowlist 门禁关门，不能用“任何命中都失败”的粗暴 grep。
- docs 验收固定分三桶：
  - `day-one canonical`：零第二公式
  - `specialized`：允许低层对象，但必须显式标 specialized route
  - `expert`：允许 expert route 与 fixed-root 证明，但标题、注释、位置都要显式标 expert
- 阶段边界固定为：
  - `Phase A` = `Chunk 0 + Chunk 1 + Task 3`
  - `Phase B` = `Chunk 2`
  - `Phase C` = `Chunk 3`
- `Phase B` 只有在 `Phase A` 的 dts、focused tests、ripple suites、browser suites、typecheck 全绿后才能启动。
- `Phase C` 只有在 `Phase B` 的 docs / README allowlist 门禁与 `apps/docs` 类型检查全绿后才能启动。
- `pnpm test:turbo` 不能单独作为 React 宿主语义的最终门禁，因为它不覆盖 browser 侧验证；本轮必须补跑 browser focused tests。
- day-one 逻辑消费统一优先 `$.use(Tag)`；只有 fixed-root proof、脚本级验证、expert route 专题示例，才允许保留 `Root.resolve` 或 `$.root.resolve`。
- `field-reuse` 若继续保留在 day-one pattern 目录，就不能出现 `InternalContracts`；若保留 internal contracts，就必须迁到显式 expert/internal pattern 位。
- examples 必须分成两个桶：
  - `must-fix`：来自命中清单、错误默认文案、会污染 canonical 心智的示例
  - `consistency-pass`：只做一致性修边，不承载主收口门禁
- 下文所有 `Commit` 步骤都是条件步骤。只有用户明确授权提交时才执行 `git add` / `git commit`；未授权时，一律跳过并保持工作区未提交状态。

## Chunk 0: Freeze The Canonical React Rule

### Task 0: 先把 React 单公式裁决回写到事实源

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`

- [ ] **Step 1: 写出 React day-one 规则的唯一读法**

必须同时写清楚这 4 点：

```text
1. `useModule(ModuleTag)` 是 shared-instance canonical lookup
2. `useModule(Program, options?)` 是 local-instance canonical constructor
3. `useImportedModule(parent, ModuleTag)` / `parent.imports.get(ModuleTag)` 是 canonical child resolution
4. `useModule(ModuleImpl)`、`useLocalModule`、`useLayerModule`、`ModuleScope` 属于 specialized 或 non-canonical route
```

- [ ] **Step 2: 用 grep 确认事实源已经明确 specialized containment**

Run:

```bash
rg -n "useModule\\(ModuleTag\\)|useModule\\(Program|useImportedModule|ModuleImpl|useLocalModule|useLayerModule|ModuleScope" \
  docs/ssot/runtime/01-public-api-spine.md \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/standards/logix-api-next-guardrails.md
```

Expected:

- 能看出“两构造 + 一解析 + specialized containment”
- 不再只写“两个生成元”这种会误伤 child resolution 的口号

- [ ] **Step 3: 按仓库策略跳过 commit**

## Chunk 1: React Surface Contract

### Task 0: 先冻结命中清单，避免 scope 漏洞

**Files:**
- Verify only

- [ ] **Step 1: 冻结 React tests / examples / README 命中清单**

Run:

```bash
rg -l "useModule\\([^)]*\\)|useLocalModule\\(|Root\\.resolve\\(|\\.implement\\(" \
  packages/logix-react/test \
  packages/logix-react/test-dts \
  examples/logix-react/src \
  examples/logix/src \
  packages/logix-react/README.md \
  -g '*.ts' -g '*.tsx' -g '*.md' | sort
```

Expected:

- 输出一份精确 hit list
- 后续任何被改动语义命中的文件，都必须纳入本轮工作清单或被明确标记为 allowlist

- [ ] **Step 2: 冻结 docs 命中清单**

Run:

```bash
rg -l "ModuleDef\\.implement|LogicPlan|useModule\\([^)]*\\)|useLocalModule\\(|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/api \
  apps/docs/content/docs/guide \
  apps/docs/content/docs/form \
  packages/logix-react/README.md \
  -g '*.md' -g '*.mdx' | sort
```

Expected:

- 输出一份精确 docs / README hit list
- 若命中 `guide/patterns/i18n.*`、`form/*`、`packages/logix-react/README.md` 等文件，先补到任务清单

- [ ] **Step 3: 按仓库策略跳过 commit**

### Task 1: 先把 hook 类型合同钉死

**Files:**
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Modify: `packages/logix-react/test-dts/tsconfig.json`

- [ ] **Step 1: 在 dts 夹具里加入旧入口的失败断言**

把 `packages/logix-react/test-dts/canonical-hooks.surface.ts` 收成下面这组对照：

```ts
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { useImportedModule, useModule } from '../src/Hooks.js'

const Counter = Logix.Module.make('CanonicalHooksCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Page = Logix.Module.make('CanonicalHooksPage', {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {},
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
})

const PageProgram = Logix.Program.make(Page, {
  initial: { ready: true },
  capabilities: {
    imports: [CounterProgram],
  },
})

const singleton = useModule(Counter.tag)
const page = useModule(PageProgram, { key: 'page:42' })
const localCounter = useImportedModule(page, Counter.tag)

// @ts-expect-error legacy module-object input is removed
useModule(Counter)

declare const runtime: Logix.ModuleRuntime<{ count: number }, any>
useModule(runtime, (s) => s.count)

void singleton
void page
void localCounter
```

- [ ] **Step 2: 跑 dts 编译，确认当前还没收口**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected:

- 当前失败，或 `@ts-expect-error` 报 unused
- 失败点能证明 `useModule(Module)` 仍被接受

- [ ] **Step 3: 若需要，扩 `test-dts/tsconfig.json` 只编译这组夹具**

最小结构：

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["./canonical-hooks.surface.ts"]
}
```

- [ ] **Step 4: 按仓库策略跳过 commit**

### Task 2: 收紧 `useModule(...)` 的 module-object 输入，并补齐 keep-surface contracts

**Files:**
- Modify: `packages/logix-react/README.md`
- Modify: `packages/logix-react/src/Hooks.ts`
- Modify: `packages/logix-react/src/ReactPlatform.ts`
- Modify: `packages/logix-react/src/internal/hooks/useLayerModule.ts`
- Modify: `packages/logix-react/src/internal/hooks/useModule.ts`
- Modify: `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
- Create: `packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx`
- Create: `packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useLocalModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.module.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`
- Modify: `packages/logix-react/test/Hooks/moduleScope.test.tsx`
- Modify: `packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx`
- Modify: `packages/logix-react/test/Hooks/multiInstance.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useModuleSuspend.test.tsx`
- Modify: `packages/logix-react/test/Hooks/watcherPatterns.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useSelector.test.tsx`
- Modify: `packages/logix-react/test/Hooks/useRootResolve.test.tsx`
- Modify: `packages/logix-react/test/RuntimeProvider/runtime-logix-chain.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderTickServices.regression.test.tsx`
- Modify: `packages/logix-react/test/integration/runtimeProviderSuspendSyncFastPath.test.tsx`
- Modify: `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`

- [ ] **Step 1: 写失败测试，固定新主链与旧入口诊断**

在 `packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx` 写：

```tsx
import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('LegacyUseModuleInputCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
})

describe('useModule legacy public inputs', () => {
  it('throws a guidance error for module-object input', () => {
    const runtime = Logix.Runtime.make(CounterProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    expect(() => renderHook(() => useModule(Counter as any), { wrapper })).toThrow(/ModuleTag|Program/)
  })
})
```

- [ ] **Step 2: 跑 focused tests，确认当前行为还是旧世界**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/Hooks/useLocalModule.test.tsx \
  test/Hooks/useModule.impl-keyed.test.tsx \
  test/Hooks/useModuleSuspend.test.tsx \
  test/Hooks/multiInstance.test.tsx \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/Hooks/useImportedModule.hierarchical.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/Hooks/moduleScope.test.tsx \
  test/Hooks/moduleScope.bridge.test.tsx \
  test/Hooks/useSelector.structMemo.test.tsx \
  test/Hooks/useSelector.test.tsx \
  test/Hooks/useModule.test.tsx \
  test/Hooks/useModule.module.test.tsx \
  test/Hooks/useModule.impl-vs-tag.test.tsx \
  test/Hooks/watcherPatterns.test.tsx \
  test/Hooks/useRootResolve.test.tsx \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/RuntimeProvider/runtime-logix-chain.test.tsx \
  --reporter=dot

pnpm -C packages/logix-react exec vitest run \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  test/browser/perf-boundaries/react-defer-preload.test.tsx \
  test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx \
  --reporter=dot
```

Expected:

- 新测试 FAIL
- 至少一条旧测试仍在证明 `useModule(Module)` 的 happy path

- [ ] **Step 3: 写最小实现，只 hard reject module-object 输入，并保留既有 handle surface**

`packages/logix-react/src/internal/hooks/useModule.ts` 目标形态：

```ts
export function useModule(handle: Logix.Program.Program<...>, options?: ModuleProgramOptions): ModuleRefOfProgram<...>
export function useModule(handle: Logix.ModuleTagType<...>): ModuleRefOfTag<...>
export function useModule(handle: ModuleRef<...>): ModuleRef<...>
export function useModule(handle: ReactModuleHandle, selector?: ..., equalityFn?: ...): unknown {
  if (Logix.Module.is(handle)) {
    throw new Error('[useModule] module-object input is removed from the public route; use useModule(ModuleTag) for shared instances or useModule(Program, options) for local instances.')
  }
  // Program -> impl 的内部归一化保留
  // ModuleImpl 暂不 hard reject；是否降成 expert-only 另开裁决
}
```

`packages/logix-react/src/internal/store/resolveImportedModuleRef.ts` 的修复方向：

```ts
const fix = [
  '- Ensure the child is imported in the same scope.',
  '  Example: Program.make(Parent, { capabilities: { imports: [ChildProgram] }, ... })',
  '- Ensure parentRuntime comes from useModule(ParentProgram, { key }) or useModule(Parent.tag) only when it is truly shared.',
  '- If you intentionally want a singleton, use useModule(Child.tag).',
]
```

- [ ] **Step 4: 把旧 happy path 测试改成新 happy path，并补 keep-surface 合同**

核心断言统一改成下面两类：

```tsx
const local = useModule(CounterProgram, { key: 'counter:local' })
const singleton = useModule(Counter.tag)
```

以及：

```tsx
const overridden = useModule(Counter.tag).runtime
const rootResolved = runtime.runSync(Logix.Root.resolve(Counter.tag as any))
```

`packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx` 至少覆盖：

```tsx
const ref = useModule(Counter.tag)
const countByRef = useModule(ref, (s) => s.count)
const countByRuntime = useModule(ref.runtime, (s) => s.count)
const child = useImportedModule(host, Child.tag)
```

`packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx`、`packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx`、`packages/logix-react/test/Hooks/moduleScope.test.tsx`、`packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx` 至少保留并复核：

```tsx
const host = useModule(HostProgram, { key: 'host:1' })
const childByHook = useImportedModule(host, Child.tag)
const childByRef = host.imports.get(Child.tag)

expect(childByHook.runtime.instanceId).toBe(childByRef.runtime.instanceId)
```

以及：

```tsx
expect(() =>
  Logix.Program.make(Host, {
    initial: { ok: true },
    capabilities: { imports: [ChildA, ChildB] },
  }),
).toThrow(/DuplicateImportedModuleBindingError/)
```

`packages/logix-react/test/Hooks/useLocalModule.test.tsx` 至少保留并复核：

```tsx
const local = useLocalModule(FormModule, { initial: { text: '' } })
const text = useSelector(local, (s) => s.text)
```

要求：

- `useModule.ts` 收口后，这条 specialized helper 语义不能被误伤
- 若测试命名或断言过旧，本轮顺手改成“specialized local-only helper”口径
- 同步更新 `packages/logix-react/src/Hooks.ts` 与 `packages/logix-react/src/internal/hooks/useLayerModule.ts` 的 specialized 文案
- `resolveImportedModuleRef.ts` 的提示文案调整不能把 strict parent-scope 语义改松
- `ModuleScope` 作为 specialized route 仍需围绕 `Program` 与 parent-scope child resolution 正常工作

- [ ] **Step 5: 重新跑 dts 和 focused tests**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/useLocalModule.test.tsx \
  test/Hooks/useModule.impl-keyed.test.tsx \
  test/Hooks/useModuleSuspend.test.tsx \
  test/Hooks/multiInstance.test.tsx \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/Hooks/useImportedModule.hierarchical.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/Hooks/moduleScope.test.tsx \
  test/Hooks/moduleScope.bridge.test.tsx \
  test/Hooks/useSelector.structMemo.test.tsx \
  test/Hooks/useModule.test.tsx \
  test/Hooks/useModule.module.test.tsx \
  test/Hooks/useModule.impl-vs-tag.test.tsx \
  test/Hooks/watcherPatterns.test.tsx \
  test/Hooks/useRootResolve.test.tsx \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/RuntimeProvider/runtime-logix-chain.test.tsx \
  --reporter=dot
```

Expected:

- PASS
- `useModule` 的 canonical 构造态输入只剩 `ModuleTag / Program`
- `ModuleRef / ModuleRuntime / selector / useImportedModule` 未被打穿
- `useLocalModule` 的 specialized helper 语义未被打穿

- [ ] **Step 6: 跑 `packages/logix-react` 类型检查**

Run:

```bash
pnpm -C packages/logix-react typecheck
```

Expected:

- PASS

- [ ] **Step 7: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  packages/logix-react/README.md \
  packages/logix-react/src/Hooks.ts \
  packages/logix-react/src/ReactPlatform.ts \
  packages/logix-react/src/internal/hooks/useLayerModule.ts \
  packages/logix-react/src/internal/hooks/useModule.ts \
  packages/logix-react/src/internal/store/resolveImportedModuleRef.ts \
  packages/logix-react/test-dts/canonical-hooks.surface.ts \
  packages/logix-react/test-dts/tsconfig.json \
  packages/logix-react/test/Hooks/useModule.legacy-inputs.test.tsx \
  packages/logix-react/test/Hooks/useModule.keep-surface-contract.test.tsx \
  packages/logix-react/test/Hooks/useLocalModule.test.tsx \
  packages/logix-react/test/Hooks/useModule.impl-keyed.test.tsx \
  packages/logix-react/test/Hooks/useModuleSuspend.test.tsx \
  packages/logix-react/test/Hooks/multiInstance.test.tsx \
  packages/logix-react/test/Hooks/useImportedModule.test.tsx \
  packages/logix-react/test/Hooks/useImportedModule.hierarchical.test.tsx \
  packages/logix-react/test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  packages/logix-react/test/Hooks/moduleScope.test.tsx \
  packages/logix-react/test/Hooks/moduleScope.bridge.test.tsx \
  packages/logix-react/test/Hooks/useSelector.test.tsx \
  packages/logix-react/test/Hooks/useModule.test.tsx \
  packages/logix-react/test/Hooks/useModule.module.test.tsx \
  packages/logix-react/test/Hooks/useModule.impl-vs-tag.test.tsx \
  packages/logix-react/test/Hooks/watcherPatterns.test.tsx \
  packages/logix-react/test/Hooks/useRootResolve.test.tsx
git commit -m "refactor(react): collapse useModule public inputs"
```

### Task 3: 扩大 React ripple suite，先把 internal / browser 连锁回归打平

**Files:**
- Modify: `packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/react-defer-preload.test.tsx`

- [ ] **Step 1: 先跑 internal / browser focused suite**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  --reporter=dot
```

Expected:

- 在收口前，至少部分测试仍会被旧 `useModule(Module)`、`useModule(Impl)` 或 `Program.impl` 叙事波及

- [ ] **Step 2: 顺着 `ModuleTag / Program` 新公式修正命中的断言或前提**

统一修法：

```tsx
const singleton = useModule(Counter.tag)
const local = useModule(CounterProgram, { key: 'counter:local' })
```

要求：

- 只修和 React 构造态收口直接相关的断言
- 不顺手改动无关测试主题

- [ ] **Step 3: 重新跑 internal / browser focused suite**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  --reporter=dot
```

Expected:

- PASS
- 到这里为止，进入 docs sweep 之前的 React ripple suite 已经够宽

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  packages/logix-react/test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  packages/logix-react/test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  packages/logix-react/test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx
git commit -m "test(react): widen ripple coverage for canonical inputs"
```

## Chunk 2: Public Docs Sweep After React Contract Gate

### Task 4: 改 core API 与 react API 文档，只保留一条日常公式

**Files:**
- Modify: `packages/logix-react/README.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `apps/docs/content/docs/api/core/module.md`
- Modify: `apps/docs/content/docs/api/core/module.cn.md`
- Modify: `apps/docs/content/docs/api/core/runtime.md`
- Modify: `apps/docs/content/docs/api/core/runtime.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-module.md`
- Modify: `apps/docs/content/docs/api/react/use-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-imported-module.md`
- Modify: `apps/docs/content/docs/api/react/use-imported-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-dispatch.md`
- Modify: `apps/docs/content/docs/api/react/use-dispatch.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.md`
- Modify: `apps/docs/content/docs/api/react/use-selector.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-local-module.md`
- Modify: `apps/docs/content/docs/api/react/use-local-module.cn.md`
- Modify: `apps/docs/content/docs/api/react/use-module-list.md`
- Modify: `apps/docs/content/docs/api/react/use-module-list.cn.md`
- Modify: `apps/docs/content/docs/api/react/provider.md`
- Modify: `apps/docs/content/docs/api/react/provider.cn.md`
- Modify: `apps/docs/content/docs/api/react/module-scope.md`
- Modify: `apps/docs/content/docs/api/react/module-scope.cn.md`

- [ ] **Step 1: 先生成 API 文档残留清单**

Run:

```bash
rg -n "ModuleDef\\.implement|LogicPlan|useModule\\(.*Def\\)|useModule\\(.*Module\\)|useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  packages/logix-react/README.md \
  apps/docs/content/docs/api/core \
  apps/docs/content/docs/api/react
```

Expected:

- 命中上述文件
- 为后续人工改写提供逐条定位

- [ ] **Step 2: 用统一文本公式重写所有 API 页**

目标示例统一替换成：

```ts
const SearchLogic = Search.logic('search-query', ($) => {
  return Effect.void
})

const SearchProgram = Logix.Program.make(Search, {
  initial: { query: '' },
  logics: [SearchLogic],
})

const runtime = Logix.Runtime.make(SearchProgram)
```

以及 React 侧：

```tsx
const app = useModule(AppProgram, { key: 'app:42' })
const counter = useModule(Counter.tag)
const child = useImportedModule(app, Counter.tag)
```

同时执行这些删改：

- `packages/logix-react/README.md` 与 React API 页按 day-one canonical 公式改写
- `useImportedModule(parent, ModuleTag)` 必须作为 canonical child resolution 明确保留
- core API reference 保持对当前公开 contract 的忠实描述，并额外加 `canonical note`，说明 day-one 推荐路径
- 把 `ModuleDef.implement(...)` 从 day-one 构造叙事降到 non-canonical 文档位；reference 页可保留当前 contract 说明，本轮不改 core contract 源码
- `LogicPlan` 若当前源码仍公开可见，只能降到“current contract / non-canonical”说明位，不能伪装成已删除
- 删掉 `useModule(CounterDef)`、`useModule(CounterModule)` 的默认推荐
- 将 `useModule(Impl)` 降为 non-canonical / advanced 说明位
- 将 `useLocalModule`、`useLayerModule`、`ModuleScope` 改写为 specialized helper，不再与 canonical 共享同一主叙事
- 将 `Logix.Root.resolve(Tag)` 与 `$.root.resolve(Tag)` 改成明确的 expert route 文案

- [ ] **Step 3: 用 allowlist 门禁关门**

Run:

```bash
rg -n "ModuleDef\\.implement|LogicPlan|useModule\\(.*Def\\)|useModule\\(.*Module\\)" \
  packages/logix-react/README.md \
  apps/docs/content/docs/api/core \
  apps/docs/content/docs/api/react

rg -n "useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  packages/logix-react/README.md \
  apps/docs/content/docs/api/core \
  apps/docs/content/docs/api/react \
  -g '!apps/docs/content/docs/api/react/use-module.md' \
  -g '!apps/docs/content/docs/api/react/use-module.cn.md' \
  -g '!apps/docs/content/docs/api/react/use-local-module.md' \
  -g '!apps/docs/content/docs/api/react/use-local-module.cn.md' \
  -g '!apps/docs/content/docs/api/react/module-scope.md' \
  -g '!apps/docs/content/docs/api/react/module-scope.cn.md' \
  -g '!apps/docs/content/docs/api/react/use-module-list.md' \
  -g '!apps/docs/content/docs/api/react/use-module-list.cn.md' \
  -g '!apps/docs/content/docs/api/react/provider.md' \
  -g '!apps/docs/content/docs/api/react/provider.cn.md' \
  -g '!apps/docs/content/docs/api/core/runtime.md' \
  -g '!apps/docs/content/docs/api/core/runtime.cn.md'
```

Expected:

- reference 页能忠实区分“当前 contract”与“canonical note”
- allowlist 之外不再出现 expert 或 specialized 术语

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add apps/docs/content/docs/api/core/module.md \
  apps/docs/content/docs/api/core/module.cn.md \
  apps/docs/content/docs/api/core/runtime.md \
  apps/docs/content/docs/api/core/runtime.cn.md \
  packages/logix-react/README.md \
  apps/docs/content/docs/api/react/use-module.md \
  apps/docs/content/docs/api/react/use-module.cn.md \
  apps/docs/content/docs/api/react/use-imported-module.md \
  apps/docs/content/docs/api/react/use-imported-module.cn.md \
  apps/docs/content/docs/api/react/use-dispatch.md \
  apps/docs/content/docs/api/react/use-dispatch.cn.md \
  apps/docs/content/docs/api/react/use-selector.md \
  apps/docs/content/docs/api/react/use-selector.cn.md \
  apps/docs/content/docs/api/react/use-local-module.md \
  apps/docs/content/docs/api/react/use-local-module.cn.md \
  apps/docs/content/docs/api/react/use-module-list.md \
  apps/docs/content/docs/api/react/use-module-list.cn.md \
  apps/docs/content/docs/api/react/provider.md \
  apps/docs/content/docs/api/react/provider.cn.md \
  apps/docs/content/docs/api/react/module-scope.md \
  apps/docs/content/docs/api/react/module-scope.cn.md
git commit -m "docs(api): collapse public formulas to tag and program"
```

### Task 5: 改 get-started / essentials / form 基础页，先把 day-one 教程收口

**Files:**
- Modify: `apps/docs/content/docs/guide/get-started/quick-start.md`
- Modify: `apps/docs/content/docs/guide/get-started/quick-start.cn.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-first-app.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-first-app.cn.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-complex-list.md`
- Modify: `apps/docs/content/docs/guide/get-started/tutorial-complex-list.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/modules-and-state.md`
- Modify: `apps/docs/content/docs/guide/essentials/modules-and-state.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.md`
- Modify: `apps/docs/content/docs/guide/essentials/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/lifecycle.md`
- Modify: `apps/docs/content/docs/guide/essentials/lifecycle.cn.md`
- Modify: `apps/docs/content/docs/form/introduction.md`
- Modify: `apps/docs/content/docs/form/introduction.cn.md`
- Modify: `apps/docs/content/docs/form/quick-start.md`
- Modify: `apps/docs/content/docs/form/quick-start.cn.md`
- Modify: `apps/docs/content/docs/form/rules.md`
- Modify: `apps/docs/content/docs/form/rules.cn.md`
- Modify: `apps/docs/content/docs/form/derived.md`
- Modify: `apps/docs/content/docs/form/derived.cn.md`

- [ ] **Step 1: 先冻结 Wave A 残留清单**

Run:

```bash
rg -l "ModuleDef\\.implement|\\.implement\\(|\\.impl\\b|useModule\\([A-Z][A-Za-z0-9_]*\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(|ModuleScope\\.make\\(.*\\.impl|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/get-started \
  apps/docs/content/docs/guide/essentials \
  apps/docs/content/docs/form | sort
```

Expected:

- 文件列表只覆盖 get-started / essentials / form 基础页
- 若新增命中，必须一并纳入本次改写

- [ ] **Step 2: 统一改写 Wave A，先收 get-started / essentials / form**

所有示例都收敛到这组写法：

```ts
const SearchLogic = Search.logic('search-query', ($) => {
  return Effect.void
})

const SearchProgram = Logix.Program.make(Search, {
  initial: { query: '', results: [] },
  logics: [SearchLogic],
})
```

```tsx
const search = useModule(SearchProgram, { key: 'search:page' })
const auth = useModule(Auth.tag)
const detail = useImportedModule(search, Detail.tag)
```

专项改写要求：

- 所有 tutorial 从“定义对象 + implement + impl”主叙事改成“定义对象 + Program.make”
- 所有 React 章节把 `useModule(Module)` 改成 `useModule(ModuleTag)` 或 `useModule(Program, options?)`
- `useModule(Impl)` 若在 essentials / form 基础页里出现，必须移出 day-one 主叙事
- `Logix.Root.resolve(Tag)` 只允许保留在明确的 expert 提示段，不得出现在 tutorial 主流程
- `useLocalModule` 若仍保留文档，必须写成 synchronous local-only specialized helper
- `useLayerModule`、`ModuleScope` 若在基础页出现，必须写成 scope / local helper，不得再伪装成 canonical 主入口

- [ ] **Step 3: 重新跑 Wave A allowlist grep，确认没有漏网之鱼**

Run:

```bash
rg -n "ModuleDef\\.implement|useModule\\(.*Def\\)|useModule\\(.*Module\\)" \
  apps/docs/content/docs/guide/get-started \
  apps/docs/content/docs/guide/essentials \
  apps/docs/content/docs/form

rg -n "useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/get-started \
  apps/docs/content/docs/guide/essentials \
  apps/docs/content/docs/form \
  -g '!apps/docs/content/docs/guide/essentials/react-integration.md' \
  -g '!apps/docs/content/docs/guide/essentials/react-integration.cn.md' \
  -g '!apps/docs/content/docs/guide/essentials/lifecycle.md' \
  -g '!apps/docs/content/docs/guide/essentials/lifecycle.cn.md' \
  -g '!apps/docs/content/docs/form/introduction.md' \
  -g '!apps/docs/content/docs/form/introduction.cn.md'
```

Expected:

- allowlist 之外不允许再有 day-one 推荐
- allowlist 内必须写明 advanced / expert / specialized 身份

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  apps/docs/content/docs/guide/get-started \
  apps/docs/content/docs/guide/essentials \
  apps/docs/content/docs/form
git commit -m "docs(guide): collapse day-one tutorials to the single formula"
```

### Task 6: 改 learn / patterns / recipes，收口第二层教程叙事

**Files:**
- Modify: `apps/docs/content/docs/guide/learn/describing-modules.md`
- Modify: `apps/docs/content/docs/guide/learn/describing-modules.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.md`
- Modify: `apps/docs/content/docs/guide/learn/cross-module-communication.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/lifecycle-and-watchers.md`
- Modify: `apps/docs/content/docs/guide/learn/lifecycle-and-watchers.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.md`
- Modify: `apps/docs/content/docs/guide/patterns/search-detail.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/i18n.md`
- Modify: `apps/docs/content/docs/guide/patterns/i18n.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/pagination.md`
- Modify: `apps/docs/content/docs/guide/patterns/pagination.cn.md`
- Modify: `apps/docs/content/docs/guide/patterns/form-wizard.md`
- Modify: `apps/docs/content/docs/guide/patterns/form-wizard.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.md`
- Modify: `apps/docs/content/docs/guide/recipes/react-integration.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/route-scope-modals.md`
- Modify: `apps/docs/content/docs/guide/recipes/route-scope-modals.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/migration-from-zustand.md`
- Modify: `apps/docs/content/docs/guide/recipes/migration-from-zustand.cn.md`

- [ ] **Step 1: 冻结 Wave B 残留清单**

Run:

```bash
rg -l "ModuleDef\\.implement|\\.implement\\(|\\.impl\\b|useModule\\([A-Z][A-Za-z0-9_]*\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(|ModuleScope\\.make\\(.*\\.impl|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/learn \
  apps/docs/content/docs/guide/patterns \
  apps/docs/content/docs/guide/recipes | sort
```

Expected:

- 文件列表只覆盖 learn / patterns / recipes
- 若新增命中，必须一并纳入本波

- [ ] **Step 2: 统一改写 Wave B**

要求：

- `learn/**` 把“定义对象 + implement + impl”主叙事压回 `Program.make`
- `patterns/**` 只保留 `ModuleTag / Program / useImportedModule`
- `recipes/**` 中的 route-scope、react-integration、migration 只允许在 specialized / scope helper 段落保留非 canonical 能力

- [ ] **Step 3: 重新跑 Wave B allowlist grep**

Run:

```bash
rg -n "ModuleDef\\.implement|useModule\\(.*Def\\)|useModule\\(.*Module\\)" \
  apps/docs/content/docs/guide/learn \
  apps/docs/content/docs/guide/patterns \
  apps/docs/content/docs/guide/recipes

rg -n "useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/learn \
  apps/docs/content/docs/guide/patterns \
  apps/docs/content/docs/guide/recipes \
  -g '!apps/docs/content/docs/guide/learn/cross-module-communication.md' \
  -g '!apps/docs/content/docs/guide/learn/cross-module-communication.cn.md' \
  -g '!apps/docs/content/docs/guide/recipes/react-integration.md' \
  -g '!apps/docs/content/docs/guide/recipes/react-integration.cn.md' \
  -g '!apps/docs/content/docs/guide/recipes/route-scope-modals.md' \
  -g '!apps/docs/content/docs/guide/recipes/route-scope-modals.cn.md'
```

Expected:

- allowlist 之外不允许再有 day-one 推荐
- allowlist 内必须写明 advanced / expert / specialized 身份

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  apps/docs/content/docs/guide/learn \
  apps/docs/content/docs/guide/patterns \
  apps/docs/content/docs/guide/recipes
git commit -m "docs(guide): collapse learn patterns and recipes to the single formula"
```

### Task 7: 改 advanced / escape-hatches，显式降级 expert 与 helper 入口

**Files:**
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/concurrency.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.md`
- Modify: `apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/composability.mdx`
- Modify: `apps/docs/content/docs/guide/advanced/composability.cn.mdx`
- Modify: `apps/docs/content/docs/guide/advanced/module-handle-extensions.md`
- Modify: `apps/docs/content/docs/guide/advanced/module-handle-extensions.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md`
- Modify: `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/suspense-and-async.md`
- Modify: `apps/docs/content/docs/guide/advanced/suspense-and-async.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.md`
- Modify: `apps/docs/content/docs/guide/advanced/troubleshooting.cn.md`

- [ ] **Step 1: 冻结 Wave C 残留清单**

Run:

```bash
rg -l "ModuleDef\\.implement|\\.implement\\(|\\.impl\\b|useModule\\([A-Z][A-Za-z0-9_]*\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(|ModuleScope\\.make\\(.*\\.impl|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/advanced \
  apps/docs/content/docs/guide/learn/escape-hatches | sort
```

Expected:

- 文件列表只覆盖 advanced / escape-hatches
- 若新增命中，必须一并纳入本波

- [ ] **Step 2: 统一改写 Wave C**

要求：

- 所有保留的 `useModule(Impl)`、`useLocalModule`、`useLayerModule`、`ModuleScope`、`Root.resolve` 都必须在 advanced / expert / specialized 语境中说明
- 任何会让读者把 helper 入口误当 canonical 主入口的文字都必须删除

- [ ] **Step 3: 重新跑 Wave C allowlist grep**

Run:

```bash
rg -n "ModuleDef\\.implement|useModule\\(.*Def\\)|useModule\\(.*Module\\)" \
  apps/docs/content/docs/guide/advanced \
  apps/docs/content/docs/guide/learn/escape-hatches

rg -n "useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  apps/docs/content/docs/guide/advanced \
  apps/docs/content/docs/guide/learn/escape-hatches \
  -g '!apps/docs/content/docs/guide/advanced/composability.mdx' \
  -g '!apps/docs/content/docs/guide/advanced/composability.cn.mdx' \
  -g '!apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md' \
  -g '!apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md' \
  -g '!apps/docs/content/docs/guide/advanced/suspense-and-async.md' \
  -g '!apps/docs/content/docs/guide/advanced/suspense-and-async.cn.md' \
  -g '!apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.md' \
  -g '!apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.cn.md'
```

Expected:

- allowlist 之外不允许再有 day-one 推荐
- allowlist 内必须写明 advanced / expert / specialized 身份

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  apps/docs/content/docs/guide/advanced \
  apps/docs/content/docs/guide/learn/escape-hatches
git commit -m "docs(guide): demote advanced and escape hatch routes"
```

## Chunk 3: Examples And Closure

### Task 8: 改 React demos，把实际可运行示例切到 `ModuleTag / Program`

**Files:**
- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/DiShowcaseLayout.tsx`
- Modify: `examples/logix-react/src/demos/FractalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx`
- Modify: `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LinkDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/LocalModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/MiddlewareDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/SessionModuleLayout.tsx`
- Modify: `examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case02-line-items.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case03-contacts.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case05-unique-code.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case07-wizard.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
- Modify: `examples/logix-react/src/sections/GlobalRuntimeSections.tsx`

- [ ] **Step 1: 先生成 example 命中清单，并拆成 must-fix / consistency-pass**

Run:

```bash
rg -l "useModule\\([A-Z][A-Za-z0-9_]*\\)" examples/logix-react/src -g '*.tsx' -g '*.ts' | sort

rg -l "useModule\\([^)]*impl\\)|useModule\\(Impl\\)|Root\\.resolve\\(" \
  examples/logix-react/src \
  -g '*.tsx' -g '*.ts' | sort
```

Expected:

- 列出本任务中的 React demos
- 先标出 `must-fix`：
  - 命中 `useModule(Module)`、`useModule(Impl)`、`Root.resolve`
  - 命中错误默认文案，如 `rules + $.derived`
- 其余只做视觉或文案一致化的文件，归入 `consistency-pass`
- 若新增文件命中，追加到本任务范围

- [ ] **Step 2: 先只改 must-fix demo，再视需要做 consistency-pass**

示例代码统一改写目标：

```tsx
const globalCounter = useModule(Counter.tag)
const localCounter = useModule(CounterProgram, { key: 'counter:local' })
```

同时删除或改写这些说明：

- `useModule(Counter)` 代表全局共享实例
- `useModule(Impl)` 代表默认局部实例
- `rules + $.derived` 是推荐路径
- 把 `Root.resolve(Tag)` 写成默认消费姿势

允许保留的场景：

- 专门演示 advanced / non-canonical route 的 demo
- 专门演示 specialized local-only helper 的 demo
- 但必须在标题与屏幕文案里显式标出身份
- 任何被刻意保留的 demo，必须在 Task 10 的 `EXAMPLES_ALLOWLIST` 中显式登记

- [ ] **Step 3: 跑 example typecheck**

Run:

```bash
pnpm -C examples/logix-react typecheck
pnpm -C apps/docs types:check
```

Expected:

- PASS

- [ ] **Step 4: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add examples/logix-react/src
git commit -m "refactor(examples-react): align demos with the single formula"
```

### Task 9: 清理 core examples 与 expert route 泄漏

**Files:**
- Modify: `examples/logix/src/i18n-message-token.ts`
- Modify: `examples/logix/src/i18n-async-ready.ts`
- Modify: `examples/logix/src/patterns/field-reuse.ts`

- [ ] **Step 1: 写最小改写目标**

`i18n` 示例目标：

```ts
const logic = App.logic('render-message', ($) =>
  Effect.gen(function* () {
    const i18n = yield* $.use(I18nTag)
    return yield* i18n.render(token('hello'))
  }),
)
```

`field-reuse` 示例目标：

```ts
// 把该示例明确迁到 expert/internal pattern 位，并同步更新任何引用。
// 公开 day-one pattern 区不再直接展示 InternalContracts。
```

要求：

- 文案从 `FieldSpec` 改成 `raw field declarations`
- day-one 逻辑消费统一改成 `$.use(I18nTag)`
- 只有 fixed-root proof 或脚本级验证类示例，才允许保留 `Root.resolve`

- [ ] **Step 2: 跑定向脚本，确认示例行为不退化**

Run:

```bash
pnpm -C examples/logix exec tsx src/i18n-message-token.ts
pnpm -C examples/logix exec tsx src/i18n-async-ready.ts
```

Expected:

- `i18n-message-token.ts` 继续输出 token 稳定、render 随语言变化
- `i18n-async-ready.ts` 继续先输出 pending fallback，再输出 ready 文案

- [ ] **Step 3: Conditional Commit**

```bash
# only if the user has explicitly authorized commits
git add \
  examples/logix/src/i18n-message-token.ts \
  examples/logix/src/i18n-async-ready.ts \
  examples/logix/src/patterns/field-reuse.ts
git commit -m "refactor(examples): demote expert routes and raw field wording"
```

### Task 10: 最终验证与收口

**Files:**
- Verify only

- [ ] **Step 1: 跑文档与示例残留 grep**

Run:

```bash
# Fill this list from Task 8 and Task 9's actual retained specialized/expert demos.
# Start empty and append every intentional retention explicitly.
EXAMPLES_ALLOWLIST=(
)

REACT_EXAMPLE_WORKSET=(
  "examples/logix-react/src/App.tsx"
  "examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx"
  "examples/logix-react/src/demos/DiShowcaseLayout.tsx"
  "examples/logix-react/src/demos/FractalRuntimeLayout.tsx"
  "examples/logix-react/src/demos/GlobalRuntimeLayout.tsx"
  "examples/logix-react/src/demos/I18nDemoLayout.tsx"
  "examples/logix-react/src/demos/LinkDemoLayout.tsx"
  "examples/logix-react/src/demos/LocalModuleLayout.tsx"
  "examples/logix-react/src/demos/MiddlewareDemoLayout.tsx"
  "examples/logix-react/src/demos/SessionModuleLayout.tsx"
  "examples/logix-react/src/demos/TaskRunnerDemoLayout.tsx"
  "examples/logix-react/src/demos/form/FormDemoLayout.tsx"
  "examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx"
  "examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx"
  "examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx"
  "examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx"
  "examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx"
  "examples/logix-react/src/demos/form/cases/case02-line-items.tsx"
  "examples/logix-react/src/demos/form/cases/case03-contacts.tsx"
  "examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx"
  "examples/logix-react/src/demos/form/cases/case05-unique-code.tsx"
  "examples/logix-react/src/demos/form/cases/case06-attachments-upload.tsx"
  "examples/logix-react/src/demos/form/cases/case07-wizard.tsx"
  "examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx"
  "examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx"
  "examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx"
  "examples/logix-react/src/sections/GlobalRuntimeSections.tsx"
)

CORE_EXAMPLE_WORKSET=(
  "examples/logix/src/i18n-message-token.ts"
  "examples/logix/src/i18n-async-ready.ts"
  "examples/logix/src/patterns/field-reuse.ts"
)

rg -n "ModuleDef\\.implement|LogicPlan|useModule\\(.*Def\\)|useModule\\(.*Module\\)|rules \\+ \\$\\.derived" \
  packages/logix-react/README.md \
  apps/docs/content/docs/api \
  apps/docs/content/docs/guide \
  apps/docs/content/docs/form \
  "${REACT_EXAMPLE_WORKSET[@]}" \
  "${CORE_EXAMPLE_WORKSET[@]}" \
  -g '!**/dist/**' -g '!**/public/sandbox/**'

rg -n "useModule\\(.*impl\\)|useModule\\(Impl\\)|useLocalModule\\(|useLayerModule\\(|ModuleScope\\.make\\(.*\\.impl|\\.impl\\b|Logix\\.Root\\.resolve\\(|\\$\\.root\\.resolve\\(" \
  packages/logix-react/README.md \
  apps/docs/content/docs/api \
  apps/docs/content/docs/guide \
  apps/docs/content/docs/form \
  "${REACT_EXAMPLE_WORKSET[@]}" \
  "${CORE_EXAMPLE_WORKSET[@]}" \
  -g '!**/dist/**' -g '!**/public/sandbox/**' \
  -g '!apps/docs/content/docs/api/react/use-module.md' \
  -g '!apps/docs/content/docs/api/react/use-module.cn.md' \
  -g '!apps/docs/content/docs/api/react/use-local-module.md' \
  -g '!apps/docs/content/docs/api/react/use-local-module.cn.md' \
  -g '!apps/docs/content/docs/api/react/module-scope.md' \
  -g '!apps/docs/content/docs/api/react/module-scope.cn.md' \
  -g '!apps/docs/content/docs/api/react/use-module-list.md' \
  -g '!apps/docs/content/docs/api/react/use-module-list.cn.md' \
  -g '!apps/docs/content/docs/api/react/provider.md' \
  -g '!apps/docs/content/docs/api/react/provider.cn.md' \
  -g '!apps/docs/content/docs/api/core/runtime.md' \
  -g '!apps/docs/content/docs/api/core/runtime.cn.md' \
  -g '!apps/docs/content/docs/guide/essentials/react-integration.md' \
  -g '!apps/docs/content/docs/guide/essentials/react-integration.cn.md' \
  -g '!apps/docs/content/docs/guide/essentials/lifecycle.md' \
  -g '!apps/docs/content/docs/guide/essentials/lifecycle.cn.md' \
  -g '!apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.md' \
  -g '!apps/docs/content/docs/guide/learn/escape-hatches/lifecycles.cn.md' \
  -g '!apps/docs/content/docs/guide/learn/cross-module-communication.md' \
  -g '!apps/docs/content/docs/guide/learn/cross-module-communication.cn.md' \
  -g '!apps/docs/content/docs/guide/recipes/react-integration.md' \
  -g '!apps/docs/content/docs/guide/recipes/react-integration.cn.md' \
  -g '!apps/docs/content/docs/guide/recipes/route-scope-modals.md' \
  -g '!apps/docs/content/docs/guide/recipes/route-scope-modals.cn.md' \
  -g '!apps/docs/content/docs/guide/advanced/composability.mdx' \
  -g '!apps/docs/content/docs/guide/advanced/composability.cn.mdx' \
  -g '!apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md' \
  -g '!apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md' \
  -g '!apps/docs/content/docs/guide/advanced/suspense-and-async.md' \
  -g '!apps/docs/content/docs/guide/advanced/suspense-and-async.cn.md' \
  $(printf " -g '!%s'" "${EXAMPLES_ALLOWLIST[@]}")
```

Expected:

- 不再出现 canonical 叙事残留
- allowlist 之外若仍命中，直接视为失败

- [ ] **Step 2: 跑定向 package 验证**

Run:

```bash
pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
pnpm -C packages/logix-react typecheck
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.legacy-inputs.test.tsx \
  test/Hooks/useModule.keep-surface-contract.test.tsx \
  test/Hooks/useLocalModule.test.tsx \
  test/Hooks/useModule.impl-keyed.test.tsx \
  test/Hooks/useModuleSuspend.test.tsx \
  test/Hooks/multiInstance.test.tsx \
  test/Hooks/useModule.program-blueprint-identity.test.tsx \
  test/Hooks/useImportedModule.test.tsx \
  test/Hooks/useImportedModule.hierarchical.test.tsx \
  test/Hooks/useImportedModule.duplicate-binding.test.tsx \
  test/Hooks/moduleScope.test.tsx \
  test/Hooks/moduleScope.bridge.test.tsx \
  test/Hooks/useSelector.structMemo.test.tsx \
  test/Hooks/useModule.test.tsx \
  test/Hooks/useModule.module.test.tsx \
  test/Hooks/useModule.impl-vs-tag.test.tsx \
  test/Hooks/watcherPatterns.test.tsx \
  test/Hooks/useRootResolve.test.tsx \
  test/integration/runtimeProviderTickServices.regression.test.tsx \
  test/integration/runtimeProviderSuspendSyncFastPath.test.tsx \
  test/internal/integration/reactConfigRuntimeProvider.test.tsx \
  test/RuntimeProvider/runtime-logix-chain.test.tsx \
  --reporter=dot
pnpm -C packages/logix-react exec vitest run \
  test/browser/perf-boundaries/react-boot-resolve.test.tsx \
  test/browser/perf-boundaries/react-boot-resolve-phase-probe.test.tsx \
  test/browser/perf-boundaries/react-defer-preload.test.tsx \
  test/browser/perf-boundaries/react-strict-suspense-jitter.test.tsx \
  --reporter=dot
pnpm -C examples/logix-react typecheck
pnpm -C examples/logix typecheck
pnpm -C apps/docs types:check
pnpm -C apps/docs build
pnpm -C examples/logix exec tsx src/i18n-message-token.ts
pnpm -C examples/logix exec tsx src/i18n-async-ready.ts
```

Expected:

- 全部 PASS

- [ ] **Step 3: 跑全仓门禁**

Run:

```bash
pnpm typecheck
pnpm test:turbo
```

Expected:

- PASS

- [ ] **Step 4: 输出完成摘要**

摘要必须回答这 4 点：

- React canonical 构造态入口是否只剩 `ModuleTag / Program`
- `ModuleImpl / useLocalModule / useLayerModule / ModuleScope` 是否已被收回到 non-canonical 或 specialized 说明位
- docs 站是否还存在第二公式
- examples 是否还把 expert route 当日常路径
- 本轮明确没有触碰哪些高风险 internal 线
