# 085 评估后续行动（CLI as Agent Tool）

> Superseded background only. This follow-up plan does not define current CLI authority.
> Current CLI authority is [../160-cli-agent-first-control-plane-cutover/spec.md](../160-cli-agent-first-control-plane-cutover/spec.md) and [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md).
> Old toolbox commands, public discovery, writeback and global `--mode report|write` are negative-only legacy references for `160`.

## 1. 背景与边界裁决

本文件将“多视角评估结果”转为可执行方案，默认基线：

- `logix-cli` 只做工具能力（deterministic + machine-readable + diagnosable）。
- Agent 只做外部编排（调用 CLI、读取结果、决定下一步）。
- 严禁在 CLI 内置 agent runtime、memory、policy、自动决策 loop。

## 2. 评估输入与结论

| 维度 | 评分 | 结论 |
| --- | --- | --- |
| 参照物/翻译任务匹配度 | 88 | Green |
| 自动化验证闭环 | 78 | Yellow |
| 架构与任务拆解 | 88 | Green |
| 人机护栏 | 75 | Yellow |
| Agent 可编排性 | 96 | Green |
| 性能与可诊断性宪法符合 | 92 | Green |

综合判断：方向正确；当前形态为“强验证闭环 + 弱自动修复闭环”。

## 3. 本次跟进的总目标

1. 把“CLI 非 Agent”的裁决写入 085 契约，避免后续漂移。
2. 补齐 machine-readable 与 reason code 规范，降低 agent 外部编排成本。
3. 加硬 write 护栏，确保“agent 执行、人做决策”。
4. 将性能预算和关键诊断字段纳入自动化回归门禁。

## 4. 执行顺序（按阶段）

### 阶段 A：先固化规范（文档与合同）

#### A1. 写清 Non-Goal（CLI 非 Agent）

- 修改文件：
  - `specs/085-logix-cli-node-only/spec.md`
  - `specs/085-logix-cli-node-only/plan.md`
  - `specs/085-logix-cli-node-only/contracts/public-api.md`
- 动作：
  - 新增统一表述：`CLI 仅提供工具命令，不承担策略决策/自动修复编排`。
  - 在 `out-of-scope` 或 `non-goals` 段明确禁止项（loop/memory/policy/runtime）。
- 验收：
  - 三处文档出现一致措辞。
  - `public-api.md` 的命令语义不包含“自动下一步决策”。

#### A2. 补齐 reason code 权威枚举

- 修改文件：
  - `specs/085-logix-cli-node-only/contracts/public-api.md`
  - 可选新增：`specs/085-logix-cli-node-only/contracts/reason-codes.md`
- 动作：
  - 对每个 reason code 写明：触发条件、严重级别、建议动作、是否可自动重试。
  - 映射到对应命令（`ir validate/diff`、`transform module`、`contract-suite run`）以及已删除 anchor route 的负向守卫。
- 验收：
  - `public-api.md` 可追溯到完整枚举。
  - 评审时无需猜测 reason code 语义。

#### A3. 增补标准 JSON 示例

- 修改文件：
  - `specs/085-logix-cli-node-only/quickstart.md`
- 动作：
  - 增加最小示例：`CommandResult@v1`、`trialrun.report.json`、`contract-suite.verdict.json`。
  - 示例必须体现：`runId`、`artifacts[]`、`reasonCodes[]`、`error`（失败场景）。
- 验收：
  - 外部 agent 仅看 quickstart 即可拼装解析器。

### 阶段 B：补 tool 可编排能力（不引入 agent）

#### B1. 增加机器可读命令描述

- 目标：提供 `describe --json`（命令名可微调，但语义固定）。
- 建议修改：
  - `packages/logix-cli/src/Commands.ts`
  - `packages/logix-cli/src/internal/args.ts`
  - `packages/logix-cli/src/internal/result.ts`
  - 新增：`packages/logix-cli/src/internal/commands/describe.ts`（或同等落点）
  - 测试：`packages/logix-cli/test/Integration/cli.describe-json.test.ts`
- 输出要求：
  - 列出命令、参数、默认值、required、schema 引用、退出码语义。
  - 输出仍走 `CommandResult@v1`，保证统一 envelope。
- 验收：
  - `logix describe --json --runId <id>` 输出稳定 JSON。
  - 二次运行字节级一致（排除 runId 差异字段时）。

#### B2. 提升 config 可见性

- 目标：降低 `logix.cli.json` 的隐式行为。
- 建议修改：
  - `packages/logix-cli/src/internal/cliConfig.ts`
  - `specs/085-logix-cli-node-only/quickstart.md`
- 动作：
  - 增加可观测输出（例如 resolved profile/default 来源，或 dry-run dump）。
  - 文档明确“参数优先级”：CLI 显式参数 > profile > defaults。
- 验收：
  - 调试时能明确看到最终生效配置来源。

