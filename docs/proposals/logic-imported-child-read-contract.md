---
title: Logic Imported Child Read Contract
status: consumed
owner: logic-imported-child-read
target-candidates:
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/07-standardized-scenario-patterns.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/standards/logix-api-next-guardrails.md
last-updated: 2026-04-21
---

# Logic Imported Child Read Contract

## 目标

冻结 Logic run phase 内 imported child 读取的 canonical 路径，确保它与 `Program.capabilities.imports`、parent-scope child resolution 和 selector law 保持同一条主链，不再长回 service-path、root-path 或 child-specific read family。

本页只补六件事：

- `imports` 只负责 bring-in
- child resolution 与 state read 分离
- canonical path 固定为 `$.imports.get(tag) -> child.read(selector)`
- imported child read 只允许出现在 run phase
- child query/resource 仍只通过 child state snapshot 暴露
- 未来 sugar 的 reopen gate

## 页面角色

- 本页是一个新 proposal
- 它补的是 Logic side imported-child read contract
- 它不改写 `Program.capabilities.imports` 的 root contract
- 它不改写 React host 侧的 `host.imports.get / useImportedModule`
- 它不重开 `ReadQuery`、`ExternalStore` 或 `Root.resolve` 的公开日常路径

## 当前 authority baseline

- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/07-standardized-scenario-patterns.md](../ssot/runtime/07-standardized-scenario-patterns.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./core-carry-over-support-contract.md](./core-carry-over-support-contract.md)
- [./read-query-selector-law-internalization-contract.md](./read-query-selector-law-internalization-contract.md)
- [./external-store-runtime-seam-cutover-contract.md](./external-store-runtime-seam-cutover-contract.md)
- [./resource-query-owner-relocation-contract.md](./resource-query-owner-relocation-contract.md)

## Adopted Candidate

本轮 adopted candidate 固定为：

- `Split Path Imported Child Read`

## Frozen Decisions

### 1. `imports` 只负责 bring-in

`Program.capabilities.imports` 只负责把 child Program 装进当前 parent scope。

它不负责：

- state read
- selector projection
- query / resource 直达

### 2. canonical split path

Logic 内 imported child 读取的 canonical 路径固定为：

```ts
const child = yield* $.imports.get(Child.tag)
const value = yield* child.read((state) => state.someField)
```

本页冻结的是两个动作：

- `$.imports.get(tag)`
- `child.read(selector)`

而不是 fused helper。

### 3. `$.imports.get(tag)`

`$.imports.get(tag)` 的语义固定为：

- 只在当前 parent runtime scope 内解析 imported child
- 只允许解析当前 Program 明确导入的 child
- 同一 parent scope 内，一个 `ModuleTag` 只允许绑定一个 child 实例
- 若同一 `ModuleTag` 在同一 parent scope 内出现歧义，必须 fail-fast
- 不回退到 root lookup
- 不回退到 global registry
- 不回退到 service lookup
- 未导入 child 必须 fail-fast

### 4. `child.read(selector)`

`child.read(selector)` 的语义固定为：

- 这是 imported-child projection read primitive
- 它只作用于 imported-child handle projection
- 它是 selector-based projection 的对象方法写法
- 它只读 state projection，不承载订阅语义
- 它回到 selector law
- 它不引入 `ReadQuery` noun
- 它不引入 `ExternalStore` noun
- 它不引入 source family

本页同时冻结两条边界：

- 这不恢复 `./Handle`
- 这不把 `Handle` 重新立成 core canonical/support family noun

本页只承认：

- stable returned ref object 可以承载 `read(selector)`

本页不裁决 generic `read(selector)` family，也不把 `child.read` 提升成第二 Logic 读模型。它只是 imported-child resolution 返回对象上的 projection read。

### 5. phase rule

`$.imports.get(...)` 与 `child.read(...)` 只允许出现在 Logic run phase。

build 的同步声明区不得：

- 解析 child runtime
- 读取 child state

### 6. child query / resource single-truth rule

当 child 内部使用 query/resource 时，parent Logic 读取的仍然是 child state 中的 snapshot projection。

明确禁止：

- parent 直接读 engine cache
- parent 直接读 `Query.Engine.Resource`
- parent 绕过 child state 直达 query/runtime 第二真相

### 7. 非 canonical 路径

下面这些路径不进入 v1 canonical：

- `$.use(Child.tag)` 作为 imported child read canonical
- `$.root.resolve(Child.tag)` 作为 imported child read canonical
- `$.select(child, selector)` 作为 imported child read canonical
- `$.imports.select(tag, selector)`
- `$.imports.ref(tag)`

它们若未来还要活，只能作为更薄的 reopen 候选，不能反向改写 canonical split path。

### 8. future sugar reopen gate

`$.use / $.root.resolve / $.select / $.imports.select / $.imports.ref` 若要重开，必须同时满足：

