# 依赖注入与 Context (Dependency Injection)

> **Status**: Draft (Aligned with v3)
> **Layer**: React Adapter

本文档详细阐述如何在 React 组件树中优雅地注入 Logix 所需的依赖（Services）。我们采用 **"Implicit Context + Runtime Guard"** 模式，在保持 API 简洁的同时提供强大的运行时保障。

## 1. 核心模式：隐式上下文 (Implicit Context)

为了避免在每个 `useModule` 调用中重复传递 Layer，我们利用 React Context 在组件树上层统一注入 Runtime。

### 1.1 `RuntimeProvider`

这是依赖注入的入口。它接受一个 Effect Layer，并将其构建为 Runtime 下发给子组件。

```tsx
// App.tsx
import { RuntimeProvider } from '@logixjs/react';
import { AppLayer } from './layers';

function App() {
  return (
    // 在这里一次性注入所有服务 (API, Router, Config)
    <RuntimeProvider layer={AppLayer}>
      <Page />
    </RuntimeProvider>
  );
}
```

### 1.2 `useModule` 的自动推导

子组件中的 `useModule` 会自动从最近的 `RuntimeProvider` 获取运行时环境。

> **Performance Note**: `RuntimeProvider` 内部使用 React Context 传递 `Layer`。虽然 Context 嵌套本身开销很小，但频繁变更 Context Value 会导致子树重渲染。Logix 保证 `layer` 引用稳定，仅在依赖配置变更时更新。

```tsx
// Page.tsx
function Page() {
  // ✅ 不需要传 Layer，自动获取
  // 如果 UserModule 依赖了 ApiService，它会从 Context 中查找
  const runtime = useModule(UserModule);

  return <div>...</div>;
}
```

## 2. 运行时安全 (Runtime Safety)

由于 TypeScript 无法静态分析 React Context 的内容，我们无法在编译期保证 Service 一定存在。因此，Logix 实现了严格的 **Runtime Guard**。

### 2.1 错误处理
如果 `UserModule` 需要 `ApiService`，但上层 Provider 未提供，`useModule` 会捕获 Effect 的执行失败，并抛出友好的错误：

> **[Logix Error] Service Not Found**
> Your module requires `ApiService`, but it was not provided in the context.
> **Fix**: Please wrap your component tree with `<RuntimeProvider layer={Layer.succeed(ApiService, ...)}>`.

### 2.2 最佳实践
*   **Global Services**: (如 API, Router, I18n) 推荐在 App 根节点通过 `RuntimeProvider` 注入。
*   **Local Services**: (如 ModalConfig, TabContext) 推荐在模块根节点注入，实现局部覆盖。

### 2.3 `ModuleProvider` 快捷封装

在部分应用中，不希望为每类 Module 都单独声明一个 Context，可以在 Adapter 层提供一个通用的 `ModuleProvider` / `useModuleContext` 封装，内部依然基于 `createModuleContext` 实现：

```tsx
<ModuleProvider module={myModuleRuntime}>
  <UserProfile />
</ModuleProvider>

// 子组件
const runtime = useModuleContext();
```

这种模式适合简单场景或 Demo；在中大型项目中，仍推荐为每个领域 Module 显式创建独立的 Context，以获得更清晰的边界与类型信息。

## 3. `createModuleContext` (Module 传递)

除了注入 Services，有时我们需要将 **Module Runtime 实例本身** 注入到深层组件（避免 Prop Drilling）。

```typescript
// 1. 定义 Context
const MyModuleContext = createModuleContext<MyState, MyEvent>();

// 2. 注入 Runtime
<MyModuleContext.Provider value={runtime}>
  <DeepComponent />
</MyModuleContext.Provider>

// 3. 消费 Runtime
const runtime = MyModuleContext.useModule();
const value = MyModuleContext.useSelector(s => s.value);
```

## 4. 嵌套 Module 与跨层通信

支持 Module 的层级嵌套。子 Module 可以通过 Effect Context 访问父 Module 提供的 Services，或者直接访问父 Module 实例（如果父 Module 将自己作为 Service 暴露）。

```tsx
<ParentModuleProvider>
  <ChildModuleProvider>
    <ChildComponent />
  </ChildModuleProvider>
</ParentModuleProvider>
```

在 Child Module 的 Logic 中：
```typescript
// 通过 Effect Context 获取父级服务
const parentService = yield* ParentService;
```

## 5. 错误流与 Error Boundary 集成

Logix 暴露的 `error$` 流可以与 React Error Boundary 集成。React Adapter 推荐提供一个类似 `useErrorStream` 的 Hook，将致命错误桥接到 UI：

```tsx
useErrorStream(runtime, (error) => {
  // 当 Logix 抛出致命错误时，触发 Error Boundary 或全局提示
  showBoundary(error);
});
```

在实现上，`useErrorStream` 订阅 Runtime 的 `error$`，并在组件卸载时自动取消订阅；调用方只负责决定如何展示错误（Error Boundary、Toast、全局日志上报等）。
