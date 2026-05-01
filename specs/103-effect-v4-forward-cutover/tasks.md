# Tasks: Effect v4 全仓迁移主线（当前进度快照）

**Input**: `specs/103-effect-v4-forward-cutover/`
**Purpose**: 保持 `103` 作为全仓 Effect v4 迁移主线，同时记录当前已经完成的 runtime-core slice 与主线剩余任务。

## Completed Closure Tasks

- [x] T009 重新核验 `origin/main` 与 `origin/feat/perf-dynamic-capacity-maxlevel` 的当前关系，并刷新 `GP-1` 证据。
- [x] T017 审计 `.github/workflows/logix-perf-{quick,sweep}.yml`：确认 strict diff 分流、并发保护、超时保护、pinned matrix 与 normalize 步骤已在当前仓库存在。
- [x] T018 审计 `.github/scripts/*` 与 `packages/logix-perf-evidence/scripts/*`：确认 perf 脚本存在且可引用。
- [x] T019 回写 `inventory/perf-prerequisite.md`，将 `GP-1` 从旧快照刷新为 2026-03-07 当前远端事实。
- [x] T020 落地 Stage 2 的 service/tag registry 第一刀：`serviceId -> tag`、`moduleId -> runtime tag` helper 与对应核心调用点。
- [x] T021 落地 Stage 2 的 reference 子轨：`execVmMode` 与 `currentLinkId` 改为 `Context.Reference + Effect.provideService`。
- [x] T022 落地 runtime boundary 子轨：`Runtime.ts` 热切换入口 effect 化；`ExternalStore.ts` public sugar 收敛到 managed runtime 生命周期。
- [x] T024 清零生产路径中的直接 `yield* fiber` 风险写法。
- [x] T031 通过 `diagnostics/s2.stage0-comparison.md` 对照 Stage 0 snapshot，确认 diagnostics explainability 没有新的回归证据。
- [x] T033 清理 `logix-query` 的旧动态 union helper，收敛到当前本地 `effect/Schema` 可验证写法。
- [x] T035 将 `$.onAction(schema)` 改为安全过滤路径，非法输入不再终止合法 action 流。
- [x] T036 新增 `pnpm check:schema-v4-legacy` 与对应测试，作为 Stage 2 的自动化门禁。
- [x] T032 保留 `inventory/gate-g1.md` 为 truthful `NOT_PASS`，并补充“当前 head 可继续实现但不可宣称性能放行”的说明。
- [x] T076 将 `inventory/gate-g5.md` 重新定性为历史 release artifact 记录，不再把旧 snapshot 当作当前 `HEAD` 放行结论。
- [x] T077 将 `103` 的 spec/plan/tasks/checklists 重新绑定为“全仓迁移主线 + 当前已完成 runtime-core slice”的定位，并将 spec 状态校正为 `Active`。

## Verified Evidence

- [x] `pnpm check:schema-v4-legacy`
- [x] `pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/Runtime/Runtime.ExecVmModeReference.test.ts test/internal/ServiceId.TagRegistry.test.ts`
- [x] `pnpm -C packages/logix-core typecheck:test`
- [x] `pnpm -C packages/logix-query typecheck:test`

## 主线剩余任务（仍属于 103）

- [ ] Stage 1：workspace 级 `effect/@effect/*` 真正升级到 v4 版本矩阵。
- [ ] Stage 3：STM PoC、`Gate-C`、`G2`。
- [ ] Stage 4：`packages/logix-react` / `packages/logix-sandbox` / `packages/i18n` / `packages/logix-query` / `packages/logix-form` / `packages/domain` / `packages/logix-cli` 的全量迁移。
- [ ] Stage 5：`apps/*`、`examples/*`、`apps/docs/*`、`docs/ssot/*` 的 v4-only 收口。
- [ ] Stage 6：`rebase main`、单提交 `V4_DELTA`、历史压缩与发布级 history surgery。

## Continuous Non-Negotiables

- [x] T900 未引入 v3/v4 双栈、兼容层或临时兼容开关。
- [x] T901 当前 closure 未把 STM 扩展进禁区。
- [x] T902 当前快照没有再宣称 `G1/G2/G5` 性能 gate 已在当前 `HEAD` 通过。
