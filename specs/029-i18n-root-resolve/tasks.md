# Tasks: 029 国际化接入与 `$.root.resolve(Tag)` 语法糖

**Input**: `specs/029-i18n-root-resolve/*`（`spec.md`/`plan.md`/`research.md`/`data-model.md`/`contracts/*`/`quickstart.md`）

**Tests**: 本特性触及 `packages/logix-core` 的 Bound API 与 root 解析入口，属于核心路径；测试与回归防线视为 REQUIRED（含性能基线与诊断字段校验）。

**Organization**: 按用户故事分组，保证每个故事可独立实现与验证。

## Phase 1: Setup（共享准备）

**Purpose**: 先把“怎么衡量/怎么回归”准备好，避免热路径改动缺少证据链。

- [x] T001 创建性能证据记录文件 `specs/029-i18n-root-resolve/perf.md`（包含运行环境信息：OS/CPU/Node 等 + 基线记录模板）
- [x] T002 [P] 新增 perf 脚本：`$.root.resolve`/`Root.resolve` 解析开销基线（入口：`pnpm perf bench:029:i18n-root-resolve`）
- [x] T003 [P] 新增 perf 脚本：message token 构造/canonicalize 开销基线（入口：`pnpm perf bench:029:i18n-token`）

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 在改热路径前先锁死“变更前”基线，满足宪章的性能证据要求。

- [x] T004 运行并记录“变更前”perf 基线到 `specs/029-i18n-root-resolve/perf.md`（建议在稳定环境运行；入口：`pnpm perf bench:029:i18n-root-resolve`、`pnpm perf bench:029:i18n-token`）

**Checkpoint**: 变更前基线已固化，可开始按用户故事推进。

---

## Phase 3: User Story 1 - 在模块逻辑中显式获取 Root 单例（Priority: P1） 🎯 MVP

**Goal**: 在 Logic `$` 上提供 `$.root.resolve(Tag)` 语法糖；保持 strict 默认不变；root 解析固定命中当前 Runtime Tree 的 root provider 且忽略局部 override。

**Independent Test**: 在单个 Module Logic 内对同一 Tag 分别走 strict 与 root：strict 缺失即失败；root 不受 override 影响；并覆盖多 tree 隔离。

### Tests for User Story 1

- [x] T005 [P] [US1] 新增回归测试：`$.root.resolve(Tag)` 固定 root provider 且忽略局部 override `packages/logix-core/test/BoundApi.RootResolveSugar.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] 扩展 `Root.resolve` 支持可选 entrypoint（用于 `$.root.resolve` 的诊断字段）`packages/logix-core/src/Root.ts`
- [x] T007 [US1] 在内部 Bound API 类型新增 `root.resolve`（显式 root/global）`packages/logix-core/src/internal/runtime/core/module.ts`
- [x] T008 [US1] 在对外 Bound API 类型新增 `root.resolve`（保持 public typing 一致）`packages/logix-core/src/Bound.ts`
- [x] T009 [US1] 在 `$` 实现中挂载 `root.resolve`（run-only + 调用 `Root.resolve`）`packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- [x] T010 [US1] 运行并记录“US1 变更后”root-resolve perf 指标到 `specs/029-i18n-root-resolve/perf.md`（入口：`pnpm perf bench:029:i18n-root-resolve`）

**Checkpoint**: `$.root.resolve(Tag)` 可用且诊断可读；strict 语义未被改变。

---

## Phase 4: User Story 2 - 共享外部国际化实例并保持既有 DX（Priority: P1）

**Goal**: 支持把“外部 i18n 实例”注入到 Runtime Tree，并在 Module Logic 内共享该实例产出文案或 message token；UI 侧可沿用既有 i18n 使用方式。

**Independent Test**: 在同一 tree 内注入一个外部 i18n 实例：Logic 与 UI（边界）对同一 key 翻译一致；语言切换后 UI 仅靠自身订阅/重渲染即可看到新语言（无需业务手写重算）。

### Tests for User Story 2

