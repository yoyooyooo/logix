# Research: StateSchema + Field Ops（069 · pre-codegen）

**Feature**: `specs/069-schema-first-codegen-action-surface/spec.md`  
**Created**: 2026-01-04  
**Status**: Draft

> 说明：本 research 聚焦 069 的“前半段”——把 state schema 上的 `Schema.annotations`（由 StateSchema 写入）作为单一事实源，在运行时冷路径编译出 actions + reducers；codegen 仅作为后半段的 materialize 手段，不在本阶段强行交付。

## Decisions

### Decision 1: 单一事实源 = state schema 字段 ops + `"logix/stateOps"`（string-key annotations）

**Decision**: `"logix/stateOps"` 作为 v1 固定入口键，附在 state schema 的字段 Schema 上（由 `StateSchema.Field/Struct` 自动写入；业务作者不手写字符串 key）。运行时与未来 codegen 都消费这同一份纯数据蓝图。

**Rationale**:

- 与业务作者心智对齐：真正的模板化源头是 state 字段（一个字段多个 op），避免为每个 op 再手写 action map。
- IDE 落点更自然：字段/op 的定义点在 state schema 内（同屏可审阅）；从 `$.fields.<path>.<op>` 回链更直观。
- effect v3 的 Schema AST 允许 string-key annotations：`schema.ast.annotations["logix/stateOps"]` 可直接读取（`SchemaAST.getAnnotation` 仅支持 symbol key，不适用于自定义 string key）。

**Notes**:

- 约定：`StateSchema.*` 写入的蓝图必须落在最终 Schema AST 上；避免在中间层写入后又被 transformation/refinement 包裹导致读取口径不一致。

---

### Decision 2: Field Ops 语义由运行时实现（冷路径编译），不依赖 codegen

**Decision**: 在 `Module.make` 冷路径读取 `"logix/stateOps"` 蓝图并编译 **派生 actions + 派生 reducers**；`$.fields.<path>.<op>(payload?)` 只是对这些派生 actions 的 thin dispatch façade。

**Rationale**:

- 避免“DX 依赖工具链”：无 codegen 也能工作；蓝图本身就是可审阅的源码落点。
- 避免双真相源：运行时是语义裁决者；codegen 只负责 materialize（例如生成 `.gen.ts` 或 patch），不复制语义。
- 性能可控：只在 Module.make 冷路径做一次扫描/校验/编译；dispatch/txn 热路径不做解释。

---

### Decision 3: actionTag 生成规则 = statePath + opName（deterministic，允许 override）

**Decision**: 默认 `actionTag = <statePath.join('.')> + ':' + <opName>`；并允许在单个 op 上用 `tag` 显式 override（用于重构/重命名时保持协议稳定）。

**Rationale**:

- 对业务作者可预测：不需要额外维护 actionTag 常量。
- deterministic：同一 state schema 输入必然得到同一 tag 列表（可 diff、可审计）。
- forward-only 演进下仍允许“保持 tag 不变但重构字段结构”的极少数场景（显式 override 即可）。

---

### Decision 4: reducers 生成优先复用 `ModuleTag.Reducer.mutate`（保持 patchPaths/事务语义一致）

**Decision**: 派生 reducers 通过 `ModuleTag.Reducer.mutate` 构造，以复用现有“mutative draft → immutable state + patchPaths”机制。

**Rationale**:

- 保持 067 的 reducer 语义（payload-first + patchPaths sink）一致。
- 避免引入第二套 patchPaths/dirtyPaths 推导，降低性能与诊断风险。

---

### Decision 5: 校验策略 = fail fast（模块定义期），错误必须可定位/可 diff

**Decision**:

- `logix/*` 下 unknown key 一律拒绝（fail fast）。
- 每个字段 op 的隐式 target（字段 path）必须能被 state schema AST 静态验证；不满足直接抛错。
- `push` 只允许数组字段；`merge` 只允许对象字段；`toggle` 只允许 boolean 字段；不满足直接抛错。

**Rationale**:

- 避免静默生成错误 reducers，防止运行期才发现数据被写坏。
- “错误即证据”：错误信息稳定、可 diff，便于 CI/Code Review 审计。

---

### Decision 6: DX 增强 = `StateSchema`（作者入口）作为可跳转锚点；codegen 只做后半段 materialize

**Decision**: `StateSchema.Struct/Field` 是唯一推荐作者入口：它在源码中天然形成字段/op 的锚点；底层只是把纯数据蓝图写入 `"logix/stateOps"`。codegen 若存在，只负责 materialize（可选生成 `.gen.ts`，并携带回链 sourceRef）。

**Rationale**:

- 业务侧不再手写字符串 key 与蓝图结构细节，降低 typo 与 unknown key 的运行时失败。
- “定义点”回归 state schema 字段本身，符合心智与可审阅性。

## Alternatives Considered

1) **action-first（`"logix/action"` 贴在 payload schema 上）**  
优点是与 067 的手写 actions 形态一致；但对日常业务而言收益偏小（reducer 样板短、但 action map 与 tag 维护仍在），且 “一个字段多 op” 的组织性较弱。

2) **codegen-only（运行时不做派生）**  
DX 强依赖工具链；且容易把“语义”复制进生成器，形成并行真相源。

3) **把 reducer 函数直接塞进 annotations**  
违反“蓝图必须可序列化/可 diff”的约束；也会导致 manifests/诊断难以保持 Slim。
