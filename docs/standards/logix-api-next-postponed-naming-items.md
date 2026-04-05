---
title: Logix API Next Postponed Naming Items
status: living
version: 2
---

# Logix API Next Postponed Naming Items

这些条目只表示“名字还没最终拍板”。

它们不表示：

- 结构裁决未定
- 历史名字会自动保留
- 为了熟悉度继续继承旧壳层

当前固定规则：

- 语义先按新主链和新边界落地
- 名字若与新主链冲突，直接重命名或删除
- 命名待定不构成兼容承诺

## 当前条目

### 1. `StateTrait` 是否正式改名为对外的 `field-kernel`

- 当前倾向：对外统一写 `field-kernel`，内部符号名后判

### 2. 定义锚点最终是否继续沿用 `ModuleDef`

- 当前倾向：角色保留，名字后判

### 3. strict static profile 是否继续沿用 `Workflow` 命名

- 当前倾向：当前先统一写 `strict static profile`

### 4. `roots` 是否改成更明确的 `rootProviders`

- 当前倾向：先写死语义，再看是否值得改名

### 5. `controller` 是否继续作为正式命名锚点

- 当前倾向：先保语义，不保名字

## 当前一句话结论

这些命名问题都已经降级为纯命名后置项；只有在能明确减少作者决策分叉时，才值得再提升优先级。
