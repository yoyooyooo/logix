# 从“Props 传递地狱”到“组合式逻辑”：前端为何需要 Effect-TS？

> **面向读者**：熟悉 React/Vue，但受够了在组件、Hooks 和工具函数之间透传 `api`、`router`、`toast` 的前端开发者。
> **案例背景**：一个典型的**用户登录与引导流程** (User Login & Onboarding Flow)。

在现代前端开发中，UI 组件往往只负责“并现”，而真正的业务逻辑（比如登录、支付、复杂的表单提交）通常会抽离到 Hooks 或独立的逻辑层中。

但你是否遇到过这种尴尬：为了写一个纯粹的 `login` 逻辑函数，你不得不传递一大堆跟业务无关的“基础设施”对象？

## 1. 痛点：基础设施与业务逻辑的耦合

假设我们需要实现一个 `handleLogin` 流程：

1.  调用 API 登录。
2.  登录成功后，记录埋点 (Analytics)。
3.  弹出“欢迎回来”的轻提示 (Toast)。
4.  跳转到首页 (Router)。

### ❌ 传统写法：参数轰炸或全局单例

**写法 A：全部通过参数传进来 (Props/Args Drilling)**

```typescript
// purely logic function (in utils/auth.ts)
export const handleLogin = async (
  username: string,
  // 😭 下面这些参数跟“业务逻辑”本身其实没关系，但为了能跑通，必须得传
  api: ApiClient,
  router: RouterInstance,
  toast: ToastService,
  tracker: AnalyticsTracker
) => {
  try {
    await api.login(username);
    tracker.track("login_success");
    toast.show("欢迎回来");
    router.push("/dashboard");
  } catch (e) {
    toast.error("登录失败");
  }
}

// 在组件里调用 (Component.tsx)
const LoginButton = () => {
  // 组件被迫通过 Hooks 获取所有这些基础设施
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const tracker = useAnalytics();

  // 然后一股脑塞给逻辑函数
  const onClick = () => handleLogin("yoyo", api, router, toast, tracker);

  return <button onClick={onClick}>登录</button>;
}
```

**写法 A 的问题**：组件沦为了“依赖搬运工”，代码显得非常啰嗦。

**写法 B：直接引入全局单例 (Global Singletons)**

```typescript
import { api } from '@/services/api'
import { router } from '@/router' // 直接 import 全局对象

export const handleLogin = async (username: string) => {
  await api.login(username) // 强依赖全局对象
  router.push('/dashboard')
}
```

**写法 B 的问题**：

1.  **难以测试**：你想写单元测试测 `handleLogin`？你得 Mock 全局的 `import`，或者搞乱全局环境。
2.  **通用性差**：如果你的 App 要复用到 React Native 或 Electron，但它们的 `router` 实现完全不同，这代码就废了。

## 2. 解法：Effect 的“逻辑组合”

Effect-TS 允许我们在写业务逻辑时，暂时**不关心** `router` 或 `api` 到底是谁，只声明“我需要这种能力”。

这就像 React 的 `useContext`，但是脱离了组件树，可以在任何纯函数中使用。

### ✅ Effect 写法：声明式依赖

```typescript
// 1. 定义能力接口 (Interface/Tag)
class Navigation extends Context.Tag('Navigation')<
  Navigation,
  {
    push: (path: string) => Effect.Effect<void>
  }
>() {}

class Toast extends Context.Tag('Toast')<
  Toast,
  {
    show: (msg: string) => Effect.Effect<void>
  }
>() {}

class Api extends Context.Tag('Api')<
  Api,
  {
    login: (user: string) => Effect.Effect<void>
  }
>() {}

// 2. 纯粹的业务逻辑 (Logic)
// 注意：参数里完全没有 router, toast, api！
export const handleLogin = (username: string) =>
  Effect.gen(function* () {
    // 🪄 Magic: "给我这些能力，具体是谁提供的我不管"
    const nav = yield* Navigation
    const toast = yield* Toast
    const api = yield* Api

    // 像写同步代码一样流畅
    yield* api.login(username)

    // 并行执行：一边跳转，一边弹窗
    yield* Effect.all([nav.push('/dashboard'), toast.show('欢迎回来')], { concurrency: 'unbounded' })
  })
```

**在组件里使用：**

```typescript
// Component.tsx
const LoginButton = () => {
  // 一次性获取所有能力的“运行时实现” (通常在 App 根节点就会注入好)
  const runtime = useLogixRuntime();

  const onClick = () => {
    // 运行逻辑
    runtime.runPromise(handleLogin("yoyo"));
  };

  return <button onClick={onClick}>登录</button>;
}
```

## 3. 前后对比：前端场景实战

| 维度         | 传统 (Hooks/Props)                                       | Effect 写法 (Context)                                                          | 前端优势                                                                       |
| :----------- | :------------------------------------------------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **逻辑复用** | 很难。Hooks 只能在组件里用；纯函数需要传一堆参数。       | **极高**。Effect 逻辑是纯数据，可以在 React 组件里跑，也可以在 Node 脚本里跑。 | 比如你的“表单校验逻辑”，既可以用在前端 UI，也可以无缝复用到 BFF 层做接口校验。 |
| **单元测试** | 需要渲染组件 (`renderHook`) 或 Mock 复杂的 Hook 返回值。 | `Effect.provide(Navigation, MockNav)`                                          | 测试极其简单。不需要浏览器环境 (jsdom)，不需要渲染 React 组件树。              |
| **跨端开发** | 需要拆分 `.web.ts` 和 `.native.ts`                       | 逻辑代码只有一份。                                                             | Web 端注入 `WebRouter`，RN 端注入 `StackRouter`，业务逻辑代码一行都不用改。    |
| **异常处理** | `try/catch` 散落在各个回调里，容易吞掉错误。             | 错误也是一种类型 (`E`)。                                                       | 编译器会强制你处理登录失败的逻辑，不会出现“点击没反应”的静默 bug。             |

## 4. 总结：UI 归 UI，逻辑归逻辑

在复杂的前端应用中，我们一直在追求 **View (视图)** 和 **Logic (逻辑)** 的分离。

- **React** 负责渲染：把状态映射为 DOM。
- **Effect** 负责逻辑：管理副作用、处理依赖、编排异步流程。

通过 Effect-TS，我们终于可以将复杂的业务流程（如“多步问卷”、“结账流程”）从 React 组件树中剥离出来，写成**独立、可测、可移植**的纯逻辑模块。组件变得更轻、更纯粹。
