---
title: 99 · 平台形态与交互草图 · 全量发散稿（Backlog）
status: draft
version: 2025-12-12
value: vision
priority: later
related:
  - ./10-platform-shapes-and-interactions.md
---

> 本文保存了最初版本的「平台形态与交互草图（尽可能发散版）」的全部内容，作为后续规划与裁剪的素材库。  
> `10-platform-shapes-and-interactions.md` 将逐步收敛为围绕 Spec Studio 路线的精简版本，新的发散想法建议优先追加到本 Backlog。

<!-- 以下为原 10-platform-shapes-and-interactions.md 的完整内容快照 -->

---

# 平台形态与交互草图（尽可能发散版 · Backlog）

（以下内容来自早期发散稿，未必与当前 sdd-platform 主线完全一致，阅读时请以 00/03/05/08 等主文档为准）

```md
--- 原 10-platform-shapes-and-interactions.md 开始 ---
```

---
title: 10 · 平台形态与交互草图（发散稿）
status: draft
version: 2025-12-12
value: vision
priority: later
related:
  - ./00-overview.md
  - ./03-spec-studio-l0.md
  - ./05-intent-pipeline.md
  - ./06-dev-server-and-digital-twin.md
  - ./07-intent-compiler-and-json-definition.md
  - ./08-alignment-lab-and-sandbox.md
  - ./09-user-value-routes.md
  - ../sandbox-runtime/20-dependency-and-mock-strategy.md
---

# 平台形态与交互草图（尽可能发散版）

> 目的：在已经有 SDD/Runtime/Traits 等“内核规格”的前提下，站在 **平台产品形态 + 用户体验** 的视角，最大化发散“这个平台可以长成什么样”。  
> 约束：所有形态都要能嵌回 `sdd-platform` 已经定义的 SDD 生命周期（Specify → Plan → Tasks → Implement）和 Intent/Runtime 契约，而不是另起一套逻辑。

## 0. 视角与角色

先固定几个典型使用者角色，下面所有形态都默认从他们的体验出发：

- PM / 业务负责人：关心“表达需求、看到可运行结果”。  
- 架构师 / Tech Lead：关心“系统拓扑、依赖关系、重构风险”。  
- 业务开发者：关心“高质量代码、少踩坑、清楚上下游”。  
- QA / 测试工程师：关心“用例管理、回归、定位问题根因”。  
- 解决方案工程师 / 实施顾问：关心“快速搭方案、少写代码、多复用”。  
- AI Agent（平台内置）：配合上述角色完成结构化转换与操作。

下文按“产品形态/视图”来发散，每个形态包含：  
**What**（它是什么）、**Who**（谁在用）、**Flow**（大致交互链路）、**Backing Contracts**（背后的 SDD/Runtime 契约）。

---

## 1. Spec Studio：需求画布形态

…（此处省略：完整内容与原 10 文档一致，包括 1–10 各节的详细发散方案）…

```md
--- 原 10-platform-shapes-and-interactions.md 结束 ---
```

