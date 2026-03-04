# Requirements Checklist: 103-effect-v4-forward-cutover

## Spec 完整性

- [x] 明确 v4-only、无兼容层、无弃用期。
- [x] 明确 STM 为局部 PoC 且有 go/no-go。
- [x] 明确事务窗口禁 IO 与稳定标识约束。

## Gate 可执行性

- [x] 定义 G0~G5 阶段门禁。
- [x] 定义性能与诊断阈值。
- [x] 定义 `comparable=false` 的失败处理策略。

## 实施可落地性

- [x] 给出阶段任务分解（S0~S6）。
- [x] 给出证据目录与命名规则。
- [x] 给出全仓门禁命令与包级命令。

## 收口一致性

- [x] 要求同步 SSoT（runtime/platform）。
- [x] 要求更新用户文档与示例（中文）。
- [x] 要求输出 1.0 breaking changes + 迁移说明。
