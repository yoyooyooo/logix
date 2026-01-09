# Tasks: SchemaAST 分层能力升级（040：Schema Registry + schemaId 引用）

**Input**: `specs/040-schemaast-layered-upgrade/spec.md`、`specs/040-schemaast-layered-upgrade/plan.md`、`specs/040-schemaast-layered-upgrade/research.md`、`specs/040-schemaast-layered-upgrade/data-model.md`、`specs/040-schemaast-layered-upgrade/contracts/*`、`specs/040-schemaast-layered-upgrade/quickstart.md`
**Prerequisites**: `specs/040-schemaast-layered-upgrade/plan.md`（required）、`specs/040-schemaast-layered-upgrade/spec.md`（required）

**Tests**: 本特性会触及 `packages/logix-core`（稳定标识、诊断事件、IR 锚点）与 `packages/logix-sandbox`（协议边界），测试为必选；并需要最小性能基线（避免把 schemaId 计算/序列化意外拖进热路径）。

**Organization**: 任务按用户故事分组；US1 是 MVP（registry + schemaId）。US2/US3 都依赖 US1 提供的 `schemaId/schemaRef` 与 registry pack（或其导出接口）。US4 为后续资产化扩展预留接口，默认不阻塞 US1–US3 签收。

## Phase 0: Planning Artifacts（Already Done）

- [x] T001 规划产物已生成并相互引用：`specs/040-schemaast-layered-upgrade/*`（Refs: —，规划产物检查）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 在进入实现前先固化“公共 API + 错误/预算/分块语义”，避免实现阶段反复推翻接口形态。

- [ ] T002 固化 `SchemaRegistry` 的公共 API（含 `export(filter/chunk)`、可控失败语义、缓存边界、迁移说明要求）：`specs/040-schemaast-layered-upgrade/contracts/api.md`（Refs: FR-003, FR-004, FR-009, FR-012, NFR-001, NFR-002, NFR-003）
- [ ] T003 [P] 建立 SchemaRegistry 测试目录与夹具入口（代表性 schema 清单，供 golden tests 复用）：`packages/logix-core/test/SchemaRegistry/fixtures.ts`（Refs: FR-002, NFR-003）
- [ ] T004 [P] 建立 Sandbox 协议 schema 测试入口（覆盖合法/非法/版本不匹配样例）：`packages/logix-sandbox/test/Protocol.decode.test.ts`（Refs: FR-008）

**Checkpoint**: API/测试入口准备就绪，可以开始“先写测试 → 再实现”。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先把“确定性/可序列化/可控失败/预算”这几条硬约束落到最底层工具函数与契约上。

- [ ] T005 增强 `stableStringify`：加入循环引用检测（WeakSet/WeakMap），将潜在堆栈溢出升级为可控输出或可解释错误：`packages/logix-core/src/internal/digest.ts`（Refs: FR-002, NFR-001, NFR-002）
- [ ] T006 [P] 为循环引用检测补齐单测（至少覆盖：自引用对象、互相引用对象、数组环）：`packages/logix-core/test/Digest/stableStringify.cycle.test.ts`（Refs: NFR-001）
- [ ] T007 定义 schema AST 的 canonical JSON 归一化：`astJson = JSON.parse(JSON.stringify(schema.ast))`，并在失败时给出可解释错误/降级（不得崩溃）：`packages/logix-core/src/internal/schema-registry/astJson.ts`（Refs: FR-002, NFR-002, NFR-003）
- [ ] T008 [P] 为 `astJson` 归一化补齐单测（含递归 Schema/suspend、Refinement/Transformation 的闭包字段不入 canonical 形态）：`packages/logix-core/test/SchemaRegistry/astJson.test.ts`（Refs: FR-002, NFR-003）
- [ ] T009 实现 `schemaId` 生成与缓存（注解优先，否则结构派生；禁止热路径动态计算）：`packages/logix-core/src/internal/schema-registry/schemaId.ts`（Refs: FR-002, NFR-002, NFR-003）
- [ ] T010 [P] `schemaId` 单测：注解覆盖、派生稳定性、跨运行一致性（同输入多次计算一致）：`packages/logix-core/test/SchemaRegistry/schemaId.test.ts`（Refs: FR-002, SC-001）
- [ ] T011 定义并实现 registry pack 的 budget/分块策略（预留 `filter/chunk` 参数；chunk 输出可合并且顺序稳定）：`packages/logix-core/src/internal/schema-registry/exportPack.ts`（Refs: FR-004, NFR-001）
- [ ] T012 [P] `exportPack` 单测：filter 子集导出、chunk 分块导出、合并后等价于全量导出：`packages/logix-core/test/SchemaRegistry/exportPack.chunk.test.ts`（Refs: FR-004, SC-003）

