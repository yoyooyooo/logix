# Contracts

本 feature 当前不新增 public API contract。

这里的 contract 只承接 implementation planning 需要关注的 internal contract 类型：

- source scheduling / task substrate
- lowering ownership link
- evidence / diagnostics hook points

如果后续实现阶段发现需要新增可复用的 internal service contract，应先满足：

- 不引入第二 declaration authority
- 不引入第二 IR truth
- 不引入第二 diagnostics truth
- 对 core enabler 能直接回链到 `G1 / G2 / G3 / G4`
- 对 post-closure alignment 能回链到 `06` 的 `SC-*` 主场景矩阵、派生 `WF*` projection 或 canonical docs route

在进入 `tasks.md` 前，这里只记录 contract 类型，不定义 schema 或 public interface。
