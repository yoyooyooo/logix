# Logix

[English](README.md) | [中文](README.zh-CN.md)

Logix 是一个 **Effect-native 的前端状态与业务逻辑运行时**。

本仓库是当前活跃的 Logix Monorepo：包含运行时包、React 绑定、领域包、Devtools、Sandbox / runtime lab、示例和项目规范。
当前线按 forward-only 演进，并作为未来 Logix 主线推进。

## 项目状态

- Logix 正在积极演进，公开 API 仍可能继续激进收口。
- 新 runtime 工作只面向 Effect v4。本仓当前固定使用 `effect@4.0.0-beta.28` 及相关 Effect 配套包。
- 发布由 tag 驱动。推送 `logix-v*` tag 会触发 npm 发布；普通 `main` push 和 PR 合入不发布。
- 默认发布通道是 stable `latest`；prerelease 通道使用显式 tag，例如 `logix-v1.2.3-beta.1`。规则见 [Release Lane Standard](docs/standards/release-lane-standard.md)。
- 当前设计事实源在 [docs/ssot](docs/ssot/README.md)、[docs/standards](docs/standards/README.md) 和 [logix-best-practices](skills/logix-best-practices/SKILL.md)。

## 默认主链

```text
Module.logic(id, build)
  -> Program.make(Module, config)
  -> Runtime.make(Program)
  -> RuntimeProvider + useModule + useSelector
```

- `Module` 定义 state 和 action contract。
- `Module.logic(id, build)` 给模块挂行为。build 阶段同步登记声明，返回值是 run effect。
- `Program.make(Module, config)` 装配 initial state、logic、services 和 imports。
- `Runtime.make(Program)` 承接执行容器。
- React 读侧走 `useSelector(handle, selector, equalityFn?)`，实例解析走 `useModule(...)`。

## 最小 core 切片

```ts filename="counter.ts"
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

export const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

export const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(
      $.state.update((state) => ({ count: state.count + 1 })),
    )
  }),
)

export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const counterRuntime = Logix.Runtime.make(CounterProgram)
```

## React host 切片

```tsx filename="App.tsx"
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import { Counter, counterRuntime } from './counter'

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (state) => state.count)

  return (
    <button type="button" onClick={() => counter.dispatchers.inc()}>
      Count: {count}
    </button>
  )
}

export function App() {
  return (
    <RuntimeProvider runtime={counterRuntime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## Logix 负责什么

- State / action contract 与模块身份。
- 通过 `Program` 挂载的 Effect 业务逻辑。
- runtime scope 内的 service wiring 与 child program imports。
- React host 投影、模块实例解析和 selector 订阅。
- Form、Query、I18n、Domain pattern kits 等回到同一 runtime law 的领域包。
- `Runtime.check(...)`、`Runtime.trial(...)` 等验证与诊断控制面入口。

## 运行本仓库

```bash
pnpm install
pnpm check:effect-v4-matrix
pnpm typecheck
pnpm test:turbo
```

运行 React 示例：

```bash
pnpm -C examples/logix-react dev
```

运行文档站：

```bash
pnpm -C apps/docs dev
```

## 包结构

- `@logixjs/core`：Module、Program、Runtime、control-plane facade。
- `@logixjs/react`：React bindings、`RuntimeProvider`、`useModule`、`useSelector` 和 dispatch helpers。
- `@logixjs/form`：当前 runtime 的 Form 领域包。
- `@logixjs/query`：当前 runtime 的 Query 领域包。
- `@logixjs/domain`：Program-first domain pattern kits。
- `@logixjs/i18n`：I18n 领域包。
- `@logixjs/cli`：Node-only runtime control-plane CLI。
- `@logixjs/devtools-react`：React Devtools UI。
- `@logixjs/playground`：可嵌入 playground components。
- `@logixjs/sandbox`：浏览器 Worker sandbox runtime。
- `@logixjs/test`：测试工具。
- `@logixjs/perf-evidence`：私有 CI / performance evidence 工具。

## 文档入口

- Docs 根入口：[docs/README.md](docs/README.md)
- Public API spine：[docs/ssot/runtime/01-public-api-spine.md](docs/ssot/runtime/01-public-api-spine.md)
- Canonical authoring：[docs/ssot/runtime/03-canonical-authoring.md](docs/ssot/runtime/03-canonical-authoring.md)
- React host boundary：[docs/ssot/runtime/10-react-host-projection-boundary.md](docs/ssot/runtime/10-react-host-projection-boundary.md)
- API guardrails：[docs/standards/logix-api-next-guardrails.md](docs/standards/logix-api-next-guardrails.md)
- Performance observability：[docs/standards/kernel-performance-observability-standard.md](docs/standards/kernel-performance-observability-standard.md)
- Release lane：[docs/standards/release-lane-standard.md](docs/standards/release-lane-standard.md)
- Agent guidance：[skills/logix-best-practices/SKILL.md](skills/logix-best-practices/SKILL.md)

## 开发命令

- Effect baseline：`pnpm check:effect-v4-matrix`
- 构建 packages：`pnpm build:pkg`
- 类型检查：`pnpm typecheck`
- 代码规范：`pnpm lint`
- 测试：`pnpm test`（或 `pnpm test:turbo`）
- Release plan：`pnpm release:check`
- 创建默认的 stable patch tag：`pnpm release:tag --push`
- 创建 stable minor tag：`pnpm release:tag minor --push`

如果 `release:tag` 从干净的本地 `main` 执行，会先自动切到 `release/logix-v<semver>` 再创建 tag。`release:check` 只预览计划。
