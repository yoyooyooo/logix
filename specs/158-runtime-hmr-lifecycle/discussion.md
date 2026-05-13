# Runtime HMR Lifecycle Discussion

**Purpose**: 承接当前 spec 下值得继续细化、但尚未冻结进 `spec.md` / `plan.md` / `tasks.md` 的讨论材料。  
**Status**: Working  
**Feature**: [spec.md](./spec.md)

## Rules

- 若 `spec.md` 还未补齐最小必要 SSoT，本文件不得代持 owner / boundary / closure gate 裁决
- 本文件不是 authority，不替代 `spec.md`
- 任何已达成裁决的内容，必须回写到 `spec.md` / `plan.md` / `tasks.md`
- 本文件允许保留多个候选 API 形状、备选方案、开放问题
- 若某条讨论已经关闭，应写明结论去向
- 实施完成后，本文件只保留 residual open questions 与 reopen evidence

## Open Questions

- [x] Q001: 第一版默认 reset 后恢复交互；业务 state survival 暂不进入当前 decision set，后续必须先过 safety gate。结论已回写到 `plan.md`、`research.md`、`contracts/README.md`。
- [x] Q002: 热生命周期证据使用 core-owned internal lifecycle event，并通过现有 evidence envelope 与 feature evidence artifact 闭合。本波次不新增 `runtime.*` 根命令。结论已回写到 `plan.md`、`research.md`、`contracts/README.md`、`quickstart.md`。
- [x] Q003: 第一版只要求 React example dogfooding；core contract 保持 host-neutral。结论已回写到 `plan.md`、`research.md`。
- [x] Q004: Example 是用户视角，不能把 `createExampleRuntimeOwner(...)` 作为 author-facing 路线。结论已回写到 `spec.md`、`plan.md`、`research.md`、`contracts/README.md`、`quickstart.md`、`tasks.md`。
- [x] Q005: HMR lifecycle 的用户侧承载点固定为 host dev lifecycle carrier。用户只在 Vite、Vitest 或 React development entrypoint 做单点启用，内部通过 Effect DI 或等价 layer boundary 给 runtime 注入 owner、registry、evidence service。结论已回写到 `spec.md`、`plan.md`、`data-model.md`、`contracts/README.md`、`tasks.md`。

## Candidate API Shapes

- [x] A001: 采纳为计划方向，但具体命名延后到 tasks。`RuntimeProvider` 不吞下 owner 真相，只消费 host lifecycle contract。见 `plan.md`。
- [x] A002: 部分采纳。Core 提供 lifecycle evidence / cleanup primitive，host 转发热边界。见 `research.md`。
- [x] A003: 已改判。repo-local helper 只能算上一轮实现残留，不能成为 example dogfooding 方向。闭包前必须移除 demo source 中的 helper authoring call，并以 host dev lifecycle carrier 测试替换 helper contract。
- [x] A004: 已关闭。当前波次不扩 `runtime.*` 根命令；`09` 承接 evidence artifact law，`04` 只回写负向说明。见 `plan.md` 的 Closure Matrix 与 Verification Matrix。
- [x] A005: 采纳。优先提供 dev-only host entrypoint、Vite plugin 或 Vitest setup entrypoint。`Runtime.make({ hmr: true })` 不作为首选公开口径，tree shaking 依赖静态模块边界。

## Alternatives

- [x] ALT001: 已拒绝为终局形态。可作为临时调查手段，但 closure 必须移除长期 per-demo policy。
- [x] ALT002: 已拒绝。full reload 掩盖 lifecycle evidence。
- [x] ALT003: 已拒绝为第一版默认。state survival 留到 future safety gate。
- [x] ALT004: 已拒绝。要求用户手动组装内部 HMR Layer 会暴露内部生命周期策略，并让每个 runtime callsite 成为潜在集成失败点。
- [x] ALT005: 已拒绝为首选。核心 `Runtime.make` 布尔开关把 host dev lifecycle 放进 core public option，且运行时布尔值本身不能作为生产 tree shaking 证据。

## Decision Backlinks

- `spec.md` 冻结 owner、boundary、closure gate：Runtime HMR Lifecycle 是开发热更新下的 runtime 生命周期合同，核心真相不由本 discussion 代持。
- `plan.md` 冻结第一版技术路线：reset-first、`reset | dispose` decision set、core host-neutral、host dev lifecycle carrier、single evidence envelope、dev-only static boundary、large-file decomposition before semantic growth。
