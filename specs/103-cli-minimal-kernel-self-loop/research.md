# Research: 103-cli-minimal-kernel-self-loop

## Decision 1: CLI 定位为纯控制平面

- Decision: `logix-cli` 仅负责协议化执行与证据输出，不承载 Agent 决策。
- Rationale: 降低职责污染，提升协议稳定性与可重放能力。
- Alternatives considered:
  - 在 CLI 内置 loop/memory：被拒绝（边界混乱，演进成本高）。

## Decision 2: 核心协议冻结为最小四对象

- Decision: 统一 `ControlCommand/ControlEvent/ControlState/CommandResult`。
- Rationale: 让外部 Agent 面对稳定输入输出模型，减少猜测逻辑。
- Alternatives considered:
  - 沿用命令级分散输出：被拒绝（难机读、难治理）。

## Decision 3: 项目语义全面外移到扩展层

- Decision: 核心字段禁止 feature/milestone，策略进入 `ext.*`。
- Rationale: 协议核要稳定，策略层允许快速变化。
- Alternatives considered:
  - 核心保留 feature/milestone 分支：被拒绝（语义漂移、测试爆炸）。

## Decision 4: verify-loop 作为机器硬门链（runtime/governance 分层）

- Decision: verify-loop 每轮只跑 runtime gates（type/lint/test/control-surface-artifact/diagnostics），governance gates（migration-forward-only/ssot-drift/perf-hard）仅用于 CI 治理阻断。
- Rationale: 避免闭环收敛路径与治理门耦合，消除依赖环。
- Alternatives considered:
  - 只保留单元测试：被拒绝（测试与实现同偏风险高）。

## Decision 5: forward-only 演进策略

- Decision: 协议升级不做兼容层，只给迁移包+自动检查+fail-fast。
- Rationale: 减少技术债，保持单一真相源。
- Alternatives considered:
  - 长期双轨兼容：被拒绝（长期维护成本不可控）。
