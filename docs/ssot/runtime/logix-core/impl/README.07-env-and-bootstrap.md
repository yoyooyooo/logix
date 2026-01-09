# Env 初始化与 Logic 启动时序（最终规范）

> 状态：draft 段落已吸收并实施，未来迭代以此为基线；不再依赖 `docs/specs/drafts/L4/L6`。

## 三层模型（实现视角）

1. **Module 蓝图层（import 期）**
   - `Logix.Module.make`（ModuleDef）仅声明 Schema 与静态 reducer；禁止访问 Env/Service，也不触发任何 Effect。
2. **Module 实例启动层（t=0）**
   - `ModuleRuntime.make` 创建 stateRef/actionHub/lifecycle，并执行所有 Logic 的 **setup 段**（注册 reducer / lifecycle / Debug/Devtools hook）。
   - setup 段不可访问 Env，不做 IO，必须幂等；StrictMode 重跑时若重复注册会通过诊断提示，而非静默覆盖。
3. **完全铺好 Env 的 Runtime 层**
   - AppRuntime / RuntimeProvider 完成 `envLayer` 构建后，统一 `forkScoped(plan.run)` 启动 Logic 的 **run 段** 与 processes。
   - 此后若出现 `Service not found` 视为真实配置错误（硬错误信号），不再有“初始化噪音”。

## LogicPlan 与 BoundApi 视图

- `ModuleDef.logic(($)=>Effect)` 在内部被提升为 `LogicPlan = { setup, run }`：return 前的同步注册被收集为 setup，return 的 Effect 作为 run。旧写法自动视为 `setup=Effect.void`、`run=原逻辑`。
- BoundApi 在 setup 阶段仅暴露注册类 API；run 阶段暴露完整 `$`。所有 Runtime 只与 LogicPlan 对话，不再直接 fork 整坨 Logic Effect。

## 诊断与防呆

- **phase 守卫**：在 setup 段调用 `$.use/$.onAction/$.onState/...` 等 run-only 能力会抛出 `LogicPhaseError`，经 DebugSink 转为 `diagnostic(error) code=logic::invalid_phase kind=...`，提示将调用移至 run 段。
- **unsafe effect**：在 builder 顶层执行 `Effect.run*` 会转为 `diagnostic(error) code=logic::setup_unsafe_effect`，提示将 IO 放入 run 段或 Process。
- **重复注册**：setup 幂等性通过诊断折叠提示，仍保持「每个 tag 至多一个 primary reducer」的不变式。
- **Env 缺失**：`logic::env_service_not_found` 仅用于真实缺失（Env Ready 后仍找不到 Tag），作为硬错误提示；初始化阶段因设计不会再触发该诊断。
