# 028 · Perf 证据归档

本目录用于存放本特性自己的性能证据（Before/After/Diff），避免把 `specs/014-browser-perf-boundaries/perf/` 变成“所有特性的杂货铺”。

推荐来源与口径：

- 复用 `@logixjs/perf-evidence/assets/matrix.json` 的 suite（例如 `form.listScopeCheck`、`diagnostics.overhead.*`）。
- 输出结构与 diff 语义以 014 的 `PerfReport/PerfDiff` 为准（可机器解析、可回归、可交接）。

建议命名（按需调整）：

- `014.before.<gitSha>.<envId>.json`
- `014.after.worktree.<envId>.json`
- `014.diff.<beforeSha>.<afterSha>.<envId>.json`
