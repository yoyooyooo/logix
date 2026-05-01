# Inventory: Verification Template

## Goal

把 examples 下的 verification 子树固定为 `fixtures/env + steps + expect`。

## Template

| Segment | Meaning | Current Carrier |
| --- | --- | --- |
| `fixtures/env` | 运行环境、依赖、layer、host 预设 | `examples/logix/src/verification/README.md` |
| `steps` | 触发顺序、action、trial 操作 | `examples/logix/src/verification/index.ts` |
| `expect` | verdict、summary、关键 artifact 断言 | `examples/logix/src/verification/index.ts` |

## Minimal Example

```ts
{
  fixtures: {
    env: 'runtime.trial(mode=\"startup\") with example layer',
  },
  steps: ['load example', 'run trial', 'collect report'],
  expect: ['verdict=PASS', 'artifacts include trial report'],
}
```
