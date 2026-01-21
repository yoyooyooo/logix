# Contract: Diagnostics & Errors（Kit）

## 0) 原则

- Kit 自身不引入新的诊断协议（避免并行真相源与成本失控）。
- 失败模式以 **fail-fast** 为主，且尽量复用下游原语的错误语义（ExternalStore/ReadQuery/Workflow）。

## 1) Fail-fast 场景（必须）

### 1.1 Module-as-Source 的 selectorId 不稳定

- 触发：`ReadQuery.compile(readQuery)` 落入 `fallbackReason="unstableSelectorId"`
- 行为：必须抛出 `ExternalStoreRuntimeError`（code=`external_store::unstable_selector_id`）
- 事实源：`packages/logix-core/src/ExternalStore.ts`（`ExternalStore.fromModule`）

Kit 约束：

- `Kit.forModule` 不能吞掉或弱化该错误；
- 快速修复路径：显式使用 `ReadQuery.make({ selectorId, reads, ... })` 或提供可稳定编译的 selector。

### 1.2 moduleId 不可解析（传入只读 ModuleHandle）

- 触发：`ExternalStore.fromModule` 无法从入参解析 moduleId
- 行为：抛出 `ExternalStoreRuntimeError`（code=`external_store::unresolvable_module_id`）
- 修复：传入 ModuleTag/Module/ModuleImpl/ModuleRuntime（而不是只读 handle）

### 1.3 Module-as-Source 未解析到唯一源模块实例（imports 缺失/不唯一）

- 触发：install/runtime 期从 imports 解析 source runtime 失败（`moduleId` 对应的源模块未被 imports 引入，或解析不唯一）
- 行为：必须 fail-fast，并在错误信息中同时包含：
  - “Fix: include the source ModuleTag in module imports”
  - “`Kit.forModule` 不支持运行时动态选择某个 instance；如需动态选择请改为数据建模 + ReadQuery/Logic 侧选择”
- 事实源：`packages/logix-core/src/internal/state-trait/external-store.ts`（Module-as-Source install）

## 2) 诊断事件（v1）

v1 不新增事件；但允许在实现阶段加入 **开发态** 断言（例如 `isDevEnv()` 下 warn）来提醒：

- kit 创建在 render 路径重复执行（导致对象抖动）
- domain kit 生成的 stepKey 不稳定或缺失（可在 plan/tasks 中提升为硬门禁）
- externalTrait.meta 不可导出：`sanitize(meta)` 丢弃了用户提供的字段（避免“看起来写了 meta，但 Root IR/Devtools 里没有”的静默漂移；可配合 `Kit.validateMeta(meta)`）
- Module-as-Source 误用为“动态实例选择”：例如试图用同一个 ModuleTag 表达多个实例（imports 解析不唯一时，应明确改为数据建模/ReadQuery/logic 侧动态解析）

如新增任何事件，必须同步更新：

- `specs/093-logix-kit-factory/spec.md`（NFR/SC）
- `specs/093-logix-kit-factory/contracts/*`
