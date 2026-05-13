---
title: Logix API Next Charter
status: accepted
date: 2026-04-04
---

# Logix API Next Charter

## 决策

`logix-api-next` 的北极星与总原则固定为：

- 当前按零存量用户前提推进，允许直接重做公开 surface 与默认行为
- 公开主链收敛到 `Module / Logic / Program`
- `Program.make(Module, config)` 是唯一公开装配入口
- `Program.make(Module, config)` 已承接实际装配实现
- React host exact law 由 core 持有，并服务全部领域包
- Agent-first 的默认成功标准同时包含 Agent 生成稳定性与人类首读可理解性
- 公开 API noun 若长期无法用低心智语言稳定解释，按设计债处理
- 一个公开 noun 只允许一个主角色；内部近义黑话不得回流成用户面主叙事
- 新旧写法都降到同一个 `authoring kernel`
- 不写兼容层，不设弃用期，用迁移说明替代
- 旧名字、旧壳层、旧 facade 不自动继承
- 不设 `advanced`、`internal` 一类黑盒兜底入口
- `runtime control plane` 独立承载装配、override、trial、replay 和 evidence
- `process` 保留 expert/orchestration family
- `process / workflow` 的 expert surface 继续走显式子路径，不回 `@logixjs/core` 根主链
- Form 保留领域 DSL，下层共享 field-kernel
- 领域包只能走 `service-first` 或 `program-first`
- 领域包不得长第二套 runtime、DI、事务或调试事实源
- 领域包的公开 API 必须能还原到同一条 `Logic / Program / Runtime / host` spine
- 领域包不得拥有 canonical host family 或 pure projection family

## 后果

- proposal 被采纳后，后续事实优先回写新的 `docs/ssot/`、`docs/adr/`、`docs/standards/` 或 `docs/next/`
- `logix-api-next` proposal 目录后续主要承担消费前的过渡索引角色
- 若未来某个旧概念仍想继续存在，必须重新证明它能减少作者分叉并提升主链清晰度
- 若某个公开词只能靠大量 gloss 才能维持理解，默认继续视为 design debt，而不是文案问题
- 公开 `Module` 定义对象不再反射旧装配入口
- 当前执行期需与 `2026-04-05-ai-native-runtime-first-charter.md` 一起解读
- 验证控制面的具体边界与升级路径，以 `docs/ssot/runtime/09-verification-control-plane.md` 为准

## 相关页面

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/08-domain-packages.md](../ssot/runtime/08-domain-packages.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
