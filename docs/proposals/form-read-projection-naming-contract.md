---
title: Form Read Projection Naming Contract
status: consumed
owner: form-read-projection-naming
target-candidates:
  - docs/ssot/runtime/10-react-host-projection-boundary.md
last-updated: 2026-04-17
---

# Form Read Projection Naming Contract

## 目标

冻结最小读侧 helper 的 exact naming。

这轮当前只回答两件事：

1. export noun 是什么
2. import style 怎么冻结

这轮当前不再冻结：

- 独立 public subpath promotion
- namespace import 形状

## 已冻结前提

当前已冻结：

- owner 只认 core-owned optional host helper layer
- 当前只允许最小读侧
- 当前只剩两类 helper：
  - field value projection builder
  - raw `$form` meta projection builder
- 官方不产出 `useX` family

## 当前 adopted candidate

当前采用一个更小候选：

1. 这轮只冻结 export noun
2. export noun 固定为：
   - `fieldValue(valuePath)`
   - `rawFormMeta()`
3. canonical import style 固定为 named exports
4. 独立 subpath promotion 继续后置

## exact candidate

```ts
import { fieldValue, rawFormMeta } from "<core-owned optional host helper entry>"
```

其中：

- `fieldValue(valuePath)`
  - 输入按 canonical value path 理解
  - 只服务 value lane
- `rawFormMeta()`
  - 明确只服务 raw `$form` meta truth
  - 不承接 derived meta、summary、readiness formula

## 当前明确拒绝

这轮继续拒绝：

- `FormSelectors`
- `FormBinding`
- `formMeta()`
- `import * as FormProjection`
- `FormProjection.fieldValue(...)`
- 任何“最小且可扩”的 growth wording

## 为什么收成这样

### 1. 先不冻结 subpath

当前只靠两个纯读 builder，还不足以自动证明：

- 必须拥有独立 public subpath

所以这轮先把更重要的语义闭合冻住：

- noun
- import style

而不是提前把 subpath promotion 一起写死。

### 2. 为什么是 `fieldValue(valuePath)`

`path` 太宽。
它会留下：

- value path
- field path

两套解释空间。

所以当前直接收成：

- `valuePath`

### 3. 为什么是 `rawFormMeta()`

当前冻结的是 raw `$form` meta truth。
如果直接叫：

- `formMeta()`

未来很容易吸引：

- derived meta
- summary
- canSubmit / isValid

这一整层语义。

所以当前把 rawness 写进 noun。

### 4. 为什么拒绝 namespace import

如果文档写成：

```ts
import * as FormProjection from "..."
```

然后再用：

```ts
FormProjection.fieldValue(...)
```

就会在 subpath 之外，再长出一层 runtime object family。

这和当前“最小读侧 helper”目标不一致。

## authority landing

当前 exact naming 只回写到：

- [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)

其他页面只保留 corollary 或引用。

## reopen gate

后续只有在同时满足下面条件时，才允许继续重开 import path：

1. 能证明独立 subpath 真能压低 root canonical noise
2. 不会放大 projection family 预算
3. 不会变成第二套 host truth
4. 若最终保留 subpath，仍然继续只承认 named exports

## 当前一句话结论

当前最小可证明的 naming contract 只冻结两个 noun：

- `fieldValue(valuePath)`
- `rawFormMeta()`

独立 subpath promotion 和 namespace import 都继续后置。

## 去向

- 2026-04-17 已消化到：
  - [React Host Projection Boundary](../ssot/runtime/10-react-host-projection-boundary.md)
  - [Form Exact Surface Contract](../ssot/form/13-exact-surface-contract.md)
  - [form-react-sugar-factory-api-candidate.md](./form-react-sugar-factory-api-candidate.md)
