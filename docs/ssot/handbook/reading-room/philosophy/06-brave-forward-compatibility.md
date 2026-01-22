# 勇敢向前兼容 (Brave Forward Compatibility)

> "Refuse backward compatibility. Brave forward compatibility."
> "Evolution is not about keeping the old alive, but about making the new possible."

在 `EVOLUTION_POLICY.md` 和 `GEMINI.md` 中，Logix 提出了一个激进的演进策略：**"Any part can be overthrown for perfection." (任何一个地方都可以为了追求完美而推翻)**。

这听起来像是工程上的自杀行为，但在 AI 时代，这是**唯一正确的生存策略**。

## 1. 历史包袱 vs. AI 杠杆

在传统软件工程中，“向后兼容 (Backward Compatibility)”是金科玉律。因为修改旧代码的成本太高（人工重构、风险不可控）。我们宁愿在旧代码上打补丁，也不愿推倒重来。

但 AI 改变了成本结构：

- **重构成本趋近于零**：对于 AI 来说，把所有 `v2` 格式的代码重写为 `v3` 格式，只是数秒钟的 Token 生成。
- **认知负担趋近于零**：AI 没有“习惯”，它不会抱怨 API 变了。只要给它最新的 Spec 和 Pattern，它就能立刻学会新写法。

因此，Logix 拥抱 **"Evolutionary Architecture" (演进式架构)**：
我们不再为了照顾旧代码而牺牲新架构的完美性。我们通过**Codemod (代码迁移脚本)** 或 **AI 重写** 来解决兼容性问题。

## 2. 事实源漂移 (SSoT Drift)

在快速演进中，最大的风险不是代码跑不通，而是**文档（Spec）与代码（Impl）的脱节**。
Logix 的策略是：**文档先行，代码跟随。**

- 任何改动，必须先在 `docs/specs` 中拍板。
- 一旦 Spec 更新，旧代码即视为 Technical Debt。
- 利用 AI Agent (如 Antigravity) 快速扫描全库，根据新 Spec 批量修缮旧代码。

这种**"Spec-Driven Evolution"** 确保了系统即使在剧烈变动中，依然保持逻辑上的一致性和可理解性。

## 3. 为了 AI 而演进

如果为了兼容人类习惯而保留复杂的重载、隐晦的简写，那就是在给 AI 挖坑。
我们勇敢推翻旧设计，往往是为了让 API **更显式、更原子化、更适合 AI 理解**。

例如，Spec 007 从“隐式依赖”变为“显式反向闭包”，对人类来说写起来更累了（要多写 `deps`），但对 AI 来说，这意味着**逻辑推理的确定性**大幅提升。

**勇敢向前兼容，本质上是选择站在 AI 这一边，而不是站在旧代码这一边。**
