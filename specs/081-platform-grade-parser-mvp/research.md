# Research: 081 Platform-Grade Parser MVP（AnchorIndex@v1）

## Decision 1：TS 解析使用 `ts-morph`

**Rationale**：

- `081` 需要的不只是“语法树”，还需要在仓库级解析中：
  - 追溯 symbol 定义（例如 `$.use(Tag)` 的 Tag 定义点）；
  - 提取可确定的字面量 key（例如 `Context.Tag("<literal>")`）；
  - 在不执行用户代码的前提下，建立“高置信度”的结构索引。
- `ts-morph` 提供 TypeScript Program + TypeChecker 的可控包装，适合 Node-only 引擎。

**Alternatives considered**：

- 仅用 `swc`：语法解析足够快，但缺少类型系统/符号追溯能力，导致 serviceId 解析与缺口定位只能降级为猜测（违反“宁可漏不乱补”）。

## Decision 2：如需 AST 辅助，使用 `swc`

**Rationale**：

- `swc` 可作为“辅助工具”用于：
  - 某些降级判定（快速识别明显的子集外形态）；
  - 未来 `082` 的 print/minimal-patch 策略探索（仅在需要时启用）。
- 但 `081` 的权威解析仍由 `ts-morph` 负责（避免双真相源）。

## Decision 3：AnchorIndex 输出契约必须可序列化、确定性、可 diff

**Rationale**：

- 该工件会进入 CI/Devtools/平台链路，必须满足：
  - JSON-safe；
  - 同输入字节级一致；
  - 变更可被 diff 捕获且噪音可控。

**Key choices**：

- 默认不输出时间戳；耗时等“非确定性字段”如需输出，必须可配置关闭且默认关闭。
- `entryKey` 采用确定性字段派生（例如 `kind + file + span`），不使用随机值。

## Decision 4：serviceId 的解析策略是“可确定才输出”

**Rationale**：

- 该链路服务 `079` 的自动补全（默认 `port=serviceId`），但错误 serviceId 会直接污染锚点真相源。

**Rule**：

- 仅当 `$.use(TagSymbol)` 且 `TagSymbol` 可追溯到 `Context.Tag("<string literal>")` 时输出 `serviceIdLiteral`；
- 其它情况一律不输出，并记录 reason codes（例如 `unresolved_tag_symbol` / `non_literal_tag_key` / `dynamic_tag_expr`）。

## Decision 5：实现形态尽可能用 `effect`（Node-only 同构）

**Rationale**：

- CLI/engine 前期就是平台落地前的“基础设施”，要求可组合、可测试、可注入（mockable）。
- 统一以 Tag+Layer 组织服务（Parser/FS/Reporter），为后续前端/Node-only 同构打底。
