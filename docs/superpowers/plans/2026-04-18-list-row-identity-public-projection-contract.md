# List Row Identity Public Projection Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从当前 core probes 里正式选定 `list row identity public projection contract` 作为下一份 spec，并把 owner、problem contract、verification witness、non-goals 压成单一 spec package，供后续实现波次直接接手。

**Architecture:** 这轮先不落公开代码。先用现有 SSoT、tests 和 example residue 证明 list row identity 比 field-ui 更适合作为下一条 primitive-first reopen；再创建 `specs/149-list-row-identity-public-projection/`，把 contract 只冻结到 owner、route、theorem、non-goals 和验证义务；最后回写 internal ledger，让后续实现只围绕这一份 spec 推进。

**Tech Stack:** Markdown、Spec Kit、TypeScript 证据文件、Vitest、`rg`、`git diff --check`

---

## Scope And Freeze Line

- 本计划只处理下一份 spec 的选题、切题和台账回写。
- 本计划要回答：
  - 为什么下一条 probe 选 `list row identity public projection contract`
  - 这条 contract 的 owner 和 route 应该如何理解
  - 它和 `useFormList` 的 example-local synthetic id residue 是什么关系
  - 后续实现波次需要哪些 witness 和非目标
- 本计划不处理：
  - 立即实现公开 helper
  - 立即修改 `examples/logix-react/src/form-support.ts`
  - 立即冻结 exact noun 或 import shape
  - `field-ui` exact leaf reopen
  - toolkit 方向的 wrapper 讨论

## Why This Probe

- `field error` 读取 contract 已经落地到 `Form.Error.field(path)`，不再是下一条 probe。
- `field-ui` 当前只有 boundary 结论，还缺多 consumer 证据，继续后置更稳。
- `list row identity` 已经同时具备：
  - runtime substrate：`rowId / trackBy / rowIdStore`
  - exact handle surface：`fieldArray(...).byRowId(...)`
  - example residue：`useFormList` 仍在本地生成 `example-row:*` synthetic id
- 这条 gap 若不先收，`useFormList` 这类 residue 很难真正退出。

## File Structure And Responsibilities

### Evidence Sources

- Read: `docs/ssot/form/01-current-capability-map.md`
  - 证明“动态列表已有稳定 identity”已经成立
- Read: `docs/ssot/form/02-gap-map-and-target-direction.md`
  - 提取这条 gap 在 `P0` problem contract 里的位置
- Read: `docs/ssot/form/03-kernel-form-host-split.md`
  - 锁定 owner split，尤其是 `row roster projection`
- Read: `docs/ssot/form/06-capability-scenario-api-support-map.md`
  - 锁定 witness matrix 与 verification proof
- Read: `docs/ssot/form/13-exact-surface-contract.md`
  - 锁定现有 exact surface 已经做到哪里
- Read: `docs/internal/toolkit-candidate-ledger.md`
  - 回写 probe 去向与 spec 链接

### Existing Runtime Evidence

- Read: `packages/logix-form/test/internal/Internal.RowId.test.ts`
  - 证明内部 rowId substrate 已存在
- Read: `packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
  - 证明 `byRowId` 已进入 exact handle surface
- Read: `packages/logix-form/src/internal/form/rowid.ts`
  - 理解 runtime internals 当前暴露的 rowId helper
- Read: `packages/logix-form/src/internal/form/commands.ts`
  - 理解 `byRowId` 当前怎样路由
- Read: `examples/logix-react/src/form-support.ts`
  - 锁定 example-local synthetic id residue

### Spec Package To Create

- Create: `specs/149-list-row-identity-public-projection/spec.md`
  - 单点承接这条 probe 的 problem statement、owner、requirements、success criteria
- Create: `specs/149-list-row-identity-public-projection/plan.md`
  - 为后续真正实现波次预留 landing plan
- Create: `specs/149-list-row-identity-public-projection/checklists/requirements.md`
  - 锁定 spec completeness

### Existing Docs To Modify

- Modify: `docs/internal/toolkit-candidate-ledger.md`
  - 给 `list row identity public contract` 增加 spec 链接与 `next probe` 备注

## Verification Matrix

- Evidence confirmation:
  - `pnpm vitest run packages/logix-form/test/internal/Internal.RowId.test.ts packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
  - Expected: PASS，证明 rowId substrate 与 `byRowId` surface 已成立
