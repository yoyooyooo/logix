---
title: 平台内核实现方案：以 Effect/DI 承载能力与生成管线
status: draft
version: v1
---

> 本文讨论一种面向未来的平台内核实现思路：  
> 在出码前平台中使用函数式 Effect + 依赖注入（例如 effect-ts 一类的库）作为“能力抽象与生成工作流”的内核。  
> 这些内容主要面向平台 / 架构开发者，对理解 Intent / Pattern / Template / Plan 概念本身并非必需。

## 1. 适用前提

本文讨论的前提是：

- 场景聚焦于 Web 端 toB 管理系统前端团队；
- 不追求多端（浏览器 / Node / 云函数）极致抽象，只需覆盖本地工具链与前端工程；
- 希望在“出码前管线”中，把各种生成/修改行为建模得更可组合、更可测试。

## 2. 三层映射：意图 / 模式 / 模板 → Effect 世界

### 2.1 意图层：纯数据 + Schema

- 意图资产（Intent）保持为**纯数据结构**：
  - TypeScript 类型；
  - Schema（用于解析/校验 YAML/JSON）；
  - 文本说明。
- 这里不引入 Effect，仅使用 Schema 做：
  - 从文件解析为内存对象；
  - 运行时校验和默认值填充。

这样，意图可以脱离任何运行时框架，由人和 AI 直接阅读与修改。

### 2.2 模式层：Intent → Plan 的纯逻辑

- 模式的核心是把某一类意图映射为“生成/修改的抽象计划（Plan）”：
  - 最理想是**纯函数**：`Intent -> Plan`；
  - 如需复杂校验或错误处理，可以使用只依赖工具函数的 Effect：
    ```ts
    type Plan = GenerationPlan

    const planWorkbench: (intent: WorkbenchIntent) =>
      Effect.Effect<never, ValidationError, Plan>
    ```
- 这一层尽量不做 IO，不依赖文件系统或进程，只关心：
  - 模式是否适配当前意图；
  - 需要生成/修改哪些逻辑单元（“页面骨架”“列表容器”“详情视图”等抽象对象）。

### 2.3 模板执行层：Plan → 实际代码操作

- 将 Plan 落实到真实代码，需要一组“能力服务”：
  - 文件系统访问；
  - 模板仓库访问；
  - 代码生成/文本 patch；
  - 日志与进度反馈。
- 可以用 “服务接口 + DI” 的形式建模：
  ```ts
  interface FileSystem {
    read(path: string): Effect.Effect<never, FsError, string>
    write(path: string, content: string): Effect.Effect<never, FsError, void>
  }

  interface CodeGen {
    applyTemplate(
      templateId: string,
      params: Record<string, unknown>
    ): Effect.Effect<never, CodegenError, GeneratedFile[]>
  }
  ```
- 执行 Plan 的主流程可以是：
  ```ts
  const applyPlan = (plan: GenerationPlan) =>
    Effect.gen(function* (_) {
      const fs = yield* _(FileSystem)
      const codegen = yield* _(CodeGen)
      // 根据 plan 逐步读写文件、应用模板
    })
  ```

这里的 `Env`（环境）由若干服务接口组成，运行时通过 Layer 或工厂函数注入不同实现。

## 3. 出码前 / 出码后分别如何使用

### 3.1 出码前：生成管线内核

在出码前的平台/工具层，可以全面使用 Effect/DI 来：

- 表达“从 Intent + Pattern 到 Plan 再到 Code Diff”的整个工作流；
- 组合多个模式/模板的执行步骤，显式建模依赖关系；
- 把错误（例如意图缺字段、模板参数不完整、IO 失败）用结构化方式传出，而不是散落在日志字符串中。

业务开发者不需要看到 Effect 的细节，只需要调用简单 API：

```ts
await generateFeature(intent) // 内部调用 Effect 程序
```

### 3.2 出码后：谨慎、少量地使用

在运行时（浏览器中的业务代码）：

