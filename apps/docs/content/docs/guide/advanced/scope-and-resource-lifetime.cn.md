---
title: Scope and resource lifetime
description: runtime、provider、local program 与 service 生命周期从哪里开始、在哪里结束。
---

资源应放在能匹配 owner 的最小 scope。

## Runtime scope

runtime 拥有 root program、全局 services、调度、诊断和 control-plane access。

```ts
const runtime = Logix.Runtime.make(AppProgram, { layer: AppLayer })
```

## Provider scope

provider 可以给 subtree 添加局部 layer。route-specific services 和测试替身适合放这里。

## Local program scope

`useModule(Program, { key })` 创建局部/keyed module instance。preview、route-local editor、isolated widget 适合使用这条路线。

## Cleanup

使用 Effect scopes 与 finalizers。除非资源完全在 runtime 之外，否则不要创建自定义公开 destroy protocol。
