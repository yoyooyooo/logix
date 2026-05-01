---
name: logix-best-practices
description: Use when generating, reviewing, or refactoring Logix code and you need self-contained Agent-first API rules, owner-lane decisions, React host usage, Form domain boundaries, verification control-plane boundaries, and runtime-core constraints.
---

# logix-best-practices

把 Logix 使用与开发收敛为“先按当前公开主链生成，再守住 owner lane 与 runtime 红线，最后保留可验证证据”的统一工作流。

## 00) 给低能力模型的输入边界

- 生成或评审当前 API 时，只读取 `SKILL.md`、`references/agent-first-api-generation.md`、任务点名的 references，以及 `references/llms/README.md` 指定的基础包。
- 代码示例默认导入：`import * as Logix from "@logixjs/core"`、`import * as Form from "@logixjs/form"`、`import { RuntimeProvider, useModule, useSelector, fieldValue, fieldValues } from "@logixjs/react"`、`import { Effect } from "effect"`。只有任务给出现有 action contract 时才额外导入 `useDispatch`。
- 默认验证代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial`。`compare` 只作为评审阶段名出现，禁止生成 compare 调用或 root compare facade。

## 0) 30 秒选路（先判断任务类型）

1. 你要让 Agent 生成或评审当前 Logix API 代码：先读 `references/agent-first-api-generation.md`。
2. 你只做业务功能，不改 runtime 内核：先读 `references/task-route-map.md` 的 L1 路径，再读 `references/workflow.md`。
3. 你在做 Form 领域能力：读 `references/agent-first-api-generation.md` 和 `references/form-domain-playbook.md`。
4. 你在做 React 宿主接入：读 `references/agent-first-api-generation.md` 和 `references/logix-react-notes.md`。
5. 你要从 shell 或 CI 跑 Agent First 验证：使用 `logix-cli` skill。
6. 你要改核心路径、诊断协议或性能关键路径：读 `references/diagnostics-and-perf-gates.md`。
7. 你要把资料直接喂给 LLM：按 `references/llms/README.md` 的顺序读取基础包，并追加 `references/agent-first-api-generation.md`。

## 1) 框架硬约束（不可越线）

- 当前公开主链：`Module.logic(...) -> Program.make(Module, config) -> Runtime.make(Program) -> React host law`。
- Form 只拥有领域 DSL、domain handle、`Form.Rule`、`Form.Error`、`Form.Companion`。
- React 读侧只走 `useSelector(handle, selector, equalityFn?)`。
- 验证控制面不进入业务 authoring surface。默认验证代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial`；`compare` 只作为评审阶段名出现。
- 稳定锚点去随机化：`instanceId/txnSeq/opSeq/tickSeq` 必须稳定可复现。
- 事务窗口禁止 IO / await / 嵌套 dispatch / `run*Task`。
- 业务不可写 `SubscriptionRef`：尤其派生 `ref(selector)` 只读。
- 诊断事件必须 Slim 且可序列化（`JsonValue`），并可解释降级。
- 不新增第二 host gate、第二 report object、第二 evidence envelope、第二 submit truth、第二 declaration carrier。
- 公开 API 与内部实现若冲突，以本 skill 的公开主链、owner-lane 决策表和禁止项为准。
- `Module.logic(id, build)` 的 builder 根部只做同步声明，返回值是唯一 run effect；不返回 `{ setup, run }` 一类公开 phase object。

完整裁决见：`references/north-star.md`。

## 2) Agent 生成默认公式

- Core：用 `Module.logic(...)` 定义逻辑，用 `Program.make(Module, config)` 装配，用 `Runtime.make(Program)` 运行。
- Form authoring：用 `Form.make(id, config, ($) => { ... })`；`config` 放 `values / initialValues / validateOn / reValidateOn / debounceMs`；`define` callback 放 `rules / field / root / list / submit`。
- Remote fact：用 `field(path).source({ resource, deps, key, triggers?, debounceMs?, concurrency?, submitImpact? })`。
- Local soft fact：用 `field(path).companion({ deps, lower })`，`lower` 必须同步、纯计算、无 IO。
- Final truth：用 `field(path).rule(...)`、`root(...)`、`list(...)`、`submit(...)`。
- React read：用 `useSelector(handle, fieldValue(path))`、少量同 UI 原子字段用 `useSelector(handle, fieldValues(paths))`、字段错误用 `useSelector(handle, Form.Error.field(path))`、companion 用 `useSelector(handle, Form.Companion.field(path))` 或 `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`。
- L0/L1 默认 Form 错误读取只生成 `Form.Error.field(path)`。其他错误聚合读取需要任务明确给出。
- React write：只有现有 action contract 明确给出时才用 `useDispatch(handle)`；禁止根据字段名、submit 文案或 UI 事件猜 string action 或 payload shape。
- Verification：业务代码只生成 `Logix.Runtime.check` 与 `Logix.Runtime.trial(mode: "startup")`。行为脚本需要交互验证时，才在验证文件内使用交互试运行。`compare` 只作为评审阶段名出现，不生成任何 compare 调用。

