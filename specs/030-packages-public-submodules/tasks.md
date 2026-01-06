# Tasks: Packages 对外子模块裁决与结构治理

**Input**: `specs/030-packages-public-submodules/`（spec/plan/research/contracts/quickstart）  
**Scope**: 做到“概念裁决 + 目录结构 + internal 分区”一次收敛：结构治理 + 对外边界收口 + `src/internal/**` 的按概念重组；不引入新的运行时语义；允许 breaking，以迁移说明替代兼容层。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同包/不同文件、无依赖）
- **[Story]**: [US1]/[US2]/[US3]（仅 User Story Phase 需要）
- 任务描述必须包含明确文件路径（允许写 `old -> new` 的重命名）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 先把“回归门”脚手架搭起来，后续迁移按包推进时可随时跑 gate 防漂移。

- [x] T001 新增 public-submodules 验证门脚本入口：`scripts/public-submodules/verify.ts`
- [x] T002 在根 `package.json` 增加脚本 `verify:public-submodules`（`tsx scripts/public-submodules/verify.ts`）：`package.json`
- [x] T003 在 `specs/030-packages-public-submodules/quickstart.md` 补齐“如何运行验证门”的命令与预期输出：`specs/030-packages-public-submodules/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 把 contracts 的结构规则固化为可执行 gate（CI/本地均可跑），避免后续重构再次漂移。

- [x] T004 实现 src 根目录治理检查（白名单 + 禁止实现目录外露）：`scripts/public-submodules/verify.ts`
- [x] T005 实现 Public Submodule 文件命名检查（`PascalCase` 或 `PascalCase.PascalCase`，扩展名 `.ts/.tsx`）：`scripts/public-submodules/verify.ts`
- [x] T006 实现 `package.json#exports` 检查：允许 effect 风格通配（`./* -> ./src/*.ts(x)`）但必须满足“src 根目录治理不变量”；必须屏蔽 `./internal/*`；不得导出指向 `src/internal/**`；子路径入口不得空壳：`scripts/public-submodules/verify.ts`
- [x] T007 实现 `publishConfig.exports` 一致性检查（若存在，入口集合需与开发态 exports 对齐）：`scripts/public-submodules/verify.ts`
- [x] T008 实现“禁止跨包/调用方绕过边界”扫描：禁止 import `@logix/*/internal/*` 与 `packages/*/src/internal/**`：`scripts/public-submodules/verify.ts`
- [x] T009 为验证门补齐最小单测与 fixtures（至少覆盖：wildcard exports、internal 泄漏、src 根目录违规）：`scripts/public-submodules/verify.test.ts`
- [x] T010 将验证门接入仓库质量门（建议并入 `pnpm lint` 或新增 `pnpm verify`）：`package.json`

---

## Phase 3: User Story 1 - 全仓对外子模块裁决清单（Priority: P1）

**Goal**: 形成可验收的“概念地图 + 推荐 import 形态 + internal 边界”，并能被 gate 与后续迁移消费。

**Independent Test**: 不读实现细节，仅靠清单即可回答“某概念属于哪个包、推荐如何 import、哪些路径禁止依赖”。

- [x] T011 [US1] 为每个包补齐“核心链路摘要”（3–8 条要点）与“最小对外表面积”说明：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- [x] T012 [US1] 为每个包补齐“目标 Public Submodule 文件 + 对应 export key”映射表（用于实现与 code review 对齐）：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- [x] T013 [US1] 登记/裁决所有 Independent Entry Points（如 `@logix/form/react`、`@logix/sandbox/vite`、移除 `@logix/query/react` 空壳）：`specs/030-packages-public-submodules/contracts/public-submodules.md`
- [x] T014 [US1] 将迁移高层顺序落到“每包最小验收清单 + 风险提示”（并显式声明 breaking 策略）：`specs/030-packages-public-submodules/contracts/migration.md`

---

## Phase 4: User Story 2 - 统一的结构与命名规则（Priority: P2）

**Goal**: `packages/*` 的 `src/` 根目录只承载对外概念入口（PascalCase），非概念实现下沉 `src/internal/**`，并通过 exports + gate 双重收口。

**Independent Test**: 给任意新增文件，能仅凭规则判断其落点；同时 `pnpm verify:public-submodules` 必须通过。

### Domain packages（建议优先）