### 阶段 C：加硬 write 护栏与诊断链

#### C1. write 模式安全增强

- 修改文件：
  - `specs/085-logix-cli-node-only/contracts/safety.md`
  - `specs/099-cli-host-adapters/contracts/cli-diagnostics.md`
  - `specs/101-devserver-safety-hardening/spec.md`
- 动作：
  - 约定 write 场景必须输出强化 diagnostics（显式风险提示 + 建议人工复核动作）。
  - 明确 devserver `allowWrite` 与 CLI `--mode write` 的联动门禁与拒绝行为。
- 验收：
  - `report` 默认不变。
  - 误配置 write 时，诊断信息足够让人/agent 立即识别风险。

#### C2. 关键字段覆盖测试

- 建议新增测试：
  - `packages/logix-cli/test/Integration/cli.ir-validate.fields.test.ts`
  - `packages/logix-cli/test/Integration/cli.ir-diff.fields.test.ts`
  - `packages/logix-cli/test/Integration/cli.anchor.report-fields.test.ts`
- 目标字段：
  - `reasonCodes`
  - `digest`
  - `budgetBytes`
  - `artifacts[].schema`
- 验收：
  - Gate 命令输出字段稳定存在；破坏字段会直接红灯。

### 阶段 D：把性能预算变成硬门禁

#### D1. startup 预算 CI 化

- 修改文件：
  - `packages/logix-cli/scripts/measure-startup.mjs`
  - `packages/logix-cli/package.json`
  - `specs/085-logix-cli-node-only/plan.md`
- 动作：
  - 固化 `measure:startup` 脚本输出格式（JSON，含样本数、均值、p95、环境标签）。
  - 在 CI 里比较基线阈值（当前预算 `<500ms`）。
- 验收：
  - 超预算直接失败。
  - 报告可回溯到 runId/commit。

#### D2. IR 一致性 smoke

- 修改文件：
  - `examples/logix-cli-playground`（脚本与测试）
- 动作：
  - 新增 smoke：`ir export` + `trialrun` 后校验关键 digest 对齐。
- 验收：
  - 出现并行真相源漂移时可第一时间发现。

## 5. 建议交付切片（避免大爆炸）

### 切片 1（文档与合同先行）

- 包含：A1/A2/A3。
- 目的：先把裁决定死，避免后续实现跑偏。

### 切片 2（CLI 能力 + 测试）

- 包含：B1/B2/C2。
- 目的：让外部 agent 编排成本下降，同时保证输出字段强约束。

### 切片 3（安全 + 性能门禁）

- 包含：C1/D1/D2。
- 目的：把“可用”升级为“可长期治理”。

## 6. 每个切片的执行命令（建议）

> 约束：禁止 watch 模式。

