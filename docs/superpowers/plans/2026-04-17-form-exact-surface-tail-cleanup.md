# Form Exact Surface Tail Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Form.from / config.logic / Form.commands / FormView / @logixjs/form/react` 从活实现、活测试、活脚本与活文档里彻底清走，让 Form 真正只剩 `Form.make(..., define)`、direct handle 和 core host law。

**Architecture:** 这次收尾按“先立 exact tests，再切实现，再批量清理旧测试和 examples，最后统一 living docs 与 codegen”的顺序推进。内部继续复用现有 field-kernel lowering 与 error/settlement/locality 主线，不新造第二模型；所有旧入口都直接删除或改写，不保留兼容桥。

**Tech Stack:** TypeScript、Effect V4、Vitest、Markdown、ripgrep、pnpm

---

## Scope And Freeze Line

- 本计划只处理活口径：
  - `packages/logix-form/src/**`
  - `packages/logix-form/test/**`
  - `examples/logix-react/src/**`
  - `scripts/logix-codegen.ts`
  - `docs/adr/**`
  - `docs/internal/**`
  - `apps/docs/content/docs/**`
- 本计划不清理历史冻结材料：
  - `docs/archive/**`
  - `docs/proposals/**`
  - `docs/review-plan/**`
  - `specs/**` 旧 spec / research / references
  - `tmp-lib-research/**`
- 例外：
  - 若某个活文档仍把历史材料链接成当前 authority，需要回写活文档，不改历史材料正文。

## File Structure And Responsibilities

### Runtime / authoring implementation

- Modify: `packages/logix-form/src/Form.ts`
  - 删掉 `FormFrom / FormLogicSpec / Rules*` 这类 residue 类型导出
  - 定义 surviving `FormProgram / FormHandle / SubmitVerdict` 公共类型出口
- Modify: `packages/logix-form/src/internal/form/impl.ts`
  - 把 `Form.make(id, config, define?)` 变成唯一作者入口
  - 去掉 `config.logic` 与 `Form.from(...).logic(...)` 校验路径
  - 把 define callback 收集为单一 declaration payload，再复用现有 lowering
- Modify or Replace: `packages/logix-form/src/internal/form/commands.ts`
  - 将 `makeFormCommands` 收口成 direct handle builder
  - 运行时句柄改成 `validate / validatePaths / submit / reset / setError / clearErrors / field / fieldArray`
- Modify: `packages/logix-form/src/internal/dsl/rules.ts`
  - 去掉“canonical path stays on `Form.from(...).logic(...)`”这类文案
  - 保留 `Form.Rule.make(...)` 相关 helper 与必要内部声明结构
- Delete: `packages/logix-form/src/internal/dsl/from.ts`
  - `Form.from` residue 直接删除
- Delete or Collapse: `packages/logix-form/src/internal/dsl/logic.ts`
  - 若只服务旧 `config.logic`，直接删除
  - 若仍有内部 tagged bundle 价值，改名并下沉成 non-public declaration collector
- Delete: `packages/logix-form/src/react/index.ts`
- Delete: `packages/logix-form/src/react/useField.ts`
- Delete: `packages/logix-form/src/react/useFieldArray.ts`
- Delete: `packages/logix-form/src/react/useForm.ts`
- Delete: `packages/logix-form/src/react/useFormState.ts`
- Delete or Inline: `packages/logix-form/src/FormView.ts`
  - 若只剩 examples 依赖，改由 examples 本地化
- Modify: `packages/logix-form/src/internal/form/README.md`
  - 去掉 `FormView` 口径

### Test harness and exact tests

- Create: `packages/logix-form/test/support/form-harness.ts`
  - 统一 boot runtime、拿到 direct form handle、读 state、跑 Effect
- Create: `packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts`
  - 锁定 `Form.make(..., define)` 是唯一 surviving authoring act
- Create: `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
  - 锁定 direct handle methods 存在，`commands` 不存在
- Modify: `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
  - 保持与 root exact surface 一致
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
  - 保持与 root exact surface 一致
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
  - 明确 `./react` 不再是 package export
