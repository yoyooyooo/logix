# Contract: package.json exports 策略（Public Surface 收口）

**Branch**: `030-packages-public-submodules`  
**Date**: 2025-12-24  
**Spec**: `specs/030-packages-public-submodules/spec.md`

## 目标

通过 `package.json#exports` 收口 public surface，确保：

- 对外入口可预测（新增文件不会意外变成可 import 的 public API）。
- internal 默认不可见，可自由重构。
- 子路径入口（subpath）只有在被显式裁决且具备独立价值时才存在。

## 规则

### 1) 默认策略：对标 effect 的通配导出（但必须有结构治理 + 回归门）

当一个包希望对外提供“概念子模块”（Public Submodules）时，推荐采用 effect 同款策略：

- `.` 指向 `./src/index.ts(x)`（对外 barrel）
- `./*` 指向 `./src/*.ts`（或 `./src/*.tsx`，按包类型选择）
- `./internal/*: null` 屏蔽 internal
- 额外的独立入口（如 `./react` / `./vite`）必须显式列出（不依赖 `./*`）

**前置不变量**（否则 `./*` 会变成“临时文件自动 public”）：

- `src/` 根目录只能出现：
  - 白名单：`index.ts` / `index.tsx`、`global.d.ts`（可选）
  - Public Submodules：PascalCase 的 `.ts/.tsx` 入口文件
  - `internal/`（以及被裁决允许的少数目录，如 `react/` 子入口目录）
- 上述不变量必须由仓库级验证门持续检查（CI 与本地均可跑）

> 解释：effect 之所以能安全使用 `./* -> ./src/*.ts`，本质原因是 **结构治理先行**（根目录只放概念模块），并通过规则/工具把治理变成“自动挡”。

### 2) 例外策略：显式 exports 列表（用于少数特殊包）

以下情况允许使用“显式 exports 列表”替代通配导出：

- 只希望暴露 `.` 单入口（不支持 `@logix/pkg/Foo` 形式的子模块 import）
- 包内需要保留非 PascalCase 的 root 文件（但仍要避免其成为 public surface）
- 需要精细控制 `.ts/.tsx` 混合导出、或对子路径入口做更强约束

但仍必须满足：

- internal 必须被屏蔽（`./internal/*: null` 或等价）
- 不得导出指向 `src/internal/**` 的路径
- 出口集合必须与 `contracts/public-submodules.md` 的裁决一致

### 3) internal 必须屏蔽（强制）

- 必须通过 `./internal/*: null` 或等价机制阻止 internal 被 import。
- internal 的命名空间不得以“变体入口”绕过（例如 `./__internal`、`./_internal` 等）。

### 4) 子路径入口必须可验收

对外开放 subpath 前必须满足：

- 有明确的稳定能力（非空壳）。
- 在 `contracts/public-submodules.md` 中登记其目的与边界。
- 有对应的迁移说明（若引入 breaking change）。

**空壳（最小可执行口径）**：

- `exports["./x"]` 指向的目标文件不存在。
- 目标模块是空模块（例如仅 `export {}` / 无任何导出）。
- 若该入口是“仅类型（types-only）”入口：必须在 `contracts/public-submodules.md` 显式标注为 types-only，并至少导出一个对外类型；否则仍视为空壳（避免留下“占位但无契约”的入口）。

### 5) publishConfig 与开发态 exports 的一致性

- 若包配置了 `publishConfig.exports`，则其入口集合必须与开发态 `exports` 一致（仅路径/产物后缀可不同）。
- 不允许“本地可 import，但发布后不可 import”的隐式差异。

## 验收建议（用于质量门）

实现阶段应提供自动化检查，至少覆盖：

- 若 `exports` 存在通配导出：是否满足“根目录治理不变量”（否则必须失败）。
- 是否屏蔽 internal。
- 是否存在空壳子路径入口（指向空文件/空导出或未被裁决的入口）。
