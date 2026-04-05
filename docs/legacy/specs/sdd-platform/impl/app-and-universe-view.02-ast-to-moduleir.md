# 2. AST → ModuleIR 的抽象

为便于平台内部处理，可以先将源代码中的 ModuleDef 映射为一个简化 IR：

```ts
interface ModuleIR {
  id: string

  // 标识该模块定义所在文件 / 导出符号
  filePath: string
  exportedName: string

  imports: string[] // 引入的子模块 ID（或符号名）
  providers: Array<{
    tagSymbol: string // Tag 的符号名（用于连线）
    valueSymbol: string // Store/Service 的符号名
  }>

  links: string[] // 业务编排 Link 的符号名
  processes: string[] // 基础设施 Process 的符号名
  exports: string[] // 对外公开的 Tag 符号名

  // 附加元数据（如 middlewares、注释等），供后续使用
  middlewares: string[]
  jsDoc: string | null
}
```

解析流程（概念）：

1. 扫描整个项目，定位所有 `Logix.Module.make(...)` 调用（以及早期版本中遗留的应用级配置调用，如 AppRuntime 入口）；
2. 对每个调用：
   - 读取 `id` 字段（要求为字符串字面量）；
   - 从变量声明中获取 `filePath` + `exportedName`；
   - 遍历 `imports` 属性数组，收集引用的模块符号名；
   - 遍历 `providers` 属性数组，识别 `Logix.provide(TagSymbol, ValueSymbol)` 模式；
   - 遍历 `links` / `processes` / `exports` / `middlewares` 数组，收集符号名；
   - **注意**：需区分 `links` 和 `processes` 字段，分别收集。
3. 生成整体 ModuleIR 图。

> 解析工具
>
> - 实现上可使用 ts-morph 或 TypeScript Compiler API；
> - 关键是固定模式：只支持对象字面量 + 简单标识符数组，避免在 ModuleDef 中写复杂表达式（如条件运算、spread 等），否则解析成本剧增。
