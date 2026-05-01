# Contract: Full Cutover Gate（默认 fullCutover + 显式 trial）

## 1. 模式约定

- 默认模式（无配置）: `fullCutover`
- 显式试运行模式: `trial`

配置入口（显式 trial）：

```ts
CoreKernel.fullCutoverGateModeLayer('trial')
```

## 2. 判定语义

- `mode=fullCutover`:
  - `fullyActivated=true` -> `verdict=PASS`
  - 否则 -> `verdict=FAIL`（禁止隐式 fallback）
- `mode=trial`:
  - 始终允许继续运行（`verdict=PASS`）
  - 但必须通过 `fullyActivated=false` + `reason/evidence` 暴露降级事实

## 3. Reason Code

```ts
type FullCutoverGateReason =
  | 'fully_activated'
  | 'trial_mode_with_fallback'
  | 'missing_required_bindings'
  | 'fallback_bindings_detected'
  | 'missing_and_fallback'
```

解释规则:

- `fully_activated`: 无 missing、无 fallback
- `trial_mode_with_fallback`: trial 且存在 missing/fallback
- `missing_required_bindings`: 仅 missing
- `fallback_bindings_detected`: 仅 fallback
- `missing_and_fallback`: missing 与 fallback 同时出现

## 4. Evidence 字段（最小）

```ts
interface FullCutoverGateEvidence {
  readonly requiredServiceCount: number
  readonly missingServiceIds: ReadonlyArray<string>
  readonly fallbackServiceIds: ReadonlyArray<string>
}
```

要求:

- 字段必须 Slim，且 JSON 可序列化。
- 用于失败报错、测试断言、回放解释。

## 5. 错误对象约定

当 `mode=fullCutover && verdict=FAIL` 时抛错，错误对象至少包含：

- `name = 'FullCutoverGateFailed'`
- `gate`（完整 gate 结果）
- `reason`（与 `gate.reason` 一致）
- `evidence`（与 `gate.evidence` 一致）
