---
title: Lifecycle and watchers
description: 在不拆分模块真相的前提下，把 lifecycle hooks、watchers 和宿主 owner 结合起来。
---

Logix 里的模块是长期存在的 runtime 对象。
watcher 和 lifecycle hook 都跟随拥有它们的实例 scope。

## 生命周期钩子

使用：

- `onInitRequired`
- `onStart`
- `onDestroy`
- `onError`

来表达实例启动、后台工作、关闭和 defect 处理。

## Watcher

使用 watcher 来表达长期反应：

- `$.onAction(...)`
- `$.onState(...)`

它们挂在同一份实例生命周期上。
实例 scope 关闭时，这些 flow 会一起停止。

## React 对应关系

- 通过 `useModule(ModuleTag)` 获取的共享实例，跟随托管它的 runtime
- 通过 `useModule(Program, options?)` 获取的局部实例，跟随拥有它的子树
- `useLocalModule(...)` 这类高级局部路线继续跟随组件局部 owner

## 说明

- 生命周期钩子描述实例阶段
- watcher 描述长期反应
- 平台生命周期继续属于 platform integration，而不是组件回调

## 相关页面

- [Lifecycle](../essentials/lifecycle)
- [Cross-module communication](./cross-module-communication)
