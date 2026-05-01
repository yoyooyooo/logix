# Research: Verification Proof Kernel Second Wave

## Decision 1: `proofKernel` 继续固定为唯一共享执行内核

- **Decision**: 共享执行逻辑只允许留在 `internal/verification/proofKernel.ts`
- **Rationale**:
  - `131` 已把 owner 拆开，`132` 的目标是继续压缩结构
  - 若 canonical adapter 再次复制 session、collector、exit normalization，proof-kernel 就会退化成“名义上的唯一内核”
- **Alternatives considered**:
  - 让 `trialRunModule.ts` 保留少量 shared execution 细节
    rejected，因为这会重新长出第二子系统

## Decision 2: `trialRunModule.ts` 的下一步不是继续堆逻辑，而是按单一职责拆分

- **Decision**: 若文件仍过厚，优先拆成 `environment / report / artifact / error mapping` 这类互斥子模块
- **Rationale**:
  - 当前 `trialRunModule.ts` 的复杂度来自后处理逻辑混在一起
  - 这些职责并不属于 proof-kernel 本体，也不该继续揉在一个 adapter 文件里
- **Alternatives considered**:
  - 把后处理也继续塞回 proof-kernel
    rejected，因为 proof-kernel 会从共享执行内核膨胀成“万能 verification runtime”

## Decision 3: route contract tests 必须同步升级

- **Decision**: 保留并继续收紧 `VerificationProofKernelRoutes.test.ts`、`VerificationControlPlaneContract.test.ts`
- **Rationale**:
  - 第二波拆分最容易出现“结构变薄了，但边界重新模糊”的问题
  - route tests 能直接阻止 canonical / expert / proof-kernel 三层回流
- **Alternatives considered**:
  - 只靠 reviewer 手工判边界
    rejected，因为这类回退多半是渐进式的

## Decision 4: docs 与 legacy ledger 继续要一起回写

- **Decision**: 至少同步更新：
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
  - `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- **Rationale**:
  - proof-kernel 第二波仍会改变内部事实描述
  - 不回写，后续 Agent 仍会从旧 ledger 里读到过期分层

## Decision 5: 这一轮默认不追求性能结论

- **Decision**: 只做结构收口，不默认宣称性能改善
- **Rationale**:
  - 当前收益主要在稳定性、可维护性、可推导性
  - 若后续触及 canonical behavior path，再单独补 targeted evidence
- **Alternatives considered**:
  - 顺手给出“更快了”的结论
    rejected，因为本轮没有先验要证明的性能目标