**Checkpoint**: schemaId/导出语义已可复用，US1–US3 可开始实现。

---

## Phase 3: User Story 1 - 统一 Schema 工件可查询 (Priority: P1) 🎯 MVP

**Goal**: 提供 `SchemaRegistry`（会话级 Runtime Service）与可查询的 module schema 元数据出口；支持导出/导入 registry pack（JSON 可序列化、可离线解释）。

**Independent Test**: 对一个代表性模块（state + actions），能稳定得到 `schemaId` 与 SchemaAST JSON；导出的 registry pack 可在离线环境导入并通过 `schemaId` 解析出条目。

### Tests（先写测试，确保失败后再实现）

- [ ] T013 [P] Golden Master：锁定代表性 schema 的 `astJson` 与 `schemaId`（覆盖 Struct/Union/Optional/Array/Suspend/Refinement/Transformation）：`packages/logix-core/test/SchemaRegistry/golden.schemaId.test.ts`（Refs: FR-002, NFR-003）
- [ ] T014 [P] `SchemaRegistry` 基础行为：register/get/export/import 的确定性与可 stringify：`packages/logix-core/test/SchemaRegistry/SchemaRegistry.basic.test.ts`（Refs: FR-003, FR-004, SC-001, SC-003）
- [ ] T015 [P] module schema 元数据出口：从 `Module.make(...)` 提取 state/actions 的 schemaRef，并验证导出 pack 只包含所需 schema：`packages/logix-core/test/SchemaRegistry/Module.schemaMeta.test.ts`（Refs: FR-003, FR-004, SC-001)

### Implementation

- [ ] T016 [US1] 实现 public submodule：`SchemaRegistry` Tag/类型/API（含 export(filter/chunk) 入口与禁止热路径计算的约束）：`packages/logix-core/src/SchemaRegistry.ts`（Refs: FR-003, FR-004, NFR-002）
- [ ] T017 [US1] 实现 registry service（Map 索引 + 稳定排序 + 可序列化 pack；禁止捕获完整 Context）：`packages/logix-core/src/internal/schema-registry/SchemaRegistryLive.ts`（Refs: FR-004, NFR-002, NFR-006）
- [ ] T018 [US1] 实现 registry pack 导出/导入（含 `schemaIdSource`、meta/annotations 的 JsonValue 投影；effectVersion 取值策略按 `contracts/api.md` 裁决）：`packages/logix-core/src/internal/schema-registry/exportPack.ts`、`packages/logix-core/src/internal/schema-registry/importPack.ts`（Refs: FR-004, SC-003）
- [ ] T019 [US1] 实现 module schema 元数据提取（state/actions -> schemaRef；可选返回“仅包含相关 schemaId 的 pack”以支持 Lazy Export）：`packages/logix-core/src/internal/schema-registry/moduleSchemaMeta.ts`、`packages/logix-core/src/Module.ts`（Refs: FR-003, FR-004, NFR-001）
- [ ] T020 [US1] 实现 schema diff（最小可行动摘要：breaking + changes[]），并对齐 `SchemaDiff@v1`：`packages/logix-core/src/internal/schema-registry/schemaDiff.ts`、`packages/logix-core/src/SchemaRegistry.ts`（Refs: FR-009, SC-002）
- [ ] T021 [P] [US1] schema diff 单测（字段新增/删除/类型收窄的 breaking 判定最小集）：`packages/logix-core/test/SchemaRegistry/schemaDiff.test.ts`（Refs: FR-009, SC-002）
- [ ] T022 [US1] 对外导出与 public submodules 校验：新增 `./SchemaRegistry` 导出并通过 verify：`packages/logix-core/src/index.ts`、`packages/logix-core/package.json`（Refs: FR-003）

