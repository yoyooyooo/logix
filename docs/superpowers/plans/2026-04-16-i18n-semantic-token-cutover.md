# I18n Semantic Token Cutover Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan. Only switch to `superpowers:subagent-driven-development` when the executing session has been explicitly set to subagent mode. Steps use standard Markdown checkboxes for tracking.

**Goal:** 一次性把 `@logixjs/i18n` 收口到终局公开面：root 只保留纯 token 构造与类型，service 只保留 snapshot、language change、token-oriented render；semantic token 只承接 `key + params`，render fallback 下沉到 render helper，并同步清理所有受影响 tests/examples/docs。

**Architecture:** 这次按 zero-user、forward-only 的单 wave cutover 执行，不保留兼容壳层。公开面冻结为两块：package-level `token(...)` 纯声明入口，service-level `render/renderReady` 运行时渲染入口；`service.token`、`t`、`tReady`、public canonicalizer、token 内 `defaultValue/options` 同波次退出。所有验证围绕同一份 service contract 和“token 不变、snapshot 变化后重渲染文本变化”的 proof 展开。

**Tech Stack:** TypeScript, Effect V4, Vitest, `@logixjs/i18n`, `@logixjs/core`, Logix examples, docs

---

## Adopted Candidate

这份计划执行的唯一终局候选已经冻结为：

- root public surface 只保留：
  - `I18n`
  - `I18nTag`
  - `I18nSnapshotSchema`
  - `token(...)`
  - token contract types
- `token(...)` 是唯一公开 token 构造入口
- public canonicalizer 下沉到 internal
- `I18nService` 只保留：
  - `snapshot`
  - `changeLanguage`
  - `render`
  - `renderReady`
- `service.token`、`t`、`tReady` 退出 public contract
- semantic token contract 只承接：
  - `key`
  - `params`
- `defaultValue` 与其他 render fallback 信息退出 token contract
- fallback 只留在 render helper hints

这份计划不再讨论 helper 名称选择，也不保留“先保留旧入口、后续再清理”的路径。

## Scope

这份计划只覆盖 i18n 包自己的终局 cutover，以及它直接影响的 tests/examples/docs。

包含：

- `@logixjs/i18n` public token contract
- `@logixjs/i18n` public service contract
- i18n tests
- 直接使用 i18n 的 examples
- i18n 相关 SSoT / consumed proposal / quickstart

不包含：

- Form 包实现 cutover
- schema/manual/server error carrier 合同
- React host 语义改造
- 任何兼容层、桥接层、双写期

## File Structure

### Runtime Surface

- Modify: `packages/i18n/src/internal/token/token.ts`
  - semantic token contract 收口到 `key + params`
- Modify: `packages/i18n/src/Token.ts`
  - 对外只导出 semantic token contract 与 `token(...)`
- Modify: `packages/i18n/src/internal/driver/i18n.ts`
  - 删除 `service.token`、`t`、`tReady` 的 public service role；新增唯一 render contract
- Modify: `packages/i18n/src/I18n.ts`
  - public types 同步到新的 service contract
- Modify: `packages/i18n/src/index.ts`
  - root barrel 保持最小表面，不新增 façade

### Tests

- Modify: `packages/i18n/test/Token/MessageToken.test.ts`
  - semantic token contract 单点证明
- Modify: `packages/i18n/test/I18n/ReadySemantics.test.ts`
  - 升格为唯一 render contract 证明面，覆盖 ready/pending/failed/语言切换
- Modify: `packages/i18n/test/I18n/I18n.RootSurfaceBoundary.test.ts`
  - root barrel 边界保持最小
- Modify: `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`
  - service method 集合边界测试

### Examples And Docs

- Modify: `examples/logix/src/i18n-message-token.ts`
  - 状态只持有 semantic token，render 走 service
- Modify: `examples/logix/src/i18n-async-ready.ts`
  - pending/failed fallback 只走 render helper
- Modify: `examples/logix-react/src/modules/i18n-demo.ts`
  - 对齐新的 token/service contract
- Modify: `examples/logix-react/src/demos/I18nDemoLayout.tsx`
  - 对齐新的 token/service contract
- Modify: `specs/029-i18n-root-resolve/quickstart.md`
  - 清掉旧入口与旧字段
- Modify: `docs/ssot/runtime/08-domain-packages.md`
  - 回写最终 i18n surface contract
- Modify: `docs/proposals/form-rule-i18n-message-contract.md`
  - 回写 i18n 已实现去向与最终 helper 名

## Chunk 1: Atomic Contract Cutover

