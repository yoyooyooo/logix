# Inventory: Example Templates

## Directory Template

- `features/`
  - feature-first 样例
- `patterns/`
  - 可复用 pattern 样例
- `runtime/`
  - runtime root / layer / host 预设
- `scenarios/`
  - 面向 docs 的场景样例
- `verification/`
  - 面向 `fixtures/env + steps + expect` 的验证入口

## Placement Rule

- 若主要服务 docs 讲解，优先进 `scenarios/`
- 若主要服务复用，优先进 `patterns/`
- 若主要服务 trial / compare 输入，优先进 `verification/`
