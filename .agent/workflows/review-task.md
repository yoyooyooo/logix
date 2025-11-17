---
description: 深度验收任务完成度与代码质量 (Progress & Quality Review)
---

# Workflow: Task Review & Quality Audit

此工作流用于验收已完成的任务（Features/Tasks），不仅检查“是否做完”，更不论断“做得好不好”。

**输入**:

- 任务清单文件（e.g. `tasks.md`）或功能范围描述
- 相关 Spec / SSoT 文档

## 1. 建立上下文 (Context Setup)

1.  **读取任务**: 明确本次验收的 Scope（哪些 Task 标记为已完成）。
2.  **获取 SSoT**: 使用 `auggie` 查找相关的架构文档、设计规范与 ADR。
    - Query: "Architecture and SSoT for [Feature Name]"
3.  **确定验收标准**: 基于 Spec 确定关键的交付物（Files, Exports, Types）。

## 2. 交付物验收 (Deliverables Check)

- **完整性**: 检查文件是否真实存在，路径是否符合规范。
- **结构一致性**: 检查 `index.ts` 导出、目录分层是否符合架构约定 (e.g. `internal` 隔离)。

## 3. 深度质量审查 (Deep Quality Audit)

**这是此工作流的核心。请阅读关键实现代码，并评估以下维度：**

1.  **Type Safety (类型安全)**:
    - 是否存在滥用 `any` / `@ts-ignore`？
    - 类型定义是否严谨（Schema vs Interface）？
2.  **Architectural Integrity (架构完整性)**:
    - 是否遵守依赖方向（e.g. Core 不依赖 UI）？
    - 逻辑是否正确下沉（Business Logic 在 Logic/Model 层，而不是 UI 组件里）？
3.  **SSoT Alignment (契约对齐)**:
    - 实现是否忠实于 `docs/specs`？
    - 命名是否与术语表（Glossary）一致？
4.  **Test Quality (测试质量)**:
    - 测试是覆盖了边界情况，还是只是 "Happy Path"？
    - 是都使用了正确的测试工具（e.g. `it.effect` vs `runPromise`）？

## 4. 动态验证 (Dynamic Verification)

1.  运行相关测试套件 (Run Tests)。
2.  如果测试失败，记录具体的错误日志。
3.  **禁止修改代码**：此阶段只读。发现问题仅记录。

## 5. 生成验收报告 (Report Generation)

请生成一份 markdown 报告 (建议命名 `acceptance_report.md` 或直接回复)，包含：

- **验收概览**: Scope, Pass/Fail status.
- **交付物检查**: ✅/❌ 列表。
- **质量洞察 (Quality Insights)**:
  - 🌟 **Highlights**: 做得好的地方（设计模式、清晰度）。
  - ⚠️ **Issues/Smells**: 发现的质量问题（类型不安全、反模式、坏味道）。
  - 📉 **Gaps**: Spec vs Implementation 的差异。
- **测试结果**: 测试运行概况。
- **结论与建议**: 是否通过？需要重构还是可以直接合并？

请用**简体中文**撰写报告。