- [x] T011 [P] [US2] 新增回归测试：I18n 服务按 runtime tree 注入隔离（多 tree 不串实例），并验证 I18nModule 与 I18n Service 同实例 `packages/i18n/test/I18n.InjectionIsolation.test.ts`
- [x] T012 [P] [US2] 新增回归测试：message token canonicalize（key 排序、剔除 undefined、拒绝非 JsonPrimitive / 语言冻结字段）+ 序列化违规稳定拒绝（结构化错误字段齐全）`packages/i18n/test/I18n.MessageToken.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] 创建新包 `@logixjs/i18n`（package.json/tsconfig/src/index.ts/test 基础设施），且不引入 i18next 依赖 `packages/i18n/package.json`
- [x] T014 [US2] 在 `@logixjs/i18n` 中定义最小形状 `I18nDriver` + I18n Service/I18nTag（含 I18nSnapshot/语言切换入口/message token 类型），并定义 I18nModule（Root 单例模块，封装/转发）`packages/i18n/src/index.ts`
- [x] T015 [US2] 实现 message token 构造 `token(key, options)` + canonicalize（预算先 soft，后续可升级 hard；抛 `InvalidI18nMessageTokenError`）`packages/i18n/src/index.ts`
- [x] T016 [P] [US2] 实现 I18n 注入 Layer（类似 `Query.Engine.layer`，宿主可注入“符合 I18nDriver 最小形状”的外部实例）`packages/i18n/src/index.ts`
- [x] T017 [US2] 新增示例：Module Logic 产出 token（写入 state/事件），展示边界渲染 token（两种语言），并演示语言切换 `examples/logix/src/i18n-message-token.ts`
- [x] T018 [US2] 运行并记录“US2 变更后”message token/canonicalize perf 指标到 `specs/029-i18n-root-resolve/perf.md`（入口：`pnpm perf bench:029:i18n-token`）

**Checkpoint**: 外部 i18n 实例可 per-tree 注入并在 Logic 内可用；message token 可回放且 Slim。

---

## Phase 5: User Story 3 - 异步初始化与“等待/不等待”两档语义（Priority: P2）

**Goal**: 支持外部 i18n 异步就绪：提供“不等待立即回退”与“等待就绪拿最终文案”两档语义，并定义失败降级（不无限等待）。

**Independent Test**: 构造 pending→ready 与 pending→failed 两条路径：不等待模式立即回退；等待模式在 ready 后返回最终文案，failed 时走可预测降级。

### Tests for User Story 3

- [x] T019 [P] [US3] 新增回归测试：ready 两档语义（pending/ready/failed）+ `tReady` 默认等待上限 5 秒（可覆盖）+ 语言切换触发快照变化 `packages/i18n/test/I18n.ReadySemantics.test.ts`

### Implementation for User Story 3

- [x] T020 [US3] 实现 `I18nSnapshot`（language/init/seq）与订阅更新（seq 单调递增）`packages/i18n/src/index.ts`
- [x] T021 [US3] 实现两档翻译 API：`t`（now，不等待）与 `tReady`（waitReady，默认 5 秒、可覆盖），并提供“请求切换语言”能力（以 I18n Service 为主入口）`packages/i18n/src/index.ts`
- [x] T022 [US3] 新增示例：异步初始化 + wait/non-wait（避免在事务窗口做 IO）`examples/logix/src/i18n-async-ready.ts`
- [x] T023 [US3] 运行并记录“US3 变更后”perf 指标到 `specs/029-i18n-root-resolve/perf.md`（入口：`pnpm perf bench:029:i18n-root-resolve`、`pnpm perf bench:029:i18n-token`）

**Checkpoint**: ready 两档语义可用且无事务窗口 IO；失败路径可预测、可诊断。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档与演练收口，保证对外心智模型一致（strict vs root、注入、异步就绪、token）。

- [x] T024 [P] 更新 runtime SSoT：Bound API 新增 `$.root.resolve` 的语义边界与示例 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md`
- [x] T025 [P] 更新 runtime SSoT：`Root.resolve` 使用建议 + strict vs root 对比 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md`
- [x] T026 [P] 更新用户文档：root provider 解析与 `$.root.resolve` 示例 `apps/docs/content/docs/api/core/runtime.md`
- [x] T027 [P] 新增用户文档：国际化接入模式（`@logixjs/i18n`/I18nDriver 最小形状注入/I18n Service + I18nModule/多 tree/语言切换/异步就绪/token）`apps/docs/content/docs/guide/patterns/i18n.md`
- [x] T028 [P] 更新 React 集成指南：如何把 `I18n.layer(...)` 合并进 `RuntimeProvider runtime={...}` 的 root layer `.codex/skills/project-guide/references/runtime-logix/logix-react/01-react-integration.md`
- [x] T029 运行质量门并修复回归（typecheck/lint/test）`package.json`
- [x] T030 校验演练：按 `specs/029-i18n-root-resolve/quickstart.md` 跑通示例与验收步骤 `specs/029-i18n-root-resolve/quickstart.md`
- [x] T031 [P] 示例工程接入依赖：为 `examples/logix-react` 增加 `@logixjs/i18n` + `i18next` + `react-i18next` 依赖 `examples/logix-react/package.json`
- [x] T032 [P] 新增 i18n demo 模块：Module Logic 通过 `$.root.resolve(I18nTag)` 产出 token（`token(key, options)`），供 UI 渲染并随语言切换自动更新 `examples/logix-react/src/modules/i18n-demo.ts`
- [x] T033 [P] 新增 demo page：在 `examples/logix-react` 接入 i18next（同一实例注入 `I18n.layer` + `I18nextProvider`），演示 language 切换 + token 渲染自动更新 `examples/logix-react/src/demos/I18nDemoLayout.tsx`
- [x] T034 [P] 将 i18n demo 加入示例导航与路由（可从左侧列表进入）`examples/logix-react/src/App.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）→ Foundational（Phase 2）→ US1/US2（Phase 3/4，可并行）→ US3（Phase 5）→ Polish（Phase 6）

