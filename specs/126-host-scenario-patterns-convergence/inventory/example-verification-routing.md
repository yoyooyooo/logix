# Example Verification Routing

| Artifact | Primary Role | Secondary Link | Notes |
| --- | --- | --- | --- |
| `examples/logix-react/src/demos/GlobalRuntimeLayout.tsx` | example | `examples/logix/src/verification/index.ts` | 全局单例模块 |
| `examples/logix-react/src/demos/DiShowcaseLayout.tsx` | example | none | imports scope / root escape hatch |
| `examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx` | example | none | `RuntimeProvider.layer` |
| `examples/logix-react/src/demos/SessionModuleLayout.tsx` | example | none | session instance |
| `examples/logix-react/src/demos/SuspenseModuleLayout.tsx` | example | none | suspend variant |
| `examples/logix-react/src/demos/ProcessSubtreeDemo.tsx` | example | `examples/logix/src/verification/index.ts` | subtree process 安装点 |
| `examples/logix/src/verification/index.ts` | verification | `docs/ssot/runtime/09-verification-control-plane.md` | verification subtree 统一入口 |

## Rule

- examples 提供 primary example
- verification subtree 提供验证入口
- 双重角色时先定义 primary role，再给 secondary link
