# Legacy Exit Ledger

| Surface | Current State | Exit Rule | Scope |
| --- | --- | --- | --- |
| `ModuleDef.implement(...)` | legacy-exit | 退出公开主叙事，只允许内部过渡或迁移说明 | `kernel` |
| `ProgramRuntimeBlueprint` 直面作者装配 | legacy-exit | 不再作为 canonical authoring 入口 | `kernel` |
| `apps/docs/**` 中仍存在的旧装配写法 | deferred | 本轮不阻塞实现，但必须后续清理 | `deferred-user-docs` |

注：本页保留旧名只作为 removal ledger，不作为活跃 authoring 口径；当前活跃口径统一为 `Program`，内部蓝图名为 `ProgramRuntimeBlueprint`。
