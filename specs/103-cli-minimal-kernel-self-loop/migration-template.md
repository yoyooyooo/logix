---
description: "Forward-only migration template + protocol/behavior map for 103-cli-minimal-kernel-self-loop"
---

# 103 Forward-only 迁移模板与映射

> 本文件是 `gate:migration-forward-only` 的真值源：既提供迁移说明模板，也提供脚本读取的机器映射。

## 目标

- forward-only：允许破坏性演进，但**不允许兼容层/弃用期双轨**。
- 任何协议/行为破坏都必须同时满足：
  - 协议版本显式提升；
  - 同次变更附迁移说明；
  - CI `gate:migration-forward-only` 通过。

## 使用方式

1. 发生 breaking 变更时，复制下方模板到：
   `specs/103-cli-minimal-kernel-self-loop/notes/migrations/<YYYYMMDD>-<slug>.md`
2. 按模板补齐映射表、迁移步骤、失败指引、验证证据。
3. 提交变更时运行：
   - `tsx scripts/checks/evolution-forward-only.ts`
   - 或在 CI 模式使用 `--base <ref>` 比较分支差异。

## 迁移说明模板（复制后填写）

```md
---
migrationId: MIG-YYYYMMDD-<slug>
spec: 103-cli-minimal-kernel-self-loop
gate: gate:migration-forward-only
reasonCode: GATE_MIGRATION_FORWARD_ONLY_FAILED
breaking: true
owners:
  - "@owner"
---

# Migration: <标题>

## Breaking Summary

- <一句话描述破坏点>

## Protocol/Behavior Mapping

| surfaceId | affectedPath | changeType | fromVersion | toVersion | operatorAction |
| --- | --- | --- | --- | --- | --- |
| contract.command-result.schema | specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json | schema-break | 2 | 3 | 更新消费者解析与断言 |

## Upgrade Steps

1. <步骤1>
2. <步骤2>
3. <步骤3>

## Failure Guidance

- 症状：<旧脚本/旧调用失败方式>
- reasonCode：`GATE_MIGRATION_FORWARD_ONLY_FAILED`
- 处理：<如何回到可用状态>

## Verification Evidence

- `tsx scripts/checks/evolution-forward-only.ts --base origin/main`
- `<补充 typecheck/test/perf 证据命令>`
```

## 协议/行为破坏映射（机器可读）

<!-- logix:migration-map:start -->
```json
{
  "schemaVersion": 1,
  "specId": "103-cli-minimal-kernel-self-loop",
  "gate": "gate:migration-forward-only",
  "reasonCode": "GATE_MIGRATION_FORWARD_ONLY_FAILED",
  "migrationNotesDir": "specs/103-cli-minimal-kernel-self-loop/notes/migrations",
  "requiredSections": [
    "Breaking Summary",
    "Protocol/Behavior Mapping",
    "Upgrade Steps",
    "Failure Guidance",
    "Verification Evidence"
  ],
  "requiredFrontMatterKeys": [
    "migrationId",
    "spec",
    "gate",
    "reasonCode",
    "breaking"
  ],
  "surfaces": [
    {
      "id": "contract.command-result.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "contract.extension-manifest.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/extension-manifest.v1.schema.json",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "contract.verify-loop.input.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.input.v1.schema.json",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "contract.verify-loop.report.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.report.v1.schema.json",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "contract.reason-catalog",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "contract.verify-loop",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/verify-loop.md",
      "kind": "behavior",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "runtime.protocol.types",
      "path": "packages/logix-cli/src/internal/protocol/types.ts",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "runtime.protocol.reason-catalog",
      "path": "packages/logix-cli/src/internal/protocol/reasonCatalog.ts",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "runtime.protocol.result-v2",
      "path": "packages/logix-cli/src/internal/protocol/resultV2.ts",
      "kind": "protocol",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "runtime.verify.gates",
      "path": "packages/logix-cli/src/internal/verify-loop/gates.ts",
      "kind": "behavior",
      "breakingWhen": "always-on-change"
    },
    {
      "id": "runtime.verify.state-machine",
      "path": "packages/logix-cli/src/internal/verify-loop/stateMachine.ts",
      "kind": "behavior",
      "breakingWhen": "always-on-change"
    }
  ],
  "versionChecks": [
    {
      "id": "version.command-result.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json",
      "pointer": "/properties/schemaVersion/const"
    },
    {
      "id": "version.extension-manifest.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/extension-manifest.v1.schema.json",
      "pointer": "/properties/manifestVersion/const"
    },
    {
      "id": "version.verify-loop.input.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.input.v1.schema.json",
      "pointer": "/properties/schemaVersion/const"
    },
    {
      "id": "version.verify-loop.report.schema",
      "path": "specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.report.v1.schema.json",
      "pointer": "/properties/schemaVersion/const"
    }
  ]
}
```
<!-- logix:migration-map:end -->

## 说明

- `surfaces[]` 里的文件发生变更时，脚本按 forward-only 视为破坏性面变更候选。
- `versionChecks[]` 负责保证 schema/manifest 版本不可“静默破坏”。
- 迁移说明必须写在 `notes/migrations/`，并包含模板定义的 front matter 与章节。
