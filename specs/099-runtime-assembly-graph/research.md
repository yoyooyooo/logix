# Research: O-006 Runtime Assembly Graph

## 背景与范围

O-006 仅聚焦 `@logixjs/core` 冷启动装配链路：

- 以显式 assembly graph 取代隐式 build/merge/patch 推断链路。
- 在报告中显式呈现 RootContext `ready` / `merge` 生命周期。
- 启动失败时输出结构化失败定位信息（阶段 + 原因码 + 上游依赖）。
- 外部 Runtime API 行为保持不变。

## 关键裁决

### Decision 1: 启动阶段采用固定最小阶段集

- 采用固定顺序阶段：
  1. `validate.modules`
  2. `validate.tags`
  3. `build.baseLayer`
  4. `build.baseEnv`
  5. `build.moduleEnvs`
  6. `merge.env`
  7. `rootContext.merge`
  8. `rootContext.ready`
  9. `process.install`
- 每个阶段都产生稳定 `stageSeq`（从 1 递增）和状态（`pending/running/succeeded/failed/skipped`）。

Rationale:

- 保证跨运行可复现、可 diff。
- 能以最小代价覆盖成功/失败定位。

Alternatives considered:

- 仅记录“高层三阶段”（validate/build/run）：粒度不足，失败定位价值低。
- 动态按内部调用栈生成阶段：可解释性更强但稳定性差，不利于回归比较。

### Decision 2: RootContext 生命周期独立建模

- 将 `rootContext.merge` 与 `rootContext.ready` 作为独立阶段上报。
- 报告中额外输出 RootContext lifecycle 记录：
  - `state`: `uninitialized|merged|ready|failed`
  - `mergedAtStageSeq` / `readyAtStageSeq`

Rationale:

- 解决“ready/merge 隐式发生”导致的定位困难。

Alternatives considered:

- 仅在日志中输出 RootContext 更新：不可结构化消费，难做测试断言。

### Decision 3: 启动失败原因码采用最小稳定集合

- `boot::module_duplicate`
- `boot::tag_collision`
- `boot::base_layer_build_failed`
- `boot::module_layer_build_failed`
- `boot::env_merge_failed`
- `boot::root_context_merge_failed`
- `boot::root_context_ready_failed`
- `boot::process_install_failed`
- `boot::unknown`

Rationale:

- 先保证最小可解释定位，再逐步扩展。

Alternatives considered:

- 直接暴露 Effect/Cause 细节分类：实现复杂且容易漂移，不利于稳定协议。

### Decision 4: 报告/诊断协议默认 Slim 且可序列化

- 报告与诊断中只保留字符串/数字/布尔/数组/对象字面量。
- 错误详情仅保留 `message`、`tag`、`reasonCode`、`stageId`、`stageSeq`。
- 禁止注入 `Context`、`Effect`、函数闭包等不可序列化内容。

Rationale:

- 与 runtime 可诊断性约束一致，便于 Devtools/快照测试。

## 性能预算与测量

- 目标：相对现状冷启动 p95 回归不超过 `5%`。
- 诊断附加成本预算：
  - `diagnostics=off`: 接近零额外开销（仅极少状态机开销）
  - `diagnostics=light`: 仅阶段摘要
  - `diagnostics=full`: 阶段摘要 + 失败上下文扩展

最小证据流程（后续补齐 before/after/diff）：

1. before：记录当前实现启动测试基线（同 env/profile）。
2. after：记录引入 assembly graph 后基线。
3. diff：验证 comparable=true，且回归在预算内。

## 事务与约束确认

- 装配阶段不在事务窗口内执行写业务状态，不引入 IO/await。
- 仅允许纯内存组合与结构化记录。
- 业务层不直接写 `SubscriptionRef`。

## 风险与缓解

- 风险：AppRuntime 单文件复杂度继续上升。
- 缓解：将装配图模型与阶段执行封装到 `core/AppAssemblyGraph.ts`，AppRuntime 仅编排。

- 风险：失败原因码映射不全。
- 缓解：提供 `boot::unknown` 兜底并在测试中覆盖最常见失败路径。
