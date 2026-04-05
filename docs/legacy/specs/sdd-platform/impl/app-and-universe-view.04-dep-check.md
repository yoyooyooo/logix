# 4. 依赖检查与错误提示

借助 ModuleIR，平台可以在静态阶段做一些架构级检查：

## 4.1 exports 约束检查

场景：模块 A 的某个 Link 或 Logic 代码中使用了模块 B 内部未导出的 Tag。

实现步骤：

1. 通过 Code → Tag 使用分析（例如扫描 `yield* SomeTag`、`useModule(SomeTag)` 等调用）构建 “逻辑依赖图”；
2. 将依赖中的 Tag 使用与 ModuleIR 的 `exports` 信息对齐：
   - 如果某个 Tag 只在 B.providers 中声明，但不在 B.exports 中出现，则视为 **内部 Tag**；
   - 若 A 不是 B 本身或其子模块，却引用了内部 Tag，则判定为封装违规。

平台行为：

- 在 Universe View 中高亮违规连线；
- 在规则列表 / 代码视图中给出错误或强警告；
- 提示开发者：应当将 Tag 加入 B.exports，或将相关 Logic 下沉到 B 模块内部。

## 4.2 循环依赖检测

ModuleIR 的 imports 关系构成一张有向图：

- 检测 ModuleDef.id 节点上的环（A → B → ... → A）；
- 在 Universe View 中高亮循环路径；
- 建议拆分模块或引入更细的子模块以解除循环。

## 4.3 过度跨域依赖

基于 “Link → Store/Service Edge”，可以统计：

- 某个 Module 中的 Link 过多依赖其他 Module 的 Store/Service（例如超过某个阈值）；
- 在 Universe View 中提示“跨域依赖过多”的模块，辅助架构治理。
