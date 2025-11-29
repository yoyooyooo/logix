# Playground & Debugging 功能设计

> **Status**: Draft (v3 Final · Design)
> **Scope**: 平台侧面向用户的“运行与调试”功能定义。

## 1. 价值主张 (Value Proposition)

我们不仅仅是在做一个“在线 IDE”，而是在构建一套 **Intent-Driven 的质量保障体系**。

### 1.1 质量左移 (Shift Left Quality)
*   **Before**: 业务逻辑必须等到后端 API 开发完毕、部署到测试环境、甚至联调时才能验证。
*   **After**: 在 **写下第一行代码的瞬间**，即可在 Playground 中通过 Mock 验证核心逻辑（如支付重试、并发竞态）。
*   **Slogan**: **"Verify Logic before Deploying Infrastructure."**

### 1.2 活体文档 (Living Documentation)
*   **Before**: Wiki 里的“业务流程图”和“重试策略说明”永远是过期的，与代码脱节。
*   **After**: Playground 里保存的 Mock Case 就是 **可执行的业务规约**。
    *   “支付失败重试 3 次”不再是文档里的一句话，而是一个 **点击即跑的可交互用例**。
*   **Slogan**: **"Executable Specs over Stale Wikis."**

### 1.3 架构治理 (Architecture Governance)
*   **Before**: 代码耦合严重，业务逻辑混杂了数据库连接和 HTTP 请求，难以拆分。
*   **After**: Playground 是架构健康的 **强制体检中心**。如果你的 Module 逻辑能在浏览器里跑通（脱离 Node/DB），说明它真正做到了 **依赖倒置 (Dependency Inversion)**。
*   **Slogan**: **"Browser-Compatible means Architecture-Clean."**

---

基于前端运行时 (WebWorker + esbuild) 的底层能力，平台提供以下核心交互功能，闭环上述价值链路。

## 2. Mock 仪表盘 (Mock Dashboard)

用户无需修改代码即可动态调整环境行为，验证业务逻辑的健壮性。

### 1.1 服务列表与状态
*   **自动发现**：平台分析 `ModuleDef.providers` 和 `Layer` 结构，列出所有可 Mock 的 Tag（如 `PaymentService`, `UserRepo`）。
*   **控制面板**：为每个 Mock Service 生成控制 UI（基于 Schema）：
    *   **开关**：`simulateFailure` (模拟失败)。
    *   **滑块**：`latency` (模拟延迟 0-5000ms)。
    *   **JSON 编辑器**：`mockData` (自定义返回数据)。

### 1.2 实时反馈
*   **交互**：用户拖动延迟滑块或切换失败开关。
*   **响应**：平台自动向 Worker 发送 `updateEnv` 消息，Worker 立即使用新环境重跑当前 Effect，结果实时刷新。

## 2. 时光回溯与追踪 (Time Travel & Trace)

利用 Effect-TS 强大的 Tracing 能力，可视化逻辑执行流。

### 2.1 瀑布图 (Waterfall View)
*   **展示**：以时间轴展示所有 Effect Span 的执行顺序、耗时、父子关系。
*   **高亮**：
    *   **红色**：执行失败的 Span（显示 Error 详情）。
    *   **黄色**：耗时过长的 Span（性能瓶颈）。
    *   **虚线**：被 Mock 的外部调用。

### 2.2 状态快照 (State Inspector)
*   **点击**：点击瀑布图中的任意 Span。
*   **详情**：展示该时刻的 Context 状态、输入参数、输出结果。
*   **Diff**：对于 Store 更新操作，展示 State 的 Before/After 差异。

## 3. 热重载与守护 (Hot Feedback & Guard)

提供极致流畅的“修改-验证”循环，同时保证浏览器安全。

### 3.1 极速热更
*   **机制**：文件保存 -> 增量编译 (esbuild) -> Worker 重载 -> 自动重跑。
*   **目标**：从 Ctrl+S 到看到新结果，延迟 < 200ms。

### 3.2 死循环熔断 (Loop Breaker)
*   **检测**：若 Worker 超过 5秒 未响应心跳或未返回结果。
*   **交互**：
    *   UI 变红，提示 "Execution Timeout"。
    *   提供显眼的 **"Kill & Restart"** 按钮。
    *   (高级) 尝试分析堆栈，提示可能的死循环位置。

## 4. 场景用例 (User Stories)

