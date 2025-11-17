# Quickstart: 068 Watcher 纯赚性能优化

**Spec**: `specs/068-watcher-pure-wins/spec.md`  
**Plan**: `specs/068-watcher-pure-wins/plan.md`

本 quickstart 用于在实现落地后快速验收本 spec 的关键门槛：回归用例 + perf evidence（Node + Browser）。

## 1) 质量门（实现完成后）

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:turbo`

## 2) watcher 压力回归用例（实现完成后）

- core 单测/集成测试：在 `packages/logix-core/test/**` 下运行（由 `pnpm test:turbo` 覆盖）。
- browser perf boundary：在 `packages/logix-react/test/browser/perf-boundaries/**` 下运行（通过 perf evidence collect 覆盖）。

## 3) Perf evidence（实现完成后）

证据套件定义见：`specs/068-watcher-pure-wins/contracts/perf-evidence-suites.md`。

### Node（Action fan-out / topic-index）

- collect（before/after）与 diff 的落盘路径：`specs/068-watcher-pure-wins/perf/*`
- 建议通过 `pnpm perf` 使用统一脚本入口（具体 suite 由实现阶段补齐到 perf evidence 框架中）。

### Browser（watcher pressure）

- 通过 `pnpm perf collect` 指定 browser perf boundary 测试文件采集证据。

### Node（compilation enhancement on/off）

- 见 `contracts/perf-evidence-suites.md` 的 Suite C：在 `compilationEnhancement=off` vs `on` 下对照跑同一用例，要求行为一致、可解释回退，且对可静态化子集有可判定收益。

## 4) 验收口径

- 功能/语义：以 `specs/068-watcher-pure-wins/spec.md` 的 FR/SC 为准。
- 性能：以 `NFR-001` 的 before/after/diff 为准；任何 `comparable=false` 的 diff 不得下硬结论。
