# Contracts: Runtime Final Cutover

本特性不生成 HTTP / OpenAPI / GraphQL 契约。

本目录承接的是 **runtime final cutover 的结构契约**：

## Contract Types

### 1. Public Surface Contract

- canonical public runtime spine 只允许 `Module / Logic / Program / Runtime`
- `Kernel` 只允许作为 expert 升级层
- 不允许并列公开装配、运行、验证入口

### 2. Control Plane Entry Contract

- 一级入口统一为 `runtime.check / runtime.trial / runtime.compare`
- 共享 report contract owner 固定为 `@logixjs/core/ControlPlane`
- 旧 `Observability` trial paths 已退出公开 surface；若仓内测试仍需 raw backing，只能走 internal path
- `Reflection` trial-adjacent paths 只允许作为 backing 或 expert path

### 3. Residue / Allowlist Contract

- forwarding shell、legacy wrapper、旧命名、limbo capability 默认删除
- allowlist 例外必须带 owner、保留理由、退出条件

### 4. Migration Contract

- 每个 remove / downgrade / allowlist 的 public surface 都必须有对应 migration entry
- 受影响 direct consumers 必须能在 migration ledger 中找到自己的去向

### 5. Perf Evidence Contract

- 若命中 steady-state runtime core，必须有 comparable baseline / diff
- diagnostics=off 成本必须保持稳定口径

## Source of Truth

- `spec.md`
- `plan.md`
- 后续 `inventory/*.md`

## Not In Scope

- 不定义网络 API
- 不定义数据库 schema
- 不定义业务实体协议
