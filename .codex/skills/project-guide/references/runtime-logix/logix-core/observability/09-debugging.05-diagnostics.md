# 1.4 诊断代码与触发条件（稳定不变量）

- `logic::invalid_phase`（error）：在 setup 段调用 run-only 能力（`$.use / $.onAction* / $.onState* / IntentBuilder.run* / update / mutate` 等）或 builder 顶层执行 IO 时触发；源错误为 `LogicPhaseError(kind/api/phase/moduleId)`。
- `logic::env_service_not_found`（warning/error，视实现）：Env 未完全就绪时访问 Service 触发，用于提示将 Env 访问移到 run 段；Env 铺满后再次出现则视为硬错误。
- `reducer::duplicate`（error）：同一 Action tag 注册多个 primary reducer。
- `reducer::late_registration`（error）：在该 tag 已派发过后才注册 primary reducer。
- `lifecycle::missing_on_error`（warning）：Module 发生 lifecycle 错误时缺少 `$.lifecycle.onError` 处理器。
- `state_trait::deps_mismatch`（warning）：dev/test 环境下，侦测到 computed/source 的实际读取路径与声明的 `deps` 不一致（仅提示，不影响运行时语义）。
- `trait::budget_exceeded`（warning）：事务提交前的 Trait converge 超预算，派生字段在本窗口冻结（回退到窗口开始时的派生快照）。
- `trait::runtime_error`（warning）：事务提交前的 Trait converge 运行期异常，派生字段在本窗口冻结（回退到窗口开始时的派生快照）。
