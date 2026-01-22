<!--
派生索引（prompt-friendly index）

- 真理源：`docs/ssot/platform/foundation/04-north-stars.md`
- 用途：给 speckit/specs 提供可快速引用的 NS/KF 编号表，避免每次都加载长文。
- 约束：不要在此文件内“发明/修改”NS/KF；如需调整请改真理源并同步更新本索引。

更新方式（可选）：
- 初始化：`$speckit north-stars`（不覆盖已有文件）
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

- TODO: run `$speckit north-stars sync` to generate from source-of-truth.

## Kill Features（KF-*）

- TODO: run `$speckit north-stars sync` to generate from source-of-truth.
<!-- END GENERATED: north-stars-index -->

## specs/ 写法约定（可选）

- `specs/<id>/spec.md`
  - 填写：`## North Stars & Kill Features Traceability _(optional)_`
  - User Story 内：`**Traceability**: NS-1, KF-1`
  - FR/NFR/SC：把标注放在冒号后，例如 `- **FR-001**: (NS-3) ...`
