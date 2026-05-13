---
title: Form API Shape Signoff Brief
status: proposed
target:
  - docs/ssot/form/06-capability-scenario-api-support-map.md
  - docs/ssot/form/05-public-api-families.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-23
---

# Form API Shape Signoff Brief

## 目标

把 `specs/155-form-api-shape` 当前已经收口的 API 形状，整理成一份给拍板用的上层综述。

这页只回答四个问题：

1. 当前已经进 authority、也已经有代码的 Form API 长什么样
2. `155` 当前已经定下来的下一层 API 形状长什么样
3. 哪些点还故意没有冻结
4. 这次拍板真正需要确认的硬边界是什么

## 当前 adopted claim

1. Form 当前公开面已经分成三层：
   - 已进 authority、也已有代码的当前层
   - `155` 已收口、待升格的下一层
   - 明确 defer 的 residual 点
2. `AC3.3 companion-residual-closed` 仍是 `155` 当前最强候选，暂时没有更强 challenger。
3. 这次真正要拍板的核心对象是：
   - `source / companion / rule / submit / host` 这条 owner split
   - `field-only` 字段侧辅助信息通道
   - `availability / candidates` 这组 day-one slot
4. `companion({ lower })` 当前是经过 `C004` 冻结后的 no-better concrete spelling 与 implementation baseline sketch。真正冻结对象是 `carrier-neutral atomic bundle semantics`，monolithic return object 只算具体 JS sketch。

## 分层快照

| 层级 | 当前状态 | API 形状 | 备注 |
| --- | --- | --- | --- |
| 当前 authority + 当前代码 | 已冻结 | `Form.make`、`Form.Rule`、`Form.Error`、`field(path).source(...)`、`FormHandle`、`useModule + useSelector`、`fieldValue`、`rawFormMeta`、`Form.Error.field(path)` | 这是今天已经能写、已经能跑、也已经进 SSoT 的部分 |
| `155` 下一层 | 已收口，待升格 | `field(path).companion({ deps, lower })` 当前 implementation baseline sketch，对应一条字段侧辅助信息通道 | `C004` 当前结论是 no strictly better concrete spelling；hard law 冻结的是 owner / slot / atomic bundle semantics，exact carrier 继续后置 |
| defer | 故意不冻 | exact read carrier noun、exact diagnostics object、exact `ui` landing path、`list().companion / root().companion` | law 已经够强，名词和对象形状继续后置 |
| reject | 已拒绝 | generic `watch / computed`、把本地协调塞进 `source`、把 `field/list/root` 全开成 local-soft-fact family、第二 diagnostics truth | 这些方向不再回到主搜索空间 |

## Execution Snapshot

- 代码里已经有：
  - `Form.make(...)`
  - `field(path).source(...)`
  - `FormHandle.field(...) / fieldArray(...) / submit()`
  - `fieldValue(...) / rawFormMeta() / Form.Error.field(path)`
  - `fieldArray(...).byRowId(...)` 这条写侧 identity route
- 代码里当前还没有：
  - `field(path).companion(...)`
- 也就是说，这页描述的是：
  - 当前 authority 的真实形状
  - 加上 `155` 已经定下来的下一层 promotion baseline
  - 以及这条 baseline 背后的硬原则，不把当前 concrete sketch误读成 exact authority

## Read-Side Snapshot

- canonical host gate：
  - `useModule + useSelector(handle, selector, equalityFn?)`
- main teaching lane：
  - inline selector / sanctioned selector recipe
- 当前读侧 helper：
  - `fieldValue(path)`：core adjunct convenience，继续只算 reopen target
  - `rawFormMeta()`：core raw trunk adjunct
  - `Form.Error.field(path)`：form-owned selector primitive / explain-support primitive
- deferred：
  - companion exact read carrier
  - row-heavy exact carrier noun
  - exact diagnostics object
  - `ui` internal path

## 一屏心智

从上层看，当前目标形状已经很清楚。下面这段代码只代表当前 implementation baseline sketch：

```ts
const OrderForm = Form.make("order", config, ($) => {
  $.field("countryId").source(...)
  $.field("warehouseId").source(...)

  $.field("warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: ...,
        candidates: ...,
      }
    },
  })

  $.field("warehouseId").rule(...)
  $.submit(...)
})

const form = useModule(OrderForm)

const value = useSelector(form, fieldValue("warehouseId"))
const meta = useSelector(form, rawFormMeta())
const issue = useSelector(form, Form.Error.field("warehouseId"))

yield* form.submit()
yield* form.fieldArray("items").byRowId("row-1").update(...)
```

要点只有五条：

- `Form.make(...)` 继续是唯一 declaration act
- `source` 只接 Query-owned remote fact
- `companion` 负责给字段补一层同步算出来的辅助信息
- `rule / submit` 继续承接最终约束与提交真相
- `host` 继续只做 acquisition、selector read 与渲染投影
- 当前 `lower() -> object` 只代表 baseline sketch，不进入硬 authority

## 角色分工

### 1. `source`

