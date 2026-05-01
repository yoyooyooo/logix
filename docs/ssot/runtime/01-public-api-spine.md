---
title: Public API Spine
status: living
version: 18
---

# Public API Spine

## 目标

冻结新体系下的公开 API 主链。

## 当前主链

- `Module.logic(...)`
- `Program.make(Module, config)`
- `Runtime.make(Program)`
- `Runtime.run(Program, main, options)`
- `React host law`

## 当前规则

- `Module` 承接定义期角色
- `Module.logic(...)` 是唯一 canonical logic authoring 入口
- `Program.make(Module, config)` 是唯一公开装配入口
- `Program.make(Module, config)` 已是实际装配实现入口
- `Program.make(Module, config)` 统一承接 declaration asset 编译
- `Runtime.make(Program)` 是公开运行容器入口
- `Runtime.run(Program, main, options)` 是公开一次性结果运行入口
- `Runtime.check(Program, options?)` 与 `Runtime.trial(Program, options)` 是已落地 public facade，但只属于 runtime control plane
- `runtime.compare` 当前只冻结为 control-plane stage，不新增 root `Runtime.compare` facade
- `Program.capabilities.imports` 的公开面只接受 `Program`
- `Module` 只承接定义期角色，不再承接装配与运行语义
- `Logic` 只通过 `Module.logic(...)` 进入 canonical authoring 主链
- `Logix.Logic` 与 `@logixjs/core/Logic` 不再作为 root canonical noun 理解
- `Program` 是默认的复用与组合单元
- `Logic` 的公开作者面按“同步声明区 + 返回的 run effect”理解，不新增第二个公开 phase object
- public Logic authoring 不再暴露 `lifecycle` noun
- Logic 对 runtime instance readiness 的唯一 public contribution 是 `$.readyAfter(effect, { id?: string })`
- `$.readyAfter` 是 sealed singleton root builder method，不提供 `$.startup.*`、`$.ready.*` 或 sibling family
- `$.readyAfter` 表示 instance 在该 effect 成功后才 ready；effect 失败时 instance acquisition 失败
- returned run effect 承接启动后长任务，只在 readiness requirements 成功后进入 run path，并且不阻塞 readiness
- dynamic resource cleanup 走 Effect Scope / finalizer，不走 public destroy hook
- unhandled failure observation 走 Runtime / React Provider / diagnostics，不走 per-logic lifecycle hook
- suspend / resume / reset / hot lifecycle 归 Platform / host carrier / dev lifecycle internals，不进入 ordinary Logic authoring
- field-kernel declaration asset 经 `Logic` 声明，并在 `Program.make(...)` 统一 merge / compile
- `Runtime` 不再承担 field-kernel declaration merge / build
- 公开 `Module` 定义对象不再反射旧装配入口
- `Runtime` 继续承接运行与 control plane 能力
- `Runtime.run` 是 result face；`Runtime.trial` 是 diagnostic run face；`Runtime.check` 是 static diagnostic face
- `@logixjs/core` root export 不再保留旧 field runtime 独立导出
- 不再保留任何独立公开的 field family 或 expert 子路径
- field-level grammar 只作为 `Logic` builder 的局部语法存在
- React exact host law 进入公开主链，由 core 持有
- `@logixjs/toolkit` 作为官方二层可以存在，但它不进入公开主链，也不新增公开相位对象
- verification / evidence / kernel shell 已退出 public core；共享公开 protocol 只保留 `@logixjs/core/ControlPlane`
- React day-one 公式固定为“两构造 + 一解析 + 一选择”
- `ModuleTag` 的 authority 固定挂在 React host law，不进入 core canonical spine root noun
- React 全局共享实例默认通过 `useModule(ModuleTag)` lookup
- React 局部实例默认通过 `useModule(Program, options?)` instantiate
- `useImportedModule(parent, tag)` 继续作为 `parent.imports.get(tag)` 的薄糖，并构成 canonical child resolution
- React 状态读取默认通过 `useSelector(handle, selector, equalityFn?)`
- 默认 selector input 包含 `fieldValue(path)`；少量同 UI 原子字段可用 `fieldValues(paths)` 返回 tuple；领域包可提供自己的 selector primitive
- public no-arg `useSelector(handle)` 不属于终局 React host contract；整 state snapshot 读取只允许停在 repo-internal Devtools、debug 或 test harness 路线
- React host selector input 必须由 core selector law 产出 precision quality 与 route decision，React host 不保留第二套 selector topic eligibility 判断
- React host public contract 不再保留任何额外构造族或 scope helper family
- 若未来真有新的局部 recipe 候选，统一先进入 `runtime/12` intake；若涉及 core host truth，统一先走 core reopen
- 不新增第二组公开相位对象
- 不新增 public lifecycle authoring noun
- 旧名字、旧 facade、旧壳层不自动继承
- 领域包默认降到同一条公开主链，不得自带第二套 runtime 心智、第二套 host truth 或第二套 pure projection family
- 领域包若保留 convenience sugar，只能是 identity-preserving 的薄别名，且必须机械回到同一条 React host law
- `runtime.check / runtime.trial / runtime.compare` 属于 control plane，不进入公开 authoring surface

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./02-hot-path-direction.md](./02-hot-path-direction.md)
- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./04-capabilities-and-runtime-control-plane.md](./04-capabilities-and-runtime-control-plane.md)
- [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [./11-toolkit-layer.md](./11-toolkit-layer.md)
- [./08-domain-packages.md](./08-domain-packages.md)
- [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../../specs/170-runtime-lifecycle-authoring-surface/spec.md](../../../specs/170-runtime-lifecycle-authoring-surface/spec.md)

## 说明

这份文档是新 runtime SSoT 的第一批事实源。

历史公开 API 与旧实现壳层仍可在 `docs/archive/` 查阅，但不再占据默认主叙事。

当前主脊柱默认按这条公式理解：

- `Module.logic(...)` 提供 definition-time behavior entry
- `Program` 把 definition-time assets 收敛成 assembly-time business unit
- `Runtime` 承接 execution-time container
- `Runtime.run` 承接一次性 Program 运行并返回 `main(ctx,args)` 的业务结果
- React host law 把 `Program` 投影到宿主实例与选择器
- toolkit 只作为 secondary DX layer 组合这条主链，不持有第二 truth
- field-kernel 只作为内部 declaration compiler 层存在，不额外抬升成公开家族

当前 `apps/docs/**` 的对外用户文档不构成这一轮阻塞面；`122` 先收口内核、canonical examples、公开导出与 SSoT。
