---
title: Logic Composition And Override
status: living
version: 10
---

# Logic Composition And Override

## 当前规则

- `logic` 保留为一等复用单元
- `Program` 负责装配 `initial / capabilities / logics`
- `capabilities` 当前在 core 只把 `services / imports` 作为已落地 canonical 面
- `logic` 负责承载 declaration 与 run 两类语义
- declaration 负责同步注册 `rules / readiness requirements / fields / wiring`
- readiness requirement 的 public spelling 固定为 `$.readyAfter(effect, { id?: string })`
- `lifecycle` 不再作为 public authoring noun 出现
- `$.readyAfter` 是 sealed singleton root builder method，不开放 `$.startup.*`、`$.ready.*` 或 sibling family
- `$.readyAfter` 表示 instance 在该 effect 成功后才 ready；effect 失败时 instance acquisition 失败
- declaration asset 在 `Program.make(...)` 统一 merge / compile
- 领域 DSL 若要吸收 core 能力，必须把 declaration asset lowering 到同一个 `Logic / Program.make(...)` 编译边界
- 领域构造 helper 若保留，只能是对同一条 `Program.make(...)` 装配律的薄 specialization 或薄别名
- disjoint declaration 的合并结果必须与 mounted order 解耦
- 冲突 declaration 必须在 `Program.make(...)` fail-fast
- 返回的 run effect 负责长生命周期任务与运行期行为
- 返回的 run effect 只在 readiness requirements 成功后进入 run path，并且不阻塞 readiness
- 公开作者面只保留“同步声明区 + 返回的 run effect”
- field declaration grammar 只挂在 `Logic` builder 上，不提供独立公开 family
- `logics: []` 是 canonical 主写法
- 旧模块级默认装配写法不再作为 logic 组合的公开推荐入口
- 领域包不得借“program-first”再开第二 assembly law、第二 composition law 或第二 host law

## 冲突规则

- 匿名 logic 只允许追加
- 命名 logic 默认冲突即 fail-fast
- 覆盖与禁用固定停留在 expert 层

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./07-standardized-scenario-patterns.md](./07-standardized-scenario-patterns.md)
- [./08-domain-packages.md](./08-domain-packages.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)
- [../../standards/effect-v4-baseline.md](../../standards/effect-v4-baseline.md)
- [../../../specs/170-runtime-lifecycle-authoring-surface/spec.md](../../../specs/170-runtime-lifecycle-authoring-surface/spec.md)

## 当前一句话结论

共享 `Module`，按 `Program` 分区组合 `logics`，冲突默认 fail-fast，覆盖与禁用不进入 canonical surface。
