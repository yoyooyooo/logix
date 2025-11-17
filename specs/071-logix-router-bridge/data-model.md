# Data Model: Logix Router Bridge

> 这里的 “Data Model” 指 Router Contract 的数据结构与语义约束（不是持久化表设计）。

## 1) RouteSnapshot

最小结构（MUST）：

- `pathname: string`
- `search: string`（包含 `?` 或为空字符串；由实现统一口径）
- `hash: string`（包含 `#` 或为空字符串；由实现统一口径）
- `params: Readonly<Record<string, string>>`

语义约束（MUST）：

- `pathname` 对外暴露为 router-local pathname（不包含 `basename/basepath`）；Binding 必须保证部署路径不会泄露进业务语义（必要时剥离 configured basepath，否则以结构化错误失败）。
- `search` 为 raw string（包含 `?` 前缀或空串），不做 querystring 归一化（例如 key 排序/重编码）；若顺序变化导致字符串变化，视为一次 snapshot 变化（避免在核心路径引入解析与重建开销）。
- `params` 缺失表示“键不存在”，不得用空字符串/`undefined` 作为替代值。
- `params` 表达的是 path params：值一律为字符串，不进行隐式数字/布尔转换（FR-007）；不在 params 中表达 Query Params/多值语义（Query Params 通过 `search` 获取，可使用 `Router.SearchParams`；多值用 `getAll`）。
- 快照必须自洽：同一次变更对外只暴露一个一致快照（避免 pathname 已变但 params 仍旧值）。
- 快照语义必须是“已提交/已解析”的一致状态：pending/transitioning 的中间态不得以 `RouteSnapshot` 形式对外泄露。

可选扩展（MAY，但必须 Slim & 可序列化）：

- `routeId?: string`（路由身份）
- `matches?: ReadonlyArray<{ id: string; params?: Readonly<Record<string, string>> }>`

替换性边界（IMPORTANT）：

- 上述扩展字段不属于引擎可替换的稳定保证面：不同 Router Engine 的 `routeId/matches` 语义可能不同，且可能缺失。
- 业务 logic 若使用扩展字段，必须把它们视为 `unsafe`：在缺失时可退化（或在工程层面显式声明“仅支持某类引擎/路由表形态”并为其提供测试）。

## 2) NavigationIntent

最小集合（MUST）：

- `push`
- `replace`
- `back`

建议的可扩展建模（对外 contract，可 forward-only 演进）：

```ts
export type NavigationIntent =
  | { readonly _tag: 'push'; readonly to: string }
  | { readonly _tag: 'replace'; readonly to: string }
  | { readonly _tag: 'back' }
```

语义约束：

- `replace` 不得产生多余历史记录（交由实现保证）。
- `back` 若能力不可用，必须以结构化错误失败（不得 silent no-op）。

## 3) 错误模型（RouterError）

错误必须满足：

- 可诊断（code/message/hint 可用于定位与修复）
- 可序列化（能进入诊断事件/日志）

建议的分类：

- `MissingRouterError`：未注入 Router（FR-008）
- `UnsupportedNavigationError`：当前 Router 实现不支持某类 intent（Edge Case）
- `TransactionBoundaryViolationError`：在事务窗口内尝试导航（NFR-003）
- `BasepathMisconfiguredError`：Binding 无法保证 `pathname` 为 router-local（例如 configured basepath 无法剥离）（Edge Case）

## 4) 多实例与稳定标识

- Router 实例必须是 runtime-scope 的服务实例（Tag + Layer），不得是 process-global 单例（FR-006 / NFR-004）。
- 诊断关联使用 `navSeq`：单调递增的序号（per Router 实例），不使用随机/时间作为关联锚点。
