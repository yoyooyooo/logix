# 12 · Logic-UI Semantic Binding Architecture

> 本文确立了 SDD 平台如何实现“逻辑 (Logic)”与“界面 (UI)”的低代码式连接。其核心理念是：拒绝黑盒 Runtime 锁死，通过**Semantic Binding Protocol (语义绑定协议)** 连接 Intent 与 Component，支持**解析执行**与**Pro-Code 出码**两种消费模式。

## 1. 核心架构哲学

在 Logix 体系下，"低代码衔接"本质上是**三层协议的映射**：

```mermaid
graph TD
    Logic[Logic Intent<br>(Static IR)] -->|Expose Sockets| Agreement
    Component[UI Component<br>(Manifest)] -->|Expose Plugs| Agreement

    Agreement[Semantic Binding<br>(JSON Protocol)]

    Agreement -->|Intrepret| Runtime[Dynamic Runtime<br>(Preview Mode)]
    Agreement -->|Compile| CodeGen[Pro-Code Output<br>(Production Mode)]
```

- **Logic (Headless)**: 负责 Data, State, Validation, Intent。它不知道 button 是方的圆的。
- **UI (View)**: 负责 Component Tree, Styling, Events。它不知道 `disabled` 背后是权限不足还是网络错误。
- **Binding**: 负责 Match。它说：“当 `Logic.canSubmit` 为 false 时，`Button.disabled` 为 true”。

---

## 2. 元数据层：Available Sockets (插座与插头)

为了实现类型安全的连接，两端必须暴露标准化的元数据。

### 2.1 Logic Manifest (Source)

Derived from `Static IR` & `Schema`.

```typescript
interface LogicManifest {
  moduleId: 'UserModule'
  states: {
    canSubmit: { type: 'boolean'; doc: 'Whether the form is valid and submittable' }
    'user.name': { type: 'string'; doc: 'User input name' }
  }
  actions: {
    submit: { type: '() => void'; doc: 'Trigger form submission' }
    reset: { type: '() => void' }
  }
}
```

### 2.2 Component Manifest (Target)

Provided by UI Library Registry (e.g., Antd Adapter).

```typescript
interface ComponentManifest {
  id: 'Antd.Button'
  props: {
    disabled: { type: 'boolean'; bindable: true }
    loading: { type: 'boolean'; bindable: true }
    type: { type: 'enum'; options: ['primary', 'default'] }
  }
  events: {
    onClick: { type: 'Event -> void' }
  }
}
```

---

## 3. 绑定层：The Binding Schema (连线协议)

当用户在画布上连线时，平台生成独立于代码的 **Binding JSON**。它是“意图连接”的持久化存储格式。

```json
{
  "componentId": "btn_submit_01",
  "componentType": "Antd.Button",
  "bindings": {
    "disabled": {
      "type": "LogicState",
      "path": "UserModule.canSubmit",
      "transform": null // 可选：支持简单的 value transfer，如 !value
    },
    "loading": {
      "type": "LogicState",
      "path": "UserModule.isSubmitting"
    },
    "onClick": {
      "type": "LogicAction",
      "name": "UserModule.submit",
      "args": []
    }
  }
}
```

**特点**：

1.  **Declarative (声明式)**：描述“连接关系”而非“实现代码”。
2.  **Type-Safe (类型安全)**：平台可静态检查 `LogicState(string)` 不能连给 `Prop(boolean)`。
3.  **Refactor-Friendly (重构友好)**：因引用的是语义路径 (Path)，当底层逻辑重构时，平台可自动迁移或报错提示。

---

## 4. 消费层：三级代码降解策略 (Tri-Mode Ejection Strategy)

这是 Logix SDD 区别于传统 Low-Code 的核心点。为了彻底消除 Vendor Lock-in，我们设计了三级可平滑切换的降解模式，用户可根据需求随时“跳伞”。

### Level 1: Platform Managed (全托管/解释执行)

**场景**：WebIDE 预览、业务人员搭建、A/B Test 动态页。
**核心**：`JSON Binding Schema` + `Dynamic Runtime`。
**优势**：极速迭代，所见即所得，无编译等待。

```tsx
// 运行时伪代码
const WidgetRenderer = ({ widget }) => {
  // 按照 Schema 动态订阅 State 和 Action
  const props = useDynamicBinding(widget.bindings)
  return <GenericComponent type={widget.type} {...props} />
}
```

### Level 2: Pro-Code Codegen (React / Framework Code)

**场景**：生产环境构建、前端工程师二次开发。
**核心**：`Compiler` -> `TSX`。
**动作**：平台将 JSON 编译为标准的 React 组件代码。
**优势**：

- **Zero Runtime Overhead**：产物就是普通 React 代码。
- **Ejectable**：你可以直接把生成的 `tsx` 文件拿走，作为普通项目维护。

```tsx
// 生成产物：标准的 React 组件
export function LoginPage() {
  const { state, actions } = useModule(UserModule) // 强类型 Hook
  return (
    <Button disabled={state.canSubmit} onClick={actions.submit}>
      提交
    </Button>
  )
}
```

### Level 3: Pure Logix Code (Domain Logic Ejection)

**场景**：**彻底去平台化**、逻辑复用到非 Web 环境、遗留系统集成。
**核心**：只保留业务逻辑本身，剥离所有 React/View 胶水代码。
**动作**：平台只输出 `Module.ts` 定义，UI 层完全甚至不生成，只给你提供“纯洁的逻辑”。

**你将得到的文件 (`UserModule.ts`)**：

```typescript
import { Effect, Schema } from "effect";
import * as Logix from "@logix/core";

// 只有纯逻辑，没有 React，没有 Hooks，没有 Binding JSON
export const UserModule = Logix.Module.make("User", {
  state: Schema.Struct({ canSubmit: Schema.Boolean }),
  actions: { submit: Schema.Void }
}).logic(($) => ({
  run: Effect.gen(function*() {
    // 这里是你核心的业务资产，完全独立于 UI 框架
    yield* $.onAction("submit").run(...)
  })
}));
```

**价值**：
这是对用户资产的最大尊重。即使 SDD 平台倒闭了，你的业务逻辑（验证规则、流程跳转、数据处理）依然作为标准的 TypeScript + Effect 代码完好无损地保存在本地，你可以随时用任何方式（Vue/Svelte/Angular）去消费它，**除了 Logix Runtime 本身，没有任何平台特定的运行时依赖**。

---

## 5. UI 差异化与平台适配

基于此架构，实现“一套逻辑，多端渲染”变得自然：

1.  **Web Target**: Compiler 使用 `AntdAdapter`，生成 `<Button>` 代码。
2.  **Native Target**: Compiler 使用 `RNAdapter`，生成 `<TouchableOpacity>` 代码。
3.  **小程序 Target**: Compiler 使用 `TaroAdapter`，绑定 `bindtap` 事件。

逻辑层 (`UserModule`) 及其测试用例在所有端完全复用，因为它是 **Headless** 的。
