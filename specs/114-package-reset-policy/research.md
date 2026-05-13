# Research: Package Reset Policy

## Decision 1: 统一采用四类处置枚举

- **Decision**: 包处置统一收敛为 `preserve`、`freeze-and-rebootstrap`、`merge-into-kernel`、`drop`。
- **Rationale**: 这四类足以覆盖当前 cutover 的主要路径，也便于后续 spec 复用。
- **Alternatives considered**:
  - 为每个包单独定义自有状态。否决，原因是后续 `115` 到 `119` 会失去统一口径。

## Decision 2: 旧实现默认封存到 `packages/_frozen/`

- **Decision**: 若某包进入 `freeze-and-rebootstrap`，旧实现默认迁移到 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`，canonical 路径 `packages/<dir>/` 留给新主线。
- **Rationale**: 这样能保留旧材料供比对，又不会让旧目录继续伪装成主线。
- **Alternatives considered**:
  - 原地重写。否决，原因是 diff 污染重，旧心智难清除。
  - 仅改文件名，不挪目录。否决，原因是主线入口仍不清晰。

## Decision 3: `@logixjs/core-ng` 默认并入 kernel 路线

- **Decision**: `@logixjs/core-ng` 的默认处置类型设为 `merge-into-kernel`，最终吸收路径交给 `115` 细化。
- **Rationale**: 当前 `core` / `core-ng` 并行存在会持续模糊 kernel 边界。
- **Alternatives considered**:
  - 长期保留双核心。否决，原因是与“更小、更一致”的方向冲突。

## Decision 4: 大部分宿主与领域包直接走封存重建

- **Decision**: `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react`、`@logixjs/query`、`@logixjs/form`、`@logixjs/i18n`、`@logixjs/domain`、`@logixjs/cli` 默认进入目录级 `freeze-and-rebootstrap`，但已对齐目标契约的热链路、协议、helper 与测试资产默认保留并平移。
- **Rationale**: 这些包都承载了旧目录结构与旧入口心智，需要清理主线入口；同时其中不少实现片段和覆盖测试仍有复用价值，直接丢弃会造成重复劳动。
- **Alternatives considered**:
  - 全部原地迭代。否决，原因是会继续被旧 facade 与旧命名拖住。

## Decision 5: 可复用资产单独登记

- **Decision**: 每个关键包都要单独登记 `reuseCandidates`，至少覆盖热链路实现、协议、helper、fixtures、测试资产中的一类。
- **Rationale**: 只有把可复用项显式登记出来，后续 spec 才不会顺手重写掉它们。
- **Alternatives considered**:
  - 只在实施时临场判断。否决，原因是容易被目录重组吞掉。

## Decision 6: `speckit-kit` 视为 out-of-cutover tooling

- **Decision**: `speckit-kit` 保留在 tooling 家族，暂不纳入 Logix runtime 主线 cutover。
- **Rationale**: 它不属于 Logix runtime / host / domain 主线，不应被混入本轮包级重构。
- **Alternatives considered**:
  - 一并纳入 cutover。否决，原因是会扩大无关范围。

## Decision 7: 拓扑合同先绑定 family template，再进入 owner spec

- **Decision**: 每个关键包在进入 `115` 到 `119` 前，先绑定 `TopologyContract`，明确 `publicModules / internalClusters / testFolders / fixturesFolders / adjacentExamples`。
- **Rationale**: 只有把模板和包级合同绑定到一起，owner spec 才不会重新发明目录规则。
- **Alternatives considered**:
  - 只给 family template，不给包级拓扑合同。否决，原因是落到具体包时仍会失去最小执行约束。

## Decision 8: 审计结果只做事实快照，不复制策略正文

- **Decision**: `inventory/audit-results.md` 只记录命令、发现和与 policy 的对应结论，不重新复制矩阵正文。
- **Rationale**: 审计台账的职责是证明当前快照成立，策略正文仍停在 matrix / template / contracts。
- **Alternatives considered**:
  - 把完整处置矩阵再抄一遍进 audit-results。否决，原因是会制造并行真相源。
