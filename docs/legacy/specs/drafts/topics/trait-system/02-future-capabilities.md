# Draft: Future Capabilities Enabled by StateTrait Submersion

> **Context**: StateTrait 下沉基础能力 (Descriptor, IR, Ownership, Lane) 后，Logix 从 "JS Runtime Library" 进化为 "Self-describing Logic Protocol"。
> **Goal**: 规划基于这套协议生长出的新原语与高阶模式，按实施可行性 (Feasibility) 与 ROI 排序。

## T1: Immediate (即刻可用/高收益)

> **特征**：依托 `073-logix-external-store-tick` 改造直接获得，零内核修改，纯 Trait 封装。建议在 v0.7.x 落地作为最佳实践。

### 1. `StateTrait.device` (环境感知)

- **定位**：标准化的 ExternalStore 封装，统一管理硬件/环境事件。
- **形态**：
  ```ts
  // 自动处理 addEventListener/removeEventListener，自带防抖
  StateTrait.device({
    kind: "network", // or 'resize', 'visibility'
    priority: "nonUrgent", // 利用 TickScheduler 抗抖动
    coalesce: 200,
  });
  ```
- **收益**：
  - 消灭业务代码中散乱的 `window.addEventListener`。
  - 网络状态、屏幕尺寸以统一 schema 进入 State Graph。
  - 完全可复现（Static IR 录制）。

### 2. `StateTrait.optimistic` (乐观 UI)

- **定位**：Trait Factory，组合底层原子实现复杂模式。
- **实现原理**：编译为一组平级 Traits：
  - `inputs.real` (ExternalStore, source=Server, priority=High)
  - `inputs.optimistic` (Dispatch, source=User, priority=Instant)
  - `computed.display` (Logic: `optimistic ?? real`)
- **收益**："乐观更新" 变成一行声明配置，Devtools 可清晰回放 "乐观 -> 真实" 的收敛过程。

### 3. `StateTrait.form` (表单校验)

- **定位**：基于 `source` (Derived) 和 `ownership` 的校验基建。
- **形态**：
  ```ts
  StateTrait.form({
    fields: ['username', 'password'],
    rules: [ ... ]
  })
  ```
- **收益**：
  - 校验逻辑声明式挂载，不再散落在组件或 helper。
  - 利用 Ownership 治理，防止校验结果被外部篡改。
  - 静态分析可直接提取必填字段元数据。

---

## T2: Mid-term Evolution (中期演进)

> **特征**：需要扩展编译器或周边生态，但技术路径清晰。建议在 v0.8.x 探索。

### 4. `StateTrait.sync` (状态同步 / CRDT)

- **定位**：协同编辑/即时同步能力封装。
- **路径**：引入轻量级 CRDT (Yjs/Automerge) 或自定义 Diff 协议。
  - ExternalStore: apply remote patch
  - Dispatch: generate local patch
- **收益**：让 "多人协作" 变成可插拔的 Trait 特性，业务零侵入。

### 5. `Logix.Workflow` (可解释编排)

- **定位**：终结 `Process.link` 黑盒，流程控制可视化。
- **路径**：设计 DSL (Sequence, Parallel, Race)，编译器 Lowering 为 `StateTrait` + `DeclarativeLinkIR`。
- **价值**：复杂的长流程业务逻辑在 Devtools 中因果链清晰可见。

---

## T3: Long-term Vision (长期愿景)

> **特征**：依赖外部环境成熟或大规模重构，属于 "The Endgame"。除非业务强诉求，暂不投入。

### 6. `StateTrait.animation` (动画状态)

- **难点**：高性能动画需 Bypass React Render Loop，与 Logix-as-React 原则冲突。需等待 React Concurrent 能力更成熟或特定跨线程方案。

### 7. Core-NG (Rust/WASM Kernel)

- **路径**：基于静态 `StateTraitProgram` IR，用 Rust 重写 Runtime。
- **场景**：极致性能要求或非 JS 环境复用。

### 8. Visual Logic Editor (可视化编辑器)

- **路径**：基于 Static IR 的双向绑定编辑器。
- **价值**：低代码平台的圣杯，但需警惕 UX 陷阱。
