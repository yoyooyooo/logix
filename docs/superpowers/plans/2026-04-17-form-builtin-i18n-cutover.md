# Form Builtin I18n Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Form builtin rule 的默认消息切到 `I18nMessageToken`，提供 `@logixjs/form/locales`，并让 examples/docs/test 全部切到“默认零参数 + app bootstrap 注册”这条新主线。

**Architecture:** 这次 cutover 只动 `@logixjs/form` 领域包，不给 `@logixjs/i18n` 新增注册 API。默认 token key 和 locale assets 继续归 Form owner；catalog registration、merge order、bucket mapping 继续停在 application bootstrap。实现按“先红灯测试，再 builtin token factory，再 locale assets/subpath，再 collision/owner guard，再 examples/docs 扫尾”的顺序推进。

**Tech Stack:** TypeScript、Effect V4、Vitest、package exports、Markdown

---

## Scope Check

这轮是一个单一功能面：

- `@logixjs/form` builtin rule i18n cutover
- `@logixjs/form/locales` optional subpath
- app bootstrap registration proof
- examples/docs 对齐

它们不是独立子系统。拆成多份计划只会把同一条 contract 切碎。

## Authority Inputs

- [13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [08-domain-packages.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md)
- [form-api-tutorial.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/internal/form-api-tutorial.md)
- [form-rule-builtin-i18n-catalog-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-rule-builtin-i18n-catalog-contract.md)
- [i18n-catalog-registration-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/i18n-catalog-registration-contract.md)
- [2026-04-17-i18n-catalog-registration-review.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-17-i18n-catalog-registration-review.md)

## Execution Rules

- 零兼容、单轨实施。
- 不给 `@logixjs/i18n` 新增 `registerCatalogs` 一类 API。
- 不给 `@logixjs/form` root 新增 locale noun。
- builtin 一旦具备默认 token，day-one canonical 写法默认零参数。
- `required` 允许 bare token shorthand；其余 builtins 的 message override 一律走 object 形态。
- 这轮不顺手新增 `email` builtin。
- 不执行 git 提交命令；若后续用户明确要求，再做提交。

## File Structure

### Builtin token factory and validator contract

- Create: `packages/logix-form/src/internal/validators/builtinMessageTokens.ts`
  - 单点持有 builtin token key、token factory、默认参数映射。
- Modify: `packages/logix-form/src/internal/validators/index.ts`
  - 把 `required / minLength / maxLength / min / max / pattern` 的 decl 和默认返回值切到 token。
  - 保持预算检查，但预算对象改成 token payload。
- Modify: `packages/logix-form/src/Rule.ts`
  - 让 public `RequiredDecl / MinLengthDecl / ...` 类型和 runtime 行为对齐。

### Locale asset subpath

- Create: `packages/logix-form/src/locales/index.ts`
  - 导出 `zhCN`、`enUS` 和 `FormBuiltinRuleCatalog` 类型。
- Create: `packages/logix-form/src/locales/enUS.ts`
  - 内置英文 catalogs。
- Create: `packages/logix-form/src/locales/zhCN.ts`
  - 内置中文 catalogs。
- Modify: `packages/logix-form/package.json`
  - 新增 `./locales` public subpath。

### Tests

- Modify: `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
  - token output、零参数写法、override contract。
- Modify: `packages/logix-form/test/Rule/Form.Rule.FieldMount.test.ts`
  - builtins raw string 输入退出。
- Modify: `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
  - builtin rule 示例切到零参数或 token。
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
  - `./locales` subpath 存活。
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
  - root 不泄漏 locale noun。
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`
  - `zhCN / enUS` 的 keys、value shape、subpath import。
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
  - app bootstrap merge + `I18n.layer(driver)` proof。
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts`
  - cross-domain default catalog collision 的 authoring error proof。

### Example and docs sweep

- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case07-wizard.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx`
- Modify: `examples/logix-react/src/modules/rules-composition-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-mixed-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-node-form.ts`
- Modify: `docs/internal/form-api-tutorial.md`
  - 和已冻结的写法保持一致，去掉所有 builtin raw string canonical 示例。

## Verification Matrix

- Builtin focused:
  - `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
  - `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.FieldMount.test.ts`
  - `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`
  - `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
  - `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts`
- Boundary focused:
  - `pnpm vitest run packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
- Package gate:
  - `pnpm vitest run packages/logix-form/test/Rule packages/logix-form/test/Form`
  - `pnpm --filter @logixjs/form typecheck`
  - `pnpm --filter @logixjs/form typecheck:test`
- Example gate:
  - `pnpm --filter @examples/logix-react typecheck`
- Repo gate:
  - `pnpm typecheck`
  - `git diff --check`
- Residue scan:
  - `rg -n "required: '|'message: '|'Form\\.Rule\\.required\\(\" packages/logix-form/test examples/logix-react/src docs/internal/form-api-tutorial.md -S`

## Done Definition

1. builtin default message 不再产出 raw string。
2. builtin `message` override 只接受 `I18nMessageToken`。
3. builtin 有默认 token 后，day-one canonical 写法默认零参数。
4. `required` 的 bare token shorthand 与其余 builtins 的 object-only override 真正被测试锁住。
5. `@logixjs/form/locales` subpath 可用，root surface 不泄漏 locale noun。
6. `zhCN / enUS` 可通过 app bootstrap merge 接入 `I18n.layer(driver)`。
7. cross-domain default collision 的 authoring error 有明确测试和报错落点。
8. examples、tutorial、tests 不再把 builtin raw string 写法当 canonical 主线。

## Chunk 1: Red Tests First

### Task 1: 锁住 builtin token contract 和 locale subpath

**Files:**
- Modify: `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.FieldMount.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts`
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts`
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts`

- [ ] **Step 1: 改 `Form.Rule.Builtins` 测试，要求 builtin 默认返回 token**

```ts
const requiredDefault = Form.Rule.required()
expect(requiredDefault('')).toEqual(token('logix.form.rule.required'))

const min2 = Form.Rule.minLength(2)
expect(min2('a')).toEqual(token('logix.form.rule.minLength', { min: 2 }))
```

- [ ] **Step 2: 写失败测试，锁定 `required` 的 bare token shorthand 和其他 builtins 的 object-only override**

```ts
const requiredTitle = Form.Rule.required(token('example.required'))
expect(requiredTitle('')).toEqual(token('example.required'))

const digits = Form.Rule.pattern({
  re: /^[0-9]+$/,
  message: token('example.pattern'),
})
expect(digits('abc')).toEqual(token('example.pattern'))
```

- [ ] **Step 3: 写失败测试，锁定 `./locales` subpath 与 root boundary**

```ts
expect(pkg.exports['./locales']).toBeDefined()
expect((Form as any).locales).toBeUndefined()
expect((Form as any).zhCN).toBeUndefined()
```

- [ ] **Step 4: 写失败测试，锁定 app bootstrap registration proof**

```ts
const driver = createTestDriver({
  resources: {
    en: { ...enUS },
    zh: { ...zhCN },
  },
})

expect(svc.render(token('logix.form.rule.required'))).toBe('Required')
yield* svc.changeLanguage('zh')
expect(svc.render(token('logix.form.rule.required'))).toBe('此项为必填')
```

- [ ] **Step 5: 写失败测试，锁定 cross-domain default collision = authoring error**

```ts
expect(() =>
  assertNoCatalogConflicts(
    { 'logix.form.rule.required': 'Required' },
    { 'logix.form.rule.required': 'Other' },
  ),
).toThrow(/authoring error/i)
```

- [ ] **Step 6: 跑红灯**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts \
  packages/logix-form/test/Rule/Form.Rule.FieldMount.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts \
  packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts \
  packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts \
  packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts
```

Expected:

- FAIL，因为 validators 还在吐 string
- FAIL，因为 `./locales` 还不存在
- FAIL，因为 collision law 还没有实现
- FAIL，因为 examples/test 里还有 raw string builtin 写法

## Chunk 2: Builtin Token Factories

### Task 2: 把 builtin validator contract 切到 `I18nMessageToken`

**Files:**
- Create: `packages/logix-form/src/internal/validators/builtinMessageTokens.ts`
- Modify: `packages/logix-form/src/internal/validators/index.ts`
- Modify: `packages/logix-form/src/Rule.ts`

- [ ] **Step 1: 建立 builtin token key 和 token factory 的单点文件**

建议结构：

```ts
export const REQUIRED_KEY = 'logix.form.rule.required'
export const requiredToken = () => token(REQUIRED_KEY)
export const minLengthToken = (min: number) => token('logix.form.rule.minLength', { min })
```

- [ ] **Step 2: 改 `RequiredDecl`**

目标合同：

```ts
export type RequiredDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{
      readonly message?: I18nMessageToken
      readonly trim?: boolean
    }>
```

- [ ] **Step 3: 改 `MinLengthDecl / MaxLengthDecl / MinDecl / MaxDecl / PatternDecl`**

要求：

- 数值和 `pattern` 仍保留原来的 value shorthand
- `message` 只收 `I18nMessageToken`
- 不接受 bare token shorthand
- 默认 day-one 用法继续允许：
  - `Form.Rule.minLength(2)`
  - `Form.Rule.max(10)`
  - `Form.Rule.pattern(/re/)`
- override 一律写成：
  - `Form.Rule.minLength({ min: 2, message: token(...) })`
  - `Form.Rule.pattern({ re: /re/, message: token(...) })`

- [ ] **Step 4: 改 validators 默认返回值**

目标：

- `required()` 返回默认 token
- `minLength(2)` 返回 `token(..., { min: 2 })`
- `pattern(/re/)` 返回默认 pattern token

- [ ] **Step 5: 保持预算检查**

要求：

- 仍走 `ERROR_VALUE_MAX_BYTES`
- 校验对象从 string 扩到 token payload

- [ ] **Step 6: 跑 focused tests 与 typecheck**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts \
  packages/logix-form/test/Rule/Form.Rule.FieldMount.test.ts \
  packages/logix-form/test/Form/Form.Handle.ExactSurface.test.ts

pnpm --filter @logixjs/form typecheck
```

Expected:

- PASS

## Chunk 3: Locale Assets And Subpath

### Task 3: 提供 `@logixjs/form/locales`

**Files:**
- Create: `packages/logix-form/src/locales/enUS.ts`
- Create: `packages/logix-form/src/locales/zhCN.ts`
- Create: `packages/logix-form/src/locales/index.ts`
- Modify: `packages/logix-form/package.json`
- Modify: `packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`

- [ ] **Step 1: 新建 `enUS` catalog**

至少覆盖：

```ts
'logix.form.rule.required'
'logix.form.rule.minLength'
'logix.form.rule.maxLength'
'logix.form.rule.min'
'logix.form.rule.max'
'logix.form.rule.pattern'
```

- [ ] **Step 2: 新建 `zhCN` catalog**

要求：

- 和英文 keys 完全对齐
- 文案使用 `{{min}} / {{max}}`

- [ ] **Step 3: 建 `locales/index.ts`**

要求：

- 只导出 `zhCN`、`enUS`
- 可选导出 `FormBuiltinRuleCatalog` type
- 不从 root `src/index.ts` 透出

- [ ] **Step 4: 改 package exports**

要求：

- `exports['./locales']`
- `publishConfig.exports['./locales']`

- [ ] **Step 5: 跑 focused tests**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts \
  packages/logix-form/test/Form/Form.PackageExportsBoundary.test.ts \
  packages/logix-form/test/Form/Form.RootExportsBoundary.test.ts
```

Expected:

- PASS

## Chunk 4: Collision And Owner Guards

### Task 4: 把 registration owner 和 cross-domain collision 收成门禁

**Files:**
- Create: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts`
- Modify: `packages/logix-form/src/locales/index.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`

- [ ] **Step 1: 在 `locales/index.ts` 提供最小 merge helper 或 assertion primitive**

要求：

- owner 仍停在 application bootstrap
- helper 如果存在，只能是 plain data merge / assertion primitive
- helper 名称不要暗示 runtime registration

建议形态：

```ts
export const assertNoCatalogConflicts = (...catalogs: ReadonlyArray<FormBuiltinRuleCatalog>) => { ... }
```

- [ ] **Step 2: 写 cross-domain collision 测试**

要求：

- default domain catalogs 同 key 冲突时直接抛错
- 报错文案能让用户知道这是 authoring error

- [ ] **Step 3: 写 owner guard proof**

要求：

- registration proof 仍然只展示 app bootstrap merge
- 测试中不出现 `I18n.registerCatalogs` 或 `Form.installLocales`
- 如果 helper 存在，它只出现在 app bootstrap 前，不接触 runtime service

- [ ] **Step 4: 跑 focused tests**

Run:

```bash
pnpm vitest run \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesCollision.test.ts
```

Expected:

- PASS

## Chunk 5: Registration Proof And Example Sweep

### Task 5: 用测试和 examples 把 canonical 写法收口

**Files:**
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/ComplexFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case01-basic-profile.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case04-nested-allocations.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case07-wizard.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case08-region-cascading.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case09-schema-decode.tsx`
- Modify: `examples/logix-react/src/demos/form/cases/case10-conditional-cleanup.tsx`
- Modify: `examples/logix-react/src/modules/rules-composition-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-mixed-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-node-form.ts`
- Modify: `docs/internal/form-api-tutorial.md`

- [ ] **Step 1: 把 registration proof 测试写实**

要求：

- app bootstrap merge domain defaults + app overrides
- `I18n.layer(driver)` 不接 catalogs
- 语言切换后 render 跟随变化
- 示例里如果需要展示 default message 覆盖，优先展示 app catalog override，其次才是 field-level `message: token(...)`

- [ ] **Step 2: 扫 examples 里的 builtin raw string**

迁移规则：

- 有默认文案时，优先改成零参数
- 真要保留领域特定文案时，改成 `message: token(...)`
- 不新增 `Form.installLocales(...)`

- [ ] **Step 3: 收教程**

要求：

- `createAppI18nDriver(...)` 继续保持 app-local placeholder
- builtin canonical 示例继续用零参数

- [ ] **Step 4: 跑 example typecheck**

Run:

```bash
pnpm --filter @examples/logix-react typecheck
```

Expected:

- PASS

- [ ] **Step 5: 跑 residue scan**

Run:

```bash
rg -n "required: '|'message: '|'Form\\.Rule\\.required\\(\" \
  packages/logix-form/test \
  examples/logix-react/src \
  docs/internal/form-api-tutorial.md \
  -S
```

Expected:

- 只剩非 builtin、archive、或明确故意保留的文本

## Chunk 6: Final Verification

### Task 6: 跑整体验证

**Files:**
- Test only

- [ ] **Step 1: 跑 form package suites**

Run:

```bash
pnpm vitest run packages/logix-form/test/Rule packages/logix-form/test/Form
```

Expected:

- PASS

- [ ] **Step 2: 跑 typecheck**

Run:

```bash
pnpm --filter @logixjs/form typecheck
pnpm --filter @logixjs/form typecheck:test
pnpm --filter @examples/logix-react typecheck
pnpm typecheck
```

Expected:

- PASS

- [ ] **Step 3: 跑 diff check**

Run:

```bash
git diff --check
```

Expected:

- PASS

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-form-builtin-i18n-cutover.md`. Ready to execute?