- [x] T015 [P] [US2] `@logix/form`：重命名 public 概念入口为 PascalCase（`form.ts -> Form.ts`、`rule.ts -> Rule.ts`、`error.ts -> Error.ts`、`trait.ts -> Trait.ts`、`path.ts -> Path.ts`、`form-view.ts -> FormView.ts`、`schema-path-mapping.ts -> SchemaPathMapping.ts`、`schema-error-mapping.ts -> SchemaErrorMapping.ts`）并更新全量引用：`packages/logix-form/src`
- [x] T016 [P] [US2] `@logix/form`：下沉非概念实现到 internal（`dsl/**`、`logics/**`、`validators.ts`、`types.ts` 等）并保证 `src/index.ts` 仅通过概念入口对外暴露：`packages/logix-form/src/index.ts`
- [x] T017 [US2] `@logix/form`：对齐 exports-policy（优先保留 effect 风格通配 `./* -> ./src/*.ts`，并通过“src 根目录治理不变量 + gate”确保不泄漏；同时保留 `./react` 子入口；继续屏蔽 `./internal/*`）：`packages/logix-form/package.json`

- [x] T018 [P] [US2] `@logix/query`：删除空壳 `@logix/query/react`（`packages/logix-query/src/react/index.ts` + `package.json#exports["./react"]`）：`packages/logix-query/package.json`
- [x] T019 [P] [US2] `@logix/query`：重命名 public 概念入口为 PascalCase（`query.ts -> Query.ts`、`engine.ts -> Engine.ts`、`middleware.ts -> Middleware.ts`、`traits.ts -> Traits.ts`）并更新全量引用：`packages/logix-query/src`
- [x] T020 [P] [US2] `@logix/query`：下沉非概念实现到 internal（`logics/**`、`tanstack/**`），并把 `typecheck.ts` 移出 `src/` 根目录（建议迁到 `test/typecheck.ts`）：`packages/logix-query/src/typecheck.ts`
- [x] T021 [US2] `@logix/query`：新增概念入口 `TanStack`（`src/TanStack.ts`）并由 `src/index.ts` 聚合导出：`packages/logix-query/src/index.ts`
- [x] T022 [US2] `@logix/query`：对齐 exports-policy（优先保留 effect 风格通配 `./* -> ./src/*.ts`，并通过“src 根目录治理不变量 + gate”确保不泄漏；继续屏蔽 `./internal/*`）：`packages/logix-query/package.json`

- [x] T023 [P] [US2] `@logix/i18n`：把单文件 `src/index.ts` 拆分为概念入口（`src/I18n.ts`、`src/I18nModule.ts`、`src/Token.ts`），`src/index.ts` 变为 barrel：`packages/i18n/src/index.ts`
- [x] T024 [US2] `@logix/i18n`：对齐 exports-policy（若保留 `./* -> ./src/*.ts`，必须把 root 控制为概念入口 + 白名单；继续屏蔽 `./internal/*`）：`packages/i18n/package.json`

- [x] T025 [P] [US2] `@logix/domain`：重命名 `crud.ts -> Crud.ts` 并对齐 barrel 导出：`packages/domain/src/index.ts`
- [x] T026 [US2] `@logix/domain`：对齐 exports-policy（保留 `./* -> ./src/*.ts` 的前提是 root 只包含 PascalCase 概念入口；继续屏蔽 `./internal/*`）：`packages/domain/package.json`

### Infra packages

- [x] T027 [P] [US2] `@logix/sandbox`：迁移为概念入口文件（`client.ts -> Client.ts`、`protocol.ts -> Protocol.ts`、`types.ts -> Types.ts`、`service.ts -> Service.ts`、`vite.ts -> Vite.ts`），并把 `compiler.ts`/`worker/**` 下沉到 `src/internal/**`：`packages/logix-sandbox/src`
- [x] T028 [US2] `@logix/sandbox`：对齐 exports 与 publishConfig.exports（保留 `./vite` 子路径；新增 `./Client`/`./Service`/`./Protocol`/`./Types`；屏蔽 `./internal/*`）：`packages/logix-sandbox/package.json`
- [x] T029 [US2] `@logix/sandbox`：更新 tsup entry（确保 dist 产物覆盖新增入口）：`packages/logix-sandbox/tsup.config.ts`

- [x] T030 [P] [US2] `@logix/test`：收敛为概念入口文件（`src/TestRuntime.ts`、`src/TestProgram.ts`、`src/Execution.ts`、`src/Assertions.ts`、`src/Vitest.ts`），并把 `api/**`、`runtime/**`、`utils/**` 下沉到 `src/internal/**`：`packages/logix-test/src/index.ts`
- [x] T031 [US2] `@logix/test`：对齐 exports 与 publishConfig.exports（显式列出各概念入口并屏蔽 `./internal/*`）：`packages/logix-test/package.json`
- [x] T032 [US2] `@logix/test`：更新 tsup entry（确保 dist 产物覆盖新增入口）：`packages/logix-test/tsup.config.ts`

