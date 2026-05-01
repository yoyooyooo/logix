# Contracts: Host Scenario Patterns Convergence

## 1. Scenario Mapping Contract

- 每个标准场景都应有 primary example
- 必要时再连到 verification subtree

## 2. Host Boundary Contract

- `@logixjs/react` 只承接 host projection
- `examples/logix-react/**` 只承接 primary scenario examples
- `@logixjs/sandbox` 只承接 browser trial surface
- verification subtree 不进入 projection package

## 3. Variant Contract

- local / session / suspend 是局部实例协议变体
- `useProcesses(...)` 是 subtree process 安装点
