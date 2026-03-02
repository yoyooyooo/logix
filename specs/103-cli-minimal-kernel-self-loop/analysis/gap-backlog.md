# Gap Backlog (P0/P1/P2)

## 1. Gap Taxonomy

- G1 场景入口缺口：场景入口锚点不稳定或不可表达
- G2 结构证据缺口：静态工件不足以表达场景约束
- G3 动态证据缺口：trialrun 无法表达动作序列与时序断言
- G4 诊断语义缺口：reason code 到可修复动作映射不足
- G5 动作闭环缺口：`next-actions` 可执行但不可场景化
- G6 可比性缺口：跨场景/跨轮次比较口径不统一
- G7 可发现性缺口：Agent 不知道场景应走哪条 primitive 链

## 2. P0 (Blocking Self-Loop)

| ID | 分类 | 场景 | 缺口描述 | 现状证据 | 目标状态 |
| --- | --- | --- | --- | --- | --- |
| GAP-P0-01 | G3 | S01-S10 | 缺动作脚本输入协议（无法表达“动作时序+断言”） | `trialrun` 仅 entry 级运行 | 支持 `scenario-playbook` 输入（动作序列+断言，编排现有 primitives） |
| GAP-P0-02 | G4/G5 | S03/S04/S06/S09 | 失败到修复动作映射不稳定，难自动推进 | reason code 有，但场景 DSL 缺失 | 失败原因 -> 标准修复动作模板可机读执行 |
| GAP-P0-03 | G6 | 全场景 | 缺统一场景 verdict 工件（跨命令聚合） | 分散在各 report | 统一 `scenario.verdict.json` + checksum |
| GAP-P0-04 | G7 | 全场景 | Agent 缺“场景到命令链”发现入口 | 仅 command-level `describe` | 场景索引与推荐 primitive 链 |

## 3. P1 (Can Continue But Costly)

| ID | 分类 | 场景 | 缺口描述 | 现状证据 | 目标状态 |
| --- | --- | --- | --- | --- | --- |
| GAP-P1-01 | G2 | S02/S07 | 跨模块协作约束无专用校验视角 | 仅通用 IR 契约 | 增加 cross-module rules profile |
| GAP-P1-02 | G3 | S06 | 长任务/时间语义缺可控时钟断言 | trialrun trace 无时间控制 | 增加 time-budget/assertion 输入 |
| GAP-P1-03 | G2/G3 | S05/S08 | 外部源与导入流程缺输入夹具标准 | 需手工 mock | fixture 协议化（source/input adapters） |
| GAP-P1-04 | G4 | 全场景 | 部分 reason codes 仍偏技术，不够业务动作化 | 需要人工解释 | 补业务语义 reason taxonomy |
| GAP-P1-05 | G6 | 全场景 | 多轮尝试的场景级 identity 链尚未统一 | command 级 identity 可用 | 场景级 identity 聚合规则 |

## 4. P2 (Quality/Efficiency)

| ID | 分类 | 场景 | 缺口描述 | 现状证据 | 目标状态 |
| --- | --- | --- | --- | --- | --- |
| GAP-P2-01 | G7 | 全场景 | CLI 文档仍以命令为主，场景导向不足 | README 已改进但不完整 | 增加 scenario-first playbook |
| GAP-P2-02 | G5 | S10 | `next-actions exec` 缺策略层诊断摘要 | 执行报告偏底层 | 增加 agent-facing decision summary |
| GAP-P2-03 | G2 | S01/S09 | 回滚/乐观更新专用结构检查缺失 | 通用验证可替代 | 增加 optimistic profile checks |

## 5. Prioritization Decision

优先顺序：

1. 先清 P0（闭环阻断项）
2. 再清 P1（减少人工干预）
3. 最后处理 P2（体验与效率）

## 6. Task Binding（tasks.md 回链）

- `GAP-P0-01` -> `T104/T106/T107/T108`
- `GAP-P0-02` -> `T110`
- `GAP-P0-03` -> `T105/T109`
- `GAP-P0-04` -> `T103/T111`
- `GAP-P1-01` -> `T113`
- `GAP-P1-02` -> `T114`
- `GAP-P1-03` -> `T112/T115`
- `GAP-P1-04` -> `T110`（reason/remediation 语义化首批落地）
- `GAP-P1-05` -> `T109`（场景聚合 verdict 维度）
- `GAP-P2-01` -> `T117`
- `GAP-P2-02` -> `T110/T117`
- `GAP-P2-03` -> `T113/T114`（以 profile + time-budget 先覆盖）
