# Machine Report

| Field | Required | Meaning | Current Status | Notes |
| --- | --- | --- | --- | --- |
| `stage` | yes | `check / trial / compare` | active | 顶层主干固定 |
| `mode` | yes | `static / startup / scenario / compare` | active | CLI 已补齐 |
| `verdict` | yes | `PASS / FAIL / INCONCLUSIVE` | active | CLI 已补齐到大写三态 |
| `errorCode` | yes | 当前阶段的标准错误码；无错误时为 `null` | active | CLI 已补齐 |
| `summary` | yes | 可机读摘要 | active | 继续保留 |
| `environment` | yes | 当前入口上下文、entry/input/before-after 等 | active | CLI 已补齐 |
| `artifacts` | yes | 关键工件引用 | active | 继续保留 |
| `repairHints` | yes | 结构化修复建议 | active | CLI 已切到结构化对象数组 |
| `nextRecommendedStage` | yes | 推荐下一层入口 | active | 当前层已足够解释问题时返回 `null` |
