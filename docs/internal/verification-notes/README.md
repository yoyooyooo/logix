---
title: Verification Notes
status: internal
version: 1
---

# Verification Notes

本目录承接维护者视角的验证排障笔记。

## 当前角色

- 记录测试 runner、浏览器验收、CI/本地差异和排障结论。
- 只保存可复用的维护经验，不替代 SSoT、ADR、standards 或 active spec。
- 稳定到跨主题规则后，应升格到 `docs/standards/**`。
- 涉及具体 feature 的命令证据仍回写对应 `specs/**/notes/verification.md`。

## 当前入口

| 页面 | 主题 | 说明 |
| --- | --- | --- |
| [browser-route-acceptance-runners.md](./browser-route-acceptance-runners.md) | browser route 验收 runner | 记录 Playground route 级 browser acceptance 使用 direct Playwright，Vitest Browser Mode 保留给轻量 browser/component/HMR smoke |

## 读法

- 查当前 Playground 产品事实，先看 [Playground Product Workbench](../../ssot/runtime/17-playground-product-workbench.md)。
- 查 166 browser/layout 具体验证证据，先看 [166 verification notes](../../../specs/166-playground-driver-scenario-surface/notes/verification.md)。
- 本目录只解释“为什么这个 runner 适合这个验收面”。
