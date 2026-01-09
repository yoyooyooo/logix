# Migration: Packages 对外子模块与导出面收口

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

## 1) 迁移原则

- **允许 breaking**：本仓拒绝向后兼容；以迁移说明替代兼容层。
- **同步更新调用方**：每一轮包级迁移必须同步更新 `examples/*`、`apps/docs/*` 与仓库内脚手架的 import 形态。
- **每包可独立交付**：按包切片推进（domain/infra/adapter/tooling），避免全仓一次性大爆炸。

## 1.1 稳定词汇表（≤5 个关键词）

> 用于 `apps/docs` / examples / 迁移说明统一口径（避免同义词漂移）。

1. **Public Submodule**：包对外稳定概念入口（`@logixjs/pkg/<Concept>` 形态或 `.` barrel 聚合）。
2. **Internal**：不可作为推荐依赖的实现代码（默认 `src/internal/**`，通过 exports-policy 屏蔽）。
3. **Independent Entry Point**：独立子路径入口（subpath export，例如 `@logixjs/form/react`、`@logixjs/sandbox/vite`），视为独立契约管理。
4. **Exports Policy**：`package.json#exports` 的收口策略（含通配导出前置不变量与 `./internal/*: null` 屏蔽）。
5. **Verify Gate**：可执行质量门（`verify:public-submodules`），用于阻止结构/导出面回归。

## 2) 推荐推进顺序（高层）

1. Domain packages（`@logixjs/form` / `@logixjs/query` / `@logixjs/i18n` / `@logixjs/domain`）：
   - 最容易出现“通配导出 + 临时文件 public”风险；
   - 同时也是业务侧最频繁 import 的入口，收口收益最大。
2. Infra packages（`@logixjs/sandbox` / `@logixjs/test`）：
   - 需要强 internal 边界（worker/compiler/runtime harness 等实现细节）。
3. Adapter/Tooling（`@logixjs/react` / `@logixjs/devtools-react`）：
   - 容易把实现目录固化为 API（hooks/components/ui/state），需要最小对外表面积。
4. Core（`@logixjs/core`）：
   - 现状相对稳定，但需要与“全仓治理规则”对齐，并确保 exports 策略一致。

> 逐包差异（A/B/C 分类、现状证据、目标形态）以 `contracts/gap-report.md` 为准；迁移执行时应优先消除 C 类泄漏，再补齐 B 类一致性。

> 当某个概念增长到需要剥离为独立包时，按 `contracts/promotion-to-package.md` 的提升路径执行，并在本文件追加对应迁移段落（不保留兼容层）。

## 3) 每包迁移的最小验收

- 目录结构满足 `contracts/public-submodules.md` 的通用规则。
- `package.json#exports` 满足 `contracts/exports-policy.md`（显式导出、internal 屏蔽、无空壳入口）。
- 仓库内调用方（examples/docs/scripts）已迁移到新入口。
- 通过质量门：`pnpm typecheck` / `pnpm lint` / `pnpm test` + “public submodules 验证门”。

## 3.1 每包最小验收清单 + 风险提示（交接口径）

