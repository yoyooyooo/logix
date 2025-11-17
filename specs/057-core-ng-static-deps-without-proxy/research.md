# Research: 057 ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

## Decision 1：ReadQuery 协议分两层（Runtime 结构 vs Static IR）

- Decision：ReadQuery 在运行期需要携带函数（`select/equals`），但统一最小 IR 只接受可序列化结构；因此必须拆成“执行结构”与“静态证据”两层。
- Rationale：避免把闭包塞进 DevtoolsHub / evidence 工件，保持可序列化、可对照、可回放。
- Alternatives considered：
  - 让 Devtools 直接消费函数或源码字符串：不可序列化、不可对照、bundle/压缩后不稳定。

## Decision 2：三段式车道（AOT→JIT→Dynamic）以“可用性优先、严格门禁兜底”

- Decision：默认必须可用（无插件也能跑）；优先 JIT 静态化，失败即 dynamic；在 strict gate 下把 dynamic（或特定 reason）升级为失败。
- Rationale：不把工具链作为前置条件，同时让性能/可解释性可被 CI/perf gate 强约束。
- Alternatives considered：
  - 强制必须装插件：会阻塞 PoC/探索与非构建场景。

## Decision 3：JIT 静态化只覆盖“常见子集”，并把失败显式证据化

- Decision：JIT 只承诺覆盖最常见的“纯取数/struct”子集；其余直接 dynamic，并输出 `fallbackReason`，而不是隐式退化。
- Rationale：避免引入脆弱的全功能解析器或长期运行时税；同时给 Devtools 明确解释与可行动线索。
- Alternatives considered：
  - 运行时 Proxy 隐式追踪：热路径高成本且依赖魔法；与“无 Proxy”方向冲突。

## Decision 4：SelectorGraph 放在 module instance 内核层，并复用 dirtyPaths 作为输入

- Decision：SelectorGraph 属于 module instance 的内部结构，放在 `@logix/core` internal/runtime/core；输入使用现有 `StateTransaction.dirtyPaths`（必要时降级 dirtyAll）。
- Rationale：复用已有 dirty-set 体系（trait converge 已在用），避免引入第二套“影响域”协议。
- Alternatives considered：
  - React 侧各算各的 selector：重复计算/重复比较、难以解释“为何重算”。

## Decision 5：Devtools 必须能区分“车道/降级原因/与 txn 对齐”

- Decision：扩展 `trace:react-selector` meta（lane/producer/fallbackReason/selectorId/readsDigest），并新增 selector eval trace（commit 内发出）以建立 txn→selector→render 因果链。
- Rationale：没有“lane + 原因 + 对齐”，dynamic 回退会变成黑盒；无法治理覆盖率与性能。
- Alternatives considered：
  - 只靠 console/debug logs：不可序列化、无法聚合、无法作为证据门禁。

