# Contracts: CLI Rebootstrap

## 1. Command Surface Contract

- 一级命令只认 `check`、`trial`、`compare`
- 旧命令不再与主线并列

## 2. Output Contract

- 输出至少包含 `verdict`、`summary`、`artifacts`、`repairHints`、`nextRecommendedStage`
- 字段命名必须与 verification control plane 一致
- 具体字段清单以 `inventory/output-contract.md` 为准

## 3. Legacy Routing Contract

- 旧命令要么 archive，要么进入 expert 路由，要么退出
- 不允许继续当默认入口

## 4. Reuse Contract

- 已对齐新输出契约的 helper、artifact 处理和 tests 优先复用
- 复用台账以 `inventory/reuse-ledger.md` 为准
