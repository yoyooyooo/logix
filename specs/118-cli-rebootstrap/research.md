# Research: CLI Rebootstrap

## Decision 1: 一级命令面只保留 `check / trial / compare`

- **Decision**: 新 CLI 的一级命令面收敛为 `check`、`trial`、`compare`。
- **Rationale**: 这三条已是 verification control plane 的正式主干。
- **Alternatives considered**:
  - 保留旧命令混在主入口。否决，原因是会继续稀释主命令面。

## Decision 2: 旧命令进入 archive 或 expert 路由

- **Decision**: 旧 `anchor`、旧 IR、旧 describe 一类命令退出主线，只允许进入 archive 或 expert 路由。
- **Rationale**: 这些命令历史价值仍在，但不再适合作为默认入口。
- **Alternatives considered**:
  - 让旧命令继续与新命令并列。否决，原因是路由噪音大。

## Decision 3: 复用 helper 与 artifact 处理

- **Decision**: `stableJson`、`artifacts`、`output`、`result` 这类与新输出契约相容的 helper 优先复用。
- **Rationale**: CLI 重组的重点是命令面，不是推倒所有内部工具。
- **Alternatives considered**:
  - 全量重写 helper。否决，原因是重复劳动。

## Decision 4: integration tests 优先平移

- **Decision**: 现有 CLI integration tests 里可映射到新命令面的部分优先平移或改名。
- **Rationale**: 主命令面变化大，但验证逻辑仍有可保留部分。
- **Alternatives considered**:
  - 完全舍弃现有 CLI tests。否决，原因是会丢掉已有验证价值。

## Decision 5: `check / compare` 先包旧底层执行器

- **Decision**: `check` 先复用 `ir.validate` 的底层校验逻辑，`compare` 先复用 `ir.diff` 的底层差异逻辑。
- **Rationale**: 这两条命令的核心工作已经存在，当前最短路径是先把 control-plane 语义包到新命令面。
- **Alternatives considered**:
  - 为 `check / compare` 立即重写第二套底层实现。否决，原因是会重复造轮子。

## Decision 6: `trial` 先交付最小可验证报告

- **Decision**: `trial` 第一版先交付结构化 `RuntimeTrialReport` 和稳定输出契约，再逐步替换旧 `trialrun` 语义。
- **Rationale**: 当前 CLI 最急的是新主命令面和机器输出稳定，完整试运行深度可以后补。
- **Alternatives considered**:
  - 等完整 trial runtime 实现好再开放 `trial`。否决，原因是会拖慢主命令面切换。

## Decision 7: `check / compare` 先包旧底层报告，再换主 artifact 契约

- **Decision**: `check` 与 `compare` 先继续复用 `ir.validate` / `ir.diff` 的执行器，但对外主 artifact 切到 `RuntimeCheckReport` / `RuntimeCompareReport`。
- **Rationale**: 这样可以先完成 control-plane 命令面切换，同时保留底层校验与 diff 逻辑。
- **Alternatives considered**:
  - 先保留旧 artifact 名字不变。否决，原因是会让新命令面对外契约继续漂在旧 IR 语义上。

## Decision 8: 统一控制面报告先落到 `result.ts`

- **Decision**: `ControlPlaneReport`、`ControlPlaneStage`、`ControlPlaneVerdict` 与 artifact ref 映射先统一放在 `packages/logix-cli/src/internal/result.ts`。
- **Rationale**: 这层最接近 `CommandResult` 协议，适合作为 `check / trial / compare` 的共享合同。
- **Alternatives considered**:
  - 分散到三个命令文件各自维护。否决，原因是会再次长出三套近似协议。

## Decision 9: legacy route 先以源码常量固定

- **Decision**: 旧 `describe / irExport / irValidate / irDiff` 先导出 `legacyRoute = 'expert'`；旧 `trialRun / anchor*` 先导出 `legacyRoute = 'archive'`。
- **Rationale**: 这样 describe/help、后续 docs 和审计都能直接复用源码事实。
- **Alternatives considered**:
  - 只在 spec inventory 记录 legacy route。否决，原因是源码层仍不可自解释。
