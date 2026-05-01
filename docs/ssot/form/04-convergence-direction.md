---
title: Form Convergence Contract
status: living
version: 7
---

# Form Convergence Contract

## 目标

冻结 form 主链收敛 contract，把 living 方向文档从 form SSoT 主链里清掉。

## 当前页面角色

- 本页只负责 invariants、dependency DAG、freeze gate 与 proof obligation
- form 主缺口的定义继续看 [./02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- owner split 继续看 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- form 与 field-kernel 的 cross-layer boundary 继续看 [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)

本页不再重复定义：

- 主缺口正文
- owner 结论
- host projection 边界

## 终局成功 Contract

后续任何细化规划，只有同时满足下面四条硬门，才算仍在 Form 北极星上推进：

### 1. `single-chain`

Form 继续只沿：

- 单一 declaration act
- form runtime handle
- core-owned host law

具体 exact spelling 只看 [13-exact-surface-contract.md](./13-exact-surface-contract.md)。
React 不进入 Form owner；它继续只作为 core-owned host proof。

### 2. `single-truth`

Form 继续只承认：

- `values`
- `errors`
- `ui`
- `$form`

decoded payload 只允许作为 submit-lane output 存在，不得长成第五棵持久状态树。

### 3. `verification-feed`

每一波收敛都必须直接产出可被既有 `runtime.trial / runtime.compare` 消化的最小 explain / evidence / fixture contract，不能先落能力、后补验证入口。

### 4. `surface-compression`

每一波推进都必须继续压缩公开面：

- 不新增第二 authoring route
- 不新增第二 declaration carrier
- 不把 lowering 术语抬成独立公开目标
- 不把 host sugar 回流成 Form 本体
- 不在 reason contract 闭环前抢先 exact-freeze projection helper 成员

## 当前判断

Form 当前已经具备几个强点：

- 规则、派生、source 已进入统一 DSL
- 动态列表已有稳定 row identity
- runtime action 面已经具备单点收口基础
- 错误树与 schema 错误分支已经统一

但这些强点还没有收敛成真正闭环。
目前阻塞终局的关键，不在于再补几个 React 风格 API，而在于把 form 语义自身补满。

`F1` 的 root exact contraction 与 single declaration carrier freeze 已经把前一轮主矛盾压掉一大块。
当前后续工作固定拆成两组：

- supporting authority / inventory / planning drift cleanup
- `active-shape / settlement / reason` 的 `P0` semantic closure

root exact surface 不再是当前默认重开点。

## 收敛主张

### 1. 先补语义闭环，再补 host projection

主链顺序固定为：

1. form 语义闭环
2. 由语义闭环直接要求的 kernel 配套下沉
3. exact surface 收口
4. React host projection 补糖
5. proof / mirror 页回写

任何只改善 host DX、却不能提升 form 语义闭环的工作，默认后置。

### 2. 只允许按需下沉 kernel 配套

kernel 相关工作在本页里只作为 enabling constraint 存在：

- 它只在直接解锁 Form gap、压缩公开面或减少假设数时进入 wave
- 它不再作为独立第二 roadmap object
- 具体 owner 与 lowering 继续回 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md) 和 [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)

### 3. 先冻结 dependency DAG，再让 implementation plan 做切波

这份 contract 只冻结必要依赖关系，不再固定 `Wave A / B / C` 的具体切分。

当前最小 DAG 固定为：

- `active-shape lane` 先于 `settlement lane`
- `reason contract` 依赖 `active-shape lane + settlement lane`
- exact projection members 依赖 `reason contract`
- host sugar 只允许出现在 core exact surface 收口之后
- proof / formula / walkthrough / export mirror 只允许出现在 core authority 已收口之后

### 4. 每个切片都必须自带最小 verification-feed

从最早的实施切片开始，每个切片都必须交付最小 explain / evidence gate。

这条 gate 的意义只有一个：

- 不允许先落能力，再事后补 `runtime.trial / runtime.compare` 的接入

## internal invariant checklist

为了保证 boundary 稳定，后续任何阶段都必须同时守住：

- `ownership / remap canonicality`
- `task / stale canonicality`
- `reason / evidence canonicality`

它们只作为 enabling constraint 存在，不单独抬升成第二 roadmap object。

## Proof Obligations

后续任何细化规划都必须证明：

- 新能力没有长第二套 authority
- 新能力没有长第二 declaration carrier
- 新能力确实落在 [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md) 冻结的正确 owner
- 新能力改善了 Agent authoring、runtime clarity、performance、diagnostics 或 verification-feed 之一
- 新能力能被 scenario verification / machine-comparable evidence 消化
- 若涉及 kernel 配套实现，它只是解锁 Form gap 的 enabling constraint，不是独立 roadmap object
- host sugar 不得重新进入主收敛波次
- projection helper 成员不得在 proof backlog 未闭环时抢跑 exact freeze
- implementation plan 只能展开 DAG，不得反向改写 invariants

## Freeze Gate

这份 convergence contract 后续只有在同时满足下面条件时，才允许进入 adopted freeze：

- `00-north-star` 的主目标与非目标没有被削弱
- `02-gap-map-and-target-direction` 的 canonical grammar 没有再次分叉
- `03-kernel-form-host-split` 的单 owner 规则没有被打破
- 参与公理与 DAG 没有冲突
- public surface budget 没有失控

## 相关规范

- [./00-north-star.md](./00-north-star.md)
- [./01-current-capability-map.md](./01-current-capability-map.md)
- [./02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)

## 当前一句话结论

04 当前只保留 frozen convergence contract：先收 core authority，再收 exact surface，再收 host sugar 与 proof mirror；任何第二 declaration carrier、第二 host truth 或 projection helper 抢跑都视为 blocker。
