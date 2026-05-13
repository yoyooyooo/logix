---
title: ReadQuery ExternalStore Resource Final Owner Map Contract
status: consumed
owner: read-side-owner-map-master
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# ReadQuery ExternalStore Resource Final Owner Map Contract

## 目标

冻结 `ReadQuery / ExternalStore / Resource` 三者的终局 owner map、exact survivor contract、拆分条件与实施顺序。

本页回答五件事：

- 三者是否仍需要被当成同一组 proposal 处理
- 三者各自的最终 owner 在哪里
- 哪些 exact public spelling 可以存活
- `repo-internal/read-contracts` 这条历史聚合口的终局命运是什么
- 何时可以从 umbrella proposal 进入三个独立 implementation proposal

本页不直接做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是一个 umbrella proposal
- 本页承接 `C2A2` 与 `Q1` 之间的共享裁决面
- 本页只冻结全局约束、owner map、split gate 与终局 exact surface
- 当前已拆出三个独立 proposal 分头推进

## spawned follow-ups

- [ReadQuery Selector Law Internalization Contract](./read-query-selector-law-internalization-contract.md)
- [ExternalStore Runtime Seam Cutover Contract](./external-store-runtime-seam-cutover-contract.md)
- [Resource Query Owner Relocation Contract](./resource-query-owner-relocation-contract.md)

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./core-read-projection-protocol-contract.md](./core-read-projection-protocol-contract.md)
- [./query-exact-surface-contract.md](./query-exact-surface-contract.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把下面这些点当固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先
- 领域 owner law、React host law、toolkit layer 必须单值清晰
- 不允许为这三个对象保留第二真相源、第二 runtime 心智或兼容壳层

除此之外，下面这些点全部允许被挑战：

- 三者当前被放在同一组 residual bucket 的合理性
- `repo-internal/read-contracts` 是否还配继续承接它们
- `ReadQuery` 是否还需要显式 noun 存活
- `ExternalStore` 是否还需要维持为上层通用概念
- `Resource` 是否需要在 query owner 下保留强概念
- `Resource` 在 query owner 下的 family landing
- `Query.Engine.Resource.layer([...])` 与 `Program.capabilities.services`、runtime scope 的关系

## 当前 repo witness

当前仓内有四条共享 witness，使这三者在“切除前”仍属于同一个 umbrella 问题：

### 1. 历史 proposal 把三者并列成同一批 residual

- `C2A2` 已经把三者作为同组 public-zero cut topic 处理
- `public-api-surface-inventory-and-disposition-plan` 也把三者挂在同一批 chunk 下

### 2. 当前 repo-internal 聚合口仍把三者挂在一起

`@logixjs/core/repo-internal/read-contracts` 当前仍同时导出：

- `ReadQuery`
- `ExternalStore`
- `Resource`

这说明它们虽然已经退出 public core，仓内消费面仍然沿着历史聚合口在继续耦合。

### 3. React / Query / examples / tests 仍共享这条聚合口

当前至少有下面几类消费面：

- `packages/logix-react` 用它承接 selector compile 与 external store seam
- `packages/logix-query` 用它承接 `ResourceSpec / ResourceSnapshot`
- `examples` 与大量 tests 仍按 grouped import 使用三者

### 4. 三者的终局 owner 不同，但 cutover 约束互相影响

它们的语义 owner 已经明显分流：

- `ReadQuery` 偏向 selector law
- `ExternalStore` 偏向 runtime seam
- `Resource` 偏向 query owner

但 exact landing 仍共享下面几条约束：

- core root 不能回长旧 noun
- query root 只能维持 `make + Engine`
- toolkit 不能抢 owner
- `Program.capabilities` 只正式承接 `services / imports`
- `repo-internal` 不能继续拿聚合口当永久落点

## 结论先行

本页先冻结一个全局判断：

> `ReadQuery / ExternalStore / Resource` 目前存在足够的 cutover 关联性，因此需要一页 umbrella proposal 先冻结 owner map 与 split gate。
>
> 在 owner map 与 split gate 冻结后，实施应拆成三个独立 proposal：
> `ReadQuery internalization`、`ExternalStore runtime seam cutover`、`Resource owner relocation`。

也就是说，三者的关联性主要来自：

- 当前历史分组
- 当前 repo-internal 聚合口
- 当前 docs / examples / tests 的 grouped consumption
- 当前 exact landing 需要共享同一套全局约束

它们的终局语义不共享 owner。

## Final Owner Map

| concept | 终局语义角色 | 终局 owner | 公开 survivor | repo-internal fate |
| --- | --- | --- | --- | --- |
| `ReadQuery` | selector compile / quality / strict gate / read metadata | `@logixjs/core` internal selector law | 无显式 noun survivor | 退出 `read-contracts` 聚合口；若仓内仍需窄合同，只能去更窄 selector owner |
| `ExternalStore` | external input descriptor + install / notify / scheduler seam | `@logixjs/core` internal runtime + field seam，外加 `@logixjs/react` internal store/hooks | 无显式 noun survivor | 退出 `read-contracts` 聚合口；声明侧若仍需仓内合同，只能回到更窄 field/runtime owner |
| `Resource` | resource spec / registry / key hash / snapshot / engine integration | `@logixjs/query` | `Query.Engine.Resource` | 彻底退出 core 的 `read-contracts` 聚合口，query owner 自持实现与 contracts |

## 三个终局判断

### 1. `ReadQuery`

`ReadQuery` 的历史价值主要在：

- selector compile
- static IR
- quality grading
- strict gate
- runtime read metadata

它对 day-one 用户心智的价值已经非常弱。当前公开 React 读侧主链已经是：

- `useSelector(handle)`
- `useSelector(handle, selector, equalityFn?)`

因此本页冻结：

- `ReadQuery` 不再作为 public 或 repo-consumer 级主名词继续推广
- `ReadQuery` 的真实价值回收到 selector law 内部实现
- Form / React 的 selector helper 不再把“显式 `ReadQuery` noun”当成教学对象
- 若 helper 仍需要一个内部 descriptor，它只作为 selector pipeline 内部工件存在

终局要求：

- `useSelector(handle, selector)` 是唯一用户级读侧心智
- `selector compile / strict gate / quality` 留在 core internal
- 不新增 `ReadQuery` 的 toolkit 官方糖

### 2. `ExternalStore`

`ExternalStore` 的历史价值主要在：

- 外部输入接入
- module-as-source
- tick / notify / no-tearing
- runtime install seam
- React store subscription seam

它服务的是 runtime / host 边界，不是领域 owner truth。

因此本页冻结：

- `ExternalStore` 不再作为 public core 或 repo-consumer 级主名词扩散
- 这条能力保留在 runtime / field install / React internal store seam 中
- 若未来确有高频 authoring sugar，候选只允许进 toolkit

终局要求：

- 调度、通知、module-as-source、field external-store install 继续存在
- noun `ExternalStore` 不再被当成 day-one 教学概念
- `packages/logix-react` 内部 store / hook 可以继续消费这条 seam
- `@logixjs/core/repo-internal/read-contracts.ExternalStore` 不能作为永久 landing

### 3. `Resource`

`Resource` 的历史价值与前两者不同。它承接的是：

- resource spec
- runtime registry
- snapshot shape
- direct load
- query engine integration
- 失效、缓存、去重、取消的解释锚点

因此本页冻结：

- `Resource` 概念强存活
- 它不回 `@logixjs/core`
- 它的 owner 固定在 `@logixjs/query`

本页进一步冻结公开 family landing：

```ts
Query.Engine.Resource
```

当前子成员是否继续公开，不在本页一把锁死；后续只允许在 `Resource owner relocation` 子 proposal 中按 `why-public / why-Engine-child / why-not-internal-or-supporting-residue` 逐项证明。

本页同时冻结两条资源作者面规则：

- app authoring 层优先使用 app-local `ResourceRef` 纯数据常量，只保留 `id` 与展示型 `meta`
- query runtime integration 层使用 query-owned `ResourceSpec`

当前建议形态：

```ts
export const SearchResource = {
  id: 'search',
  meta: {
    label: '搜索',
    tags: ['query'],
  },
} as const

const SearchSpec = Query.Engine.Resource.make({
  id: SearchResource.id,
  keySchema: SearchKeySchema,
  load: (key) => SearchService.fetch(key),
})
```

## Query Resource Terminal Contract

`Resource` 迁到 query owner 后，本页冻结下面四条约束：

### 1. 图纸层只认 `resourceId + key`

无论 query DSL 还是 field source declaration，最终 runtime truth 只保留：

- `resourceId`
- `key`
- `keyHash`

Query / Field 图纸层不直接承载真实 `load` 实现。

### 2. `ResourceRef` 与 `ResourceSpec` 分离

`ResourceRef`：

- app-local 纯数据常量
- 承接 `id`
- 可选承接展示型 `meta`
- 不承接 runtime policy

`ResourceSpec`：

- query owner 下的 runtime integration object
- 承接 `keySchema`
- 承接 `load`
- 承接 query runtime 所需的 resource-level meta

### 3. 单真相仍在模块 state

即使 engine 持有缓存、去重或取消状态：

- query snapshot 仍要投影回 `state.queries.*`
- engine cache 不构成第二 truth

### 4. direct load 仍然存在

没有外部 engine 时：

- `Query.Engine.Resource.make(...).load` 仍可直接驱动加载
- 只有显式注入 `Query.Engine.layer(engine)` 与 `Query.Engine.middleware()` 时，外部 engine 才接管策略

## Query Engine Resource Family Landing

本页冻结 query owner 下的 family landing：

```ts
export const Engine = {
  layer,
  middleware,
  Resource: { /* query-owned resource family landing */ },
}
```

硬约束：

- `@logixjs/query` root 继续只保留 `make + Engine`
- 不新增 `@logixjs/query/Resource`
- 不把 `Resource` 重新抬成 query root 第三个 noun

## Capabilities / Scope Contract

`Query.Engine.Resource.layer([...])` 的类型终局固定为 `Layer`。

因此它进入 `Program.make` 时，只允许走：

- `Program.capabilities.services`

合法示意：

```ts
const AppProgram = Logix.Program.make(App, {
  capabilities: {
    services: Layer.mergeAll(
      Query.Engine.Resource.layer([SearchSpec]),
      Query.Engine.layer(engine),
    ),
  },
})
```

runtime middleware 属于单独 slot，示意固定为：

```ts
const runtime = Logix.Runtime.make(AppProgram, {
  layer: Layer.mergeAll(
    Query.Engine.Resource.layer([SearchSpec]),
    Query.Engine.layer(engine),
  ),
  middleware: [Query.Engine.middleware()],
})
```

本页同时冻结一条教学顺序：

- 若资源与 engine 能力属于 program 固有环境，可以放进 `capabilities.services`
- 若目标是 route / subtree / runtime scope 级切换，主教学继续优先 runtime scope 与 `RuntimeProvider` overlay

因此：

- `Program.capabilities.resources` 禁止存在
- `Program.capabilities.imports` 继续只接受 `Program`
- `Query.Engine.middleware()` 不进入 `Program.capabilities.services`
- `RuntimeProvider` / runtime scope 继续承接可插拔 overlay 场景

## repo-internal Dismantling Contract

`@logixjs/core/repo-internal/read-contracts` 当前只可被视为历史 cutover residue。

本页冻结它的终局命运：

- 它不能成为这三者任何一个的永久 owner landing
- 它后续必须继续收窄、拆散或删除

拆解方向固定为：

### `ReadQuery`

- 下沉到更窄 selector owner
- 或彻底只留 internal，不再保留 repo-consumer contract

### `ExternalStore`

- 若 declaration side 仍需要仓内合同，优先回到 `field-contracts`
- 若 runtime side 仍需要仓内合同，优先回到 `runtime-contracts`
- React internal store / hook 自己的实现合同留在 `packages/logix-react/internal/**`

### `Resource`

- 从 core repo-internal 完全移除
- query owner 自持实现与测试 witness

本页因此明确拒绝：

- 把 `Resource` 临时塞进 `InternalContracts`
- 把 `Resource` 继续挂在 core `read-contracts`
- 为了通过 examples 编译而保留新的 grouped fallback import

## 为什么这页写完后就可以拆成三个独立 proposal

这页冻结完成后，三者之间剩余的共享变量只剩“执行组织顺序”，不再剩下终局 owner 冲突。

拆分门固定为下面四项：

1. 终局 owner map 已冻结
2. `Resource` family landing 已冻结为 `Query.Engine.Resource`
3. `Layer` 注入规则已冻结为 `capabilities.services` 或 runtime scope
4. `repo-internal/read-contracts` 的终局命运已冻结为“继续拆散，不得停驻”

这四项已经满足，因此后续实施按下面三页独立 proposal 推进：

- `ReadQuery internalization`
- `ExternalStore runtime seam cutover`
- `Resource owner relocation`

## 三个独立 proposal 的 scope

### Proposal A: `ReadQuery internalization`

对应文档：

- [ReadQuery Selector Law Internalization Contract](./read-query-selector-law-internalization-contract.md)

负责：

- selector law 的 exact internal landing
- `useSelector` 与 helper 的读侧 contract
- quality / strict gate / static IR 的 internal owner
- `ReadQuery` noun 从 repo consumer 心智中退出

不负责：

- external store seam
- resource relocation

### Proposal B: `ExternalStore runtime seam cutover`

对应文档：

- [ExternalStore Runtime Seam Cutover Contract](./external-store-runtime-seam-cutover-contract.md)

负责：

- external input descriptor 的 declaration owner
- runtime install / notify / tick seam 的 internal landing
- `packages/logix-react` internal store 与 `useSelector` 的协作边界
- `module-as-source` 相关 tests 与 examples

不负责：

- query resource owner
- selector law exact internal naming

### Proposal C: `Resource owner relocation`

对应文档：

- [Resource Query Owner Relocation Contract](./resource-query-owner-relocation-contract.md)

负责：

- `ResourceSpec / Snapshot / keyHash / registry` 迁到 `@logixjs/query`
- `Query.Engine.Resource` family landing
- query package / examples / docs 的 resource rewrite
- core internal 从 resource owner 退场

不负责：

- external store seam 的最终实现细节
- selector law exact internal naming

## 实施顺序

推荐顺序固定为：

1. `ReadQuery internalization`
2. `ExternalStore runtime seam cutover`
3. `Resource owner relocation`
4. 清理 `repo-internal/read-contracts` 聚合口

原因：

- `ReadQuery` 与 React selector 路线先收口后，读侧心智会先稳定
- `ExternalStore` 接着收成 runtime seam，可以清掉“上层通用 noun”残留
- `Resource` 最后迁 owner，能直接在 query owner 下落 family landing

## 验证门

### `ReadQuery`

- selector compile / strict gate tests 通过
- `useSelector` 窄更新与 lane tests 通过
- form selector helper 与 host projection witness 对齐

### `ExternalStore`

- field external-store runtime tests 通过
- module-as-source tests 通过
- tick / no-tearing / scheduler / txn window tests 通过
- React internal store perf boundary tests 通过

### `Resource`

- query engine integration tests 通过
- direct load fallback tests 通过
- invalidation / cache reuse / race tests 通过
- examples 中的远程数据加载、异步校验场景通过

### 总门

- `@logixjs/core` public root 与 package exports 继续不暴露三者
- `@logixjs/query` root 继续只暴露 `make + Engine`
- 文档与 examples 不再把这三者当成同组 public noun 教学

## 文档回写要求

当这页被消费时，最少回写面固定为：

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/11-toolkit-layer.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

## 执行硬门

这三份 follow-up proposal 在进入真正实现前，统一追加下面这组 execution gate：

- `workspace exports / allowlist` 关闭证明
- `public d.ts` noun extinction 或 landing coherence 证明
- `non-archive docs/examples/tests residue` 清扫证明
- `repo-internal` 路线关闭或下沉证明
- `old proposal de-authorize` 回写完成

实现阶段若不能把上面这些 witness 做成可重复验证事实，就不能宣称 cutover 完成。

建议把这组 gate 直接当成 closure CI：

- allowlist / exports 边界测试
- public type surface 检查
- residue grep 或清单式 witness
- proof matrix 对应的正向行为 witness

若这页消费时已拆成三个子 proposal，还必须：

- 在三个子 proposal 中补引用本页
- 在本页 `## 去向` 中写清三个子 proposal 的去向和消费日期

## 禁止项

- 不恢复任何 core public alias
- 不新增 `@logixjs/query/Resource` subpath
- 不把 `Resource` 临时停在 core `InternalContracts`
- 不让 `repo-internal/read-contracts` 成为永久 owner
- 不为了迁移稳定性保留旧 noun lineage
- 不给 `ExternalStore` 新开第二套上层 authoring family
- 不把 `ReadQuery` 重新教成 day-one selector noun

## 当前一句话结论

这三个对象当前仍需要一个 umbrella proposal 先冻结 owner map 与 split gate；冻结完成后，实施必须拆成三页独立 proposal，终局去向固定为：`ReadQuery -> selector law internal`，`ExternalStore -> runtime/react seam internal`，`Resource -> Query.Engine.Resource family landing`。

## 去向

- 消费日期：2026-04-21
- 已拆分并由以下子 proposal 完成实现与 proof：
  - `docs/proposals/read-query-selector-law-internalization-contract.md`
  - `docs/proposals/external-store-runtime-seam-cutover-contract.md`
  - `docs/proposals/resource-query-owner-relocation-contract.md`
- 相关总清单与 authority 已回写：
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/08-domain-packages.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/11-toolkit-layer.md`
  - `docs/standards/logix-api-next-guardrails.md`
