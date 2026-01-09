# Future Roadmap: Beyond Spec 007

> 本文档列举了在 007 核心契约落地（达成 MVP）之后，为了进一步提升 DX、性能与生态完整性而**值得做**的所有事项。按优先级排序，事无巨细。
>
> **P0 = 必须做（Kernel Hardening）**：不仅是优化，而是为了大规模可用性的必经之路。
> **P1 = 应该做（DX & Tooling）**：解锁“双丰收”中的 DX 部分，显著降低门槛。
> **P2 = 可以做 (Ecosystem)**：锦上添花，扩展能力边界。

---

## P0: Kernel Hardening (内核硬化)

### 1. Reverse Closure (反向闭包) 的增量缓存

- **痛点**：每次 `validate(field)` 都要遍历全图算闭包。对于 1000+ 节点的图，这是 O(N)。
- **Todo**：在 Graph 构建时预计算关键节点的反向可达表（Reachability Table），或者在 Runtime 缓存上次计算的闭包结果（直到 Graph 结构变更）。
- **目标**：将校验触发开销降至 O(1)。

### 2. Microtask Batching 的诊断可视化

- **痛点**：Engine 在微任务里把多次变更合并了，Devtools 如果看不到这个“合并过程”，开发者会觉得“我的中间状态去哪了？”
- **Todo**：在 Devtools 新增 "Batch View"，展示：`[Source A change] + [User B type] -> (Batching...) -> Commit`。让“消失的中间态”在调试器里可见。

### 3. Virtual Identity 的“墓碑机制” (Tombstones)

- **痛点**：数组删行后，对应的 RowID 虽然从 Mapping 移除了，但如果内存里还有游离的闭包引用了它，可能会导致内存泄漏或野指针报错。
- **Todo**：实现 RowID 的显式销毁生命周期。当 Row 被移除时，标记其状态为 `Dead`，任何试图访问该 ID 的操作直接抛出明确错误（而不是 undefined crash）。

### 4. 强类型 Config Schema 校验 (Runtime)

- **痛点**：TS 类型能在编译时拦住错误，但拦不住运行时动态加载的错误配置（如低代码场景）。
- **Todo**：为 Trait Spec 引入 `zod` 或 `effect/Schema` 运行时校验。在 `StateTrait.build` 阶段对配置结构进行严格验证（禁止环、禁止无效引用），这也是 006 要求的“分级失败”的基础。

---

## P1: DX & Tooling (开发体验)

### 4.5 领域包内部类型安全收敛（Form / Query）

- **痛点**：为了快速迭代，`@logixjs/form` 与 `@logixjs/query` 的 reducers/logics/Controller 中存在较多 `any` 断言，重构时容易隐式 break。
- **Todo**：
  - 为 Module 的 State/Action 推导提供可复用的 helper types（例如 `Reducer<S, A>` / `ActionOfTag<...>`），让 reducers 不再需要 `any`；
  - 让 `TValues/TParams` 在内部传递时保持约束，不退化为 `object/unknown`；
  - 将“最小 unsafe cast”集中在少量边界层（例如 Schema.Any 投影与 actions payload 的桥接），其余代码维持强类型。

### 5. `Form.traits` 的“伪扁平”语法糖 (Sugar)

- **痛点**：手写 `list({ item: ... })` 嵌套太深，视觉噪音大。
- **Todo**：在 `@logixjs/form` 实现一个编译器宏或预处理 helper，允许：
  ```ts
  Form.traits({
    'items.name': Form.Rule.required(), // Sugar
    items: Form.Rule.minLength(1),
  })
  ```
  运行时自动展开为标准的 `StateTrait.list` 结构。这也是用户感知最明显的 DX 提升。

### 6. CLI Codegen: Schema -> Scaffold (Code-Behind Pattern)

- **痛点**：面对后端给的 5 层嵌套 JSON Schema，手写 StateTrait 依然痛苦；且纯 CLI 手动运行体验断裂。
- **Todo**：开发 `logix codegen` (Core) + `unplugin-logix-codegen` (Trigger)。
  - **原则**：拒绝 AST Magic Transform，采用 **Code-Behind 生成模式**。
  - **Input**: `UserForm.schema.ts` (Effect/Zod)
  - **Output**: 自动生成物理文件 `UserForm.traits.generated.ts`（可被 gitignore 或提交），供业务代码显式 import。
  - **Experience**: 基于 **unplugin** 实现，一次适配 **Vite/Webpack/Rspack/Rollup/Esbuild**，开发时静默监听（Watch Mode）；CI/CD 时作为 CLI 命令运行。
  - **Benefit**: 既有插件的“静默丝滑”，又有生成的“物理文件安全感”（类型完美、断点可调试、不锁死 Build Tool）。

### 7. Explicit Error Map Helper

- **痛点**：FR-016 虽然开了口子，但手写 `errorMap` 纯函数很累。
- **Todo**：提供一组常用 mapper，如 `Map.flatten("meta.")`，`Map.redirect("old", "new")`。让 90% 的结构变形错误归属只需一行配置。

---

## P2: Ecosystem (生态扩展)

### 8. `trackBy` (Identity Hint) 优化支持

- **痛点**：默认用 `RowID` 是安全的，但在数据全量刷新（Refresh）时，所有 RowID 都会变，导致全量重绘。
- **Todo**：在 `StateTrait.list` 支持 `trackBy: (item) => item.id`。
  - 当全量刷新发生时，如果 `trackBy` 能匹配到旧 ID，则复用旧 RowID。
  - 这能让“列表刷新”的性能体验达到 React Key 的级别。

### 9. Time Travel 的 "Diff View"

- **痛点**：回放时看着状态跳变，难以肉眼对比“到底哪里变了”。
- **Todo**：在回放器中增加 Diff 视图。不仅重放状态，还高亮显示与上一帧的差异（Deep Diff）。

### 10. Query 的自动 Loading 骨架屏生成

- **痛点**：Query Trait 知道资源的 status，也知道数据结构。
- **Todo**：利用 Trait 的元信息，自动生成 Skeleton UI 组件。`Form.LoadingState` 直接根据 Schema 形状渲染骨架屏。

---

## 优先级总结建议

1.  **Phase 0 (Now)**: 专注 007 的 **Contract 实现 & P0 中的 1/3 (缓存/墓碑)**。这是能不能 run 起来的关键。
2.  **Phase 1 (Post-MVP)**: 立即着手 **P1 中的 5/6 (语法糖/Codegen)**。这是能不能推给别人用的关键。
3.  **Phase 2 (Stable)**: 慢慢做 **P2**。这是让系统好用的关键。
