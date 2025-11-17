# Review Report: [041 - Docs Inline Playground]

**Status**: [APPROVED_WITH_SUGGESTIONS]
**Digest**: PENDING
**Reviewer**: Antigravity
**Date**: 2025-12-27

## 0. Assumptions

- 假设 `packages/logix-sandbox` 的 `TrialRun` 能力已就绪或作为本特性一部分（Worker 封装）在 Phase 2 落地。
- 假设 `apps/docs` 已具备 i18n 基础（Fumadocs/Next.js i18n），本特性只需适配文案。

## 1. 执行摘要 (Executive Summary)

- **一句话裁决**：方案完整，分期合理，Specs/Plan/Tasks 对齐度高，建议重点关注 `apps/docs` 集成 Sandbox 时的 Headers 配置与构建流水线适配，批准通过。
- **Top 3 issues**：
  1. 需要确认 `logix-sandbox` 是否依赖 `SharedArrayBuffer`，从而强制要求 `apps/docs` 配置 COOP/COEP Headers。
  2. 生产环境构建（Vercel/Netlify 等）的静态资产同步（`sync-sandbox-assets`）需要确保在 Next.js build 之前可靠执行。
  3. 移动端的体验降级策略（NFR-001 强调了设备条件，但 Sandbox 在移动端可能性能受限）。

## 2. 必须修改 (Blockers)

> 当前无阻塞级设计漏洞，下述为必须确认的技术约束。

- R001 [BLOCKER] [Target: plan.md / tasks.md] [Location: Phase 1 Setup]
  - **问题**：`logix-sandbox` 若使用 Atomics/SharedArrayBuffer 实现高性能通信，宿主站点（`apps/docs`）必须配置 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`。如果未配置，Sandbox 可能无法启动。
  - **建议**：在 T002/T007 中显式检查 `next.config.mjs` headers 配置；如果不需要 Atomics 则明确注明。
  - **验收**：本地 `pnpm dev` 与 `pnpm build && pnpm start` 均能正常启动 Sandbox Worker 且无跨域/Buffer 报错。

## 3. 风险与建议 (Risks & Recommendations)

- R101 [MAJOR] [Risk: Build Pipeline]

  - **描述**：`apps/docs` 作为一个 next.js app，引用 `packages/logix-sandbox/public` 下的资源可能在 CI/CD 中失效（如果仅仅是软链或 dev 时期 copy）。
  - **缓解**：`T003` 的 `sync-sandbox-assets.mjs` 脚本应设计为幂等且“物理复制”，并挂载到 `apps/docs` 的 `prebuild` 钩子中。
  - **验证**：执行 `pnpm -C apps/docs build` 后检查 `.next/static` 或 `public` 产物中是否确实包含 sandbox 资源。

- R102 [MINOR] [Suggestion: Mobile UX]
  - **描述**：移动端键盘编辑代码体验较差，且 Sandbox 耗电/内存占用可能导致页面刷新。
  - **建议**：在 `Playground.tsx` 中增加媒体查询，移动端默认仅展示“运行”结果或设为“ReadOnly”模式，避免误触键盘弹出。
  - **验证**：Chrome 模拟器切换为移动端视角验收。

## 4. 技术分析 (Technical Analysis)

- **架构合理性**：将 Playground 作为 docs 站点的内联组件（Client Component）+ Worker 隔离的模式符合业界最佳实践（参考 React Docs / Vue Docs）。
- **约定对齐**：复用 `logix-sandbox` 避免了重造轮子；Data Model 清晰地定义了“文档作者意图”与“运行时配置”的边界。
- **复杂度**：主要复杂度在于 Worker 通信与状态同步（RunResult 回传），通过 `sandbox.ts` 封装与 `Effect` 流程控制可以很好地管理。

## 5. 宪法与质量门检查 (Constitution Check)

- **性能与可诊断性**：PASS
  - Plan 已明确“延迟加载”与“确定的 runId”，符合 NFR。
- **IR/锚点漂移风险**：N/A
  - 纯消费端特性，不涉及 IR 变更。
- **稳定标识**：PASS
  - 明确要求 `runId` 派生自 `blockId` + 序号，符合可复现原则。
- **事务窗口（禁止 IO）**：PASS
  - 运行在 Worker，主线程无阻塞 IO。
- **破坏性变更**：PASS
  - 无。

## 6. 覆盖与漂移 (Coverage & Drift)

- **覆盖度**：
  - User Stories 1-4 全部映射到 Tasks Phase 3-6。
  - P1/P2/P3 优先级与 Specs 一致。
- **漂移点**：
  - 无明显漂移。

## 7. Next Actions

- 把本文件保存为 `specs/041-docs-inline-playground/review.md`。
- 回到 speckit 会话，执行：`$speckit plan-from-review 041-docs-inline-playground`。
