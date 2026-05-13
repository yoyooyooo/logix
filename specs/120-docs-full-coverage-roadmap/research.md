# Research: Docs Full Coverage Roadmap

## Decision 1: 用 group spec 承接 docs → spec 的全量映射

- **Decision**: 新增 `120` 作为 docs 主体规划的总控 spec。
- **Rationale**: 现有 `112` 只覆盖 runtime package cutover，不适合承接整棵 docs 树。
- **Alternatives considered**:
  - 继续扩写 `112`。否决，原因是范围已超出 package cutover。

## Decision 2: 先复用 existing specs，再只为真正空洞主题开新 spec

- **Decision**: 复用 `103 / 113 / 115 / 116 / 117 / 118 / 119`，只为 docs 中尚未被显式规格化的 cluster 新开 `121-129`。
- **Rationale**: 避免重复 spec 和并行真相源。

## Decision 3: 采用“页面 primary owner + related specs”口径

- **Decision**: 每个 docs 页面只给一个 primary owner spec，必要时记录 related specs。
- **Rationale**: 防止“人人都负责”。

## Decision 4: cross-cutting charter / standards 由总控分发

- **Decision**: 对 `2026-04-05-ai-native-runtime-first-charter`、`logix-api-next-guardrails` 这类 cross-cutting 页面，`120` 负责总分发，成员 spec 承接落地片段。
- **Rationale**: 它们天然跨多个成员 spec。

## Decision 5: group checklist 工具异常时手工回退

- **Decision**: `spec-group-checklist.sh` 当前有 shell 语法错误，先手工写等价 checklist。
- **Rationale**: 不能让 skill 本体 bug 阻塞 specs 产物。
