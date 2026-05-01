# Spec Registry: Logic Domain Authoring Convergence（135 总控）

## SSoT

- 关系事实源：`specs/135-logic-domain-authoring-roadmap/spec-registry.json`
- 人读说明：`specs/135-logic-domain-authoring-roadmap/spec-registry.md`

约定：

- member 关系、状态与依赖只认 json
- 本文件提供工作流路由、职责边界与建议顺序
- 后续若新增 member 或调整 scope，md 与 json 必须一起回写

## Existing Baseline

- `122` 已固定 `Module / Logic / Program` 的 canonical authoring 主链
- `125` 已把 Form 与 field-kernel 的第二波边界压到当前口径
- `127` 已固定 domain packages 的 service-first / program-first 总方向
- `129` 已把 postponed naming 与 structure owner 的治理口径写稳

`135` 的职责，是在这些已完成口径之上，再开一轮“作者面相位统一 + 包级 contract 收口”。

这里的 `122 / 125 / 127 / 129` 只算可修订基线。
若它们阻碍更优设计，当前波次可以直接修订对应事实源。

## Member Specs

| ID | 主题 | 状态 | 依赖 |
| --- | --- | --- | --- |
| `122` | runtime public authoring baseline | done | - |
| `125` | form / field-kernel baseline | done | `122` |
| `127` | domain packages baseline | done | `122` |
| `129` | naming governance baseline | done | `122` |
| `136` | declare-run phase contract | planned | `122`, `125`, `127`, `129` |
| `137` | form logic authoring cutover | planned | `125`, `127`, `136` |
| `138` | query logic contract cutover | planned | `122`, `127`, `136` |
| `139` | i18n logic contract cutover | planned | `122`, `127`, `129`, `136` |

## Workstream Routing Matrix

| Topic | Primary Owner Spec | Related Specs | Note |
| --- | --- | --- | --- |
| Logic 作者面的最终相位模型 | `136` | `122`, `129` | 负责 declaration versus run 的公开心智与内部归一化链路 |
| `$.lifecycle.*` 的 owner 与 phase contract | `136` | `122` | 固定到 Logic declaration contract |
| `$.fields(...)` 与 module-level `fields:` 的去留 | `136` | `125`, `127` | 固定 shared declaration contract 与 expert 路由 |
| Form 默认作者面 | `137` | `125`, `136` | 负责 `rules / derived / fields` 的最终收口 |
| Form 与 field-kernel 的 expert 边界 | `137` | `125`, `136` | 负责默认入口与 expert 入口重新分层 |
| Query 默认主输出与 root export | `138` | `127`, `136` | 负责 program-first 收口与 fields helper 降级 |
| Query 的 shared declaration contract 接入 | `138` | `136` | 负责 query internals 对 shared logic contract 的映射 |
| I18n 的 service-first 主身份 | `139` | `127`, `136` | 负责 service-first 收口与 projection 降级 |
| I18n driver lifecycle / async ready 接线 | `139` | `136` | 负责 shared declaration contract 与 service lifecycle 接入 |

当前显式不纳入：

- `@logixjs/domain`
  - 原因：这一轮先收直接受 fields / declaration contract 牵引的包面
  - 重开条件：`136-139` 的 planning 明确证明 `domain` 被同一合同直接卡死
  - 处理方式：新增 member spec，不污染现有四条 scope

## Suggested Execution Order

1. 先完成 `136`，把 declaration/run、lifecycle、fields、Platform signal 的统一契约定死。
2. 再推进 `137`，因为 Form 当前分叉最多，且直接受 `136` 约束。
3. 并行推进 `138` 与 `139`，让 Query 与 I18n 在共同相位模型下分别完成 program-first 与 service-first 收口。
4. 所有 member 实施时都按 forward-only 处理，不保留兼容层、弃用期或双轨默认入口。

## Planning Rule

- `135` 只写总控与路由，不直接承接实现 plan 或 tasks。
- 进入 planning 阶段后，每个 member spec 单独生成 plan 和 tasks。
- member 的任务清单必须使用 SpecKit，并采用 `$writing-plans` 的颗粒度模板。
