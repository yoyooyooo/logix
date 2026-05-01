---
title: React Host Projection Boundary
status: living
version: 10
---

# React Host Projection Boundary

## 目标

冻结 Logix 的 React exact host contract。

这页在 Form supporting routing law 下只承接：

- host-owned adjunct exact contract
- adjunct import shape
- host-side wrapper / factory / sugar prohibition

## 当前公式

React exact host contract 收口为下面这组对象与动作：

- `RuntimeProvider`：runtime scope provider
- `Program`：装配蓝图
- `ModuleRuntime`：真实实例
- `ModuleTag`：当前 scope 下的唯一绑定符号
- `useModule(ModuleTag)`：lookup 当前 scope 中的共享实例
- `useModule(Program, options?)`：instantiate 或复用局部实例
- `parent.imports.get(ModuleTag)`：按 parent instance scope 解析 child 实例
- `useImportedModule(parent, ModuleTag)`：`parent.imports.get(ModuleTag)` 的 hook 形态
- `useDispatch(handle | runtime)`：稳定派发入口
- `useSelector(handle, selector, equalityFn?)`：读取 state projection

day-one 公开公式固定为“两构造 + 一解析”：

- `useModule(ModuleTag)`
- `useModule(Program, options?)`
- `useImportedModule(parent, ModuleTag)` / `parent.imports.get(ModuleTag)`

读取规则固定为：

- `useDispatch(handle | runtime)`
- `useSelector(handle, selector, equalityFn?)`

当前 public contract 只保留 canonical host law。

public no-arg `useSelector(handle)` 不属于终局 React host contract。整 state snapshot 读取只允许停在 repo-internal Devtools、debug 或 test harness 路线。

React host selector input 必须交给 core selector law 产出 precision quality 与 route decision。React host 只消费 core route，不保留独立的 broad / dynamic / topic eligibility 判断。

Core route identity 必须包含 selector fingerprint。selector fingerprint 至少覆盖 static shape、reads、equality kind、operator/projection shape，以及 path-authority digest 或 epoch。`selectorId` 只保留为诊断 label，不作为唯一 read-topic identity。

Dynamic fallback、broad-root、broad-state、unknown precision、dirty-all、missing path authority、unsafe coarse dirty root 与 evaluate-all fallback 在 dev/test 默认失败。internal debug / resilience marker 只能由内部 runtime capability、DI 或 repo-internal harness 生成，不能进入 public types、root exports、README 示例或 Agent 生成材料。

React selector-quality evidence 只作为 debug trace、scenario artifact 或 repo-internal host harness 产物出现。`runtime.check` 与 startup trial 不隐式声称 React commit、subscription fanout 或 render isolation。

## 为什么这样设计

这条公式服务两个目标：

- 对人：把 blueprint、instance、binding symbol、scope boundary 拆开，避免把它们混成一个概念
- 对 Agent：只保留 lookup、instantiate、parent-scope child resolution 三条稳定规律，减少 hook 面分叉

## 核心边界

### RuntimeProvider

- `RuntimeProvider` 只负责把一个已存在的 runtime 投影到 React 子树
- 它定义一棵 React 子树当前可见的 runtime scope
- 它可以承接 host-only policy，例如 `fallback / preload / layer overlay / sync-suspend-defer gating`
- 它不负责选择 `Program`
- 它不负责业务装配
- 它不定义第二 control plane
- `RuntimeProvider.onError` 只作为 runtime diagnostics observation sink
- `RuntimeProvider.onError` 不注册 per-logic lifecycle handler
- `RuntimeProvider.onError` 不决定 recovery、retry、suppression 或 instance lifetime
- readiness failure 由 runtime startup / diagnostics 产生，React host 只能观察和投影

### Development Hot Lifecycle Law