### Task 1: 一次性收口 token 与 service 的唯一公开合同

**Files:**
- Modify: `packages/i18n/src/internal/token/token.ts`
- Modify: `packages/i18n/src/Token.ts`
- Modify: `packages/i18n/src/internal/driver/i18n.ts`
- Modify: `packages/i18n/src/I18n.ts`
- Modify: `packages/i18n/src/index.ts`
- Test: `packages/i18n/test/Token/MessageToken.test.ts`
- Test: `packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts`

- [x] **Step 1: 写 token contract 失败测试，冻结 `key + params`**

在 [packages/i18n/test/Token/MessageToken.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/Token/MessageToken.test.ts) 写或改成下面这组断言：

```ts
it("keeps only semantic params", () => {
  const t = token("form.required", {
    field: "name",
    count: 1,
  })

  expect(t).toEqual({
    _tag: "i18n",
    key: "form.required",
    params: {
      count: 1,
      field: "name",
    },
  })
})

it("rejects render fallback fields", () => {
  expect(() =>
    token("form.required", {
      defaultValue: "Required" as any,
    }),
  ).toThrow()
})
```

- [x] **Step 2: 写 service 边界失败测试，冻结唯一公开 render family**

在 [packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/I18n.ServiceFirstBoundary.test.ts) 写断言，要求 service 只保留：

```ts
expect(Object.keys(service).sort()).toEqual([
  "changeLanguage",
  "render",
  "renderReady",
  "snapshot",
])
```

并明确：

```ts
expect("token" in service).toBe(false)
expect("t" in service).toBe(false)
expect("tReady" in service).toBe(false)
```

- [x] **Step 3: 跑失败测试，确认当前实现确实还在旧合同上**

Run: `pnpm -C packages/i18n test -- MessageToken.test.ts I18n.ServiceFirstBoundary.test.ts`
Expected:

- token 仍输出 `options`
- service 仍有 `token`、`t`、`tReady`

- [x] **Step 4: 修改 token contract 到终局形态**

在 [packages/i18n/src/internal/token/token.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/internal/token/token.ts) 做这些改动：

- `options` 改成 `params`
- `canonicalizeTokenOptions` 改成 internal-only 的 `canonicalizeTokenParams`
- 禁止 `defaultValue`
- 错误提示不再出现 “options/defaultValue” 作为 semantic contract 用语

目标形状：

```ts
export type I18nTokenParams = Readonly<Record<string, JsonPrimitive>>
export type I18nTokenParamsInput = Readonly<Record<string, JsonPrimitive | undefined>>

export type I18nMessageToken = {
  readonly _tag: "i18n"
  readonly key: string
  readonly params?: I18nTokenParams
}
```

- [x] **Step 5: 删除 public canonicalizer 和 `service.token`**

在下面文件里同步删除多余公开入口：

- [packages/i18n/src/Token.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/Token.ts)
- [packages/i18n/src/internal/driver/i18n.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/internal/driver/i18n.ts)
- [packages/i18n/src/I18n.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/I18n.ts)
- [packages/i18n/src/index.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/index.ts)

要求：

- package root 不再导出 public canonicalizer
- service 不再暴露 `token`

- [x] **Step 6: 冻结唯一 render contract**

在 [packages/i18n/src/internal/driver/i18n.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/src/internal/driver/i18n.ts) 把 public render surface 收成一组：

```ts
type I18nRenderHints = {
  readonly fallback?: string
}

type I18nService = {
  readonly snapshot: SubscriptionRef.SubscriptionRef<I18nSnapshot>
  readonly changeLanguage: (language: string) => Effect.Effect<void, never, never>
  readonly render: (token: I18nMessageToken, hints?: I18nRenderHints) => string
  readonly renderReady: (
    token: I18nMessageToken,
    hints?: I18nRenderHints,
    timeoutMs?: number,
  ) => Effect.Effect<string, never, never>
}
```

要求：

- `t/tReady` 退出 public service contract
- fallback 只来自 `hints`
- `driver.t(...)` 可作为内部实现细节继续存在

- [x] **Step 7: 跑 token + service 边界测试**

Run: `pnpm -C packages/i18n test -- MessageToken.test.ts I18n.ServiceFirstBoundary.test.ts I18n.RootSurfaceBoundary.test.ts`
Expected: PASS

- [x] **Step 8: 跑 typecheck**

Run: `pnpm -C packages/i18n typecheck`
Expected: PASS

## Chunk 2: Single Proof Surface

