---
title: Standardized Scenario Patterns
status: living
version: 1
---

# Standardized Scenario Patterns

## 当前总规则

所有标准示例统一遵守：

- `Module` 承接定义期
- `Program` 承接装配期
- `Runtime.make(Program)` 负责运行治理
- React 全局实例默认读 `Module`
- React 局部实例默认按 `Program` 语义组织
- imported 子实例默认按 import slot 解析
- `process / link` 停留在 orchestration expert 家族
- 直接 `StateTrait.from(...)` 停留在 field-kernel expert 入口

## 当前代表场景

### 1. 全局单例模块

- `useModule(Module)` 读取当前 runtime tree 中已安装的全局实例

### 2. 异步任务与并发语义

- 长链路任务继续挂在 `rules`
- 并发语义显式保留在 `latest / exhaust / queue / parallel`

### 3. 服务注入

- 默认注入面是 `services`
- 只有跨模块协作时才显式升级到 `imports / roots`

### 4. 显式 imports 组合

- `imports` 以命名 slot 暴露
- React imported 子实例按 slot 解析

### 5. subtree env override

- `RuntimeProvider.layer` 继续是标准入口

### 6. local / session / suspense 实例

- React 局部实例按 `Program` 语义组织
- `key / gcTime / suspend / initTimeoutMs` 继续保留为局部实例协议

### 7. subtree process 与跨模块长期编排

- `useProcesses(...)` 仍是 React 宿主面的标准安装点
- `process / link` 继续停留在 orchestration expert 家族

### 8. field-kernel expert

- 日常作者默认优先 `logic` 家族
- 直接 `StateTrait.from(...)` 属于 field-kernel expert 入口

## 当前一句话结论

未来标准场景已经可以围绕 `Module / Program / Runtime / RuntimeProvider` 组织；真正停留在 expert 的，是 orchestration 家族与 field-kernel 直接入口。
