# Contracts: Runtime Public Authoring Convergence

## 1. Public Surface Contract

- `Module / Logic / Program / Runtime / RuntimeProvider` 是主链
- `Program.make(Module, config)` 是唯一公开装配入口
- `apps/docs/**` 不在本轮 canonical 收口范围内

## 2. Expert Surface Contract

- `process`
- `mutate`
- override / disable 一类 expert 能力

## 3. Legacy Exit Contract

- 旧 facade 不自动保留
- 若继续存在，只能带显式退出口径
- deferred 外部用户文档必须在矩阵中标记
