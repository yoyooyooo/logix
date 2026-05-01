# Contracts: Declare Run Phase Contract

## 1. Public Phase Contract

- 公开作者面只讲 declaration 语义与 run 语义
- run-only logic 允许存在，但只是 declaration 为空的子集
- 具体拼写可以变化，但公开面只能有一个 builder surface

对应 ledger：

- `phase-surface-ledger.md`
- `public-shape-candidates.md`

## 2. Registration Contract

- `$.lifecycle.*` 属于 declaration-only
- `$.fields(...)` 属于 declaration-only
- late registration 不允许进入 canonical path
- Bound API 内部已经按 declaration-only 注册链与 run-only 能力链分层

## 3. Internal Descriptor Contract

- runtime 可保留 internal normalized descriptor
- internal descriptor 不能反向泄露成公开相位对象
- `setup` 只作为 internal compatibility carrier，公开心智仍是 declaration

## 4. Platform Contract

- Platform 只提供宿主 signal source
- Platform 不定义新的业务作者面 phase

对应 ledger：

- `runtime-descriptor-ledger.md`
