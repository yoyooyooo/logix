# Data Model: Runtime Final Cutover

## 1. CanonicalRuntimeSurface

- **Purpose**: 表示最终允许留在公开主链中的 runtime surface
- **Fields**:
  - `name`: 入口名
  - `layer`: `canonical-public`
  - `owner`: owner 文档或模块
  - `status`: `keep`
  - `notes`: 边界说明

## 2. ExpertKernelSurface

- **Purpose**: 表示允许存在但不回 canonical mainline 的 kernel 升级层
- **Fields**:
  - `name`
  - `layer`: `expert-kernel`
  - `owner`
  - `entryRule`: 何种场景允许进入
  - `forbiddenRole`: 明确它不能承担的主线角色

## 3. RuntimeControlPlaneEntry

- **Purpose**: 表示 control plane 一级入口与其 backing path 的映射
- **Fields**:
  - `stage`: `check | trial | compare`
  - `publicFacade`
  - `backingModules`
  - `reportContractOwner`
  - `status`: `canonical | expert-alias | remove`

## 4. TransitionResidue

- **Purpose**: 表示所有待删除或待裁决的过渡层对象
- **Fields**:
  - `path`
  - `kind`: `forwarding-shell | legacy-wrapper | old-entry | old-doc | old-example | limbo-capability`
  - `currentRole`
  - `targetDisposition`: `remove | settle | allowlist`
  - `owner`
  - `exitCondition`

## 5. AllowlistEntry

- **Purpose**: 表示被允许暂时保留的例外项
- **Fields**:
  - `pathOrSurface`
  - `reason`
  - `owner`
  - `exitCondition`
  - `proofOfNecessity`

## 6. MigrationEntry

- **Purpose**: 表示每个 breaking surface 的迁移条目
- **Fields**:
  - `surface`
  - `disposition`
  - `affectedConsumers`
  - `migrationDoc`
  - `owner`
  - `status`

## 7. PerfEvidenceRecord

- **Purpose**: 表示 final cutover 涉及的性能证据
- **Fields**:
  - `zone`: `kernel | shell | control-plane`
  - `baselineRoute`
  - `afterRoute`
  - `diffRoute`
  - `comparability`
  - `verdict`

## 8. CapabilitySettlement

- **Purpose**: 表示 canonical capability 的最终命运
- **Fields**:
  - `capabilityName`
  - `currentState`: `implemented | limbo | removed`
  - `targetState`: `implemented | removed`
  - `owner`
  - `evidence`

## 9. DirectConsumerDecision

- **Purpose**: 表示 direct consumer 的最终裁决
- **Fields**:
  - `consumerPath`
  - `decision`: `in-scope | deferred`
  - `reason`
  - `affectedSurface`
  - `owner`
