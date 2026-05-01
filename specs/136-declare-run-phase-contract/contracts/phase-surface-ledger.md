# Phase Surface Ledger: Declare Run Phase Contract

## Declaration

只允许停在 Logic builder 的同步声明区：

- `$.readyAfter(effect, { id?: string })`
- `$.fields(...)`

约束：

- 不读 Env
- 不订阅 action or state
- 不启动长生命周期任务
- 只做注册 or freeze 前声明

Superseded ledger:

- public `$.lifecycle.*` authoring family has been removed by `../170-runtime-lifecycle-authoring-surface/spec.md`
- readiness now uses `$.readyAfter(...)`
- long-lived work uses returned run effect
- dynamic cleanup uses Effect Scope finalizer
- failure observation uses Runtime / Provider / diagnostics
- host signals use Platform / host carrier

## Run

只允许停在返回的 run effect：

- `$.onAction(...)`
- `$.onState(...)`
- `$.on(...)`
- `$.use(...)`
- `$.root.resolve(...)`
- 长生命周期任务与运行期 effect

约束：

- readiness or fields 的 late registration 禁止进入 run

## Expert Only

- internal normalized descriptor
- internal phase ref
- internal setup or run naming

这些能力可以继续存在于 runtime internals，不能反向泄露成公开 phase object。
