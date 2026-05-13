---
title: Field Kernel Declaration Cutover
status: accepted
date: 2026-04-12
---

# Field Kernel Declaration Cutover

## 决策

字段行为相关体系自本轮起按以下口径统一收口：

- field-kernel declaration asset 统一在 `Program.make(Module, config)` 编译
- `Runtime.make(Program)` 只安装与执行已编译的 declaration asset，不再承担 field-kernel declaration merge 或 build
- `Logic` 的公开作者面固定为“同步声明区 + 返回的 run effect”
- field-kernel 的公开声明入口固定为 `$.fields(...)`
- `Logic` 的公开作者面不再保留 `{ setup, run }` 这一类第二写法
- `@logixjs/core` root export 不再保留旧 field runtime 独立导出
- 不再提供任何独立的公开 field helper namespace 或 expert 子路径
- field declaration grammar 只作为 `Logic` builder 的局部语法存在，不作为单独 family 对外暴露
- 公开 field grammar 默认只保留 `computed / source / external`
- `link` 退出公开 grammar，统一并入 `computed`
- `check` 退出 core field grammar，回收到 Form 等领域 DSL
- `node / list` 不再作为独立公开 primitive；它们只保留为 compiler-owned 的嵌套作用域语法
- Form 的 canonical authoring 固定为 `Form.make(id, config, define)`
- Form 的公开 authoring 只保留一个领域 DSL 入口，不再接受 raw field fragment
- `Form.rules / Form.node / Form.list / Form.Field / Form.derived` 与其他 raw field helper 全部退出 package root
- `Form.make(..., define)` 不再保留 `derived / raw field` 这类独立入口；校验、派生、source wiring、list identity 统一回收到同一条 Form DSL
- Query 的 canonical authoring 固定为 `Query.make({ queries })`
- `Query.make(...)` 不再接受 raw field fragment config
- Query 不再保留任何公开 field helper
- 任何 field-level 特化需求都直接扩展 Query DSL，不再开放 package-root 或 expert route 逃生口
- 不写兼容层，不设弃用期，按零存量用户前提直接 cutover
- 旧 field runtime 命名退出公开 docs、公开 API、内部目录名与 canonical test 命名

## 原因

- 当前最大问题不在 field-kernel 内核能力，而在声明入口、编译时机与命名表面持续分叉
- 运行时启动阶段再做 merge/build，会把 declaration asset、assembly asset 与 runtime execution 混在一起
- Form 与 Query 继续各自保留 raw field 风格入口，会持续制造第二套作者面
- 旧 field runtime 独立导出存在感过强，会把用户拉回旧心智
- 即便保留一个独立的旧 field-kernel expert 子路径，也会继续给字段级作者面提供独立存在感，稀释主链

## 后果

- `Program` 从“装配容器”继续收紧为“装配与 declaration 编译边界”
- runtime core 会变薄，只保留安装、调度、执行、证据与诊断职责
- field-kernel 的 provenance、digest、static IR 与 config gate 在 `Program.make` 阶段稳定生成
- Devtools / Reflection 读取 compiled field program，不再依赖 runtime 启动后补登记
- domain package 必须降到同一条 declaration compiler 主线，不得保留 package-root 的第二套 field authoring
- field-kernel 退回内部实现层，不再作为用户需要认识的一组公开概念
- 旧 field runtime 命名本轮就退出公开 docs、公开 API、内部目录与 canonical tests，不再后置

## 相关页面

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/05-logic-composition-and-override.md](../ssot/runtime/05-logic-composition-and-override.md)
- [../ssot/form/README.md](../ssot/form/README.md)
- [../ssot/runtime/06-form-field-kernel-boundary.md](../ssot/runtime/06-form-field-kernel-boundary.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../ssot/platform/01-layered-map.md](../ssot/platform/01-layered-map.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)

## 当前一句话结论

field-kernel 自本轮起固定为内部 declaration-time asset model；公开作者面只通过 `Logic` builder 局部语法声明，`Program.make(...)` 编译，`Runtime.make(...)` 执行。
