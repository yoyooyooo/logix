# Quickstart: Expression Asset Protocol（034：给平台/Agent 的最小可控闭环）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/034-expression-asset-protocol/plan.md`

## 0) 目标一句话

让表达式/校验逻辑既“像代码一样可写”，又“像资产一样可治理”：deps/digest/预算/确定性都可验证，并能进入 IR-first 的验收闭环。

## 1) 保存期（必须落盘的信息）

保存一个 `@logixjs/module.codeAsset@v1` 时，最小必填：

- `source`：源码层（可读、可编辑）
- `normalizedIr`：规范化 IR（parseable 或 blackbox）
- `deps`：显式依赖（对齐 035 的可引用空间）
- `digest`：稳定摘要（用于引用与缓存）

## 2) 预览期（sandbox 受控执行）

预览执行必须受控：

- 确定性：随机/时间/环境读取必须被拒绝或要求显式注入
- 预算/超时：超限必须中断并输出可解释错误（而不是挂死）
- 输出大小：超大对象必须裁剪或失败（并标注原因）

## 3) 如何进入画布与验收闭环

1. 033 的 `IntentRule.mapping` 引用 `CodeAssetRef`（digest）。  
2. 035 导出 PortSpec/TypeIR 给编辑器做补全与 lint。  
3. 036 Contract Suite 使用 trial-run 工件与 schema 校验给出 PASS/WARN/FAIL，作为 Agent 迭代的客观反馈。  

## References

- 033 StageBlueprint：`specs/033-module-stage-blueprints/spec.md`
- 035 PortSpec/TypeIR：`specs/035-module-ports-typeir/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
