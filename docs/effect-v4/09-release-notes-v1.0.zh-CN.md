# Logix 1.0（Effect v4）发布说明（中文）

## 版本定位

- 本版本是 `v4-only` 前向演进发布，不提供 v3 兼容层，不设置弃用过渡期开关。
- 目标是统一运行时语义、统一最小 IR 与可解释诊断链路，优先保证性能与可诊断性。

## Breaking Changes

1. **Context 服务定义统一为 Tag class**
   - 不再接受新增 `Context.GenericTag` 路径。
   - 迁移后统一使用 `class X extends Context.Tag("X")<X, Service>() {}`。

2. **事务窗口禁止 IO（强约束）**
   - `StateTransaction` 同步窗口内不得 `await/Promise/sleep`。
   - 异步副作用需迁移到 task/process/workflow 的事务外阶段，再回写状态。

3. **ReadQuery 严格门禁默认纳入运行时校验链路**
   - 动态 selector 的 fallback 原因会进入严格门禁诊断事件。
   - 生产/发布口径以 strict evidence 判定，不以 triage 口径放行。

4. **ExternalStore/TaskRunner 边界收敛**
   - 业务层不再允许直接写 `SubscriptionRef`。
   - 运行时入口与调度边界统一到核心 Runtime/Scope 路径。

5. **诊断事件 Slim 化 + 可序列化**
   - 诊断事件以可序列化字段为硬门禁，移除重对象透传。
   - 稳定标识（`instanceId/txnSeq/opSeq`）作为链路锚点保留。

## 迁移指南（最小闭环）

1. 升级依赖到 Effect v4 目标版本矩阵。
2. 清理 `Context.GenericTag` 命中并替换为 Tag class。
3. 审计事务窗口：移除同步窗口内 IO。
4. 迁移 ReadQuery/Schema 旧语法命中（含 strict gate 扫描）。
5. 执行质量门：
   - `pnpm typecheck`
   - `pnpm typecheck:test`
   - `pnpm lint`
   - `pnpm test:turbo`
6. 执行性能证据门：
   - 本地 strict（quick/default，Browser+Node）
   - GitHub `logix-perf-sweep.yml`（`soak + strict`）

## 发布证据（本次）

- GitHub soak+strict run: `22588230728`
- 产物目录：`specs/103-effect-v4-forward-cutover/perf/gh-22588230728/`
- 汇总：`specs/103-effect-v4-forward-cutover/perf/s6.gh.soak.strict.summary.md`

## 风险与回滚

- 若 strict diff 出现回归，按 `quickstart.md` 的失败回滚流程冻结 gate、归档证据、回退受影响对象并重跑 gate。
- 不允许通过兼容层掩盖回归；必须以实现修复 + 证据更新收口。
