# Logic Middleware & AOP · 平台配置与可视化草图

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: 平台如何围绕 Logic Middleware（日志/鉴权等 AOP 能力）提供配置 UI、代码生成与可视化展示。

本说明文档从平台视角整理 v3 中 Logic Middleware 的使用方式，以及 UI/出码器应如何与 runtime 规范对齐。

## 1. 核心信息来源

平台关于 Middleware/AOP 的信息主要来自三处：

1. **ModuleDef.middlewares**（架构级配置）  
   - 每个 Group/App 可以通过 `middlewares` 字段声明一组默认中间件，例如 `LoggingMiddleware`、`AuthMiddleware` 等；  
   - 这些中间件往往具有“日志”“权限”“审计”等语义标签。

2. **代码中的 Middleware 定义**（实现细节）  
   - 在 TS 代码中，以 `const Logging = (next, meta) => ...` 的形式定义；  
   - 平台可以通过简单约定（文件夹/命名规范）识别出一部分“标准中间件”。

3. **Logic 中的调用模式**（实际使用）  
   - 例如：

     ```ts
     const secure = Logic.compose(Logging, AuthGuard);
     yield* $.flow.fromAction('delete').pipe(
       $.flow.run(secure(deleteEffect, { name: 'deleteUser' }))
     );
     ```

   - 通过 AST 识别 `Logic.compose(...)` 与 `secure(effect, meta)` 的 pattern，平台可以判断某个 Logic 节点启用了哪些 AOP 能力。

## 2. 配置模型：AOP 能力的元信息

平台侧可以抽象出一个 AOP 能力描述：

```ts
interface AopCapability {
  id: string;               // 例如 "logging", "auth"
  label: string;            // UI 上显示的名称
  description?: string;     // 说明文案

  // 绑定到具体 Middleware 的映射信息
  // 如 "LoggingMiddleware" 或 "AuthGuard"
  middlewareSymbol: string; 
}
```

ModuleDef 与 Logic 可以分别挂载这些能力：

- 在 ModuleDef 中：

  ```ts
  export const UserModule = Logix.module({
    id: "UserModule",
    // ...
    middlewares: [LoggingMiddleware, AuthGuard],
  })
  ```

- 在 Logic 中（若需要局部覆盖）：

  ```ts
  const secure = Logic.compose(LoggingMiddleware, AuthGuard);
  ```

平台可以维护一张映射表：

```ts
const AOP_CAPABILITIES: Record<string, AopCapability> = {
  LoggingMiddleware: { id: "logging", label: "审计日志", middlewareSymbol: "LoggingMiddleware" },
  AuthGuard: { id: "auth", label: "权限校验", middlewareSymbol: "AuthGuard" },
};
```

## 3. 配置 UI：模块级 & 逻辑级

### 3.1 模块级 AOP 配置（Module Panel）

在 Universe / Module 视图中，每个模块节点可以有一个配置面板，展示：

- 可用 AOP 能力列表（来自 `AOP_CAPABILITIES`）；  
- 当前模块启用的能力（来自 ModuleDef.middlewares 的解析结果）。

UI 交互：

- 勾选/取消勾选某个能力 → 更新模块配置中的 `middlewares` 字段；  
- 保存后触发代码生成：更新对应的 ModuleDef 与相关 Logic 代码。

### 3.2 Logic 级 AOP 配置（Logic Node Panel）

在 Logic 视图中（Galaxy View 或规则列表），每个 Logic 节点可以展示：

- 该逻辑实际使用的中间件列表：  
  - 优先从代码中的 `Logic.compose(...)` + `secure(...)` 解析；  
  - 若无显式调用，则回退到模块级默认 Middleware（ModuleDef.middlewares）。

UI 交互：

- 允许在单个 Logic 上“关闭某个 AOP”，即不应用模块级默认 Middleware；  
- 或为某个 Logic 增加额外 Middleware。

这些操作都对应为代码层的显式插入/移除：

- 插入/删除某个 Logic 内部的 `Logic.compose(...)` 参数；  
- 或者生成一个新的 `compose(...)` 包裹层。

## 4. 代码生成策略

### 4.1 模块级 → Logic 内部代码

出码器流程示意：

1. 读取某 Module 的 `middlewares` 配置，得到一个 Middleware 列表；  
2. 对该模块内所有 Logic 定义：  
   - 若 Logic 无显式中间件调用，则在生成代码时插入：

     ```ts
     const secure = Logic.compose(LoggingMiddleware, AuthGuard);
     // ...
     yield* $.flow.fromAction(...).pipe(
       $.flow.run(secure(effect, { name: "..." }))
     );
     ```

   - 若 Logic 已有 `secure = Logic.compose(...)`，则按 UI 配置调整 compose 参数序列。

3. 确保生成的形式满足“可解析子集”要求（结构简单、易还原）。

### 4.2 逻辑级覆盖模块默认

当 Logic 级别的配置与模块级默认配置不一致时，可以采用两种策略：

- **Override 模式**：Logic 级配置完全覆盖模块级默认；  
- **Merge 模式**：在模块级默认基础上增加/移除部分 Middleware。

建议：

- v3 先采用 Override 模式：  
  - Logic 上显式配置的 Middleware 列表即为最终名单；  
  - 如果 Logic 上无配置，则继承模块级列表。  

这样可以减轻代码生成和解析复杂度。

## 5. 可视化：在图上表达 AOP

### 5.1 节点标记

在 Logic 节点上，可以采用简单的标签/图标表达 AOP 状态：

- “审计日志”：在节点右上角显示一个 log 图标；  
- “权限校验”：显示 shield 图标；  
- 悬浮时展示详细信息（来自 LogicMeta / AopCapability.description）。

### 5.2 过滤视图

提供 AOP 维度的过滤能力：

- 只显示启用了某个能力的 Logic 节点（例如所有带“权限校验”的逻辑）；  
- 用于审计和治理，如“哪些逻辑还没有接入审计日志？”。

## 6. 与 Runtime 的边界

如 Runtime 实现备忘中所述，v3 不计划在运行时自动从 ModuleDef.middlewares 注入 Middleware。  
因此平台层在设计时要注意：

- **所有 AOP 配置最终都应体现在 TS 代码中**（即通过 Middleware 调用显式表达）；  
- ModuleDef.middlewares 只是辅助平台在“模块层面”存储这些配置，Runtime 不基于它做任何隐式行为；
- 如果未来 v4 引入运行时 Middleware Registry，平台可以继续复用这些配置，但不需要修改 v3 已生成的代码。

## 7. 约束与可解析子集

与 IntentRule 类似，平台需要约定 Middleware 使用的可解析子集：

- 推荐 Pattern：  

  ```ts
  const secure = Logic.compose(LoggingMiddleware, AuthGuard /*, ... */);
  yield* source$.pipe(
    $.flow.run(secure(effect, { name: "xxx", storeId: "StoreId" })),
  );
  ```

- 避免在 compose / secure 调用中塞入复杂表达式（如动态数组、条件运算等）；  
- 对不满足 Pattern 的代码，可以：  
  - 在 UI 上显示为“自定义 AOP（不可解析）”；  
  - 不提供配置化编辑，仅支持查看。

通过这些约定，平台可以在不侵入 Runtime 的前提下，提供一个可用、可进化的 AOP 配置与可视化方案，为后续版本更强的 Middleware 能力打基础。***
