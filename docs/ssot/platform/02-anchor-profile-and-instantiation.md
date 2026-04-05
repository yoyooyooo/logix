---
title: Anchor Profile And Instantiation
status: living
version: 2
---

# Anchor Profile And Instantiation

## 当前结论

- 定义期 identity、安装期验证、稳定诊断所需的最小静态角色可以保留
- 这类静态角色不应被抬升成新的公开主链概念
- `Program.make(Module, config)` 与 `Runtime.make(Program)` 仍是唯一公开装配与运行入口
- `Workflow` 不回公开主链；若还保留，只能作为局部静态约束、验证原型或投影工件
- `strict static profile` 不是战略中心，它只是可选的静态强化手段
- 任何锚点、profile 或实例化对象，若只是为了平台叙事、过度静态化或未来假设存在，默认删除或后置
- O-021 里真正值得保留的，只是收紧入口与增强诊断收益，不是它曾经对应的整套壳层
- 命名若仍未定，统一参考 `docs/standards/logix-api-next-postponed-naming-items.md`

## 当前一句话结论

当前只保留必要静态化；定义锚点与 static profile 都必须服从公开主链与诊断收益，不能重新长成第二条表面主线。
