# Contracts: Expert Verification Decouple

## 1. Route Contract

- canonical route 继续固定为 `runtime.check / runtime.trial / runtime.compare`
- expert route 继续固定为 `CoreReflection.verifyKernelContract / CoreReflection.verifyFullCutoverGate`
- internal shared primitive 不进入公开 authoring surface，也不进入默认验证命名面

## 2. Owner Contract

- `packages/logix-core/src/internal/reflection/**`
  - 只拥有 expert-specific diff、gate、export、expert facade backing
- `packages/logix-core/src/internal/verification/**`
  - 只拥有 canonical trial 与 expert verification 共同需要的最小执行/证据/会话原语
- `packages/logix-core/src/internal/protocol/**`
  - 只拥有通用序列化/协议合同，例如 `JsonValue`
- `packages/logix-core/src/internal/observability/**`
  - 只拥有 observability-specific debug、projection、public observability export、artifact projection 等能力

## 3. Import Edge Contract

- `packages/logix-core/src/internal/reflection-api.ts` 禁止直接 import `packages/logix-core/src/internal/observability/**`
- `packages/logix-core/src/internal/reflection/**` 禁止直接 import `packages/logix-core/src/internal/observability/**`
- `packages/logix-core/src/internal/verification/**` 禁止 import `packages/logix-core/src/internal/reflection/**`
- `packages/logix-core/src/internal/protocol/**` 禁止依赖 verification、reflection、observability 的高层语义

## 4. Shared Primitive Contract

- 若某个 primitive 同时被 canonical trial 与 expert verification 使用，它必须只有一个中性 owner
- shared primitive 不能自带 expert-only route 语义，也不能自带 observability-only route 语义
- 任何 shared primitive 的 direct consumer 必须在 `shared-primitive-ledger.md` 中登记

## 5. Consumer Contract

- `packages/logix-core/test/Contracts/Contracts.045.*`
- `packages/logix-core/test/Contracts/Contracts.047.*`
- `packages/logix-core/test/Reflection*.test.ts`

上述命中项允许直接覆盖 expert route，但必须显式标记为 `expert-only`。

其余默认 consumer：

- `packages/logix-core/test/Runtime/**`
- `packages/logix-cli/**`
- `packages/logix-sandbox/**`
- `examples/logix/**`

继续只允许走 canonical `runtime.*` route。

## 6. Writeback Contract

以下文件在实现闭环前必须同步更新：

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
- `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- `specs/131-expert-verification-decouple/inventory/*.md`
