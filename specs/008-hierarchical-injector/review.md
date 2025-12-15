# Review: 008 层级 Injector 语义统一

> 2025-12-15 更新：008 已按“imports strict-only + `Root.resolve`（root provider）”落地；本 review 已同步为与最终实现一致的表述（移除旧版 `ImportedModuleContext` 与 imports API 的 global-mode 等过期描述）。

## 1. 总体评估 (Overview)

这份规划（008-hierarchical-injector）在架构方向上非常稳健，准确地抓住了当前 Logix Runtime 在“分形模块（Fractal Modules）”与“多实例（Multi-instance）”场景下的痛点。

- **方向正确**：废弃“全局注册表回退（Global Registry Fallback）”并转向“严格最近胜出（Strict Nearest Wins）”是支持多 Root、多实例的必经之路。
- **契约清晰**：通过 `contracts/*.md` 明确锁死了 Strict/Global/Root 的行为边界，避免了“实现时走样”。
- **风险可控**：明确了这是 Breaking Change，并给出了基于“错误诊断 + 文档”的迁移路径，而不是试图维护昂贵且易错的兼容层。

## 2. 亮点 (Highlights)

### 2.1 诊断优先 (Diagnostics First)

规划中尤为突出的是对“错误体验”的关注（P3 优先级，D05 决策）。

- **结构化错误**：`ResolutionError` 定义了标准字段（tokenId, scope, fix suggestions），这对于“严格模式”的落地至关重要。
- **可操作性**：要求 dev 环境必须给出 `fix[]` 建议（如“补 imports”或“显式 root/global（`Root.resolve` / `useModule(ModuleTag)`）”），极大地降低了 Strict 模式带来的接入摩擦。

### 2.2 核心去魔法化 (De-magic)

- **D01 (No Fallback)**：坚决切断隐式全局回退，消除了“开发环境能跑、生产环境串实例”的巨大隐患。
- **D04 (No Tag+Key Magic)**：拒绝引入 `(Tag, Key) -> Instance` 的全局查找魔法，强制要求传递 `ModuleRef` 句柄。这是符合 Effect/Functional 哲学的决策——**显式优于隐式**，状态应当由持有者（Parent/Host）传递，而非通过全局 Token 查找。

### 2.3 统一的数据模型

`data-model.md` 抽象出了 `Injector/ScopeKind` 与 `ResolutionRequest`，统一了 React (`useImportedModule`) 与 Logic (`$.use`) 的心智模型，为后续文档化和教学提供了坚实基础。

## 3. 潜在风险与建议 (Risks & Recommendations)

### 3.1 Root Provider 的测试/Mock 难度

**关注点**：决策 D02/D03 及契约 `resolution.md` 3.3 指出 `Root.resolve` 必须拿到 root provider 实例，且**不受 React 局部 override 影响**。

- **风险**：在单元测试或集成测试中，我们经常使用 `RuntimeProvider` (或类似机制) 在组件树顶部注入 Mock 服务/单例。如果 `Root.resolve` 严格绕过这些 override，可能会导致测试无法 Mock 全局单例。
- **建议**：
  - 明确 **Root** 的定义：是“进程级绝对全局”还是“当前 Runtime Tree 的根”？
  - 如果是后者（推荐），那么 `RuntimeProvider` 新建这棵树时提供的 Layer 应当被视为这棵树的 User-defined Root，`Root.resolve` 应当能解析到这里，只是不能解析到 _更深层_ 的 `RuntimeProvider` 提供的 override。
  - **Action**：建议在 `contracts/resolution.md` 或 `plan.md` 中补充“如何 Mock Root Provider”的测试形态说明。
  - （已补齐）`contracts/resolution.md` 已固化“如何 Mock Root Provider”，并有对应单元测试覆盖。

### 3.2 `ModuleRuntime` 持有 `__importsScope` 的引用压力

**关注点**：决策 D10 提出 `ModuleRuntime` 将捕获并持有 imports-scope injector（`__importsScope`：ModuleToken → ModuleRuntime）。

- **风险**：如果 `__importsScope` 在 scope close/dispose 时未释放，会在 React HMR 或频繁卸载/重建场景下保留整棵子模块 runtime 子树，造成泄漏与诊断噪音。
- **建议**：
  - 确保 `Scope.close` / runtime dispose 时显式清理 `__importsScope` 引用（置空），并用单测锁死回收行为。
  - `__importsScope` 必须保持“最小 injector”，禁止持有完整 `Context` 或 Service 实例。

### 3.3 迁移痛苦 (Migration Pain)

**关注点**：Strict 默认是 Breaking Change。

- **风险**：现有业务代码如果大量依赖了隐式全局回退（例如未在 imports 声明子模块但直接用了），升级后会大面积报错。
- **建议**：
  - 确认 `ResolutionError` 的 fix 建议在控制台的展示效果。
  - 考虑提供一个 `codemod` 扫描代码，通过静态分析找出“使用了 `$.use(Module)` 但未在 `imports` 声明”的地方，辅助迁移（虽然静态分析很难 100% 准确，但能解决大部分）。

## 4. 结论 (Conclusion)