### Adapter / Tooling packages

- [x] T033 [P] [US2] `@logix/react`：移除对 internal 的直接导出（不再从 `src/index.ts` 导出 `internal/ReactContext`），新增概念入口 `RuntimeProvider`/`Hooks`/`Platform`/`ReactPlatform`，并将 `components/**`、`hooks/**`、`platform/**` 下沉到 `src/internal/**`：`packages/logix-react/src/index.ts`
- [x] T034 [US2] `@logix/react`：对齐 exports-policy（可保留 `./* -> ./src/*.ts`，但必须先把 root 收敛为 PascalCase 概念入口文件；并确保 `publishConfig.exports` 与开发态一致；屏蔽 `./internal/*`）：`packages/logix-react/package.json`
- [x] T035 [US2] `@logix/react`：更新 tsup entry（确保 dist 产物覆盖新增入口）：`packages/logix-react/tsup.config.ts`

- [x] T036 [P] [US2] `@logix/devtools-react`：将 `ui/**`、`state/**`、`theme.css`、`snapshot.ts`、`state.ts` 下沉到 `src/internal/**`，新增概念入口 `LogixDevtools`/`DevtoolsLayer`/`StateTraitGraphView`：`packages/logix-devtools-react/src/index.tsx`
- [x] T037 [US2] `@logix/devtools-react`：对齐 exports-policy（当前 `./* -> ./src/*.tsx` 使非概念入口可被 subpath import；需先收敛 root 概念入口后再决定保留通配或改显式；并确保 `publishConfig.exports` 与开发态一致）：`packages/logix-devtools-react/package.json`
- [x] T038 [US2] `@logix/devtools-react`：更新 tsup entry（确保 dist 产物覆盖新增入口）：`packages/logix-devtools-react/tsup.config.ts`

### Core package（最后做，避免影响面不清）

- [x] T039 [US2] `@logix/core`：清理历史占位/过时导出（避免“子域 exports 变成事实 API”；相关清理已在 spec 026 统一收口）：`packages/logix-core/package.json`

### Repo-wide migration & validation

- [x] T040 [US2] 全仓同步调用方 import（如有深层入口/通配入口依赖，按新 exports/概念入口替换）：`examples/**`、`apps/**`
- [x] T041 [US2] 运行并通过质量门（禁止 watch）：`package.json`

---

## Phase 4B: Internal Convergence（src/internal 收敛与重组）

**Goal**: 在 public surface 收口完成后，把各包 `src/internal/**` 按“概念分区 + 可抽包”重组到位，降低并行冲突面，并为下一阶段开发提供稳定目录心智模型。

**Independent Test**: 同一概念的实现聚拢到单一 internal 分区；不存在跨概念 internal 直依赖；verify gate 通过；不引入对外语义变化。

- [x] T053 固化 internal 目标拓扑（按包给出 internal 分区蓝图 + logix-core 分层铁律）：`specs/030-packages-public-submodules/contracts/internal-structure.md`

### Per-package internal reorg（按包并行；单包单写者）

- [x] T054 [P] `@logix/form`：将 `dsl/**`、`logics/**`、`validators.ts`、`types.ts`、`form.impl.ts` 等实现彻底下沉并按概念分区重组（参考 `contracts/internal-structure.md`），确保 public submodules 不直依赖实现目录：`packages/logix-form/src/internal`
- [x] T055 [P] `@logix/query`：将 `logics/**`、`tanstack/**`、`typecheck.ts` 等实现下沉并按概念分区重组（engine/tanstack/logics/middleware/typecheck），并消除 `@logix/query/react` 空壳入口带来的目录漂移：`packages/logix-query/src/internal`
- [x] T056 [P] `@logix/i18n`：拆分 `src/index.ts` 的实现到 internal 分区（driver/token/module），并由 `I18n/I18nModule/Token` 公共入口聚合对外：`packages/i18n/src/internal`
- [x] T057 [P] `@logix/domain`：将 CRUD 实现聚拢到 `src/internal/crud/**`，public `Crud` 仅承载稳定契约与薄封装：`packages/domain/src/internal`

