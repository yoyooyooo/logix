<!--
派生索引（prompt-friendly index）

- 真理源：`docs/ssot/platform/foundation/04-north-stars.md`
- 用途：给 speckit/specs 提供可快速引用的 NS/KF 编号表，避免每次都加载长文。
- 约束：不要在此文件内“发明/修改”NS/KF；如需调整请改真理源并同步更新本索引。

更新方式（可选）：
- 初始化：`$speckit north-stars`（不覆盖既有内容）
- 一键对齐：`$speckit north-stars update`（默认仅同步派生索引；如需修改 NS/KF，请在命令后附上变更说明或直接改真理源）
- 同步：`$speckit north-stars sync`（仅更新 GENERATED 块）
-->

# North Stars / Kill Features 索引（派生）

<!--
  说明：
  - 本文件允许长期存在且持续迭代，但只有在显式执行 `$speckit north-stars` 时才会被更新；
  - 下面标记块内的内容是“可再生索引”，允许被同步脚本覆盖；块外内容视为人工维护区，脚本不会触碰。
-->

<!-- BEGIN GENERATED: north-stars-index -->
## North Stars（NS-*）

- NS-1：GitHub for Logic（可视化逻辑评审）
- NS-2：全双工画布（Code ↔ Graph 双向同步）
- NS-3：语义级门禁（Intent Integrity Guardian）
- NS-4：精准影响面分析（Impact Analysis）与活体文档（Living Docs）
- NS-5：Time‑Travel Workflow Debugging（可交互回放调试）
- NS-6：平台级自动迁移与重构（Rewriter）
- NS-7：Sandbox / Alignment Lab（可执行规格与对齐实验室）
- NS-8：自愈闭环（Generate → Run → Verify → Fix）
- NS-9：自动并发治理（Automated Concurrency Governor）
- NS-10：自适应诊断（Zero‑Overhead-ish Diagnostics）

## Kill Features（KF-*）

- KF-1：Visual Logic Review （“GitHub for Logic”） → NS-1
- KF-2：Full-Duplex Visual Authoring （全双工画布） → NS-2
- KF-3：Intent Integrity Guardian （意图完整性守护） → NS-3
- KF-4：Precision Impact Analysis （精准影响面分析） → NS-4
- KF-5：Automated Concurrency Governor （自动并发治理） → NS-9
- KF-6：Time-Travel Workflow Debugging （时光倒流调试） → NS-5
- KF-7：Automated Refactoring & Migration （自动重构） → NS-6
- KF-8：Zero-Overhead Production Diagnostics （零开销自适应诊断） → NS-10
- KF-9：Living Documentation （活体文档） → NS-4
- KF-10：Sandbox-as-a-Service （沙箱即服务） → NS-7

<!-- END GENERATED: north-stars-index -->

## specs/ 写法约定（可选）

- `specs/<id>/spec.md`
  - 填写：`## North Stars & Kill Features Traceability _(optional)_`
  - User Story 内：`**Traceability**: NS-1, KF-1`
  - FR/NFR/SC：把标注放在冒号后，例如 `- **FR-001**: (NS-3) ...`
