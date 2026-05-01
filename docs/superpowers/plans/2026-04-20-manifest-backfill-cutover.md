# Manifest Backfill Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `docs/proposals/public-api-surface-inventory-and-disposition-plan.md` 里剩余的 manifest 空位与陈旧 inventory 口径一次性回填到当前事实，完成这份总提案自己的收尾。

**Architecture:** 这一批只做文档回写，不做实现 cutover。执行顺序固定为：先核对仍为 `pending` 的 manifest 行，再按 `core canonical / orchestration / react canonical / react residue` 四组回填 `candidate-disposition / future-authority`，随后删掉提案里仍保留的过时 inventory 叙述，最后用搜索和 diff-check 确认总提案已经满足“无 pending manifest 行”的目标。

**Tech Stack:** Markdown docs, rg, git diff

---

## File Map

### Primary file

- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Authority docs to read while backfilling

- Read: `docs/ssot/runtime/01-public-api-spine.md`
- Read: `docs/ssot/runtime/03-canonical-authoring.md`
- Read: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Read: `docs/ssot/runtime/11-toolkit-layer.md`
- Read: `docs/standards/logix-api-next-guardrails.md`
- Read: `docs/proposals/orchestration-existence-challenge.md`
- Read: `docs/proposals/react-host-specialized-api-cut-contract.md`

### Guardrails for this batch

- 这批不改任何 package 源码、tests 或 docs 站点页面，只改总提案。
- 不新增表格之外的第二套状态清单；所有进度都回写到同一份总提案。
- 不保留 “历史上曾经 pending” 的痕迹；回填后这 21 行应全部离开 `pending`。
- 若某个 row 的 `decision-owner` 已由子提案冻结，回填时只补 `candidate-disposition / future-authority`，不改其 owner。

## Chunk 1: Scope Audit

### Task 1: 冻结本批要回填的 manifest 范围

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 列出当前仍为 pending 的 row**

Run:
```bash
python - <<'PY'
from pathlib import Path
text = Path('docs/proposals/public-api-surface-inventory-and-disposition-plan.md').read_text().splitlines()
for i, line in enumerate(text, 1):
    if line.startswith('| `@'):
        cols = [c.strip() for c in line.strip('|').split('|')]
        if len(cols) >= 11 and ('pending' in cols[8] or 'pending' in cols[10]):
            print(f"{i}: {cols[0]} {cols[1]} cd={cols[8]} do={cols[9]} fa={cols[10]}")
PY
```

Expected:
- 只出现当前剩余的 21 行
- 范围固定在：
  - `@logixjs/core` canonical spine
  - `@logixjs/core` orchestration rows
  - `@logixjs/react` canonical rows
  - `@logixjs/react` residue rows

- [ ] **Step 2: 给这 21 行分组**

要求：
- 在本地编辑时按四组处理：
  - `C1 core canonical`
  - `K1 orchestration`
  - `R1/R2 react canonical + specialized`
  - `R3 react residue`

- [ ] **Step 3: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Core Rows

### Task 2: 回填 core canonical 与 orchestration rows

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回填 `C1` canonical rows**

要求：
- 把下面 10 行的 `candidate-disposition` 改成 `keep-canonical`
  - `.`
  - `./Actions`
  - `./Bound`
  - `./Handle`
  - `./Logic`
  - `./Module`
  - `./ModuleTag`
  - `./Program`
  - `./Runtime`
  - `./State`
- `future-authority` 统一改成：
  - `runtime/01 + runtime/03`

- [ ] **Step 2: 回填 `K1` orchestration rows**

要求：
- 把下面 4 行的 `candidate-disposition` 改成 `delete`
  - `./Workflow`
  - `./Process`
  - `./Flow`
  - `./Link`
- `future-authority` 统一改成：
  - `runtime/03 + guardrails`

- [ ] **Step 3: 清理提案内旧 core inventory prose**

要求：
- 删掉 `@logixjs/core` 段落里仍按“旧 root / old subpaths”枚举的 inventory 描述
- 改成一句短说明：
  - Phase-0 snapshot 是历史盘点材料
  - 当前 authority 以上方 manifest 行与“已冻结 / 已实施”区为准

## Chunk 3: React Rows

### Task 3: 回填 react canonical、specialized 和 residue rows

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回填 `R1` canonical rows**

要求：
- 把下面 3 行的 `candidate-disposition` 改成 `keep-canonical`
  - `.`
  - `./RuntimeProvider`
  - `./Hooks` canonical slice
- `future-authority` 统一改成：
  - `runtime/10`

- [ ] **Step 2: 回填 `R2` specialized slice**

要求：
- 把 `./Hooks` specialized slice 的 `candidate-disposition` 改成 `consumed`
- `future-authority` 改成：
  - `runtime/10 + react-host-specialized-api-cut-contract`

- [ ] **Step 3: 回填 `R3` residue rows**

要求：
- 把下面 3 行的 `candidate-disposition` 改成 `delete`
  - `./ExpertHooks`
  - `./ReactPlatform`
  - `./Platform`
- `future-authority` 统一改成：
  - `runtime/10 + runtime/11 + guardrails`

- [ ] **Step 4: 清理提案内旧 react inventory prose**

要求：
- 删掉 `@logixjs/react` 段落里仍把 `Platform / ReactPlatform / ExpertHooks` 当“当前 inventory”罗列的旧描述
- 改成当前口径：
  - root public contract 只承认 canonical host route
  - residue 已交由 `R3` delete-first 结论处理

## Chunk 4: Completion Gate

### Task 4: 让总提案通过自身完成条件

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 更新“已冻结但未完全落实”**

要求：
- 保留：
  - `K1`
  - `R3`
  - `总 manifest`
- 但把 `总 manifest` 的说明改到当前事实：
  - 剩余问题不再是这 21 行
  - 只剩更深层 future-authority 对 live SSoT 的补齐，以及非 manifest 的历史叙述修整

- [ ] **Step 2: 更新“完成条件”**

要求：
- 保持原 7 条结构不变
- 只在必要处调整文字，使其与当前事实一致：
  - `manifest row` 的三列回填完成
  - 剩余阻点转为更深层 internal/runtime 或 live SSoT 整理

- [ ] **Step 3: 跑最终搜索**

Run:
```bash
python - <<'PY'
from pathlib import Path
text = Path('docs/proposals/public-api-surface-inventory-and-disposition-plan.md').read_text().splitlines()
count = 0
for i, line in enumerate(text, 1):
    if line.startswith('| `@'):
        cols = [c.strip() for c in line.strip('|').split('|')]
        if len(cols) >= 11 and ('pending' in cols[8] or 'pending' in cols[10]):
            count += 1
            print(i, line)
print('TOTAL', count)
PY
```

Expected:
`TOTAL 0`

- [ ] **Step 4: 跑最终 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

