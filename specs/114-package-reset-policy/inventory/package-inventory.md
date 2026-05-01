# Inventory: Package Inventory

## Snapshot

- Date: 2026-04-05
- Source: `packages/*/package.json`, `packages/*/src`, `packages/*/test`
- Goal: 给每个关键包一个当前定位、目标家族、owner spec、初始处置判断

## Package Ledger

| Dir | Package | Family | Owner Spec | Initial Disposition | Notes |
| --- | --- | --- | --- | --- | --- |
| `packages/logix-core` | `@logixjs/core` | core | `115` | `preserve` | 保留 canonical 名称，内部显式下沉 `kernel` |
| `packages/logix-core-ng` | `@logixjs/core-ng` | core | `115` | `merge-into-kernel` | 退出并列主线，吸收到 kernel support matrix |
| `packages/logix-react` | `@logixjs/react` | host | `116` | `freeze-and-rebootstrap` | 保留包名，重排 provider/hooks/store/platform |
| `packages/logix-sandbox` | `@logixjs/sandbox` | host | `116` | `freeze-and-rebootstrap` | 围绕 trial/control plane 重启 |
| `packages/logix-test` | `@logixjs/test` | host | `116` | `freeze-and-rebootstrap` | 围绕 test runtime、assertions、vitest integration 重启 |
| `packages/logix-devtools-react` | `@logixjs/devtools-react` | host | `116` | `freeze-and-rebootstrap` | 保留观测 UI 价值，退出第二诊断事实源 |
| `packages/logix-query` | `@logixjs/query` | domain | `117` | `freeze-and-rebootstrap` | 以 program-first 重新收口主输出形态 |
| `packages/logix-form` | `@logixjs/form` | domain | `117` | `freeze-and-rebootstrap` | 保留 form 领域语义，重做与 field-kernel、react 子树边界 |
| `packages/i18n` | `@logixjs/i18n` | domain | `117` | `freeze-and-rebootstrap` | 以 service-first 收口，处理 `I18nModule` 去向 |
| `packages/domain` | `@logixjs/domain` | domain | `117` | `freeze-and-rebootstrap` | 以 pattern-kit 方向重启 |
| `packages/logix-cli` | `@logixjs/cli` | cli | `118` | `freeze-and-rebootstrap` | 旧命令面封存，新主线转向 control plane |
| `packages/speckit-kit` | `speckit-kit` | tooling | out-of-cutover | `preserve` | 当前不属于 logix runtime 主线 cutover |

## Adjacent Non-Package Scope

| Path | Owner Spec | Relationship |
| --- | --- | --- |
| `examples/logix` | `119` | 作为 package cutover 的验证与 examples 邻接层，单独收口 |

## Current Reading

- 当前激进 cutover 的默认姿势是保留 canonical 包路径，把旧实现迁出主线，再从同一路径重建
- `preserve` 只表示 canonical 名称保留，不表示现有内部目录原样延续
