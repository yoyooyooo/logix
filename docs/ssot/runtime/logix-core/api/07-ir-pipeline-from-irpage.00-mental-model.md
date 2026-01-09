# 0. 一句话心智模型：为什么这里叫 “IR”

Logix 的“IR”不是单一文件或单一结构，而是一组 **可序列化、可 diff、可解释、可回放** 的最小产物集合：

- **Static IR**：静态结构（例如 traits DAG / 依赖图），用于 drift detection 与 explainability。
- **Dynamic Trace**：动态事件序列（EvidencePackage），用于时间线、诊断、回放对齐。
- **Supplemental Static IR**：以 `TrialRunReport.artifacts` 的形式承载各 feature kit 的补充静态摘要（例如 Form 的 RulesManifest）。
- **结构摘要**：Manifest/Diff/TrialRunReport 等，用于 CI/平台/Studio 做 guard 与解释。

这一套能力刻意 **不读 AST**：只基于用户导出的 `Module`（与 Program Runner 的 root module 同形）做提取与试跑。
