# Research: Host Scenario Patterns Convergence

## Decision 1: `07` 由 host second-wave spec 承接

- `07` 的主要价值是场景矩阵与 examples 锚点
- 它天然跨 `116` 与 `119`

## Decision 2: 先守住 projection / verification 边界

- `RuntimeProvider` / imports scope / local/session/suspend 是 host projection
- verification subtree 是验证入口，不并回 projection

## Decision 3: 直接用 examples 与 verification subtree 固定场景锚点

- 不再通过 package-level surface metadata 固定宿主边界
- 场景矩阵直接对齐到 `examples/logix-react/**` 与 `examples/logix/src/verification/**`
- 双重角色样例必须先声明 primary role
