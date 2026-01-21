# Quickstart: Module Stage Blueprints（033：画布语义蓝图最小闭环）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/033-module-stage-blueprints/plan.md`

## 0) 目标一句话

把“场景编排（画布）”变成可落盘/可 diff/可出码/可验收的语义事实源：节点=模块实例，边=事件→动作连线。

## 1) 最小资产集合

- `@logixjs/module.stageBlueprint@v1`（语义蓝图）
- `@logixjs/module.intentRule@v1`（连线；ruleId 稳定）
- `@logixjs/module.rowRef@v1`（列表定位；默认唯一语义）
- （可选）`@logixjs/module.uiBlueprint@v1` + `@logixjs/module.bindingSchema@v1`（投影与绑定；见 032）

## 2) 验收闭环（IR-first）

1. 将 StageBlueprint 出码为可运行模块集合（生产运行不解释蓝图）。  
2. 通过 trial-run（031）导出 Manifest/StaticIR/Artifacts/Evidence。  
3. 由 036 Contract Suite 生成 PASS/WARN/FAIL，并输出可行动原因（缺失工件/越界引用/类型不匹配等）。  

## 3) 平台/Agent 的工作方式（推荐）

- 平台给 Agent 的输入不是“全仓 + 一堆日志”，而是：StageBlueprint + PortSpec/TypeIR + 资产 deps/digest + ContractSuiteVerdict（见 036 的 Context Pack）。
- Agent 输出 patch → 平台重跑 trial-run → 再产出 verdict，形成可复现迭代闭环。

## References

- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
- 035 模块引用空间事实源（PortSpec/TypeIR + CodeAsset）：`specs/035-module-reference-space/spec.md`
