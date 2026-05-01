# Contracts: Verification Proof Kernel Second Wave

## 1. Layer Contract

- `proofKernel`
  - 唯一共享执行内核
  - 拥有 session、collector、shared layer wiring、exit normalization
- `canonical-adapter`
  - 只承接 `Runtime.trial` 的输入装配、environment、report、artifact re-export、error mapping
- `expert-adapter`
  - 只承接 `CoreReflection.verifyKernelContract` 与 `CoreReflection.verifyFullCutoverGate` 的 diff / gate 语义
- `public-facade`
  - 只承接 `Runtime.trial`、`Reflection.verify*` 的公开导出与注释说明

## 2. Canonical Adapter Contract

- `trialRunModule.ts` 不得直接持有：
  - session 创建
  - collector 创建
  - shared layer wiring
  - exit normalization
- 若拆分新文件，只允许按：
  - `environment`
  - `report`
  - `artifact`
  - `error-mapping`
  - `route-entry`
  这类单一职责继续下沉

## 3. Route Gate Contract

- `VerificationProofKernel.contract.test.ts`
  - proof-kernel 合同
- `VerificationProofKernelRoutes.test.ts`
  - route 结构门禁
- `VerificationControlPlaneContract.test.ts`
  - canonical / expert route 公开边界

## 4. Consumer Contract

- canonical 默认 consumer 继续只走 `Runtime.trial`
- expert-only consumer 继续只落在 intentional contract tests
- 本轮不得新增第三类 consumer route
