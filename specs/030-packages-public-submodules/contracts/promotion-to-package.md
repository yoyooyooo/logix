# Contract: Promotion Path（子模块 → 独立子包）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 目标：允许今天以“子模块（Public Submodule / subpath）”快速迭代，但不把未来锁死；当规模/依赖/冲突面增长时，可以把某个概念剥离为独立子包，且迁移成本可控（以迁移说明替代兼容层）。

## 1) 什么时候应该提升为独立子包（signals）

出现以下信号时，优先考虑从“子模块”提升为“子包”：

- **依赖重量/可选依赖**：概念引入 React/Vite/esbuild-wasm 等重量依赖，导致主包被迫携带不必要依赖。
- **发布节奏分化**：该概念需要更频繁（或更谨慎）的发布/回滚节奏，与宿主包不同步。
- **冲突热点**：多人经常在同一概念实现上冲突（频繁重构/需求变更），把它变成单独包可以显著降低冲突面。
- **契约足够稳定**：该概念已经有明确的对外 contract（Tag/Layer/API），且可以独立测试与文档化。

## 2) 为“未来可剥离”提前做的结构约束（现在就能降低摩擦）

把每个 Public Submodule 当作“潜在包”（micro-package candidate）来设计：

- **概念入口单文件**：`src/<Concept>.ts(x)` 承载对外 API；实现细节在 internal。
- **实现聚拢**：建议按概念下沉到 `src/internal/<concept>/**`（或同等分区），避免实现散落在包内各处。
- **禁止跨概念 internal 互相 import**：概念之间只能通过各自的 Public Submodule API/Tag/Layer 交互（否则剥离时会撕裂）。
- **subpath 视为 proto-package**：例如 `@logix/form/react`、`@logix/sandbox/vite` 必须有独立契约与边界；其实现也应保持自洽（便于未来搬到独立包）。

这些约束不要求一次到位，但应通过 verify gate 持续逼近（否则“未来可剥离”会沦为空话）。

## 3) ID 与契约的稳定性建议（减少迁移成本）

为了避免剥离时“到处改字符串/类型名”：

- **Tag key / Module id 用稳定字符串**：把它当作“概念身份”而非“文件路径”，允许它与实际落点解耦。
- **对外命名以概念为中心**：Public Submodule 名称（PascalCase）应尽量与文档/Devtools 术语一致，减少迁移时的语义漂移。

> 注意：本仓拒绝向后兼容，但稳定的概念身份仍然能显著降低“无意义 churn”（尤其是诊断/证据字段、Tag key、Module id）。

## 4) 提升步骤（Breaking，但可交接）

当决定把某个概念从子模块提升为独立包时，推荐按以下顺序推进：

1. **更新裁决**：在 `contracts/public-submodules.md` 中把该概念标注为“将提升为独立包”，并更新归属包与推荐 import；必要时更新 `contracts/gap-report.md`。
2. **创建新包**：在 `packages/<new-pkg>/` 建立与治理规则一致的结构（`src/index.ts` + `src/<Concept>.ts` + `src/internal/**` + exports 策略）。
3. **搬迁实现**：把原概念实现移动到新包，并消除对旧包 internal 的依赖（只依赖旧包的 public API/Tag）。
4. **更新调用方**：同步更新 `packages/*`、`examples/*`、`apps/docs/*` 的 import 形态（不保留兼容层）。
5. **写迁移说明**：在 `contracts/migration.md` 追加该概念的迁移段落（旧入口 → 新入口，禁止项与替代写法）。
6. **阶段验收**：通过质量门与 verify gate；确认不存在旧入口残留与 internal 泄漏。

## 5) 常见候选形态（示例，不是裁决）

- `@logix/form/react`：如果 React 生态能力显著膨胀，可考虑独立为 `@logix/form-react`（或等价命名）以隔离 React 依赖与发布节奏。
- `@logix/sandbox/vite`：若 Vite 插件/静态资源管线持续演进，可考虑独立为 `@logix/sandbox-vite`。
- `@logix/core/<SomeConcept>`：当某概念对外契约稳定、但实现迭代频繁且冲突面大时，可考虑提升为独立包（例如 observability/reflection 等方向）。

