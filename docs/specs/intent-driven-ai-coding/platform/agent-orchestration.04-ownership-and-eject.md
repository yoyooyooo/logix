# 4. 所有权与 Eject 协议：`@agent-generated`

为避免 Agent 和人类“抢地盘”，需要对 `@agent-generated` 代码块的主权做清晰约定。

## 4.1 状态机（简化版）

以单个 Fluent 规则为粒度，可以抽象出三种状态：

1. **Agent 控制（Agent-owned）**
   - 代码块带有 `@agent-generated` 标记，且仍然是合法的 Fluent 链：
    `yield* $.onState(...).debounce(300).runLatest(Effect.gen(...))`。
   - 视为由 Agent 负责维护的受控区域：平台允许 Agent 在其上做结构化修改（调整 debounce 时间、切换并发模式等）。

2. **人类微调但仍在白盒子集内（Co-owned）**
   - 人类对 `@agent-generated` 区域进行了修改，但 Parser 仍能识别为合法 Fluent 链。
   - 行为：
     - `@agent-generated` 标记保留；
     - 后续 Agent 修改必须以**当前 AST** 为唯一事实源，不得凭历史快照覆盖人类修改；
     - 允许 Agent 在链条结构不变的前提下做增量修改（如调整参数、填充 handler 内部逻辑）。

3. **已被 Eject 的 Raw Block（Ejected）**
   - 任一条件满足时视为已 Eject：
     - Fluent 链被拆成变量 / 动态组合，Parser 无法还原 R-S-T 结构；
     - 行内混入大量裸 `if/else` / `try/catch` / 任意控制结构，失去可视化边界；
     - 开发者显式移除 `@agent-generated` 注释。
   - 行为：
     - 平台在解析时自动移除 `@agent-generated` 标记，并将该段视为 Raw Block；
     - Agent 不再对该区域做“结构化维护”，只能给出**非强制性的建议**（例如评论/重构建议），不得静默覆盖整段实现。

## 4.2 Agent 行为约束

从 Agent 侧看，必须遵守的底线：

- 不得在用户未明确同意的情况下，重写已 Eject 的 Raw Block；
- 在 Co-owned 区域，只能基于当前代码做增量修改，禁止用“重写整个函数”的方式覆盖人类逻辑；
- 如发现 Fluent 链已经脱离白盒子集，应主动提醒“此规则已 Eject，无法再进行结构化编辑”，并建议用户恢复 Fluent 写法或接受 Raw 模式。
