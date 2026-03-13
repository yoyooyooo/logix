# 2026-03-13 · 保留刀与废弃刀清单

本页只记录当前阶段已经验证过的切刀去留结论。

约束：
- “保留”只保留已拿到稳定正收益、且建议继续留在主线的改动
- “废弃”包含两类：
  - 明确无收益或混合收益，不建议继续保留
  - 仅用于定位和解释，不作为主线 runtime 改动保留

## 保留刀

### K-1 · `watchers` runtime writeback fold

- 结论：保留
- 提交：`95462a2e`
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- 关键 run：`22993176276`
- 结果：`regressions=0 / improvements=10`

保留原因：
- 这是当前阶段唯一拿到稳定、明确正收益的 runtime 刀
- 直接命中真实根因：
  - direct action state writeback 在事务内逐条执行
  - `nativeCaptureSeen=1`
  - `handlerStartSeen=1`
  - `lastValue=0`
- 改完后 `watchers` 的 `256/512` 档位被打穿，收益面明确

做法摘要：
- 把 `applyActionStateWritebacks` 从“每个 handler 单独 `readState + setStateInternal/updateDraft`”
- 改成“单次 dispatch 内按顺序折叠后统一提交”

## 废弃刀

### D-1 · `externalStore` single-field fast path

- 结论：废弃
- 分支：`agent/effect-v4-external-store-p95`
- 文件：`packages/logix-core/src/internal/state-trait/external-store.ts`
- 关键 run：`22993811804`

废弃原因：
- `watchers=128` 档位改善
- `256/512` 档位出现反向波动
- 没形成稳定全域收益
- 不符合主线保留标准

### D-2 · `RuntimeExternalStore` notify coalescing

- 结论：废弃
- 分支：`agent/effect-v4-external-store-notify`
- 文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- 关键 run：`22994062160`

废弃原因：
- `watchers=128` 档位改善明显
- `256` 仅小幅改善
- `512/full` 变差
- 仍然没形成稳定全域收益

### C-2 · `react.bootResolve.sync` config reload skip

- 结论：废弃
- 分支：`agent/effect-v4-bootresolve-sync-tax`
- 文件：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- 关键证据：
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.json`
  - `specs/103-effect-v4-forward-cutover/perf/diff.local.quick.bootresolve-sync-tax.config-only.r2.json`

废弃原因：
- 第一轮 `sync` 切片有改善，但第二轮没有稳定复现
- `sync + auto + microtask` 在 `r2` 直接反向
- `suspend` 多个切片出现分布漂移
- 不符合“稳定净收益”保留标准

### E-1 · `watchers` capture retry

- 结论：不保留为主线性能刀
- 关键 run：`22987711765`

废弃原因：
- 作用是把 benchmark 从“采样阻塞”推进到“可比较”
- 这是证据面修复，不是主线 runtime 优化
- 其价值已经被后续 runtime 刀吸收，单独不作为保留刀

### E-2 · `watchers` shared-sample evidence

- 结论：不保留为主线性能刀
- 关键 run：`22988473253`

废弃原因：
- 作用是收掉 `domStable` 的重复采样噪声
- 本质上是 benchmark 语义收口
- 不属于主线 runtime 改动

### E-3 · `watchers` native-capture anchor

- 结论：不保留为主线性能刀
- 关键 run：`22988763385`

废弃原因：
- 作用是把页面外 click 注入税从主指标里剥掉
- 这一步用于建立正确测量语义
- 不属于主线 runtime 改动

### E-4 · `watchers` strict stage-split

- 结论：不保留为主线性能刀
- 关键 run：`22990519675`

废弃原因：
- 作用是把 broad timeout 收敛成具体阶段错误
- 用于归因，不用于提速

### E-5 · `watchers` failure flags / last-value

- 结论：不保留为主线性能刀
- 关键 runs：`22991199142`、`22990821549`

废弃原因：
- 作用是把失败信息细化成：
  - `lastValue`
  - `nativeCaptureSeen`
  - `handlerStartSeen`
- 只用于锁定真正 runtime 根因
- 价值已经在 `K-1` 里兑现

## 当前裁决

当前阶段：
- 真正建议保留并继续背书的，只有 `K-1`
- 其它切刀要么是定位刀，要么是收益不稳的实验刀

## 后续使用方式

- 以后若只想知道“哪些已经证明值得留、哪些只是试验过”
- 优先看本页，而不是回翻所有 dated 记录