1. `pnpm -C packages/logix-cli typecheck`
2. `pnpm -C packages/logix-cli test`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test:turbo`

若涉及 docs 站点演示变更，再补：

1. `pnpm -C apps/docs typecheck`

## 7. 风险与回滚策略

1. 风险：`describe --json` 与现有 help 语义不一致。
- 处理：保留文本 `--help`；JSON 描述单独走契约测试，不影响现有脚本。

2. 风险：write 护栏加硬影响已有自动化脚本。
- 处理：通过显式 flag 渐进启用；先文档告知，再在下个切片切默认。

3. 风险：startup 门禁在 CI 环境抖动。
- 处理：采用多次采样 + p95 阈值；阈值按 runner 标签分层存档。

## 8. 明确不做（本轮）

- 不在 `logix-cli` 内增加自动修复循环命令（内置 loop/autofix）。
- 不在 `logix-cli` 内增加 agent memory/policy/runtime。
- 不让 CLI 代理人类做架构或优先级决策。

## 9. Done 定义（必须全部满足）

1. 085 文档侧：Non-Goal、reason code、JSON 示例、safety 约束全部落盘。
2. CLI 接口侧：机器可读描述可稳定输出并被外部 agent 解析。
3. 护栏侧：write 风险可诊断、可追踪、可审计。
4. 质量侧：性能预算与关键字段回归门禁在 CI 生效。


## 10. 任务依赖清单（执行时照表推进）

| ID | 任务 | 依赖 | 预计产物 | 阻断条件 |
| --- | --- | --- | --- | --- |
| T1 | A1 Non-Goal 落盘 | 无 | `spec.md/plan.md/public-api.md` 边界统一文本 | 三文档措辞不一致 |
| T2 | A2 reason code 枚举 | T1 | `reason-codes` 合同段落或独立文件 | 代码与文档语义对不上 |
| T3 | A3 JSON 示例 | T1,T2 | quickstart 示例 JSON | 示例字段与 schema 不一致 |
| T4 | B1 describe --json | T1,T2 | CLI 新命令 + 集成测试 | 输出未走 `CommandResult@v1` |
| T5 | B2 config 可见性 | T4 | 配置可观测输出 + 文档 | 参数优先级不确定 |
| T6 | C2 字段覆盖测试 | T2,T4 | fields 测试集 | 某命令缺关键字段 |
| T7 | C1 write 护栏加硬 | T2,T6 | safety + diagnostics + devserver 规范对齐 | write 风险无可解释链路 |
| T8 | D1 startup CI 门禁 | T4 | `measure:startup` CI 规则 | 预算无基线或抖动失控 |
| T9 | D2 IR 一致性 smoke | T6 | playground smoke 脚本/测试 | digest 校验逻辑不稳定 |

建议顺序：`T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9`。

## 11. 证据清单（每阶段交付时必须附带）

### 文档阶段证据

1. `specs/085-logix-cli-node-only/spec.md` 中 Non-Goal 段落链接。
2. `specs/085-logix-cli-node-only/contracts/public-api.md` 中 reason code 索引。
3. `specs/085-logix-cli-node-only/quickstart.md` 中 JSON 示例片段。

### CLI 实现阶段证据

1. `logix describe --json --runId e2e-describe-1` 的 stdout 样例。
2. `packages/logix-cli/test/Integration/cli.describe-json.test.ts` 通过截图或日志摘要。
3. 字段覆盖测试通过摘要（`reasonCodes/digest/budgetBytes/artifacts[].schema`）。

### 安全与性能阶段证据

1. write 场景 diagnostics 样例（含风险提示与动作建议）。
2. startup 预算报告（样本数、均值、p95、runner 标签）。
3. IR 一致性 smoke 通过摘要（含对齐字段名）。

## 12. 执行约束复述（防跑偏）

1. 允许增强“工具可编排性”，禁止引入“工具内决策”。
2. 一切新增输出优先复用 `CommandResult@v1`，避免平行协议。
3. write 相关能力只能更保守，不得更宽松。
4. 若实现与 085 合同冲突，先改合同再改代码，避免事实源漂移。

## 13. 多视角辩论收敛裁决（5 个 subagent / Linus-Tech-Debate）

### 13.1 总体判决

1. 角色定位：`logix-cli` 是 Agent 闭环中的 `Tool Plane`（执行与验收内核），不是 `Agent Plane`（策略与决策层）。
2. 方向判定：继续坚持 `CLI as Tool`，不内置 agent runtime/memory/policy/loop。
3. 路线选择：在 A/B/C 候选中，统一选择 **B 路线**：
- `describe --json`
- config 可观测
- 字段契约测试

### 13.2 S 级硬门禁（统一清单）

1. 边界门：CLI 不内置任何 agent 决策能力。
2. 协议门：命令输出统一 `CommandResult@v1 + artifacts + exit code`。
3. 发现门：提供稳定机器可读描述（`describe --json`）供外部 agent 编排。
4. 防同偏门：TDD 通过不算完成，必须再过 CLI 独立验收轨道。
5. 标识门：`runId/instanceId/txnSeq/opSeq` 稳定、可比对、可重放。
6. 写入门：默认 `report`；`write` 必须显式确认链路，且可审计。
7. 诊断门：事件 slim、可序列化、含 reason code/digest，支持分级（light/full）。
8. 性能门：预算进入 CI 门禁，超阈值直接失败。
9. 迁移门：forward-only，变更必须附 migration note 与影响说明。
10. 回放门：trace/replay 工件可生成并可复验。

### 13.3 30/60/90 天落地（映射到 T1-T9）

#### 0-30 天（合同定型）

1. 完成 T1/T2/T3：Non-Goal、reason code 枚举、JSON 示例。
2. 启动 T4：落地 `describe --json` 最小可用版本。
3. 交付标准：外部 agent 可无猜测调用 CLI，并能稳定解析关键输出。

#### 31-60 天（门禁成型）

1. 完成 T4/T5/T6：describe 能力、config 可见性、字段契约测试。
2. 推进 T7：write 护栏加硬（明确风险提示 + 拒绝语义）。
3. 交付标准：关键命令输出字段稳定、写入误用可被明确识别和阻断。

#### 61-90 天（治理闭环）

1. 完成 T8/T9：startup CI 门禁、IR 一致性 smoke。
2. 把迁移与预算联动纳入日常验收流程（对应门禁 8/9/10）。
3. 交付标准：性能与诊断进入持续回归，演进可审计、可追责、可回放。

### 13.4 冲突处理规则（执行期）

1. 若“易用性”与“边界纯度”冲突：优先边界纯度（CLI 不承载决策）。
2. 若“快速修复”与“写护栏”冲突：优先写护栏（默认只读、显式授权）。
3. 若“局部性能”与“可诊断性”冲突：优先保留最小可解释链，再优化开销。
4. 若“实现现状”与“合同定义”冲突：先更新合同并记录迁移，再改代码。