| Package | 最小验收清单（每包必须全部满足） | 主要风险/注意事项 |
|--------|----------------------------------|-------------------|
| `@logixjs/form` | 入口重命名为 PascalCase；`src/` 根目录只保留概念入口+白名单；`./react` 入口保留且非空壳；`./*` + `./internal/*: null` 通过 gate；更新 docs/examples 全量 import | 现状 C 类泄漏（`form.impl.ts` 等会成为事实 public）；改动影响面大（大量 import/类型名）；迁移必须伴随调用方同步更新 |
| `@logixjs/query` | 删除 `@logixjs/query/react` 空壳；新增 `TanStack` 概念入口；`typecheck.ts` 移出 `src/` 根目录；`./*` + internal 屏蔽通过 gate；更新 docs/examples | 现状 C 类泄漏 + 空壳入口；TanStack/engine 迁移易引发循环依赖或类型漂移，优先跑 `pnpm typecheck:test` |
| `@logixjs/i18n` | 拆分 `index.ts` 为 `I18n/I18nModule/Token` 概念入口；实现下沉 `src/internal/**`；exports 与 gate 通过；更新调用方 import | 现状入口与实现耦合，拆分时需谨慎保持运行时语义与 Tag key 稳定；容易遗漏 barrel 导出导致 API 断裂 |
| `@logixjs/domain` | `crud.ts -> Crud.ts`；CRUD 实现聚拢 internal；exports 与 gate 通过；更新调用方 import | 影响面中等（demos/examples）；注意不要把 demos 目录当作 public surface（不应出现在 exports） |
| `@logixjs/sandbox` | 概念入口 PascalCase（Client/Service/Protocol/Types/Vite）；保留 `@logixjs/sandbox/vite` 且非空壳；exports/publishConfig.exports 对齐；internal 屏蔽与 gate 通过 | 涉及 Worker/kernel 资源与 Vite 插件入口；必须保持 `test/browser/**` 结构不被破坏；避免把静态资源路径变成事实 API |
| `@logixjs/test` | 建立 `TestRuntime/TestProgram/Execution/Assertions/Vitest` 概念入口；exports 对齐并通过 gate；更新各包测试用例 import | 现状大量实现目录暴露在 `src/**`；迁移时容易引发测试循环依赖，按 “test structure 对齐” 任务同步迁移更安全 |
| `@logixjs/react` | 新增 `RuntimeProvider/Hooks/Platform/ReactPlatform` 概念入口；`components/hooks/platform` 下沉 internal；exports/publishConfig.exports 对齐；通过 gate；更新 docs/examples | 现状 C 类泄漏（实现目录被当作 API）；React 组件/Hook 迁移影响面极大，必须同步更新所有示例与 docs import 形态 |
| `@logixjs/devtools-react` | 新增 `LogixDevtools/DevtoolsLayer/StateTraitGraphView` 概念入口；UI/state/theme/snapshot 下沉 internal；exports/publishConfig.exports 对齐；通过 gate | 现状 C 类泄漏（`./*` 直接暴露 `.tsx` 实现文件）；需确保 `theme.css` 等资源不成为 subpath importable |
| `@logixjs/core` | （若改动）仅做结构/导出面一致性；保证 internal 分层铁律不被破坏；publishConfig.exports 一致；通过 gate | 任何触及 runtime 核心逻辑都必须补齐 perf evidence 与诊断影响说明；优先做 move/rename/exports 对齐，避免语义改动 |

## 4) 逐包步骤清单（引用 Gap Report，并给出每步验收）

> 逐包差异（A/B/C 分类、现状证据、目标形态）以 `contracts/gap-report.md` 为准。执行时优先消除 C 类泄漏，再补齐 B 类一致性。

### `@logixjs/form`（Gap: C）

1. 收敛 Public Submodules 入口（PascalCase）并更新引用
   - 旧 → 新：`@logixjs/form/form` → `@logixjs/form/Form`（`rule/error/trait/path/...` 同理）
   - 验收：`pnpm -C packages/logix-form typecheck:test`
2. 下沉实现并按 internal 分区收敛（避免 `./*` 把实现变 public）
   - 禁止：`@logixjs/form/validators`、`@logixjs/form/types`、`@logixjs/form/form.impl` 等“实现直通车”
   - 验收：`pnpm verify:public-submodules`
3. 对齐 exports-policy（保留 `./react`；屏蔽 `./internal/*`）
   - 验收：`pnpm verify:public-submodules`
4. 同步调用方（docs/examples）到新入口与大小写
   - 验收：`pnpm typecheck`

### `@logixjs/query`（Gap: C）

1. 删除空壳入口并收敛概念入口命名
   - 旧 → 新：`@logixjs/query/query` → `@logixjs/query/Query`（`engine/middleware/traits` 同理）
   - 删除：`@logixjs/query/react`（不再提供）
   - 验收：`pnpm -C packages/logix-query typecheck:test`
