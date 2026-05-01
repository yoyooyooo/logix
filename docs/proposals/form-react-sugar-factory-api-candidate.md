---
title: Form React Sugar Factory API Candidate
status: consumed
owner: form-react-sugar-factory-api
target-candidates:
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/internal/form-api-tutorial.md
last-updated: 2026-04-17
---

# Form React Sugar Factory API Candidate

## 目标

在上一轮边界裁决已经收住的前提下，给 sugar factory 起一份更小的 exact candidate。

这份 proposal 当前只讨论：

- 官方 optional helper 的最小读侧 contract
- field/meta 在 helper 层还能保留什么
- 哪些东西必须继续延后

## 已冻结前提

这份候选只能建立在下面这些约束上：

1. owner 只认 core-owned optional host helper layer
2. `@logixjs/form` 不承接 React sugar factory
3. 当前 base scope 只承认 field/meta
4. 官方不返回稳定 `useX` family
5. list sugar 继续延后

## 当前 adopted candidate

当前采用一个更小候选：

1. 这轮只冻结 read-only helper
2. 当前只保留两类 builder：
   - field value projection builder
   - raw `$form` meta projection builder
3. `createFieldEvents` 退出本轮
4. `ReadPath` 退出本轮
5. `errorOrder` 退出本轮
6. `snapshot / summary / canSubmit / isValid / isPristine` 退出本轮
7. field error selector 继续由 `Form.Error` 的 future selector primitive 承接
8. field ui meta 继续等待单独合同

## 当前问题定义

这一轮的目标函数已经继续收紧：

- 不再追求“官方可复用的读写 helper”
- 只追求“最小可证明的读侧 primitive builders”

要解决的具体问题是：

- 官方是否能在不制造第二 host truth 的前提下，沉淀最小读侧构件

## 当前基线

绑定输入：

- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
- [form-support.ts](../../examples/logix-react/src/form-support.ts)
- [Path.ts](../../packages/logix-form/src/Path.ts)
- [Error.ts](../../packages/logix-form/src/Error.ts)

当前硬约束：

1. helper 必须完全可回解到 `useModule + useSelector + direct handle`
2. helper 不得要求 internal import
3. helper 不得把 domain error policy 抢回 core host helper
4. helper 不得把 example-local projection policy 升成 public truth

## 当前最小 contract

### A. field value projection builder

当前仅讨论这一个能力：

- 基于 field path，产出稳定 read descriptor
- 只读 values tree

当前候选形状：

```ts
interface FieldValueProjectionBuilder {
  value(path: string): SelectorInput<unknown, unknown>
}

declare function createFieldValueProjection(): FieldValueProjectionBuilder
```

当前这条能力不承接：

- error precedence
- touched / dirty
- snapshot

### B. raw `$form` meta projection builder

当前只允许读取 exact state truth 里已经冻结的 raw meta：

```ts
interface MetaProjectionBuilder {
  meta(): SelectorInput<
    unknown,
    {
      submitCount: number
      isSubmitting: boolean
      isDirty: boolean
      errorCount: number
    }
  >
}

declare function createMetaProjection(): MetaProjectionBuilder
```

当前明确不承接：

- `summary()`
- `canSubmit()`
- `isValid()`
- `isPristine()`

这些仍属于 consumer-local 推导。

## companion prerequisites

要让 field sugar 继续长全，后续至少还需要三块 companion primitive：

### 1. error selector primitive

这块继续归 Form owner：

- `Form.Error.field(path)`

它负责：

- field error selection
- precedence policy

它已经在独立 companion proposal 中冻结；本页只消费它，不再重新定义。

### 2. field-ui projection contract

当前 `ui` 仍是 `unknown`。
所以：

- `touched`
- `dirty`

当前已经在独立 companion proposal 中收口为 boundary-only：

- field-ui 是合法 companion boundary
- exact leaf shape 继续后置
- `touched / dirty` 仍只算实现与 example 观察值

### 3. write-side adapter

写侧当前继续靠 canonical handle：

- `form.field(path).set`
- `form.field(path).blur`

若未来要给写侧 sugar，需要单独 reopen。

## 为什么把它收成这样

### 1. 去掉 `ReadPath`

`ReadPath` 的问题不在“它难用”。
问题在于它把未冻结的读取 ABI 外包给调用方。

当前 candidate 改成直接产出可被 `useSelector` 消费的 selector input，避免把 hidden dependency 写进 helper config。

### 2. 去掉 field error precedence

field error precedence 属于 Form domain policy。
它不该在 core-owned host helper 里拥有第二个 owner。

所以这部分继续留给：

- `Form.Error`

### 3. 去掉 field ui meta

当前 `ui` 叶子合同还没冻结。
如果现在把 `touched / dirty` 写进 helper exact API，就会把 example-local 假设偷渡成 public truth。

### 4. 去掉 `createFieldEvents`

当前 canonical handle 已经提供：

- `form.field(path).set`
- `form.field(path).blur`

所以写侧 sugar 的价值还没有大到值得进入本轮 exact freeze。

## 当前拒绝的方向

当前继续拒绝：

- `createFormSugar(...)`
- `createFieldEvents(...)`
- `createFieldProjection(..., { readPath, errorOrder, touchedKey, dirtyKey })`
- `summary()`
- `snapshot()`
- `canSubmit()`
- `isValid()`
- `isPristine()`
- 任何官方 `useField / useMeta / useList`

## 与 `form-support.ts` 的映射

当前 [form-support.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/form-support.ts) 里的三层东西，应按下面方式拆解：

- `useFormField`
  - value 读取：未来可由 field value projection builder 兜底
  - error 读取：未来交给 `Form.Error` selector primitive
  - touched/dirty：继续留在 consumer-local，直到 field-ui 合同冻结
  - onChange/onBlur：继续留在 consumer-local
- `useFormMeta`
  - raw `$form` 读取：未来可由 meta projection builder 兜底
  - `canSubmit/isValid/isPristine`：继续 consumer-local 推导
- `useFormList`
  - 全部继续排除在本轮 scope 外

## 去向候选

若 converge 通过，回写面建议是：

- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - 记一条 read-only optional helper 边界
- [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - 明确 error selector primitive 仍归 `Form.Error`
- [form-api-tutorial.md](../internal/form-api-tutorial.md)
  - 明确 optional helper 当前只到最小读侧 contract

## reopen gate

后续只有在同时满足下面条件时，才允许继续扩这份 exact candidate：

1. 不引入第二 host truth
2. 不引入 internal import 依赖
3. 不改变 `Form.Error` 的 owner
4. 若新增 field ui meta，需要先冻结 field-ui projection contract
5. 若新增写侧 sugar，需要单独证明 direct handle 不足
6. 若新增 list sugar，需要先有 row identity 公共 projection primitive

## 当前一句话结论

当前最小可证明的 sugar-factory API 只剩 read-only：field value projection builder 加 raw `$form` meta projection builder；field error、field ui meta、写侧 adapter 和 list sugar 全部后置。

## 去向

- 2026-04-17 已消化到：
  - [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - [form-api-tutorial.md](../internal/form-api-tutorial.md)