- Delete: `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
  - 该文件只证明旧 canonical path
- Delete: `packages/logix-form/test/Form/Form.LegacyTopLevelWarning.test.ts`
  - 该文件围绕旧 `logic` / 顶层 residue 提示文案
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
  - 改名并改写成 `Form.Handle.DefaultActions.test.ts`
- Modify: `packages/logix-form/test/Form/Form.CheckDeps.Defaults.test.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesFirst.ComplexForm.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesFirst.SchemaBridge.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.basic.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.resource-idle.test.ts`
- Modify: `packages/logix-form/test/Form/FormModule.self.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Install.NoExpertSwitch.test.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
- Modify: `packages/logix-form/test/typecheck/Rule.list.inference.ts`
- Modify: `packages/logix-form/test/fixtures/listScopeCheck.ts`

### Examples / dogfooding

- Modify: `examples/logix-react/src/form-support.ts`
  - 去掉对 `packages/logix-form/src/internal/**`、`FormView.ts`、`from.ts` 的穿透引用
  - 最终只允许依赖公开 surface 或 example-local helper
- Modify: `examples/logix-react/src/modules/rules-composition-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-mixed-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-node-form.ts`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/*.tsx`
  - 全部切到 `Form.make(..., define)` 和 direct handle
  - 不再使用 `formDsl` 这类旧作者面别名

### Living docs / ADR / codegen

- Modify: `docs/adr/2026-04-12-field-kernel-declaration-cutover.md`
  - 把 canonical authoring 改成 `Form.make(..., define)`
- Modify: `docs/internal/form-api-quicklook.md`
- Modify: `docs/internal/form-api-tutorial.md`
- Modify: `apps/docs/content/docs/form/index.mdx`
- Modify: `apps/docs/content/docs/form/index.cn.mdx`
- Modify: `apps/docs/content/docs/form/introduction.md`
- Modify: `apps/docs/content/docs/form/introduction.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/field-behaviors.md`
- Modify: `apps/docs/content/docs/guide/essentials/field-behaviors.cn.md`
- Modify: `scripts/logix-codegen.ts`
  - 生成 `Form.make(..., define)` 样板，不再吐 `Form.from`

## Verification Matrix

- Focused unit tests:
  - `pnpm vitest run packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts`
  - `pnpm vitest run packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
  - `pnpm vitest run packages/logix-form/test/Form/Form.DomainBoundary.test.ts packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
- Form package focused suite:
  - `pnpm vitest run packages/logix-form/test/Form`
- Example typecheck:
  - `pnpm --filter @examples/logix-react typecheck`
- Repo gate:
  - `pnpm typecheck`
  - `git diff --check`
- Residue scan:
  - `rg -n "\\bForm\\.from\\b|@logixjs/form/react\\b|\\buseForm\\(|\\buseFieldArray\\(|\\buseField\\(|\\buseFormState\\(|\\bForm\\.commands\\b|\\bFormView\\b" packages/logix-form/src packages/logix-form/test apps/docs/content/docs docs/internal docs/adr scripts examples/logix-react/src -g '!**/dist/**'`

## Done Definition

- `Form.from / config.logic / Form.commands / FormView / @logixjs/form/react` 不再出现在活实现、活测试、活脚本、活文档中
- surviving authoring 只剩 `Form.make(..., define)`
- surviving runtime handle 只剩 direct methods，不再有 `commands.make(...)` 包壳
- `examples/logix-react` 不再通过相对路径穿透 `packages/logix-form/src/internal/**`
- 所有仍保留的 Form 测试都围绕 surviving behavior，不再围绕被删除的旧入口

## Chunk 1: Exact Surface Tests First

### Task 1: 建立新的 authoring 与 handle 硬门

**Files:**
- Create: `packages/logix-form/test/support/form-harness.ts`
- Create: `packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts`
- Create: `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`

- [ ] **Step 1: 写新的 failing tests，锁定 exact authoring act**

```ts
const form = Form.make(
  "Form.Authoring.ExactSurface",
  {
    values: Values,
    initialValues: { name: "" },
  },
  (f) => {
    f.field("name").rule(
      Form.Rule.make({
        required: "user.name.required",
      }),
    )
    f.submit()
  },
)
```

- [ ] **Step 2: 写新的 failing tests，锁定 direct handle**

```ts
expect(typeof handle.validate).toBe("function")
expect(typeof handle.submit).toBe("function")
expect(typeof handle.field("name").set).toBe("function")
expect((handle as any).commands).toBeUndefined()
```

- [ ] **Step 3: 跑 focused tests，确认当前实现按预期报红**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.DomainBoundary.test.ts \
  packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts \
  packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts
```

Expected:

- `Form.make(..., define)` 尚未真正生效
- handle 还带 `commands`

## Chunk 2: Core Implementation Cutover

### Task 2: 把 `Form.make` 变成唯一作者入口

**Files:**
- Modify: `packages/logix-form/src/Form.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-form/src/internal/dsl/rules.ts`
- Delete: `packages/logix-form/src/internal/dsl/from.ts`
- Delete or collapse: `packages/logix-form/src/internal/dsl/logic.ts`

- [ ] **Step 1: 在 `Form.ts` 收紧公开类型面**

需要结果：

- 只保留 surviving public types
- `FormFrom / FormLogicSpec / Rules*` 退出公开类型出口

- [ ] **Step 2: 在 `impl.ts` 实现 `define` callback 收集器**

目标代码骨架：

```ts
Form.make(id, config, (form) => {
  form.field("name").rule(...)
  form.submit({ decode })
})
```

实现约束：

- 不再接受 `config.logic`
- 不再提示用户去用 `Form.from(...).logic(...)`
- 复用现有 lowering，不新建第二 IR

- [ ] **Step 3: 跑 focused tests，确认 authoring tests 变绿**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Form/Form.Authoring.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.DomainBoundary.test.ts \
  packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts
```

Expected:

- 全部 PASS

### Task 3: 把 runtime handle 从 `commands` 包壳拍平

**Files:**
- Modify or move: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-form/src/internal/form/README.md`

- [ ] **Step 1: 让 `useModule(FormProgram)` materialize 出 direct handle**

目标形状：

```ts
yield* handle.validate()
yield* handle.validatePaths("name")
yield* handle.submit(...)
yield* handle.field("name").set("Alice")
yield* handle.fieldArray("items").append("x")
```

- [ ] **Step 2: 删除 `module.commands.make(runtime)` 依赖链**

要求：

- runtime handle 不再需要 bootstrap bridge
- `Form.commands` 不再存活于 implementation path

- [ ] **Step 3: 跑 handle-focused tests，确认 direct handle 成立**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts \
  packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts
```

Expected:

- PASS

## Chunk 3: Test Suite Consolidation And Example Rewrite

### Task 4: 删除旧入口专用测试，重写仍有价值的行为测试

**Files:**
- Delete: `packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts`
- Delete: `packages/logix-form/test/Form/Form.LegacyTopLevelWarning.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- Modify: `packages/logix-form/test/Form/Form.CheckDeps.Defaults.test.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Refactor.Regression.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RowIdErrorOwnership.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesFirst.ComplexForm.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesFirst.SchemaBridge.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RulesManifest.Contract.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ValidateOnStrategy.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.basic.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.fieldArray.test.ts`
- Modify: `packages/logix-form/test/Form/FormBlueprint.resource-idle.test.ts`
- Modify: `packages/logix-form/test/Form/FormModule.self.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScope.ReValidateGate.test.ts`
- Modify: `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Install.NoExpertSwitch.test.ts`
- Modify: `packages/logix-form/test/fixtures/listScopeCheck.ts`
- Modify: `packages/logix-form/test/typecheck/Rule.list.inference.ts`

- [ ] **Step 1: 删除只证明旧作者面的测试**

Run after delete:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.CanonicalAuthoringPath.test.ts
```

Expected:

- file removed

- [ ] **Step 2: 把保留测试全部迁到新 harness**

要求：

- 不再手写 `Runtime.make -> service(form.tag) -> module.commands.make(rt)` 噪音
- 直接拿到 `handle`

- [ ] **Step 3: 跑 form focused suite**

Run:

```bash
pnpm vitest run packages/logix-form/test/Form
```

Expected:

- 只保留 surviving behavior tests
- 不再出现 `Form.from` 或 `commands.make`

### Task 5: 重写 dogfooding，去掉 examples 对内部残留的依赖

**Files:**
- Modify: `examples/logix-react/src/form-support.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-mixed-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-node-form.ts`
- Modify: `examples/logix-react/src/demos/form/*.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/*.tsx`

- [ ] **Step 1: 去掉 `formDsl` helper**

目标：

- examples 直接展示 `Form.make(..., define)`
- 不保留 example-local `Form.from` 别名

- [ ] **Step 2: 去掉 examples 对 `FormView.ts` 和 internal path 的穿透**

实现方向：

- 能直接用 `useSelector` 的地方直接用
- 若确实需要 example-local meta helper，就在 example 内部复制最小读法，不再 import 包内部文件

- [ ] **Step 3: 把 examples 的 submit 调用切到 direct handle**

目标代码：

```ts
const form = useModule(ProfileForm)
void Effect.runPromise(
  form.submit({
    onValid: ...,
  }),
)
```

- [ ] **Step 4: 跑 example typecheck**

Run:

```bash
pnpm --filter @examples/logix-react typecheck
```

Expected:

- PASS

## Chunk 4: Living Docs, ADR, Codegen, Final Sweep

### Task 6: 统一 living docs 与 codegen 的未来口径

**Files:**
- Modify: `docs/adr/2026-04-12-field-kernel-declaration-cutover.md`
- Modify: `docs/internal/form-api-quicklook.md`
- Modify: `docs/internal/form-api-tutorial.md`
- Modify: `apps/docs/content/docs/form/index.mdx`
- Modify: `apps/docs/content/docs/form/index.cn.mdx`
- Modify: `apps/docs/content/docs/form/introduction.md`
- Modify: `apps/docs/content/docs/form/introduction.cn.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.md`
- Modify: `apps/docs/content/docs/guide/advanced/performance-and-optimization.cn.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.md`
- Modify: `apps/docs/content/docs/guide/learn/deep-dive.cn.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.md`
- Modify: `apps/docs/content/docs/guide/recipes/public-submodules.cn.md`
- Modify: `apps/docs/content/docs/guide/essentials/field-behaviors.md`
- Modify: `apps/docs/content/docs/guide/essentials/field-behaviors.cn.md`
- Modify: `scripts/logix-codegen.ts`

- [ ] **Step 1: 回写 canonical authoring 与 direct handle**

要求：

- 文档和脚本都只承认 `Form.make(..., define)`
- 不再教 `Form.from`、`config.logic`、`Form.commands`、`@logixjs/form/react`

- [ ] **Step 2: 处理 `@logixjs/form/react` 的公共子路径叙事**

要求：

- `public-submodules` 文档不再把它列成 allowed example
- 若需要提 residue，只能在 SSoT 负约束里点到为止

- [ ] **Step 3: 跑 residue scan**

Run:

```bash
rg -n "\\bForm\\.from\\b|@logixjs/form/react\\b|\\buseForm\\(|\\buseFieldArray\\(|\\buseField\\(|\\buseFormState\\(|\\bForm\\.commands\\b|\\bFormView\\b" \
  packages/logix-form/src \
  packages/logix-form/test \
  apps/docs/content/docs \
  docs/internal \
  docs/adr \
  scripts \
  examples/logix-react/src \
  -g '!**/dist/**'
```

Expected:

- 只剩 SSoT 的负约束枚举或 scan 自己

- [ ] **Step 4: 跑全量 gate**

Run:

```bash
pnpm typecheck
git diff --check
```

Expected:

- 全部 PASS

## Execution Notes

- 这是 forward-only cutover。不要保留双写、兼容 alias、弃用提示或“先留一版过渡”。
- 旧测试若只证明被删掉的旧入口，直接删除，不做 1 比 1 迁移。
- 若某条测试同时覆盖有价值行为与旧入口噪音，保留行为，重写入口。
- 实施期间不要修改 `docs/proposals/**`、`docs/review-plan/**`、`specs/**` 历史材料，除非发现活文档错误引用了它们为当前 authority。
- 不自动执行 git add / commit / push。若用户要提交，再单独处理。

Plan complete and saved to `docs/superpowers/plans/2026-04-17-form-exact-surface-tail-cleanup.md`. Ready to execute?