- owner：Query-owned remote fact ingress
- 位置：`field(path).source({ resource, deps, key, ... })`
- 责任：拉远端事实、生成最近一次 source 结果
- 禁区：不吸收本地协调层，不长第二 remote protocol

### 2. `companion`

- owner：字段侧辅助信息通道
- 位置：当前最强 concrete spelling 是 `field(path).companion({ deps, lower })`
- 责任：基于 `value / deps / source?` 产出本地 soft fact
- 教学 gloss：
  - `companion = 给字段补一层辅助信息`
  - `lower = 同步计算函数`
- day-one slot：`availability`、`candidates`
- 当前原则：只冻结 `clear / bundle` 的语义与 owner-local atomic commit，不冻结 exact authoring carrier
- 禁区：不写 `values / errors / submit truth`，不做 IO，不长第二 read family

### 3. `rule`

- owner：sync/effect contributor 与最终不变量
- 责任：兜底最终约束，例如跨行互斥、唯一性、提交前阻塞
- 结论：`companion` 给局部可用性与候选集合，`rule` 给最终裁决

### 4. `submit`

- owner：submit truth
- 责任：把 pending、stale、blocking、decoded verdict 收到同一条提交真相

### 5. `host`

- owner：core runtime
- 位置：`useModule + useSelector`
- 责任：acquisition、pure projection、渲染映射
- 当前读侧 helper：`fieldValue`、`rawFormMeta`、`Form.Error.field(path)`

## 场景展开

本节只是一份拍板用 narrative walkthrough。稳定场景 ID、覆盖状态、API 组合与 proof route 统一以 [docs/ssot/form/06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md) 的 `SC-A..SC-F` 主矩阵为准。

### 场景 A / SC-A：最小稳定表单

这是今天已经冻结、也已经有代码的主链：

```ts
const ProfileForm = Form.make(
  "profile",
  {
    values: ProfileValues,
    initialValues: {
      name: "",
      email: "",
    },
  },
  (form) => {
    form.field("name").rule(Form.Rule.required())
    form.field("email").rule(Form.Rule.email())
    form.submit({ decode: ProfilePayload })
  },
)
```

这里体现的 API 形状是：

- 顶层只有一个 authoring act
- field-level 声明继续围绕 `rule / source`
- `submit` 单独承接 decode 和 submit lane

### 场景 B / SC-B：远端依赖字段

远端依赖继续固定走 `source`：

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => (countryId ? { countryId } : undefined),
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

这个场景说明：

- 远端事实入口只有一条
- `deps` 是唯一显式依赖 authority
- `source` 的职责是把 Query-owned fact 接进 Form
- 本地协调还没进来

### 场景 C / SC-C：远端 options + 本地协调

这是 `155` 当前真正定下来的补位：

```ts
items.item((row) => {
  row.field("warehouseId").source({
    resource: WarehouseOptions,
    deps: ["countryId"],
    key: (countryId) => (countryId ? { countryId } : undefined),
    triggers: ["onMount", "onKeyChange"],
    debounceMs: 120,
    concurrency: "switch",
  })

  row.field("warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      const options = ctx.source?.data ?? []
      const taken = new Set(
        (ctx.deps["items.warehouseId"] as ReadonlyArray<string | undefined> | undefined)?.filter(Boolean),
      )

      return {
        availability: {
          kind: "interactive",
        },
        candidates: {
          items: options.filter((option) => option.id === ctx.value || !taken.has(option.id)),
          project: {
            value: "id",
            label: "name",
          },
          keepCurrent: true,
        },
      }
    },
  })
})
```

这个场景体现了 `155` 的核心判断：

- `source` 继续持有远端 options
- `companion` 只负责把 options 降成本地候选集合和可用性
- `companion` 仍然只挂在 field 上
- 本地 soft fact 不需要变成 `watch / computed`

### 场景 D / SC-D：跨行互斥与最终约束

`companion` 解决局部可用性，`rule` 解决最终一致性：

```ts
items.rule(
  Form.Rule.sync({
    deps: ["warehouseId"],
    validate(rows, issue) {
      const seen = new Map<string, number[]>()
      rows.forEach((row, index) => {
        const value = String(row.warehouseId ?? "").trim()
        if (!value) return
        const bucket = seen.get(value) ?? []
        bucket.push(index)
        seen.set(value, bucket)
      })

      for (const indexes of seen.values()) {
        if (indexes.length <= 1) continue
        for (const index of indexes) {
          issue.row(index, "warehouseId", {
            origin: "rule",
            severity: "error",
            code: "warehouse.duplicate",
          })
        }
      }
    },
  }),
)
```

这段代码说明：

- `companion` 不负责最终裁决
- 跨行唯一性仍归 `rule`
- `availability / candidates` 是 soft fact
- 错误、pending、cleanup、stale 的 explain 继续走统一 evidence envelope

### 场景 E / SC-E：row-heavy 写侧与读侧

row-heavy 场景当前已经有写侧 contract：

