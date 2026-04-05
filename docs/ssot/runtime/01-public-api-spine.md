---
title: Public API Spine
status: living
version: 3
---

# Public API Spine

## 目标

冻结新体系下的公开 API 主链。

## 当前主链

- `Module`
- `Logic`
- `Program`
- `Runtime`
- `RuntimeProvider`

## 当前规则

- `Module` 承接定义期角色
- `Program.make(Module, config)` 是唯一公开装配入口
- `Runtime.make(Program)` 是唯一公开运行入口
- `Runtime` 继续承接运行与 control plane 能力
- React 全局实例默认读 `Module`
- React 局部实例按 `Program` 语义组织
- 不新增第二组公开相位对象
- 旧名字、旧 facade、旧壳层不自动继承
- 领域包默认降到同一条公开主链，不得自带第二套 runtime 心智
- `runtime.check / runtime.trial / runtime.compare` 属于 control plane，不进入公开 authoring surface

## 说明

这份文档是新 runtime SSoT 的第一批事实源。

历史公开 API 与旧实现壳层仍可在 `docs/legacy/` 查阅，但不再占据默认主叙事。