- 多数业务组件/页面无需引入 Effect/DI，保持常规 async/await + Hook 结构即可；
- 如有复杂跨页面流程（导入/导出、批量任务执行等），可以在“基础设施层”使用 Effect：
  - 定义少量流程服务；
  - 用 Hook 提供简单调用接口给业务代码；
  - 隔离复杂度，不要求业务开发者理解 Effect 类型系统。

原则：Effect/DI 是“内核工具”，而不是所有业务代码的强制标准。

## 4. 对“前置化定义意图/模式”的帮助

利用 Effect/DI，有两点特别契合意图驱动体系：

1. **模式只依赖抽象能力，和具体实现解耦**
   - 模式的规划逻辑只依赖抽象服务（例如 TemplateRepo、CodeGen），可以在没有具体模板实现的情况下先定义好；
   - 这使得“意图和模式的定义”可以极早落地，模板和工具实现可以晚一些演进。
2. **意图与配置只依赖 Schema，不依赖运行时**
   - 意图资产的 Schema 与解析逻辑不依托任何 Effect/DI；
   - 对于工具/AI 来说，只需理解 Schema，不必了解内核实现。

这正好符合“意图和模式前置，具体实现后置”的设计目标。

## 5. 使用建议（toB 管理系统团队视角）

- **推荐使用场景**
  - 出码前平台的生成管线；
  - 少数需要强一致错误处理与组合能力的运行时流程；
  - 平台/架构团队内部的工具脚本和服务。
- **不推荐的场景**
  - 业务页面内部的日常交互和布局；
  - 复杂类型暴露给所有业务开发者使用；
  - 用 Effect/DI 把本就简单的逻辑搞得晦涩难懂。

简而言之：

- 在“平台内部”，Effect/DI 可以成为能力抽象与流水线的坚实内核；
- 在“业务层”，应以简单 API/Hook 暴露这些能力，避免把实现细节变成团队的额外心智负担。

## 6. 行为层文件形态（.flow.ts）与运行时集成建议

为了承载 Intent.runtimeFlows 中上升为“意图化行为”的流程，本规划推荐在运行时引入一层专门的“行为文件”：

- 文件后缀建议：`*.flow.ts`
  - 用于存放 Effect 形式的行为程序（例如导出流程、审批流程等）；
  - 不直接依赖 React，仅依赖 Service 接口与 Effect/DI 环境。
- 典型结构：
  - 每个 Flow（Intent.runtimeFlows 中的一个 `id`）在对应的 `.flow.ts` 中有一个导出的 Effect 程序；
  - Service 接口（如 `FilterService`、`ExportService` 等）通过 Env 注入；
  - UI 层通过 Hook 封装调用，例如：
    - `useExportOrders` 内部调用 `runEffect(exportOrdersFlow, env)`；
    - 组件只关心 `handleExport`，不关心 Effect 的细节。

推荐实践：

- 对未进入 Intent.runtimeFlows 的轻量逻辑，继续使用 async/await + Hook 组合，不强制 `.flow.ts`；
- 一旦某个行为被提升到 Intent.runtimeFlows（需要平台/LLM 长期维护与重构），
  优先为其创建 `.flow.ts` 行为文件，并将 Flow DSL 编译/映射为 Effect 程序：
  - Flow DSL / AST：声明层；
  - `.flow.ts` 中的 Effect：行为层 SSoT；
  - Hook / 组件事件处理器：调用层（桥接到 UI）。

这样，Zustand + TanStack Query 继续承担状态/缓存职责，  
Flow + Effect + `.flow.ts` 则自然成为“行为层”的承载方式。

## 7. PoC 级别代码结构示意

> 本节不绑定具体库，仅用“Effect/DI”一类抽象代称。若使用某个具体实现（如某款 Effect 库），可直接按其 Tag/Layer 机制落地。

### 6.1 核心模块划分

在出码前平台内部，可以按以下模块拆分：

- `intent` 模块：
  - 定义 Intent 的类型与 Schema；
  - 负责从文件加载/保存 Intent。
