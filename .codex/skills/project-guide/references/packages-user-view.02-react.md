# 2) `@logix/react`（React 适配：RuntimeProvider + hooks）

## 你在什么情况下会用它

- React 应用里挂载 Runtime（`<RuntimeProvider />`）。
- 组件里读 state / 派发 action（`useModule` / `useSelector` / `useDispatch`）。
- 需要“父实例 scope”下访问 imports 子模块（`useImportedModule` / `host.imports.get`）。

## 核心概念

- `RuntimeProvider`：把 Runtime+Scope 放进 React Context；支持 `layer` 做局部 Env 覆写。
- `useModule(handle)`：拿到稳定 `ModuleRef`（含 `runtime/dispatch/actions/changes/...`），并自动应用 handle 扩展（如 Form/CRUD 的 controller）。
- `useModule` 的句柄语义（非常重要）：
  - `useModule(XxxDef)` / `useModule(XxxDef.tag)`：从 `RuntimeProvider` 解析 **全局实例**（单例语义）。
  - `useModule(XxxModule)` / `useModule(XxxModule.impl)`：基于当前 Runtime 的资源缓存创建 **局部实例**（会话/多实例语义）。
- `useSelector(handle, selector)`：并发安全订阅（基于 `useSyncExternalStore`）。

## 最小用法与入口

- README：`packages/logix-react/README.md`
- API 文档：`apps/docs/content/docs/api/react/provider.md`、`apps/docs/content/docs/api/react/use-module.md`
- 真实示例（推荐从这里抄骨架）：`examples/logix-react/src/App.tsx`、`examples/logix-react/src/modules/*`

## 常见坑

- 忘记包 `RuntimeProvider` 会在 hook 里直接抛 `RuntimeProvider not found`。
- 需要“父实例 imports 子模块”时，不要走全局 resolve：优先 `useImportedModule(parent, ChildModule)` 或 `parent.imports.get(ChildModule)`。
