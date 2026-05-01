---
title: Form Kernel Grammar Contract
status: living
version: 9
---

# Form Kernel Grammar Contract

## 目标

冻结 form-facing kernel grammar contract。

## 页面角色

- 本页只承接 kernel primitive grammar
- 本页不承接后续规划清单
- 本页不直接定义公开 API
- 本页只回答：当前 frozen grammar 是什么、它删掉了哪些假设、哪些合同明确不归 kernel

## 总原则

### 1. kernel 可改，但只能服务已冻结 grammar

kernel 侧升级只允许服务：

- `active-shape lane`
- `settlement lane`
- `reason contract`

### 2. kernel 只承接 primitive，Form 承接 derived contract

kernel 只承接 primitive authority。
derived Form contracts 继续留在 Form。

这里的 derived contract 固定为：

- 单一 `FormDeclarationContract`
- 其中的 `activeShapeSlice`
- 其中的 `settlementSlice`
- 其中的 `reasonProjectionSlice`

### 3. kernel 不拥有这些合同

下面这些合同继续明确归 Form：

- decoded payload
- submit verdict
- submit callback contract
- `$form` 最小 verdict summary
- path explain projection
- public verification helper

## 最小 kernel grammar

### K-A. participation-delta kernel

#### 服务哪条 lane

- `active-shape lane`

#### authoritative I/O

- input:
  - active-set change
  - structure delta
  - ownership context
- output:
  - ownership continuity
  - remap result
  - cleanup residue
  - cleanup evidence

#### 它删掉什么假设

- presence 与 structure delta 可以分成两套 primitive
- cleanup、ownership、remap 可以在不同局部 helper 里各自收敛

### K-B. settlement-task kernel

#### 服务哪条 lane

- `settlement lane`

#### authoritative I/O

- input:
  - settlement contributor
  - debounce / cancel / stale policy
  - `submitAttempt` snapshot
- output:
  - task lifecycle result
  - stale / cancel receipt
  - submit contributor evidence

#### 它删掉什么假设

- source、async validation、submit blocker 需要分三套 substrate
- stale、cancel、debounce 只要是局部 runtime 技巧即可
- blocker 需要独立成为第五类 canonical leaf

### shared output law. canonical evidence envelope

#### 服务哪条 contract

- `reason contract`

#### authoritative I/O

- input:
  - `K-A` 的 cleanup / remap / ownership evidence
  - `K-B` 的 task / stale / submit contributor evidence
- output:
  - canonical reasons
  - canonical evidence
  - verification-feed input
  - submit summary input

#### 它删掉什么假设

- reason engine 需要独立成为第三个 kernel roadmap object
- `$form`、path explain、trial feed 可以各自持有一套 reasons
- `row / task / cleanup` locality 可以藏在第二套 side refs

## excluded Form-owned contracts

为了防止 kernel 越界，下面这些项在本页明确视为 excluded：

- submit verdict kernel contract
- decoded output channel
- public explain noun
- public hook / helper noun
- 第二 verification control plane

## closure matrix

本页不维护 proof backlog。
验证展开继续留在实施规划与验证材料；07 只保留冻结后的 grammar contract。

| root obligation | primitive kernel | shared output law | authoritative I/O | owner doc | acceptance proof |
| --- | --- | --- | --- | --- | --- |
| `active-shape lane` | `participation-delta kernel` | `canonical evidence envelope` | `activeShapeSlice` -> active-set / structure-delta / ownership -> remap / cleanup receipt | [03-kernel-form-host-split.md](./03-kernel-form-host-split.md) | cleanup exit from validation / blocking / explain universe 必须保持 machine-comparable |
| `settlement lane` | `settlement-task kernel` | `canonical evidence envelope` | `settlementSlice` -> settlement contributor / stale policy / `submitAttempt` snapshot -> task lifecycle / submit contributor evidence | [03-kernel-form-host-split.md](./03-kernel-form-host-split.md) | pending / stale / submit summary 必须保持单点可比较 |
| `reason contract` | none | `canonical evidence envelope` | `reasonProjectionSlice` + kernel receipts -> canonical reasons / evidence / verification-feed input | [03-kernel-form-host-split.md](./03-kernel-form-host-split.md) | `FormErrorLeaf`、结构化 `reasonSlotId`、path explain、trial feed 必须继续共用同一 evidence |

## verification coordinate corollary

为了让 trial / compare 共用同一坐标系，当前继续固定：

- declaration authority 只允许一个 `FormDeclarationContract`
- kernel receipt 不下沉 plan digest 到每条 receipt
- receipt 继续只要求能稳定回链：
  - `declSliceId`
  - `reasonSlotId`
  - `sourceRef`
- `reasonSlotId.subjectRef` 继续是 `row / task / cleanup` 的唯一 locality 坐标

digest 继续停在 declaration / scenario-plan / evidence summary 这三类 envelope fingerprint。

## Reopen Gate

若未来有人试图改写 07，后续候选必须明确：

1. 它属于 `K-A` 还是 `K-B`
2. 它删掉了哪个假设
3. 它压掉了哪个 public boundary
4. 它交付了哪份 canonical evidence 与 verification proof

答不出来，默认不 reopen。

对任何 `executor / receipt` challenger，还必须补一张 strict dominance matrix，显式说明：

- 删掉了哪条现有 assumption
- 压掉了哪条现有 public boundary 或 shared law 对象
- 交付了哪份更强的 evidence / verification proof

若写不出来，默认维持当前 grammar，不进入 rename。

## 非目标

- 本页不冻结 internal naming
- 本页不直接排 implementation tier
- 本页不把 kernel 变成 public API owner

## 相关规范

- [./00-north-star.md](./00-north-star.md)
- [./02-gap-map-and-target-direction.md](./02-gap-map-and-target-direction.md)
- [./03-kernel-form-host-split.md](./03-kernel-form-host-split.md)
- [./04-convergence-direction.md](./04-convergence-direction.md)
- [./05-public-api-families.md](./05-public-api-families.md)
- [./06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md)
- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)

## 当前一句话结论

07 当前只保留 frozen kernel grammar contract：kernel 继续收敛到两个 primitive kernel 与共享的 `canonical evidence envelope` 输出律；本轮新增冻结 settlement contributor、`submitAttempt` snapshot 与 `reasonSlotId.subjectRef` 的最小 grammar，所有 submit / decode / verdict / projection contract 继续留在 Form。
