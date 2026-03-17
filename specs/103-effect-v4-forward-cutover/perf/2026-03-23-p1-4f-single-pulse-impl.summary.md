# 2026-03-23 · P1-4F single pulse contract summary

## 结论

- 结论类型：`implementation-evidence`
- 结果分类：`accepted_with_evidence`
- accepted_with_evidence：`true`

## 本轮实施与验收

- 实施对象：`P1-4F single pulse contract`
- 唯一目标：把 selector interest、readQuery activation 生命周期与单订阅路径推进到 freeze v2 的最小实现
- 当前已通过：
  - core typecheck
  - react typecheck
  - core 行为门
  - react 行为门
  - `probe_next_blocker=clear`

## 证据文件

- `docs/perf/archive/2026-03/2026-03-23-p1-4f-single-pulse-impl.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.core-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.react-typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.core-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.validation.react-vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-23-p1-4f-single-pulse-impl.probe-next-blocker.json`
