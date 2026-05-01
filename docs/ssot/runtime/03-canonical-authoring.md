---
title: Canonical Authoring
status: living
version: 14
---

# Canonical Authoring

## 目标

冻结新的 canonical authoring 主骨架。

## 主骨架

新的公开 authoring 主公式收敛为：

- `Module`
- `Module.logic(...)`
- `Program.make(Module, config)`
- `Runtime.make(Program)`

它们分别承接：

- `Module`：定义期对象
- `Module.logic(...)`：定义期行为入口
- `Program.make(...)`：装配期业务单元
- `Runtime.make(...)`：运行期容器入口

## 为什么这样设计

旧 authoring 心智更接近“定义素材自由组合”。这对熟悉内部实现的人是灵活的，但对公开 API、示例一致性和 Agent 生成都不够稳定。

当前这条主链的目标，是把作者面压成一组更小、更统一的公式：

- `Module.logic(...)` 提供 definition-time behavior entry
- `Program` 把 definition-time assets 收敛成 assembly-time business unit
- `Runtime` 承接 execution-time container

这样做的直接收益：

- 对人：更容易判断一个概念属于定义、装配还是运行
- 对 Agent：更少分叉、更少例外、更稳定的默认写法
- 对 examples / domain kits：更容易保持单一心智，不再为不同复杂度功能长出不同装配姿势

## 装配入口

公开装配入口固定为：

```ts
Program.make(Module, {
  initial: { ... },
  capabilities: {
    services: [ ... ],
    imports: [ChildProgram],
  },
  logics: [ ... ],
})
```

规则：

- `Program.make(Module, config)` 是唯一公开装配入口
- `Program.make(Module, config)` 已承接实际装配实现
- `Program.make(Module, config)` 不再承接 `processes / workflows` 一类 orchestration slot
- 不新增 `Module.program(...)` 一类第二入口
- 公开 `Module` 定义对象不再反射旧装配入口
- `Program` 是默认的复用与组合单元
- `.impl` 只保留内部蓝图身份，不进入 canonical authoring 写法

## Logic 入口

标准拼写固定为：

```ts
const SearchLogic = Search.logic('search-query', ($) => {
  $.fields({
    result: $.computed({
      deps: ['query'],
      get: (query) => query.trim(),
    }),
  })

  return /* run effect */
})
```

规则：

- `Module.logic(id, build)` 是标准 logic 入口
- `Logix.Logic` 与 `@logixjs/core/Logic` 不再作为 canonical root noun 理解
- `build` 的同步阶段只承接 declaration 语义，例如 readiness requirement、fields、effect wiring 的注册
- `build` 返回值是唯一的 run effect；run-only logic 只是 declaration 为空的子集
- public readiness contribution 只写 `$.readyAfter(effect, { id?: string })`
- public authoring 不再出现 `lifecycle` noun
- `$.readyAfter` 只同步登记 readiness effect；effect 在 runtime startup 阶段、instance env 下执行
- `$.readyAfter` 表示 instance 在该 effect 成功后才 ready；effect 失败时 instance acquisition 失败
- `$.readyAfter` 的 option bag 只允许 `{ id?: string }`
- `$.startup.*`、`$.ready.*`、`$.lifecycle.*` 不属于 canonical authoring
- `$.fields(...)` 是 field-kernel declaration 的唯一公开 collector
- `$.computed / $.source / $.external` 只作为 `Logic` builder 的局部语法存在，不单独导出
- `link` 不再作为公开 grammar；联动统一回收到 `computed`
- `check` 不再作为 core field grammar；校验语义由领域 DSL 承接
- `node / list` 不再作为独立公开 primitive；它们只作为 compiler-owned 嵌套作用域语法存在
- `Logic` 的公开作者面不再保留 `{ setup, run }` 一类第二写法
- `logic id` 必须显式、稳定，并在模块内承担可引用的命名语义
- `Logic` 由 `Module` 生成边界与命名空间
- `Logic` 通过 `Program.make(Module, { logics })` 被安装、组合、覆盖和启用
- `Program.make(...)` 在装配期统一 merge / compile 所有 declaration asset
- `Runtime.make(...)` 只安装与执行已编译的 declaration asset
- `Logic` 的定位固定为：`module-scoped`、`program-mounted`、`runtime-executed`
- `Logic` 本身不是独立业务单元；独立、可复用、可装配的业务单元是 `Program`
- `logic(...)` 只作为概念名，不再额外引入第二套顶层构造入口

