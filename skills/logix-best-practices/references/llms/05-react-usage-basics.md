---
title: React 集成基础（LLM 版）
---

# React 集成基础（LLM 版）

## 1) 常用 hooks

- `useModule(handle)`：拿模块实例与 dispatch 能力。
- `useSelector(runtimeOrHandle, selector, equality?)`：订阅状态切片。
- `useDispatch(runtimeOrHandle)`：获取稳定 dispatch。
- `useImportedModule(parent, Child.tag)`：访问 imports 子模块。

## 2) 使用约束

- hooks 必须在 `RuntimeProvider` 子树内。
- selector 保持纯函数；对象返回配合 `shallow`/自定义 equality。
- 多实例场景显式使用 key/scope，避免串读。

## 3) 性能要点

- 优先细粒度 selector。
- 避免重复 `useModule(handle)` 造成额外订阅。
- 组件层不维护与 Logix 冲突的状态副本。
