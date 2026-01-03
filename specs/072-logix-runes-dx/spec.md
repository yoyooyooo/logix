# Feature Specification: Logix Runes（Svelte-like 赋值驱动状态语法糖）

**Feature Branch**: `072-logix-runes-dx`  
**Created**: 2026-01-03  
**Status**: Draft  
**Input**: User discussion: "我主要想像 svelte 那样的响应式语法糖：`let count = $state(0); count += 1` 直接修改即可触发更新；背后还是用 Logix 去支撑。"

## Context

在当前的 Logix + React 开发体验中，即使只是一个非常简单的“局部可变状态”（例如计数器、展开/收起、输入框临时值），也通常需要走 Module/actions/reducers 或 `useSelector` + `useDispatch` 的组合。虽然这带来了可诊断性与可回放的优势，但在“极小状态 + 高频交互”的场景里，开发者会感受到明显的样板代码与心智负担。

本特性目标是提供一套**可选、可控、可追踪**的语法糖：让开发者在组件内能用接近 Svelte 5 `$state` 的写法表达局部响应式状态，并且在“写侧”仍然不绕过 Logix 的可追踪通道（事务/诊断/Devtools），避免把 DX 提升建立在“可解释链路断裂”之上。

## Terminology

- **Rune Variable**：由 `$state(initial)` 声明的局部响应式变量（例如 `let count = $state(0)`）。
- **Runes Transform**：编译期代码改写，将对 Rune Variable 的读/写映射到 Logix 的可追踪状态读写。
- **Runes Runtime**：运行时承载 Rune Variable 的状态容器（以 Logix 的状态模型承载，保证 trace/diagnostics 链路）。
- **Supported Operators**：本特性明确支持的赋值/自增语法集合（见 Scope）。

## Scope

### In Scope

- 提供 Rune Variable 的声明语法：`let x = $state(initial)`。
- 在 Vite（dev/build）下提供可用的 Runes Transform：对 TS/TSX/JS/JSX 源码进行编译期改写，使 Rune 的读/写生效且行为可预测。
- 支持通过**赋值语法**触发更新（无需显式调用 `dispatch` / `setState` 风格 API）：
  - `x = <expr>`
  - `x += <expr>`
  - `x -= <expr>`
  - `x++` / `x--` / `++x` / `--x`
- 更新语义必须保持“可追踪写入”：Rune 的写侧不得绕过 Logix 的 reducer/transaction 证据路径（不提供可写 SubscriptionRef 逃逸口）。
- 运行期错误口径清晰：当未启用 Runes Transform（或语法不受支持）时，应给出可操作的错误信息/诊断提示（避免静默失败或产生难以理解的行为差异）。
- Devtools 可解释：当启用诊断/Devtools 时，Rune 的每次写入都应能在时间线中被观察并可归因（至少包含 moduleId/instanceId/txnSeq 等稳定锚点）。

### Out of Scope (Non-goals)

- 完整复刻 Svelte 的所有响应式语义（例如任意表达式依赖跟踪、对象/数组的深层属性赋值拦截、跨文件自动传播）。
- 支持所有 bundler/编译链路（首版不要求覆盖非 Vite 的构建系统；其它环境作为后续扩展）。
- 允许业务代码直接写 `ref(selector)` 或任何“可写 Ref”来绕过 action/reducer（与 Logix 的可诊断性约束冲突）。
- 把 Rune 作为跨组件/跨模块的全局状态方案（Rune 仅定位为“组件内局部状态”的 DX 语法糖）。

## Assumptions

- 目标用户是使用 Logix + React 的业务/平台开发者；Rune 用于“局部状态”的高频交互场景。
- 首版验收环境以 Vite 为准（同时覆盖 dev 与 build），其它 bundler 不作为本特性验收边界。
- Runes 是**显式 opt-in** 的能力：只有在启用 Runes Transform 的代码路径中才生效；未启用时必须 fail-fast 并提示如何开启。
- 首版的语法支持范围以“可预期、可诊断、可静态改写”为优先；遇到歧义或高风险语义时，宁可明确拒绝并提示替代写法。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 用 Svelte-like 写法表达局部响应式状态 (Priority: P1)

作为 Logix + React 的开发者，我希望在组件里能够用 `let count = $state(0)` 声明局部状态，并用 `count += 1` 这种赋值语法直接更新，从而减少样板代码、提升编写效率，同时保持 UI 更新可靠。

**Why this priority**: 这是 DX 升级的核心价值；如果仍需显式 `dispatch` 才能更新，就无法达到“像 Svelte 一样顺手”的体验。

**Independent Test**: 在一个最小组件中，仅靠 Rune 的声明与赋值语法完成“显示 count → 点击按钮递增 → UI 更新”闭环，不依赖额外模块/logic 代码。

**Acceptance Scenarios**:

1. **Given** 启用 Runes Transform 且组件内声明 `let count = $state(0)`，**When** 点击按钮触发 `count += 1`，**Then** 页面展示的 `count` 必须递增且无撕裂。
2. **Given** 同一组件内声明多个 Rune Variable（例如 `count` 与 `open`），**When** 分别通过赋值语法更新，**Then** 各变量更新互不干扰且 UI 反映正确。
3. **Given** 更新发生在异步回调中（例如 `setTimeout`、Promise 回调），**When** 回调里执行 `count += 1`，**Then** 更新必须基于**最新提交值**进行计算，而不是基于旧 render 闭包的值。