- Residue confirmation:
  - `rg -n "example-row:" examples/logix-react/src/form-support.ts`
  - Expected: 命中本地 synthetic id 生成逻辑
- Selection proof:
  - `rg -n "field error 读取 contract|field-ui 叶子合同|list row identity public contract" docs/internal/toolkit-candidate-ledger.md`
  - Expected: 三条 core probe 同时可见，便于在 spec 开头解释为什么本轮选 row identity
- Spec package sanity:
  - `test -f specs/149-list-row-identity-public-projection/spec.md`
  - `test -f specs/149-list-row-identity-public-projection/plan.md`
  - `test -f specs/149-list-row-identity-public-projection/checklists/requirements.md`
  - Expected: 3 个文件都存在
- Final gate:
  - `git diff --check`
  - Expected: 无输出

## Done Definition

1. `specs/149-list-row-identity-public-projection/` 已创建完成。
2. `spec.md` 能清楚说明为什么下一条 probe 选 row identity，而不是 field-ui。
3. `spec.md` 明确写出这条 contract 的 owner split、route budget、theorem 和 non-goals。
4. `spec.md` 明确把 example-local synthetic id 视为 residue，而不是公开 truth。
5. `docs/internal/toolkit-candidate-ledger.md` 已链接到新 spec，并把这条 probe 标成 next。
6. verification commands 跑完后没有明显断链或缺文件。

## Chunk 1: Freeze Selection

### Task 1: 先把“为什么选 row identity”写清楚

**Files:**
- Read: `docs/ssot/form/01-current-capability-map.md`
- Read: `docs/ssot/form/02-gap-map-and-target-direction.md`
- Read: `docs/ssot/form/03-kernel-form-host-split.md`
- Read: `docs/ssot/form/06-capability-scenario-api-support-map.md`
- Read: `docs/proposals/form-field-ui-projection-contract.md`
- Read: `docs/internal/toolkit-candidate-ledger.md`
- Read: `packages/logix-form/test/internal/Internal.RowId.test.ts`
- Read: `packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts`
- Read: `examples/logix-react/src/form-support.ts`

- [ ] **Step 1: 跑 rowId focused tests，确认 substrate 已成立**

Run:

```bash
pnpm vitest run packages/logix-form/test/internal/Internal.RowId.test.ts packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts
```

Expected: PASS，且没有新增 failing tests。

- [ ] **Step 2: 扫描 example residue，确认本地 synthetic id 仍存在**

Run:

```bash
rg -n "example-row:" examples/logix-react/src/form-support.ts
```

Expected: 命中 `example-row:*` 生成逻辑。

- [ ] **Step 3: 记录 selection basis**

把下面四点写进新 spec 的 opening section：

```md
- field error 已落到 `Form.Error.field(path)`，退出 next-probe 竞争
- field-ui 仍只有 boundary proof，exact leaf 证据不足
- row identity 已有 substrate + exact handle surface + example residue
- 若不先补 public projection contract，`useFormList` 很难退出 synthetic id
```

- [ ] **Step 4: 提交一个只包含证据确认的 checkpoint commit**

```bash
git add -N specs/149-list-row-identity-public-projection docs/internal/toolkit-candidate-ledger.md
git commit -m "plan: select row identity as next form core probe"
```

## Chunk 2: Cut Spec 149

### Task 2: 创建 spec package 并冻结 contract

**Files:**
- Create: `specs/149-list-row-identity-public-projection/spec.md`
- Create: `specs/149-list-row-identity-public-projection/plan.md`
- Create: `specs/149-list-row-identity-public-projection/checklists/requirements.md`

- [ ] **Step 1: 创建 spec 目录和空文件**

Run:

```bash
mkdir -p specs/149-list-row-identity-public-projection/checklists
touch specs/149-list-row-identity-public-projection/spec.md
touch specs/149-list-row-identity-public-projection/plan.md
touch specs/149-list-row-identity-public-projection/checklists/requirements.md
```

