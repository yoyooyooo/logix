# Research: Expert Verification Decouple

## Decision 1: shared verification primitive 必须脱离 observability owner

- **Decision**: `internal/reflection/**` 需要的共享执行/证据原语，统一转到中性 owner，默认命名为 `internal/verification/**`
- **Rationale**:
  - `Reflection.verify*` 是 expert route，不该继续借 observability 命名层来定义自身运行底座
  - 若 owner 不变，后续任何 expert verification 扩展都容易以“复用现成 trial helper”为理由回流
  - 中性 owner 能让 `Runtime.trial` 与 `Reflection.verify*` 在不混语义的前提下共享最小原语
- **Alternatives considered**:
  - 保留 `trialRun` 在 `internal/observability/**` 并允许 `internal/reflection/**` 特例 import
    rejected，因为这只是把旧耦合合法化
  - 在 `internal/reflection/**` 内复制一份执行/证据逻辑
    rejected，因为会长出第二套实现与第二真相源

## Decision 2: generic protocol contract 与 verification primitive 分开 owner

- **Decision**: `JsonValue` 这类通用序列化协议合同从 observability 抽离到中性协议 owner，默认命名为 `internal/protocol/**`
- **Rationale**:
  - `JsonValue` 已被 reflection、workflow、runtime、observability 多处复用，它本身不属于 observability 语义
  - 把协议合同与 verification primitive 分开，才能避免 `internal/verification/**` 继续变成“新 observability”
- **Alternatives considered**:
  - 把 `JsonValue` 跟着 verification owner 一起迁走
    rejected，因为它的语义比 verification 更基础
  - 继续挂在 observability，只做 import allowlist
    rejected，因为 owner 语义仍旧错误

## Decision 3: canonical route 与 expert route 不得重新混层

- **Decision**:
  - `runtime.check / runtime.trial / runtime.compare` 继续是 canonical route
  - `CoreReflection.verifyKernelContract / verifyFullCutoverGate` 继续只保留 expert-only route
- **Rationale**:
  - 本轮只改 internal owner，不改用户默认入口
  - 若在 decouple 过程中让 `Reflection.verify*` 重新参与默认验证叙事，会直接打破 `124` 与 `130` 的收口结果
- **Alternatives considered**:
  - 顺手把 `Reflection.verify*` 升成公开升级层入口
    rejected，因为这会重开 control plane 主线讨论

## Decision 4: forbidden edge 必须用代码 contract 与 grep gate 双重封死

- **Decision**: 既保留 public surface contract test，也新增 internal edge contract test，同时把 strict grep 命令写入 quickstart 和最终 gate
- **Rationale**:
  - 仅靠 public surface contract 不足以阻止 `internal/reflection/**` 继续偷接 `observability`
  - 仅靠 grep 不足以表达 route 语义和 owner 约束
- **Alternatives considered**:
  - 只靠 reviewer 人工检查
    rejected，因为边界很容易在后续实现中退化

## Decision 5: docs 与 legacy ledger 必须一起回写

- **Decision**: 除本 spec 自身产物外，至少同步回写：
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `specs/130-runtime-final-cutover/inventory/control-plane-entry-ledger.md`
  - `specs/130-runtime-final-cutover/inventory/docs-consumer-matrix.md`
- **Rationale**:
  - `131` 是 `130` 之后的内部 owner 收口，若只改代码和新 spec，会让旧 cutover ledger 继续描述过期 backing path
- **Alternatives considered**:
  - 只在 `131` 自己的 inventory 里记录
    rejected，因为现有 runtime final cutover ledger 仍被当作总账使用

## Decision 6: allowlist 默认预算为 0

- **Decision**: 本 spec 默认不批准任何 `internal/reflection/** -> internal/observability/**` 临时 allowlist
- **Rationale**:
  - 这轮目标就是切断这条依赖边
  - 临时 allowlist 会把实施压力转移给以后，等价于保守回退
- **Alternatives considered**:
  - 先允许 `kernelContract.ts` 和 `fullCutoverGate.ts` 保留少量 observability import
    rejected，因为这两条边恰好是 owner 收口的核心问题
