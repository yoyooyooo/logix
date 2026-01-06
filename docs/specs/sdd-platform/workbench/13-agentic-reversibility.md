---
title: 13 · Agentic Reversibility：跨越 IR 与代码的语义鸿沟
status: draft
version: 2025-12-21
value: vision
priority: later
related:
  - ./02-full-duplex-architecture.md
  - ./07-intent-compiler-and-json-definition.md
  - ./15-module-runtime-reflection-loader.md
---

# Agentic Reversibility：跨越 IR 与代码的语义鸿沟

> 本文探讨在“Static IR 逻辑有损”的物理约束下，如何引入 LLM Agent 作为**语义编解码器 (Semantic Codec)**，实现从 IR/Intent 到 Effect Runtime 代码的**语义级可逆**。

## 1. 问题背景：熵增与有损压缩

在传统编译器视角（Compiler View）下，`Code -> AST -> IR -> Binary` 是一个熵减（信息丢失）的过程：

- Logix Code 中包含的注释、变量命名风格、未使用的 Helper 函数，在转为 Static IR 时会被丢弃。
- Static IR 只保留了“拓扑骨架”和“关键契约（Schema/FieldPath/Dependency）”，具体的计算逻辑（Implementation）被视为黑盒。

如果我们要求 SDD 平台支持 **Round-Trip Engineering（双向工程）**，仅靠物理上的 Static IR 是不够的。任何从 IR 反向生成代码的尝试，都会得到“失去灵魂的骨架代码”。

**Agentic Reversibility** 的核心假设是：**LLM 可以通过推理、幻觉（创造力）和语义理解，填补 IR 到 Code 之间的“信息熵差”。**

## 2. 三体模型：Intent, IR & Code

在 Agent 辅助的 SDD 架构中，我们维护三种状态：

1.  **Intent JSON (Design-Time)**:
    - 性质：**高保真、声明式**。
    - 内容：来自 PRD 的需求摘要、Prompt、自然语言描述 Rule。
    - 角色：Source of Truth (Semantic)。

2.  **Static IR (Analysis-Time)**:
    - 性质：**确定性、结构化**。
    - 内容：Module 拓扑、依赖图、字段读写关系。
    - 角色：Skeletal Backbone (Structural)。

3.  **Effect Code (Run-Time)**:
    - 性质：**可执行、细节丰富**。
    - 内容：TypeScript + Effect 实现。
    - 角色：Projection (Implementation)。

**Agentic Reversibility** 不追求 `Code A -> IR -> Code A` 的**字节级还原**，而是追求 `Intent -> Code A -> Intent -> Code B` 的**语义级等效（Semantically Equivalent）**。

## 3. 三种 Reversibility 模式

### 3.1 模式 A：Phantom Source (幽灵源码 / 意图锚点)

**场景**：解决“正向生成后，如何保留重生成能力”的问题。

当 Intent Compiler (Agent) 生成代码时，不只生成 `.ts` 文件，还在 IR 元数据或代码注释中留下“生成指纹”。

- **正向 (Hydration)**:
  - Input Intent: `{"rule": "age_check", "desc": "必须满18岁，否则报错 '未成年'"}`
  - Agent Action: 生成 `if (age < 18) yield* Effect.fail(...)`。
  - **关键动作**: 在 Static IR 的 Node Meta 中，或代码注释中，写入 `x-intent-prompt: "check age >= 18, error msg '未成年'"`。

- **逆向 (Rehydration)**:
  - 当我们需要从 IR 恢复/迁移代码时，Agent 读取 `x-intent-prompt`。
  - Agent 重新生成代码。虽然生成的变量名可能从 `age` 变成 `userAge`，但**业务逻辑是无损的**。

### 3.2 模式 B：Semantic Compression (反向语义提取)

**场景**：解决“手写代码（Escape Hatch）如何回变为 Intent”的问题。

对于开发者手写的复杂 Effect 逻辑（Static IR 视为 Blackbox Computed），Agent 进行**反向工程**。

- **过程**:
  1.  **Read**: 读取手写 TypeScript 代码的 AST。
  2.  **Analyse**: 分析控制流（Effect.match, pipe, stream）。
  3.  **Summarize**: LLM 总结：“这段代码监听了 `props.keyword`，做了 500ms 防抖，然后调用了 `API.search`，最后写入 `state.results`。”
  4.  **Compress**: 将上述总结压缩为 Intent JSON 节点：
      ```json
      {
        "kind": "computed",
        "implementation": "ai.generated",
        "description": "Debounced search based on keyword",
        "params": { "debounce": 500, "api": "API.search" }
      }
      ```
  5.  **Sync**: 更新设计稿（Intent JSON）。

**价值**：将不可维护的“遗留代码”转化为结构化的“可理解意图”。

### 3.3 模式 C：Drift Detection (意图漂移看门狗)

**场景**：解决“代码与设计不一致”的问题。

Agent 作为一个后台进程（Watchdog），持续比对 **Code 的语义** 与 **Intent 的定义**。

