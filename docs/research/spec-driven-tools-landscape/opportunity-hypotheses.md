# 机会假设：把“Checks”从 Schema 扩展到行为/流程（IR + Trace）

目标：把调研发现的“市场空白”写成可立项的假设与最小可验证切入点，便于后续转成 `specs/<id>/spec.md`。

## 0) 可复用的“产品形态模板”

成熟赛道（Buf/Apollo/oasdiff/Optic/OPA/Kyverno/Temporal）反复出现同一套形态：

- `Diff`：结构化 diff（含 breaking 判定与变更分类）
- `Gate`：CI/PR 阻断（失败即不可合并/不可发布）
- `Explain`：可解释报告（why/where/how-to-fix）
- `Asset`：规范资产化（版本化、审查、复用、审计）
- `Exception`：可控例外机制（时间窗/范围/审批链）

## 1) 假设 H1：`Logix Checks`（类 oasdiff/BuF/Apollo Checks，但对象是 IR + Trace）

用户画像：

- 平台/框架团队：要给业务团队提供“可扩展但不走样”的运行时与 DSL。
- 中大型业务团队：要在多人协作/多仓并行下避免行为回归与 drift。

最小能力（MVP）：

- `Static IR Diff`：对 Static IR 的结构化 diff 与 breaking 判定（输出 changelog + 迁移建议）。
- `Trace Assertions`：对 Dynamic Trace 的断言（稳定 instanceId/txnSeq/opSeq；事务窗口禁止 IO；诊断事件 Slim 且可序列化；业务不可写 SubscriptionRef 等）。
- `Explain Report`：失败必须能定位到（Spec Step → IR Anchor → Trace Slice），而不是只给日志/堆栈。

可集成点（先不做替换，只做连接）：

- 允许导入 OpenAPI/AsyncAPI/Arazzo/Policy 等外部资产，但核心裁决在 IR/Trace。

可复用的“兼容性模式”范式（从 Schema Registry 借鉴）：

- 参考 Confluent/AWS Glue 的 `BACKWARD/FORWARD/FULL` 与 `*_TRANSITIVE/*_ALL`：把规则从“写死”升级为可配置的兼容性目标，并支持“仅对上一版本检查”与“对全历史检查”两档。
- 类比到 Logix：
  - `BACKWARD`：新逻辑/IR 必须能解释旧 trace（支持回放/回滚/重跑）。
  - `FORWARD`：旧逻辑/IR 仍能处理新产生的 trace/event（适合先升级 producer）。
  - `FULL`：双向兼容（适合多团队并行升级）。
  - `*_TRANSITIVE`：对所有历史版本做 checks（适合稳定平台或核心模块）。
  - “按 subject 配置”≈ 按 `moduleId`/`scenarioId`/`ruleGroup` 配置。

## 2) 假设 H2：`Executable Spec Lab`（补齐 SDD 工具缺的“运行时对齐裁决”）

问题：

- spec-kit/Kiro/Tessl 擅长“把 spec 组织起来并驱动 agent”，但在复杂业务里，裁决点往往回到“跑起来是否符合预期”。

最小能力（MVP）：

- 将 `ScenarioSpec` 与 Sandbox 运行绑定，一键生成红/绿结果；
- 失败时输出最短解释链（Trace → 断言失败点 → 建议修复方向）。

## 3) 假设 H3：`IR Overlays`（用 overlay 思路解决“多视图/多环境差异”）

类比：

- OpenAPI Overlay 解决“对同一份 OpenAPI 做可重复差异化变换”。

迁移到 intent-flow：

- 主资产：Static IR
- overlays：平台差异（React/Sandbox/CLI）、环境约束、调试视图、治理规则集

## 4) 判定下一步是否值得开工的“验证问题”

- Q1：我们能否在不引入大量新 DSL 的情况下，把 3-5 条硬约束做成可运行的 Trace assertions？
- Q2：这些 assertions 能否显著降低 drift 的排查成本（从“看日志”变成“点到具体锚点/步骤”）？
- Q3：是否能在一个真实场景（例如 RegionSelector）里证明：改动一处逻辑，会触发明确的 breaking/合规失败提示？
