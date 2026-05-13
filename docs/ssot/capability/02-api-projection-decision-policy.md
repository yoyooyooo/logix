---
title: Logix API Projection Decision Policy
status: living
version: 1
---

# Logix API Projection Decision Policy

## 目标

定义从 capability atoms 投影到表层 API 与内部实现思路时的裁决优先级。

本页避免局部 proposal 把局部首读体验、局部 spelling 偏好或某个 domain baseline 抬成全局原则。

## P0 Hard Laws

违反 P0 的 proposal 直接拒绝。

| law | statement |
| --- | --- |
| single truth | 不得新增第二 runtime truth、diagnostics truth、submit truth、scenario matrix |
| single owner | 每个 `CAP-*` 只能有一个 primary owner lane |
| single authority | exact surface 只能由 owner authority 冻结 |
| transaction safety | transaction window 禁止 IO |
| final truth explainability | final constraint 必须有可解释的 final truth |
| host boundary | host 不生成 domain truth |
| verification boundary | trial / compare 不进入 authoring surface |
| evidence boundary | reason / trial / compare 必须能回到 canonical evidence envelope |

## P1 Strong Preferences

P1 可以被挑战，但 weakening 必须给 proof。

| preference | statement |
| --- | --- |
| reuse existing lane | 新能力优先落到已有 owner lane |
| small public surface | 更少公开对象优先 |
| first-read clarity | 人类首读能猜到 owner 和用途 |
| agent generation stability | LLM 生成时少隐式状态、少例外 |
| theoretical type-safety ceiling | 若目标级静态安全理论可达，优先选择能到达该上限的 API 形态；若当前形态理论不可达，优先重开形态而不是接受永久类型缺口 |
| minimal generator first | 优先少数公开概念生成多个能力，避免 capability 到 API 一比一翻译 |
| composition over noun | 能组合解决时，不新增 noun |
| selector gate first | read side 优先保持 single selector gate |
| planning before exact | 先验证 projection，再冻结 exact surface |

## P2 Tradeoff Surface

P2 可以在 proposal 中取舍，但必须记录 rejected alternatives。

- public noun spelling
- callback spelling
- exact carrier shape
- helper 是否存在
- helper import 位置
- docs teaching framing
- demo narrative 排序
- internal module landing
- proof wave 顺序
- 当前实现节奏，但前提是不牺牲理论可达的类型安全上限

## P3 Local Taste

P3 不得阻塞 P0 / P1 / P2 裁决。

- 示例变量名
- 代码排版
- route label
- docs wording
- tutorial 编排

## Decision Order

冲突裁决按这个顺序执行：

1. P0 hard laws
2. `concept-count`
3. `public-surface`
4. generator efficiency
5. `proof-strength`
6. theoretical type-safety ceiling
7. `future-headroom`
8. first-read clarity
9. agent generation stability
10. spelling taste

## Generator Efficiency

API proposal 不只看覆盖率，也看公开概念的生成能力。

| field | question |
| --- | --- |
| `public_concepts` | 这个 proposal 新增或要求保留多少公开概念 |
| `covered_caps` | 这些概念覆盖哪些 `CAP-*` |
| `covered_scenarios` | 这些概念覆盖哪些 `SC-*` |
| `collisions_introduced` | 它引入或重开的 `COL-*` |
| `generator_verdict` | generator / local patch / rejected |

默认拒绝只为单个 capability 新增公开 API 的 proposal，除非该 capability 是不可组合的 P0 缺口。

若同一组能力能通过一个 owner lane、参数化 policy 和 proof gate 表达，优先保留一个生成元，不拆多个公开 noun。

## Type-safety Ceiling Rule

这里的裁决先问两个问题：

1. 当前 API 形态的目标级静态类型安全，理论上是否可达
2. 若可达，是否只是当前实现或当前 declaration metadata 还没跟上

裁决规则：

- 若理论可达但当前未实现，允许暂时保留形态，但 proposal 必须把缺口记为 implementation debt，而不是把它说成形态限制
- 若理论不可达，且缺口触及 canonical path、selector contract、authoring contract 或 public result type，默认拒绝当前形态并重开 API
- 不允许把“只能靠 `as` / `unknown` / 宽 `string path` / 第二解释器 / 第二 authority 才能成立”的方案包装成已闭合的类型安全
- 不允许把“opaque descriptor 安全”误写成“结果类型安全”

类型安全讨论至少区分四层：

- 形态合法性
- 输入静态约束
- 输出类型可推导性
- 跨文档 / 跨层单一解释链

## Baseline Demotion Rule

任何 domain spec 里已经收敛出的 API shape，只代表当前 baseline projection。它不会自动升级为 P0。

只有当局部裁决被抽象成 owner / truth / evidence / verification 不变量，并通过 [01-planning-harness.md](./01-planning-harness.md) 的 Principle Promotion Lane，才允许进入 P0。

## Proposal Check Template

每个 proposal 必须包含：

```md
## Decision Policy Check

### P0 Hard Laws
- violated:
- touched:

### P1 Strong Preferences
- improved:
- weakened:
- proof for weakening:

### Generator Efficiency
- public_concepts:
- covered_caps:
- covered_scenarios:
- collisions_introduced:
- generator_verdict:

### P2 Tradeoffs
- chosen compromise:
- rejected alternatives:

### Human First-Read
- first-read win:
- first-read cost:

### Agent-First
- generation stability:
- validation stability:

### Type-Safety Ceiling
- theoretically_reachable:
- current_gap:
- unreachable_parts:
- blocker_or_debt:
```

## 当前一句话结论

P0 保护系统不分裂，P1 保证 API 收敛，P2 给局部设计留余地，P3 只服务表达质量。
