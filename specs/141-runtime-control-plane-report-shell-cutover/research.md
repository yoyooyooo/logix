# Research: Runtime Control Plane Report Shell Cutover

## Decision 1: 单一 canonical report shell

**Decision**: `VerificationControlPlaneReport` 是唯一 canonical report shell。

**Rationale**:

- living `runtime/09` 已经把 report shell 收口到 control plane owner
- 继续保留 stage-specific report shape 只会形成第二协议

**Alternatives considered**:

- 保留 `RuntimeCheckReport / RuntimeTrialReport / RuntimeCompareReport` 各自 shape
- 保留 `TrialReport` 的第二 shape

## Decision 2: coordinate-first repair target

**Decision**: `repairHints` 的 machine core 只收 `code / canAutoRetry / upgradeToStage / focusRef`。

**Rationale**:

- Agent repair 真正稳定依赖的是局部坐标
- prose 继续留在消费层，不再承担 machine truth

**Alternatives considered**:

- 继续让 `reason / suggestedAction` 成为 machine core
- 把 artifact linking 混进 `focusRef`

## Decision 3: artifact-backed linking

**Decision**: materializer 只通过 artifact-backed linking 暴露。

**Rationale**:

- 不在 top-level report 长第二解释对象
- 不让 control plane 拿走 domain payload owner

**Alternatives considered**:

- report 顶层直接长 `rows / issues / materializations`
- 引入 `artifact.role`

## Decision 4: zero-compat, single-track cutover

**Decision**: 本波次直接切到新 shell，不做 dual-write、shadow path 或兼容层。

**Rationale**:

- 仓当前是零存量用户前提
- dual-track 只会制造新的 drift surface

**Alternatives considered**:

- 旧 shell 与新 shell 并存
- CLI 先发两套 report 再逐步删旧
