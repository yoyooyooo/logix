# 1. 需要识别的代码模式

在主线规范中，模块体系通过以下 API 暴露（概念层）：

```ts
import * as Logix from "@logixjs/core"

export const UserDef = Logix.Module.make("User", { state: UserState, actions: UserActions })
export const RootModule = UserDef.implement({ initial, logics, imports, processes })
export const AppRuntime = Logix.Runtime.make(RootModule, { layer })
```

平台解析器需要识别的主要调用/声明形式：

 - `Logix.Module.make('Id', { state, actions, ... })`：定义领域模块（返回 `ModuleDef`：纯定义）；
- `ModuleDef.implement({ initial, logics, imports?, processes? })`：定义 Root/Feature 级 **program module**（wrap module）；其 `.impl` 才是 `ModuleImpl` 蓝图；
- `imports: [OrderModule.impl, UserModule.impl, ...]`：模块间依赖（imports 里存的是 `ModuleImpl` 或 Layer）；
- `links: [SearchSyncLink, ...]`：业务编排逻辑（胶水）（在运行时实现中通过 Root ModuleImpl.processes 或 ModuleDef.links 表达）；
- `processes: [SomeDaemon, ...]`：基础设施进程（杂役）；
- `exports: [SomeTag, ...]`：对外公开的 Tag 列表；
- `Logix.Runtime.make(root, { layer, onError })`：应用/页面/Feature 级 Runtime 的根入口（`root` 可为 program module 或 `root.impl`）。

> 实现建议
>
> - 在 TS 层统一使用命名空间导入（例如 `import * as Logix from "@logixjs/core"`），以便解析器快速定位 Module 定义；
> - 平台可以约定：所有 ModuleDef / program module / ModuleImpl / Runtime 入口使用 `export const XxxDef = Logix.Module.make(...)`、`export const XxxModule = XxxDef.implement(...)`、`export const XxxImpl = XxxModule.impl`、`export const XxxRuntime = Logix.Runtime.make(XxxModule /* or XxxImpl */, { ... })` 形式，避免运行时动态构造。