- [x] T058 [P] `@logix/react`：在把 `components/**`、`hooks/**`、`platform/**` 下沉后，进一步按 provider/hooks/platform/store 分区重组 internal（避免把实现目录固化成 API）：`packages/logix-react/src/internal`
- [x] T059 [P] `@logix/devtools-react`：按 ui/state/snapshot/theme 分区重组 internal，并确保 `theme.css` 等资源不再成为事实 public surface：`packages/logix-devtools-react/src/internal`

- [x] T060 [P] `@logix/sandbox`：按 worker/compiler/kernel 分区重组 internal，并确保 public `Client/Service/Protocol/Types` 只依赖 internal 的概念边界入口：`packages/logix-sandbox/src/internal`
- [x] T061 [P] `@logix/test`：将 `api/**`、`runtime/**`、`utils/**` 下沉并按 internal 分区重组（api/runtime/utils），由公共概念入口聚合对外：`packages/logix-test/src/internal`

### `@logix/core` internal（谨慎但要做清楚）

- [x] T062 [US2] `@logix/core`：清理 `src/internal/**` 中的非源码文件（例如 `.DS_Store`）并补齐忽略规则，避免污染 internal 与 gate：`packages/logix-core/src/internal`
- [x] T063 [US2] `@logix/core`：internal/runtime 分层自检与收敛（确保 deep core 不反向依赖浅层；internal 适配层保持薄）：`packages/logix-core/src/internal/runtime`
- [x] T064 [US2] `@logix/core`：若 internal 重组触及 `src/internal/runtime/core/**` 的逻辑内容（非纯 move/rename），在 030 的 Constitution Check 补齐：可复现 perf evidence、诊断影响说明、以及 NFR-003/NFR-004/NFR-006 的回归验收口径（确定性标识/事务边界/内部 hook 收口为 Runtime Services）：`specs/030-packages-public-submodules/plan.md`

---

## Phase 5: User Story 3 - 可交接的重构路线图（Priority: P3）

**Goal**: 给出“现状 vs 目标”的漂移分类（A/B/C）与逐包迁移步骤，任何维护者可按图施工。

**Independent Test**: 另一位维护者能按路线图推进（按包切片、按阶段验收），无需口头补充。

- [x] T065 [US3] 新增 Gap Report（按包列出 A/B/C 分类、目标入口、风险级别）：`specs/030-packages-public-submodules/contracts/gap-report.md`
- [x] T066 [US3] 将 `contracts/migration.md` 升级为“逐包步骤清单”（引用 Gap Report，并明确每步验收）：`specs/030-packages-public-submodules/contracts/migration.md`
- [x] T067 [US3] 在 Quickstart 中加入“提交前自检清单”（更新裁决清单 + 跑 gate + 同步示例/文档）：`specs/030-packages-public-submodules/quickstart.md`

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T068 [P] 清理与格式化：确保不存在“未受结构治理保护的 exports 通配”、internal 泄漏、src 根目录违规：`scripts/public-submodules/verify.ts`
- [x] T069 [P] 补齐迁移说明（按包写“旧 import → 新 import”与禁止项）：`specs/030-packages-public-submodules/contracts/migration.md`
- [x] T070 [P] 在 `apps/docs` 与 `examples/*` 补齐/修正推荐 import 形态（以裁决清单为准）：`apps/docs/content/docs`、`examples`

## Phase N+1: Collaboration & Future-Proofing

- [x] T071 固化“最小摩擦协作协议”（角色/ownership/touch-set/锁规则）：`specs/030-packages-public-submodules/contracts/collaboration-protocol.md`
- [x] T072 固化“子模块→独立子包提升路径”（signals/结构约束/迁移步骤）：`specs/030-packages-public-submodules/contracts/promotion-to-package.md`

## Phase N+2: Test Structure Alignment（源码-测试对齐）

> 说明：对标 effect（见 `contracts/test-structure.md`），把 `packages/*/test` 组织成“概念地图”的镜像；允许逐包迁移，但同一包同一时间单写者，避免 rename 冲突。

