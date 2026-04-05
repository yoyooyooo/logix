# 3. 资产与模式相关术语

## 3.1 Pattern（模式）

- **Pattern Function**（运行时事实形态）：
  - 统一视为「Effect-native 长逻辑封装」：
    - 纯 Effect 形态：`runXxxPattern(input: XxxPatternInput): Effect.Effect<A, E, R>`；
    - Logic Pattern 形态：`makeXxxLogicPattern(config?): Logic.Of<Sh, R, A, E>`。
- 内部只使用 Effect / Service Tag / Module / Logic / Flow 与结构化控制流 helper，不再引入第二套 DSL。

- **Pattern Asset**（平台资产形态）：
  - 在 Pattern Function 外层包一层 metadata：`{ id, version, configSchema, tags, ... }`；
  - 用于 Pattern Studio / Galaxy 中进行注册、配置与运行。

- **Tag-only Pattern**：
  - Pattern 中只定义服务契约（Tag + interface），不提供默认实现；
  - 实现由消费方在场景或 RuntimeLayer 中通过 `Effect.provideService` / `Layer.succeed` 注入；
  - 典型例子：Notification Pattern、Confirm Pattern。

## 3.2 IntentRule（意图规则）

- **IntentRule**：平台侧对 Logic Intent 的中间表示（IR），用于可视化与 Codegen。
  - 描述「源 (Source) → 策略管道 (Pipeline) → 终点 (Sink)」的链路：
    - Source：来自哪个 Module / Service 的状态或动作；
    - Pipeline：防抖、过滤、并发策略等算子；
    - Sink：更新哪个状态、派发哪个动作或调用哪个 Pattern。
  - 不依赖具体实现细节，但可以映射到 Module / Logic / Flow / Pattern 的代码结构。

## 3.3 资产层级（L0–L3）

参考 `docs/ssot/platform/assets/00-assets-and-schemas.md` 的定义，这里只提炼关键含义：

- **L0：业务需求资产**
  - 需求文档、用例描述、PRD 摘要；
  - 形态不限，但应能映射到 IntentSpec。

- **L1：需求意图 / 用例蓝图 (Use Case Blueprint)**
  - 将 L0 自然语言投影到三位一体模型与 IntentRule 集合上；
  - 描述“一个用例”涉及哪些 UI/Logic/Module 节点与粗粒度规则。

- **L2：开发意图资产 (Developer Intent)**
  - Pattern `(input) => Effect`、Logic 模板、Module 模板、IntentRule 集合；
  - 是平台化与复用的主战场：Pattern + IntentRule 是首选平台资产。

- **L3：实现资产 (Implementation)**
  - 具体项目中的代码与配置：Module 实现、Logic 内部细节、UI 代码等；
  - 更贴近单一项目，可以反向提炼为 L2 资产。
