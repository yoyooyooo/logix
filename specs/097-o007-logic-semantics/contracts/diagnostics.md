# Contract: Diagnostics for O-007

## 覆盖范围

O-007 仅涉及 logic phase 相关诊断，不扩展新的诊断协议族。

## 诊断事件约束

- code：`logic::invalid_phase`
- severity：`error`
- 必填字段：`moduleId`、`message`、`kind`
- 建议字段：`hint`（给出可执行修复建议）

## 成本约束

- 诊断开关关闭时，执行成本应接近零。
- 诊断 payload 不得携带大对象（Context/Effect/fiber 等不可序列化对象）。

## 可解释链路

- phase 违规 -> `LogicPhaseError` -> `emitInvalidPhaseDiagnosticIfNeeded` -> Debug sink
- 开发者无需解析字符串栈信息即可定位 setup/run 越界。
