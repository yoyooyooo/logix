# Agent Skills Index

> **Status**: Living Document
> **Context**: `.agent/skills`

This directory contains specialized **Skills** that extend the Agent's capabilities. Each skill is a self-contained package with instructions, workflows, and resources.

## Available Skills

| Skill Name | Description |
| :--- | :--- |
| **[component-consumer](./component-consumer/SKILL.md)** | 当业务团队需要在本地或 CI 中使用 IMD 组件库，并基于业务模块提炼可复用资产时使用。 |
| **[drafts-tiered-system](./drafts-tiered-system/SKILL.md)** | Manages the tiered L1–L9 draft system rooted at `docs/specs/drafts`, including placing, refining, and promoting drafts. |
| **[project-guide](./project-guide/SKILL.md)** | 当在 intent-flow 仓库内进行架构设计、v3 Intent/Runtime/平台规划演进、典型场景 PoC 或日常功能开发时，提供项目导航与施工流程。 |
| **[research-analyze-plan](./research-analyze-plan/SKILL.md)** | Guides the "Research -> Analyze -> Decide -> Plan" workflow for comprehensive decision-making and strategic planning. |
| **[skill-creator](./skill-creator/SKILL.md)** | Guide for creating effective skills. Use this when you want to create a new skill or update an existing one. |
| **[ts-type-debug](./ts-type-debug/SKILL.md)** | Inspects or debugs TypeScript types in a local project, especially for Effect's inferred types or complex generics. |
| **[unit-creator](./unit-creator/SKILL.md)** | 使用内置模板快速生成 IMD 新「单元」（UI 组件、业务 Block、Hook、lib 模块、模板片段）的标准骨架。 |

## Usage

To use a skill, simply invoke it by name or context. For example:

*   "Create a new skill for..." -> Triggers `skill-creator`
*   "Research the best practice for..." -> Triggers `research-analyze-plan`
*   "Create a new component..." -> Triggers `unit-creator`

## Contribution

To add a new skill:
1.  Run the `skill-creator` workflow.
2.  Create a new directory in `.agent/skills/<skill-name>`.
3.  Add a `SKILL.md` with the required metadata.
4.  Update this `README.md` to include the new skill.
