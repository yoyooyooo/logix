# 1.3 调试事件类别（RuntimeDebugEventKind）

在 Devtools 视角下，`RuntimeDebugEventRef.kind` 主要落在以下几类，用于驱动事务视图与时间线：

- `"action"`：动作派发与逻辑入口（通常对应一次 StateTransaction 的起点）；
- `"state"`：状态提交（通常对应一次 StateTransaction 的 commit，一次逻辑入口只应看到一次）；
- `"service"`：资源调用 / 外部服务交互（源自 EffectOp）；
- `"trait-computed"` / `"trait-link"` / `"trait-source"`：Trait 生命周期各阶段产生的 EffectOp 事件；
- `"lifecycle"`：模块初始化 / 销毁等生命周期事件；
- `"react-render"`：React 组件渲染事件，用于分析“一次事务导致了哪些渲染”；
- `"diagnostic"`：结构化诊断（逻辑阶段错误、Env 缺失、Reducer 约束等）；
- `"devtools"`：Devtools 自身行为（如时间旅行操作）或其他 trace:\* 扩展事件。
