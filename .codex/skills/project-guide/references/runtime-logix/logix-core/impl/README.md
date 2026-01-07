# logix-core/impl（LLM 薄入口）

本目录为实现备忘录（impl），只保留导航；正文拆分为同目录分节文件，按需加载。

## 与 SSoT 的关系（先看口径，再看实现）

- 运行时契约/语义口径（SSoT）：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/*`、`.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/*`、`.codex/skills/project-guide/references/runtime-logix/logix-core/observability/*`。
- 平台级硬约束（如事务窗口禁止 IO/等待）：`docs/specs/sdd-platform/ssot/contracts/00-execution-model.md`。
- 本目录只补充实现层“为什么/怎么做/风险点/源码锚点”，避免重复叙述 SSoT；若发现冲突，优先修 SSoT，再修 impl。

## 最短链路

- 我想先看“实现小抄/高频坑位”：读 `README.00-impl-cheatsheet.md`
- 我在改动 `packages/logix-core/src/internal/**`：先读 `README.03-structure-rules.md`
- 我在改 Module/Bound API/Env：读 `README.05-bound-api-constraints.md` → `README.07-env-and-bootstrap.md`
- 我在看 ModuleImpl/AppRuntime 组装：读 `README.06-moduleimpl.md`
- 我在改 StateTransaction / Devtools / 事务录制（含 065 id-first）：读 `README.09-statetransaction-devtools.md`

## 分节索引

- `README.00-impl-cheatsheet.md`
- `README.01-how-to-use.md`
- `README.02-planned.md`
- `README.03-structure-rules.md`
- `README.04-config-service.md`
- `README.05-bound-api-constraints.md`
- `README.06-moduleimpl.md`
- `README.07-env-and-bootstrap.md`
- `README.08-trait-provenance.md`
- `README.09-statetransaction-devtools.md`
