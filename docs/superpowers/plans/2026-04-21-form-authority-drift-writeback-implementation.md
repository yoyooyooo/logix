# Form Authority Drift Writeback Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把 post-`F1` 的 authority drift 收口到单一权威链，确保 active authority、routing mirror、inventory mirror 与高冲突 stale hazard 不再给出冲突读法。

**Architecture:** 这批工作只做 docs / routing / inventory writeback，不进入 runtime 实现。执行顺序固定为：先同步 source authority 与 boundary / governance mirror，再同步 form subtree 与 proposal routing，最后处理高冲突 stale hazard 的最小 quarantine，并做 focused proof。当前计划不重开 `F1` survivor set。

**Tech Stack:** Markdown docs, ripgrep, git diff check

**Bound Inputs:**
- [Form Authority Drift Writeback Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-authority-drift-writeback-contract.md)
- [authority drift review ledger](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/review-plan/runs/2026-04-21-form-authority-drift-writeback-review.md)
- [Form Exact Surface Contract](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [Domain Packages](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/08-domain-packages.md)

---

## File Structure

- [docs/ssot/runtime/06-form-field-kernel-boundary.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md)
  - form 与 field-kernel 的 boundary mirror。这里要确保 root exact helper 与 direct-owner support 的分界稳定。
- [docs/ssot/form/04-convergence-direction.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/04-convergence-direction.md)
  - governance mirror。这里要固定 post-`F1` 主战场，避免回到“root exact 仍是主问题”的旧读法。
- [docs/ssot/form/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/README.md)
  - form 子树 routing mirror。这里要保证 next / proposal cluster 的最短跳转稳定。
- [docs/proposals/README.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/README.md)
  - proposal lane routing mirror。这里只保留仍有主方向分歧的 proposal。
- [docs/proposals/public-api-surface-inventory-and-disposition-plan.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/public-api-surface-inventory-and-disposition-plan.md)
  - inventory mirror。这里要把 `F1` snapshot 与 follow-up cluster 对齐当前真实状态。
- [docs/proposals/form-exact-api-freeze-candidate.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-exact-api-freeze-candidate.md)
  - 高冲突 stale hazard 之一。需要最小 de-preference / superseded 提示。
- [docs/proposals/form-semantic-closure-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/proposals/form-semantic-closure-contract.md)
  - 高冲突 stale hazard 之一。需要最小 de-preference / superseded 提示。

## Chunk 1: Authority Mirrors

### Task 1: 同步 boundary 与 governance mirror

**Files:**
- Modify: `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- Modify: `docs/ssot/form/04-convergence-direction.md`
- Reference: `docs/ssot/form/13-exact-surface-contract.md`
- Reference: `docs/ssot/runtime/08-domain-packages.md`

- [x] **Step 1: 对齐 `runtime/06` 的 root vs support 读法**

要求：
- 只把 `Form.make / Form.Rule / Form.Error` 当作 root exact helper
- `Form.Path / Form.SchemaPathMapping / Form.SchemaErrorMapping` 明确写成 root-exited direct-owner support / residue

- [x] **Step 2: 对齐 `form/04` 的 post-`F1` 主战场**

要求：
- 明写 root exact contraction 已完成
- 当前主战场只剩 authority drift cleanup 与 `P0` semantic closure

- [x] **Step 3: 跑 focused drift scan**

Run:
```bash
rtk rg -n "Form\\.Path|SchemaPathMapping|SchemaErrorMapping|root exact" \
  docs/ssot/runtime/06-form-field-kernel-boundary.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/13-exact-surface-contract.md
```

Expected:
- `runtime/06` 与 `form/04` 不再把 `Path / Schema*` 写成 root survivor
- 与 `form/13` 不出现明显冲突句

## Chunk 2: Routing Mirrors

### Task 2: 同步 form 子树与 proposal lane 路由

**Files:**
- Modify: `docs/ssot/form/README.md`
- Modify: `docs/proposals/README.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [x] **Step 1: 对齐 form 子树 routing**

要求：
- `Form Authority Drift Writeback Contract` 继续留在 proposal cluster
- `Form Live Residue / Error Decode Render / P0 Semantic Closure` 都从 next cluster 进入

- [x] **Step 2: 对齐 proposal lane routing**

要求：
- 只保留还在 proposal lane 的 form 提案
- 已迁到 next 的 3 份提案只在“最近消费 / 已转入 next”中出现

- [x] **Step 3: 对齐 inventory mirror**

要求：
- `F1` follow-up cluster 指向当前真实 proposal / next 路由
- 不再引用已迁移前的旧 proposal path

- [x] **Step 4: 跑 routing scan**

Run:
```bash
rtk rg -n "form-live-residue-cutover-plan|form-error-decode-render-closure-contract|form-p0-semantic-closure-wave-plan" \
  docs/ssot/form/README.md \
  docs/proposals/README.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
- `form/README` 指向 `docs/next/**`
- `proposals/README` 不再把三份 next topic 列在当前状态

## Chunk 3: Stale Hazard Quarantine

### Task 3: 处理高冲突 stale proposal

**Files:**
- Modify: `docs/proposals/form-exact-api-freeze-candidate.md`
- Modify: `docs/proposals/form-semantic-closure-contract.md`
- Modify: `docs/proposals/README.md`

- [x] **Step 1: 给两份高冲突 stale proposal 补最小 de-preference 提示**

要求：
- 明确它们不再作为当前 authority 输入
- 指向当前 owner 页或 follow-up proposal / next topic

- [x] **Step 2: 在 proposal lane README 中补最小 conflict note**

要求：
- 只处理这两份 active retrieval 最容易命中的 stale hazard
- 不扩大成全量 stale governance

- [x] **Step 3: 跑 stale conflict scan**

Run:
```bash
rtk rg -n "Form\\.Path|SchemaPathMapping|SchemaErrorMapping|future canonical mapper|keep" \
  docs/proposals/form-exact-api-freeze-candidate.md \
  docs/proposals/form-semantic-closure-contract.md
```

Expected:
- 仍可保留历史内容
- 但必须能一眼看出它们不再是当前 authority

## Chunk 4: Closeout

### Task 4: 做 authority drift close proof

**Files:**
- Modify: `docs/proposals/form-authority-drift-writeback-contract.md`
- Modify: `docs/review-plan/runs/2026-04-21-form-authority-drift-writeback-review.md`

- [x] **Step 1: 回写执行后状态**

要求：
- 更新 claim / writeback / proof matrix 的执行状态
- 若高冲突 stale hazard 已完成最小 quarantine，记录 close proof

- [x] **Step 2: 跑最终 diff 检查**

Run:
```bash
rtk git diff --check -- \
  docs/ssot/runtime/06-form-field-kernel-boundary.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/README.md \
  docs/proposals/README.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md \
  docs/proposals/form-exact-api-freeze-candidate.md \
  docs/proposals/form-semantic-closure-contract.md \
  docs/proposals/form-authority-drift-writeback-contract.md \
  docs/review-plan/runs/2026-04-21-form-authority-drift-writeback-review.md
```

Expected:
`无输出`

- [x] **Step 3: 运行最终 proof scan**

Run:
```bash
rtk rg -n "Form\\.Path|SchemaPathMapping|SchemaErrorMapping" \
  docs/ssot/runtime/06-form-field-kernel-boundary.md \
  docs/ssot/form/README.md \
  docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
- active docs 里不再把 `Path / Schema*` 当作 root survivor

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-form-authority-drift-writeback-implementation.md`. Ready to execute?
