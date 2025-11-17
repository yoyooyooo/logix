# Quickstart: UI Projection Contract（032：UI 只做投影）

**Date**: 2025-12-26  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/spec.md`  
**Plan**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/032-ui-projection-contract/plan.md`

## 0) 目标一句话

让 UI “无状态化”：UI 只渲染语义层状态，并只通过派发事件/动作改变语义层；同一语义蓝图可被多种 UI 投影复用。

## 1) 你会维护三份资产（都可序列化、可 diff）

- `@logix/module.presentationState@v1`：语义层展示态真相源
- `@logix/module.bindingSchema@v1`：UI 插头 ↔ 逻辑插座连接协议
- `@logix/module.uiBlueprint@v1`：纯投影视图（布局/组件选择/绑定 key）

## 2) 平台如何做补全与校验（不靠 UI 推断）

1. 通过 trial-run artifacts 导出 `@logix/module.portSpec@v1`/`@logix/module.typeIr@v1`（035；经由 031 artifacts 槽位）。  
2. 生成可引用空间（ports/exports）→ 用于：
   - 绑定编辑器的 autocomplete
   - 保存前的越界引用/类型不匹配拦截
3. 读取 UI Kit Registry（`@logix/module.uiKitRegistry@v1`）→ 用于：
   - 校验 `componentKey/propName/eventName`
   - UI 侧端口（插口）补全
4. 保存 BindingSchema/UIBlueprint → 通过 036 Contract Suite 形成 IR-first 的验收闭环。

## 3) 失败语义（必须可解释）

当 UI/绑定发生错误时，平台应输出结构化原因（而不是“UI 行为不对”）：

- 越界引用（跨模块读取/未连线引用）
- 缺失依赖（ports/type 缺失或版本不匹配）
- 类型不匹配（TypeIR 可用时做强校验；不可用时降级为 key-level 校验）

## References

- 035 PortSpec/TypeIR：`specs/035-module-ports-typeir/spec.md`
- 033 StageBlueprint：`specs/033-module-stage-blueprints/spec.md`
- 036 Contract Suite：`specs/036-workbench-contract-suite/spec.md`
