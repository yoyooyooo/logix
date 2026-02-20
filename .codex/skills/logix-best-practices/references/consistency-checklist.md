---
title: 文档与样例一致性核对清单
---

# 文档与样例一致性核对清单

用于在每次修改 `logix-best-practices` 后快速确认：`SKILL.md`、`references/*`、`assets/*`、`scripts/*` 是否仍指向同一套语义与交付标准。

## 1) 触发与入口

- `SKILL.md` frontmatter `description` 只描述“何时使用”，不复述具体流程。
- `SKILL.md` 资源导航包含：工作流、北极星、一致性清单、最小样板、质量门。
- 不出现仓库私有路径或组织内约定词（保留通用 `src/*` 结构即可）。

## 2) 北极星语义（必须一致）

- 单一事实源：`Static IR + Dynamic Trace`。
- 协作策略：`linkDeclarative-first`，`link` 仅用于 async/external bridge。
- 事务边界：同步事务窗口禁止 IO、嵌套 dispatch、`run*Task`。
- 核心路径改动：必须补齐性能与诊断证据闭环。

## 3) 文档与 assets 对齐

- `references/feature-first-minimal-example.md` 列出的文件与 `assets/feature-first-customer-search/src` 实际文件一一对应。
- `runtime/root.impl.ts` 默认挂载 declarative process；blackbox process 仅作为回退示例。
- `searchToDetail.declarative.process.ts` 与 `searchToDetail.process.ts` 的注释均明确“确定性优先 / bridge 回退”边界。
- `scenarios/process-link-boundary-compare.ts` 仍能解释 same-tick 与 bridge-after 差异。

## 4) 命令表达中立性

- 文档优先用 `<pkg-manager> run ...` 表示通用命令。
- 若给出具体命令，至少覆盖主流等价方式（如 npm/pnpm/yarn/bun）或明确“按项目脚本等价替换”。
- 所有测试命令默认非 watch 表达。

## 5) 脚本与门禁一致

- `scripts/scaffold-feature-first.mjs` 描述与默认行为一致（默认不覆盖、`--force` 显式覆盖）。
- `scripts/check-pattern-reuse.mjs` 的参数、示例与 `references/workflow.md` 保持一致。
- DoD 始终包含：类型检查 → lint → 非 watch 测试 →（核心路径）性能/诊断证据。

## 6) 快速漂移扫描（可选）

```bash
# <skill-root> 即 SKILL.md 所在目录
rg -n "docs/ssot|packages/logix|specs/|intent-flow|PoC|067" <skill-root>
rg -n "Process\\.link\\(|linkDeclarative|blackbox|best-effort|Static IR|Dynamic Trace" <skill-root>
```
