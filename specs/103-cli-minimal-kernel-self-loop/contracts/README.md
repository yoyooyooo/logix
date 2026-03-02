# Contracts Index: 103-cli-minimal-kernel-self-loop

## 协议文档

- `control-envelope.md`：控制平面核心对象与禁止项
- `reason-catalog.md`：稳定 reason code 目录
- `extension-runtime.md`：扩展宿主生命周期与安全边界
- `verify-loop.md`：机器门禁链与 verdict 语义
- `scenario-index.md`：场景索引与 primitives 推荐命令链
- `scenario-remediation-map.md`：reason -> remediation actions 场景映射

## Schemas

- `schemas/command-result.v2.schema.json`
- `schemas/extension-manifest.v1.schema.json`
- `schemas/verify-loop.input.v1.schema.json`
- `schemas/verify-loop.report.v1.schema.json`
- `schemas/next-actions.execution.v1.schema.json`
- `schemas/describe.report.v1.schema.json`
- `schemas/verification-chain.catalog.v1.schema.json`
- `schemas/scenario-playbook.input.v1.schema.json`
- `schemas/scenario-playbook.report.v1.schema.json`
- `schemas/scenario.verdict.v1.schema.json`

## Scenario Playbook Examples

- `contracts/examples/s01.playbook.json`
- `contracts/examples/s03.playbook.json`
- `contracts/examples/s06.playbook.json`
- `contracts/examples/s08.playbook.json`

## 用户迁移：命令合并（Command Merged）

当你调用旧命令时，CLI 会返回 `E_CLI_COMMAND_MERGED`，并在 `nextActions[]` 给出替代命令。

- `contract-suite.run` -> `ir validate --profile contract`
- `spy.evidence` -> `trialrun --emit evidence`
- `anchor.index` -> `ir export --with-anchors`

参考：

- reason code 约束：`specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md`
- verify-loop 契约：`specs/103-cli-minimal-kernel-self-loop/contracts/verify-loop.md`

## 用户门禁：自治闭环产物（verify-autonomous-loop）

`verify-autonomous-loop` 门禁调用 `examples/logix/scripts/cli-autonomous-loop.mjs`，默认在 `.artifacts/autonomous-loop/` 生成：

- `verdict.json`：统一裁决（`finalVerdict` / `finalReasonCode` / `steps[]`）
- `checksums.sha256`：证据文件校验清单（SHA256）

最小证据包路径（相对 `.artifacts/autonomous-loop`）：

- `02-bundle/trialrun.report.json`
- `02-bundle/trace.slim.json`
- `02-bundle/evidence.json`
- `03-ir-validate/ir.validate.report.json`
- `04-ir-diff/ir.diff.report.json`
- `05-transform-module/transform.report.json`
- `07-verify-loop-resume/verify-loop.report.json`

## Machine-readable References

```json
{
  "commandMerge": {
    "reasonCatalog": "specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md",
    "mappings": [
      { "legacy": "contract-suite.run", "replacement": "ir validate --profile contract" },
      { "legacy": "spy.evidence", "replacement": "trialrun --emit evidence" },
      { "legacy": "anchor.index", "replacement": "ir export --with-anchors" }
    ]
  },
  "autonomousLoopGate": {
    "script": "examples/logix/scripts/cli-autonomous-loop.mjs",
    "ciWorkflow": ".github/workflows/ci.yml",
    "ciJob": "verify-autonomous-loop",
    "outDir": ".artifacts/autonomous-loop",
    "artifacts": [
      "verdict.json",
      "checksums.sha256",
      "02-bundle/trialrun.report.json",
      "02-bundle/trace.slim.json",
      "02-bundle/evidence.json",
      "03-ir-validate/ir.validate.report.json",
      "04-ir-diff/ir.diff.report.json",
      "05-transform-module/transform.report.json",
      "07-verify-loop-resume/verify-loop.report.json"
    ]
  }
}
```

## 约束

- 所有 breaking 契约变更必须同步迁移说明。
- 核心协议字段禁止出现项目语义。
