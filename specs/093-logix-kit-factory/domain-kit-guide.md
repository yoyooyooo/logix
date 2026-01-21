# Domain Kit Guide（Router/Session/Flags…写法口径）

> 目标：给 domain kit 一个**唯一参考口径**，避免“每个业务都自创一套胶水/identity/meta/stepKey 规则”。
> 本指南不新增语义：只规定如何用 `@logixjs/core/Kit` / `KitWorkflow` 组合既有原语。

## 1) 落点与边界

- v1 推荐落点：`examples/logix/src/patterns/*`（先验证 API 写法与口径，再决定是否抽成独立 package）。
- Domain kit 是组合层：不得订阅/不得 fork/不得创建 Scope/不得隐藏 IO。
- 真相源口径：
  - 读侧：ExternalStore → `StateTrait.externalStore` 写回状态图（external-owned）。
  - 写侧：显式 command/service port（Effect）在事务外执行，再由读侧写回。

## 2) 端口契约（唯一身份锚点）

- 每个 domain kit 必须有一个稳定 `Context.Tag` 作为端口契约唯一真相源。
- `serviceId` 不由 domain kit 生成：Workflow 侧必须委托 `Workflow.call({ service: Tag })`（或 `callById`）。

## 3) stepKey 生成（稳定、确定性、显式）

- stepKey 必须稳定，禁止随机/时间/地址。
- 推荐统一用 `Kit.makeStepKey(prefix, literal)`：
  - `prefix`：domain kit 的固定前缀（例如 `router`/`session`/`flags`）
  - `literal`：操作名（例如 `navigate`/`login`/`refresh`）
- v1 不做“隐式自动补 stepKey”，避免规则漂移；domain kit 负责显式传入。

## 4) meta 规范（Root IR 只认可导出子集）

- `externalTrait({ meta })` 的 meta 仅承诺“可被裁剪为 Slim JSON 并进入 Root IR”：
  - 白名单字段：`label/description/tags/group/docsUrl/cacheGroup/canonical`
  - `annotations` 只保留 `x-*` keys，且 value 必须是 JsonValue
- 推荐：domain kit 在开发期调用 `Kit.validateMeta(meta)`（或依赖 dev warn）发现被裁剪字段，避免静默漂移。

## 5) Module-as-Source 边界（不要伪装动态实例选择）

- `Kit.forModule` 只适合“imports 可解析到唯一源模块实例”的场景。
- 若业务需要动态选择实例：把 `instanceKey/rowId` 等显式建模为数据，用 `ReadQuery/Logic` 侧选择；不要把动态选择塞进 `forModule`。