### Task 2: 把 render、ready、语言切换 proof 收到单一测试面

**Files:**
- Modify: `packages/i18n/test/I18n/ReadySemantics.test.ts`

- [x] **Step 1: 把 `ReadySemantics.test.ts` 改成唯一 render contract proof**

在 [packages/i18n/test/I18n/ReadySemantics.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/ReadySemantics.test.ts) 覆盖下面三类行为：

1. 同一 token 在语言切换后 render 结果变化
2. pending/failed 时 fallback 只来自 render hints
3. token identity 不变，变化的是 render 结果和 snapshot

建议断言：

```ts
expect(renderedEn).toBe("Required")
yield* svc.changeLanguage("zh")
expect(renderedZh).toBe("必填")
expect(tokenValue).toEqual(sameToken)
```

- [x] **Step 2: 不新增 `I18n.TokenRender.test.ts`**

要求：

- 删除原计划中新建测试文件的想法
- 所有 runtime render proof 继续收回 [ReadySemantics.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/i18n/test/I18n/ReadySemantics.test.ts)

- [x] **Step 3: 跑 i18n 全测试**

Run: `pnpm -C packages/i18n test`
Expected: PASS

- [x] **Step 4: 跑 i18n test typecheck**

Run: `pnpm -C packages/i18n typecheck:test`
Expected: PASS

## Chunk 3: Atomic Impact-Set Sync

### Task 3: 同波次改完所有受影响 examples、quickstart、docs

**Files:**
- Modify: `examples/logix/src/i18n-message-token.ts`
- Modify: `examples/logix/src/i18n-async-ready.ts`
- Modify: `examples/logix-react/src/modules/i18n-demo.ts`
- Modify: `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- Modify: `specs/029-i18n-root-resolve/quickstart.md`
- Modify: `docs/ssot/runtime/08-domain-packages.md`
- Modify: `docs/proposals/form-rule-i18n-message-contract.md`

- [x] **Step 1: 改两个 core examples**

在下面两个文件里统一改成：

- state 只保存 semantic token
- render 只走 `service.render/renderReady`
- fallback 只通过 render hints 传入

文件：

- [examples/logix/src/i18n-message-token.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/i18n-message-token.ts)
- [examples/logix/src/i18n-async-ready.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix/src/i18n-async-ready.ts)

- [x] **Step 2: 改 React example impact set**

同步改下面两个文件，清掉旧的 token/options/defaultValue 心智：

- [examples/logix-react/src/modules/i18n-demo.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/modules/i18n-demo.ts)
- [examples/logix-react/src/demos/I18nDemoLayout.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/I18nDemoLayout.tsx)

- [x] **Step 3: 改 quickstart**

在 [specs/029-i18n-root-resolve/quickstart.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/029-i18n-root-resolve/quickstart.md)：

- 清掉 `options/defaultValue`
- 清掉 `service.token`
- 清掉 `t/tReady` 作为 public canonical surface 的写法

- [x] **Step 4: 无条件回写 docs**

同步更新：

- [docs/ssot/runtime/08-domain-packages.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md)
- [docs/proposals/form-rule-i18n-message-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-rule-i18n-message-contract.md)

要求：

- 不再出现“过渡实现”“兼容层”“options 仍可保留”这类措辞
- helper 形态与最终字段名写成已冻结事实

- [x] **Step 5: 跑 examples**

Run: `pnpm -C examples/logix exec tsx src/i18n-message-token.ts`
Expected:

- token 结构不随语言变化
- render 文本随语言变化

Run: `pnpm -C examples/logix exec tsx src/i18n-async-ready.ts`
Expected:

- pending/failed 走 render hints fallback
- ready 后走真实语言文本

- [x] **Step 6: 跑最终 grep gate**

Run:

```bash
rg -n "defaultValue|service\\.token|canonicalizeTokenOptions|options\\?" \
  packages/i18n \
  examples/logix/src/i18n-message-token.ts \
  examples/logix/src/i18n-async-ready.ts \
  examples/logix-react/src/modules/i18n-demo.ts \
  examples/logix-react/src/demos/I18nDemoLayout.tsx \
  specs/029-i18n-root-resolve/quickstart.md \
  docs/ssot/runtime/08-domain-packages.md \
  docs/proposals/form-rule-i18n-message-contract.md
```

Expected:

- semantic token contract 口径里不再出现 `defaultValue`
- public/service canonical surface 里不再出现 `service.token`
- token 字段不再写成 `options`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-i18n-semantic-token-cutover.md`. Ready to execute?
