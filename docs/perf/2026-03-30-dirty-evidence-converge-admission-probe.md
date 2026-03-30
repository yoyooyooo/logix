# 2026-03-30 · dirty-evidence converge admission probe

## 目标

在 latest `main@299dfafc` 上验证：

1. `dispatch` 家族第一条更窄实现线已经 `no-go` 之后，下一刀是否应该切到 `dirty-evidence -> converge admission`
2. 当前 `converge` 的 `unknown_write / dirty_all / near_full` 是否仍然是 route-level 有信息量的 admission 信号
3. 这条线当前更像真实瓶颈，还是只是新的测量噪声

## cheap-local package

### 1. browser blocker probe

命令：

```sh
python3 fabfile.py probe_next_blocker --json
```

结果：

- `status = blocked`
- blocker = `externalStore.ingest.tickNotify`
- failure kind = `suite`
- 失败原因是 browser 动态导入失败：
  - `Failed to fetch dynamically imported module`

结论：

- 这不是新的 runtime blocker 证据
- 当前更像 worktree/browser import 噪声
- 这条失败不能直接拿来反驳 `latest main blocker = clear`

### 2. core correctness guards

命令：

```sh
pnpm -C packages/logix-core exec vitest run \
  test/StateTrait/StateTrait.ConvergeAuto.CorrectnessInvariants.test.ts \
  test/StateTrait/StateTrait.ConvergeAuto.DecisionBudget.test.ts \
  test/StateTrait/StateTrait.ConvergeDirtySet.test.ts
```

结果：

- `3 files`
- `6 tests`
- 全绿

结论：

- `dirty-evidence / converge admission` 相关 correctness guard 当前可直接复用
- 若后续真开实现线，不需要先补这一层测试地板

### 3. browser signal · form list scope

命令：

```sh
pnpm -C packages/logix-react test -- --project browser \
  test/browser/perf-boundaries/form-list-scope-check.test.tsx
```

关键读数：

- `requestedMode=auto`
- `executedMode=full`
- `reasons=near_full`

覆盖点：

- `rows=10 / 30 / 100 / 300`
- `diagnosticsLevel=off / light / full`

结论：

- 当前 `auto` admission 在这条 list-scope route 上仍高度依赖 `near_full`
- 这说明 `dirty-evidence coverage` 和 `converge admission` 仍然是有信息量的方向

### 4. node bench tooling signal

命令：

```sh
pnpm -C .codex/skills/logix-perf-evidence bench:traitConverge:node
```

结果：

- 失败
- 原因：
  - `Effect.locally is not a function`

结论：

- 这是 `perf-evidence` 脚本与当前 effect 运行态的 tooling mismatch
- 当前不能把这条失败当作 runtime 证据

## 当前裁决

- route classification: `cheap_local_positive_on_admission_side`
- 子结论：`dirty_evidence_and_converge_admission_is_now_the_best_next_cut`

## 原因

1. `dispatch` 家族第一条更窄实现线已经满足 `no_go_under_current_boundary`
2. `actionCommitHub` 和 same-target topic fanout 已被旧证据和 merged-mainline 事实大幅削弱
3. `form.listScopeCheck` 继续给出 `executedMode=full + reason=near_full`，说明当前 admission 仍有 route-level 信息量
4. 这条方向的收益面比 `dispatch` 更宽：
   - `dispatch`
   - `setState`
   - `update`
   - reducer 写回

## 当前还不能下的结论

- 还不能直接宣布某个 static heuristic 就是唯一主税点
- 还没有拿到一份同轮次的 `converge-steps` latest-main browser 结果
- 还没有 focused/heavier 级 before/after

## 下一步

1. 把这条线升级成新的 cheap-local 主候选
2. 下一刀先不直接重写 controller
3. 优先做一个最小读数刀，回答：
   - `unknown_write / dirty_all / near_full` 哪个最常把 `executedMode` 推回 `full`
   - 这些原因里，哪些来自 `dirty-evidence` 覆盖不足
4. 如果最小读数刀继续稳定指向 `dirty-evidence` 覆盖不足，再开真正的实现线
