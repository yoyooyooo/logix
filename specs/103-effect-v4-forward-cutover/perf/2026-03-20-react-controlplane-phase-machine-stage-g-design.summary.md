# 2026-03-20 · Stage G design-only summary

## 结论

- 结论类型：`docs/evidence-only`
- 交付形态：`implementation-ready`
- 代码改动：无
- 下一实施线：`G1 owner-lane registry adapter`

## 最小切口定义

`G1` 只做三 lane 的 owner registry / cancel / readiness 统一桥接：

- `configLane/neutralLane` 迁入共享 owner-lane registry 适配层。
- `preloadLane` 先接适配层接口，保持现有 preload executor。
- `configLane ready` executor 维持 `legacy-control`，不与 registry 迁移叠加。

## 本轮未直接实施的依据

- 当前 `RuntimeProvider` 仍是“config/neutral refs + preload registry”双轨载体。
- 现有测试覆盖了 lane 级事件，缺跨三 lane 的统一口径断言。
- `probe_next_blocker` 在当前 worktree 先被环境阻塞（依赖缺失），本轮只沉淀设计包。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-react-controlplane-phase-machine-stage-g-design.probe-next-blocker.json`