**Checkpoint**: US1 完成后，可在工具侧拿到 `schemaId + registry pack` 并离线解释（MVP 达成）。

---

## Phase 4: User Story 2 - 诊断/回放链路 Schema 化 (Priority: P2)

**Goal**: 诊断事件保持 Slim（JsonValue 摘要），但能引用 `schemaId`（schemaRef）以支持 schema-aware 解释与回放。

**Independent Test**: 在 diagnostics=on 的最小场景中，`action:dispatch` 与 `state:update` 事件都携带 `schemaRef.schemaId`；Devtools 在 registry 缺失时降级展示（不白屏）。

### Tests

- [ ] T023 [P] [US2] Debug 事件 schemaRef：确保 `action:dispatch/state:update` 输出可序列化且包含 schemaRef（并保持 Slim）：`packages/logix-core/test/Debug/DebugSink.schemaRef.test.ts`（Refs: FR-007, NFR-002）
- [ ] T024 [P] [US2] Devtools 容错：未知 schemaId 时降级展示 Unknown Type + 原始 JSON（不抛错）：`packages/logix-devtools-react/test/schema/UnknownSchemaId.fallback.test.tsx`（Refs: FR-007, SC-006）

### Implementation

- [ ] T025 [US2] 扩展 Debug 事件模型以携带 schemaRef（不改变现有 JsonValue 投影边界）：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`（Refs: FR-007, NFR-002）
- [ ] T026 [US2] 在 action/state 事件发射点填充 schemaRef（schemaId 从定义/注册期缓存读取，禁止热路径动态计算）：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（或实际发射点），以及必要的薄适配文件（Refs: FR-007, NFR-001, NFR-003）
- [ ] T027 [US2] Devtools UI 降级视图：当 schemaRef 不可解析时，以 Unknown Type(${schemaId}) 占位并仍展示 JsonValue：`packages/logix-devtools-react/src/internal/ui/inspector/Inspector.tsx`（或对应 JSON viewer 组件）（Refs: FR-007, SC-006）

---

## Phase 5: User Story 3 - Sandbox 协议可校验与可解释错误 (Priority: P3)

**Goal**: Host↔Worker 协议消息具备 Schema 校验；不合法消息与版本不兼容以结构化错误事件返回（不静默忽略/不崩溃）。

**Independent Test**: 构造缺字段/类型不匹配/版本不兼容的消息，Worker 返回包含字段路径与期望结构摘要的错误事件，且会话仍可继续。

### Tests

- [ ] T028 [P] [US3] 协议解码测试：覆盖合法与非法消息（字段缺失/类型错/未知 type）：`packages/logix-sandbox/test/Protocol.decode.test.ts`（Refs: FR-008）
- [ ] T029 [P] [US3] Worker 容错测试：非法消息不会导致 worker 崩溃，且会产出结构化错误事件：`packages/logix-sandbox/test/worker.protocolError.test.ts`（Refs: FR-008, SC-004）

### Implementation

- [ ] T030 [US3] 定义 Protocol 的 Schema（commands/events）与 decode/encode 边界（只用 `effect/Schema`）：`packages/logix-sandbox/src/internal/protocol/schema.ts`（Refs: FR-008）
- [ ] T031 [US3] 扩展 `SandboxErrorInfo` 以承载协议错误细节（code + path + expected 摘要 + 可序列化 details），并补齐新的错误码：`packages/logix-sandbox/src/Types.ts`（Refs: FR-008, SC-004）
- [ ] T032 [US3] 协议层增加“结构化协议错误事件”的 type 与 type guards（或复用 ERROR 事件但保证 payload 结构化）：`packages/logix-sandbox/src/Protocol.ts`（Refs: FR-008）
- [ ] T033 [US3] Worker 解码与握手：对 Host→Worker 命令做 schema 校验；版本不兼容在 READY/INIT 阶段明确拒绝；非法消息返回结构化错误：`packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`（Refs: FR-008, SC-004）
- [ ] T034 [US3] Host 侧容错：Client 收到结构化协议错误时不崩溃，并保留 error details 供 UI 展示：`packages/logix-sandbox/src/Client.ts`（Refs: FR-008）

---

## Phase 6: User Story 4 - Flow/Logic 节点与服务契约可资产化 (Priority: P3)

**Goal**: 为 Flow/Logic 节点参数与 Service 边界预留 schemaRef/registry 的接入点（先保证可注册、可导出、可解释；不强绑定 UI）。

**Independent Test**: 定义一个最小 service 契约（request/response schema），注册后能在导出的 registry pack 中被检索，并在变更时通过 schemaDiff 给出摘要。

### Tests

- [ ] T035 [P] [US4] Service 契约注册测试（request/response schemas -> registry entries + schemaRefs）：`packages/logix-core/test/SchemaRegistry/ServiceContract.test.ts`（Refs: FR-011）

### Implementation

- [ ] T036 [US4] 定义最小 ServiceContract 注册 API（不要求全框架接入；只保证可注册/可导出/可解释）：`packages/logix-core/src/SchemaRegistry.ts`、`packages/logix-core/src/internal/schema-registry/serviceContract.ts`（Refs: FR-011, FR-004）
- [ ] T037 [P] [US4] 给出最小示例（可选：examples 场景）展示如何声明并注册 service 契约：`examples/logix/src/scenarios/schemaRegistry.serviceContract.ts`（Refs: FR-011）

---

## Phase N: Polish & Regression Defenses（Required）

- [ ] T040 [P] 增加性能基线脚本（schemaId 归一化/缓存命中/导出 pack），并落证据到 specs（统一纳入 `logix-perf-evidence`，入口建议：`pnpm perf bench:040:schema-registry`）：`specs/040-schemaast-layered-upgrade/perf/baseline.json`（Refs: NFR-001, SC-005）
- [ ] T041 [P] 文档回写（docs-first）：补齐 schemaId/registry pack/schemaRef 术语与约束（避免并行真相源漂移）：`docs/ssot/platform/assets/00-assets-and-schemas.md`、`docs/ssot/platform/foundation/02-glossary.md`（Refs: FR-001, FR-002, NFR-005）
- [ ] T042 [P] runtime SSoT 回写：SchemaRegistry API 与诊断事件 schemaRef 字段口径（含 Slim/预算/降级说明）：`docs/ssot/runtime/logix-core/*`（Refs: FR-007, NFR-002, NFR-005）
- [ ] T043 [P] 迁移说明：若新增/调整 public API 或 Sandbox ERROR payload，提供迁移文档（不做兼容层）：`specs/040-schemaast-layered-upgrade/migrations.md`（Refs: NFR-005）
- [ ] T044 质量门：通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`（一次性运行，禁止 watch）：`package.json`（Refs: —，质量门）

---

## Dependencies & Execution Order（简版）

- Phase 1/2 完成后再进入 US1–US4（先把确定性/预算/可控失败锁死）。
- US1（P1）是 MVP；US2/US3 都依赖 US1 的 schemaId/registry pack 基础能力。
- US4 不阻塞 US1–US3 的签收（可后置或并行推进）。
- Polish 阶段用于补齐 perf 基线、SSoT/用户文档与迁移说明，避免“代码先跑偏、文档跟不上”的事实源漂移。

---

## Parallel Example: US1

```text
并行（不同文件、可独立推进）：
- Golden tests: packages/logix-core/test/SchemaRegistry/golden.schemaId.test.ts
- schemaId helper: packages/logix-core/src/internal/schema-registry/schemaId.ts
- exportPack chunk tests: packages/logix-core/test/SchemaRegistry/exportPack.chunk.test.ts
- SchemaRegistry Live: packages/logix-core/src/internal/schema-registry/SchemaRegistryLive.ts
```
