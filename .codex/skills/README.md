# Agent Skills Index

> **Status**: Living Document  
> **Context**: `.codex/skills`

本目录用于存放 Codex 可直接发现的 skills。

## 目录约定

- 仓库级自定义 skill 的**事实源目录**统一放在仓库根：`skills/`
- `.codex/skills/` 保留两类内容：
  - 本目录原生维护的 skills
  - 指向根目录 `skills/*` 的兼容软链

当前已迁移：

- `logix-best-practices`：
  - Canonical: `skills/logix-best-practices`
  - Compatibility Link: `.codex/skills/logix-best-practices -> ../../skills/logix-best-practices`

## 安装与分发

- 统一安装说明见仓库根 README：
  - [`../../README.zh-CN.md`](../../README.zh-CN.md)
  - [`../../README.md`](../../README.md)
- 支持两种主流方式：
  - `https://github.com/runkids/skillshare`
  - `https://github.com/vercel-labs/skills`

## 贡献约定

1. 新增仓库级 skill 时，优先创建到 `skills/<skill-name>`。
2. 若需要兼容 `.codex/skills` 发现路径，再在 `.codex/skills/<skill-name>` 建软链回根目录。
3. 同步更新仓库根 `README.zh-CN.md` / `README.md` 的 skills 安装说明与索引。
