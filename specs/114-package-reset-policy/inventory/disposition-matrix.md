# Inventory: Disposition Matrix

## Enum Contract

| Enum | Meaning | Typical Use |
| --- | --- | --- |
| `preserve` | 保留 canonical 包路径与主线定位 | 已对齐主链，只需内部压缩或边界重排 |
| `freeze-and-rebootstrap` | 旧实现封存，主线路径原位重建 | 旧语义与新主线偏差较大，但包名仍有价值 |
| `merge-into-kernel` | 退出独立主线，能力并入 `@logixjs/core` 的 kernel 线 | 典型是 `core-ng` |
| `drop` | 停止增长并退出本轮主线 | 当前没有关键 runtime 包落此类 |

## Matrix

| Package | Family | Disposition | Owner Spec | Docs Writeback | Rationale |
| --- | --- | --- | --- | --- | --- |
| `@logixjs/core` | core | `preserve` | `115` | `runtime/01`, `runtime/02`, `runtime/04` | 保留主包地位，在包内显式拆出 kernel |
| `@logixjs/core-ng` | core | `merge-into-kernel` | `115` | `runtime/02`, `runtime/04`, `115/support-matrix` | 不再并列主线存在 |
| `@logixjs/react` | host | `freeze-and-rebootstrap` | `116` | `runtime/04`, `runtime/07` | 现有 React 语义可复用，但目录和默认入口需重排 |
| `@logixjs/sandbox` | host | `freeze-and-rebootstrap` | `116` | `runtime/09`, `runtime/07` | 要围绕 `runtime.trial` 与 controlled env 收口 |
| `@logixjs/test` | host | `freeze-and-rebootstrap` | `116` | `runtime/09` | 要与统一 verification control plane 对齐 |
| `@logixjs/devtools-react` | host | `freeze-and-rebootstrap` | `116` | `runtime/04`, `runtime/09` | 保留 devtools 价值，压掉第二诊断真相源 |
| `@logixjs/query` | domain | `freeze-and-rebootstrap` | `117` | `runtime/08` | 以 program-first 重建主输出形态 |
| `@logixjs/form` | domain | `freeze-and-rebootstrap` | `117` | `runtime/06`, `runtime/08` | 重新固定 form 与 field-kernel、react 子树边界 |
| `@logixjs/i18n` | domain | `freeze-and-rebootstrap` | `117` | `runtime/08` | 以 service-first 收口，旧模块入口退出主线 |
| `@logixjs/domain` | domain | `freeze-and-rebootstrap` | `117` | `runtime/08` | 以 pattern-kit 方向重建 |
| `@logixjs/cli` | cli | `freeze-and-rebootstrap` | `118` | `runtime/09` | 命令面切到 `check / trial / compare` |
| `speckit-kit` | tooling | `preserve` | out-of-cutover | N/A | 当前不阻塞 runtime cutover |

## Immediate Implications

- `freeze-and-rebootstrap` 只处理目录与默认语义，不等于丢弃所有已对齐实现
- 所有 `freeze-and-rebootstrap` 包都必须先补 reuse ledger，再动目录

## Successor Template Map

- core family 继承 `family-templates.md#core-family`
- host family 继承 `family-templates.md#host-family`
- domain family 继承 `family-templates.md#domain-family`
- cli family 继承 `family-templates.md#cli-family`
- tooling family 继承 `family-templates.md#tooling-family`
