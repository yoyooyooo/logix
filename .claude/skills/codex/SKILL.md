---
name: codex
description: 委托 Codex CLI 执行编码任务。当用户提出代码实现、修改、重构、测试、Bug修复等需求时使用。核心：会话复用（resume）保持上下文连贯，结构化提示词明确任务期望。触发词：代码、实现、修改、重构、测试、Bug、功能。
---

# Codex Delegation Skill

## 核心理念

**我（Claude Code）是主脑**：意图识别、任务编排、信息搬运
**Codex 做所有编码**：探索、规划、实现、测试、修复

## 快速开始

### 新建会话
```bash
echo '你的任务描述' | codex exec --full-auto -c reasoning_effort=high
# 记录返回的 session id
```

### 复用会话（核心）
```bash
echo '继续任务...' | codex exec resume <SESSION_ID> -
```

## Reasoning Effort

| 阶段 | Effort | 场景 |
|------|--------|------|
| 探索 | `medium` | 文件探索、代码阅读 |
| 实施 | `high` | 功能实现、Bug修复（**默认**）|
| 复杂 | `xhigh` | 架构设计、多模块协调 |

```bash
echo '任务' | codex exec --full-auto -c reasoning_effort=medium
```

## 会话管理

### 核心原则：优先 resume

Codex 的 resume 机制**已经维护了完整上下文**，不需要额外的背景知识提取。

| 场景 | 策略 |
|------|------|
| 同一任务继续深入 | **resume** |
| 探索后进入实施 | **resume** + 阶段切换提示词 |
| 完全无关的新任务 | **新建会话** |
| 并行多个独立任务 | **各自新建** |

### 阶段切换提示词

当 resume 一个会话进入新阶段时，用结构化提示词说明：

```
## 阶段切换
从「探索」进入「实施」阶段。

## 基于之前的探索
你已经了解了该模块的结构和关键接口。

## 新任务
[具体的实施任务]

## 期望
1. 直接开始实现，不要重新探索
2. 完成后回报：变更文件、关键决策、测试建议
```

## 工作流程

```
1. 意图识别 → 判断任务类型
2. 会话判断 → resume 还是新建
3. Effort 选择 → medium/high/xhigh
4. 组装提示词 → 角色 + 任务 + 期望
5. 委托 Codex → 执行
6. 解析回报 → 记录 session ID，决策下一步
```

## 提示词结构

每次给 Codex 的指令：

```
## 角色
[根据任务类型：探索专家/架构师/开发工程师]

## 任务
[清晰描述]

## 要求
[具体要求]

## 完成后回报
1. 完成状态
2. 主要变更/发现
3. 关键决策
4. 下一步建议
```

详细的任务类型模板见 [prompts.md](prompts.md)。

## 后台任务

支持并行执行独立任务：

```
Bash(command: "echo '...' | codex exec --full-auto", run_in_background: true)
→ 返回 task_id

TaskOutput(task_id: "xxx", block: true)  # 获取结果
```

## 关键原则

1. **Resume 优先**：利用 Codex 原生的上下文延续
2. **结构化提示词**：每次 resume 说清楚阶段和期望
3. **Effort 动态调整**：探索 medium，实施 high
4. **编码交给 Codex**：我只做编排，不写代码
5. **要求回报**：每次都要 Codex 总结

## 常用选项

| 选项 | 说明 |
|------|------|
| `resume <ID> -` | 复用会话，stdin 读指令 |
| `--full-auto` | 全自动模式 |
| `-c reasoning_effort=<level>` | 推理深度 |
| `-C <dir>` | 工作目录 |
