# Quickstart: 046 After 045 路线图（怎么用）

本 quickstart 让你用最少步骤把路线图用起来（不依赖 drafts）。

## 1) 我做完 045 之后下一步做什么？

- 打开 `specs/046-core-ng-roadmap/roadmap.md`，按里程碑顺序看：M0 → M1 → M2 → M3…
- 若你的目标是“放心做平台”，优先把 **M1（039 达标）**打穿；它是“当前内核够硬”的信心来源。
- 若你要继续推进 NG 路线：关系先改 `specs/046-core-ng-roadmap/spec-registry.json`，人读阐述看 `specs/046-core-ng-roadmap/spec-registry.md`（按 P0/P1 优先级新建/推进）。
- 若你想“只用 046 做执行总控”：先看 `specs/046-core-ng-roadmap/checklists/m0-m1.md`（M0→M1 的索引式清单），再跳到 045/039 的 tasks 执行。
- （可选）想一眼看依赖图：用 `.codex/skills/speckit/scripts/bash/spec-registry-graph.sh 046`（或 `--all` 合并所有 groups）。

## 2) 我怎么判断“core-ng 只是试跑”还是“可以切默认”？

- 试跑/渐进替换：允许在 `trial-run/test/dev` 按 `serviceId` 混用，但必须能导出证据解释 fallback。
- 切默认：必须满足 M3/M4 的硬门槛（无 fallback + 契约一致性验证 + Node+Browser 预算内证据）。

## 3) 我现在要不要上 Vite/AOT？

- 不需要作为前置条件：先走 Runtime-only NG（契约注入 + 整型化/零分配 + 证据门禁）。
- 只有当证据显示“解释层成为主瓶颈且 runtime 手段难以再降”时，才考虑另立 spec 做工具链路线。