## 同步与异步

新的 authoring 主链坚持这条约束：

- 同步写入与异步任务强分离

对应到作者面：

- 同步写入必须保持显式
- declaration 必须保持同步、可推导、无 Env 读取语义
- declaration 不得依赖 runtime instance、运行期 effect 或启动后补注册
- 长链路任务必须保持显式
- returned run effect 在 readiness requirements 成功后进入 run path，并且不阻塞 readiness
- 没有明确触发源、但因 program 生命周期存在的后台职责，也必须作为已装配的 `Logic` 一部分进入 `Program`
- 无论最终 helper 形态如何演化，都不得再长出并列的第二套行为相位对象
- 任何 field-level 能力若还想暴露给用户，默认优先作为 `Logic` builder 的局部语法收口，不再新开 namespace

## Module 与 Program 的边界

- `Module` 可以做定义期复用与组合
- `Module` 不承接 imports、runtime tree、service wiring 或实例装配
- `Program` 负责决定：
  - 哪些 `Logic` 被安装
  - 哪些 child `Program` 被组合
  - 哪些 services 被注入
  - 哪组 `initial` 构成这次实例
- 这条边界固定服务两个目标：
  - 不让 `Module` 再次变成半可运行对象
  - 不让 `Program` 再次退化成需要读内部蓝图才能理解的不完整中间物

## 后台职责的位置

- canonical authoring 不再保留独立公开的后台行为相位对象
- 若 internal runtime 仍保留 process / workflow 类能力，它们也只允许停在 internal assembly path，不得从 `Program.make(...)` 重新长回公开装配面
- 若仍存在长期职责，它们只能下沉到内部 runtime primitive 或未来经单独证明后重开的更小 contract
- `Program` 的公开装配面不再以独立后台行为家族作为升级槽位

## capabilities 的位置

`Program` 的标准装配面默认承接：

- `initial`
- `capabilities`
- `logics`

其中：

- 当前在 core 已落地的 canonical capability 只有 `services / imports`
- 默认注入面是 `capabilities.services`
- `capabilities.imports` 的公开面只接受 `Program`
- Logic 侧 imported-child read 固定写法是 `const child = yield* $.imports.get(Child.tag)`，随后使用 `yield* child.read(selector)` 或 `yield* $.on(child.changes(selector))`
- `$.use(ModuleTag)` 不再承担当 imported-child canonical read route
- `Module` 不进入 `imports`
- `.impl` 只允许停在内部归一化层
- `stateTransaction` 属于显式升级能力
- 顶层 `imports` 不再属于 canonical authoring 写法
- `roots` 已退出 canonical capability surface；若未来需要相关宿主语义，必须作为新 owner 议题重开

## React host projection 的位置

- React host projection 不属于 canonical authoring 主骨架
- `RuntimeProvider` 只负责把 runtime 投影到 React 子树
- React 侧的 day-one 公式固定为：
  - `useModule(ModuleTag)`
  - `useModule(Program, options?)`
  - `useImportedModule(parent, ModuleTag)` / `parent.imports.get(ModuleTag)`
- `ModuleTag` 的 authority 固定在 React host law，不再贴近 core canonical mainline
- React 侧的状态读取统一固定为：
  - `useSelector(handle, selector, equalityFn?)`
- public no-arg `useSelector(handle)` 不属于终局 React host contract；整 state snapshot 读取只允许停在 repo-internal Devtools、debug 或 test harness 路线
- 生成代码默认使用 sealed selector input，例如 `fieldValue(path)`、少量同 UI 原子字段的 `fieldValues(paths)`，或领域包 selector primitive；函数 selector 只作为 core precision admission 后的 expert 形态
- React host public contract 不再保留任何额外构造族或 scope helper family
- 若未来真有新的局部 recipe 候选，统一先进入 `runtime/12` intake；若涉及 core host truth，统一先走 core reopen
- React 侧的 canonical lookup / instantiate / parent-scope child resolution 规则，统一看 [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./01-public-api-spine.md](./01-public-api-spine.md)
- [./04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [./05-logic-composition-and-override.md](./05-logic-composition-and-override.md)
- [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../../specs/170-runtime-lifecycle-authoring-surface/spec.md](../../../specs/170-runtime-lifecycle-authoring-surface/spec.md)

## 当前一句话结论

新的 canonical authoring 已经收敛为 `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`；公开作者面不再把 `Logix.Logic` 当 root canonical noun，也不再保留独立后台行为相位对象或对应装配槽位。
