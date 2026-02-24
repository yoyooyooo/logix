# PR Draft: refactor/logix-core-convergeir-precomputed-digest-20260224

- PR：`#55`（https://github.com/yoyooyooo/logix/pull/55）
- 合并策略：`auto-merge(rebase)` 已开启
- CI watcher：`.context/pr-ci-watch/pr-55-20260224-122823.log`

## 目标
- 把 `ConvergeStaticIr` 的 `staticIrDigest` 下沉到 build 冷路径预计算。
- 让运行期（尤其 `converge-in-transaction`）直接复用 digest，避免每次 decision 组装都重复 hash。

## 模块阅读范围
- `packages/logix-core/src/internal/state-trait/build.ts`
- `packages/logix-core/src/internal/state-trait/converge-ir.ts`
- `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`
- `packages/logix-core/test/StateTrait/StateTrait.StaticIr.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/state-trait/converge-ir.ts`
  - 扩展 `ConvergeStaticIrRegistry`：新增 `staticIrDigest` 字段。
  - `getConvergeStaticIrDigest` 优先返回 IR 自带的预计算 digest，保留旧路径作为 fallback。
- `packages/logix-core/src/internal/state-trait/build.ts`
  - 在 `buildConvergeIr` 中基于 `writersKey/depsKey/fieldPathsKey` 一次性计算 `staticIrDigest` 并写入 registry。
- `packages/logix-core/test/StateTrait/StateTrait.StaticIr.test.ts`
  - 新增断言：`StateTrait.build` 产物内存在 `convergeIr.staticIrDigest`，且与 `getConvergeStaticIrDigest` 一致。

## 验证
- `pnpm test -- test/StateTrait/StateTrait.StaticIr.test.ts`（@logixjs/core）✅
- `pnpm test -- test/StateTrait/StateTrait.ConvergeAuto.GenerationInvalidation.test.ts`（@logixjs/core）✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 性能与诊断证据
- 优化点：digest 计算从运行期热点迁移到 build 冷路径；运行期改为 O(1) 字段读取。
- 兼容策略：`getConvergeStaticIrDigest` 保留 fallback 计算路径，避免历史对象形态导致行为漂移。

## 独立审查
- Reviewer：subagent（`agent_id=019c8de0-74f8-7922-a00c-58dd2891520c`）
- 结论：`可合并`。

## 机器人评论消化（CodeRabbit）
- 当前状态：仅提示信息，无阻断建议；若后续新增评论，合并前继续补充处理记录。

## 风险与回滚
- 风险：若 build 侧未正确填充 `staticIrDigest`，可能导致运行期 fallback 计算被频繁触发。
- 回滚：删除 registry 预计算字段，恢复全部调用点现算 digest。
