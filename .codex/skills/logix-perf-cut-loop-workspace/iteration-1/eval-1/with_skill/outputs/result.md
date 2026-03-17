**真实瓶颈**
- `txnLanes.urgentBacklog` 仍是真问题。最新 `ulw123 current-head full-matrix` 下，`urgent.p95<=50ms` 在 `mode=default/off` 都只过到 `steps=200`，`800/2000` 落在约 `51~56ms`；P-1 去掉 timer 伪影后仍卡线，说明 non-urgent backlog 早期 slice/regrowth 还有结构性阻塞。

**伪影**
- `watchers.clickToPaint` 更像测歪/噪声：同 commit 同 matrix 的 `ulw121` 与 `ulw122/123` 相差一整档，且后两者几乎不随 watcher 数增长。
- `externalStore.ingest.tickNotify full/off<=1.25` 更像 quick 门禁噪声：`ulw123` 在 256 失败，但紧随其后的 `ulw124` 同 commit 已在 128/256/512 全过。
- `converge decision.p95<=0.5ms` 的 `notApplicable` 是门禁表达错，不是退化。

**下一刀**
- 只打 `txnLanes`：别再改计时/host-yield/inputPending；继续压 non-urgent 早期 chunk regrowth，保留 `initialChunk=1`，再限制前 1~2 次切片放大或大 backlog 首轮上限，优先把 `mode=default, steps=800/2000` 拉回 `50ms` 内。无需 API 变动。
