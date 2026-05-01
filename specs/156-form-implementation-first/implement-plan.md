# Form Implementation First Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development`（if subagents available）or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `156` 从规划态推进到可执行实施态，按 `AC3.3` baseline 补齐 Form 背后逻辑的 source scheduling、receipt/evidence ownership、row-heavy hooks 与 verification closure，并保持 public surface、semantic owner、declaration authority 不变。

**Architecture:** 先锁 admission 和 evidence map，再按四个 wave 推进。Wave 1 只动 field-kernel 的 source/task substrate，Wave 2 收口 receipt 与 diagnostics/evidence ownership，Wave 3 收口 row-heavy remap/cleanup/stale hooks，Wave 4 做 trial/compare/perf witness 与 authority writeback。Wave 5 在核心 closure 之后整顿 `examples/logix-react` form demos 与相关用户文档页，让 examples、docs、`06` 的 `SC-*` 主场景矩阵和派生 `WF*` projection 共用一条默认叙事。`tasks.md` 继续承担任务索引，本文件补充文件职责、执行顺序、命令和完成定义。

**Tech Stack:** TypeScript 5.x, Effect V4 beta.28, Vitest, `@effect/vitest`, pnpm workspace, browser perf-boundary suites

---

## How To Use This Plan

- 先读 `specs/156-form-implementation-first/spec.md`
- 再读 `specs/156-form-implementation-first/plan.md`
- 任务编号以 `specs/156-form-implementation-first/tasks.md` 为准
- 执行细节、默认命令、文件职责、波次门禁以本文件为准
- 本文件服务 implementation handoff，不重写 `155` / `156` 的 owner truth

## Hard Rules

- `AC3.3` 是当前唯一 implementation baseline
- 每个 core internal-enabler 改动都必须映射到 `G1 / G2 / G3 / G4`
- 每个 post-closure examples/docs 改动都必须回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 或 canonical docs route
- core 实施线只允许推进 `needed enabler`
- Wave 5 只允许消费已闭合的 `SC-*` 场景、派生 `WF*` projection 与 canonical docs route
- `already frozen` 与 `reopen-gated` 不进入主实施线
- 不改 `companion / lower / availability / candidates`
- 不改 `rule / submit / decode / blocking verdict`
- 不下沉 public noun、declaration authority、exact `field(path).source(...)` act
- 不触碰 `examples/logix-form-poc`
- 不让 `examples/logix-react` form demos 或 docs 页面反向拥有第二套语义边界

## File Map

### Docs

- `specs/156-form-implementation-first/spec.md`
  - 范围、边界、closure gate
- `specs/156-form-implementation-first/plan.md`
  - wave 顺序、verification matrix、落点总览
- `specs/156-form-implementation-first/tasks.md`
  - 任务编号、依赖顺序、完成面
- `specs/156-form-implementation-first/discussion.md`
  - implementation audit ledger、gap ledger、residual reopen evidence
- `specs/156-form-implementation-first/quickstart.md`
  - 入场顺序、最小命令、快速门禁

### Field Kernel

- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
  - source scheduling、idle snapshot sync、key-hash writeback、replay/patch metadata
- `packages/logix-core/src/internal/field-kernel/source.ts`
  - 薄 re-export。保持薄，不承载新逻辑
- `packages/logix-core/src/internal/field-kernel/install.ts`
  - kernel install 入口与 wiring boundary
- `packages/logix-core/src/internal/field-kernel/build.ts`
  - declaration/build boundary
- `packages/logix-core/src/internal/field-kernel/converge-diagnostics.ts`
  - diagnostics emission 与 focus chain
- `packages/logix-core/src/internal/field-kernel/meta-diagnostics.ts`
  - diagnostics level / dev guard 相关辅助

### Form Internal

- `packages/logix-form/src/internal/form/install.ts`
  - action wiring、source refresh、validate scheduling、array action bridge
- `packages/logix-form/src/internal/form/impl.ts`
  - form runtime glue，保持 semantic owner 边界
- `packages/logix-form/src/internal/form/fields.ts`
  - normalize / merge / authoring guard，禁止偷塞第二 authoring route
