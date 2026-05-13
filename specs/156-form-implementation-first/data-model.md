# Data Model: Form Implementation First

## Core Entities

### Residual Mechanism Enabler

- **Meaning**: 一个尚未被实现或尚未被明确归位的 internal mechanism
- **Fields**:
  - `id`
  - `currentLayer`
  - `targetGate`
  - `ownerBoundary`
  - `verificationHook`
  - `reopenRisk`

### Lowering Ownership Link

- **Meaning**: 从 `source receipt`、reason/evidence、bundle patch 到运行时观察面的内部归属链路
- **Fields**:
  - `inputKind`
  - `currentOwner`
  - `intendedOwner`
  - `evidenceConsumer`
  - `diagnosticsBacklink`

### Audit Classification

- **Meaning**: 某个候选实现项在当前阶段的合法位置
- **Variants**:
  - `already frozen`
  - `needed enabler`
  - `reopen-gated`

### Proof Trigger

- **Meaning**: 证明某个实现项有资格进入主线的证据条件
- **Examples**:
  - 命中 `G1-G4` residual
  - 删除一层公开翻译且不引入新 authority
  - 被 trial / compare / witness 直接观察
  - 回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 与 canonical docs route

### Demo Narrative Slice

- **Meaning**: 一个保留后的 form demo 单位，服务 examples/docs alignment
- **Fields**:
  - `route`
  - `layoutFile`
  - `moduleFile`
  - `scenarioIds`
  - `witnessFamilies`
  - `docsSurface`
  - `decision`