- `pattern` 模块：
  - 定义 Pattern 的类型与 Schema；
  - 提供“模式匹配”与“适配性检查”逻辑。
- `template` 模块：
  - 定义 Template Meta；
  - 提供对模板仓库的访问与查询能力。
- `planning` 模块：
  - 提供 `buildPlan(intentId)` 等函数，将 Intent+Pattern+Template Meta 转成 Plan。
- `execution` 模块：
  - 提供 `executePlan(plan)`，执行真正的文件改动和模板应用。
- `services` 模块：
  - 抽象底层能力：文件系统、代码生成、日志、AI 调用等。

### 6.2 能力服务与环境类型

伪代码示意：

```ts
// 能力服务定义
interface FileSystem {
  read(path: string): Effect<never, FsError, string>
  write(path: string, content: string): Effect<never, FsError, void>
  exists(path: string): Effect<never, never, boolean>
}

interface TemplateRepo {
  getMeta(id: string): Effect<never, TemplateError, TemplateMeta>
}

interface CodeGen {
  applyTemplate(
    meta: TemplateMeta,
    params: Record<string, unknown>
  ): Effect<never, CodegenError, GeneratedFile[]>
}

interface Logger {
  info(message: string): Effect<never, never, void>
  error(message: string): Effect<never, never, void>
}
```

环境类型可以是这些服务的交叉类型：

```ts
type PlanningEnv = FileSystem & TemplateRepo & Logger
type ExecutionEnv = FileSystem & CodeGen & Logger
```

实际实现时，可以通过某种 `Layer`/工厂模式，在 Node 环境中用真实 FS/日志实现这些接口，在测试中用内存实现替代。

### 6.3 规划与执行函数签名

在这种拆分下，核心管线可以长成：

```ts
// IntentId -> Plan 的规划
const buildPlan = (
  intentId: string
): Effect<PlanningEnv, PlanningError, GenerationPlan> => {
  // 1. 从文件系统加载 Intent
  // 2. 根据 Intent 引用加载 Pattern 和 Template Meta
  // 3. 运行模式逻辑，生成 Plan
}

// Plan -> 实际改动
const executePlan = (
  plan: GenerationPlan
): Effect<ExecutionEnv, ExecutionError, void> => {
  // 1. 遍历 Plan 中的每一步操作
  // 2. 调用 CodeGen 生成内容，或直接写文件/patch
  // 3. 记录日志与执行结果
}
```

从 HTTP API 或 CLI 看，只需要提供薄薄一层封装：

```ts
// CLI 示例
async function generate(intentId: string) {
  const plan = await Effect.runPromise(buildPlan(intentId).provide(PlanningLayer))
  await Effect.runPromise(executePlan(plan).provide(ExecutionLayer))
}
```

业务前端只需要知道：

- 有一个 `generate(intentId)` 命令/按钮；
- 出错时错误信息里会指向 Intent/Pattern/Template 的具体问题；
- 日志和映射会被写到约定目录下。

### 6.4 错误模型与测试策略

为了避免“Effect 只是把错误藏深了一层”，需要刻意设计错误模型与测试策略：

- 错误类型分层：
  - `IntentError`：意图资产不合法或缺字段；
  - `PatternError`：模式不适配或约束被违反；
  - `TemplateError`：模板元数据缺失/冲突；
  - `PlanningError`：无法根据 Intent+Pattern+Template 生成一致的 Plan；
  - `ExecutionError`：IO/Codegen 过程中的具体错误。
- 测试策略：
  - 为模式逻辑编写纯单元测试（不依赖 FS），验证 Intent→Plan 的映射；
  - 为执行层编写集成测试，在临时目录中跑真实写盘流程；
  - 利用 Effect/DI 的特性，在测试环境下注入内存 FS 和 Fake CodeGen，做到快速且可控。

这样，Effect/DI 的引入不是为了炫技，而是为了：

- 让“出码前管线”这一坨复杂逻辑可以拆分、组合和测试；
- 在错误发生时给出结构化、可追踪的反馈，而不是“某个脚本报错了，自己看日志吧”。