- 先过 `runtime/12` intake
- 若进入官方 sugar，再过 toolkit gate
- 必须机械回解到 `$.imports.get(tag) -> child.read(selector)`
- 不新增第二 child-resolution family
- 不新增第二读侧公式
- 不改写 phase rule 与 single-truth rule

## Non-goals

- 不把 `$.use(Child.tag)` canonical 化
- 不把 `$.root.resolve(Child.tag)` canonical 化
- 不把 `$.select(child, selector)` canonical 化
- 不把 `$.imports.select(...)` canonical 化
- 不把 declaration token / ref object 提前纳入 v1
- 不恢复 `./Handle`
- 不把 `Handle` 重新立成 core canonical/support family noun
- 不引入第二读侧公式
- 不引入第二 child-resolution family

## Rejected Canonical Paths

下面这些路径只可视为当前实现细节、expert route 或未来 reopen 候选，不进入 v1 canonical：

- service-path
- root-path
- scope-level read path
- fused-path

## Delta Proof Matrix

| closure obligation | required witness | authority owner | reopen condition |
| --- | --- | --- | --- |
| imports owner closure | Logic imported-child read 不改变 `Program.capabilities.imports` 的 owner；imports 继续只负责 bring-in | `runtime/03` + `runtime/04` + guardrails | 只有 imports contract 本身被正式重开时，才允许 reopen |
| parent-scope child resolution | `$.imports.get(tag)` 只解析 imported-only、current parent scope，且继承 `ModuleTag` 单值绑定与 duplicate-child fail-fast | 本页 + `runtime/07` | 只有 imported child resolution law 本身被正式重开时，才允许 reopen |
| imported-child split-path closure | Logic imported-child read 固定为 `$.imports.get(tag) -> child.read(selector)`，不引入第二 child-read formula | 本页 | 只有 imported-child read contract 本身被正式重开时，才允许 reopen |
| selector-law read | `child.read(selector)` 只表达 child state projection read，不引入第二读侧公式 | 本页 + `ReadQuery` 子 proposal | 只有 selector law 本身被正式重开时，才允许 reopen |
| phase safety | setup phase denial + run phase positive path 都成立；build 同步声明区不能做 imported child runtime resolution / state read，run phase 可用 | 本页 | 只有 Logic phase contract 被正式重开时，才允许 reopen |
| single-truth closure | child query/resource 只能经 child state snapshot 被 parent 读取，不得直达 engine cache / `Query.Engine.Resource` | 本页 + `Resource` 子 proposal | 只有 query/resource single-truth 被正式重开时，才允许 reopen |
| path-relapse closure | `$.use(Child.tag)`、`$.root.resolve(Child.tag)`、`$.select(child, selector)`、`$.imports.select(...)`、`$.imports.ref(...)` 在 non-archive docs/examples/tests 与长期 witness 中不回潮成 canonical imported-child read | 本页 + inventory | 只有 residue 被提升回 active authority 时，才允许 reopen |
| future sugar gate | `$.use / $.root.resolve / $.select / $.imports.select / $.imports.ref` 不进入 canonical，未来若重开只能作为更薄 sugar，并通过 `runtime/12` + toolkit gate + 机械回解证明 | 本页 + `runtime/03` + `runtime/04` + `runtime/11` + `runtime/12` | 只有能证明更小、更稳、且不引入第二主链时，才允许 reopen |

## 当前实现 witness

- Logic side 当前已新增 `$.imports.get(tag)`，并把 missing-import fail-fast 入口固定到 `logic.$.imports.get`
- imported-child canonical witness 已切到 `$.imports.get(tag) -> child.read(selector)` 与 `$.on(child.changes(selector))`
- React host law 与 SSoT 已同步写明：React 侧继续是 `parent.imports.get(tag)` / `useImportedModule(parent, tag)`，Logic 侧固定走 `$.imports.get(tag)`
- focused witness 已覆盖：
  - `packages/logix-core/test/internal/Bound/BoundApi.MissingImport.test.ts`
  - `packages/logix-core/test/internal/Bound/Bound.test.ts`
  - `packages/logix-react/test/Hooks/useImportedModule.test.tsx`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`

## Writeback Targets

### Live authority

- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`

### Superseded Authorities

下面这些 docs / proposals / examples 若后续出现与本页冲突的 imported-child read 旧句，必须显式去权威、清扫或改成 pointer：

- `docs/proposals/read-query-selector-law-internalization-contract.md`
- `docs/proposals/external-store-runtime-seam-cutover-contract.md`
- `docs/proposals/resource-query-owner-relocation-contract.md`
- `examples/logix-react/src/demos/DiShowcaseLayout.tsx`

## 当前一句话结论

Logic 内 imported child 读取的 canonical 路径固定为 `$.imports.get(tag) -> child.read(selector)`；`Program` 负责组合，scope 负责解析，selector 负责读取。

## 去向

- 消费日期：2026-04-21
- 已回写：
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
