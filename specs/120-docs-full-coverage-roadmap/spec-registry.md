# Spec Registry: Docs Full Coverage（120 总控）

## SSoT

- 关系事实源：`specs/120-docs-full-coverage-roadmap/spec-registry.json`
- 人读说明：`specs/120-docs-full-coverage-roadmap/spec-registry.md`

约定：

- member 关系、状态与依赖只认 json
- 本文件提供 docs coverage matrix、执行顺序与复用说明
- 若 docs 页面变化，本文件与 json 必须一起回写

## Existing Coverage Baseline

- `103` 已承接 `docs/standards/effect-v4-baseline.md`
- `113` 已完成 docs 根路由与 runtime/platform facts 第一波 cutover
- `115` 到 `119` 已完成 runtime package cutover 第一波

当前新增的 `121` 到 `129` 负责把 docs 主体规划补成“完整 spec 覆盖”。

## Member Specs

| ID | 主题 | 状态 | 依赖 |
| --- | --- | --- | --- |
| `103` | Effect V4 forward cutover | done | - |
| `113` | docs runtime cutover 第一波 | done | - |
| `115` | core kernel extraction 第一波 | done | `103`, `113` |
| `116` | host runtime rebootstrap 第一波 | done | `115` |
| `117` | domain package rebootstrap 第一波 | done | `115` |
| `118` | CLI rebootstrap 第一波 | done | `103`, `115` |
| `119` | examples / verification alignment 第一波 | done | `116`, `117`, `118` |
| `121` | docs foundation / governance convergence | done | `113` |
| `122` | runtime public authoring convergence | done | `103`, `115`, `116`, `117`, `121` |
| `123` | runtime kernel hotpath convergence | done | `103`, `115` |
| `124` | runtime control plane / verification convergence | done | `103`, `118`, `119`, `121` |
| `125` | form / field-kernel second wave | done | `117`, `122`, `123`, `124` |
| `126` | host scenario patterns convergence | done | `116`, `119`, `122`, `124`, `125` |
| `127` | domain packages second wave | done | `117`, `122`, `124` |
| `128` | platform layered map convergence | done | `121`, `122`, `123`, `124` |
| `129` | anchor / profile / postponed naming governance | done | `121`, `122`, `128` |

## Docs Coverage Matrix

| Docs Page | Primary Owner Spec | Related Specs | Coverage Note |
| --- | --- | --- | --- |
| `docs/README.md` | `121` | `113`, `120` | 根导航与全局写入路径 |
| `docs/adr/README.md` | `121` | `113` | ADR 根入口与路由规则 |
| `docs/adr/2026-04-04-docs-archive-cutover.md` | `121` | `113` | docs foundation 治理前提 |
| `docs/adr/2026-04-04-logix-api-next-charter.md` | `122` | `124`, `125`, `127`, `129` | 公开主链与 runtime-first authoring 宪法 |
| `docs/adr/2026-04-05-ai-native-runtime-first-charter.md` | `120` | `122`, `123`, `124`, `128`, `129` | cross-cutting charter，`120` 负责分发到相关成员 |
| `docs/ssot/README.md` | `121` | `113` | 新 SSoT 根入口 |
| `docs/ssot/runtime/README.md` | `121` | `122`, `123`, `124`, `125`, `126`, `127` | runtime 子树导航与 owner 路由 |
| `docs/ssot/runtime/01-public-api-spine.md` | `122` | `115`, `116`, `117` | 公开主链与 surviving surface |
| `docs/ssot/runtime/02-hot-path-direction.md` | `123` | `115` | kernel 热链路与 perf evidence |
| `docs/ssot/runtime/03-canonical-authoring.md` | `122` | `125`, `126`, `127` | `Module / Logic / Program` canonical surface |
| `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | `124` | `118`, `119`, `126` | capabilities 与 runtime control plane |
| `docs/ssot/runtime/05-logic-composition-and-override.md` | `122` | `125`, `127` | logic 组合与 expert override 边界 |
| `docs/ssot/runtime/06-form-field-kernel-boundary.md` | `125` | `117`, `122` | Form DSL 与 field-kernel 边界 |
| `docs/ssot/runtime/07-standardized-scenario-patterns.md` | `126` | `116`, `119`, `124`, `125` | host patterns、examples、verification 映射 |
| `docs/ssot/runtime/08-domain-packages.md` | `127` | `117`, `122`, `125` | domain package 分类与 future admission |
| `docs/ssot/runtime/09-verification-control-plane.md` | `124` | `118`, `119`, `126` | verification stages、input contract、machine report |
| `docs/ssot/platform/README.md` | `121` | `128`, `129` | platform 子树导航与 owner 路由 |
| `docs/ssot/platform/01-layered-map.md` | `128` | `122`, `123`, `124` | layered map 与 layer-to-code ownership |
| `docs/ssot/platform/02-anchor-profile-and-instantiation.md` | `129` | `122`, `128` | anchor/profile/instantiation 结构边界 |
| `docs/standards/README.md` | `121` | `113` | standards 根入口 |
| `docs/standards/docs-governance.md` | `121` | `113`, `120` | docs promotion pipeline 与 root governance |
| `docs/standards/effect-v4-baseline.md` | `103` | `122`, `123`, `124` | Effect V4 基线已由既有 spec 承接 |
| `docs/standards/logix-api-next-guardrails.md` | `120` | `122`, `123`, `124`, `125`, `127`, `128`, `129` | cross-cutting guardrails，`120` 负责 owner 分发 |
| `docs/standards/logix-api-next-postponed-naming-items.md` | `129` | `125`, `127` | naming bucket 与 structure owner 分离 |
| `docs/next/README.md` | `121` | `120` | next 根入口与活跃专题路由 |
| `docs/next/2026-04-05-runtime-docs-followups.md` | `120` | `121`, `122`, `123`, `124`, `125`, `126`, `127`, `128`, `129` | group-level followup bucket |
| `docs/proposals/README.md` | `121` | `113` | proposal 边界与 promotion lane |

## Suggested Execution Order

1. 先完成 `121`，把 docs foundation、governance、promotion lane 和根入口 owner 写稳。
2. 并行推进 `122 / 123 / 124`，分别收口 public authoring、kernel hot path、verification control plane。
3. 在上一步稳定后推进 `125 / 126 / 127`，把 Form、host scenario、domain package 的第二波目标补齐。
4. 最后推进 `128 / 129`，完成 platform layered map 与 anchor/profile/static governance 收口。

## Routing Rules

- charters 与 cross-cutting standards 使用 primary owner + related specs 口径
- docs root / subtree readme / governance 页，统一由 `121` 承接
- `docs/next/2026-04-05-runtime-docs-followups.md` 由 `120` 承接，作为 group-level dispatch bucket
- 若后续新增 active docs 页面，必须先把 coverage record 写入本文件和 `spec-registry.json`
