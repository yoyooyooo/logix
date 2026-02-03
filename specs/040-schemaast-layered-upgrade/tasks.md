# Tasks: SchemaAST 分层能力升级（040：SchemaRegistryPack@v1 作为“解释材料”接入 CLI 链路）

**Input**: `specs/040-schemaast-layered-upgrade/spec.md`、`specs/040-schemaast-layered-upgrade/data-model.md`、`specs/040-schemaast-layered-upgrade/contracts/*`、`specs/040-schemaast-layered-upgrade/quickstart.md`

**Tests**: 本特性落点在“按需导出/解释材料”，不得进入 runtime 热路径；需要 contracts 守卫 + trialrun/contract-suite 链路回归，保证确定性与 JSON-safe。

---

## Phase 1: 确定性底座（digest / stringify）

- [x] T001 `stableStringify` 加入循环引用检测（遇环降级为稳定 marker），避免摘要/导出爆栈：`packages/logix-core/src/internal/digest.ts`
- [x] T002 [P] 单测：自引用对象、数组环、互相引用对象：`packages/logix-core/test/internal/Digest/Digest.stableStringify.test.ts`

---

## Phase 2: SchemaRegistryPack@v1（导出 + 稳定 schemaId）

- [x] T003 定义并导出 `SchemaRegistryPack(v1)`：稳定 `schemaId`（注解优先，否则结构派生），仅导出 JSON-safe AST：`packages/logix-core/src/internal/schema-registry/exportSchemaRegistryPack.ts`
- [x] T004 在 `Module.make` 注册 trialrun artifact exporter（key：`@logixjs/schema.registry@v1`）：`packages/logix-core/src/Module.ts`
- [x] T005 回归：trialrun artifacts 中包含 registry pack：`packages/logix-core/test/SchemaRegistry/SchemaRegistryPack.trialRunArtifact.test.ts`
- [x] T006 contracts 守卫：040 schemas 可解析且 `$ref` 有效：`packages/logix-core/test/Contracts/Contracts.040.SchemaRegistryContracts.test.ts`

---

## Phase 3: 进入 CLI/Agent 链路（Contract Suite Context Pack）

- [x] T007 Contract Suite Context Pack 默认携带 registry pack 的 `value`（白名单机制）：`packages/logix-workbench/src/contract-suite/context-pack.ts`
- [x] T008 [P] 回归：Context Pack 含 registry pack value：`packages/logix-workbench/test/contract-suite/ContextPack.schemaRegistryValue.test.ts`
- [x] T009 [P] CLI 回归：`logix contract-suite run` 失败时输出 context pack 且包含 registry pack value：`packages/logix-cli/test/Integration/cli.contract-suite.run.test.ts`

---

## Deferred / Moved（不阻塞 040 v1 签收）

- [x] T010 (Moved) 诊断事件/证据链 schemaRef 化、Sandbox 协议 schema 校验与结构化错误、ServiceContract 资产化、perf 基线与 SSoT 回写 —— 已拆分为后续独立 spec（避免 040 单体过大；保持本次只做“解释材料 + 工具链入口”）。

