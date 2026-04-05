# SDD/AI 工件链路工具：Spec Kit / Kiro / Tessl

目标：补齐 “workflow/spec 工件驱动” 这条赛道的代表玩家，并提炼其工件形态、强项与缺口。

## 1) GitHub Spec Kit（开源工作流工具包）

定位：agent-agnostic 的 SDD scaffolding（模板 + CLI + constitution），把 `Specify → Plan → Tasks → Implement` 这条链路产品化。

可追溯入口：

- 仓库：https://github.com/github/spec-kit
- 方法论文档：`spec-driven.md`  
  https://github.com/github/spec-kit/blob/main/spec-driven.md

关键特征（与 intent-flow 对齐点）：

- `constitution.md` 把“全局不可妥协原则”显式化（类似组织级约束注入）。
- 工件多为 Markdown，强调阶段化 gate（每阶段先 review/确认，再进入下一阶段）。

典型缺口：

- 验证更多依赖“生成的测试/工程质量门”，缺少统一的“运行时可回放语义 + trace 解释”锚点（这正是 intent-flow 的差异化空间）。

## 2) Kiro（AWS 的 Spec-Driven Agentic IDE）

定位：把 spec-driven workflow 内建到 IDE（“requirements → design → tasks → implementation”，并配合 hooks/steering）。

可追溯入口：

- 官网：https://kiro.dev/
- 定价与“spec request / vibe request”区分（体现其把“任务执行”当作计费与工作流单元的产品假设）：  
  https://kiro.dev/blog/understanding-kiro-pricing-specs-vibes-usage-tracking/

关键特征（可抽象成产品形态）：

- 工件更“少而硬”（相比 spec-kit 生成大量文件的风格，Kiro更强调三段式文件/任务列表）。
- hooks/steering 将“自动化守卫”做成 IDE 内生能力（触发器驱动的 agent 行为）。

典型缺口：

- 虽然强调“保持与 spec 同步”，但市场资料里对“统一 IR/Trace 作为裁决点”仍不突出；更多是 workflow 产物与代码对齐。

## 3) Tessl（Spec Registry + Framework：把“agent context/spec”当依赖分发）

定位：不是“写 spec 的 IDE”，而是把“agent 需要的上下文/规则/用法”包装成可安装、可复用、可版本化的 spec（tiles/registry），并用 framework 驱动 spec-first + 测试护栏。

可追溯入口：

- Docs（What is Tessl）：https://docs.tessl.io/
- 产品发布（Framework + Spec Registry）：  
  https://tessl.io/blog/announcing-tessls-products-to-unlock-the-power-of-agents/
- SDD 概念分层讨论（外部）：  
  https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html

关键特征（与 intent-flow 的“Context Supply Chain”强相关）：

- “context/spec 作为可分发依赖”这件事，很像把组织知识/规范做成包管理系统。
- 其“可靠性论点”与 intent-flow 的主张一致：不可靠的 agent 本质是缺少高信噪比的可执行/可验证上下文。

典型缺口（与 intent-flow 的互补）：

- Tessl 的重点在“把上下文做成可安装资产”，而 intent-flow 侧可以更聚焦“运行时 IR/Trace 的对齐与裁决”。

## 4) 小结：这一赛道的共性与可复用模式

共性（你可以当成“产品骨架”来复用）：

- `Artifacts`：spec/plan/tasks/constitution（+ hooks/steering + tests）
- `Gates`：阶段化人工确认（HITL）+ 自动化质量门
- `Value`：降低 agent drift、降低 review 成本、复用组织知识

空白（对 intent-flow 最关键）：

- 多数工具停在“工件链路与工程门禁”，缺少一个跨域统一的裁决锚点（例如 `IR + Trace`）来把“行为/流程兼容性”产品化。

