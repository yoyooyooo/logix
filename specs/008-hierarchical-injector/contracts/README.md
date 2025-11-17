# Contracts: 008 层级 Injector 语义统一

**Branch**: `008-hierarchical-injector`  
**Source Spec**: `specs/008-hierarchical-injector/spec.md`  
**Source Plan**: `specs/008-hierarchical-injector/plan.md`  
**Source Research**: `specs/008-hierarchical-injector/research.md`

> 作用：把 008 的关键行为约束写成“可断言的契约”，作为后续实现与测试的裁决口径。

## 目录

- `resolution.md`：strict/global 解析语义（Nearest Wins + root provider）
- `errors.md`：解析失败的错误口径（字段、可读性、修复建议）
