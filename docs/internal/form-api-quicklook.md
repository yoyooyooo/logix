---
title: Form API Quicklook
status: living
version: 8
---

# Form API Quicklook

## 用途

- 这页只做路由与一句话心智
- 这页不再代持 exact shape
- 这页不再代持 walkthrough
- 若本页与 SSoT 冲突，以 SSoT 为准，并回头修本页

## 先看哪里

- 想先按用户视角过一遍当前冻结口径：
  - [form-api-tutorial.md](./form-api-tutorial.md)
- 最终用户 contract：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
- route-level boundary：
  - [05-public-api-families.md](../ssot/form/05-public-api-families.md)
- React exact host law：
  - [10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- form / field-kernel boundary：
  - [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)

## 当前用户心智

- 用 `Form.make(...)` 定义 Form 领域语义
- 把 returned `FormProgram` 当成 core `Program` 的领域 refinement
- 用 effectful `FormHandle` 做 submit / validate / mutation
- 用 core React host law 做 acquisition 与 pure projection

## 当前 walkthrough 入口

- 先看 [form-api-tutorial.md](./form-api-tutorial.md)
- 再回 [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md) 核对 exact spelling

## 当前 residue 提醒

旧 root alias、旧 command bridge、旧 view namespace 与旧 form-owned React hook family 若仍在代码里可见，只能按 residue / convenience layer 理解。

## 一句话结论

这页现在只做一句话心智与跳转；完整 walkthrough 继续看 [form-api-tutorial.md](./form-api-tutorial.md)。
