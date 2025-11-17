---
description: 为当前 feature 维护可交接的 notes（长链路探索/上下文见底前的手动 flush 按钮；非 SSoT）
---

## User Input

```text
$ARGUMENTS
```

你 **必须** 参考用户输入（如果不为空），并将其作为“本次会话/本次 flush 的意图”写入 notes。

## Notes 的定位（重要）

- `specs/<feature>/notes/**` 是 **工程笔记/交接材料**：用于压缩长链路探索成本、降低下次会话的“重新读全仓”开销。
- Notes **不是** SSoT：任何会影响需求/契约/架构/质量门的裁决，必须同步回写到 `spec.md` / `plan.md` / `tasks.md`（或 `docs/specs/*`），不能只写在 notes 里。
- Notes 的目标是“可行动、可接力”：
  - 入口索引（文件/符号/一句话结论）
  - 关键链路节点（从业务写法 → 落点文件的最短跳转）
  - 不变量/坑（哪些假设不能破）
  - 下一步（下一位执行者可以直接动手的改动点 + 验证方式）

## 产物约定（默认）

在 `specs/<feature>/notes/` 下维护以下文件（按需创建，避免空文档泛滥）：

- `README.md`：一屏入口（必须短；只放“当前结论 + 下一步”）
- `entrypoints.md`：入口索引（文件/符号/一句话结论）
- `questions.md`：未决问题与阻塞点
- `sessions/<YYYY-MM-DD>.md`：会话级增量（可选；当本次会话主要在探索时建议写）

## Outline

1) **定位 feature 目录**
   - 在 repo root 运行：`SKILL_DIR/scripts/bash/check-prerequisites.sh --json`
   - 解析输出的 `FEATURE_DIR`（必须是绝对路径）。

2) **确保 notes 目录存在**
   - 目标路径：`<FEATURE_DIR>/notes/`
   - 若不存在：创建目录与 `README.md`（最小骨架即可；不要制造大段模板文本）。

3) **更新 `notes/README.md`（必须）**
   - 目标：保持“一屏可读”；不要把长篇解释堆进 README。
   - 至少包含以下小节（可用短 bullet）：
     - `Scope`：本 notes 覆盖的范围/不覆盖什么
     - `Entry Points`：指向 `entrypoints.md`（或直接列 3–8 个关键入口）
     - `Current Hypothesis`：当前对链路/问题的核心判断（1–5 条）
     - `Next Actions`：下一步可直接执行的改动点（带文件路径/符号名 + 验证方式）
     - `Last Flush`：时间 + 本次 `$ARGUMENTS`（便于回忆“为什么写”）

4) **按需更新其它 notes 文档**
   - 若本次发现了新入口：更新 `entrypoints.md`（只写索引，不写长文）。
   - 若本次卡点/需要用户决策：更新 `questions.md`（用“问题 → 影响 → 需要的决策”格式）。
   - 若本次会话主要在探索且可能来不及实现：写 `sessions/<YYYY-MM-DD>.md`，并在 README 的 `Last Flush` 或 `Next Actions` 里链接到该 session。

5) **一致性自检（轻量）**
   - Notes 中提到的关键裁决，如果属于 SSoT，确保已回写到 `spec.md`/`plan.md`/`tasks.md`（避免“并行真相源”）。