- `packages/logix-form/src/internal/form/artifacts.ts`
  - Form-side artifact exporter，与 rules/evidence 产物对接
- `packages/logix-form/src/internal/form/rowid.ts`
  - row identity、trackBy、rowId store bridge
- `packages/logix-form/src/internal/form/arrays.ts`
  - array aux sync、cleanup shape 对齐

### Verification

- `packages/logix-core/src/ControlPlane.ts`
  - control-plane report contract，优先复用现有 `focusRef` / `artifacts`
- `packages/logix-core/src/internal/verification/trialRun.ts`
  - trial 执行入口
- `packages/logix-core/src/internal/verification/evidence.ts`
  - evidence package 合同
- `packages/logix-core/src/internal/verification/evidenceCollector.ts`
  - internal evidence collection substrate

### Example & Docs Alignment

- `examples/logix-react/src/App.tsx`
  - demo route inventory、分组顺序、用户可见标签
- `examples/logix-react/src/demos/form/*`
  - retained form demo layouts
- `examples/logix-react/src/modules/*`
  - 支撑 richer witness demo 的模块实现，优先复用现有 `field-form`、`complex-field-form`、`querySearchDemo`
- `examples/logix-react/test/form-demo-matrix.contract.test.ts`
  - SSoT-backed retained demo matrix contract
- `apps/docs/content/docs/form/index*.mdx`
  - form 专题入口页
- `apps/docs/content/docs/form/introduction*.md`
  - 默认心智页
- `apps/docs/content/docs/form/quick-start*.md`
  - 最小默认路径
- `apps/docs/content/docs/form/field-arrays*.md`
  - row-heavy / array 叙事页

### Test Surfaces

- `packages/logix-form/test/Form/Form.InternalBoundary.test.ts`
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts`
- `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts`
- `packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts`
- `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts`
- `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`
- `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`

## Default Command Set

- Form targeted tests
  - `pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts`
  - `pnpm -C packages/logix-form exec vitest run test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts`
  - `pnpm -C packages/logix-form exec vitest run test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts`
- Package typecheck
  - `pnpm -C packages/logix-core typecheck`
  - `pnpm -C packages/logix-form typecheck`
  - `pnpm -C packages/logix-react typecheck`
- Browser perf-boundary witnesses
  - `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/form-list-scope-check.test.tsx --project browser`
  - `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser`
  - `pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser`
- Examples / docs alignment
  - `pnpm -C examples/logix-react exec vitest run test/form-demo-matrix.contract.test.ts`
  - `pnpm -C examples/logix-react typecheck`
  - `pnpm -C examples/logix-react build`
  - `pnpm -C apps/docs types:check`
  - `pnpm -C apps/docs build`
- Broader gate
  - `pnpm lint`
  - `pnpm test:turbo`

## Chunk 1: Admission, Boundary Lock, Evidence Map

### Task 1: Lock the admitted workset

**Covers:** `T004-T012`

**Files:**
- Modify: `specs/156-form-implementation-first/discussion.md`
- Modify: `specs/156-form-implementation-first/plan.md`
- Modify: `specs/156-form-implementation-first/quickstart.md`
- Modify: `packages/logix-form/test/Form/Form.InternalBoundary.test.ts`
- Modify: `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
- Modify: `packages/logix-form/src/internal/form/install.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/install.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/build.ts`

- [ ] **Step 1: Build the initial audit ledger**

  在 `discussion.md` 新增一张最小表，列至少包括：
  `slice | gate | current files | target files | proof trigger | class`

  初始 slice 固定为：
  - `source scheduling / task substrate`
  - `receipt -> reason/evidence/bundle patch ownership`
  - `row-heavy remap / cleanup / stale hooks`
  - `trial / compare evidence feed`

- [ ] **Step 2: Mark class for every slice**

  每个 slice 都要写成三选一：
  - `already frozen`
  - `needed enabler`
  - `reopen-gated`

  这一轮预计只有上面四个 slice 进入 `needed enabler`。其余 surface 一律落到 `already frozen` 或 `reopen-gated`。

