# Scenario Remediation Map (Primitive-Only)

## Purpose

把 `reasonCode` 映射到可执行 remediation actions，减少 Agent 手工解释步骤。  
约束：不新增 CLI 子命令，动作必须落到现有 primitives。

## Coverage Focus

- `S03` 审批与流程编排
- `S04` 批量操作
- `S09` 乐观更新与回滚

## Machine-readable Map

```json
{
  "schemaVersion": 1,
  "kind": "ScenarioRemediationMap",
  "defaults": {
    "VERIFY_RETRYABLE": [
      {
        "id": "retry-verify-loop",
        "action": "verify-loop.resume",
        "args": {
          "gateScope": "runtime",
          "maxAttempts": 3
        }
      }
    ],
    "VERIFY_NO_PROGRESS": [
      {
        "id": "reset-with-ir-diff",
        "action": "ir.diff",
        "args": {
          "before": "baseline",
          "after": "current"
        }
      },
      {
        "id": "manual-transform-report",
        "action": "transform.module.report",
        "args": {
          "mode": "report"
        }
      }
    ],
    "GATE_TEST_FAILED": [
      {
        "id": "rerun-trialrun-evidence",
        "action": "trialrun.evidence",
        "args": {
          "diagnosticsLevel": "full"
        }
      }
    ]
  },
  "scenarios": {
    "S03": {
      "VERIFY_RETRYABLE": [
        {
          "id": "approval-resume-check",
          "action": "verify-loop.resume",
          "args": {
            "target": "fixture:pass",
            "gateScope": "runtime",
            "maxAttempts": 3
          }
        }
      ],
      "GATE_TEST_FAILED": [
        {
          "id": "approval-rerun-trialrun",
          "action": "trialrun.evidence",
          "args": {
            "diagnosticsLevel": "full"
          }
        },
        {
          "id": "approval-transform-report",
          "action": "transform.module.report",
          "args": {
            "mode": "report"
          }
        }
      ]
    },
    "S04": {
      "VERIFY_RETRYABLE": [
        {
          "id": "batch-resume-check",
          "action": "verify-loop.resume",
          "args": {
            "target": "fixture:pass",
            "gateScope": "runtime",
            "maxAttempts": 2
          }
        }
      ],
      "VERIFY_NO_PROGRESS": [
        {
          "id": "batch-diff-static-ir",
          "action": "ir.diff",
          "args": {
            "before": "baseline",
            "after": "current"
          }
        }
      ]
    },
    "S09": {
      "VERIFY_RETRYABLE": [
        {
          "id": "optimistic-resume-check",
          "action": "verify-loop.resume",
          "args": {
            "target": "fixture:pass",
            "gateScope": "runtime",
            "maxAttempts": 3
          }
        }
      ],
      "VERIFY_NO_PROGRESS": [
        {
          "id": "optimistic-generate-transform-report",
          "action": "transform.module.report",
          "args": {
            "mode": "report"
          }
        }
      ]
    }
  }
}
```
