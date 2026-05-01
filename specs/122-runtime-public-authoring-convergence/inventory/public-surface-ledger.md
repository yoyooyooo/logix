# Public Surface Ledger

## Active Canonical Surface

| Surface | Status | Owner Page | Implementation Scope | Notes |
| --- | --- | --- | --- | --- |
| `Module` | canonical | `docs/ssot/runtime/01-public-api-spine.md` | `kernel` | 定义期对象 |
| `Logic` | canonical | `docs/ssot/runtime/03-canonical-authoring.md` | `kernel` | 可复用行为片段 |
| `Program` | canonical | `docs/ssot/runtime/03-canonical-authoring.md` | `kernel` | `Program.make(Module, config)` 是唯一公开装配入口；expert upgrades 也必须经由这一路径装配 |
| `Runtime` | canonical | `docs/ssot/runtime/01-public-api-spine.md` | `kernel` | `Runtime.make(Program)` 是唯一公开运行入口 |
| `RuntimeProvider` | canonical | `docs/ssot/runtime/01-public-api-spine.md` | `canonical-example` | React 宿主入口仍保留，但本轮只改 canonical examples |
