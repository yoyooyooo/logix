# Data Model: StateSchema + Field Ops（069 · pre-codegen）

**Feature**: `specs/069-schema-first-codegen-action-surface/spec.md`  
**Created**: 2026-01-04  
**Updated**: 2026-01-04

> 说明：本特性不涉及持久化存储；此处的 “Data Model” 指可被 codegen 与 runtime 共同消费的 **Blueprint（Static）**，以及运行时冷路径编译产出的派生结构（非协议）。

## Entities

### 1) `"logix/stateOps"`（StateOpsBlueprintV1，Schema.annotations 载体）

**Represents**: 附在 **state 字段 Schema** 上的 “字段 ops 蓝图”。v1 用于派生 actions + reducers 与 DX 提示，不改变 067 的 ActionRef/事件协议语义。

**Fields**:

- `scope?: "public" | "internal"`：可见性提示（默认 public）
- `group?: string`：分组/导航提示
- `summary?: string`：简短描述（用于注释/契约摘要）
- `ops: Record<string, StateOpBlueprintV1>`：字段允许的 op 集合（key = `opName`）

**Rules**:

- 必须是纯数据（JSON-serializable）；禁止函数/类实例/循环引用。
- 运行时与未来 codegen 的真相源统一为本蓝图；禁止复制语义到生成器内部。
- `logix/*` 命名空间下 unknown key 必须 fail fast（防止 typo 漂移）。

---

### 2) StateOpBlueprintV1

**Represents**: “对当前字段（隐式 target=该字段 path）执行哪种低风险写入模式”的最小蓝图（v1）。

**Fields**:

- `mode: "assign" | "merge" | "push" | "toggle"`
- `tag?: string`：actionTag override（用于重构时保持 tag 稳定）
- `summary?: string`：op 级别描述（覆盖字段级 summary）

**Mode semantics**:

- `assign`：`state[field] = payload`
- `merge`：`state[field] = { ...state[field], ...payload }`
- `push`：`state[field].push(payload)`
- `toggle`：`state[field] = !state[field]`（且 payload 必须为 `Schema.Void`）

**Validation rules (must fail fast)**:

- 隐式 target（字段 path）必须能被 state schema AST 静态验证存在。
- `push`：字段必须是数组字段（payload schema 派生为元素 schema）。
- `merge`：字段必须是对象字段（payload schema 派生为 Partial）。
- `toggle`：字段必须是 boolean 字段，且 payload schema 派生为 `Schema.Void`。

---

### 3) DerivedAction（运行时内部派生结构，非协议）

**Represents**: 运行时在 Module.make 冷路径将 `StateOpBlueprintV1`（连同字段 path）编译成可执行 action token + reducer 的结果。

**Fields (conceptual)**:

- `actionTag: string`
- `mode: "assign" | "merge" | "push" | "toggle"`
- `statePath: ReadonlyArray<string>`（规范化后的字段 path segments）
- `payloadSchema: Schema`（由字段 schema + mode 派生；不进入任何可序列化工件）
- `token: ActionToken`（`tag=actionTag`，携带 payload schema）
- `reducer: (state, action, sink?) => state`（实际执行函数；不进入任何可序列化工件）

**Rules**:

- 编译必须 deterministic（同输入 → 同行为；不引入随机/时间字段）。
- reducer 必须纯同步；禁止引入 IO/async 或 fork。
- 合并规则：手写 reducers（含 `immerReducers`）必须能覆盖/替换派生 reducers 的输出（显式优先）。

---

### 4) StateOpsDiagnostics（可选，Slim 证据）

**Represents**: 对“哪些字段 op 派生成功/哪些失败”的可序列化证据（供 CI/Devtools/问题定位）。

**Fields (suggested)**:

- `enabled: ReadonlyArray<{ actionTag: string; mode: string; statePath: ReadonlyArray<string> }>`
- `rejected: ReadonlyArray<{ statePath: ReadonlyArray<string>; opName: string; reason: string; blueprint?: unknown }>`

**Rules**:

- 仅包含 Slim 可序列化数据；禁止携带函数/Schema 本体/AST。
