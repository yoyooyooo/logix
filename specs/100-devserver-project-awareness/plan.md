# Implementation Plan: DevServer Project Awareness（100）

**Branch**: `100-devserver-project-awareness` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)

## Summary

为 DevServer 增加只读 Project Awareness RPC，解决 Studio/Agent 的“零猜测启动”问题：

- workspace snapshot（repoRoot/cwd/packageManager）
- `logix.cli.json` 发现与解析（path + config + profiles）
- 默认 entry 的回传（用于默认运行/校验入口）

## Constitution Check

- **最小特权**：只读；不回传源码全文；不执行破坏性 git 命令。
- **统一最小 IR**：返回 JsonValue-only；结构化错误码稳定。
- **单一真相源**：复用 085 的 cliConfig 解析逻辑，避免 Studio 与 Server 计算结果不一致。

## Project Structure

```text
specs/100-devserver-project-awareness/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/
    └── public-api.md
```

```text
packages/logix-cli/
└── src/internal/devserver/**     # 增加只读 handler（复用现有 cliConfig 实现）
```

## Notes / Design Choices

- 方法必须是“显式只读”，避免客户端通过 `dev.run` 去“跑脚本拿信息”。
- snapshot 结果应包含 `capabilities`（如是否允许写回）作为未来扩展点，但本 spec 不强制落地写回治理（交给 101）。

