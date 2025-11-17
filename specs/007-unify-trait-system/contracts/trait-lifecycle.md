# Contract: TraitLifecycle（Form/Query 同源下沉接口）

> 目标：TraitLifecycle 作为 kernel 归属的“标准桥接层”，统一承载 **install / Ref / scoped validate / scoped execute / cleanup**。  
> Form 与 Query 作为“特殊 Module”的默认 logics 必须基于 TraitLifecycle 实现，从而：
>
> - 领域层不再各自发明一套“如何触发/如何校验/如何清理/如何回放”的 glue；
> - 降解到 Trait IR 后仍能执行一致的冲突检测、合并与诊断/回放口径。

## 1. Ownership & Layering

- TraitLifecycle MUST 归属 `@logix/core`（kernel），是所有领域包（Form/Query/未来更多 `xxxTrait`）可复用的桥接能力。
- 领域包 MAY 为 DX re-export（例如 `Form.Ref = TraitLifecycle.Ref`、`Query.install = TraitLifecycle.install`），但语义与演进所有权仍在 kernel。

## 2. FieldRef（稳定定位字段实例）

TraitLifecycle MUST 提供可序列化的 FieldRef/FieldKey，用于 blur/change/unregister/scroll-to-error/validate 等目标表达。

最小能力要求：

- 支持 `field` / `list` / `item` / `root` 四类 target；
- 支持嵌套数组定位（listIndexPath）与 item index；
- 在数组插入/重排/删除后，FieldRef 的解释必须与“对外 index 语义”一致，并配合 cleanup 语义避免幽灵回写。

## 3. Requests（统一下沉协议）

### 3.1 ValidateRequest（scoped validate）

- `validate(target)` MUST 以依赖图反向闭包（Reverse Closure）计算最小执行集合；
- 支持 `mode`（submit/blur/valueChange/manual）以承载领域触发策略；
- 执行结果必须写回错误树，并清理 scope 内“无错误”子树，避免残留。

### 3.2 ExecuteRequest（scoped execute：用于 Query/资源操作）

TraitLifecycle MUST 提供可组合的“范围化执行”入口，用于把 Query 的手动刷新/失效等行为降解到统一执行链路中：

- refresh：触发某个 source/query 的刷新（受并发策略与 keyHash 门控约束）
- invalidate：发起失效请求（按资源/按参数/按标签），并以可回放事件进入日志

> 说明：ExecuteRequest 不引入新的 kernel kind；它只是把“领域事件”映射为既有 `source` 刷新/写回与相关诊断/回放事件。

### 3.3 CleanupRequest（确定性清理）

TraitLifecycle MUST 定义并提供结构变更时的清理语义：

- unregister / 行删除 / 重排：必须清理对应错误子树与 UI 交互态；
- 若范围内存在资源快照：必须回收为 idle（或等价未激活态），并门控所有 in-flight 结果禁止回写到已变更归属的范围。

## 4. install（桥接领域事件到 Trait 运行）

TraitLifecycle.install MUST 产出可直接挂到 ModuleImpl 的逻辑（ModuleLogic）：

- 监听（或约定）一组领域 action（Form：change/blur/validate/unregister；Query：params change/refresh/invalidate 等）；
- 在对应 action 到来时：
  - 更新 `state.ui`（全双工事实源）；
  - 发起 ValidateRequest / ExecuteRequest / CleanupRequest；
  - 所有写入必须落在同一 Operation Window 的事务内（0/1 次可观察提交）。

并且：

- install 必须发生在 ModuleRuntime/BoundApi 的运行作用域内，因为它需要读取该模块的 Program/Graph/Plan 并对当前 state 执行。

## 5. Diagnostics & Replay（统一口径）

TraitLifecycle 驱动的每一次派生/刷新/丢弃/清理，必须可被诊断与回放复现：

- 稳定标识：ruleId/stepId/fieldRef/resourceId/keyHash/txnId
- 触发原因：来自何种领域事件、触发策略、并发策略
- 输入快照：用于复现的最小必要输入视图
- 状态变更记录：patch 列表（path/from/to/reason）
