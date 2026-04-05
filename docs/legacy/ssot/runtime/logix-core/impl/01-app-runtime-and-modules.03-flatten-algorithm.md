# 3. AppRuntime 装配算法与防呆实现

为了保证实现的健壮性，当前实现要求 `makeApp`（`packages/logix-core/src/internal/runtime/AppRuntime.ts`）必须包含以下逻辑。

> 注：模块树的 flatten（`imports`/`withLayer` 的 Layer 合成）发生在 `ModuleImpl` 构造期（`packages/logix-core/src/internal/runtime/ModuleFactory.ts`）；AppRuntime 只负责“把若干模块条目 + App 级 Env + processes”装配成一棵可运行的 Runtime Tree。

## 3.1 Tag 冲突检测（Hard Constraint）

在合并 Layer 之前，AppRuntime 必须维护一个 `TagIndex` 并进行冲突检查：

```ts
type TagKey = string

interface TagInfo {
  readonly key: TagKey
  readonly tag: Context.Tag<any, any>
  readonly ownerModuleId: string
  /**
   * Tag 来源（当前实现只做最小集合）：
   * - "module"  ：模块自身的 Runtime Tag（例如 `@logixjs/Module/<id>`）；
   * - "service" ：模块显式声明“由该模块 layer 提供”的 Service Tag（仅用于冲突检测元信息，不影响运行时行为）。
   */
  readonly source: 'module' | 'service'
}

interface TagCollisionError {
  readonly _tag: 'TagCollisionError'
  readonly collisions: ReadonlyArray<{
    readonly key: TagKey
    readonly conflicts: ReadonlyArray<TagInfo>
  }>
}
```

**实现约束（以当前代码为准）**：

1. TagIndex 的输入是 `config.modules: ReadonlyArray<AppModuleEntry>`（而不是递归遍历 ModuleDef 树）；
2. 必须始终记录每个 entry 的 ModuleTag 自身（source=`"module"`）；
3. 若 entry 携带 `serviceTags` 元信息，则把这些 tag 也加入索引（source=`"service"`）；
4. 当且仅当同一个 `TagKey` 出现在多个不同 `ownerModuleId` 下时，视为碰撞并抛出 `TagCollisionError`；
5. **绝对禁止**依赖 `Layer.mergeAll` 的顺序进行静默覆盖。

## 3.2 Env 合成顺序约定（实现）

当前 AppRuntime 的 Env 合成顺序固定为：

1. 先构造 `baseLayer`（App 级 Env + runtime_default 配置服务 + ProcessRuntime + RootContext 等）；
2. 对每个模块 entry 执行 `Layer.provide(entry.layer, baseLayer)`，确保模块实例初始化阶段可以读取 App 级 Env（避免“初始化期缺 root env”）；
3. 最终 `envLayer = Layer.mergeAll(baseLayer, ...moduleLayers)`。

> 有 Tag 冲突检测兜底后，顺序不再承载“覆盖语义”，仅用于保证模块初始化能看到 App 级 Env。

## 3.3 Process 安装与错误处理（ProcessRuntime）

AppRuntime 启动 processes 的方式以 `ProcessRuntime` 为单一事实源：

- 对每个 `config.processes`：
  - 先调用 `processRuntime.install(process, { scope: { type: 'app', appId }, ... })`；
  - 若返回 `undefined`，说明这是一个 raw Effect（兼容 fallback）：AppRuntime 会直接 `forkScoped` 运行它，但它不具备 Process 的静态 surface 与标准诊断事件；
  - 若安装成功，ProcessRuntime 负责统一的触发/监督/错误路径与 `process:*` 诊断事件。