- Development hot lifecycle is enabled once through a host dev lifecycle carrier, such as a React development entrypoint, Vite development integration, or Vitest setup entrypoint.
- Ordinary app and example code keeps the target authoring shape: create a runtime normally and pass it to `RuntimeProvider`.
- The host dev lifecycle carrier derives the owner key, injects lifecycle owner / registry / evidence services into runtime internals through Effect DI or an equivalent internal layer boundary, and delivers host hot update boundaries.
- `RuntimeProvider` projects the current runtime into React and does not own lifecycle truth.
- A host hot boundary may deliver invalidation to the injected runtime owner, then the owner decides `reset` or `dispose`.
- Current first wave only admits `reset | dispose`; state survival stays behind a future safety gate.
- React host cleanup is summarized separately from runtime-owned resources.
- Host cleanup categories include external-store listener, provider layer overlay, host subscription binding, and HMR boundary adapter.
- RuntimeProvider projects the current runtime atomically and must not use data-glue effect syncing as lifecycle correctness.
- Example-visible lifecycle helpers, including `createExampleRuntimeOwner(...)`, are implementation residue and must not appear in canonical examples, cookbook snippets, or docs as the authoring path.
- Development lifecycle carrier modules must stay behind dev-only entrypoints, conditional package exports, or equivalent static module boundaries so production imports do not pull HMR lifecycle code.

### Program

- `Program` 是 blueprint
- 它表达这次实例化的 `initial / capabilities / logics`
- 同一个 `Module` 可以生成多个不同 `Program`
- 同一个 `Program` 也可以在不同 key、不同 scope 下生成多个实例

### ModuleRuntime

- `ModuleRuntime` 是真实实例
- 它携带 `moduleId / instanceId / state / dispatch / imports scope`
- diagnostics、缓存键、错误上下文和 parent-child resolution 最终都要落到 `ModuleRuntime`

### ModuleTag

- `ModuleTag` 只表示当前 scope 下某个模块的唯一绑定符号
- `ModuleTag` 的 authority 固定在 React host lookup law
- `ModuleTag` 已退出 core canonical spine mainline
- 它不负责在多个不同 `Program` 之间做选择
- 它不表达 blueprint identity

## Hook 规则

### 1. 共享实例查找

```tsx
const counter = useModule(Counter.tag)
```

- 这表示读取当前 runtime scope 中已绑定的共享实例
- 这条路径默认服务全局共享实例或当前 scope 中已存在的实例

### 2. 局部实例创建

```tsx
const editor = useModule(EditorProgram, { key: 'editor:42' })
```

- 这表示按某个 `Program` 蓝图创建或复用局部实例
- `key / gcTime / suspend / initTimeoutMs` 都属于局部实例协议变体
- 同一个 `Module` 的不同 `Program` 必须拥有不同 blueprint identity，不能只靠 `moduleId` 区分
- 未传 `key` 时，实例身份固定为当前 React 组件私有；`RuntimeProvider` 默认的 suspend policy 不能把同一 `Program` 的多个组件调用合并成共享实例
- 传入相同 `key` 时，只在同一个 provider runtime scope 与同一个 `Program` blueprint 下复用同一个 `ModuleRuntime`
- 不同 provider runtime scope、不同 subtree layer scope 或不同 `Program` blueprint 即使使用相同 `key`，也必须生成不同 `ModuleRuntime`
- `gcTime` 只定义最后一个 holder 卸载后的保活窗口；窗口内重新挂载复用原实例，窗口后重新创建实例

### 3. Parent-scope child resolution

```tsx
const host = useModule(PageProgram, { key: 'page:42' })
const detail = host.imports.get(Detail.tag)
```

或：

```tsx
const detail = useImportedModule(host, Detail.tag)
```

- 这两条写法表达同一件事
- `useImportedModule(parent, tag)` 只是 `parent.imports.get(tag)` 的 hook 形态
- 它不引入 root 查找、Program 选择、跨 scope 搜索、隐式 fallback 或独立生命周期语义
- Logic 侧 imported-child read 的 canonical pairing 继续固定在 `$.imports.get(ModuleTag) -> child.read(selector)`；这页只承接 React host law

### 4. 稳定派发

```tsx
const dispatch = useDispatch(handle)
```

或：

```tsx
const dispatch = useDispatch(runtime)
```

- 这条路径只负责生成稳定 dispatch callback
- 它不引入新的实例获取规则
- 它不改变 canonical host law 的 lookup / instantiate / parent-scope child resolution

## Future Additions

- 若未来真有新的局部 recipe 候选，统一先进入 `runtime/12` intake
- 若未来的新增对象会触碰 core host truth，统一先走 core reopen
- 当前 contract 不为任何额外构造族、兼容聚合器、expert host residue 或 transport family 预留停靠位

## Instance Scope Contract Matrix

