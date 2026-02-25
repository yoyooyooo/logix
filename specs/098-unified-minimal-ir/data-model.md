# Data Model: O-005 Gate 收敛（最小模型）

## 1. FullCutoverGateMode

```ts
type FullCutoverGateMode = 'fullCutover' | 'trial'
```

- 默认值（无配置）: `fullCutover`
- 显式试运行: 仅通过 `fullCutoverGateModeLayer('trial')` 注入

## 2. FullCutoverGateReason

```ts
type FullCutoverGateReason =
  | 'fully_activated'
  | 'trial_mode_with_fallback'
  | 'missing_required_bindings'
  | 'fallback_bindings_detected'
  | 'missing_and_fallback'
```

## 3. FullCutoverGateEvidence

```ts
interface FullCutoverGateEvidence {
  readonly requiredServiceCount: number
  readonly missingServiceIds: ReadonlyArray<string>
  readonly fallbackServiceIds: ReadonlyArray<string>
}
```

- 要求: Slim + JSON 可序列化。
- 作用: 为失败与降级提供最小解释证据。

## 4. FullCutoverGateResult（增量字段）

```ts
interface FullCutoverGateResult {
  readonly mode: FullCutoverGateMode
  readonly verdict: 'PASS' | 'FAIL'
  readonly fullyActivated: boolean
  readonly missingServiceIds: ReadonlyArray<string>
  readonly fallbackServiceIds: ReadonlyArray<string>
  readonly anchor: {
    readonly moduleId: string
    readonly instanceId: string
    readonly txnSeq: number
  }
  readonly reason: FullCutoverGateReason
  readonly evidence: FullCutoverGateEvidence
}
```

## 5. Runtime 装配失败对象（错误通道约定）

```ts
interface FullCutoverGateFailedError extends Error {
  readonly name: 'FullCutoverGateFailed'
  readonly gate: FullCutoverGateResult
  readonly reason: FullCutoverGateReason
  readonly evidence: FullCutoverGateEvidence
  readonly moduleId?: string
  readonly instanceId: string
}
```

- 行为: 仅当 `mode=fullCutover` 且 gate 失败时抛出。
- 非目标: 不扩展为新的跨包错误层级。
