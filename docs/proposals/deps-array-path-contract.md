---
title: Deps Array Path Contract
status: living
owner: deps-array-path
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/standards/logix-api-next-guardrails.md
last-updated: 2026-04-20
---

# Deps Array Path Contract

## 目标

冻结 `deps` 中数组路径的最小语义合同，先解决：

- `items[].x`
- `params.lines[].materialId`

这类写法到底算不算合法路径、它的语义是什么、哪些地方允许用、运行时与类型系统怎么对齐。

本页只做窄合同，不重开通用路径系统，不重做整套 path language。

## 页面角色

- 本页是一个小 proposal
- 它服务 Form 列表场景与 Query 复杂依赖场景
- 它不处理 `Resource` owner relocation 本身
- 它不重写现有 `StateFieldPath` 的整套 general-purpose 设计
- 它不直接开始实现

## 当前 authority baseline

- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./resource-query-owner-relocation-contract.md](./resource-query-owner-relocation-contract.md)

## 背景现状

### 1. Query deps 现在只支持对象路径，不支持数组路径

当前 `QueryDepsPath` 直接复用 field path 类型：

- [query-declarations.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/internal/query-declarations.ts)
- [field-path.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/field-kernel/field-path.ts)

而 `StateFieldPath` 当前只递归 plain object，明确把数组排除掉。  
这意味着类型层现在不会生成：

- `params.lines[].materialId`

### 2. Query 运行时读取 deps 也不支持 `[]`

当前 Query auto-trigger 在运行时取 deps 值时，只是：

- `path.split('.')`
- 按段直接取值

实现位置：

- [auto-trigger.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-query/src/internal/logics/auto-trigger.ts)

所以 `params.lines[].materialId` 现在即使手写进去，也不会被正确解释成数组 fanout 或数组收集。

### 3. `items[].x` 这类语义在 field-kernel 内部已经局部存在

现有 field-kernel 的列表作用域里，已经存在一套内部规范化语义：

- 列表项内声明 `deps: ['warehouseId']`
- 内部会规范化成 `items[].warehouseId`

证据：

- [FieldKernel.ListScopeDepsNormalization.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/FieldKernel/FieldKernel.ListScopeDepsNormalization.test.ts)
- [FieldKernel.ListTargetTriggersListScope.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/FieldKernel/FieldKernel.ListTargetTriggersListScope.test.ts)

也就是说：

- `[]` 语义不是完全没有
- 它目前只存在于 field-kernel/list-scope 内部
- 它还没有升级成 Query / Form / domain DSL 可统一消费的公开合同

### 4. 复杂 ToB 场景已经逼近这个缺口

像多行采购单、动态明细、级联选项、跨行预算校验这类 ToB 场景，很自然会想写：

- `params.lines[].materialId`
- `params.lines[].warehouseId`
- `items[].warehouseId`

现有 examples 里，Form 列表级联还是靠“行内 source + 相对 deps”工作：

- [case11-dynamic-list-cascading-exclusion.tsx](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx)

这条路对行内 source 很合适。  
但一旦想做“整单聚合查询”或“跨行远端预检”，缺的就是数组路径合同。

## 当前问题

现在有一个明显断裂：

- field-kernel 内部知道 `items[].x` 是什么
- Query deps 既不在类型层支持，也不在运行时支持
- 作者面没有明确语义，不知道 `[]` 到底表示“收集数组值”还是“自动 fanout”

如果不补合同，就会出现三种坏结果：

1. 类型允许和运行时不一致  
2. Form/Query 各自发明一套数组 deps 语义  
3. 作者看到 `[]` 就误以为系统会自动 fanout 资源请求

## 目标论点

当前待裁目标论点固定为：

> `deps` 应支持窄化的数组路径合同。  
> 第一版只把 `[]` 解释成“稳定的数组依赖读取语义”，不自动解释成 fanout。  
> Query key / Form rule / Field source 只消费这份收集后的数组值。

## 设计约束

- 只补 `deps` 语义，不扩张成通用 path language
- 第一版只服务 Form 列表与 Query deps
- 第一版不自动生成多请求 fanout
- 第一版不引入第二套 authoring 主链
- 运行时与类型系统必须同口径
- 若列表作用域已有内部语义，优先把它升格成统一合同，而不是重新发明

## 方案比较

### 方案 A：把 `[]` 直接定义成自动 fanout

语义：

- `params.lines[].materialId` 直接表示“对每个元素发一个子查询”

优点：

- 看起来很省事
- 对单资源逐行请求很直观

问题：

- 把 path 语义和请求调度语义绑死
- 很容易长出第二套 Query authoring 模型
- fanout、聚合、去重、顺序、错误合并都变复杂

结论：

- 当前不推荐

### 方案 B：把 `[]` 定义成“数组值收集”

