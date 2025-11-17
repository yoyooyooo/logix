# 073 · Perf Evidence

本目录用于归档可对比的 `PerfReport` / `PerfDiff`（before/after/diff），作为本特性性能预算与回归门禁的证据落点。

> 口径：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

## 环境元信息（硬结论必填）

- Date：
- Branch / commit（working tree 是否 dirty）：
- OS / arch / CPU / Memory：
- Node.js / pnpm：
- Browser（name/version/headless）：
- Matrix（matrixId/matrixHash）：
- Profile（quick/default/soak）：
- Sampling（runs/warmupDiscard/timeoutMs）：
- Notes（电源模式/后台负载/是否切换 Tab 等）：

## 证据文件

- Before：
- After：
- Diff：

## CI（quick）协作

- Workflow：`.github/workflows/logix-perf-quick.yml`（默认 `profile=quick` + `diff_mode=triage`，结论只作线索）
- 采集范围：对本特性建议用 `perf_files=test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`（相对 `packages/logix-react`）
- 产物：CI 默认写入 `perf/ci/*` 并作为 artifact 上传；需要长期留档时，手动拷贝/重命名到本目录并更新上面的“证据文件/结论”

## 结论（可交接摘要）

- Gate：PASS / FAIL / INCONCLUSIVE
- 关键指标：`timePerTickMs.p95` / `retainedHeapDeltaBytesAfterGc.p95`
- `meta.comparability`：`comparable=true`（若为 false，写清 warnings 与复测计划）
