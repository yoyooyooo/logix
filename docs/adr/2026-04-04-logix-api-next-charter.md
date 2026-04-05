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
- 新旧写法都降到同一个 `authoring kernel`
- 不写兼容层，不设弃用期，用迁移说明替代
- 旧名字、旧壳层、旧 facade 不自动继承
- 不设 `advanced`、`internal` 一类黑盒兜底入口
- `runtime control plane` 独立承载装配、override、trial、replay 和 evidence
- `process` 保留 expert/orchestration family
- Form 保留领域 DSL，下层共享 field-kernel
- 领域包只能走 `service-first` 或 `program-first`
- 领域包不得长第二套 runtime、DI、事务或调试事实源

## 后果

- proposal 被采纳后，后续事实优先回写新的 `docs/ssot/`、`docs/adr/`、`docs/standards/` 或 `docs/next/`
- `logix-api-next` proposal 目录后续主要承担消费前的过渡索引角色
- 若未来某个旧概念仍想继续存在，必须重新证明它能减少作者分叉并提升主链清晰度
- 当前执行期需与 `2026-04-05-ai-native-runtime-first-charter.md` 一起解读
- 验证控制面的具体边界与升级路径，以 `docs/ssot/runtime/09-verification-control-plane.md` 为准
