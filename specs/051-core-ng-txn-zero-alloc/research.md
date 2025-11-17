# Research: 051 core-ng 事务零分配（txn zero-alloc）

本 research 用于把“零分配”口径收敛到可验收、可证据化的决策点，避免落地阶段口径漂移。

## Decision 1：零分配的边界（允许/禁止）

**Chosen**：

- 允许：begin/commit 的常数级分配（例如一次性对象包装）；允许容器在首次增长时的摊销扩容。
- 禁止：热循环/调用点按 patch/step 增长的对象分配（patch 对象、隐式数组、字符串拼接/解析）。

## Decision 2：证据门禁（Node + Browser）

**Chosen**：复用 `$logix-perf-evidence`：

- Node：`converge.txnCommit`（通过 `pnpm perf bench:traitConverge:node`）
- Browser：matrix `priority=P1` suites
- 判据：`meta.comparability.comparable=true && summary.regressions==0`

## Decision 3：与 050/052 的边界

**Chosen**：

- id 语义/映射协议由 050 裁决；051 只收口分配行为（不引入新的 id 口径）。
- diagnostics=off 的全局闸门与回归防线由 052 收口；051 只保证自己的实现具备 off fast path（不输出额外字段）。

## Decision 4：P1 Gate baseline 与降级策略

**Chosen**：

- Gate baseline 固定为 `diagnostics=off + stateTransaction.instrumentation=light`。
- 在 P1 Gate 覆盖场景触发 `dirtyAll=true` 降级视为 FAIL（必须先修复或扩大 registry 容量并证据化）。