### Story A: 验证支付重试
1.  用户打开 `CheckoutFlow` 的 Playground。
2.  在 Mock 仪表盘中，将 `PaymentService` 设为 "Fail 2 times, then Success"。
3.  点击运行。
4.  在瀑布图中确认：看到了 2 个红色的失败 Span，紧接着 1 个绿色的成功 Span，且总耗时符合重试策略。

### Story B: 调试死锁
1.  用户写了一个复杂的并发逻辑，Playground 卡住。
2.  UI 提示超时，用户点击 Kill。
3.  用户打开 Trace 视图（查看上一次部分成功的日志），发现 A 等 B，B 等 A。
4.  修改代码，保存，瞬间通过。

## 5. AI 增强 (LLM Integration)

Playground 不仅是人工调试器，更是 AI 辅助演练场。

### 5.1 智能用例生成 (AI Case Generator)
*   **痛点**：手动构造边界条件的 Mock 数据很累。
*   **功能**：点击 "Generate Edge Cases"，LLM 读取 Module 代码与 Schema。
*   **产出**：自动生成一组高价值的 Mock 场景（如“支付失败”、“高并发冲突”、“网络抖动”），用户一键运行。

### 5.2 智能诊断 (AI Trace Analysis)
*   **痛点**：Trace 瀑布图太复杂，看不懂根因。
*   **功能**：点击 "Analyze Failure"，LLM 分析 Trace 数据与 Error 堆栈。
*   **产出**：自然语言结论（如“错误根因是 PaymentService 连续 3 次 503，导致重试耗尽”），并高亮关键 Span。

### 5.3 自动修复闭环 (Auto-Fix Loop)
*   **痛点**：发现 Bug 后还要自己改代码。
*   **功能**：Playground 捕获运行时异常 -> LLM 分析源码与异常 -> 生成 Patch。
*   **产出**：自动应用修复代码 -> 自动触发热重载 -> 验证通过。用户只需审核最终结果。

## 6. 产品交互设计 (Product UX Design)

本模块正式命名为 **Logic Playground**。

### 6.1 界面布局 (UI Layout)
采用经典的 **三栏式布局 (Three-Column Layout)**，兼顾配置、执行与分析。

*   **左栏：导航与配置 (Navigation & Config)**
    *   **Case List**：保存的用例列表（如 "Happy Path", "Payment Fail"）。支持文件夹管理。
    *   **Mock Dashboard**：Mock 服务的控制面板（开关、延迟滑块、JSON 编辑器）。
*   **中栏：代码与画布 (Code & Canvas)**
    *   **Tab 页**：支持切换 "Code View" (源码编辑器) 和 "Flow View" (只读流程图)。
    *   **Run Bar**：顶部悬浮条，包含 "Run" (▶), "Debug", "Generate AI Case" (✨) 按钮。
*   **右栏：执行结果 (Execution Result)**
    *   **Console**：实时日志输出，支持按 Level 过滤。
    *   **Trace Waterfall**：执行瀑布图，支持缩放和点击查看 Span 详情。
    *   **State Inspector**：当前 Store 状态快照与 Diff。

### 6.2 使用角色 (User Roles)

| 角色 | 核心场景 | 价值点 |
| :--- | :--- | :--- |
| **后端开发** | 定义 API 契约，编写 Mock 数据 | 确保前端/逻辑层在无真实 API 时也能并行开发 |
| **全栈开发** | 编写 Module 逻辑，调试编排流程 | 极速反馈 (<200ms)，无需等待 Webpack 热更或部署 |
| **QA / 测试** | 构造边界用例 (Edge Cases)，验证健壮性 | 无需搭建复杂环境，直接在浏览器里把逻辑测透 |
| **产品经理** | 验收业务流程 (Acceptance Testing) | 点击 "Happy Path" 用例，直观确认业务逻辑符合预期 |

### 6.3 核心交互流程 (Core Flows)

#### Flow A: 开发调试闭环 (The Dev Loop)
1.  **Coding**: Dev 在 VSCode / 中栏编辑器写代码。
2.  **Hot Reload**: 保存即运行，右栏 Console 实时输出。
3.  **Debug**: 发现报错 -> 点击 Trace 红色节点 -> 定位问题。
4.  **Fix**: 点击 "AI Fix" -> 确认 Patch -> 问题解决。

#### Flow B: 契约验收闭环 (The Contract Loop)
1.  **Mocking**: 后端定义好 `UserRepo` 的 Mock 数据与 Schema。
2.  **Verifying**: 前端在 Playground 里跑通业务流程，确认 UI/逻辑 适配该 Mock。
3.  **Sign-off**: 双方确认：只要后端真实 API 符合这个 Mock，上线就没问题。
