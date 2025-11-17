# Research: Action 级别定义锚点（ActionToken-ready Manifest）

**Feature**: `specs/067-action-token-manifest/spec.md`  
**Created**: 2026-01-01

> 目标：把本特性的关键裁决固化为可复用结论，避免“实现先跑偏、文档后补”的漂移。

## Decision 1: `ActionRef` 的单一事实源是 `(moduleId, actionTag)`

**Decision**: `ActionRef = { moduleId: string; actionTag: string }`，其中 `actionTag` 以 `_tag` 为权威来源（必要时仅作为输入容错才读取 `type`）。

**Rationale**:

- 与现有运行时身份模型一致：`moduleId/instanceId/txnId` 已是 Devtools 侧的主锚点；Action 只需要补齐 action 维度。
- 足够稳定且可序列化：不依赖 AST、闭包或运行时对象引用。
- 便于 diff 与治理：CI/Studio/Loader 可以统一按该键做 join 与统计。

**Alternatives considered**:

- `actionId = hash(moduleId + actionTag + payloadSchemaDigest)`：更强区分度，但引入 digest 漂移与维护成本，且 actionTag 已足够定位定义。
- `ActionRef = token object identity`：不可跨进程序列化，不适合 full duplex。

## Decision 2: 事件侧不新造协议；复用 `RuntimeDebugEventRef` 作为 Runtime→Studio 的 on-wire 载荷

**Decision**: runtime 事件侧继续以 `RuntimeDebugEventRef` 为唯一导出协议（SSoT 在 `specs/005-unify-observability-protocol/*`）。对 action 事件的 ActionRef 解释规则为：

- `event.kind === "action"` 时：`actionTag = event.label`，`moduleId = event.moduleId`。
- 由消费侧通过 `{ moduleId, actionTag }` 回查 manifest 的 `actions[]` 生成 ActionAnchor。

**Rationale**:

- 避免引入第二套“事件协议”导致平台/Devtools 双真相源。
- `RuntimeDebugEventRef` 已满足 JsonValue 硬门与裁剪语义；action 事件只需要更强的解释层（manifest join），不必改协议本体。

**Alternatives considered**:

- 在 `RuntimeDebugEventRef` 上新增一等字段 `actionRef`：消费更直接，但会触发跨 spec 合同升级与序列化回归；可作为后续 ROI 更高时再做。

## Decision 3: 扩展 `ModuleManifest`：新增 `actions[]` 作为平台级 Action 摘要（并升级 `manifestVersion`）

**Decision**: 将现有 `ModuleManifest` 从 “`actionKeys: string[]`” 升级为带 `actions[]` 的结构化输出：

- `actions[]` 排序按 `actionTag` 字典序稳定排序。
- `actionKeys` 若保留则视为 `actions[].actionTag` 的派生字段（不得成为第二真相源）。
- 引入/升级 `manifestVersion`（建议与 feature id 对齐为 `067`），并同步固化 JSON Schema。

**Rationale**:

- Studio/Devtools 要做“事件 → 定义锚点”的可解释链路，需要至少 payload 形态与 primary reducer 摘要。
- 不依赖 AST：全部信息来自 module 定义反射（actions map / reducers map / dev.source）。

**Alternatives considered**:

- 新建 `ActionManifest` 独立于 `ModuleManifest`：概念更纯，但会在平台侧引入额外 join 与版本管理；与“统一最小 IR”方向相悖。

## Decision 4: Primary reducer 信息的来源为 “定义声明 + setup 注册（可选）”

**Decision**:

- 基线：从 `ModuleTag.reducers`（定义侧 reducers map）提取 `hasPrimaryReducer`（`declared`）。
- 增量：若要覆盖 `$.reducer(tag, fn)`（setup 阶段动态注册），通过 `RuntimeInternals` 暴露“已注册 reducer keys”的可导出视图，在 trial run 时提取并标记为 `registered`。

**Rationale**:

- `$.reducer` 是对外 API（BoundApi），不应让 manifest 在语义上“看不见”它注册的事实。
- 只导出 keys 不导出函数体，满足 Slim + 可序列化约束。

**Alternatives considered**:

- 只支持定义侧 reducers，不支持 `$.reducer` 的提取：实现简单但会导致 manifest/运行时事实源漂移，后续补齐更痛。

## Decision 5: token-first（不依赖 codegen）可以成立，但用户写法必须显式引用 token 符号

**Decision**: 提供最小 `ActionToken` 形态（值级对象，至少包含 `_tag` 与 action creator），让用户在两处都引用同一个 symbol：

- dispatch：`$.actions.dispatch(Token.action(payload))` / `runtime.dispatch(Token.action(payload))`
- watcher：`$.onAction(Token)`（BoundApi 已支持 “传入带 `_tag` 的对象”）

**Rationale**:

- IDE 跳转定义/查找引用/重命名依赖静态 value-level symbol；仅在运行时内部引入 token、但保持用户仍写 `runtime.actions.xxx(...)`（Proxy 动态属性）无法获得 F12 跳转。
- 不依赖 codegen 也能成立（手写 token 即可），但 DX 成本更高；因此 codegen 仍是长期黄金路径。

**Alternatives considered**:

- Proxy/动态 property 生成 token：无法让 TypeScript Language Service 建立“使用点 → 定义点”的静态符号关系。
