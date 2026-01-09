# Quickstart: ReadQuery.createSelector

> 目标：把“组合多个 selector + 派生计算”从闭包写法升级为显式 deps，并保持 static lane（有 readsDigest）。

## 1) 最小示例：组合两个静态输入

```ts
import { ReadQuery } from '@logixjs/core'

type State = {
  user: { firstName: string; lastName: string }
  flags: { readonly isVip: boolean }
}

const selectUser = (s: State) => s.user
const selectFlags = (s: State) => s.flags

const selectUserVM = ReadQuery.createSelector({
  debugKey: 'UserVM',
  inputs: [selectUser, selectFlags],
  result: (user, flags) => ({
    fullName: `${user.firstName} ${user.lastName}`,
    vip: flags.isVip,
  }),
  equalsKind: 'shallowStruct',
})
```

- `inputs` 会先被 `ReadQuery.compile` 归一化，必须进入 static lane（否则 fail-fast）。
- 输出 selector 的 reads 是 `union(inputs.reads)`，因此 `SelectorGraph` 能按 dirtySet 跳过无关评估。

## 2) 显式区分闭包参数（建议）

闭包参数会导致“同源码不同语义”的风险。建议用 `params` 把参数显式纳入 selectorId：

```ts
const makeSelectThresholdVM = (threshold: number) =>
  ReadQuery.createSelector({
    debugKey: 'ThresholdVM',
    params: { threshold },
    inputs: [selectFlags],
    result: (flags) => ({ vip: flags.isVip, threshold }),
    equalsKind: 'shallowStruct',
  })
```

## 3) 什么时候不用它

- 你的 selector 依赖是“参数化的”（例如 `byId(id)`）：除非你能把参数显式纳入 deps/IR，否则很难保持 static。
- 你只是在读一个路径或浅 struct：直接写 `s => s.a.b` / `({ x: s.a, y: s.b })` 让 `ReadQuery.compile` 走 JIT 即可。
