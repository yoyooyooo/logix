# 示例演练：智能防抖搜索 (Smart Debounced Search)

> **Scenario**: CRM 系统中的客户搜索功能。
> **Goal**: 验证架构下 “Agent/Copilot → 可解析子集（Fluent/Flow）→ 可运行示例” 的全链路工作流。
> **Status**: Example（历史文件名保留）。
> **Note**: 本示例以 Effect‑Native 范式展示：Bound API（`$`）+ Flow/Fluent + Service Tag，如何实现防抖、竞态（latest）与状态管理的组合。

## 1. 场景描述 (The Context)

*   **UI**: 包含 `SearchInput` (输入框) 和 `CustomerTable` (表格)。
*   **Requirement**:
    1. 监听输入框变化。
    2. 防抖 500ms。
    3. 调用 `CustomerService.search`。
    4. 处理竞态 (SwitchMap)：新请求发出去时，取消旧请求。
    5. 自动管理 Loading 状态。
    6. **变更需求**: 在搜索前增加一个复杂的埋点逻辑。

## 2. 资产准备 (Architect View)

该场景的“可复用部分”可以被提炼为 Pattern（见 `../design/pattern-system.md`）：把防抖/并发策略/错误处理的骨架收敛为可配置的行为积木，而把具体 Service 实现留给 Env 注入。

推荐的落点策略：
- **Module**：定义 `keyword/results/isLoading` 等最小状态形状（Schema‑First）。
- **Service Tag**：定义 `search(keyword)` 契约（Tag‑only Pattern 优先）。
- **Logic**：用 Fluent 白盒子集或 Flow API 表达 `debounce + filter + runLatest`，让平台可解析为 IntentRule。

## 3. 开发者实战 (Developer View)

本仓库已经提供了可运行的示例实现，可直接作为示例与“可解析子集”对齐样板：

- Fluent 白盒子集（推荐写法）：`examples/logix/src/scenarios/agent-fluent-with-control.ts`
- Flow API 组合写法（对比/降级口）：`examples/logix/src/scenarios/search-with-debounce-latest.ts`
- 跨模块协作（Search → Detail 的 L2 协作，IR 映射演示）：`examples/logix/src/scenarios/ir/coordinated-search-detail.ts`

## 4. 价值总结

1.  **Efficiency**: 核心业务逻辑由 AI + Pattern 秒级生成。
2.  **Quality**: 并发控制等复杂细节被封装在 Pattern 中，开发者无需操心。
3.  **Flexibility**: 遇到特殊需求，直接写 TypeScript，平台完美兼容黑盒代码。
