# Form Live Residue Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 清掉 Form 当前最容易误导人的 live residue，让 active teaching route、manifest promise、internal tutorial 与 retrieval route 全部回到 canonical path。

**Architecture:** 这批工作只处理 live route。执行顺序固定为：先做 `W1` 的 active examples / tutorial / sandbox cutover，再做 `W2` 的 manifest 与 inventory parity，最后做 `WQ` 的 POC quarantine。`examples/logix-form-poc/**` 只按最小 quarantine 预算处理，不扩大成全量历史治理。

**Tech Stack:** TypeScript, React examples, Markdown docs, pnpm typecheck, ripgrep

**Bound Inputs:**
- [Form Live Residue Cutover Plan](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/next/form-live-residue-cutover-plan.md)
- [live residue review ledger](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-live-residue-cutover-review.md)
- [Form Exact Surface Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [React Host Projection Boundary](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md)

---

## File Structure

- `examples/logix-react/src/form-support.ts`
  - 当前 example-local wrapper family 的集中地。这里要决定哪些 helper 直接删除，哪些只降到 local residue。
- `examples/logix-react/src/demos/form/**`
  - active form demos。这里是 live teaching route 的主要入口。
- `examples/logix-react/src/modules/**`
  - 仍在使用 `withFormDsl` 的 module 样本。这里要和 demos 一起切 canonical route。
- `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- `examples/logix-sandbox-mvp/src/ir/IrPresets.ts`
  - 旧 authoring route 样例入口。这里要清掉 `Form.from / config.logic` 的活教学。
- `packages/logix-form/package.json`
  - manifest truth。这里要去掉对 React public route 的误导。
- `docs/internal/form-api-tutorial.md`
- `docs/internal/README.md`
  - internal mirror。这里要保证维护者入口也只走当前 canonical route。
- `examples/logix-form-poc/README.md`
- `examples/logix-form-poc/demo/README.md`
- `docs/proposals/README.md`
  - `WQ` 的最小 quarantine 工件。

## Chunk 1: W1 Active Route Cutover

### Task 1: 清 example-local wrapper family 的 sanctioned route 暗示

**Files:**
- Modify: `examples/logix-react/src/form-support.ts`
- Modify: `examples/logix-react/src/demos/form/**`
- Modify: `examples/logix-react/src/modules/rules-composition-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-node-form.ts`
- Modify: `examples/logix-react/src/modules/rules-composition-mixed-form.ts`

- [x] **Step 1: 扫描 active wrapper 用法**

Run:
```bash
rtk rg -n "useFormMeta|useFormField|useFormList|withFormDsl" \
  examples/logix-react/src/form-support.ts \
  examples/logix-react/src/demos/form \
  examples/logix-react/src/modules
```

Expected:
- 列出当前 active route 仍在使用的 wrapper 点位

- [x] **Step 2: 先改 active demos**

要求：
- demo 页面不再把 wrapper 写成 sanctioned helper family
- 能直接改成 canonical route 的就直接改
- 暂留的极薄 local helper 只能保留 demo-local residue 身份

- [x] **Step 3: 再改 active modules**

要求：
- `withFormDsl` 不再作为 active module 的 canonical authoring 入口
- rules-composition 三个 module 改到当前 canonical authoring

- [x] **Step 4: 运行 example route scan**

Run:
```bash
rtk rg -n "useFormMeta|useFormField|useFormList|withFormDsl" \
  examples/logix-react/src/demos/form \
  examples/logix-react/src/modules
```

Expected:
- 只剩明确允许保留的 local residue

### Task 2: 清 sandbox active preset 的旧 authoring route

**Files:**
- Modify: `examples/logix-sandbox-mvp/src/ir/IrPage.tsx`
- Modify: `examples/logix-sandbox-mvp/src/ir/IrPresets.ts`

- [x] **Step 1: 扫描旧 authoring route**

Run:
```bash
rtk rg -n "Form\\.from|config\\.logic|@logixjs/form/react" \
  examples/logix-sandbox-mvp/src/ir/IrPage.tsx \
  examples/logix-sandbox-mvp/src/ir/IrPresets.ts
```

Expected:
- 列出当前活样例里的旧入口

- [x] **Step 2: 改写到 canonical route 或显式 historical**

要求：
- 活 preset 不再教授 `Form.from / config.logic`
- 若某段仅用于历史展示，显式降到 historical / residue

- [x] **Step 3: 再跑旧入口扫描**

Run same command as Step 1

Expected:
- active preset 不再包含旧 authoring route

## Chunk 2: W1 Internal Mirror

### Task 3: 同步 internal tutorial 与 internal root

**Files:**
- Modify: `docs/internal/form-api-tutorial.md`
- Modify: `docs/internal/README.md`

- [x] **Step 1: 对齐 tutorial 的 canonical route**

要求：
- 只保留 `Form.make + returned FormProgram + core host law + fieldValue/rawFormMeta/Form.Error.field`
- 不再把 repo-local wrapper 当 sanctioned route

- [x] **Step 2: 对齐 internal root 的入口说明**

要求：
- internal root 里的 form tutorial 描述与当前 live residue cutover 一致

- [x] **Step 3: 跑 internal parity scan**

Run:
```bash
rtk rg -n "useFormMeta|useFormField|useFormList|withFormDsl|Form\\.from|config\\.logic|@logixjs/form/react" \
  docs/internal/form-api-tutorial.md \
  docs/internal/README.md
```

Expected:
- 仅保留显式说明为 residue / historical 的位置

## Chunk 3: W2 Manifest And Inventory

### Task 4: 修 manifest truth 与 inventory parity

**Files:**
- Modify: `packages/logix-form/package.json`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 核对 manifest truth**

要求：
- `@logixjs/form` 不再暗示 React public route
- 依赖、devDependencies、peerDependencies 只保留真实运行 / 测试 / 构建含义

- [x] **Step 2: 回写 inventory mirror**

要求：
- `F1` follow-up 区不再把 live residue 当作 toolkit 正证据
- 当前 next topic 路由保持一致

- [x] **Step 3: 跑 manifest + inventory parity 检查**

Run:
```bash
rtk rg -n "\"react\"|@logixjs/react|toolkit" \
  packages/logix-form/package.json \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
- 不再出现 React public route 误导

### Task 5: 同步 proposal lane de-preference

**Files:**
- Modify: `docs/proposals/README.md`

- [x] **Step 1: 给 POC 加最小 de-preference / consume note**

要求：
- 只处理 `examples/logix-form-poc/**`
- 不扩大成全量 stale proposal 治理

- [x] **Step 2: 跑 README parity 检查**

Run:
```bash
rtk rg -n "logix-form-poc|de-preference|consume note" docs/proposals/README.md
```

Expected:
- `README` 已能作为 `WQ` 的 mirror target

## Chunk 4: WQ Quarantine

### Task 6: 完成 POC 最小 quarantine

**Files:**
- Modify: `examples/logix-form-poc/README.md`
- Modify: `examples/logix-form-poc/demo/README.md`
- Modify: `docs/next/form-live-residue-cutover-plan.md`

- [x] **Step 1: 给 POC README 加 historical / quarantine 提示**

要求：
- 不再把它们当 current teaching route
- 明确当前 canonical route 在其他活入口

- [x] **Step 2: 核对 `LR5/WQ` 记录**

要求：
- `docs/next/form-live-residue-cutover-plan.md` 中的 `LR5/WQ` 与真实 quarantine 动作一致

- [x] **Step 3: 跑最终 quarantine scan**

Run:
```bash
rtk rg -n "historical|quarantine|consume note|canonical route" \
  examples/logix-form-poc/README.md \
  examples/logix-form-poc/demo/README.md \
  docs/proposals/README.md
```

Expected:
- 3 个工件都能清晰表达 POC 已降到 historical / quarantine 位

## Chunk 5: Final Verification

### Task 7: 做 live residue close proof

**Files:**
- Modify: `docs/next/form-live-residue-cutover-plan.md`
- Modify: `docs/review-plan/runs/2026-04-21-form-live-residue-cutover-review.md`

- [x] **Step 1: 跑 typecheck**

Run:
```bash
pnpm -C examples/logix-react typecheck
pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit
```

Expected:
PASS

- [x] **Step 2: 跑全量 residue scan**

Run:
```bash
rtk rg -n "\\bForm\\.from\\b|@logixjs/form/react\\b|useFormMeta|useFormField|useFormList|withFormDsl" \
  examples/logix-react/src \
  examples/logix-form-poc \
  examples/logix-sandbox-mvp/src \
  docs/internal \
  packages/logix-form/package.json
```

Expected:
- active route 里只剩允许保留的 local residue
- POC 已明确降到 quarantine

- [x] **Step 3: 跑最终 diff 检查**

Run:
```bash
rtk git diff --check -- \
  examples/logix-react/src/form-support.ts \
  examples/logix-react/src/demos/form \
  examples/logix-react/src/modules \
  examples/logix-sandbox-mvp/src/ir/IrPage.tsx \
  examples/logix-sandbox-mvp/src/ir/IrPresets.ts \
  examples/logix-form-poc \
  packages/logix-form/package.json \
  docs/internal/form-api-tutorial.md \
  docs/internal/README.md \
  docs/proposals/README.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/next/form-live-residue-cutover-plan.md \
  docs/review-plan/runs/2026-04-21-form-live-residue-cutover-review.md
```

Expected:
`无输出`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-form-live-residue-cutover-implementation.md`. Ready to execute?
