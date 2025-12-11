# Implementation Plan: 实现 `@logix/data` 字段能力核心包

**Branch**: `[001-implement-logix-data]` | **Date**: 2025-12-09 | **Spec**: `/specs/001-implement-logix-data/spec.md`
**Input**: Feature specification from `/specs/001-implement-logix-data/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本特性要实现 `@logix/data` 这一字段能力核心包，作为 Logix v3 中 State Graph / Field Capabilities 的统一宿主，为模块状态中的字段提供 Raw / Computed / Source / Link 等能力，并对平台与 DevTools 暴露一致的字段能力元信息与状态图结构。  

技术上，`@logix/data` 只依赖 Logix Runtime 核心与 `effect` v3，不直接依赖 React/Router 等上层框架；通过 Schema 层的元信息（CapabilityMeta）+ Logic 层的 Helper/Flow，将计算字段、资源字段和跨模块联动统一建模为字段能力，并支持在嵌套对象与动态列表项上应用这些能力，同时为未来的 ResourceField 抽象（query/socket/AI 等）预留统一的数据平面。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x（ESM 输出，面向 Node.js 20+ 与现代浏览器）  
**Primary Dependencies**: `effect` v3、Logix Runtime 核心（`@logix/core` / `docs/specs/runtime-logix` 契约）  
**Storage**: N/A（仅管理内存中的模块状态与字段能力，不直接接入外部存储）  
**Testing**: Vitest + TypeScript 类型检查（`pnpm test`、`pnpm typecheck:test`）  
**Target Platform**: Logix Runtime 下运行的 TypeScript 库，可在 Node.js 与浏览器环境中被业务应用和平台工具共同使用  
**Project Type**: single-library（monorepo 子包）  
**Performance Goals**: 在典型 ToB 模块（20–200 个字段、包含多个动态列表）的高频交互场景下，字段能力引入的计算与联动开销不成为前端性能瓶颈，单次用户输入触发的相关更新应在一个渲染帧内完成（约 16ms 级别）。  
**Constraints**: 不引入 React/Router/Query 等上层依赖；保持纯数据/字段能力抽象，与 runtime-logix 契约对齐；支持高频输入、动态列表频繁增删改且无明显抖动；为 ResourceField 统一数据平面保留扩展点。  
**Scale/Scope**: 面向典型企业应用内 10–50 个模块、每模块 20–200 个字段（含多个动态列表）的规模，优先保证在该量级下的可维护性、可视化与可回放性。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- 当前 `.specify/memory/constitution.md` 仍为模板占位，尚未定义具体的强制原则或质量门槛；本计划默认以仓库 AGENTS.md 中的约束为事实源：  
  - 文档先行（先在 `docs/specs` / `specs` 中收敛契约，再落代码）；  
  - Effect-TS 使用规范（泛型顺序 A/E/R，Tag + Layer 注入等）；  
  - 大改动需通过 `pnpm typecheck`、`pnpm lint`、`pnpm test` 作为基本 gate。  
- 本特性遵循上述约束设计 `@logix/data`，不额外增加跨进程通信、远程服务等复杂度，也不修改现有 Runtime 核心契约。  

结论：当前计划未发现对“仓库约定/暗含宪法”的明显违背，可通过本 GATE 进入 Phase 0/1；Phase 1 结束后再根据实际设计重新自检一次。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
packages/
├── logix-core/              # 现有 Runtime 核心实现（只读，供 @logix/data 复用）
├── logix-react/             # React 适配层（本特性不直接依赖）
└── logix-data/              # 本特性新增/演进子包
    ├── src/
    │   ├── index.ts         # 对外入口，导出 Computed / Source / Link 命名空间
    │   ├── computed/        # Computed 字段能力相关实现与 Schema 帮助方法
    │   ├── source/          # Source / ResourceField 能力与资源类型元信息
    │   ├── link/            # 跨字段 / 跨模块联动相关能力
    │   └── internal/        # 仅供包内复用的实现细节（State Graph 构建等）
    └── test/
        ├── computed.test.ts
        ├── source.test.ts
        └── link.test.ts

docs/
└── specs/
    ├── runtime-logix/       # Runtime 契约与 Module/Flow API 规范（只读）
    └── drafts/
        └── topics/
            ├── state-graph-and-capabilities/
            └── reactive-and-linkage/   # 本特性依赖的场景与模式说明
```

**Structure Decision**:  
在现有 monorepo 基础上，新建/完善 `packages/logix-data` 子包，采用标准的 `src/` + `test/` 结构，并通过 `computed/`、`source/`、`link/` 子目录划分字段能力类型；所有实现以 `docs/specs/runtime-logix` 与 drafts Topic 为契约上游，避免反向依赖 UI/React 层。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
