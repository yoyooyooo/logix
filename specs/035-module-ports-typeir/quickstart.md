# Quickstart: Module Ports & TypeIR（035：给画布/编辑器/Agent 的引用空间事实源）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-ports-typeir/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-ports-typeir/plan.md`

## 0) 目标一句话

平台的 autocomplete/引用安全不靠 UI 推断、不靠源码猜测，只认 trial-run 导出的 PortSpec/TypeIR。

## 1) 生产方式（按需路径）

1. 对目标模块执行 trial-run（025；经由 031 的 artifacts 槽位输出）。
2. 在 `TrialRunReport.artifacts` 里拿到：
   - `@logixjs/module.portSpec@v1`（必需）
   - `@logixjs/module.typeIr@v1`（可选；可截断）
3. 平台用 PortSpec 生成“允许引用空间”（用于画布连线、绑定编辑器、lint）。

## 2) 降级策略（TypeIR 缺失/截断）

- TypeIR 不可用时：仍可基于 PortSpec 做 key-level 校验（合法引用/越界引用拦截）。
- TypeIR 截断时：只对可用子集做强类型校验，其余降级并提示用户补齐/收敛类型。

## References

- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
