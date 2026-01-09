# 080 · Next Actions（从 tasks → implement 的最短路径）

## 目标

把“全双工前置”从 plan 体系推进到可执行 tasks 与可落地实现：

- 先落地 M2（Parser/Rewriter/Autofill/CLI）的 Node-only 基础设施闭环；
- 再把工件落盘/CI gate/最小回写闭环跑通；
- 最后再做 M3（Spy/Slots）语义与证据增强（均不得破坏单一真相源）。

## 立即要做的事（建议顺序）

0. **先补齐 078（M1：servicePorts）**
   - `specs/078-module-service-manifest/tasks.md`

1. **进入实现（M2 主线）**
   - `specs/081-platform-grade-parser-mvp/tasks.md`
   - `specs/082-platform-grade-rewriter-mvp/tasks.md`
   - `specs/079-platform-anchor-autofill/tasks.md`
   - `specs/085-logix-cli-node-only/tasks.md`

2. **实现落点（包拆分不变）**
   - `packages/logix-anchor-engine`：Node-only Parser/Rewriter/Autofill
   - `packages/logix-cli`：Node-only CLI（effect 同构）
   - `packages/logix-core`：保持纯净（不引入 ts-morph/swc）

3. **（可选，M3）在 M2 跑通后再进入**
   - `specs/084-loader-spy-dep-capture/tasks.md`
   - `specs/083-named-logic-slots/tasks.md`

## 入口文件（继续工作时直接打开）

- Group SSoT：`specs/080-full-duplex-prelude/spec-registry.json`
- Group 人读阐述：`specs/080-full-duplex-prelude/spec-registry.md`
- Group 索引清单：`specs/080-full-duplex-prelude/checklists/group.registry.md`
- Parser spec：`specs/081-platform-grade-parser-mvp/spec.md`
- Rewriter spec：`specs/082-platform-grade-rewriter-mvp/spec.md`
- Autofill spec：`specs/079-platform-anchor-autofill/spec.md`

## 需要写回到 plan 的关键裁决（不可丢）

- TS 解析：`ts-morph`；需要 AST 辅助时用 `swc`
- CLI/engine 尽可能用 `effect`，追求前端/Node-only 同构
- CLI 先做基础能力子命令，承担 Node-only 能力的集成测试入口
- `@logixjs/core` 保持 runtime 纯净：不引入 `ts-morph/swc` 这类重依赖
