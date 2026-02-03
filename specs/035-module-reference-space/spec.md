# Feature Specification: Module Reference Space（模块引用空间事实源：PortSpec / TypeIr / PortAddress）

**Feature Branch**: `[035-module-reference-space]`  
**Created**: 2025-12-25  
**Status**: Done  
**Input**: 定义平台“模块引用空间事实源”（Module Reference Space）的唯一真相源：覆盖 **引用空间导出（PortSpec/TypeIr）** 与 **统一寻址基元（PortAddress）**，并通过 TrialRunReport.artifacts（031）导出，供 Workbench/Studio/CI/Agent 消费。

> 说明：表达式/校验的“引用载体协议”（CodeAsset/Deps/Digest/Anchor）已拆分为 034：`specs/034-code-asset-protocol/`。

## Assumptions

- 平台侧的智能提示与引用安全以导出的 `ModulePortSpec/TypeIr` 为准（SSoT），而不是靠手工配置或 UI 推断。
- 端口/类型导出属于“检查/试运行/导出”链路：不影响正常运行时热路径。
- `ModulePortSpec/TypeIr` 必须可 JSON 序列化、可 diff、预算受控，并能与 ModuleManifest/Static IR 同源对照（moduleId/actionKeys 对齐）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 平台基于 PortSpec/TypeIr 做 autocomplete 与引用安全 (Priority: P1)

作为平台使用者，我希望在画布与绑定/表达式编辑器中获得可靠补全：只能引用模块公开的 outputs/exports；并且能在保存前发现越界引用与破坏性变更风险。

**Independent Test**：

1. 对一个模块执行 trial-run，获得 `@logixjs/module.portSpec@v1` 与 `@logixjs/module.typeIr@v1`（可选、可截断）。
2. 平台基于 PortSpec 做 key-level 校验；TypeIr 缺失/截断时降级但不中断。

### User Story 2 - PortSpec/TypeIr 可 diff，用于 CI 破坏性变更检测 (Priority: P2)

作为团队维护者，我希望在模块升级时能通过 PortSpec/TypeIr 发现破坏性变更（端口 key 删除/exports 收缩/类型变化），并在 CI 中形成可审阅的 diff 证据。

### User Story 3 - 预算/截断/失败语义可解释 (Priority: P3)

作为 runtime/kit 维护者，我希望当类型过大/递归过深时，TypeIr 能按预算截断并给出解释；当单项导出失败时不阻塞其它 artifacts；当 key 冲突时显式失败而不是静默覆盖。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义版本化 artifacts：
  - `@logixjs/module.portSpec@v1` → `ModulePortSpec@v1`
  - `@logixjs/module.typeIr@v1` → `TypeIr@v1`（best-effort，可截断）
- **FR-002**: 系统 MUST 定义统一寻址基元 `PortAddress`（kind + key/path），供 032/033/036 引用（不包含 instanceId）。
- **FR-003**: TypeIr 超预算时 MUST 标记 `truncated=true` 并提供预算摘要；平台 MUST 在缺失/截断时降级为 PortSpec key-level 校验。
- **FR-004**: artifacts 导出 MUST 满足 031 的语义：单项失败不阻塞其它项；key 冲突必须以可行动错误失败。

### Non-Functional Requirements

- **NFR-001**: 不增加运行时热路径开销；导出只发生在 trial-run/inspection。
- **NFR-002**: 输出确定性：稳定排序、稳定字段；禁止时间戳/随机/机器特异信息进入可门禁工件口径。

## References

- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 034 资产协议：`specs/034-code-asset-protocol/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`