### User Story Dependencies

- US1（P1）：可独立交付（MVP：`$.root.resolve` 语法糖）
- US2（P1）：可独立交付（即使暂时不用 `$.root.resolve`，仍可通过 `Root.resolve` 在逻辑中拿到 i18n 服务）
- US3（P2）：依赖 US2 的 I18n 服务契约（在其基础上补齐 async ready 语义）

### Parallel Opportunities

- Phase 1 标记为 `[P]` 的 perf 脚本可并行编写
- US1/US2 的测试任务 `[P]` 可并行先写（先红后绿）
- US2 的导出任务（index/package.json）与 I18n 实现可并行，但建议先确定 API 形状再补导出

---

## Parallel Example: User Story 1

```text
Task: [US1] 新增回归测试：$.root.resolve(Tag) 固定 root provider 且忽略局部 override packages/logix-core/test/BoundApi.RootResolveSugar.test.ts
Task: [US1] 扩展 Root.resolve 支持可选 entrypoint（用于 $.root.resolve 的诊断字段）packages/logix-core/src/Root.ts
```

## Parallel Example: User Story 2

```text
Task: [US2] 新增回归测试：I18n 服务按 runtime tree 注入隔离（多 tree 不串实例）packages/logix-core/test/I18n.InjectionIsolation.test.ts
Task: [US2] 新增回归测试：message token canonicalize + 序列化违规稳定拒绝 packages/logix-core/test/I18n.MessageToken.test.ts
Task: [US2] 导出 I18n 公共入口（barrel + package exports）packages/logix-core/src/index.ts
```

## Parallel Example: User Story 3

```text
Task: [US3] 新增回归测试：ready 两档语义（pending/ready/failed）与降级策略 packages/logix-core/test/I18n.ReadySemantics.test.ts
Task: [US3] 新增示例：异步初始化 + wait/non-wait（避免在事务窗口做 IO）examples/logix/src/i18n-async-ready.ts
```
