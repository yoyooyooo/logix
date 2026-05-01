---
title: Logix API Next Guardrails
status: living
version: 20
---

# Logix API Next Guardrails

## 核心护栏

- 零存量用户前提下，允许直接重做 surface、协议与默认行为
- 当前阶段默认以面向未来的最优设计为目标，在当下认知范围内追求极致收口
- 既有实现、既有 spec、现有 NS/KF 与治理文档都可被修订、替换或删除
- 若 NS/KF、charter、guardrails 自身阻碍更优设计，先改事实源，再推进实现
- 不写兼容层，不设弃用期，用迁移说明替代
- 新旧 surface 都只能降到同一个 kernel
- runtime core 不感知 surface 来源
- 文档、示例、生成器只认新 canonical API
- 旧名字、旧壳层、旧便利 facade 都不自动继承
- public API noun 必须尽量能被低心智语言稳定解释
- public API 的默认成功标准同时包含 Agent 生成稳定性与人类首读可理解性
- public API 的默认成功标准还必须包含“理论上可达到的静态类型安全上限”
- 若某个 API 形态在理论上无法达到目标级别的类型安全，不得仅因当前实现成本低就保留；默认重开 API 形态
- proposal / SSoT / authority 若接受某个类型缺口，必须先区分“当前未实现”还是“理论上不可达”；后者必须显式记为 blocker 或 reopen trigger
- 一个公开 noun 只允许一个主角色，禁止在别处再讲成 `primitive / boundary / skeleton / helper` 这类近义层
- 内部精确术语可以保留，但不得主导用户文档与 examples 的主叙事
- 命名债按设计债处理；若某个公开词长期只能靠大量 gloss 才能存活，默认继续收口或记为 scar
- 任何能力若会长出第二模型、第二真相源、第二事务面，默认拒绝
- 任何妨碍公开面压缩、相位收口、runtime clarity、performance 或 diagnostics 的残留，默认直接删或重做
- 不设 `advanced`、`internal` 一类黑盒兜底槽位
- `assign / patch` 做 canonical 写入
- `mutate` 留 expert 层
- root canonical mainline 固定为 `Module / Program / Runtime`
- `Logic` 的 canonical 入口固定为 `Module.logic(...)`
- `Program.make(Module, config)` 是唯一公开装配入口
- `Program.make(Module, config)` 继续是实际装配实现入口
- `Program.make(Module, config)` 统一承接 declaration asset 编译
- `Program.make(Module, config)` 不再承接任何 `processes / workflows` 类 orchestration slot
- `Program.capabilities.services / imports` 是当前 canonical capability 面
- `Program.capabilities.imports` 的公开面只接受 `Program`
- `.impl` 只保留内部蓝图身份，不进入 canonical authoring 写法
- 顶层 `imports` 已退出 canonical 示例主写法
- `roots` 已退出 canonical capability surface，不得再在 canonical docs/examples 中写成 capability
- 公开 `Module` 定义对象不再反射旧装配入口
- `Module` 只承接定义期语义
- `Program` 是默认的复用与组合单元
- `RuntimeProvider` 与 host hooks 只属于 package-local host projection，不进入公开主链
- `RuntimeProvider` 在 React 侧只负责 runtime scope provider 与 host projection，不承担业务装配语义
- React 全局共享实例默认通过 `useModule(ModuleTag)` lookup
- React 局部实例默认通过 `useModule(Program, options?)` instantiate
- `useImportedModule(parent, tag)` 只允许作为 `parent.imports.get(tag)` 的薄糖，并构成 canonical child resolution
- Logic 侧 imported-child read 固定为 `$.imports.get(ModuleTag) -> child.read(selector)`，`$.use(ModuleTag)` 不再作为这条规则的 canonical read route
- React 状态读取统一通过 `useSelector(handle, selector, equalityFn?)`
- public no-arg `useSelector(handle)` 不属于终局 React host contract；整 state snapshot 读取只允许停在 repo-internal Devtools、debug 或 test harness 路线
- React host selector route 必须由 core selector law 决定；React host 不得自行维护第二套 broad/dynamic/topic eligibility 判断
- `useModule(Module)` 不再属于 React day-one 公开写法
- React host public contract 不再保留任何额外构造族或 scope helper family
- 若未来真有新的局部 recipe 候选，统一先进入 `runtime/12` intake；若涉及 core host truth，统一先走 core reopen
- `ModuleTag` 在同一可见 scope 下必须保持单值绑定
- `ModuleTag` 的 owner 固定在 React host lookup law，不贴近 core canonical spine
- `logics: []` 是 canonical 主写法
- `Logic` 的公开作者面只保留“同步声明区 + 返回的 run effect”
- public Logic authoring 不再出现 `lifecycle` noun
- Logic 对 runtime instance readiness 的唯一 public contribution 是 `$.readyAfter(effect, { id?: string })`
- `$.readyAfter` 是 sealed singleton root builder method，option bag 只允许 `{ id?: string }`
- `$.readyAfter` 表示 instance 在该 effect 成功后才 ready；effect 失败时 instance acquisition 失败
- 禁止用 `$.lifecycle.*`、`$.startup.*`、`$.ready.*`、`$.resources.*` 或 `$.signals.*` 作为 public replacement family
- returned run effect 在 readiness requirements 成功后进入 run path，并且不阻塞 readiness
- dynamic cleanup 走 Effect Scope / finalizer
- unhandled failure observation 走 Runtime / Provider / diagnostics
- suspend / resume / reset / hot lifecycle 走 Platform / host carrier / dev lifecycle internals
- `Runtime.make(Program)` 不承担 declaration merge / build
- 不再保留独立公开的后台行为相位对象
- 公开装配面不再承接独立后台行为家族的升级槽位
- Form 保领域层表达
- field-kernel 保底层能力
- `@logixjs/core` root export 不再保留旧 field runtime 独立导出
- 不再保留任何独立公开的 field helper / expert route
- `$.fields(...)` 是唯一公开 field declaration collector
- `$.computed / $.source / $.external` 只作为 `Logic` builder 的局部语法存在
- `link` 退出公开 grammar
- `check` 退出 core field grammar，回到领域 DSL
- `node / list` 退出独立公开 primitive
- `Module.make(...)` 不再接受 module-level raw field fragment
- `Query.make(...)` 不再接受 raw field fragment config
- `Form.rules / Form.node / Form.list / Form.Field / Form.derived` 与其他 raw field helper 全部退出 package root
- Form 与 Query 不接受公开 raw field fragment
- domain package 不得在 runtime 启动阶段再做 declaration merge / build
- 领域包只允许 `service-first` 或 `program-first`
- 领域包不得长出第二套 runtime、DI、事务、调试事实源
- `runtime.check / runtime.trial / runtime.compare` 固定属于 `runtime control plane`
- 这些验证能力不进入公开 authoring surface
- 旧 observability 试跑 helper 已退出公开 surface
- `Debug / Observability / Reflection / Kernel` 已退出 public core
- verification / evidence 的公开 shared shell 只允许保留 `@logixjs/core/ControlPlane`
- `repo-internal` 只服务仓内多包引用，不是 public API 候选池
- `repo-internal` 默认命运是继续收窄、继续下沉、继续删除
- `repo-internal` 的 workspace 导出必须走显式 allowlist，不得继续用 wildcard 承接任意内部文件
- `repo-internal` 应优先拆成更窄 owner，如 runtime / read / field / host 合同；避免继续把活跃实现绑在巨型聚合口 `InternalContracts`
- 默认门禁只允许跑到 `runtime.check + runtime.trial(mode="startup")`
- `trial.scenario` 只表达验证意图，不沉淀为正式业务逻辑资产
- `fixtures/env + steps + expect` 是第一版场景验证主入口
- raw evidence / raw trace 不作为第一版默认比较面
- `replay` 与宿主级深验证属于后续升级能力
- `repairHints` 必须是结构化数组，不能只返回自然语言提示
- `nextRecommendedStage` 必须显式返回；当 `verdict = INCONCLUSIVE` 时必须给出唯一推荐的下一层验证入口

## 相关页面

- [../adr/2026-04-04-logix-api-next-charter.md](../adr/2026-04-04-logix-api-next-charter.md)
- [../adr/2026-04-05-ai-native-runtime-first-charter.md](../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../adr/2026-04-12-field-kernel-declaration-cutover.md](../adr/2026-04-12-field-kernel-declaration-cutover.md)
- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../../specs/170-runtime-lifecycle-authoring-surface/spec.md](../../specs/170-runtime-lifecycle-authoring-surface/spec.md)

## 当前一句话结论

新的公开主链必须持续压缩作者决策分叉；在零存量用户前提下，凡是会拖回旧心智、旧壳层、第二行为相位或第二模型的设计，默认直接删或重做。
