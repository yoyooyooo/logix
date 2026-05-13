# Research: Form Implementation First

## Decision 1: 表面 API 暂冻

- **Decision**: `156` 不再继续竞争 public surface，直接承接 `155` 当前 implementation baseline。
- **Rationale**: `AC3.3 / C004 / C004-R1 / C006` 已平台化，继续在实现前重开 public surface 会拖慢 implementation + evidence 主线。
- **Alternatives considered**:
  - 继续打磨 public surface
  - 先做 implementation，再局部验证后重开

## Decision 2: core internal-enabler 必须绑定 G1-G4；post-closure alignment 回链 `06`

- **Decision**: 所有 core internal-enabler work item 必须直接映射到 `G1 / G2 / G3 / G4`；post-closure 的 examples/docs alignment work item 必须回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 或 canonical docs route。
- **Rationale**: 防止内部整洁度优化脱离 `155` 当前 `promotion gate`，也防止 examples/docs 在 closure 后长出第二叙事。
- **Alternatives considered**:
  - 先做通用 mechanism，再回补映射
  - 直接按代码模块拆波次

## Decision 3: C007 只作为 kernel enabler 审计输入

- **Decision**: `C007` 只提供 `already frozen / needed enabler / reopen-gated` 的约束输入。
- **Rationale**: 避免把 semantic owner / declaration authority 再次带回 live option。
- **Alternatives considered**:
  - 按“kernel descent 候选”继续宽搜
  - 直接忽略 `C007`

## Decision 4: 第一波实现聚焦 source scheduling、receipt/evidence ownership、row-heavy hooks

- **Decision**: 初始 implementation wave 只聚焦三类 residual enabler。
- **Rationale**: 这是当前最直接命中 `G1-G4` 的内部逻辑层。
- **Alternatives considered**:
  - 直接全量铺开所有 internal refinement
  - 先只补 verification feed，不动 internal mechanism