这份规划达到了 **Approved** 标准。它准确地识别了核心矛盾（全局回退 vs 多实例正确性），并给出了符合系统设计哲学（Explicit, Strict, Diagnostic-rich）的解决方案。

**下一步建议**：

1. 在 Phase 0 补充“Root Provider Mock 策略”的说明。
2. 在 Phase 1 实现 `ModuleRuntime` 持有 Context 时，同步建立内存泄漏回归测试。

---

## 5. 补充评审 (Supplementary Review by Second Reviewer)

> 以下为另一视角的独立评审，聚焦于前一轮可能遗漏的技术细节与风险点。

### 5.1 Effect 生态对齐：天然支持 vs 需要桥接

**观察**：规划正确地指出 Effect 的 `Context.Tag` + `Layer` 天然满足 Nearest Wins（research.md §2.1）。但当前 `BoundApiRuntime.resolveModuleRuntime` 的实现（代码 L351+）在 `Effect.serviceOption` 失败后会回退到 `ModuleRuntime.getRegisteredRuntime`，这是**对 Effect 原语的"破坏性扩展"**。

**补充建议**：

- 移除 fallback 后，`$.use(ModuleTag)` 应当等价于 `yield* ModuleTag`——即纯 Effect 原语。
- 可考虑在 `$.use` 内部直接使用 `Effect.service(tag)` 而非 `serviceOption + fallback`，让 Effect 的错误语义（`NoSuchElementException`）自然传播，再在外层统一包装为 `MissingModuleRuntimeError`。
- 这样可以复用 Effect 的诊断能力（如 `Cause.pretty`），同时保持语义纯净。

### 5.2 tasks.md 质量评估

**亮点**：

- 任务分解遵循 User Story 独立可交付原则（US1/US2/US3 可分批上线）。
- 明确标注了 `[P]` 可并行任务，利于多 Agent 协作。
- 先写测试（T006-T009）再改实现（T010-T015）的"Test First"策略值得肯定。

**已覆盖**：

- `imports-scope` 已下沉到 core（`ModuleRuntime.__importsScope`），并固化“最小 injector + 可回收”的边界；
- React 侧 `ImportedModuleContext.ts` 外部 registry 已移除，strict 子模块解析只依赖 `__importsScope`。

### 5.3 imports-scope 实现细节：时机与粒度

**关注点**：imports-scope 必须是“实例自带”的最小信息，并且释放时机可验证。

**风险**：

- 如果把完整 `Context`（含 Service 实例）塞进 imports-scope，会导致内存占用随嵌套深度线性增长，并放大泄漏风险。
- 如果释放时机不严格绑定到 scope close，会在 React 场景下形成“卸载但仍保留子树”的悬挂引用。

**建议**：

- 明确 imports-scope 只保留“直接 imports 的子模块 runtime 映射”，而非完整 ancestor `Context`。
- 在 `contracts/resolution.md` 中明确其内容边界与释放策略（避免被误用为通用 DI 容器）。

### 5.4 `$.useRemote` 删除的迁移风险

**更新**：008 已完成 `$.useRemote` 公共面移除，并补齐迁移形态：

- “父模块 imports 的子模块”→ 用 strict 的 `$.use(Child.module)` / `imports.get(Child.module)`；
- “跨模块胶水逻辑/IR 承载”→ 用 `Link.make(...)`（通常挂到 root 的 `processes`）。

### 5.5 `Link.make` 语义边界待明确

**观察**：plan.md L104 提到"跨模块协作/IR 承载使用 `Link.make`"，但未解释 `Link.make` 与 `$.use` 的**语义差异**。

**疑问**：

- `$.use(ChildModule)` 返回的是 `ModuleRuntime`；`Link.make` 返回的是什么？`LinkRef`？
- 如果两者都能读取子模块状态、触发 actions，为何需要两个入口？
- `Link.make` 是否涉及"跨 root"解析？如果是，是否与 D03（禁止跨 root 回溯）矛盾？

**建议**：

- 已在 `contracts/resolution.md` 与 `data-model.md` 中补齐 `Link.make` / `$.use` / `Root.resolve` 的语义边界与对比表；建议后续在用户文档中持续用“案例驱动”强化这张表的心智落地。

---

## 6. 综合结论 (Combined Verdict)

| 维度         | 评价                                      |
| ------------ | ----------------------------------------- |
| 方向正确性   | ✅ 高度对齐 Effect 生态与 Logix 设计哲学  |
| 契约完备性   | ✅ Strict/Global/Root 行为边界清晰        |
| 任务可执行性 | ✅ 核心任务边界已固化且有测试兜底         |
| 迁移路径     | ✅ `$.useRemote` 已移除且迁移写法已补齐   |
| 测试策略     | ✅ Test First + 性能基线 + 回归防线完备   |

**最终建议**：

1. 后续若引入更多“平台级 override”（例如多层 `RuntimeProvider.layer`），保持 `Root.resolve` 的“固定 root provider”语义不变，并持续用回归测试锁死。
2. 在更贴近真实的 React HMR/卸载压力场景下，补一条长跑集成用例，确保 `__importsScope` 不形成悬挂引用。
