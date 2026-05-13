# Research: Runtime Package Cutover Roadmap

## Decision 1: `112` 只做总控，不做并行真相源

- **Decision**: `112` 只维护成员关系、依赖顺序、group checklist 和里程碑门槛，严禁复制成员实现任务。
- **Rationale**: 总控 spec 的价值在入口和调度，不在重复成员细节。
- **Alternatives considered**:
  - 在总控里复写每个成员的实现任务。否决，原因是会立即形成并行真相源。

## Decision 2: 先 docs，后 policy，再 kernel，再包级重组

- **Decision**: 执行顺序固定为 `113 + 114 -> 115 -> 116/117/118 -> 119`。
- **Rationale**: 先锁事实源与 package policy，后续成员才有稳定边界。
- **Alternatives considered**:
  - 直接从 `115` 或 `118` 开始。否决，原因是会缺少前置政策和事实源。

## Decision 3: 复用优先是 group 硬门

- **Decision**: 所有成员 spec 都必须登记 reuse candidates，未登记视为 planning 不完整。
- **Rationale**: 这轮路线允许目录级激进 cutover，但不允许对已对齐资产做无价值重写。
- **Alternatives considered**:
  - 把复用判断留到实现时再说。否决，原因是太容易被目录重组吞掉。

## Decision 4: Group checklist 由 registry 推导

- **Decision**: `checklists/group.registry.md` 只由 `spec-registry.json` 推导生成。
- **Rationale**: registry 负责关系事实，checklist 负责执行入口。
- **Alternatives considered**:
  - 手写 checklist。否决，原因是后续状态同步成本高。

## Decision 5: 总控的完成标准是“入口可执行”

- **Decision**: `112` 的完成不依赖任何成员实现完成，只依赖 planning artifacts 完整、group checklist 可用、依赖顺序清晰。
- **Rationale**: 这是规划阶段总控 spec，不是实现阶段总控 spec。
- **Alternatives considered**:
  - 把所有成员实现完成视为总控完成。否决，原因是会把 planning spec 与 delivery spec 混掉。

## Closure Note

- 后续实际执行已经走完全链路，`113` 到 `119` 全部进入 `done`
- `112` 现在同时承担 planning archive 与 delivery closeout 入口
- 因此读取 `112` 时，应优先把它当成本轮 runtime package cutover 的总索引，而不是仅限 planning 入口
