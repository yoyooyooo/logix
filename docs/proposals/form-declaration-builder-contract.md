---
title: Form Declaration Builder Contract
status: consumed
owner: form-declaration-contract
target-candidates:
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - docs/ssot/form/09-operator-slot-design.md
  - docs/internal/form-api-quicklook.md
last-updated: 2026-04-16
---

# Form Declaration Builder Contract

## 目标

单独裁决 form authoring 这一层的两个问题：

1. form 侧是否应该继续采用“函数体 builder”来声明语义
2. 如果继续采用函数体 builder，公开名是否还应该叫 `logic`

## 角色

- 本页是待裁决 proposal，不是权威事实源
- 它只服务 declaration layer 的 contract 收口
- 一旦收口，优先回写：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
  - [form-api-quicklook.md](../internal/form-api-quicklook.md)

## 当前冲突

当前存在两个真实冲突：

### C1. previous baseline 与当前 carrier 问题

上一轮 exact surface baseline 是：

```ts
Form.make("id", {
  values,
  initialValues,
  logic: ($) => {
    $.field(...)
    $.scope.when(...)
    $.scope.list(...)
    $.submit(...)
  },
})
```

这个旧 baseline 的优点是：

- 局部作用域好表达
- 嵌套 builder 类型更自然
- 不暴露中间 IR

这个旧 baseline 的问题是：

- 它看起来像运行逻辑函数体
- 和配置对象式 authoring 相比，phase 边界不够显式

### C2. `logic` 这个名字是否冲突

core 侧已经冻结：

```ts
Module.logic(id, ($) => {
  // declaration + run effect
})
```

而 form 侧上一轮 baseline 里：

```ts
logic: ($) => {
  // declaration only
}
```

同一个词 `logic`，承接了两种 phase model：

- core: declaration + run
- form: declaration only

这会增加学习成本，也会误导 LLM。

## 当前候选

### 方案 A：位置参数 builder

```ts
Form.make("id", {
  values,
  initialValues,
}, ($) => {
  $.field(...)
  $.scope.when(...)
  $.scope.list(...)
  $.submit(...)
})
```

优点：

- builder 继续保留
- `logic / declare` 这层额外 noun 直接消失
- builder 作用域最自然
- static config 与 declaration phase 明确分层
- 更接近 core 侧 `id + build` 的主公式

风险：

- 需要重开 exact signature
- 需要把现有 `extend` / lowering residue 一起重新摆位

### 方案 B：保留函数体 builder，但公开名改成 `declare`

```ts
Form.make("id", {
  values,
  initialValues,
  declare: ($) => {
    $.field(...)
    $.scope.when(...)
    $.scope.list(...)
    $.submit(...)
  },
})
```

优点：

- 保留 builder 的作用域与类型优势
- 直接把 form 侧的 phase 语义说清楚
- 避免和 `Module.logic` 冲突

风险：

- exact surface 要再做一次 rename cut
- `declare` 仍然是一个新增 public noun
- config object 继续混合 static config 与 declaration carrier

### 方案 C：放弃函数体 builder，回到普通配置字段

```ts
Form.make("id", {
  values,
  initialValues,
  declaration: {
    fields: { ... },
    scopes: { ... },
    submit: { ... },
  },
})
```

优点：

- 声明层更显式
- 和“配置对象”心智一致

风险：

- 嵌套作用域表达会变硬
- 局部 builder 类型收窄会变差
- 更容易暴露中间 IR 或产生大对象语法树

## 当前判断

在 zero-user、forward-only、专业开源库级 API 优先、允许反向推动内核 的前提下，这份 proposal 当前更倾向：

- 保留函数体 builder
- 把“位置参数 builder”提升成主候选
- 把 `declare` 降成次级 fallback
- 让 `logic` 退出 form declaration surface
- 不再让 rename / cutover 成本成为主要反对理由

也就是说，当前默认搜索面改成：

> builder 继续保留，但 `logic` 不应继续保留；主问题变成 declaration carrier 是否继续藏在 config key 里。

## review focus

reviewer 应优先挑战：

1. 函数体 builder 是否真的优于普通配置字段
2. `Form.make(id, config, ($) => { ... })` 是否比 config-key builder 更小
3. 若不能采用位置参数 builder，`declare` 是否是比 `logic` 更稳的 fallback
4. 在 zero-user 前提下，哪一个方案最像专业级开源库 API
5. 哪一个方案最能反向推动 kernel / declaration chain 的内聚

## 去向

- 2026-04-16 已消化到：
  - [13-exact-surface-contract.md](../ssot/form/13-exact-surface-contract.md)
  - [06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
  - [09-operator-slot-design.md](../ssot/form/09-operator-slot-design.md)
  - [form-api-quicklook.md](../internal/form-api-quicklook.md)