---

### User Story 2 - 不断链的可诊断与可归因更新 (Priority: P2)

作为 Logix 维护者/调试者，我希望 Rune 的写入仍走 Logix 的可追踪路径，并且在启用 Devtools 时可以解释每次更新的来源与顺序，从而避免 DX 提升导致“状态更新不可追溯”。

**Why this priority**: 这是 Logix 的核心优势之一；DX 升级不能以牺牲可解释性为代价。

**Independent Test**: 在启用 Devtools 的环境中触发若干次 Rune 更新，能在时间线中看到对应的 state commit/trace，并能关联到稳定的 instance 锚点。

**Acceptance Scenarios**:

1. **Given** Devtools 启用且触发 Rune 更新，**When** 查看时间线/诊断事件，**Then** 必须能观测到与该更新对应的 commit/trace（包含稳定身份锚点）。
2. **Given** 高频连续点击导致多次 `count += 1`，**When** 观察更新顺序，**Then** 必须保持 FIFO 且无丢失/重排。

---

### User Story 3 - 失败时反馈清晰、可控降级 (Priority: P3)

作为业务开发者，我希望当我忘记启用 Runes Transform、或写了当前版本不支持的语法时，系统能给出清晰的错误信息与替代建议，而不是静默变成普通局部变量或在运行期出现难以定位的异常。

**Why this priority**: 语法糖如果“偶尔生效/偶尔不生效”，会显著降低信任并增加排障成本。

**Independent Test**: 在未启用 transform 的项目里运行含 `$state` 的代码，应直接得到明确错误；在写入不支持语法时，应得到可定位的诊断信息。

**Acceptance Scenarios**:

1. **Given** 未启用 Runes Transform，**When** 代码包含 `$state(...)` 并被执行，**Then** 必须 fail-fast，并提示如何启用 transform（而不是静默运行）。
2. **Given** 开发者写了当前版本不支持的更新语法（例如对对象深层属性赋值），**When** 构建或运行，**Then** 必须给出清晰的错误/诊断与替代写法建议。

### Edge Cases

- Rune Variable 在内层作用域被同名变量 shadow（例如 `for (...) { let count = 0 }`）时，应只改写外层 Rune，避免误改写 shadow 变量。
- 同一语句中出现多次写入（例如 `count += 1; count += 1`）时顺序一致且可追踪。
- `count++` / `++count` 的表达式返回值语义需要与 JavaScript 保持一致（返回旧值或新值），同时仍触发一次写入。
- 不支持/高风险语法必须显式拒绝（例如解构赋值、别名引用后写入、对象深层属性写入）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Rune Variable 的声明语法：`let x = $state(initial)`。
- **FR-002**: 系统 MUST 支持通过赋值/自增语法更新 Rune Variable，并触发 UI 更新：`= / += / -= / ++ / --`。
- **FR-003**: 对于 `+=/-=/++/--` 这类“基于旧值的更新”，系统 MUST 保证更新计算基于**最新提交值**（避免旧闭包导致的丢更新/覆盖）。
- **FR-004**: 系统 MUST 明确并限制支持的语法集合；对不支持的模式 MUST 提供清晰的诊断与替代建议（优先在构建期报错）。
- **FR-005**: Rune 的写侧 MUST 通过 Logix 的可追踪写入路径完成，不得提供可写 Ref/SubscriptionRef 的逃逸口给业务代码。
- **FR-006**: Rune 更新 MUST 保持单实例内的 FIFO 顺序与无丢失语义（与 Logix 的单实例事务队列语义一致）。
- **FR-007**: 当启用诊断/Devtools 时，Rune 的每次写入 MUST 产生可观察的状态提交证据，并可用稳定身份锚点归因。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Runes MUST 为 opt-in 能力：未启用 transform 的代码路径不应引入额外运行时开销；启用后新增开销需可解释且可测。
- **NFR-002**: Runes 的实现 MUST 遵守事务窗口约束：不在同步事务窗口内执行 IO/异步阻塞工作；写入通过既有的可序列化事务通道完成。
- **NFR-003**: 诊断事件 MUST Slim 且可序列化；当诊断关闭时，运行时开销应接近零。
- **NFR-004**: 任何触及 Logix Runtime 核心路径的改动（若未来需要）MUST 提供可复现的性能基线/对比证据，并同步更新诊断链路与用户文档（forward-only：用迁移说明替代兼容层）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 开发者能在一个最小 React 组件中用 `$state` + `count += 1` 完成“交互 → UI 更新”闭环，不需要显式 `dispatch`/`setState` 风格调用。
- **SC-002**: 在未启用 transform 的环境中，运行含 `$state` 的代码会立即给出可操作的错误信息（包含启用方式或指向文档）。
- **SC-003**: 在启用 Devtools 的环境中，Rune 的每次写入都能在时间线中被观测并与稳定身份锚点关联。
- **SC-004**: 对于 `+=/-=/++/--`，在异步回调中更新不会因闭包捕获导致“基于旧值计算”的丢更新问题。
