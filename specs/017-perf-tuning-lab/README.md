# 017 调参实验场（Perf Tuning Lab）

> 017 的目标：让“最佳默认值”变成可复现的实验结论，而不是拍脑袋。
>
> 约束：017 **只消费 013 的控制面语义**，并以 014 作为唯一跑道/对比口径；不再造第二套口径。

## 这目录里有什么

- 需求与验收：`specs/017-perf-tuning-lab/spec.md`
- 怎么跑/怎么读：`specs/017-perf-tuning-lab/quickstart.md`
- 现在能调哪些旋钮：`specs/017-perf-tuning-lab/knobs.md`
- 文档配方是否被测试覆盖：`specs/017-perf-tuning-lab/testing.md`

## 上游事实源

- 013（控制面语义与证据字段）：`specs/013-auto-converge-planner/`
- 014（跑道/矩阵/PerfReport & PerfDiff 口径）：`specs/014-browser-perf-boundaries/`
- 用户视角的“止血/调参”说明：`apps/docs/content/docs/guide/advanced/converge-control-plane.md`

## 最短闭环（维护者视角）

1. 用 017 跑一次 sweep，得到推荐默认值与证据：`pnpm perf tuning:best`（产物：`specs/014-browser-perf-boundaries/perf/tuning/recommendation.latest.md`）
2. 将 winner 作为候选默认值，进入 014 的 Before/After 对比跑道，确认“无回归 + 通过硬门”
3. 需要止血时，优先用模块级/子树级覆盖（不影响全局默认），稳定后再回收

> 产物目录怎么读：`specs/014-browser-perf-boundaries/perf/tuning/README.md`  
> Before/After 跑道怎么跑：`specs/014-browser-perf-boundaries/perf/README.md`
>
> 文档规范化（原 019）已吸纳到 017：以 014 的 `perf/README.md` + `perf/tuning/README.md` 作为统一入口。

## 与 018 的关系

- 017：面向维护者的“固定环境 sweep”，用于决定“默认值是否应该更新/如何止血”。
- 018：面向用户环境的“运行时自校准”（可选高级能力），用于生成本机最优覆盖（不等同于库默认值）。