| 入口 | 身份来源 | 共享规则 | 合同测试 |
| --- | --- | --- | --- |
| `useModule(ModuleTag)` | 当前 provider runtime scope 中的 tag binding | 同一 scope 内共享同一个已绑定实例 | `packages/logix-react/test/Hooks/instance-scope.contract.test.tsx` |
| `useModule(Program)` | `Program blueprint + component id` | 每个组件私有；默认 suspend policy 也必须保持私有 | `packages/logix-react/test/Hooks/instance-scope.contract.test.tsx` |
| `useModule(Program, { key })` | `Program blueprint + key + provider runtime scope` | 同一 scope 内显式复用；跨 runtime scope、subtree layer scope 或 blueprint 不复用 | `packages/logix-react/test/Hooks/instance-scope.contract.test.tsx` |
| `useModule(Program, { key, gcTime })` | 同上，再加 holder lifecycle | 最后一个 holder 卸载后按 `gcTime` 保活；过期后重建 | `packages/logix-react/test/Hooks/instance-scope.contract.test.tsx` |
| `parent.imports.get(ModuleTag)` / `useImportedModule(parent, ModuleTag)` | parent `ModuleRuntime` 的 imports scope | 只解析 parent instance scope 下的 child；不走 root fallback | `packages/logix-react/test/Hooks/useImportedModule.test.tsx` |

## Selector Helper Contract

Form 相关的公开 selector helper contract 当前已经闭合为两块。

- core-owned selector helpers：
  - `fieldValue(valuePath)`
  - `fieldValues(valuePaths)`
  - `rawFormMeta()`
- form-owned selector primitive：
  - `Form.Error.field(path)`
  - `Form.Companion.field(path)`
  - `Form.Companion.byRowId(listPath, rowId, fieldPath)`

这些 selector helper / primitive 都只能通过同一个 canonical host gate 被消费：

- `useSelector(handle, selector)`

它们不是平权 canonical read route，也不构成第二 read family。

当前 exact import 形状固定为：

- `import { fieldValue, fieldValues, rawFormMeta } from "@logixjs/react"`
- `import * as Form from "@logixjs/form"`，再使用 `Form.Error.field(path)`、`Form.Companion.field(path)` 或 `Form.Companion.byRowId(listPath, rowId, fieldPath)`

当前 selector primitive 的消费方式固定为：

- `useSelector(handle, Form.Error.field(path))`
- `useSelector(handle, Form.Companion.field(path))`
- `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`

For row-owner companion reads, the host gate must consume the Form-owned descriptor through the same selector law. If the descriptor resolves to multiple current nested owners for the same `listPath + rowId`, the host projection returns no value rather than choosing an arbitrary owner. This remains an internal owner-resolution law and does not create a public parent-row selector token.

## Selector Type-Safety Ceiling

当前这条 host selector law，不只看“能不能用”，还要看“理论上能不能把静态类型安全做满”。

固定裁决：

- `useSelector(handle, selector, equalityFn?)` 这条 single selector gate 必须允许后续继续提高静态安全上限
- 若某个第二参数形态在理论上无法做到目标级输入约束、输出类型推导或单一解释链，它就不能因为当前写起来方便而被冻成 canonical shape
- 这类情况必须显式 reopen API，而不能靠文档接受永久 `unknown`

对当前已冻结的几类第二参数，按理论上限区分：

- 裸 selector function
  - 理论上可直接依赖 TypeScript 函数签名获得结果类型推导
  - 运行期必须通过 core precision admission；L0/L1 生成与 canonical examples 不把函数 selector 当默认配方
- core-owned selector helpers，例如 `fieldValue(valuePath)`、`fieldValues(valuePaths)`、`rawFormMeta()`
  - 理论上允许继续提高到 path-aware / helper-specific 的更强静态推导
  - `fieldValues(valuePaths)` 只表达 tuple selector carrier，不表达 public object/struct projection descriptor
- form-owned selector primitive，例如 `Form.Error.field(path)`、`Form.Companion.field(path)`、`Form.Companion.byRowId(...)`
  - 当前最小 freeze 只保证 opaque descriptor 与 single host gate consumption
  - 若未来要把结果类型推进到 declaration-driven inference，必须保持单一解释链，不能长第二 host truth、第二 descriptor interpreter 或第二 authority page

当前明确不接受：

