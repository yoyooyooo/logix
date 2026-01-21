# Quickstart: Module Reference Space（035：给画布/编辑器/Agent 的引用空间事实源）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/035-module-reference-space/plan.md`

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

## 3) 保存资产（CodeAsset：表达式/校验）

保存一个 `@logixjs/module.codeAsset@v1` 时，最小必填：

- `source`：源码层（可读、可编辑）
- `normalizedIr`：规范化 IR（parseable 或 blackbox）
- `deps`：显式依赖（对齐 PortSpec 的可引用空间）
- `digest`：稳定摘要（用于引用与缓存）

黑盒资产（不可解析/超子集）必须显式补齐 `deps/能力/预算`；否则拒绝保存。

## 4) 预览期（sandbox 受控执行）

预览执行必须受控：

- 确定性：随机/时间/环境读取必须被拒绝或要求显式注入
- 预算/超时：超限必须中断并输出可解释错误（而不是挂死）
- 输出大小：超大对象必须裁剪或失败（并标注原因）

## References

- 031 artifacts 槽位：`specs/031-trialrun-artifacts/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
