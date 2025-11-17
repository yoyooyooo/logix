# Research: Packages 对外子模块裁决与结构治理

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-24  
**Spec**: `specs/030-packages-public-submodules/spec.md`

## 结论摘要

本特性不追求“兼容现状”，而是以“概念稳定 + 导出面可预测 + internal 可自由重构”为第一目标：

- 对外概念必须收敛为少量稳定入口（Public Submodules / 子路径入口），并在文档中明确裁决。
- 任何不属于对外概念的实现细节必须下沉到 `src/internal/**` 并由导出面屏蔽。
- `package.json#exports` 的安全性取决于 **结构治理是否到位**：可以采用 effect 风格的通配导出（`./* -> ./src/*.ts`）来降低维护成本，但必须以“`src/` 根目录只承载 public submodules”作为前置不变量，并用回归门保证不被破坏。
- 必须引入可验证的回归门（脚本或等价机制）阻止结构漂移复发。

## Inputs（约束来源）

- `specs/030-packages-public-submodules/spec.md`
- `.specify/memory/constitution.md`（“packages 子包对外子模块（Public Submodules）”约束、拒绝向后兼容）
- 现有 `packages/*` 的导出面（`src/index.ts(x)` + `package.json#exports`）与示例/文档中的 import 形态
- 对标仓库（effect，本地 clone）：`/Users/yoyo/Documents/code/community/effect`
  - `packages/effect/package.json`：`exports` 采用 `./* -> ./src/*.ts` + `./internal/*: null`
  - `packages/effect/src/*`：`src/` 根目录几乎全为 PascalCase 概念模块文件 + `index.ts` + `internal/`
  - `packages/platform/src/*`：大量 `class X extends Context.Tag(...)`（Tag 作为 value，同时可与 namespace 合并承载类型/构造器）

## Decisions

### D1. 裁决清单与规则的单一事实源

**Decision**: 以 `specs/030-packages-public-submodules/contracts/public-submodules.md` 作为本特性期间的裁决清单与规则 SSoT，并在实现落地时同步更新示例/文档；不再维护额外的 impl-note 底稿文件以避免“并行真相源”。

**Rationale**: 规则与裁决属于对外契约，必须可追溯、可验收、可交接；散落在 impl-note 会失去质量门与工作流约束。

**Alternatives considered**:
- 把裁决清单放到 `docs/impl-notes/*`：会与 SSoT 优先级冲突，且更新半衰期不可控。
- 只写在 README/口头约定：无法形成可验证的质量门。

### D2. Public Submodule 与 internal 的边界规则

**Decision**: Public Submodule 必须是“概念级入口”，并满足：

- 概念入口位于 `src/` 根目录（`src/index.ts(x)` 除外），文件名为 PascalCase。
- 非概念实现下沉 `src/internal/**`，不得作为推荐 import 入口。
- 子路径入口（如 `@logix/form/react`、`@logix/sandbox/vite`）必须被视为独立对外契约：需要命名、职责、准入条件与例外登记；不得保留空壳入口。

**Rationale**: 目录结构本质是 public surface 的一部分；对外概念收敛后，internal 才能自由重构且不牵动用户代码。

**Alternatives considered**:
- 继续允许 `src/hooks/**`、`src/components/**` 等作为事实 public：会把实现目录固化为 API，阻碍演进。
- 将 internal 通过 deep import 暴露给“高级用户”：会形成不可控依赖与调试/回放语义漂移。

### D3. Exports 策略（对标 effect：通配导出 + 结构治理；必要时显式）

**Decision**: 默认采用 **effect 风格** 的 exports 策略，以降低维护成本并强化“概念即模块”：

- 允许 `./* -> ./src/*.ts`（或 `./src/*.tsx`）这类通配导出，但前提是：
  - `src/` 根目录只包含 Public Submodules（PascalCase 文件）+ 白名单文件（`index.ts(x)`、`global.d.ts`）+ `internal/`；
  - internal 通过 `./internal/*: null` 被屏蔽；
  - 由仓库级回归门持续验证（否则通配导出会把临时文件变成事实 public）。
- 对于不适合通配的包（例如需要保留非 PascalCase 文件、或希望只暴露 `.` 单入口），允许采用“显式导出表”作为例外，但必须登记原因与退出计划。

**Rationale**: effect 的实践表明：通配导出并非原罪，**问题在于结构治理缺失**。当 `src/` 根目录被严格限制为“概念模块文件”，通配导出可以反过来成为“强约束”：任何非概念文件一旦落在根目录就会立刻触发质量门失败。

**Alternatives considered**:
- 永久只用显式导出：更安全但维护成本高，且会诱导“入口清单与目录结构”漂移（需要额外工具保持一致）。

### D4. 回归门（质量门）策略

**Decision**: 增加仓库级验证门（脚本或等价机制），在 CI/本地质量门中检查：

- `packages/*/src` 根目录是否只包含允许的 public submodule 文件（PascalCase）与少量白名单文件（`index.ts(x)`、`global.d.ts` 等）。
- 各包 `package.json#exports` 是否满足 `contracts/exports-policy.md`（通配导出需满足根目录治理不变量；internal 必须屏蔽；子路径入口不得空壳）。
- （可选）仓库内 import 是否绕过边界（例如试图引用 `*/src/internal/**`）。

**Rationale**: 没有自动化回归门，治理会在下一轮迭代迅速漂移。

### D5. 对外模块的“命名空间导出”风格（对标 effect）

**Decision**: 对支持 `import * as Pkg from "@logix/xxx"` 的包（core/domain/infra），`src/index.ts` 采用 effect 风格的“命名空间导出”组织对外概念：

- 以 Public Submodule 为单位导出：`export * as Runtime from "./Runtime.js"` 这类形态；
- 避免把 `src/internal/**` 或实现目录（`hooks/**`、`components/**` 等）作为直接导出源；如需对外暴露能力，先收敛成概念入口（Public Submodule）再导出。

**Rationale**: “概念 = 子模块 = 命名空间”能显著降低 import 心智成本，并让 Devtools/诊断术语与代码入口形成稳定映射。

### D6. Tag 作为 value + 命名空间（对标 effect/platform）

**Decision**: 对外暴露的可注入契约（Runtime Services / Platform Services）优先采用 effect/platform 的 Tag 模式：

- `export class X extends Context.Tag("...")<X, X.Service>() {}` 作为 **value-level** Tag；
- `export declare namespace X { export interface Service { ... } }` 或同名 type/namespace 合并承载类型与辅助构造器；
- Tag key 使用稳定字符串（避免随机/时间默认），并与包路径/概念名对齐。

**Rationale**: 该模式同时满足 DIP（依赖注入）、可 mock、可替换与类型可读性，并能把“契约”自然地挂在概念入口上。

## Open Questions

无（本阶段计划产物不引入未裁决项；实现期若发现“概念归属冲突”，按本特性的裁决流程更新 `contracts/public-submodules.md` 与迁移说明）。
