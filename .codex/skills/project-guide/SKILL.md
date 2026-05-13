---
name: project-guide
description: 在 intent-flow 仓库做架构/规划/Runtime/示例/日常开发时，用最短导航定位新 docs 根骨架、archive 历史基线、代码落点与质量门
---

# intent-flow · project-guide

## 目标

- 用最少上下文定位当前有效的新 docs 根骨架、历史材料和代码落点。
- 默认优先读新事实源，再把 archive 材料当背景。
- 当前主线固定为 AI Native、runtime-first、Effect V4。
- 治理、质量门与安全约束以 `AGENTS.md` 为准。

## Docs 路由

- 根入口：`docs/README.md`
- 新事实源：`docs/ssot/README.md`
- 重大裁决：`docs/adr/README.md`
- 跨主题规范：`docs/standards/README.md`
- 冻结历史材料：`docs/archive/README.md`

## 当前高优先级入口

- AI Native 主旋律：`docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
- logix-api-next 总宪法：`docs/adr/2026-04-04-logix-api-next-charter.md`
- API 护栏：`docs/standards/logix-api-next-guardrails.md`
- Effect V4 基线：`docs/standards/effect-v4-baseline.md`
- 公开主链：`docs/ssot/runtime/01-public-api-spine.md`
- 热链路方向：`docs/ssot/runtime/02-hot-path-direction.md`
- canonical authoring：`docs/ssot/runtime/03-canonical-authoring.md`
- 验证控制面：`docs/ssot/runtime/09-verification-control-plane.md`
- 领域包规划：`docs/ssot/runtime/08-domain-packages.md`

## 新会话最短启动

1. 读 `docs/README.md`
2. 读 `docs/adr/2026-04-05-ai-native-runtime-first-charter.md`
3. 读 `docs/standards/effect-v4-baseline.md`
4. 读 `docs/ssot/runtime/01-public-api-spine.md`
5. 读 `docs/ssot/runtime/02-hot-path-direction.md`
6. 读 `docs/ssot/runtime/09-verification-control-plane.md`
7. 再按任务下钻到对应 runtime 或 platform 页面
8. 若新树里没有答案，再回看 `docs/archive/**`

## 当前任务路由

| 你想做… | 先读… | 再下钻… |
| --- | --- | --- |
| 改公开 API 主链 | `docs/ssot/runtime/01-public-api-spine.md` | `docs/ssot/runtime/03-canonical-authoring.md` |
| 改内部热链路 | `docs/ssot/runtime/02-hot-path-direction.md` | `packages/logix-core/src/**` |
| 改 React 宿主语义 | `docs/ssot/runtime/07-standardized-scenario-patterns.md` | `packages/logix-react/**` |
| 改领域包规划 | `docs/ssot/runtime/08-domain-packages.md` | 对应 `packages/*` |
| 改 capabilities / control plane | `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | `packages/logix-core/src/Runtime*` |
| 改验证控制面 | `docs/ssot/runtime/09-verification-control-plane.md` | `packages/logix-core/src/internal/observability/**`、`packages/logix-core/src/Reflection.ts`、`packages/logix-sandbox/**` |
| 审视锚点 / static profile | `docs/ssot/platform/02-anchor-profile-and-instantiation.md` | `docs/standards/logix-api-next-postponed-naming-items.md` |
| 查历史上下文 | `docs/archive/README.md` | `docs/archive/**` |

## 代码主落点

- runtime 主线：`packages/logix-core`
- React 宿主：`packages/logix-react`
- sandbox / alignment lab：`packages/logix-sandbox`
- 核心示例：`examples/logix`

## Effect V4 与验证

- 当前主分支按 Effect V4 写
- 固有认知与当前类型提示冲突时，以本地 d.ts 和编译器为准
- 推荐验证顺序：
  - `pnpm check:effect-v4-matrix`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:turbo`

## 使用原则

- 优先相信新 SSoT、ADR、standards
- archive 材料只作背景，不作默认依据
- 若新文档与旧代码冲突，先按新事实源理解，再决定代码如何收敛
- 若某个概念只是为了平台叙事、旧锚点化或过度静态化存在，默认保持怀疑
