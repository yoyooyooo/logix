# Contracts: Logic Domain Authoring Convergence Roadmap

## 1. Group Governance Contract

- `135` 只承接总控、registry、顺序与 gate
- 具体实施 contract 全部下沉到 `136-139`

## 2. Routing Contract

- 任一争议必须先路由到一个 primary owner spec
- 不允许一个主题同时由多个 member 作为 primary owner
- 既有 baseline spec 只提供起步边界；当它们阻碍更优设计时，可以被当前波次直接修订
- 若出现新的 primary workstream，必须新增 member spec，不能挤进现有 scope

## 3. Delivery Contract

- 本轮按 forward-only 处理
- `tasks.md` 延后到用户确认后再生成
- 计划与任务清单只在 member spec 内展开
