# 02 · 第一个 Kernel 表单（Basic Form）

> 对应：`core/examples/01-basic-form.md`  
> 目标：用最少的步骤，在项目里接一个「带联动和异步校验的注册表单」。

## 1. 场景复述（用户语言）

- 页面上有一个用户注册表单：用户名、密码、确认密码、所在国家/省份、自我介绍等字段；  
- 需求包括：
  - 选择国家时，省份要自动重置；  
  - 用户名需要异步重名校验，输入停顿 500ms 后请求，期间要防止多次并发；  
  - 密码和确认密码不一致时要给出明确错误。

这些都是典型的「贴近 UI 的行为」，`runtimeTarget` 很明显是 `frontend-kernel`。

## 2. 步骤一：定义表单 Schema

在任意合适的位置（例如 `src/features/register/kernel/schema.ts`）定义表单状态：

- 对应 `core/examples/01-basic-form.md` 中的 `RegisterSchema`；  
- 建议直接使用项目统一的 Schema 约定（`import { Schema } from "effect"`），方便以后与 Intent 对齐。

> 这一部分通常可以由平台/LLM 根据 Data & State Intent 自动生成，手写只是过渡期。

## 3. 步骤二：创建 Store（makeStore）

在 `src/features/register/kernel/store.ts` 中：

- 使用 `makeStore` 创建一个注册表单的 Store；  
- 填入 `schema` / `initialValues` / `services`（如 `UserApi`），并编写 `logic`。

逻辑部分对应三个子需求：

- 监听 `country`，重置 `province`；  
- 监听 `username`，调用 `UserApi.checkUsername` 并写入 `errors.username`；  
- 使用 `watchMany(['password', 'confirmPassword'])` 保证两次密码一致。

你可以直接参考 `core/examples/01-basic-form.md` 中的实现，把它移动/简化到业务仓库的实际目录结构里。

## 4. 步骤三：在 React 中接入

在 React 层推荐的接入方式是：

- 在 feature 的根组件中创建 Store（或通过依赖注入拿到）；  
- 使用 `@kernel/react` 提供的 Hook（如 `useStore` / `useField`）把字段和状态绑定到 UI 控件上；  
- 按「Dumb UI」原则：组件只读 Store 的值，只派发 `set`/`action`，不写业务逻辑。

示意流程：

1. `<RegisterPage>` 创建或获取一个 `registerStore`；  
2. 子组件 `<UsernameField>`、`<PasswordField>`、`<CountryField>` 通过 Hook 订阅对应字段；  
3. 用户输入/选择时只调用 `set('path', value)`，后续联动/校验逻辑均由 Store 的 Logic 驱动。

> 具体 Hook API 的细节见 `core/05-react-integration.md`，本手册只强调「把业务逻辑写进 Logic，而不是组件」这一习惯。

## 5. 步骤四：调试与验证

完成上述接入后，可以从两个层面验证：

- **行为层面**：  
  - 改变国家时，省份是否被清空；  
  - 用户名输入停顿 500ms 后才发请求，再输入时是否会取消前一个请求；  
  - 两次密码不一致时，是否正确显示错误。

- **调试层面**（可选）：  
  - 通过 Kernel 的 `debug$` 或 DevTools，看 `SET` / `ACTION` / `RULE_START` 等事件，确认联动链路清晰；  
  - 结合平台的 Intent/Flow 视图，检查规则与原始需求是否一致。

当这个基础表单跑顺之后，你就掌握了使用 Kernel 的最小工作流：**定义 Schema → 创建 Store → 写 Logic → 用 React 订阅**。后续列表/外部集成/调用 Flow Runtime 都是在这个模式上叠加能力。
