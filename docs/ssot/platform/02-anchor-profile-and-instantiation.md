---
title: Anchor Profile And Instantiation
status: living
version: 7
---

# Anchor Profile And Instantiation

## 当前结论

- 定义期 identity、安装期验证、稳定诊断所需的最小静态角色可以保留
- 这类静态角色不应被抬升成新的公开主链概念
- `Program.make(Module, config)` 与 `Runtime.make(Program)` 仍是唯一公开装配与运行入口
- 运行式验证继续统一经 `Runtime.trial(Program, options)` 邻接到 control plane
- `strict static profile` 不是战略中心，它只是可选的静态强化手段
- 任何锚点、profile 或实例化对象，若只是为了平台叙事、过度静态化或未来假设存在，默认删除或后置
- O-021 里真正值得保留的，只是收紧入口与增强诊断收益，不是它曾经对应的整套壳层
- 命名若仍未定，统一参考 `docs/standards/logix-api-next-postponed-naming-items.md`

## static role keep / drop

| Static Role | Current Status | Keep Benefit |
| --- | --- | --- |
| 定义锚点 | keep | stable identity、安装期验证、诊断锚点 |
| `strict static profile` | keep | 只在验证 / 诊断需要时提供静态强化 |
| 局部验证原型里的静态对象 | postpone | 只在局部原型、验证原型或历史上下文保留 |

当前仓内的可执行审计落点：

- `packages/logix-core/src/internal/platform/staticGovernancePolicy.ts`
- `packages/logix-core/test/Contracts/StaticGovernancePolicy.test.ts`

## 最小 Walkthrough 摘要

一个最小可读场景是：

1. 某个定义期角色需要稳定 identity、安装期验证或诊断锚点
2. 当前 docs 允许保留这类“定义锚点”，但不把它抬升成新的公开主链对象
3. 若静态强化只是在帮助验证或诊断，当前统一写 `strict static profile`
4. 已退出当前舞台的静态对象不回公开主链

使用边界：

- 需要稳定 identity、安装期验证、诊断收益时，保留最小静态角色
- 只是在补静态强化时，写 `strict static profile`
- 不为了平台叙事恢复已退出当前舞台的静态对象

## 与 naming bucket 的边界

本页固定的是结构边界：

- 定义锚点是否仍有必要存在
- static profile 是否只服务验证与诊断
- 实例化入口是否继续只认 `Program.make(Module, config)` 与 `Runtime.make(Program)`

命名后置页只继续承接这些词本身要不要保留：

- `ModuleDef`

只要讨论升级成“是否需要这类静态角色、它们能否进入公开主链”，就继续回本页。

## reopen 条件

只有出现以下情况，才重开静态角色讨论：

- 某个静态角色被明确证明能换来 stable identity 收益
- 某个静态角色被明确证明能换来安装期验证收益
- 某个静态角色被明确证明能换来稳定诊断收益

以下情况不构成重开：

- 只是为了平台叙事更完整
- 只是为了恢复旧名词熟悉度
- 只是因为实现里还有残留名词

## 来源裁决

- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)

## 相关规范

- [./01-layered-map.md](./01-layered-map.md)
- [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- [../../standards/logix-api-next-postponed-naming-items.md](../../standards/logix-api-next-postponed-naming-items.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

当前只保留必要静态化；定义锚点与 static profile 都必须服从公开主链与诊断收益，不能重新长成第二条表面主线，也不再把已退出对象挂回当前口径。
