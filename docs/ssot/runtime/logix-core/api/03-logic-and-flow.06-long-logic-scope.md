# 6. 长逻辑与 Scope（简要约定）

在 `Logic` 中启动长逻辑时，推荐显式考虑它应当与哪一层生命周期绑定：

- `forkScoped(longTask)`：
  - 适合与当前 Module / 页面同生命周期的 UI 逻辑（例如轮询当前视图、监听当前页面状态变化）；
  - 依赖 `Module` / 页面 Scope，被视为“前台任务”，Module Scope 关闭时自动终止。

- `fork(longTask)` 或交给上层 Runtime：
  - 适合与具体页面解耦的后台任务（例如全局 Job 轮询、缓存刷新）；
  - 依赖更高层的 Runtime Scope，不随单个 Module / 页面销毁自动结束。

实践上建议：

- 页面 / 组件级 Module：Logic 内长逻辑默认使用 `forkScoped`，避免“页面关闭但任务仍然持有过期状态”；
- 全局 Module 或专门的后台 Runtime：需要长期运行的任务显式使用 `fork` 或在单独的后台 Scope 中管理。
