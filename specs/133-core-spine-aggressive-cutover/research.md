# Research: Core Spine Aggressive Cutover

## Decision 1: 公开主公式继续压缩

- **Decision**: 最终公开主公式固定为 `Module / Logic / Program / Runtime`
- **Rationale**: 这四个对象分别对应定义、行为、装配、运行，阶段边界最清晰
- **Alternatives considered**:
  - 保留 `Module.implement(...)` 作为公开兼容入口
    - rejected，因为会继续维持双 authoring 公式
  - 让 `Program` 继续暴露 `.impl` 作为 canonical imports entry
    - rejected，因为公开装配对象不应泄露内部蓝图

## Decision 2: `capabilities.imports` 公开面只接受 `Program`

- **Decision**: 公开 imports 只接受 `Program`
- **Rationale**: `Program` 已经包含 `initial / capabilities / logics` 等装配事实，是闭合的可复用单元；`Module` 只是定义期对象，信息不完整
- **Alternatives considered**:
  - imports 同时接受 `Module` 和 `Program`
    - rejected，因为会重新长出第二套组合规则
  - imports 继续接受 `Program.impl`
    - rejected，因为会把内部蓝图泄露成公开心智

## Decision 3: `Module` 只允许定义期组合

- **Decision**: `Module` 可以做 pattern / field / definition-time 组合，但不能拥有 Program 式 runtime 组合语义
- **Rationale**: 这样可以把“定义复用公式”和“运行装配公式”分离
- **Alternatives considered**:
  - 给 `Module` 增加 imports 或 runtime composition 能力
    - rejected，因为这会直接模糊 `Module` 和 `Program` 的边界

## Decision 4: 业务映射必须进入 SSoT

- **Decision**: 把业务概念到主链的映射写进 SSoT，并补一个 CRUD 管理页的 program tree 示例
- **Rationale**: 口头结论无法约束后续 examples、domain kits 和 Agent 生成行为
- **Alternatives considered**:
  - 只在 README 或对话中说明
    - rejected，因为不稳定，且容易与其它 docs 漂移

## Decision 5: root barrel 只保留显式 allowlist

- **Decision**: root barrel 建显式 allowlist，其它 expert surface 迁到更窄路径，或写入 allowlist ledger
- **Rationale**: 根入口越宽，主脊柱越难被正确理解
- **Alternatives considered**:
  - 继续把 expert surface 和 canonical spine 混放在 root export
    - rejected，因为会持续削弱 authoring 主链
