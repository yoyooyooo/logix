# Quickstart: 079 保守自动补全 Platform-Grade 锚点声明（怎么用/怎么验收）

## 0) 背景：它解决什么

当模块缺失关键锚点（例如没写 `services`、没写 `dev.source`）时，平台侧会出现：

- Manifest/IR 信息不完整（关系图缺边）；
- TrialRun 缺失依赖难以定位到端口/源码；
- 全双工回写能力降级为黑盒。

本特性提供一个保守的补全工具：只对“未显式声明”的对象补齐缺失锚点，且任何不确定都跳过并解释原因。

## 1) 怎么跑（report-only）

运行补全工具但不改写源码（仅输出报告）：

- `logix anchor autofill --runId r1 --repoRoot <dir> --mode report --out ./.logix/anchor/r1`

验收要点：

- 已显式声明 `services` 的模块不会被改写（包括 `services: {}`）。
- 不确定依赖不会被写回，报告包含 reason code。

## 2) 怎么写回（write-back）

审阅 report 后再写回：

- `logix anchor autofill --runId r2 --repoRoot <dir> --mode write --out ./.logix/anchor/r2`

验收要点：

- 写回仅限缺失字段（最小差异）。
- 重复运行第二次不应产生新的源码差异（幂等）。

## 3) 如何与 TrialRun/Manifest 对齐（可选）

对目标模块运行 `scripts/ir/inspect-module.ts`：

- 导出 `module-manifest.json` 与 `trial-run-report.json` 作为对比输入。
- 关注 `environment.missingServices/missingConfigKeys` 是否更易解释/收敛（并不要求完全为 0）。

## 4) 常见跳过原因（你需要手写声明的信号）

当报告出现以下 reason codes 时，说明你需要显式写锚点（而不是依赖工具猜测）：

- `dynamic_or_ambiguous_usage`：依赖来自动态表达式/中转变量/多候选；
- `unresolvable_service_id`：Tag 无法解析出稳定 id；
- `unsafe_to_patch`：定义形态无法安全改写（例如对象含 spread / 非字面量）。
