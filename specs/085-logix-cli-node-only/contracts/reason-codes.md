# Reason Codes: Logix CLI（085）

> Superseded background only. This 085 reason-code dictionary is not current CLI authority.
> Current CLI authority is [../../160-cli-agent-first-control-plane-cutover/spec.md](../../160-cli-agent-first-control-plane-cutover/spec.md) and [../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md).
> Old toolbox command names below are negative-only legacy references for `160`.

> 本文件是 `reasonCodes` 的权威字典。`CommandResult@v1.artifacts[].reasonCodes[]` 只能使用本表定义，或符合本表给出的前缀扩展规则。

## 1) 级别定义

- `error`：必须阻断（通常 exit code=1 或 2）。
- `warn`：可继续执行，但需要人工/Agent 关注。
- `info`：解释性标记，不直接触发阻断。

## 2) 固定枚举

| code | level | 命令 | 触发条件 | 建议动作 | 可自动重试 |
| --- | --- | --- | --- | --- | --- |
| `MISSING_REQUIRED_FILE:<file>` | error | `ir validate` | 必需工件文件缺失 | 先重跑 `ir export` 生成缺失文件 | 否 |
| `PARSE_ERROR:<errorCode>` | error | `ir validate` | 工件解析失败 | 修复 JSON/输入路径后重跑 | 否 |
| `DIFF_ADDED_FILES` | error | `ir diff` | after 比 before 多出 gating 文件 | 评估变更是否应进入基线 | 否 |
| `DIFF_REMOVED_FILES` | error | `ir diff` | after 比 before 丢失 gating 文件 | 补齐工件或更新基线策略 | 否 |
| `DIFF_CHANGED_FILES` | error | `ir diff` | gating 语义摘要变化 | 审核差异并决定放行/修复 | 否 |
| `DIFF_NON_GATING_CHANGES` | info | `ir diff` | 仅非门禁差异变化 | 可忽略或纳入审计 | 是 |
| `TRANSFORM_REPORT_ONLY` | info | `transform module --mode report` | report-only 生成报告 | 人工审阅 PatchPlan | 否 |
| `TRANSFORM_WRITE_APPLIED` | warn | `transform module --mode write` | 写回完成 | 运行回归 + 二次执行验证幂等 | 否 |
| `TRANSFORM_WRITE_FAILED` | error | `transform module --mode write` | 写回失败或部分失败 | 修复冲突后重试 | 否 |
| `CLI_HOST_MISSING_BROWSER_GLOBAL` | error | `trialrun` 等 | 入口依赖浏览器全局但 host=node | 用 `--host browser-mock` 重跑或调整入口顶层代码 | 是 |
| `CLI_HOST_MISMATCH` | warn | `trialrun` 等 | host 与入口语义可能不匹配 | 优先改为 `--host browser-mock` 验证 | 是 |

## 3) 前缀扩展规则（受控）

以下前缀允许在固定枚举外扩展具体细项，扩展值必须保持稳定、可解析：

- `WORKFLOW_SURFACE_*`：`ir validate` 的 controlProgramSurface 对齐失败细节。
- `DIFF_PARSE_ERROR:<SIDE>:<FILE>:<CODE>`：`ir diff` 解析失败细节。
- `INVALID_SHAPE:*` / `MANIFEST_*` / `WORKFLOW_SURFACE_*`：`ir validate` 的结构约束细节。

新增前缀必须先更新本文件，再更新实现与测试。

## 4) 使用约束

- `reasonCodes` 必须稳定排序（字典序）。
- 同一工件内禁止重复 code。
- 不允许把随机值、时间戳拼进 code。
