# 4. 依赖注入与运行时入口 (Dependency Injection & Entry)

Logix 通过 `RuntimeProvider` 组件在 React 树中注入 Effect 运行时环境。核心能力：

- `runtime={ManagedRuntime}`：复用外部构造的 Runtime（推荐形态，通常来自 `Logix.Runtime.make(root, { layer, onError })`，root 可为 program module 或其 `.impl`）；
- `layer={Layer}`：在父 Runtime 基础上追加局部 Layer，所有 `useModule`/`useSelector` 将自动 `provide` 该 Layer 输出；

分形 Runtime 模型下，推荐以某个 Root `Module`（或显式的 `ModuleImpl`）+ `Logix.Runtime.make` 定义应用/页面/Feature 级 Runtime，再通过 `RuntimeProvider runtime={...}` 作为组合根，局部增强则通过 `layer` 叠加。

## 4.1 推荐模式：Root Module + Runtime (Fractal Runtime)

最佳实践是使用 Root `Module` + `Logix.Runtime.make` 定义应用/页面级 Runtime，并通过 `runtime` 属性传入。这是全应用或某个 Feature 的 **Composition Root**。

```tsx
// src/App.tsx
import { RuntimeProvider } from '@logix/react';
import * as Logix from '@logix/core';
import { Layer } from 'effect';

const RootDef = Logix.Module.make("Root", { state: RootState, actions: RootActions });
const RootModule = RootDef.implement({
  initial: { /* ... */ },
  imports: [/* ModuleImpls / Service Layers */],
  processes: [/* Coordinators / Links */]
});

const appRuntime = Logix.Runtime.make(RootModule, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
});

function App() {
  return (
    // 复用预构建的 Runtime，启动全局服务和 Root 进程
    <RuntimeProvider runtime={appRuntime}>
      <Router />
    </RuntimeProvider>
  );
}
```

在这一模式下：

- Root Module（`RootDef.implement(...)` 的产物）通过 `imports` 引入子模块实现，通过 `processes` 声明长生命周期进程（例如 Coordinator / Link）；
- `Logix.Runtime.make` 会在内部使用 AppRuntime 机制合并 Layer、构建根 Scope 并统一 fork 这些进程；
- `RuntimeProvider` 负责在 React 应用生命周期内持有该 Runtime 的 Scope，当应用卸载时自动触发资源释放。
  > 推荐在应用级 Runtime 的 `layer` 中合并 `ReactPlatformLayer`，为 Logic Runtime 提供平台生命周期能力（`Logic.Platform`）。  
  > `ReactPlatformLayer` 本身只负责在 Env 中提供 `Logic.Platform` 服务，并将 `$.lifecycle.onSuspend/onResume/onReset` 注册的 Effect 收集起来；  
  > 具体使用哪些事件源（如 Page Visibility、路由切换、App 前后台）来触发这些生命周期回调，由宿主应用或上层框架自行接线，并通过自定义 Platform 实现或封装在 `ReactPlatformLayer` 之外的桥接代码完成。

## 4.2 兼容模式：Layer 注入 (Layer Injection)

对于局部环境增强（如 Page 层注入局部 Module），或者简单的测试场景，可以使用 `layer` 属性：

```tsx
// src/pages/OrderPage.tsx
import { RuntimeProvider, useLocalModule } from '@logix/react';
import { Layer } from 'effect';

function OrderPage({ userId }: { userId: string }) {
  const pageRuntime = useLocalModule(() => makeOrderPageModule(userId), [userId]);
  const PageLayer = Layer.succeed(OrderPageModuleTag, pageRuntime);

  return (
    <RuntimeProvider layer={PageLayer}>
      <SubComponent />
    </RuntimeProvider>
  );
}
```

> 说明
>
> - `RuntimeProvider runtime={...}` 用于提供全局应用级 Runtime，是应用或某个 Feature 的组合根；若内层 Provider 也显式传入 `runtime`，则会**完全切换到新的 Runtime**，不再继承外层；
> - `RuntimeProvider layer={...}` 用于在某个子树下增强环境（例如注入页面级 Module 或局部服务），内部会在已有 Runtime 环境之上合并传入的 Layer；当内外层共享同一 Runtime 时，内层 Provider 的 `layer` 会在同名 Tag 上覆盖外层 Env，实现局部差异化配置。

## 4.3 示例：注入外部 i18n 实例（以 i18next 为例）

当你希望在 UI（`react-i18next`）与 Logic（`@logix/i18n`）之间共享同一个 i18n 实例时，推荐做法是：

1. UI 侧：继续使用 `I18nextProvider`；
2. Logix 侧：用 `I18n.layer(driver)` 把该实例注入到 Runtime Tree 的 root provider；
3. Logic 内：用 `yield* $.root.resolve(I18nTag)` 显式读取 root 单例（避免被局部 `RuntimeProvider.layer` 覆写影响）。

概念性示例：

```tsx
import { RuntimeProvider } from "@logix/react"
import { Layer } from "effect"
import { I18n } from "@logix/i18n"
import { I18nextProvider } from "react-i18next"
import i18next from "i18next"

const i18n = i18next.createInstance(/* ... */)

const I18nLayer = I18n.layer(i18n as any)

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <RuntimeProvider runtime={appRuntime} layer={Layer.mergeAll(I18nLayer, ReactPlatformLayer)}>
        <Router />
      </RuntimeProvider>
    </I18nextProvider>
  )
}
```

> 说明：`@logix/i18n` 不强绑定 i18next；只要外部实例满足 `I18nDriver` 的最小形状即可注入。若你在 Logic 中用的是 `$.root.resolve(I18nTag)`，请确保 `I18nLayer` 注入发生在 root provider（通常是最外层 `RuntimeProvider` 或 `Logix.Runtime.make(..., { layer })`）。