Expected: 3 个文件创建成功。

- [ ] **Step 2: 写 `spec.md`，只冻结最小 contract**

`spec.md` 必须至少包含这些段落：

```md
## Authority Split
- global owner refs
- current exact surface refs
- witness refs

## User Story 1
- maintainer freezes row roster projection as next primitive-first reopen

## User Story 2
- Agent can explain why render key must equal rowId or pure(rowId)

## Edge Cases
- reorder
- replace
- byRowId after reorder
- trackBy missing
- synthetic local id forbidden

## Functional Requirements
- row roster projection is not second identity
- render key must equal rowId or pure projection of rowId
- helper or projection consumer cannot synthesize local ids
- exact noun/import shape may stay open if evidence is insufficient
```

- [ ] **Step 3: 写 `plan.md`，只为后续 landing 波次预埋结构**

`plan.md` 先写到 docs-first 精度，至少包含：

```md
- authority inputs
- likely landing files
- proof obligations
- non-goals
- example cutover target
```

不要在这一轮假装 exact noun 已经决定。

- [ ] **Step 4: 写 checklist 并做一次 completeness 自检**

Checklist 至少检查：

```md
- owner split clear
- no second identity
- no synthetic local id truth
- witness matrix linked
- exact noun/import shape explicitly marked frozen or deferred
```

- [ ] **Step 5: 提交 spec package**

```bash
git add specs/149-list-row-identity-public-projection
git commit -m "spec: add row identity public projection contract"
```

## Chunk 3: Route The Next Wave

### Task 3: 回写 internal ledger，给后续实现明确入口

**Files:**
- Modify: `docs/internal/toolkit-candidate-ledger.md`

- [ ] **Step 1: 给 `list row identity public contract` 增加 spec 链接**

把这一行补成包含 next-spec 指针的版本，形状可按下面写：

```md
| list row identity public contract | `law-guard` | `live-residue` | list identity truth 未冻结；next spec: `/specs/149-list-row-identity-public-projection/spec.md` | `useFormList` 当前自带本地 row id 策略 |
```

- [ ] **Step 2: 在该条目下补一行简短注记**

```md
- next: `149-list-row-identity-public-projection`
```

- [ ] **Step 3: 跑选择证明与文件存在检查**

Run:

```bash
rg -n "list row identity public contract|149-list-row-identity-public-projection" docs/internal/toolkit-candidate-ledger.md specs/149-list-row-identity-public-projection
test -f specs/149-list-row-identity-public-projection/spec.md
test -f specs/149-list-row-identity-public-projection/plan.md
test -f specs/149-list-row-identity-public-projection/checklists/requirements.md
```

Expected: `rg` 命中 ledger 和 spec；3 个文件都存在。

- [ ] **Step 4: 跑 `git diff --check`**

Run:

```bash
git diff --check
```

Expected: 无输出。

- [ ] **Step 5: 提交 routing 变更**

```bash
git add docs/internal/toolkit-candidate-ledger.md specs/149-list-row-identity-public-projection
git commit -m "docs: route next form probe to row identity spec"
```

## Chunk 4: Execution Handoff

### Task 4: 给下一波实现明确入口

**Files:**
- Modify: `specs/149-list-row-identity-public-projection/plan.md`

- [ ] **Step 1: 把后续实现的 landing set 写清楚**

至少列出这些潜在文件：

```md
- packages/logix-react/src/FormProjection.ts
- packages/logix-react/src/index.ts
- packages/logix-react/test-dts/canonical-hooks.surface.ts
- packages/logix-form/src/internal/form/rowid.ts
- examples/logix-react/src/form-support.ts
```

- [ ] **Step 2: 明确“实现前置条件”**

写明：

```md
- 只有在 exact noun / import shape 真正冻结后，才允许开始代码 landing
- 若 noun 仍未冻结，本波次到 spec 为止
```

- [ ] **Step 3: 做最终提交**

```bash
git add specs/149-list-row-identity-public-projection/plan.md
git commit -m "plan: prepare row identity probe handoff"
```
