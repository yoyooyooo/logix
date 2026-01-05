# Contracts: Semantics（静态性/selectorId/readsDigest）

## 静态性门禁（默认硬约束）

`ReadQuery.createSelector` 的 correctness 依赖于“deps 完整”：

- 若某个 input 是 dynamic lane（`reads=[]`），则它对状态的依赖不可识别；
- 若仍然生成 static 输出（仅靠其它 inputs 的 reads），会出现 **stale bug**：当 dirtySet 只覆盖 dynamic input 的真实依赖时，SelectorGraph 可能跳过评估，从而产出过期值。

因此默认门禁为：

- 任一 input `lane === 'dynamic'` → FAIL
- 任一 input `readsDigest == null` → FAIL

> 说明：`readsDigest` 缺失通常意味着 reads 为空或不可识别 deps。对于“确实不依赖 state 的常量 input”，建议另开需求提供 `ReadQuery.const(...)`（不在本特性范围）。

## selectorId 计算口径

输出 selectorId 必须确定性，且建议能区分不同语义的组合器：

- 基础输入：
  - `debugKey`（必须）
  - `params`（可选；建议用来显式编码闭包参数）
  - inputs 的 `selectorId` 与 `readsDigest`
  - `equalsKind`
  - `resultFn` 的 `toString()`（用于区分不同实现；仍建议配合 params 避免闭包语义冲突）

建议结构（仅口径，细节以实现为准）：

```ts
{
  kind: 'createSelector',
  debugKey,
  params,
  inputs: inputs.map((i) => ({ selectorId: i.selectorId, readsDigest: i.readsDigest })),
  equalsKind,
  resultSrc,
}
```

然后用 `fnv1a32(stableStringify(...))` 哈希为最终 selectorId。

## reads / readsDigest 计算口径

- `reads = union(inputs.reads)`，并进行：
  - 去重（string/number 均参与）
  - 排序（按 `String(x)`）
- `readsDigest = { count, hash }` 来自对归一化 reads 的摘要（复用现有 ReadQuery 口径）。

## 使用侧约束（避免 cache 冲突）

- 不要在 render 中反复创建同一个 selectorId 但不同语义的 selector（例如闭包参数变化但未纳入 params/debugKey）。
- 推荐把 selector 定义提升到模块级常量；需要参数化时，用 `params` 显式区分。