语义：

- `params.lines[].materialId` 返回一个稳定数组
- `key(...)`、`validate(...)`、`source(...)` 自己决定怎么消费这份数组

优点：

- 语义更小
- 不把 path language 和调度语义绑死
- 可以同时服务 Query、Form、field-kernel
- 更容易和当前 list-scope 内部规范化对齐

问题：

- 需要作者自己决定聚合方式
- 想要 fanout 时要另开显式能力

结论：

- 推荐

## adopted candidate

本轮 adopted candidate 建议冻结为：

- `Array-Path As Collection Contract`

## 合同内容

### 1. 合法语法

第一版只承认一种新增语法：

- `items[].x`

约束：

- `[]` 只能表示“遍历数组元素”
- 每个 path 最多只允许一个 `[]`
- `[]` 后面仍然只能跟现有字段路径语法
- 第一版不支持多层数组通配

### 2. 语义

`items[].x` 的语义固定为：

- 读取数组 `items`
- 按当前元素顺序收集每个元素上的 `x`
- 返回一个稳定数组

这里的“稳定”指：

- 保持原顺序
- 不隐式排序
- 不隐式去重
- 不隐式 fanout

### 3. 缺失值行为

第一版建议固定为：

- 若数组不存在或不是数组，结果为 `[]`
- 若某个元素上目标字段缺失，该位置结果为 `undefined`

这样既保留位置语义，也避免把“空数组”和“路径不存在”混成同一个布尔判断。

### 4. 允许使用的位置

第一版建议只开放到下面三处：

- field-kernel list-scope 规范化结果
- Form 列表相关的 deps / refine deps
- Query deps

当前不扩到：

- 一般性的 selector path
- 任意公开 path DSL
- 非 deps 语境的路径语言

### 5. Query 侧语义

对 Query 来说：

- `deps: ['params.lines[].materialId']` 合法
- `key(...)` 收到的参数是 `ReadonlyArray<...>`
- Query 不自动 fanout
- Query key 作者自己决定是直接带数组、做 digest、做去重、还是返回 `undefined`

例子：

```ts
queries: ($) => ({
  pricing: $.source({
    resource: PricingBatchResourceRef,
    deps: ['params.lines[].materialId', 'params.lines[].qty'],
    key: (materialIds, qtys) => {
      if (materialIds.length === 0) return undefined
      return {
        lines: materialIds.map((materialId, i) => ({
          materialId,
          qty: qtys[i],
        })),
      }
    },
  }),
})
```

### 6. Form / field-kernel 侧语义

对 Form 列表规则来说：

- 行内相对 deps 继续保留当前写法
- 内部规范化结果继续落到 `items[].x`
- 若顶层 refine 想直接依赖列表子项，也允许显式写 `items[].x`

这意味着：

- 当前 list-scope 内部能力可以外提成统一合同
- 但不需要把 Form 重新变成第二套 path system

### 7. 不做的事

第一版明确不做：

- 自动 fanout
- 自动去重
- 多层数组通配
- 通用 selector path 升级
- 独立的数组路径 helper family

## 类型层建议

第一版需要把 `StateFieldPath` 的语义扩到数组收集路径，但只在允许的位置生效。

更准确地说，是要给 `deps` 语境补一套能表达：

- `T[]` 上的 `[].field`
- 返回 `ReadonlyArray<FieldType>`

的类型映射。

不建议直接把现有所有 path type 全量重写。  
更稳的方式是：

- 为 deps 语境补一个窄类型工具
- 先服务 Query/Form/field-kernel

## 运行时建议

运行时需要补一个统一的 deps 读取器，至少供：

- Query auto-trigger
- Query keyHash 计算
- Form / field-kernel 相关 deps 读取

这个读取器的行为必须和上面的合同一致：

- `[]` 收集数组值
- 保顺序
- 不去重
- 不 fanout

## 验证门

至少要有下面几类验证：

1. 类型验证

- Query deps 能接受 `params.lines[].materialId`
- `key(...)` 参数类型正确变成数组

2. 运行时验证

- `[]` 在 Query auto-trigger 里能正确收集值
- 空数组与缺失字段行为符合合同

3. field-kernel 对齐验证

- 现有 list-scope 规范化继续成立
- 顶层显式 `items[].x` 与内部规范化结果不冲突

4. 非目标验证

- 不发生自动 fanout
- 不新增第二套 authoring 入口

## 文档回写目标

- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/ssot/runtime/08-domain-packages.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/standards/logix-api-next-guardrails.md`

## 当前一句话结论

建议单开一页小 proposal，把 `deps` 里的 `[]` 数组路径先冻结成“稳定数组值收集语义”，先服务 Query 和 Form 的复杂列表场景，不把它扩成通用路径系统，也不默认解释成 fanout。
