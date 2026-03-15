# Implementation Loop

## 一刀固定流程

1. 选一个问题
2. 改最小代码范围
3. 跑 targeted tests
4. 跑 `typecheck:test`
5. 跑 targeted perf collect
6. 必要时跑 diff/triage
7. 写 `docs/perf/YYYY-MM-DD-<id>-<slug>.md`
8. 勾 `docs/perf/03-next-stage-major-cuts.md`
9. 勾 `docs/perf/05-forward-only-vnext-plan.md`
10. 单独提交

## 探索样本处理

- 失败试探保留为证据，但不要混进功能刀 commit
- 可以保留在 `specs/.../perf/` 下，供后续 agent 回看

## API 变动门

如果收益大的方案需要 API 调整：
- 先停下
- 输出 API 提案
- 等用户确认后再继续
