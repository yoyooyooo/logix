# Contract: API Surface (O-021)

## Source

- O-021 backlog item

## Public API Contract

- 目标：公开实例化入口收敛为单一路径。
- 约束：
  - 统一入口必须覆盖旧三入口主能力。
  - 调用者不再需要区分 `live/implement/impl`。
  - 旧入口不作为推荐写法保留；`writeback` 阶段仅用于迁移盘点，`done` 前移除公开可用面。

## Compatibility Policy

- Forward-only：允许破坏性变更，但必须先提供迁移说明与移除里程碑；不保留长期兼容层。
