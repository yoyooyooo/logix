# Form Builtin Message Authoring Sugar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Form` builtin rule 的窄 allowlist raw string sugar 真正落地，只允许它停在显式 `message` slot 与 `Form.Rule.make({ required/email: "..." })`，并保证 raw string 只在 Form authoring edge 存在。

**Architecture:** 这次实现只改 `@logixjs/form` 的 builtin validator parser 与少量 i18n-facing locale assets，不改 `FormErrorLeaf.message`、不改 `@logixjs/i18n` 公共 carrier、也不新增公开 noun。执行顺序固定为先写失败测试锁住 allowlist、lowering invariant 和 render 行为，再补 internal lowering helper，把 raw string 立刻 lower 成结构化 token，最后同步 living docs 到已实施口径。

**Tech Stack:** TypeScript, Effect V4, Vitest, `@logixjs/form`, `@logixjs/i18n`

---

## File Map

- Modify: `packages/logix-form/src/internal/validators/index.ts`
  - 扩 builtin decl 输入矩阵，补 internal raw string lowering helper，只允许闭集位置进入 parser。
- Modify: `packages/logix-form/src/Rule.ts`
  - 让 `RuleConfig.required` 与 `RuleConfig.email` 接受已冻结的 string shorthand。
- Modify: `packages/logix-form/src/internal/validators/builtinMessageTokens.ts`
  - 新增内部 literal-style builtin key 常量与 token factory，供 parser lowering 与 locale catalogs 复用。
- Modify: `packages/logix-form/src/locales/enUS.ts`
  - 补 raw string lowering 用到的 internal render key 模板。
- Modify: `packages/logix-form/src/locales/zhCN.ts`
  - 补 raw string lowering 用到的 internal render key 模板。
- Modify: `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
  - 把“raw string 一律拒绝”改成“allowlist 接受，越界位置继续拒绝”，同时锁 lowering invariant。
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`
  - 锁 locale key 集合包含 raw string lowering 所需的内部 key。
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
  - 锁 string sugar 经 `I18n.layer(driver)` 渲染后得到原始文本，证明 authoring edge 之后看到的是结构化 token。
- Modify: `docs/ssot/form/13-exact-surface-contract.md`
  - 把 raw string sugar 从“讨论/允许位置”收成“v1 已实施的闭集 allowlist”。
- Modify: `docs/ssot/runtime/08-domain-packages.md`
  - 把 i18n 页面上的 future reopen 语气改成当前事实，明确公共 carrier 仍不变。
- Modify: `docs/internal/form-api-tutorial.md`
  - 把教程中的 sugar 口径改成当前已实现，并保持教学顺序仍是零参数 builtin > token override > raw string sugar。

## Chunk 1: 测试先锁 allowlist 和 lowering invariant

### Task 1: 锁住 builtin authoring 输入矩阵

**Files:**
- Modify: `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`

- [ ] **Step 1: 写失败测试，明确允许位置与禁止位置**

```ts
it('accepts raw string only at frozen builtin message slots', () => {
  const requiredByMake = Form.Rule.make<string>({ required: '请输入姓名' })
  const emailByMake = Form.Rule.make<string>({ email: '邮箱格式错误' })
  const minLength = Form.Rule.minLength({ min: 2, message: '至少 2 位' })
  const pattern = Form.Rule.pattern({ re: /^[0-9]+$/, message: '只能输入数字' })

  const requiredErr = requiredByMake.required.validate('', {} as any)
  const emailErr = emailByMake.email.validate('bad', {} as any)
  const minLengthErr = minLength('a')
  const patternErr = pattern('abc')

  expect(requiredErr).toMatchObject({ _tag: 'i18n' })
  expect(emailErr).toMatchObject({ _tag: 'i18n' })
  expect(minLengthErr).toMatchObject({ _tag: 'i18n' })
  expect(patternErr).toMatchObject({ _tag: 'i18n' })
})

it('still rejects raw string outside the frozen allowlist', () => {
  expect(() => Form.Rule.required('legacy raw string' as never)).toThrow()
  expect(() => Form.Rule.email('legacy raw string' as never)).toThrow()
})
```

- [ ] **Step 2: 运行单测，确认它先失败**

