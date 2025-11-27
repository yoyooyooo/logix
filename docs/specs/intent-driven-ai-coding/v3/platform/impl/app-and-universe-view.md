# App / Module / Store → Universe View 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: 平台如何从 `Logix.app` / `Logix.module` / `ModuleDef` 构建 Universe View（模块拓扑图）与依赖检查。

本说明文档从平台实现视角，整理 v3 中基于 `ModuleDef` 的 Universe View 与依赖检查方案。  
目标：

- 明确 Parser 在 TS 代码中需要识别的模式（AST Pattern）；
- 描述从 AST → ModuleDef IR → 拓扑图节点/边的构建过程；
- 指出与 Runtime 实现的耦合点与已知取舍。

## 1. 需要识别的代码模式

在 v3 规范中，模块体系通过以下 API 暴露：

```ts
// runtime-logix/core/architecture-app-runtime.ts (概念性)

export interface ModuleDef<R> { /* ... */ }

export const Logix = {
  module: <R>(def: ModuleDef<R>) => def,
  app:   <R>(def: Omit<ModuleDef<R>, "exports">) => AppDefinition<R>,
  provide: <S>(tag: Context.Tag<S, S>, value: S): Provider<S> => ({ tag, value }),
}
```

平台解析器需要识别的主要调用形式：

- `Logix.module({ ... })`：定义普通 Module；  
- `Logix.app({ ... })`：定义根 App；  
- `imports: [OrderModule, UserModule, ...]`：模块间依赖；  
- `providers: [Logix.provide(SomeTag, SomeStore), ...]`：模块提供的 Store / Service；  
- `processes: [SomeCoordinator, ...]`：模块内的长生命周期协程；  
- `exports: [SomeTag, ...]`：对外公开的 Tag 列表。

> 实现建议  
> - 在 TS 层对 `Logix` 使用命名 import（例如 `import { Logix } from "@logix/core"`），以便解析器快速定位；  
> - 平台可以约定：所有 Module / App 定义必须使用 `export const XxxModule = Logix.module(...)` / `export const XxxApp = Logix.app(...)` 形式，避免运行时动态构造。

## 2. AST → ModuleIR 的抽象

为便于平台内部处理，可以先将源代码中的 ModuleDef 映射为一个简化 IR：

```ts
interface ModuleIR {
  id: string

  // 标识该模块定义所在文件 / 导出符号
  filePath: string
  exportedName: string

  imports: string[]           // 引入的子模块 ID（或符号名）
  providers: Array<{
    tagSymbol: string         // Tag 的符号名（用于连线）
    valueSymbol: string       // Store/Service 的符号名
  }>

  processes: string[]         // 进程协程的符号名
  exports: string[]           // 对外公开的 Tag 符号名

  // 附加元数据（如 middlewares、注释等），供后续使用
  middlewares: string[]
  jsDoc: string | null
}
```

解析流程（概念）：

1. 扫描整个项目，定位所有 `Logix.module(...)` / `Logix.app(...)` 调用；  
2. 对每个调用：  
   - 读取 `id` 字段（要求为字符串字面量）；  
   - 从变量声明中获取 `filePath` + `exportedName`；  
   - 遍历 `imports` 属性数组，收集引用的模块符号名；  
   - 遍历 `providers` 属性数组，识别 `Logix.provide(TagSymbol, ValueSymbol)` 模式；  
   - 遍历 `processes` / `exports` / `middlewares` 数组，收集符号名；  
3. 生成整体 ModuleIR 图。

> 解析工具  
> - 实现上可使用 ts-morph 或 TypeScript Compiler API；  
> - 关键是固定模式：只支持对象字面量 + 简单标识符数组，避免在 ModuleDef 中写复杂表达式（如条件运算、spread 等），否则解析成本剧增。

## 3. 从 ModuleIR 构建 Universe View

Universe View 关注的是“模块间拓扑”与“模块内部的 Store/Process 结构”。

### 3.1 节点类型

推荐的节点类型：

- **App Node**：根模块（`Logix.app`）；  
- **Module Node**：通过 `Logix.module` 定义的模块；  
- **Store Node**：`providers` 中 valueSymbol 对应的 Store（通常是 `Store.Runtime` 或 `makeStore()` 结果）；  
- **Process Node**：`processes` 中的协程（Coordinator / Daemon）。

### 3.2 边类型

基础边：

- **Module Import Edge**：  
  - 从 A 模块指向其 `imports` 中的每个模块；  
  - 表示“组合/包含关系”，与 Runtime 中的 Layer.mergeAll 对应。

