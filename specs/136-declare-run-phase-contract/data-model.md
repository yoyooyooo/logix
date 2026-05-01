# Data Model: Declare Run Phase Contract

## 1. `DeclarationActionRecord`

| Field | Type | Description |
| --- | --- | --- |
| `action` | string | 注册动作名 |
| `owner` | enum | `lifecycle` / `fields` / `effect-wiring` / `debug` |
| `phase` | enum | `declare` |
| `notes` | string | 附加说明 |

## 2. `RunCapabilityRecord`

| Field | Type | Description |
| --- | --- | --- |
| `capability` | string | 运行期能力名 |
| `phase` | enum | `run` |
| `requiresEnv` | boolean | 是否读取 Env 或 runtime services |
| `notes` | string | 附加说明 |

## 3. `LogicDescriptorRecord`

| Field | Type | Description |
| --- | --- | --- |
| `logicUnitId` | string | 逻辑单元 id |
| `declarations` | string[] | 声明动作集合 |
| `runEntry` | string | 运行入口 |
| `diagnosticSurface` | string[] | 可解释输出面 |
| `internalCarrier` | enum | `setup+run` |

验证锚点：

- `packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`
- `packages/logix-core/test/Logic/LogicFields.Setup.Declare.test.ts`
- `packages/logix-core/test/Logic/LogicFields.Setup.Freeze.test.ts`
- `packages/logix-core/test/Logic/LogicFields.Evidence.Stability.test.ts`
- `packages/logix-core/test/internal/Runtime/Lifecycle/Lifecycle.PhaseGuard.test.ts`