## 2.1) 内部工具 dogfood 规则

- 做 Devtools、Playground、Sandbox 这类内部工具时，默认把工具自身的 control state 放进 Logix module：选中 tab、展开态、运行态、session、日志、trace、选中对象、工作区 revision 都优先由 `Module.make + Program.make + useModule/useSelector/useDispatch` 承载。
- React 层只保留宿主桥接：DOM 事件、外部 mutable adapter、异步 runner promise、`useMemo/useRef/useEffect/useCallback` 这类 React 生命周期 glue。不要用散落的 `useState/useReducer` 维护可观测业务状态副本。
- 读侧仍只走 `useSelector(handle, selector, equalityFn?)`，写侧只走已定义 action contract 的 `useDispatch(handle)`。内部工具可以定义自己的 action contract，但不能在组件里发明临时 string action。
- 若某个状态暂时必须留在 React 或外部对象里，必须是明确 bridge，例如 Monaco/Sandpack/workspace adapter 的实例引用；同时用 Logix 记录可诊断的最小投影，例如 revision、active id、status、last operation。
- Dogfood 改造优先压出 runtime 与 React host 的不顺手处。若需要靠多层 props 传递、重复 selector、第二套 session truth 才能实现，应优先回看模块边界和公开 API。
- Playground 项目目录按 `references/platform-integration-playbook.md` 的 `Playground 项目目录最佳实践` 执行：Logic-first virtual entry 用 `/src/main.program.ts`，领域逻辑用 `/src/logic/*.logic.ts`，service 用 `/src/services/*.service.ts`，Driver/Scenario 留在作者侧 project metadata。
- Playground editor surface 按 `references/platform-integration-playbook.md` 的 `Playground 编辑器最佳实践` 执行：Monaco 是默认路径，TypeScript language service 读取当前 `ProjectSnapshot.files` 与本地 type bundle，textarea 只作 fallback。

## 3) 常见误生成红线

- 不把远端 IO 放进 `companion.lower`。
- 不把 final blocking、error verdict 或 submit verdict 放进 `companion`。
- 不新增 Form-owned React hook family、public path carrier、public row owner token 或第二 fact namespace。
- 不把 returned carrier 当 selector 直接传给 `useSelector`。
- 不在 action contract 缺失时发明 submit action、string action 或 payload shape。
- 不把 `void` callback 的 companion exact typing 写成已闭合。
- 不把 `fixtures/env + steps + expect` 写成业务 authoring API。
- 不生成 compare 调用、public scenario object、public report object 或 raw evidence default compare。

## 4) 阅读导航

- Agent-first API 生成守则：`references/agent-first-api-generation.md`
- 任务路线图（L0-L3）：`references/task-route-map.md`
- 工作流与交接清单：`references/workflow.md`
- 北极星与硬约束：`references/north-star.md`
- Core 语义与常见坑：`references/logix-core-notes.md`
- 诊断与性能证据门：`references/diagnostics-and-perf-gates.md`
- 可观测与回放：`references/observability-and-replay-playbook.md`
- 平台集成与对齐实验：`references/platform-integration-playbook.md`
- 文档/样例/脚本一致性核对：`references/consistency-checklist.md`
- LLM 基础知识包（可直接转 llms.txt）：`references/llms/README.md`

## 5) 专题手册（按需加载）

- Builder SDK：`references/builder-sdk-playbook.md`
- IR 与 Codegen：`references/ir-and-codegen-playbook.md`
- 测试策略：`references/testing-strategy-playbook.md`
- Logix Test：`references/logix-test-playbook.md`
- CLI 自我验证：`../logix-cli/SKILL.md`
- Form 领域落地：`references/form-domain-playbook.md`
- React 注意事项：`references/logix-react-notes.md`
- Pattern 复用门禁：`scripts/check-pattern-reuse.mjs`