- [ ] **Step 3: Extend the boundary tests first**

  在 `Form.InternalBoundary.test.ts` 和 `Form.DomainBoundary.test.ts` 各补一条会失败的断言，覆盖：
  - source/refinement 不得新增 public route
  - implementation enabler 不得迁移 semantic owner
  - field-kernel build/install 不得吸收 declaration-authority 职责

- [ ] **Step 4: Run the boundary tests and verify failure**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts
  ```

  Expected:
  - 新增断言先失败
  - 失败信息能指出 boundary drift，不能退化成随机 runtime error

- [ ] **Step 5: Tighten only the structural boundaries that the tests expose**

  默认顺序：
  1. 先看 `packages/logix-form/src/internal/form/install.ts`
  2. 再看 `packages/logix-form/src/internal/form/impl.ts`
  3. 最后看 `packages/logix-core/src/internal/field-kernel/install.ts` 与 `build.ts`

  只做以下几类改动：
  - 抽薄 boundary helper
  - 把 owner 注释改成结构约束
  - 把会泄露 semantic/declaration owner 的逻辑移回正确层

- [ ] **Step 6: Re-run the boundary suite**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts
  pnpm -C packages/logix-core typecheck
  pnpm -C packages/logix-form typecheck
  ```

  Expected:
  - 两个测试文件通过
  - `logix-core` 与 `logix-form` typecheck 通过

- [ ] **Step 7: Write back the admitted workset**

  回写到 `discussion.md`、`plan.md`、`quickstart.md`：
  - admitted slices
  - excluded slices
  - 最小验证入口

## Chunk 2: Source Scheduling / Task Substrate

### Task 2: Make source scheduling explicit without changing authoring

**Covers:** `T013-T018`

**Files:**
- Modify: `packages/logix-form/test/Form/Form.Source.Authoring.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts`
- Modify: `packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.ts`
- Modify: `packages/logix-form/src/internal/form/install.ts`

- [ ] **Step 1: Add failing tests around the current exact act**

  目标断言：
  - exact `field(path).source(...)` act 不变
  - row-scope source 的 authoring 行为不变
  - stale submit snapshot 行为稳定
  - `submitImpact` 行为稳定
  - refinement 只会改变 internal scheduling clarity，不会改变 authoring contract

- [ ] **Step 2: Run the source suite and confirm failure**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts
  ```

  Expected:
  - 新增断言失败
  - 失败点集中在 scheduling / stale / submitImpact 相关逻辑

- [ ] **Step 3: Refine `source.impl.ts` first**

  这一波优先把以下职责收口到单处 helper 或单条路径：
  - idle snapshot sync
  - key hash guard
  - writeback patch recording
  - replay metadata / sourceRef carry

  保留 `source.ts` 为薄 re-export。新逻辑不落在 `source.ts`。

- [ ] **Step 4: Only adjust `form/install.ts` if the kernel change needs a narrower bridge**

  允许修改的点：
  - `sourceWiring.refreshOnKeyChange`
  - `submit` 触发时机
  - `array*` action 到 `fieldScopedValidate` 的 handoff

  不允许修改的点：
  - 新 public action
  - 新 validate mode
  - 新 authoring option

- [ ] **Step 5: Keep the expected code shape small**

  目标状态应接近：

  ```ts
  // 伪代码约束，关注结构，非精确实现
  const applySourceWriteback = (...) =>
    Effect.gen(function* () {
      // 统一 key/hash/current guard
      // 统一 replay / patch record
      // 统一 idle vs ready snapshot writeback
    })
  ```

  重点是收一条内部路径，不增加新层。

- [ ] **Step 6: Re-run the source suite**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts
  pnpm -C packages/logix-core typecheck
  pnpm -C packages/logix-form typecheck
  ```

  Expected:
  - 四个测试文件通过
  - typecheck 通过

- [ ] **Step 7: Update the evidence ledger**

  在 `discussion.md` 记录：
  - 哪些 source scheduling gap 已闭合
  - 哪些依旧 deferred 到 receipt ownership 或 verification closure

## Chunk 3: Receipt Ownership, Diagnostics Chain, Row-Heavy Hooks

### Task 3: Close receipt/evidence ownership without creating a second truth

**Covers:** `T015-T020`

