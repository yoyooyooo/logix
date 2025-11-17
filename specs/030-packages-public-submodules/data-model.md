# Data Model: Packages 对外子模块裁决与结构治理

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-24  
**Spec**: `specs/030-packages-public-submodules/spec.md`

> 本特性为“工程治理/对外边界收口”，此处的数据模型用于描述裁决产物自身（清单/例外/迁移），不对应任何线上持久化存储。

## Entities

### Package

代表一个 `packages/*` 子包。

- `name`: string（例如 `@logix/core`）
- `path`: string（例如 `packages/logix-core`）
- `role`: `"core" | "adapter" | "tooling" | "infra" | "domain"`
- `entrypoints`: ReadonlyArray<IndependentEntryPoint>
- `submodules`: ReadonlyArray<PublicSubmodule>

### PublicSubmodule

代表一个对外稳定概念入口（Public Submodule）。

- `name`: string（PascalCase 概念名，例如 `Runtime` / `Query` / `Form`）
- `package`: Package（归属包）
- `sourceFile`: string（例如 `src/Runtime.ts` 或 `src/RuntimeProvider.tsx`）
- `importPath`: string（例如 `@logix/core/Runtime` 或 `@logix/react` 的命名导出约定）
- `kind`: `"namespace" | "component" | "hooks" | "service" | "types" | "protocol" | "middleware" | "other"`
- `stability`: `"stable" | "experimental"`（若为 experimental，必须在清单中显式标注）

### IndependentEntryPoint

代表一个子路径入口（subpath export），例如 `@logix/form/react`、`@logix/sandbox/vite`。

- `subpath`: string（例如 `/react`、`/vite`）
- `purpose`: string（该入口的稳定价值与使用场景）
- `exportTarget`: string（导出指向的源文件/构建产物）
- `status`: `"allowed" | "forbidden" | "deprecated"`（本仓默认拒绝兼容层，deprecated 仅作为迁移期短暂标记）

### Exception

用于登记“与通用规则不一致但被允许”的情况。

- `scope`: `"package" | "repo"`
- `reason`: string（必须是可解释、可审计的理由）
- `expiry`: string | null（建议填写目标版本/里程碑；若无则写 null 并在计划中说明）
- `mitigation`: string（如何降低该例外引入的风险，例如额外验证门/迁移计划）

### GapItem

漂移报告中的单条差异记录。

- `package`: Package
- `category`: `"A_aligned" | "B_public_but_not_aligned" | "C_should_be_internal"`
- `currentShape`: string（当前路径/导出面摘要）
- `targetShape`: string（目标路径/导出面摘要）
- `impact`: `"low" | "medium" | "high"`（对调用方/示例/文档的影响）

### MigrationStep

迁移路线图中的一个可交付步骤。

- `id`: string
- `package`: Package
- `objective`: string（要达成的结构与导出面结果）
- `checks`: ReadonlyArray<string>（验收方式：typecheck/lint/test/verify gate 等）
- `migrationNote`: string（用户侧如何迁移的说明）

