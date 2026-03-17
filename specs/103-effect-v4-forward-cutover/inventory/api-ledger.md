# S0 API Ledger（Baseline）

更新时间：2026-03-02

模型对齐：本文件是 `MigrationLedgerSummary`（聚合快照）；`MigrationLedgerEntry` 条目级台账在 S2 开始按热点模块展开。

## 1. Effect v3 关键模式命中（全仓）

命令口径（worktree 根目录执行）：

```bash
rg -n "Context\.Tag\(|Context\.GenericTag|Context\.get\(|Context\.getOption\(" packages apps examples | wc -l
rg -n "Effect\.catchAll\(|Effect\.catchAllCause\(" packages apps examples | wc -l
rg -n "Effect\.fork\(|Effect\.forkDaemon\(" packages apps examples | wc -l
rg -n "FiberRef|Effect\.locally\(" packages apps examples | wc -l
```

基线结果（本次采样）：

- `Context.*`：183
- `catchAll*`：53
- `fork*`：72
- `FiberRef/locally`：298

## 2. Schema 旧语法命中（全仓）

命令口径：

```bash
rg -n "Schema\.Union\(" packages apps examples | wc -l
rg -n "Schema\.Literal\(" packages apps examples | wc -l
rg -n "Schema\.Record\(\{\s*key:" packages apps examples | wc -l
rg -n "Schema\.partial\(" packages apps examples | wc -l
rg -n "Schema\.pattern\(" packages apps examples | wc -l
rg -n "ParseResult\.TreeFormatter" packages apps examples | wc -l
```

基线结果（本次采样）：

- `Schema.Union(`：36
- `Schema.Literal(`：163
- `Schema.Record({ key:`：9
- `Schema.partial(`：7
- `Schema.pattern(`：1
- `ParseResult.TreeFormatter`：1

## 3. 高优先级模块（Schema 轨道）

- `packages/logix-form`
- `packages/logix-core`
- `packages/logix-query`
- `apps/docs`

## 4. 下一步

1. S0 补齐性能 baseline JSON（`perf/s0.before.<envId>.default.json`）。
2. S0 补齐诊断快照（`diagnostics/s0.snapshot.md`）。
3. 写入 `inventory/gate-g0.md` 的 PASS/FAIL 判定。

## 5. 增量快照（2026-03-02）

同口径复扫结果：

- `Schema.Union(`：36
- `Schema.Literal(`：163
- `Schema.Record({ key:`：9
- `Schema.partial(`：7
- `Schema.pattern(`：1
- `ParseResult.TreeFormatter`：0（较 baseline `1 -> 0`）

说明：当前已完成 `ParseResult.TreeFormatter` 生产路径清零（至少 `packages/logix-form`）；其余 schema 旧语法仍需按 Stage2/Stage5 持续收敛。
