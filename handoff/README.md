# handoff（本次会话交接缓冲区）

> 目的：把“全双工前置（080）”的关键裁决、约束与下一步可执行动作固化下来，避免对话压缩丢失。

优先阅读：`handoff/00-tldr.md`（10 秒内进入状态）→ `handoff/30-next-actions.md`（下一步落地动作）。

## 结论（已确认裁决）

- `080` 是 `$speckit group` 总控：只做成员关系/依赖顺序/门槛/证据回写口径，不复制 member 的实现 tasks。
- **构建期（build-time）能力**：Platform-Grade `Parser/Rewriter` + “写回源码”的 autofill，必须 Node-only。
- **运行期/导出链路**：Manifest/StaticIR/Artifacts/TrialRunReport 等为“检查/导出工件”，可作为 build step 执行，但不等同于编译期 AST。
- **工具栈裁决**：
  - TS 解析：必须用 `ts-morph`（TypeScript 编译器 API）。
  - 如需搭配 AST：使用 `swc`。
  - CLI 与 engine（含 Node-only）尽可能用 `effect` 编写，追求前端/Node-only 同构。
- **CLI 定位**：前期只承载基础能力（验证/试运行/导出/回写），作为 Node-only 基础能力的集成测试入口；不等平台落地。
- **单一真相源**：任何自动补全只补“未声明”的锚点字段并写回源码；宁可漏不乱补；TrialRun/Spy 只能当证据与校验输入，不得成为长期权威。
- **CLI 输出与门禁**：stdout 统一输出 `CommandResult@v1`（无时间戳/随机）；Exit Code：`0=PASS`、`2=VIOLATION`、`1=ERROR`。
- **Slots（083）填充表达**：唯一权威为 `LogicUnitOptions.slotName?: string`（配置对象→meta），并限制 `slotName` 字符集 `/^[A-Za-z][A-Za-z0-9_]*$/`；不引入 default slot。
- **Loader Spy（084）定位**：Node-only Harness，报告 best-effort；“禁 IO”为契约要求但无法对任意 JS 代码硬性证明，必须输出 `coverage.limitations` 与结构化 violations；`usedServices[]` 去重但保留 `occurrences` 聚合计数。

## 当前仓库状态（事实）

- 已补齐并纳入 `080` group：`078-085`（均可能处于未提交状态；`git clean/reset` 禁止）。
- `080` 产物齐：`spec.md + plan.md + tasks.md + spec-registry.* + checklists/group.registry.md + quickstart.md`。
- `081/082`：已补齐 plan 产物（`plan.md + research.md + data-model.md + contracts/schemas/*.json + quickstart.md`）。
- `079`：已回写 plan，使其明确依赖 `081/082` 且落点为 Node-only `packages/logix-anchor-engine` + `packages/logix-cli`。
- `079`：已补齐 `contracts/schemas/*`（AutofillReport@v1 + reason codes）。
- `078`：已补齐 `contracts/schemas/*`（ModuleManifest@078 + ServicePort），并补齐 `tasks.md`。
- `083`：已补齐 `plan.md + quickstart.md`（实现仍未开始）。
- `084`：已补齐 `plan.md + data-model.md + contracts/schemas/*.json + quickstart.md`（report-only）。
- `085`：已补齐 `plan.md + data-model.md + contracts/schemas/*.json + quickstart.md`（实现仍未开始）。
- 已补齐 tasks：
  - `specs/078-module-service-manifest/tasks.md`
  - `specs/079-platform-anchor-autofill/tasks.md`
  - `specs/081-platform-grade-parser-mvp/tasks.md`
  - `specs/082-platform-grade-rewriter-mvp/tasks.md`
  - `specs/083-named-logic-slots/tasks.md`
  - `specs/084-loader-spy-dep-capture/tasks.md`
  - `specs/085-logix-cli-node-only/tasks.md`

## 下一步（resume 时按顺序执行）

1. 读 `handoff/specs/080-full-duplex-prelude/next-actions.md`（从 tasks → implement 的顺序）
2. 进入实现（建议顺序，M2 主线）：
   - `specs/081-platform-grade-parser-mvp/tasks.md` → `specs/082-platform-grade-rewriter-mvp/tasks.md` → `specs/079-platform-anchor-autofill/tasks.md` → `specs/085-logix-cli-node-only/tasks.md`
3. （可选，M3）在 M2 跑通后再进入：
   - `specs/084-loader-spy-dep-capture/tasks.md` → `specs/083-named-logic-slots/tasks.md`
4. 实现阶段持续自检：
   - `@logixjs/core` 不引入 `ts-morph/swc`（保持 runtime 纯净）
   - 所有输出工件 JSON-safe、确定性、可 diff；写回只补缺失字段（宁可漏不乱补）

## 清空规则

- 这些 handoff 文档在新会话 `resume` 消化完成后应归零（清空 `handoff/`），避免长期堆积成第二真相源。
