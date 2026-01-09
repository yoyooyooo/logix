# 084 · 已完成 plan + tasks（report-only evidence；下一步可选实现）

- 已落地产物：
  - `specs/084-loader-spy-dep-capture/plan.md`
  - `specs/084-loader-spy-dep-capture/contracts/schemas/spy-evidence-report.schema.json`
  - `specs/084-loader-spy-dep-capture/data-model.md`

## 下一步（可选，建议在 M2 闭环后做）

- 执行 `specs/084-loader-spy-dep-capture/tasks.md`：
  - 插桩点：`$.use`（best-effort 记录，不改变业务语义）
  - Harness：受控窗口 + 预算/超时 + coverage marker
  - 输出：`SpyEvidenceReport@v1`（report-only；对照 `078/079` 仅给建议不写回）