**Files:**
- Modify: `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- Modify: `packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`
- Modify: `packages/logix-form/src/internal/form/artifacts.ts`
- Modify: `packages/logix-form/src/internal/form/fields.ts`
- Modify: `packages/logix-form/src/internal/form/rowid.ts`
- Modify: `packages/logix-form/src/internal/form/arrays.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-diagnostics.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/meta-diagnostics.ts`

- [ ] **Step 1: Add failing witness tests first**

  目标断言：
  - `source receipt -> reason / evidence / bundle patch` 可回链
  - cleanup receipt 与 row identity 一致
  - reorder / replace / delete 不会打乱 rowId-based expectation
  - diagnostics 继续单真相，focus chain 可解释

- [ ] **Step 2: Run the witness suite and capture failure**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts
  ```

  Expected:
  - 新 witness 失败
  - 失败信息能定位到 receipt chain 或 row-heavy remap/cleanup

- [ ] **Step 3: Land the smallest ownership change in Form first**

  优先顺序：
  1. `artifacts.ts`
  2. `rowid.ts`
  3. `arrays.ts`
  4. `fields.ts`

  目的：
  - Form 侧产物出口只做事实导出
  - row-heavy cleanup/remap 只落在 row identity 与 aux array sync 相关模块
  - `fields.ts` 继续只守 authoring/merge guard，不承载新的 runtime truth

- [ ] **Step 4: Then align diagnostics emission**

  在 `converge-diagnostics.ts` / `meta-diagnostics.ts` 中只做这类对齐：
  - 复用已有 `reasonSlotId`
  - 保持 `sourceRef` 传递一致
  - 确保 bundle patch 与 diagnostics 说的是同一条链

  禁止新增第二 diagnostics object。

- [ ] **Step 5: Keep row-heavy logic transaction-safe**

  `rowid.ts` 与 `arrays.ts` 的改动必须满足：
  - 事务内纯同步
  - 不引入 IO
  - 不把 cleanup 逻辑散到组件侧
  - 不靠 React glue 修补 row-heavy 行为