Run: `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
Expected: FAIL，报错点集中在 string 输入仍被当成非法 `I18nMessageToken`

- [ ] **Step 3: 保留一个 lowering invariant 断言**

```ts
expect(typeof requiredErr).toBe('object')
expect(requiredErr).not.toBe('请输入姓名')
```

- [ ] **Step 4: 暂不提交，进入实现**

当前仓库策略要求只有用户明确要求时才提交；此处只保留工作树 diff。

### Task 2: 锁住 render 行为与 locale key 集

**Files:**
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`

- [ ] **Step 1: 写失败测试，验证 string sugar 渲染结果仍是原文**

```ts
it.effect('renders raw string sugar through I18n.layer(driver)', () =>
  Effect.gen(function* () {
    const svc = yield* Effect.service(I18nTag).pipe(Effect.orDie)
    const err = Form.Rule.make<string>({ required: '请输入姓名' }).required.validate('', {} as any) as any
    expect(err).toMatchObject({ _tag: 'i18n' })
    expect(svc.render(err)).toBe('请输入姓名')
    yield* svc.changeLanguage('zh')
    expect(svc.render(err)).toBe('请输入姓名')
  }).pipe(Effect.provide(I18n.layer(createAppI18nDriver(resources)))))
```

- [ ] **Step 2: 写失败测试，锁 locale key 集合新增内部 lowering key**

```ts
expect(Object.keys(enUS).sort()).toEqual(Object.keys(zhCN).sort())
expect(enUS).toHaveProperty('logix.form.rule.literal')
```

- [ ] **Step 3: 运行两组单测，确认它们先失败**

Run: `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
Expected: FAIL，缺少内部 locale key 或 render 结果不等于原始文本

- [ ] **Step 4: 暂不提交，进入实现**

当前仓库策略要求只有用户明确要求时才提交；此处只保留工作树 diff。

## Chunk 2: 实现 parser widening 与 internal lowering

### Task 3: 在 builtin validator parser 收口 raw string

**Files:**
- Modify: `packages/logix-form/src/internal/validators/index.ts`
- Modify: `packages/logix-form/src/Rule.ts`
- Modify: `packages/logix-form/src/internal/validators/builtinMessageTokens.ts`

- [ ] **Step 1: 在 `builtinMessageTokens.ts` 新增 internal lowering key**

```ts
export const LITERAL_KEY = 'logix.form.rule.literal'
export const literalToken = (text: string): I18nMessageToken => token(LITERAL_KEY, { text })
```

- [ ] **Step 2: 在 `validators/index.ts` 新增 raw string lowering helper**

```ts
const lowerBuiltinMessage = (label: string, value: unknown): I18nMessageToken => {
  if (typeof value === 'string') {
    return errorValue(label, literalToken(value)) as I18nMessageToken
  }
  return expectBuiltinMessageToken(label, value)
}
```

- [ ] **Step 3: 只在闭集位置接入这个 helper**

```ts
export type RequiredDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{ readonly message?: string | I18nMessageToken; readonly trim?: boolean }>

export type EmailDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{ readonly message?: string | I18nMessageToken }>
```

并保持：

- `required()` / `email()` direct builder 继续拒绝 bare string positional shorthand
- `minLength / maxLength / min / max / pattern` 只在 object `message` property 接受 string
- `Rule.make({ required/email: "..." })` 成为唯一 string shorthand

- [ ] **Step 4: 在 `Rule.ts` 扩 `RuleConfig` 输入矩阵**

```ts
readonly required?: Validators.RequiredDecl | string
readonly email?: Validators.EmailDecl | string
```

这里要保持其余 builtin 不跟着开放 string shorthand。

- [ ] **Step 5: 运行聚焦单测，确认 parser 行为通过**

Run: `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
Expected: PASS

- [ ] **Step 6: 暂不提交，进入 locale/render 对齐**

当前仓库策略要求只有用户明确要求时才提交；此处只保留工作树 diff。

### Task 4: 用 locale assets 保证 string sugar 可渲染

**Files:**
- Modify: `packages/logix-form/src/locales/enUS.ts`
- Modify: `packages/logix-form/src/locales/zhCN.ts`

- [ ] **Step 1: 为 internal lowering key 增加模板**

