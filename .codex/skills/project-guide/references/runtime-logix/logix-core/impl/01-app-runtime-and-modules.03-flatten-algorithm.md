# 3. flatten 算法与防呆实现

为了保证实现的健壮性，当前实现要求 `buildModule` 必须包含以下逻辑：

## 3.1 Tag 冲突检测 (Hard Constraint)

在合并 Layer 之前，必须维护一个 `TagIndex` 并进行冲突检查：

```ts
type TagKey = string

interface TagInfo {
  readonly key: TagKey
  readonly tag: Context.Tag<any, any>
  readonly ownerModuleId: string
  /**
   * Tag 来源：
   * - "module"  ：模块自身的 Runtime Tag（例如 `@logix/Module/<id>`）；
   * - "service" ：由模块提供的 Service Tag（如 HttpClient / DomainService 等）。
   *
   * 说明：
   * - 当前实现中，AppRuntime 级 TagIndex 只关心 "module" | "service" 两种来源；
   * - ModuleDef 级 flatten 规划中，后续可扩展为 "provider" | "export" | "infra" 等更细粒度来源，
   *   但不影响现有 AppRuntime 行为。
   */
  readonly source: "module" | "service" | "provider" | "export" | "infra"
}

// 必须抛出的错误类型
interface TagCollisionError {
  readonly _tag: "TagCollisionError"
  readonly collisions: ReadonlyArray<{
    readonly key: TagKey
    readonly conflicts: ReadonlyArray<TagInfo>
  }>
}
```

**实现约束**：

1. 递归收集所有子模块的 Tag 信息，并构建 TagIndex；
2. 若发现同一个 Key 在多个 ownerModuleId 下出现（即被多个模块声明），**必须**构造 `TagCollisionError` 并 fail 掉构建过程；
3. **绝对禁止**依赖 `Layer.mergeAll` 的顺序进行静默覆盖。

## 3.2 Flatten 顺序约定

虽然有冲突检测兜底，但为了行为的可预测性，flatten 顺序固定为：

> **`imports` -> `infra` -> `providers`**

即：

1. 先加载依赖模块；
2. 再加载本模块的基础设施；
3. 最后加载本模块提供的服务。

## 3.3 Link vs Process 的运行时隔离

虽然它们都是 Effect，但在运行时必须包装为 `ProcessDef` 以区分语义：

```ts
function buildModule<R>(def: ModuleDef<R>): BuiltModule<R> {
  // ... (Layer 构建逻辑同上，需加入 Tag 冲突检查) ...

  // 区分 Link 与 Process
  // links 视为业务编排（接近 process），当前实现中暂与 processes 合并对待

  const processes = (def.processes ?? []).map(eff => ({
    id: generateId("process"),
    kind: "process" as const,
    effect: eff,
    ownerModuleId: def.id
  }))

  const allEffects = [...links, ...processes]

  // ...
}
```

**错误处理**：AppRuntime 通过 `config.onError` 集中处理进程失败；默认实现记录错误并允许 Scope 继续运行，平台可根据业务需要重启/降级。

**Dev-time 断言建议**：

- 建议在开发模式下（`NODE_ENV !== "production"`）增加守卫：
  - 若 `Process` 在短时间内（如 1s）正常结束（Success），打印 Warning：“Process 预期是长驻守护进程，请确认是否误用了 Process 承载一次性逻辑”；
  - 若 `Link` 长时间阻塞且不依赖任何 Service，提示可能误用了 Link。
