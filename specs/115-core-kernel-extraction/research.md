# Research: Core Kernel Extraction

## Decision 1: kernel 主落点继续停在 `packages/logix-core/src/internal/runtime/core/`

- **Decision**: 新的 kernel 主落点继续围绕 `packages/logix-core/src/internal/runtime/core/` 组织，再通过 `Kernel.ts` 与少量公开 facade 暴露稳定入口。
- **Rationale**: 当前最接近真实热链路的实现已经集中在这一路径，继续复用成本最低。
- **Alternatives considered**:
  - 新开一套 `src/internal/kernel/` 完全重搬。否决，原因是会制造大规模搬家与无价值重写。

## Decision 2: runtime shell 与 kernel 分层，保持单向依赖

- **Decision**: `Kernel` 承接热链路与最小执行核；`Runtime.ts`、`Observability.ts`、`Reflection.ts`、`Process.ts` 等外层入口承接 shell 语义与控制面。
- **Rationale**: 公开面和控制面仍需要存在，但不应继续与热链路实现混层。
- **Alternatives considered**:
  - 让 `Runtime.ts` 继续兼任 shell 与 kernel 叙事。否决，原因是会继续模糊边界。

## Decision 3: `@logixjs/core-ng` 作为支持矩阵输入，不再并列主线

- **Decision**: `@logixjs/core-ng` 进入 support matrix，默认走 `merge-into-kernel` 路线；后续保留期只允许作为迁移输入或对照材料。
- **Rationale**: 双核心并列主线会持续稀释 kernel 裁决。
- **Alternatives considered**:
  - 长期保留 `core` / `core-ng` 双主线。否决，原因是与“更小、更一致”的方向冲突。

## Decision 4: 优先复用已对齐热链路与测试

- **Decision**: 对 `ModuleRuntime`、`StateTransaction`、`TaskRunner`、`RuntimeKernel`、`DebugSink` 一类已对齐目标边界的实现与测试，优先平移或最小拆分。
- **Rationale**: kernel 化的目标是收紧边界，不是为了目录叙事重写热链路。
- **Alternatives considered**:
  - 对 core 目录做整包重写。否决，原因是风险大且无法证明收益。

## Decision 5: observability / reflection / process 保持独立功能簇

- **Decision**: `internal/observability/**`、`internal/reflection/**`、`internal/runtime/core/process/**` 继续作为独立功能簇存在，再通过边界图说明它们与 kernel 的关系。
- **Rationale**: 这些能力与 kernel 高关联，但职责并不等同。
- **Alternatives considered**:
  - 把它们全部并进单一 kernel 目录。否决，原因是会损害诊断与反射的可解释性。

## Decision 6: `core-ng` 对外只保留 legacy routing 元数据

- **Decision**: `@logixjs/core-ng` 继续保留最小 public barrel，但必须显式暴露“legacy routing / support matrix input”元数据，把消费者重新导回 `@logixjs/core`。
- **Rationale**: 当前仍有遗留测试和桥接层依赖 `coreNgKernelLayer` / `coreNgFullCutoverLayer`，直接硬删会放大改动面；先把 public meaning 压到 legacy route，可更快完成 cutover。
- **Alternatives considered**:
  - 立即删除 `coreNgKernelLayer` 与 `coreNgFullCutoverLayer`。否决，原因是会打断现有遗留验证入口，且不在本 task 的最小改动面内。

## Decision 7: 先用直接 public API 测试固定第一层 cutover

- **Decision**: 不再通过 `Kernel.boundarySurface`、`runtimeShellSurface`、`moduleSurface`、`logicSurface`、`processSurface` 这类对象固定第一层边界，改为直接断言 `Kernel / Runtime / Module / Logic / Process / Program` 的真实公开 API，并继续保留源码依赖边界测试；`coreNgSupportMatrixRoute` / `coreNgLegacyRouting` 继续承担 legacy routing 事实。
- **Rationale**: 这一轮的目标是把“唯一主线”和“禁止再漂”的边界压回真实入口，不再额外长一层只服务 spec/test 的元数据对象。
- **Alternatives considered**:
  - 直接在同一轮完成 `Runtime / Module / Logic / Process` 的全面重切。否决，原因是当前更适合先用可测试合同把边界钉住，再继续收缩。

## Decision 8: 当前 perf before 样本只作为探索证据

- **Decision**: 这次 `before.local.darwin-arm64-node22.default.json`、`after.local.darwin-arm64-node22.default.json` 与 `diff.before__after.local.darwin-arm64-node22.default.json` 视为探索证据，不作为硬门结论。
- **Rationale**: triage diff 虽然给出 `comparability.comparable=true`，但同时保留 `git.dirty.before=true` 与 `git.dirty.after=true` 警告，说明样本仍受并行工作区改动影响。
- **Alternatives considered**:
  - 把当前 before/after 直接当正式基线。否决，原因是会弱化 perf evidence 的可比性门槛。
