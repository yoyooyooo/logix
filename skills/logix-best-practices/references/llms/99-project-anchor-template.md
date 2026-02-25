---
title: 项目锚点映射模板（可选）
---

# 项目锚点映射模板（可选）

当你把本 skill 用在某个具体项目里，可用此模板填入该项目的权威入口。

## 1) 规范入口

- SSoT 根：`<project>/docs/...`
- Runtime API：`<project>/docs/...`
- React 集成：`<project>/docs/...`
- Testing 指南：`<project>/docs/...`

## 2) 核心源码入口

- Runtime 事务：`<project>/packages/...`
- 诊断事件：`<project>/packages/...`
- Process/Flow：`<project>/packages/...`
- React hooks：`<project>/packages/...`

## 3) 质量门命令

- typecheck：`<pkg-manager> run ...`
- lint：`<pkg-manager> run ...`
- test：`<pkg-manager> run ...`

## 4) 特殊约束

- 事务窗口禁令：`<project-specific>`
- 诊断协议约束：`<project-specific>`
- IR/Trace 约束：`<project-specific>`