- [ ] **Step 6: Re-run the witness suite**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts
  pnpm -C packages/logix-core typecheck
  pnpm -C packages/logix-form typecheck
  ```

  Expected:
  - 三个 witness 文件通过
  - 核心包 typecheck 通过

- [ ] **Step 7: Update the gap ledger**

  在 `discussion.md` 增量记录：
  - 已闭合的 diagnostics causal link
  - 已闭合的 row-heavy cleanup/remap link
  - 仍待 `ControlPlane` / trial/compare 收口的 gap

## Chunk 4: Verification Closure, Browser Witness, Writeback

### Task 4: Bind internal enablers back to trial/compare/perf evidence

**Covers:** `T021-T034`

**Files:**
- Modify: `packages/logix-core/src/ControlPlane.ts`
- Modify: `packages/logix-core/src/internal/verification/trialRun.ts`
- Modify: `packages/logix-core/src/internal/verification/evidence.ts`
- Modify: `packages/logix-core/src/internal/verification/evidenceCollector.ts`
- Modify: `packages/logix-form/src/internal/form/install.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Modify: `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/diagnostics-overhead.test.tsx`
- Modify: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Modify: `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- Modify: `docs/ssot/form/13-exact-surface-contract.md`
- Modify: `specs/156-form-implementation-first/spec.md`
- Modify: `specs/156-form-implementation-first/plan.md`
- Modify: `specs/156-form-implementation-first/discussion.md`
- Modify: `specs/156-form-implementation-first/quickstart.md`

- [ ] **Step 1: Decide the narrowest evidence landing**

  优先顺序固定为：
  1. 复用 `ControlPlane.ts` 现有 `focusRef`
  2. 复用 `artifacts`
  3. 复用 `trialRun` / `evidenceCollector`

  只有这三处都不够时，才允许增加新的 internal helper。helper 也必须挂在现有 verification substrate 下。

- [ ] **Step 2: Add failing verification expectations**

  先在 form / browser witness 侧补断言，再动实现。重点覆盖：
  - `G4` 需要的 implementation trace
  - diagnostics overhead 不明显回退
  - store consistency 不回退
  - form-list-scope 的 row-heavy 行为保持稳定

- [ ] **Step 3: Run the browser witness baseline**

  Run:

  ```bash
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/form-list-scope-check.test.tsx --project browser
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser
  ```

  Expected:
  - 新断言先失败，或现有 witness 暴露出实现缺口
  - 若浏览器波动导致 `comparable=false`，先记录，不直接下结论

- [ ] **Step 4: Refine verification substrate only where the witness points**

  推荐 edit order：
  1. `evidenceCollector.ts`
  2. `trialRun.ts`
  3. `evidence.ts`
  4. `ControlPlane.ts`
  5. `form/install.ts` / `form/impl.ts`

  目标：
  - 让 internal enabler 可被 trial/compare 或 artifact 引用
  - 不创建新 public control-plane surface
  - 不创建第二 evidence truth

- [ ] **Step 5: Re-run targeted verification**

  Run:

  ```bash
  pnpm -C packages/logix-form exec vitest run test/Form/Form.InternalBoundary.test.ts test/Form/Form.DomainBoundary.test.ts test/Form/Form.Source.Authoring.test.ts test/Form/Form.Source.RowScope.Authoring.test.ts test/Form/Form.Source.StaleSubmitSnapshot.test.ts test/Form/Form.Source.SubmitImpact.test.ts test/Form/Form.ReasonEvidence.contract.test.ts test/Form/Form.CleanupReceipt.contract.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/form-list-scope-check.test.tsx --project browser
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/diagnostics-overhead.test.tsx --project browser
  pnpm -C packages/logix-react exec vitest run test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --project browser
  pnpm -C packages/logix-core typecheck
  pnpm -C packages/logix-form typecheck
  pnpm -C packages/logix-react typecheck
  ```

  Expected:
  - targeted tests 通过
  - browser witnesses 可比较或被明确标记为环境波动
  - 三个 package typecheck 通过

- [ ] **Step 6: Write back the stable outcome**

  回写顺序：
  1. `docs/ssot/runtime/06-form-field-kernel-boundary.md`
  2. `docs/ssot/form/13-exact-surface-contract.md`
  3. `specs/156-form-implementation-first/spec.md`
  4. `specs/156-form-implementation-first/plan.md`
  5. `specs/156-form-implementation-first/discussion.md`
  6. `specs/156-form-implementation-first/quickstart.md`

  `discussion.md` 只保留 residual gap 与 reopen evidence。

- [ ] **Step 7: Run the final repository gates**

  Run:

  ```bash
  pnpm lint
  pnpm test:turbo
  ```

  Expected:
  - lint 通过
  - turbo test 通过
  - 若失败，先确认是否为本波次相关，再决定是否补充修复或拆出独立问题

## Chunk 5: Example / Docs Alignment

### Task 5: Refresh retained form demos after core closure

**Covers:** `T035-T042`

**Files:**
- Create: `examples/logix-react/test/form-demo-matrix.contract.test.ts`
- Modify: `examples/logix-react/src/App.tsx`
- Modify: `examples/logix-react/src/demos/form/FormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx`
- Modify: `examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx`
- Modify: `examples/logix-react/src/modules/complex-field-form.ts`
- Modify: `specs/156-form-implementation-first/discussion.md`
- Modify: `specs/156-form-implementation-first/plan.md`
- Modify: `specs/156-form-implementation-first/quickstart.md`
- Modify when needed: `apps/docs/content/docs/form/index.cn.mdx`
- Modify when needed: `apps/docs/content/docs/form/introduction.cn.md`
- Modify when needed: `apps/docs/content/docs/form/quick-start.cn.md`
- Modify when needed: `apps/docs/content/docs/form/field-arrays.cn.md`
- Modify when needed: English counterparts under `apps/docs/content/docs/form/`

- [ ] **Step 1: Build the SSoT-backed retained demo matrix**

  先在 `discussion.md` 写出当前 form demo inventory：
  - route
  - layout
  - backing module
  - `SC-*` scenario ids
  - derived `WF*` families
  - decision: `retain / rewrite / merge / remove`

  没有 `SC-* / WF*` 映射支撑的 demo，不保留为 canonical example。

- [ ] **Step 2: Add the failing demo matrix contract**

  在 `examples/logix-react/test/form-demo-matrix.contract.test.ts` 先写失败断言，覆盖：
  - `App.tsx` 中保留的 form routes
  - route label 顺序
  - 每个 route 对应的 narrative slice

- [ ] **Step 3: Rebuild the retained layouts**

  优先收成最小主链：
  - quick-start / submit / validation
  - source / remote fact
  - row-heavy / field-arrays / complex witness

  `FieldFormDemoLayout` 如果只承担内部字段行为对照，就应进入高级或 witness 分组，不与 quick-start 并列。

- [ ] **Step 4: Reuse existing rich modules before creating new ones**

  优先复用：
  - `field-form.ts`
  - `complex-field-form.ts`
  - `querySearchDemo.ts`

  如果 row-heavy / list witness 需要 richer demo，先在这些模块上扩展；避免再造一份并行小 demo。

- [ ] **Step 5: Update the route shell**

  修改 `examples/logix-react/src/App.tsx`：
  - form demo 分组顺序要贴合用户文档默认路径
  - route labels 要讲场景和能力，不讲历史实现碎片
  - 历史高阶 demo 要么并入 canonical group，要么降到 advanced/witness group

- [ ] **Step 6: Run example validation**

  Run:

  ```bash
  pnpm -C examples/logix-react exec vitest run test/form-demo-matrix.contract.test.ts
  pnpm -C examples/logix-react typecheck
  pnpm -C examples/logix-react build
  ```

  Expected:
  - SSoT-backed retained demo matrix contract 通过
  - examples typecheck 通过
  - examples build 通过

- [ ] **Step 7: If docs are touched, update only the minimal alignment pages**

  优先更新：
  - `apps/docs/content/docs/form/index*.mdx`
  - `apps/docs/content/docs/form/introduction*.md`
  - `apps/docs/content/docs/form/quick-start*.md`
  - `apps/docs/content/docs/form/field-arrays*.md`

  要求：
  - 术语、默认路径、route label 与 retained demos 一致
  - 不新长第二 taxonomy
  - 遵守 `docs/standards/user-docs-writing-standard.md`

- [ ] **Step 8: Run docs validation when docs are touched**

  Run:

  ```bash
  pnpm -C apps/docs types:check
  pnpm -C apps/docs build
  ```

  Expected:
  - docs typecheck 通过
  - docs build 通过

- [ ] **Step 9: Write back the alignment outcome**

  在 `plan.md`、`quickstart.md`、`discussion.md` 记录：
  - SSoT-backed retained demo matrix
  - docs pages that were aligned
  - deferred pages or routes

- [ ] **Step 10: Run the final repository gates**

  Run:

  ```bash
  pnpm lint
  pnpm test:turbo
  ```

  Expected:
  - lint 通过
  - turbo test 通过
  - 若失败，先确认是否为本波次相关，再决定是否补充修复或拆出独立问题

## Definition Of Done

- `discussion.md` 有完整 audit ledger 和 gap ledger
- `plan.md` 的 verification matrix 与实际代码落点一致
- `tasks.md` 的 `T004-T042` 都能在本文件找到执行路径
- source scheduling 通过 targeted form tests
- receipt/evidence ownership 通过 witness tests
- row-heavy hooks 通过 row identity 与 browser list-scope witness
- verification substrate 能把这几类 internal enabler 接回 trial/compare/evidence
- retained form demos 与 docs pages 共享同一 canonical naming 和 narrative order
- authority 与 `156` 文档已经回写，没有平行真相源

## Commit Rhythm

- Chunk 1 绿了之后可做一次 checkpoint
- Chunk 2 绿了之后可做一次 checkpoint
- Chunk 3 绿了之后可做一次 checkpoint
- Chunk 4 与文档 writeback 完成后做最后一次 checkpoint
- Chunk 5 绿了之后再做 examples/docs alignment checkpoint

## Out Of Scope For This Plan

- 新 public noun
- 新 public read carrier
- `list().companion` / `root().companion`
- exact diagnostics object redesign
- second control plane
- second runtime truth
- 非 form examples 的统一整顿