- **Module → Store Edge**：  
  - 从 Module/App Node 指向其 `providers` 中的 Store Node；  
  - 表示“该 Store 由此模块提供”。*** End Patch``` ***!

扩展边（依赖于进一步解析）：  

- **Process → Store/Service Edge**：  
  - 通过对 `processes` 所指协程代码做二次解析，识别其中 `yield* StoreTag` / `yield* ServiceTag` / `useStore(Tag)` 等模式，连接 Process 与依赖的 Store/Service；  
  - 这些边在 Universe View 中帮助展示跨 Store / Service 的协作路径。

### 3.3 Drill‑down 规则

- 第一层仅显示 App Node + 顶层 Module Node：  
  - 节点标签使用 `ModuleDef.id`；  
  - 提供“展开”操作。
- 展开某 Module 节点时：  
  - 展示该 Module 内部的 Store Node / Process Node；  
  - 可继续展开子 Module（imports）形成多级树。

这样形成的视图既能从宏观上看到“模块/领域之间的关系”，又能逐步钻取到具体 Store 与进程。

## 4. 依赖检查与错误提示

借助 ModuleIR，平台可以在静态阶段做一些架构级检查：

### 4.1 exports 约束检查

场景：模块 A 的某个 Process 或 Logic 代码中使用了模块 B 内部未导出的 Tag。

实现步骤：

1. 通过 Code → Tag 使用分析（例如扫描 `yield* SomeTag`、`useStore(SomeTag)` 等调用）构建 “逻辑依赖图”；  
2. 将依赖中的 Tag 使用与 ModuleIR 的 `exports` 信息对齐：  
   - 如果某个 Tag 只在 B.providers 中声明，但不在 B.exports 中出现，则视为 **内部 Tag**；  
   - 若 A 不是 B 本身或其子模块，却引用了内部 Tag，则判定为封装违规。

平台行为：

- 在 Universe View 中高亮违规连线；  
- 在规则列表 / 代码视图中给出错误或强警告；  
- 提示开发者：应当将 Tag 加入 B.exports，或将相关 Logic 下沉到 B 模块内部。

### 4.2 循环依赖检测

ModuleIR 的 imports 关系构成一张有向图：

- 检测 ModuleDef.id 节点上的环（A → B → ... → A）；  
- 在 Universe View 中高亮循环路径；  
- 建议拆分模块或引入更细的子模块以解除循环。

### 4.3 过度跨域依赖

基于 “Process → Store/Service Edge”，可以统计：

- 某个 Module 中的 Process 过多依赖其他 Module 的 Store/Service（例如超过某个阈值）；  
- 在 Universe View 中提示“跨域依赖过多”的模块，辅助架构治理。

## 5. 与 Runtime 的耦合点

在 v3 中，平台与 Runtime 在模块体系上的关键契约是：**都以 ModuleDef 为核心**，但关注点不同：

- Runtime：  
  - 使用 ModuleDef 构建 Layer 和 processes，采用 Env 扁平合并策略；  
  - 不理会 exports 与 middlewares 的具体语义。
- 平台：  
  - 使用 ModuleDef 构建 Universe View 与依赖图；  
  - 使用 exports 进行封装约束检查；  
  - 使用 middlewares 元信息帮助 AOP/UI 配置。

重要的是：即便 Runtime 暂不做 Env 裁剪，平台层仍然可以通过 ModuleIR 做出严谨的“可见性”约束与错误报告，这也是 v3 的设计取舍之一。

## 6. 约束与可解析子集

为了让上述实现保持可控，平台需要对 ModuleDef 写法做一些约束：

- **对象字面量优先**：  
  - `Logix.module({ ... })` / `Logix.app({ ... })` 推荐使用直接的对象字面量；  
  - 避免在配置中使用 `...spread`、条件表达式、运行时变量拼接等复杂写法。
- **符号引用优先**：  
  - `imports` / `providers` / `processes` / `exports` 数组中的元素应为简单标识符或 `Logix.provide(Tag, Value)` 这种固定模式；  
  - 避免在数组中写复杂表达式（如立即调用函数等）。

对于不满足上述约束的写法，平台可以：

- 将对应模块标记为“部分可解析”或 Gray Box；  
- 仅在 Universe View 中展示有限信息，避免给出误导性的拓扑。

通过这些约束，Universe View 的实现既能覆盖绝大多数规范内用法，又避免在 TS AST 上做过于复杂和脆弱的推理。***