- 把“当前实现只返回 `unknown`”写成“当前形态的理论上限”
- 用宽 `string` path、裸 `Record<PropertyKey, unknown>` 或运行时偷看 descriptor 负载，去伪装编译期已经闭合
- 为补类型而再长第二套 host helper family

当前已落地的直接实施项：

- `useSelector` 第二参数在类型层已收紧到函数 selector、core-owned selector helpers、`Form.Error` descriptor、`Form.Companion` descriptor 这几个 sealed family
- 旧 ReadQuery 对象只允许作为 internal/expert residue，不进入 public authoring 主叙事
- public no-arg `useSelector(handle)` 已退出终局 public contract，public overload 已删除并由 type-surface witness 守住
- 任意裸对象不再作为 canonical selector 输入通过类型检查
- `Form.Error.field(path)` 当前已拥有稳定 explain union 返回，不再只是在类型层回落到 `unknown`

当前最小消费语义固定为：

- field path 上有 canonical error leaf 时，继续按既有 precedence 返回最小 `error` explain，并保留 `reasonSlotId + sourceRef`
- source-backed field path 上无 canonical error leaf 时，可继续返回 `pending / stale / error` 的最小 explain 结果；其中 settled source failure 仍是 source lifecycle/read fact，不写入 canonical error truth
- source receipt identity 的 artifact/feed/report join 不新增 React receipt helper；host read 仍只走 `useSelector(handle, Form.Error.field(path))` 与既有 Form selector primitive
- list root path 上存在 structural cleanup receipt 时，可继续返回最小 `cleanup` explain 结果
- list row field path 上存在 canonical row error 时，可继续返回带 `subjectRef.kind="row"` 的最小 `error` explain
- companion field path 上存在 canonical companion bundle 时，可继续返回 sanctioned `availability / candidates` bundle，而不暴露 raw internal landing path
- row-owner projection 当前可继续通过 `byRowId` selector primitive 读取当前 row companion bundle，而不暴露 raw internal landing path

当前实现已经落在这些 exact noun。
在 core runtime authority 内，不再预留任何 `factory`、`builder family` 或官方 wrapper family 叙事。
若官方 wrapper family 存在，它只能停在 [./11-toolkit-layer.md](./11-toolkit-layer.md) 定义的 toolkit layer，并且必须机械回解到当前 host law。

围绕 `rawFormMeta()` 的轻量严格派生若后续需要重开，owner 也固定在这条 core-owned helper read route。
但在 exact noun 与 import shape 真正冻结前，当前公开面继续只承认 `fieldValue`、`fieldValues` 与 `rawFormMeta` 这些 read helper。

`fieldValue(valuePath)` 当前继续可用，并已在类型层收紧为 typed selector carrier：

- 教学优先级低于 canonical selector law
- 不得扩写成 companion / local-soft-fact read route
- literal value path 可通过 typed handle 推导 exact result
- invalid literal value path 在 typed handle 进入 single selector gate 时被类型层拒绝
- widened `string` path 在 typed handle 下被类型层拒绝，因为它不能 against state 校验；若 handle 已经退成 `any`，结果同步退成 `any`
- 当前 typed path helper 使用有限递归深度，超过当前类型预算的深层合法路径需通过后续实现扩展预算，不能被写成 public path noun 需求
- 未来若要重开 fate，继续按 reopen target 处理

companion 当前的 sanctioned read route 继续只认 canonical host gate：

- `useModule(formProgram, options?)`
- `useSelector(handle, selectorFn, equalityFn?)`
- `useSelector(handle, Form.Companion.field(path))`
- `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))`

当前明确不新增：

- companion public selector helper
- companion host hook family

companion exact result typing 当前补入 authority writeback：

- React host 只消费 Form-owned typed descriptor 上的 type-only metadata
- React host 不读取、不解释、不重建 `field(path).companion({ deps, lower })` declaration semantics
- `Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)` 的 runtime descriptor payload 可以保持当前形状
- exact lower-result inference 必须沿 `Form.make -> FormProgram -> handle -> Form.Companion.* -> useSelector` 单链传递
- 若实现需要 public metadata object、typed descriptor namespace、second hook family、manual generic truth 或 public row owner token，则必须先重开 concept admission

若 recipe-only route 无法在不暴露 raw path 的前提下闭合，必须先走 reopen，再决定 helper noun 或 primitive owner。

当前明确拒绝：