- **Detection**:
  - Intent 定义：`source: fetch_user_profile` (无参数)。
  - Code 实现：开发者悄悄加了个 `if (Date.now() % 2 === 0) return null`。
  - Agent 发现：代码逻辑包含“随机返回空”，与 Intent 的“获取画像”不符（或 Intent 过于简略）。
- **Reconciliation**:
  - 策略 1 (Fix Code): 警告开发者由随机逻辑。
  - 策略 2 (Evolve Intent): 询问“是否更新 Spec？这个随机逻辑看起来是 A/B 测试的一部分？”
  - 动作：自动更新 Intent JSON，补全 `description: "Fetch profile with 50% rollout failure injection"`。

## 4. Runtime Reflection：基于执行的 IR 提取

除了静态分析（AST），我们还引入 **Runtime Reflection (运行时反射)** 策略，作为获取高保真 Static IR 的首选手段，尤其适用于动态定义的逻辑。

### 4.1 核心逻辑：Code as Builder

Logix 的设计哲学是 `Logix-as-React`，代码即定义。大多数 `Module.make` 调用是 Pure 的，直接构造出 `StateTraitProgram` 对象。
但在需要动态构建（例如基于 Feature Flag 挂载 Trait）的场景，代码会变成一段 **Effectful Builder Script**。

### 4.2 依赖发现与 Build-Time Constraints

要让这段 Builder Script 在平台层顺利运行，我们不仅需要 Mock，还需要**约束**。

#### 约束 1：Separation of Construction vs Runtime

- **Runtime Dependencies (Services)**: 数据库、API Client 等。这些只应出现在 Trait **Handler 内部**（闭包或 yield），**不应影响 Module 的构建过程**。
- **Construction Dependencies (Config)**: 只有 Feature Flag 或 Environment Variables 允许影响 Module 的**拓扑结构**（Topology）。

#### 约束 2：The Standard Build Env

平台为 "Reflection" 阶段定义一个**标准化构建环境**，只包含：

- `Config` (Mocked): 允许注入 Feature Flags。
- `RuntimeHost` (Mocked): 允许感知当前是不是在浏览器/Server。
- （可选）`FileSystem` (Mocked)。

**禁止**在 `Module.make` 的构建阶段（拓扑生成阶段）依赖任意业务 Service。

### 4.3 利用 Effect DI 进行 Mock 试运行

基于上述约束，我们可以放心地进行 Dry Run：

```typescript
// Platform Reflecter
import { MyModuleBuilder } from './MyModuleBuilder'

// 构造 "Standard Build Env"，包含所有可能的 Config Mock
// 对于未知 Config 键，可以配置 Proxy 策略或让用户通过 '.agent/config.mock.json' 提供
const buildLayer = Layer.mergeAll(Config.Mock({ ENABLE_EXPERIMENTAL_TRAIT: true }), RuntimeHost.Mock('browser'))

// 运行 Builder，捕获 Program
const program = await Effect.runPromise(
  Effect.gen(function* () {
    // 假设用户代码是 export const makeMyModule = Effect.gen(...)
    const module = yield* MyModuleBuilder
    return module.program
  }).pipe(Effect.provide(buildLayer)), // 如果此处报错缺失 Service，说明用户违反了 "Construction Dependencies" 约束
)
```

### 4.4 优势

- **无需手动解析 AST**: 避开了复杂的 TS 语法分析，直接获取 Runtime 看到的真理。
- **支持动态构建**: 能正确处理 `if (featureFlag) $.computed(...)` 等条件逻辑。
- **强制架构规范**: 反向推动开发者分离“构建态”与“运行态”依赖，避免在模块定义阶段耦合业务副作用。

## 5. 平台集成路径

(内容同前文)

### 5.1 Compiler Middleware：AI Interceptor

在 Intent Compiler 中插入 AI 拦截器：

```typescript
// Pseudo Code for Intent Compiler
async function compileToCode(ir: StaticIR, intent: IntentJSON) {
  for (const node of ir.nodes) {
    if (node.kind === 'blackbox_computed') {
      // 1. 尝试查找 Phantom Source (Cache)
      const cached = findPhantomSource(node.id)
      if (cached) return cached.code

      // 2. 调用 Agent 生成 (Hydration)
      const prompt = intent.nodes[node.id].description
      const code = await Agent.generateEffectCode(prompt, context)

      // 3. 注入 Phantom Source 供未来逆向
      return attachMeta(code, { prompt })
    }
  }
}
```

### 5.2 Studio：From Code 按钮

在 Studio 画布上，允许用户选中一段“未知逻辑”节点，点击 **"Reverse to Intent"**。
平台调用“Semantic Compression” Agent，分析底层代码，生成一段自然语言描述或结构化配置，覆盖回 Studio 的配置面板。

## 6. 总结

Agentic Reversibility 为 SDD 补上了最关键的一环：**Human <-> AI <-> Code 的信任链**。

- 它允许 Code 暂时脱离 Spec 独立演进（因为 Agent 能把它抓回来）。
- 它允许 Spec 只有模糊的 Prompt（因为 Agent 能补全细节并固化）。
- 它让 Static IR 从“死板的中间产物”变成了“即时编译、即时反编译”的**语义高架桥**。
