

# Agent Context for `intent-flow`

- 仓库定位：意图驱动 + Effect 运行时 PoC 实验场，用于在平台化之前把 **Intent 模型 / Flow DSL / effect 运行时 / ToB 典型场景** 练透。  
- 上游依赖（只读）：  
  - IMD 组件库：`/Users/yoyo/projj/git.imile.com/ux/imd`（UI/Pro Pattern 与 registry）；  
  - best-practice 仓库：`/Users/yoyo/projj/git.imile.com/ux/best-practice`（文件/状态/服务层规范与代码片段）。  
- 本仓库结构：  
  - `docs/specs/intent-driven-ai-coding/v1`：早期方案与 PoC；  
  - `docs/specs/intent-driven-ai-coding/v2`：当前主线（六层 Intent 模型 + schema + UX + effect-runtime 设计）；  
  - `docs/specs/intent-driven-ai-coding/v2/effect-poc`：概念级场景 PoC（简化版 Effect + Env/Flow 草图）；  
  - `packages/effect-runtime-poc`：真实依赖 `effect` 的运行时子包，按场景拆分 Env/Flow。  
- 关键设计原则：  
  - Intent 只表达业务/交互/信息结构的 **What**，不写组件/API/文件级 **How**；  
  - Flow/Effect 层负责“步骤链 + 服务调用 + 质量约束”，领域算法细节保留在自定义服务实现里；  
  - 平台 UI/CLI/Studio 是未来消费者，本仓库优先保证运行时契约与典型场景写法清晰可用。

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>component-consumer</name>
<description>当业务团队需要在本地或 CI 中使用 IMD 组件库，并基于业务模块提炼可复用资产时 MUST 加载本 skill。</description>
<location>project</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>project</location>
</skill>

<skill>
<name>unit-creator</name>
<description>使用内置模板快速生成 IMD 新「单元」（UI 组件、业务 Block、Hook、lib 模块、模板片段）的标准骨架（源码、示例、文档）；用于在 apps/www2/registry/default 下新增单元并遵循项目命名与目录约定。</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
