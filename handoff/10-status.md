# Status（按“能继续干活”为准）

## Done（规格/裁决已落盘）

- 078：`ServiceId` 规则与 `servicePorts` schema 已固化；`specs/078-module-service-manifest/contracts/service-id.md` 已修正文档瑕疵。
- 079：保守补全政策已固化；`specs/079-platform-anchor-autofill/tasks.md` 已补齐 deviation 任务口径。
- 083：slots 选型已定（`LogicUnitOptions.slotName` + regex + 无 default slot），并已回灌到 plan/spec/tasks。
- 084：Spy 定位已定（Node-only Harness + best-effort + coverage marker + occurrences 聚合），并已回灌到 plan/spec/tasks/contracts。
- 085：CLI 输出标准已定（`CommandResult@v1` + Exit Code 0/2/1 + `tsx` loader + lazy `ts-morph` + cold start 预算），并已回灌到 plan/spec/tasks/contracts。

## Pending（实现未开始 / 未打穿）

- 078：`packages/logix-core` 尚未实现 `servicePorts` 导出与 TrialRun/Diff 门禁联动。
- 081/082/079：Node-only `packages/logix-anchor-engine` 尚未实现 Parser/Rewriter/Autofill 闭环。
- 085：Node-only `packages/logix-cli` 尚未实现并串联上述能力。
- 084/083：等待 M2 达标后再进入实现（080 的硬前置裁决）。

