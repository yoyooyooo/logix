# 1.4 诊断代码与触发条件（稳定不变量）

- `logic::invalid_phase`（error）：在 setup 段调用 run-only 能力（`$.use / $.onAction* / $.onState* / IntentBuilder.run* / update / mutate` 等）或 builder 顶层执行 IO 时触发；源错误为 `LogicPhaseError(kind/api/phase/moduleId)`。
- `logic::env_service_not_found`（warning/error，视实现）：Env 未完全就绪时访问 Service 触发，用于提示将 Env 访问移到 run 段；Env 铺满后再次出现则视为硬错误。
- `reducer::duplicate`（error）：同一 Action tag 注册多个 primary reducer。
- `reducer::late_registration`（error）：在该 tag 已派发过后才注册 primary reducer。
- `lifecycle::missing_on_error`（warning）：Module 发生 lifecycle 错误时缺少 `$.lifecycle.onError` 处理器。
- `state_trait::deps_mismatch`（warning）：dev/test 环境下，侦测到 computed/source 的实际读取路径与声明的 `deps` 不一致（仅提示，不影响运行时语义）。
- `module_instantiation::legacy_entry`（warning）：命中 legacy 实例化入口（如 `ModuleDef.implement(...)`）时触发；必须附带 `source`（例如 `Module.implement`）与迁移 `hint`，用于 forward-only 迁移审计。
- `trait::budget_exceeded`（warning）：事务提交前的 Trait converge 超预算，派生字段在本窗口冻结（回退到 converge 开始时的派生快照；不回滚业务入口写入）。
- `trait::runtime_error`（warning）：事务提交前的 Trait converge 运行期异常，派生字段在本窗口冻结（回退到 converge 开始时的派生快照；不回滚业务入口写入）。
- `txn_lane_policy::resolved`（info）：Txn Lane 策略解析事件。`trigger.details` 必须包含 `cacheHit/captureSeq/reason/configScope/queueMode`，用于解释“当前策略来自哪次 capture、是否命中缓存”。语义约束：override 仅在 capture/re-capture 后生效，运行中临时注入不会即时覆盖当前缓存策略。