- [x] T076 在验证门中加入“测试目录治理”最小检查（禁止 `src/**` 下出现测试；internal 用例收口到 `test/internal/**`；对启用 Vitest `browser` project 的包，`test/browser/**` 视为保留路径：不得改名/迁出，且 unit 项目必须 exclude）：`scripts/public-submodules/verify.ts`
- [x] T077 [P] `@logix/core`：把 `packages/logix-core/test/*.test.ts` 按 `Module/Runtime/Logic/Flow/...` 分组迁入对应子目录，并确保 `tsconfig.test.json`/Vitest include 仍能覆盖：`packages/logix-core/test`
- [x] T078 [P] `@logix/form`：把 `packages/logix-form/test/Form.*` 迁入 `packages/logix-form/test/Form/**`（`Rule/Trait/Path` 同理），并把 `Internal.*` 收敛到 `packages/logix-form/test/internal/**`：`packages/logix-form/test`
- [x] T079 [P] `@logix/query`：把 `packages/logix-query/test/Query.*` 迁入 `packages/logix-query/test/Query/**`（`Engine/TanStack/Middleware/Traits` 同理）：`packages/logix-query/test`
- [x] T080 [P] `@logix/react`：对齐概念目录命名（例如 `packages/logix-react/test/hooks -> packages/logix-react/test/Hooks`），补齐 `RuntimeProvider/Platform/...` 分组；保留 `test/integration`/`test/browser`/`test/perf` 语义分组，且 `test/browser/**` 目录名不得改动（browser project include 固定 `test/browser/**/*.test.tsx|ts`）：`packages/logix-react/test`
- [x] T081 [P] `@logix/devtools-react`：按 `LogixDevtools/DevtoolsLayer/StateTraitGraphView` 分组迁移用例，并把内部实现相关用例收敛到 `packages/logix-devtools-react/test/internal/**`：`packages/logix-devtools-react/test`
- [x] T082 [P] `@logix/sandbox`：把用例按 `Client/Service/Protocol/Types` 分组（浏览器用例保持 `test/browser/**`，保留 `msw/__screenshots__` 等资源目录），内部语义收敛到 `packages/logix-sandbox/test/internal/**`：`packages/logix-sandbox/test`
- [x] T083 [P] `@logix/test`：按 `TestProgram/TestRuntime/Execution/Assertions/Vitest` 分组迁移用例，并把实现细节相关用例收敛到 `packages/logix-test/test/internal/**`：`packages/logix-test/test`
- [x] T084 [P] `@logix/i18n`：按 `I18n/I18nModule/Token` 分组迁移用例，并把 driver/token/module 语义收敛到 `packages/i18n/test/internal/**`：`packages/i18n/test`
- [x] T085 [P] `@logix/domain`：把 `CrudModule.*` 用例迁入 `packages/domain/test/Crud/**`，内部实现用例收敛到 `packages/domain/test/internal/**`：`packages/domain/test`

## Phase N+3: SSoT & User Docs Writeback（收敛事实源）

> 说明：030 的 contracts 是“特性期 SSoT”。当代码落地并通过验证门后，需要把稳定裁决写回仓库级 SSoT 与用户文档，避免只停留在 feature 目录里。

- [x] T073 写回 Runtime SSoT：将 Public Submodules / exports-policy / verify gate 的裁决摘要同步到 `.codex/skills/project-guide/references/*`（至少包含：推荐 import 形态、禁止项、质量门命令）：`.codex/skills/project-guide/references`
- [x] T074 写回 Platform/Glossary SSoT：将 Public Submodule / Independent Entry Point / Promotion Path 等术语同步到 `docs/specs/sdd-platform/ssot` 的词汇表/决策文档（避免术语漂移）：`docs/specs/sdd-platform/ssot`
- [x] T075 写回用户文档：更新 `apps/docs` 中所有示例与推荐 import 形态（禁止出现 internal deep import）；新增/更新一页“Public Submodules 迁移与导入约定”（必须包含 ≤5 关键词词汇表与迁移说明模板，口径与 `contracts/migration.md` 对齐；术语保持产品视角，不出现 v3/PoC/内部实现），并更新对应 `meta.json`：`apps/docs/content/docs/guide/recipes`

---

## Dependencies & Execution Order

- Phase 1–2 先把 gate 落地；Phase 4 按包完成 public surface/exports 收口；Phase 4B 完成 internal 分区收敛；Phase 3/5 文档可与迁移并行但必须在最终交付前完成对齐。
- Phase 4/4B 推荐顺序：Domain → Infra → Adapter/Tooling → Core（见 `contracts/migration.md`）。
- 并行建议：不同包的迁移任务（标记 `[P]`）可并行推进，但同一包的结构变更必须单写者；每包阶段性完成后必须跑 `pnpm verify:public-submodules` 做阶段验收。
- 测试目录对齐建议在每包“概念入口重命名/exports 收口”后立即执行（避免重复移动），并在写回 SSoT/用户文档前完成（确保示例与测试路径一致）。
