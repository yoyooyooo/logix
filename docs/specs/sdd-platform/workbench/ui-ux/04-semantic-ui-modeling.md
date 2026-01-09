---
title: 04 · Semantic UI Modeling & Wiring Protocol
status: draft
version: 1.0 (Extracted from Platform Shapes)
---

> **目标**：在 AI 时代避免回到“拖 div + 选事件”的传统低代码，实现 **组件层完全语义化 + 与 Logix/Traits 的解耦接线**，同时让 Sandbox/Alignment 能在不依赖真实 UI 库的情况下验证行为。

> 语义绑定协议（UI↔Logic 的 Binding Contract）见：`docs/specs/sdd-platform/workbench/ui-ux/12-logic-ui-binding.md`。

## 1. 语义组件模型：UiPort 作为“端口”而非 React 组件

**What**：平台视角中的组件不是 JSX，而是一组带语义的端口（UiPort）：

- 每个实例有：`id`（实例 id）、`type`（语义类型，如 `SearchTable`、`PrimaryButton`）、`slots`（子区域，如 `toolbar`/`footer`）；
- `inputs` 部分描述它“从哪里读数据”：
  - 静态 `props`：展示/配置属性（列名、标题、占位文案等）；
  - 动态 `bindings`：将组件的某个 prop 绑定到 Module 的某个 state/view/trait（例如 `dataSource ← OrderModule.state.list`）；
- `outputs` 部分描述它“向外发什么信号”：
  - 例如 `onSubmit`、`onSearch`，每个信号都可以接到 `module.action` 或某条 IntentRule 上。

对应到实际实现：

- React/Vue 组件层只关心如何将 UiPort 映射为 `props + onXxx`，完全不感知 Logix/Effect；
- Logix/Traits 层只看到“有 UI 在读/写某些状态/动作”，完全不知道具体 UI 库；
- Intent/Definition 层只记录 “UiPort ↔ Module/Intent 的接线”。

## 2. 接线协议：UiBinding & UiSignal

结合上面的抽象，可以约束一份平台级“接线协议”：

- `UiBinding`：描述“组件属性 ← 逻辑层”的关系：
  - `targetProp`：例如 `dataSource`、`value`；
  - `source`：`{ moduleId, kind: 'state' | 'view' | 'trait', path }`。
- `UiSignal`：描述“组件事件 → 逻辑层”的关系：
  - `name`：例如 `onClick`、`onSearch`；
  - `wiring`：`{ moduleId, kind: 'action' | 'intent', name }`。

这套协议可以落在：

- v3 UI Intent / UIIntentNode 上（新增 `bindings`/`signals` 字段），或
- 一份独立的 `UiBindingSpec`（Module 图纸或 Blueprint 的子资产）。

关键是：**平台只编辑这份接线，具体组件库可以换，逻辑层不会受影响。**

## 3. Semantic UI Mock：UI 层的 Executable Spec

`topics/sandbox-runtime/20-dependency-and-mock-strategy.md` 中已经定义了 Semantic UI Mock 的方向：

- 编译期将真实 UI 库（如 `antd`/`mui`）的 import 重写为 `semantic-ui-mock`；
- Worker 里用 Headless Mock 组件替代真实 DOM 渲染：
  - 仍然消费 UiPort 的 `inputs`（props + bindings），执行子树逻辑；
  - 不画像素，而是发射 `UI_INTENT`：包含组件类型、交互位置（Button、Select）、关联的 storyId/stepId/props 等；
- Host 负责用线框组件渲染这些 UI_INTENT，并把用户点击再通过协议回传给 Worker。

结合上面的接线协议，可以理解为：

- UiPort/UiBinding/UiSignal 决定“UI ↔ 逻辑”的接线；
- Semantic UI Mock 决定“UI 在 Sandbox 里如何被执行与观测”，并把行为降维为 UI_INTENT 事件流；
- Alignment Lab 把 UI_INTENT 与 ScenarioSpec/IntentRule 对齐，用于验证“需求级交互是否被正确实现”，而不是验证具体 UI 样式。

## 4. 产品视角 vs 开发视角：同一棵语义组件树

在这一模型下，平台可以自然地为不同角色提供不同视图：

- 产品视角：
  - 在 Blueprint/Spec Studio 里只看到语义组件树：
    - “这里有个 SearchTable 显示订单列表，顶部有 FilterBar，右侧有 DetailPanel”；
  - 绑定信息以自然语言呈现：
    - “数据内容：订单列表”；“点击后：提交订单表单”。
  - 不需要看到 `state.path` 或 Trait 名称，更不用配任何 Query/Env/Layer。
- 开发视角：
  - 同一棵树右侧多一个“接线面板”：
    - 左列列出组件的 inputs/outputs；
    - 右列列出当前 Feature 下可用的 state/view/trait/action/intent；
    - 通过下拉/连线完成绑定，底层写入 UiBinding/UiSignal；
  - 对老页面，Dev Server 可从 TSX 解析出初步 UiPort/UiBinding，开发在 UI 中编辑后反向 Patch 代码。

## 5. 与 Sandbox/Alignment 的闭环

结合 Sandbox Runtime 的 Mock 策略，可以形成 UI 层的一条闭环链路：

- Spec/Blueprint/Definition 确定语义组件树与接线（UiPort/UiBinding/UiSignal）；
- 在 Sandbox 中，Semantic UI Mock 将这些组件变成 UI_INTENT 流；
- RunResult 中同时包含：`evidence.events`（ObservationEnvelope/RuntimeDebugEventRef）、StateSnapshot/Patch、UI_INTENT 流（口径见 `docs/ssot/platform/contracts/01-runresult-trace-tape.md`）；
- Alignment Lab 使用 ScenarioSpec 的 Step/Rule 对 UI_INTENT + StateSnapshot 做断言，生成 AlignmentReport；
- Report 再驱动开发/AI 调整 Blueprint/接线/逻辑，实现 UI 层与 Intent 的自愈。