```ts
[LITERAL_KEY]: '{{text}}'
```

- [ ] **Step 2: 确认 key set 仍对齐**

Run: `pnpm vitest run packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
Expected: PASS

- [ ] **Step 3: 确认 raw string 在 render 后仍保持原文**

Run: `pnpm vitest run packages/logix-form/test/Rule`
Expected: PASS

- [ ] **Step 4: 暂不提交，进入 docs 回写**

当前仓库策略要求只有用户明确要求时才提交；此处只保留工作树 diff。

## Chunk 3: living docs 回写到已实施口径

### Task 5: 回写 SSoT 与教程

**Files:**
- Modify: `docs/ssot/form/13-exact-surface-contract.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/internal/form-api-tutorial.md`

- [ ] **Step 1: 更新 `13-exact-surface-contract.md`**

把这几条写成已实施事实：

- raw string sugar v1 已实现
- 允许位置仍是闭集
- direct builder positional string 继续禁止
- teaching order 不变

- [ ] **Step 2: 更新 `08-domain-packages.md`**

把 i18n 页里关于 non-i18n future sugar 的语气改成当前事实：

- Form builtin authoring edge 已有窄 sugar
- i18n 公共 carrier 与 render contract 继续不变

- [ ] **Step 3: 更新 `form-api-tutorial.md`**

保留 canonical 教学顺序，同时把示例补成：

```ts
Form.Rule.make({
  required: '请输入姓名',
  email: token('profile.email.invalid'),
})
```

并明确这条 sugar 只是 convenience path。

- [ ] **Step 4: 运行文本搜索，确认没有自相矛盾口径残留**

Run: `rg -n "如果未来进入实现|legacy raw string builtin messages|只认 I18nMessageToken" docs/ssot/form/13-exact-surface-contract.md docs/ssot/runtime/08-domain-packages.md docs/internal/form-api-tutorial.md packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
Expected: 只剩与新口径一致的命中

- [ ] **Step 5: 暂不提交，进入最终验证**

当前仓库策略要求只有用户明确要求时才提交；此处只保留工作树 diff。

## Chunk 4: 验证与收尾

### Task 6: 跑完相关验证门

**Files:**
- Modify: `packages/logix-form/src/internal/validators/index.ts`
- Modify: `packages/logix-form/src/Rule.ts`
- Modify: `packages/logix-form/src/internal/validators/builtinMessageTokens.ts`
- Modify: `packages/logix-form/src/locales/enUS.ts`
- Modify: `packages/logix-form/src/locales/zhCN.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts`
- Modify: `packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts`
- Modify: `docs/ssot/form/13-exact-surface-contract.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/internal/form-api-tutorial.md`

- [ ] **Step 1: 跑 rule 相关测试**

Run: `pnpm vitest run packages/logix-form/test/Rule`
Expected: PASS

- [ ] **Step 2: 跑 form 包类型检查**

Run: `pnpm --filter @logixjs/form typecheck`
Expected: PASS

- [ ] **Step 3: 跑 form 测试类型检查**

Run: `pnpm --filter @logixjs/form typecheck:test`
Expected: PASS

- [ ] **Step 4: 跑全仓类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: 跑 diff 健康检查**

Run: `git diff --check`
Expected: 无输出

- [ ] **Step 6: 若用户要求再做提交**

```bash
git add \
  docs/internal/form-api-tutorial.md \
  docs/ssot/form/13-exact-surface-contract.md \
  docs/ssot/runtime/08-domain-packages.md \
  docs/superpowers/plans/2026-04-18-form-builtin-message-authoring-sugar.md \
  packages/logix-form/src/Rule.ts \
  packages/logix-form/src/internal/validators/builtinMessageTokens.ts \
  packages/logix-form/src/internal/validators/index.ts \
  packages/logix-form/src/locales/enUS.ts \
  packages/logix-form/src/locales/zhCN.ts \
  packages/logix-form/test/Rule/Form.Rule.Builtins.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocales.test.ts \
  packages/logix-form/test/Rule/Form.Rule.BuiltinLocalesRegistration.test.ts
git commit -m "feat: add form builtin message authoring sugar"
```

当前会话默认不自动执行提交。