2. 下沉实现并消除“通配导出泄漏”
   - 禁止：`@logixjs/query/typecheck`（迁出 `src/` 根目录，作为测试/开发辅助）
   - 验收：`pnpm verify:public-submodules`
3. 引擎适配入口统一为 `TanStack`
   - 新增：`@logixjs/query/TanStack`
   - 验收：`pnpm -C packages/logix-query test`

### `@logixjs/i18n`（Gap: B）

1. 拆分单文件入口为概念入口（I18n/I18nModule/Token）
   - 旧 → 新：`@logixjs/i18n/token` → `@logixjs/i18n/Token`（如有）
   - 验收：`pnpm -C packages/i18n typecheck:test`
2. 实现下沉 internal，并保持对外入口稳定
   - 禁止：`@logixjs/i18n/internal/*`
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/domain`（Gap: B）

1. 入口大小写收敛为 `Crud`
   - 旧 → 新：`@logixjs/domain/crud` → `@logixjs/domain/Crud`
   - 验收：`pnpm -C packages/domain typecheck:test`
2. CRUD 实现聚拢 internal（对外只暴露稳定契约）
   - 禁止：`@logixjs/domain/internal/*`
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/sandbox`（Gap: B）

1. 概念入口 PascalCase（Client/Service/Protocol/Types/Vite）
   - 旧 → 新：`@logixjs/sandbox/client` → `@logixjs/sandbox/Client`（同理：`service/protocol/types/vite`）
   - 保留：`@logixjs/sandbox/vite`（Independent Entry Point）
   - 验收：`pnpm -C packages/logix-sandbox typecheck:test`
2. 收敛 internal 边界（compiler/worker/kernel 不得成为入口）
   - 禁止：`@logixjs/sandbox/internal/*`
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/test`（Gap: B）

1. 建立概念入口（TestProgram/TestRuntime/Execution/Assertions/Vitest）
   - 旧 → 新：`@logixjs/test/vitest` → `@logixjs/test/Vitest`（同理：`execution/test-runtime/...`）
   - 验收：`pnpm -C packages/logix-test exec vitest run`
2. exports 对齐并屏蔽 internal
   - 禁止：`@logixjs/test/internal/*`
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/react`（Gap: C）

1. 新增概念入口并收口实现目录
   - 旧 → 新：`@logixjs/react/hooks` → `@logixjs/react/Hooks`（或从 `@logixjs/react` 包根导入）
   - 禁止：`@logixjs/react/internal/*`
   - 验收：`pnpm -C packages/logix-react typecheck:test`
2. 对齐 exports-policy（允许 `./*` 的前提是 `src/` 根目录只放概念入口）
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/devtools-react`（Gap: C）

1. 收敛对外入口为概念模块（LogixDevtools/DevtoolsLayer/StateTraitGraphView）
   - 禁止：依赖任意未裁决子路径入口（例如 `@logixjs/devtools-react/DevtoolsHooks` 一类）
   - 验收：`pnpm -C packages/logix-devtools-react typecheck:test`
2. 对齐 exports-policy 并确保资源不被当作入口
   - 禁止：`@logixjs/devtools-react/internal/*`
   - 验收：`pnpm verify:public-submodules`

### `@logixjs/core`（Gap: A）

1. 仅做结构/导出面一致性对齐（避免触及运行语义）
   - 关注：清理历史占位/过时导出，避免出现“子域 exports 变成事实 API”
   - 验收：`pnpm -C packages/logix-core typecheck:test`

## 5) 迁移说明模板（建议）

对每个包的 breaking change，提供最小迁移说明，至少包含：

- 旧 import 形态 → 新 import 形态（按概念入口说明，而非逐文件 list）
- 被移入 internal 的能力（如仍需要，给出替代入口或明确禁止）
- 子路径入口的新增/删除（例如 `@logixjs/query/react` 是否保留）
