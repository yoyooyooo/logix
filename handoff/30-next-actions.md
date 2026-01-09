# Next Actions（可执行，按优先级）

1. 先补齐 078（Manifest `servicePorts`）
   - 入口任务：`specs/078-module-service-manifest/tasks.md` Phase 2（T005–T012）
   - 关键落点：`packages/logix-core/src/internal/serviceId.ts`、`packages/logix-core/src/internal/reflection/manifest.ts`、`packages/logix-core/src/Module.ts`

2. 打穿 M2 主线（081 → 082 → 079 → 085）
   - `specs/081-platform-grade-parser-mvp/tasks.md`
   - `specs/082-platform-grade-rewriter-mvp/tasks.md`
   - `specs/079-platform-anchor-autofill/tasks.md`
   - `specs/085-logix-cli-node-only/tasks.md`

3. M2 达标后再进入 M3（report/语义增强）
   - `specs/084-loader-spy-dep-capture/tasks.md`
   - `specs/083-named-logic-slots/tasks.md`

