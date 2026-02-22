---
name: refactor-pr-ci-loop
description: 在 intent-flow 仓库执行连续重构时，使用“同步 main → 实施重构 → 本地只跑类型与测试 → 创建 PR → 后台监听 CI 全绿自动合并 → 立刻切入下一项”的固定流水线。适用于需要持续推进重构而不等待 PR 手工合并的场景。
---

# refactor-pr-ci-loop

## 固定约束

- 每轮重构开始前先与 `origin/main` 同步。
- 本地验证默认只跑：
  - `pnpm typecheck`
  - `pnpm test:turbo`
- 本地默认不跑性能基线；性能交给 PR CI（除非用户明确要求本地性能证据）。
- 合并前必须至少完成 1 次独立 subagent review。
- 持续维护 `.context/REFACTOR.md`（已读模块、重构点、未读模块、review 记录）。

## 标准步骤

### 1) 同步基线（开工前）

```bash
git fetch git@github.com:yoyooyooo/logix.git main:refs/remotes/origin/main
git merge --ff-only origin/main
```

> 说明：仓库环境下优先用 SSH fetch（避免 https 443 偶发问题）。

### 2) 实施重构

- 聚焦单一可交付切片（一个核心点或一个中等风险点）。
- 改动完成后更新 `.context/REFACTOR.md`：
  - 读过哪些模块；
  - 本轮重构点；
  - 还没读的模块；
  - 本轮独立审查记录。

### 3) 本地验证（默认口径）

```bash
pnpm typecheck
pnpm test:turbo
```

### 4) 独立审查 + 创建 PR

- 至少拉起 1 个 subagent 做只读 review（基于当前 diff）。
- 通过后提交并创建 PR。

### 5) 后台监听 CI，全绿自动合并

在创建 PR 后，运行：

```bash
.codex/skills/refactor-pr-ci-loop/scripts/pr-ci-watch-merge-bg.sh <pr-number> [merge|squash|rebase]
```

- 默认合并方式：`merge`。
- 监听日志默认落在 `.context/pr-ci-watch/`。
- 该后台任务会等待 **required checks** 通过后自动执行 merge。

### 6) 不阻塞下一项重构

- 启动后台监听后，立即继续下一项重构任务。
- 上一项 PR 的 CI/合并由后台 watcher 负责收口。

