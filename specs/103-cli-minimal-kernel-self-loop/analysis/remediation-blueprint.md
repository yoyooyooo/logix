# Remediation Blueprint (Core-First / CLI-Thin / Scenario-Driven)

## 1. Design Principles

- core-first: 运行语义与验证基础能力优先下沉 core
- cli-thin: CLI 只做参数绑定、调用编排、结构化输出
- primitives-first: 先补基础命令能力，再考虑 loop 增强
- scenario-driven: 每项改动必须绑定至少一个 L1 场景验收

## 2. Wave Plan

## Wave A (P0) — 让 primitives 具备场景闭环能力

### A1 场景运行输入协议

- 目标缺口：GAP-P0-01
- 变更点：
  - core：提供 primitives 可复用的动作序列与断言执行骨架（可重放）
  - cli：不新增子命令，使用现有 primitives 组合执行
  - contracts：新增 `scenario-playbook.input` / `scenario-playbook.report` schema（描述命令链与断言）
- 验收：
  - 至少覆盖 S01/S03/S06 三类场景
  - 同输入双次执行 report 可比率 100%

### A2 失败到动作映射标准化

- 目标缺口：GAP-P0-02
- 变更点：
  - protocol：扩展 `nextActions` 场景语义字段（保持向前演进）
  - cli：在场景报告中生成 canonical remediation actions
- 验收：
  - S03/S04/S09 失败样例可自动给出可执行动作
  - 无“需要人工解释 reason 才能继续”的硬阻断

### A3 场景级统一 verdict 工件

- 目标缺口：GAP-P0-03
- 变更点：
  - cli：新增场景级聚合 artifact（`scenario.verdict.json` + checksum）
  - tests：E2E 验证多命令链聚合一致性
- 验收：
  - S01-S10 均可产出统一 verdict artifact

### A4 场景索引与命令链发现

- 目标缺口：GAP-P0-04
- 变更点：
  - docs/contracts：场景索引协议（scenario -> recommended primitive chain）
  - cli：`describe` 增补可选场景索引投影（不污染核心命令层）
- 验收：
  - Agent 可从单一入口获取推荐链路，不再依赖人工记忆

## Wave B (P1) — 强化复杂场景的验证深度

### B1 跨模块协作规则校验 profile

- 缺口：GAP-P1-01
- 变更点：`ir validate` 增加 cross-module profile（或独立 primitive）
- 验收：S02/S07 的协同约束可机读判定

### B2 时间语义与长任务断言

- 缺口：GAP-P1-02
- 变更点：场景 playbook 输入协议支持时间预算/超时断言
- 验收：S06 能稳定验证“进度/超时/重试”语义

### B3 外部源与导入夹具协议化

- 缺口：GAP-P1-03
- 变更点：fixture/source adapter 协议，减少手工 mock
- 验收：S05/S08 场景可自动化执行且结果稳定

### B4 业务语义 reason catalog 扩展

- 缺口：GAP-P1-04
- 变更点：reason catalog 增加业务语义层 reason code
- 验收：reason -> action 映射可被脚本直接消费

### B5 场景级 identity 聚合

- 缺口：GAP-P1-05
- 变更点：场景运行链统一 identity 聚合规则
- 验收：多轮 run/resume 在场景报告中可追踪

## Wave C (P2) — 文档与 DX 收口

### C1 场景优先用户文档

- 缺口：GAP-P2-01
- 变更点：README + playbook 改为场景叙事优先

### C2 决策摘要增强

- 缺口：GAP-P2-02
- 变更点：`next-actions exec` 结果增加 agent-facing summary

### C3 乐观更新专用校验

- 缺口：GAP-P2-03
- 变更点：optimistic profile checks

## 3. Public Interface Impact (Planned)

潜在新增接口（按 Wave A/B 逐步引入）：

- `scenario-playbook.input.v1.schema.json`
- `scenario-playbook.report.v1.schema.json`
- 新增场景级 reason codes（保持登记与 fail-fast）
- `describe` 的场景索引扩展字段（放在扩展域，避免污染核心字段）

保持不变：

- `CommandResult@v2` 核心字段语义
- 现有 primitives 命令名（除明确迁移裁决）

## 4. Acceptance Gates

每个波次必须同时通过：

- 类型与单测门：`pnpm -C packages/logix-cli typecheck:test` + `vitest run`
- 契约门：schema + reason catalog 完整性
- 场景门：绑定场景集的 E2E 覆盖率阈值
- 可比性门：同输入重跑稳定率

## 5. Risk Controls

- 风险：引入新命令后 CLI 膨胀
  - 控制：优先扩展现有 primitives 输入协议，不先加过多新命令
- 风险：场景语义侵入核心协议
  - 控制：场景扩展字段放扩展域，核心协议保持最小
- 风险：测试成本上升
  - 控制：场景分层（smoke/full）与夹具复用
