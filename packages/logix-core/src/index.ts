// Public barrel for @logix/core
// 推荐使用方式：
//   import * as Logix from "@logix/core"
// 此时 Logix 下会挂载 Module / State / Actions / Logic / Bound / Link / Flow / Runtime / Debug 等命名空间。

// Core module API：Module / ModuleRuntime / ModuleImpl / StateOf / ActionOf / Reducer 等
export * as Module from './Module.js'
export type * from './Module.js'
export * as State from './State.js'
export * as Actions from './Actions.js'

// Logic / Bound / Link：逻辑编排与跨模块访问
export * as Logic from './Logic.js'
export * as Bound from './Bound.js'
export * as Link from './Link.js'

// Flow & DSL：对业务代码暴露的流式编排工具
export * as Flow from './Flow.js'
export * as MatchBuilder from './MatchBuilder.js'

// StateTrait：字段能力与 State 图纸内核（占位导出，详见 specs/001-module-traits-runtime）
export * as StateTrait from './state-trait.js'

// TraitLifecycle：领域包（Form/Query/...）统一下沉接口（见 specs/007-unify-trait-system）
export * as TraitLifecycle from "./trait-lifecycle.js"

// Resource：逻辑资源规格与注册（见 specs/001-module-traits-runtime/references/resource-and-query.md）
export * as Resource from './Resource.js'

// Runtime：应用级 Runtime（Logix.Runtime.make 等）
export * as Runtime from './Runtime.js'

// Root：显式 root provider 解析入口（忽略局部 override）
export * as Root from "./Root.js"

// Env：统一的运行时环境检测（避免 bundler 内联 NODE_ENV）
export * as Env from './env.js'

// Debug & Platform：调试与平台集成能力
export * as Debug from './Debug.js'
export * from './Debug.js'
export * as Platform from './Platform.js'
