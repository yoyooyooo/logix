# Inventory: Shared Control Plane

## Goal

把四个宿主包共同依赖的 `kernel + runtime control plane` 契约先写成一份可复用说明。

## Shared Contract

| Surface | Owner Package | Consumers | Notes |
| --- | --- | --- | --- |
| `runtime.check / runtime.trial / runtime.compare` | `@logixjs/core` | `@logixjs/react`, `@logixjs/sandbox`, `@logixjs/test`, `@logixjs/devtools-react` | 宿主包只消费这条 control plane，不各自发明验证主线 |
| shared snapshot / state evidence | `@logixjs/core` observability | `@logixjs/devtools-react`, `@logixjs/test` | devtools/test 只能消费共享证据 |
| no-tearing runtime store contract | `@logixjs/react` | `@logixjs/react`, `@logixjs/devtools-react` | React host 继续承担单快照读取语义 |
| trial surface artifacts | `@logixjs/sandbox` | `@logixjs/test`, `@logixjs/devtools-react` | sandbox 输出的 logs/traces/stateSnapshot/uiIntents 要和统一证据面兼容 |

## Reading

- `@logixjs/react` 提供宿主运行入口
- `@logixjs/sandbox` 提供受控 trial surface
- `@logixjs/test` 提供统一测试驱动壳层
- `@logixjs/devtools-react` 只提供观测 UI
