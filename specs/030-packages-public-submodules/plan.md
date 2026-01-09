# Implementation Plan: Packages 对外子模块裁决与结构治理

**Branch**: `[030-packages-public-submodules]` | **Date**: 2025-12-24 | **Spec**: `specs/030-packages-public-submodules/spec.md`  
**Input**: Feature specification from `specs/030-packages-public-submodules/spec.md`

## Summary

本特性收敛 `packages/*` 的对外边界（Public Submodules）与目录治理规则：

- 产出单一事实源：每个包的对外概念/子模块清单（含允许的子路径入口与例外登记）。
- 统一结构：`src/index.ts(x)` 作为 barrel；对外概念以 PascalCase 子模块文件收敛；非概念实现下沉 `src/internal/**`。
- 收紧导出面：避免 `exports` 通配导致“临时文件变 public”，并提供可验证的质量门防回归。
- 测试结构对齐：对标 effect，把 `test/` 组织成“概念地图”的镜像，减少并行冲突并提升可维护性。
- 对标 effect：以“概念 = 模块文件 + internal 屏蔽”为核心，通过结构治理让 `package.json#exports`（含通配导出）保持安全且低维护成本。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM）  
**Primary Dependencies**: pnpm workspace；`effect` v3；`@logixjs/*`（含 core/react/form/query/sandbox/test 等）  
**Storage**: N/A（治理与结构收敛特性，不引入持久化）  
**Testing**: Vitest（`vitest run`）；Effect-heavy 用例使用 `@effect/vitest`  
**Target Platform**: Node.js 20+；现代浏览器（涉及 `@logixjs/react` / `@logixjs/sandbox`）  
**Project Type**: monorepo（`packages/*` + `examples/*` + `apps/docs/*`）  
**Performance Goals**: 本特性不引入新的运行时语义；对 `@logixjs/core` 的改动若仅为文件移动/重命名/导出面收口，则不要求新增性能基线；若触及核心热路径逻辑，则必须补齐可复现基线并证明无回归，同时在 Constitution Check 中补齐确定性标识/事务边界/内部契约（Runtime Services）相关的回归验收口径与证据。  
**Constraints**: 维持“性能与可诊断性优先、拒绝向后兼容”的宪法约束；保持 deterministic identity 与事务窗口边界不被结构治理改动破坏。  
**Scale/Scope**: 覆盖 `packages/*` 全量子包；同时需要同步更新仓库内示例/文档/脚手架的推荐 import 形态。
**Reference Baseline**: effect 仓库（本地 clone：`/Users/yoyo/Documents/code/community/effect`）的目录结构、exports 策略与 Tag 模式（用于对标与借鉴）。  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (PASS)

- `Intent → Flow/Logix → Code → Runtime` 链路映射：本特性主要作用在 **Code/Runtime 的对外边界**（概念入口、导出面、internal 边界），用于防止概念漂移与内部泄漏，从而支撑上层 Intent/Flow 的稳定映射与可解释性。
- docs-first & SSoT：对外概念裁决与规则必须先以文档（`specs/030.../contracts/*`）固化，再落地到 `packages/*` 代码与 `package.json#exports`。
- Effect/Logix 契约：不引入新的 runtime 语义；但会产生 **public import 形态的 breaking change**（属于对外契约），必须提供迁移说明并同步更新示例/文档。
- IR & anchors：不涉及 unified minimal IR / anchors 变更（PASS）。
- Deterministic identity：不涉及 instance/txn/op 标识模型变更（PASS）。
- Transaction boundary：不引入事务窗口内 IO；结构治理不得引入写逃逸口（PASS）。
- Internal contracts & trial runs：不新增隐式协作协议；通过“internal 边界 + 显式子路径入口”降低魔法字段依赖风险（PASS）。
- Performance budget：不触及热路径逻辑则不需要新基线；若触及则按宪法补齐基线与证据（PASS with guardrail）。
- Diagnosability：不改变诊断事件协议；但必须确保“概念入口命名”与 Devtools/诊断链路术语一致（PASS）。
- User-facing performance mental model：本特性主要影响 import/结构，不改变运行时性能模型（PASS）。
- Breaking changes：允许且预期；以迁移说明替代兼容层（PASS）。
- Public submodules：本特性即为该约束的全仓治理与落地（PASS）。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`；新增“public submodules 验证门”用于防回归（PASS）。

### Post-Design Re-check (PASS)

- 设计产物（research/data-model/contracts/quickstart）已覆盖：术语定义、对外概念裁决、exports 策略、回归门与迁移策略；无新增未裁决风险点。

## Project Structure

### Documentation (this feature)

```text
specs/030-packages-public-submodules/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-submodules.md
│   ├── exports-policy.md
│   ├── internal-structure.md
│   ├── test-structure.md
│   ├── collaboration-protocol.md
│   ├── promotion-to-package.md
│   ├── gap-report.md
│   └── migration.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/
  domain/
  form/
  i18n/
  logix-core/
  logix-react/
  logix-devtools-react/
  logix-sandbox/
  logix-test/
  query/

examples/
apps/docs/
```

**Structure Decision**: 本特性会在不改变运行时语义的前提下，统一 `packages/*` 的“对外概念入口”形态与 internal 边界；变更以“按包分阶段推进 + 同步更新示例/文档 + 迁移说明”交付。
