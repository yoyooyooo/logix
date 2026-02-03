# Quickstart: 083 Named Logic Slots（具名逻辑插槽）

> 目标：让平台能看见模块的“逻辑坑位语义”（required/unique/aspect…）以及当前填充情况（slot→logic），并在非法组合时给出可解释门禁。

## 1) 产物是什么

- `slots`：挂在 `ModuleDef` 的可序列化元数据（语义坑位定义）。
- `slot→logic`：可反射导出的填充关系（用于可视化、替换与门禁）。

## 2) 怎么用（最小示例）

1. 在 `Logix.Module.make(id, def)` 的 def 中声明 `slots`（key 必须满足 `/^[A-Za-z][A-Za-z0-9_]*$/`）。
2. 在 `module.logic(build, options)` / `module.withLogic(logic, options)` 的 `options.slotName` 指定填充关系。
3. 用 `Logix.Reflection.extractManifest` 导出 `slots` + `slotFills`（稳定排序，可 diff）。

```ts
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const M = Logix.Module.make('Demo.Slots', {
  state: Schema.Struct({ n: Schema.Number }),
  actions: { noop: Schema.Void } as const,
  slots: {
    Primary: { required: true, kind: 'single' },
    Aspects: { kind: 'aspect' },
  },
})

const Primary = M.logic(() => Effect.void, { id: 'PrimaryLogic', slotName: 'Primary' })
const AspectA = M.logic(() => Effect.void, { id: 'AspectA', slotName: 'Aspects' })
const AspectB = M.logic(() => Effect.void, { id: 'AspectB', slotName: 'Aspects' })

const program = M.implement({ initial: { n: 0 }, logics: [Primary, AspectA, AspectB] })
const manifest = Logix.Reflection.extractManifest(program)

console.log(manifest.slots)     // { Aspects: { kind: 'aspect' }, Primary: { required: true, kind: 'single' } }
console.log(manifest.slotFills) // { Aspects: ['AspectA', 'AspectB'], Primary: ['PrimaryLogic'] }
```

## 3) 如何验收

- 缺失 required slot / 违反 unique slot：必须失败并输出结构化错误（slotName + 冲突 logic refs）。
- slots 定义与 slot→logic 映射：必须稳定排序、可 diff、可 JSON 序列化。

## 4) 常见失败（门禁）

- `slots.requiredMissing`：声明了 `required: true` 但未填充。
- `slots.uniqueConflict`：unique（或 `kind="single"`）slot 被多个逻辑填充。
- `slots.undeclaredSlot`：logic 指定的 `slotName` 未在 `module.slots` 中声明。
