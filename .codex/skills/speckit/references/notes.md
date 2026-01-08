---
description: 为当前 feature 维护可交接的 notes（长链路探索/上下文见底前的手动 flush 按钮；非 SSoT）
---

## User Input

```text
$ARGUMENTS
```

你 **必须** 参考用户输入（如果不为空），并将其作为“本次会话/本次 flush 的意图”写入 notes。

## Manus 风格的“文件即工作记忆”精髓（notes 版）

- **Filesystem as memory**：长内容/研究/中间产物落到文件里；对话里只保留“结论 + 路径”。
- **Read before decide**：每次继续推进前，先读 `notes/README.md`（以及 `plan.md`/`tasks.md` 如存在）把目标/状态拉回注意力窗口。
- **Keep failure traces**：错误/失败尝试必须留痕（至少写进 session，README 里留一行摘要+链接）。
- **Append-only history**：会话细节写到 `notes/sessions/*`，默认只追加、不回改旧 session；README 只做一屏仪表盘 + 指针。

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

- `README.md`：一屏入口（必须短；只放“当前状态/结论/下一步/失败摘要 + 指针”）
- `entrypoints.md`：入口索引（文件/符号/一句话结论）
- `questions.md`：未决问题与阻塞点
- `sessions/<YYYY-MM-DD>.md`：会话级增量（推荐默认写；作为 append-only 历史与失败轨迹的承载）

## Outline

1) **定位 feature 目录**
   - 在 repo root 运行：`SKILL_DIR/scripts/bash/check-prerequisites.sh --json`
   - 解析输出的 `FEATURE_DIR`（必须是绝对路径）。

2) **确保 notes 目录存在**
   - 运行：`SKILL_DIR/scripts/bash/setup-notes.sh --json`
   - 解析输出：`NOTES_DIR` / `NOTES_README` / `NOTES_ENTRYPOINTS` / `NOTES_QUESTIONS` / `SESSIONS_DIR`
   - 默认行为：仅在缺失/空文件时写入最小骨架；不会覆盖已有内容（`--force` 才覆盖）。

3) **Read-before-decide（轻量回灌注意力）**
   - 打开并快速扫一遍：
     - `NOTES_README`
     - `FEATURE_DIR/plan.md`（以及 `FEATURE_DIR/tasks.md` 如存在）
   - 若 `NOTES_README` 已经不再“一屏可读”：先修剪（把长内容迁到 `sessions/*`，README 只留指针）。

4) **更新 `notes/README.md`（必须）**
   - 目标：保持“一屏可读”；不要把长篇解释堆进 README。
   - 至少包含以下小节（可用短 bullet）：
     - `Scope`：本 notes 覆盖的范围/不覆盖什么
     - `Entry Points`：指向 `entrypoints.md`（或直接列 3–8 个关键入口）
     - `Current Status`：一句话 Focus + 进度/阶段（可用 checkbox）
     - `Current Hypothesis`：当前对链路/问题的核心判断（1–5 条）
     - `Errors Encountered`：失败轨迹摘要（1–5 条；详细放 session）
     - `Next Actions`：下一步可直接执行的改动点（带文件路径/符号名 + 验证方式）
     - `Last Flush`：时间 + 本次 `$ARGUMENTS`（便于回忆“为什么写”）

5) **写 `notes/sessions/<YYYY-MM-DD>.md`（推荐默认写）**
   - 目标：承载“本次 flush 的细节”，并作为 append-only 历史（不要回改旧 session）。
   - 建议包含：
     - `Intent`：本次 `$ARGUMENTS`（一句话即可）
     - `What Changed`：本次涉及的文件/符号索引（只写索引）
     - `Findings`：结论/证据/反例
     - `Errors (Failure Traces)`：失败 → 修复/缓解 → 是否已回写到 SSoT
     - `Next Actions`：下一步可直接动手的点 + 验证方式
   - 在 README 的 `Last Flush` 里链接到该 session。

6) **按需更新其它 notes 文档**
   - 若本次发现了新入口：更新 `entrypoints.md`（只写索引，不写长文）。
   - 若本次卡点/需要用户决策：更新 `questions.md`（用“问题 → 影响 → 需要的决策”格式）。

7) **一致性自检（轻量）**
   - Notes 中提到的关键裁决，如果属于 SSoT，确保已回写到 `spec.md`/`plan.md`/`tasks.md`（避免“并行真相源”）。
