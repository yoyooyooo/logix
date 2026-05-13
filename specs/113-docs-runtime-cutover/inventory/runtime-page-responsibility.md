# Inventory: Runtime Page Responsibility

## Scope

- Runtime pages: `docs/ssot/runtime/01` 到 `09`
- Platform pages: `docs/ssot/platform/01` 到 `02`
- Goal: 给每一页补一个“唯一主职责 + 相邻页 + followup sink” 台账

## Responsibility Matrix

| Path | Cluster | Unique Responsibility | Adjacent Pages | Promotion Sink | Snapshot |
| --- | --- | --- | --- | --- | --- |
| `docs/ssot/runtime/01-public-api-spine.md` | runtime-core | 固定 `Module / Logic / Program / Runtime` 公开主链 | `02`, `03`, `04`, `08` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/02-hot-path-direction.md` | runtime-core | 固定 hot path、证据入口、重开条件 | `01`, `04`, `09` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/03-canonical-authoring.md` | runtime-core | 固定 canonical authoring 骨架与 authoring surface | `01`, `04`, `05`, `07` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | runtime-core | 固定 capabilities 与 runtime control plane 边界 | `01`, `02`, `03`, `09` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/05-logic-composition-and-override.md` | runtime-core | 固定 logic composition 与 override 冲突规则 | `03`, `07`, `08` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/06-form-field-kernel-boundary.md` | runtime-boundary | 固定 form 与 field-kernel 的职责边界 | `03`, `07`, `08`, `postponed naming` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/07-standardized-scenario-patterns.md` | runtime-boundary | 固定标准场景模式与示例锚点 | `03`, `05`, `06`, `09` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/08-domain-packages.md` | runtime-boundary | 固定 query / form / i18n / domain 的输出形态与包级规则 | `01`, `05`, `06`, `09`, `postponed naming` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/runtime/09-verification-control-plane.md` | runtime-boundary | 固定 `runtime.check / runtime.trial / runtime.compare` 验证主干 | `02`, `04`, `07`, `08` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/platform/01-layered-map.md` | platform | 固定跨层结构总分层与最小 walkthrough | `runtime/01`, `runtime/04`, `platform/02` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |
| `docs/ssot/platform/02-anchor-profile-and-instantiation.md` | platform | 固定 anchor、profile、instantiation 的当前处理口径 | `platform/01`, `runtime/01`, `postponed naming` | `docs/next/2026-04-05-runtime-docs-followups.md` | stable |

## Current Audit Notes

- runtime 01 到 09 以及 platform 01/02 已普遍具备 `来源裁决 / 相关规范 / 待升格回写` 模板
- followup sink 已恢复为单一 bucket，叶子页统一回指 `docs/next/2026-04-05-runtime-docs-followups.md`
- `06`、`08`、`platform/02` 与 postponed naming 的关系已显式收紧到命名后置，不再开放结构争论

## Example Anchor Audit

- `runtime/06` 当前挂出的 expert 示例锚点能落到真实文件：
  - `examples/logix/src/scenarios/ir/reflectStaticIr.ts`
- `runtime/07` 当前挂出的最小示例锚点都能落到 `examples/logix-react/src/demos/**` 下的真实文件：
  - `GlobalRuntimeLayout.tsx`
  - `LocalModuleLayout.tsx`
  - `DiShowcaseLayout.tsx`
  - `LayerOverrideDemoLayout.tsx`
  - `ProcessSubtreeDemo.tsx`

## Routing Rule

- 页面职责冲突优先通过交叉引用消解，不在两个叶子页重复写同一规则
- 新 followup 进入 `docs/next` 后，要从本表更新对应 `Promotion Sink`