- core runtime route 下的 public factory noun
- core runtime route 下的 `useField / useMeta / useList`
- `useModuleList`
- helper-side error precedence
- field-ui helper
- write-side helper
- derived meta helper
- list sugar
- namespace import
- 独立 public subpath freeze

这些拒绝项只约束 core runtime host route，不预判 toolkit layer 自己的 noun 设计。

仓内任何 repo-local `useForm*`、list helper 或薄封装，即使存在于 demos / cookbook，也只算 residue，不构成 exact host contract。

当前对 `$form` 读侧的具体判定门禁统一看 [./12-toolkit-candidate-intake.md](./12-toolkit-candidate-intake.md)。
这页只固定一点：

- 围绕 `rawFormMeta()` 的轻量严格派生，若后续重开，owner 继续停在 core runtime adjunct route

## 单值约束

同一个可见 scope 内必须保持：

- 一个 `ModuleTag` 只绑定一个实例

这意味着：

- 同一 parent scope 内，不允许导入两个来自同一 `Module` 的 child `Program`
- 任何会让 `ModuleTag` 在同一 scope 下失去单值语义的装配都必须 fail-fast

## Domain Corollary

- 领域包不得拥有 canonical React hook family
- 领域包不得拥有 pure projection family
- 领域包不得拥有官方 React wrapper family
- 官方 toolkit 若提供 wrapper family，也不能改写这条 host law 的 owner 与 truth
- Form corollary：
  - canonical acquisition 继续是 `useModule(formProgram, options?)`
  - canonical pure projection 继续是 `useSelector(handle, selector, equalityFn?)`
  - `fieldValue(valuePath)`、`fieldValues(valuePaths)` 与 `rawFormMeta()` 的 owner 固定在 core runtime
  - 建立在 `rawFormMeta()` 之上的轻量 strict derivation，若后续标准化，owner 继续固定在 core runtime adjunct route
  - `Form.Error.field(path)` 已冻结为 form-owned selector primitive / explain-support primitive，owner 固定在 `Form.Error`，不回到 host helper
  - `Form.Companion.field(path)` 与 `Form.Companion.byRowId(listPath, rowId, fieldPath)` 已冻结为 form-owned selector primitive / sanctioned companion read primitive，owner 固定在 `Form.Companion`，不回到 host helper
  - `@logixjs/form/react` 与仓内任何 repo-local `useForm*` / list wrapper 都只算 residue，不构成 exact host contract

## 禁止项

- 把 `RuntimeProvider` 写成业务装配层
- 把 `ModuleTag` 当成同模块多 `Program` 的选择器
- 把 `useImportedModule` 当成独立 hook family 或 root 查找器
- 继续在 canonical 文档中推荐 `useModule(Module)`
- 继续把公开 `.impl` 当成 React canonical 写法
- 把 demos / cookbook residue 当成 sanctioned helper
- 允许任何领域包拥有第二套 canonical host truth

## 当前推荐写法

```tsx
const appRuntime = Logix.Runtime.make(AppProgram)

export function App() {
  return <RuntimeProvider runtime={appRuntime}>{/* ... */}</RuntimeProvider>
}

function GlobalCounter() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, fieldValue("count"))
  return <button>{count}</button>
}

function LocalEditor() {
  const editor = useModule(EditorProgram, { key: 'editor:42' })
  const draft = useSelector(editor, fieldValue("draft"))
  return <form>{draft}</form>
}

function DetailPanel() {
  const host = useModule(PageProgram, { key: 'page:42' })
  const detail = useImportedModule(host, Detail.tag)
  const [id, title] = useSelector(detail, fieldValues(["id", "title"]))
  return <div>{id}: {title}</div>
}
```

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../../specs/134-react-runtime-scope-unification/spec.md](../../../specs/134-react-runtime-scope-unification/spec.md)

## 相关规范

- [./01-public-api-spine.md](./01-public-api-spine.md)
- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./13-selector-type-safety-ceiling-matrix.md](./13-selector-type-safety-ceiling-matrix.md)
- [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

React exact host contract 只保留三条规律：`ModuleTag` lookup、`Program` instantiate、parent-scope child resolution，再加一条统一 selector law；任何领域包都只能依附这条 contract，不能再长第二套 canonical host truth。companion exact result typing 只能通过 Form-owned type-only metadata 与 typed descriptor 进入这条 selector law，React host 不承担 Form declaration interpreter。
