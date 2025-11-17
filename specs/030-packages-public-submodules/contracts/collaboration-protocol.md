# Contract: Parallelization Protocol（最小摩擦协作协议）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-25  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 目标：在“一个人能做 10× 事”的前提下，把多人并行的摩擦降到最低——减少冲突面、减少口头对齐成本、把边界变成可验证规则。

## 1) 你无法只靠目录结构解决的问题

目录结构 + exports + gate 能显著降低：

- “意外把实现细节变成 public API”
- “不小心 deep import internal”
- “重构 internal 牵动业务代码”

但它解决不了：

- 多个人同时重命名/移动同一包内大量文件 → 必然冲突
- 多个人同时修改同一篇大文档/同一批 examples → 必然冲突

因此必须配套 **最小团队约定**，把“并行写作”变成可控的流水线。

## 2) 最小角色划分（推荐）

- **Spec Owner（裁决/合并人）**：维护 `contracts/public-submodules.md` 的裁决一致性（概念归属、入口命名、例外登记）。
- **Package Owner（包负责人）**：负责某个 `packages/<pkg>` 的结构/命名/exports/迁移（可并行）。
- **Integrator（集成人）**：负责跨包调用方（`examples/*`、`apps/docs/*`）的“最终整合扫尾”，减少多人同时改同一处。

> 同一个人可以兼任多个角色；关键是**同一时间同一包的结构变更只有一个 owner**。

## 3) Touch-Set 规则（减少冲突的硬约束）

每个任务/PR 必须声明 touch-set（允许触达的文件集合），并尽量满足：

- **单包结构变更**：只改 `packages/<pkg>/**` + 与该包直接相关的少量调用方引用（≤3 处 docs/examples），禁止顺手“全仓替换”。
- **Docs 变更拆分**：单 PR 只改一个 docs 子树（例如 `apps/docs/content/docs/form/**`）；避免改全局 `meta.json` 或大索引文件（如必须，交给 Integrator）。
- **裁决先行**：涉及新增/删除 public submodule 或 subpath 时，先改 `contracts/public-submodules.md` 再改代码（防止入口分叉）。

## 4) 结构变更的“锁”规则（避免 rename 冲突）

- 同一包的 “rename/move/export keys 变更” 视为 **结构变更**，必须由 Package Owner 独占执行窗口。
- 对外入口的命名/归属冲突，以 `contracts/public-submodules.md` 为唯一裁决源，由 Spec Owner 收敛。
- 大规模 rename 建议尽早合入（越晚越冲突），并在合入后立刻让 gate 成为“新常态”。

## 5) 最小验收（并行施工的护栏）

每个包完成一次阶段性交付，至少要满足：

- 对齐 `contracts/public-submodules.md`（概念入口、例外、推荐 import）
- 对齐 `contracts/exports-policy.md`（exports 策略 + internal 屏蔽）
- 通过“public submodules 验证门”（实现阶段交付）

> 这是为了让并行者之间通过“机器可验证的边界”对齐，而不是靠记忆与口头约定。

## 6) 可执行的拆解方式（模板）

建议按 “verify gate / 包迁移 / 集成扫尾” 三类任务并行：

- **轨道 A：Shared Guardrail（1 人）**：实现并维护 `verify:public-submodules`（所有人依赖的护栏）。
- **轨道 B：Per-Package Migration（N 人）**：每人负责 1–2 个包（严格按 touch-set），优先消除 C 类泄漏（见 `contracts/gap-report.md`）。
- **轨道 C：Integration Sweep（1 人）**：集中处理 examples/docs 的跨包引用调整（避免多人同时改同一目录）。