```ts
yield* handle.fieldArray("items").swap(0, 2)
yield* handle.fieldArray("items").byRowId("row-1").update({
  id: "row-1",
  warehouseId: "WH-2",
})
yield* handle.fieldArray("items").replace(nextItems)
```

读侧结论当前是：

- canonical route 继续只认 `useSelector(handle, selectorFn)`
- row-heavy exact read carrier noun 继续 defer
- 如果未来要重开 exact carrier，优先看既有 `byRowId` 家族能否承接

### 场景 F / SC-F：React acquisition、读侧 helper 与 diagnostics

今天已经冻结的读侧长这样：

```tsx
const form = useModule(ProfileForm)

const name = useSelector(form, fieldValue("name"))
const meta = useSelector(form, rawFormMeta())
const emailIssue = useSelector(form, Form.Error.field("email"))
```

这一层的结论是：

- host acquisition 继续在 core route
- 纯读取继续在 `useSelector` 这条单一 host gate
- `fieldValue` 继续只算 core adjunct convenience
- `rawFormMeta()` 继续只算 raw trunk adjunct
- `Form.Error.field(path)` 继续只算 form-owned selector primitive / explain-support primitive
- `155` 的方向偏向 single host gate 主链，`fieldValue` 只按 reopen target 理解

## Hard Law、Soft Recipe、Optional Sugar

`155` 里当前真正稳定下来的，是分层和 carrier-neutral 语义；concrete spelling 尚未全部冻结。

| 层 | 当前结论 | 这次拍板该怎么理解 |
| --- | --- | --- |
| Hard law | owner split 固定为 `source / companion / rule / submit / host`；owner scope 固定为 `field-only`；slot inventory 固定为 `availability / candidates`；read side 固定为 `single host gate + selector helper taxonomy`；diagnostics truth 继续单一；carrier 继续只冻结 `clear / bundle + single-frame atomic commit` | 这部分可以直接拍板 |
| Soft recipe | 推荐 authoring 顺序是 `source -> companion -> rule`；复杂 toB proof 优先按这条组合解释；当前 companion baseline 继续允许 `lower() -> { availability?, candidates? } | undefined`，并优先讲成“一次同步计算出的整包结果” | 这是默认写法，不进入额外公理面 |
| Optional sugar | `companion` 这个 noun、`lower` 这个 callback spelling、exact carrier 的 framing wording、`undefined => clear`、未来可能出现的极薄 helper | 这是 concrete spelling 层；`C004` 当前结论是 no-better，`C004-R1` 当前结论是 exact carrier 仍无 strict-better challenger |

## 当前故意不冻的点

下面这些点已经有明确处理策略，但当前不该抢跑成 exact contract：

- row-heavy exact read carrier noun / import shape
- exact diagnostics object shape
- `companion` 的 exact `ui` landing path
- `companion` 的 exact authoring carrier shape
- `list().companion / root().companion`

当前对应的冻结结论分别是：

- read carrier：`deferred, byRowId-first reopen bias`
- diagnostics object：`deferred, no second-system shape`
- exact carrier：`deferred, carrier-neutral atomic bundle law already frozen; current compare = A > C > B`
- roster-level soft fact：`no irreducible roster-level soft fact`

当前 exact carrier 的阶段性残余也已经收紧：

- 当前 baseline 更适合被解释成“一次同步计算出的整包结果”
- 它有 bounded taste scar
- 只有第三 slot 或 per-slot divergence 出现实证，才重开 exact carrier

## 这次拍板真正要确认什么

如果按这页拍板，我建议直接确认下面四件事：

1. Form 的下一层 API 形状，确实需要一条字段侧辅助信息通道。
2. 这条 lane 的 owner split 固定在 `source / companion / rule / submit / host`。
3. day-one 公开能力只开 `availability / candidates`，不放开 `list/root` scope，并且只冻结 `clear / bundle + atomic commit` 的 carrier-neutral 语义。
4. 读侧继续只认 `single host gate`；`fieldValue / rawFormMeta / Form.Error.field` 只按 selector helper 分类解释；row-heavy carrier、diagnostics object、exact companion carrier 继续后置。

## See also

- [06-capability-scenario-api-support-map.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/06-capability-scenario-api-support-map.md)
- [specs/155-form-api-shape/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/spec.md)
- [candidate-ac3.3.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/candidate-ac3.3.md)
- [discussion.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/155-form-api-shape/discussion.md)
- [13-exact-surface-contract.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/13-exact-surface-contract.md)
- [05-public-api-families.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/form/05-public-api-families.md)
- [10-react-host-projection-boundary.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/10-react-host-projection-boundary.md)
- [06-form-field-kernel-boundary.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/ssot/runtime/06-form-field-kernel-boundary.md)

## 当前一句话结论

从上层看，Form API 形状已经收口成一个很小的结构：今天的 authority 负责 `Form.make + source + handle + core host route`，`155` 负责补上一条字段侧辅助信息通道；`C004` 当前把 `companion({ lower })` 冻成 no-better concrete spelling，但真正冻结的是 carrier-neutral atomic bundle semantics，其余 exact noun 和 exact carrier 继续后置。
