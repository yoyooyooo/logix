# Inventory: Family Templates

## Core Family

- Canonical package: `@logixjs/core`
- Archive pattern:
  - 默认不走 `_frozen`
  - `core-ng` 的独立支线进入 `merge-into-kernel`
- Public surface:
  - `src/index.ts`
  - `src/*.ts` 作为稳定公开子模块
- Internal clusters:
  - `src/internal/runtime/core/**`
  - `src/internal/observability/**`
  - `src/internal/reflection/**`
  - `src/internal/platform/**`
- Test mirror:
  - `test/Contracts/**`
  - `test/Runtime/**`
  - `test/Process/**`
  - `test/observability/**`
- Special notes:
  - hot path 改动要带 perf evidence
  - `core-ng` 相关迁移只允许挂到 support matrix，不再做并列主线

## Host Family

- Canonical packages:
  - `@logixjs/react`
  - `@logixjs/sandbox`
  - `@logixjs/test`
  - `@logixjs/devtools-react`
- Archive pattern:
  - 默认 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- Public surface:
  - `src/index.ts`
  - 少量包级入口文件，例如 `RuntimeProvider.ts`, `Hooks.ts`, `Protocol.ts`, `Assertions.ts`
- Internal clusters:
  - `src/internal/provider/**`
  - `src/internal/store/**`
  - `src/internal/hooks/**`
  - `src/internal/worker/**`
  - `src/internal/runtime/**`
  - `src/internal/ui/**`
- Test mirror:
  - `test/integration/**`
  - `test/browser/**`
  - `test/internal/**`
- Special notes:
  - 所有验证与证据格式围绕 `runtime control plane`
  - React 语义保持单快照读取

## Domain Family

- Canonical packages:
  - `@logixjs/query`
  - `@logixjs/form`
  - `@logixjs/i18n`
  - `@logixjs/domain`
- Archive pattern:
  - 默认 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- Public surface:
  - `src/index.ts`
  - `src/*.ts` 保留单一主输出形态相关入口
  - 可选宿主子树放 `src/react/**`
- Internal clusters:
  - `src/internal/<domain>/**`
  - `src/internal/schema/**`
  - `src/internal/driver/**`
- Test mirror:
  - `test/<primary-output>/**`
  - `test/internal/**`
  - `test/typecheck/**`
- Special notes:
  - 每包只能有一个主输出形态
  - 不允许再长第二套 runtime、事务、诊断事实源

## CLI Family

- Canonical package: `@logixjs/cli`
- Archive pattern:
  - 默认 `packages/_frozen/logix-cli-legacy-<YYYYMMDD>/`
- Public surface:
  - `src/index.ts`
  - `src/bin/*.ts`
- Internal clusters:
  - `src/internal/commands/**`
  - `src/internal/artifacts.ts`
  - `src/internal/output.ts`
  - `src/internal/result.ts`
- Test mirror:
  - `test/Integration/**`
  - `test/Args/**`
- Special notes:
  - 一级命令面只围绕 `check / trial / compare`
  - expert 或 legacy route 不进入主命令面

## Tooling Family

- Canonical package: `speckit-kit`
- Archive pattern:
  - 默认 preserve，不进入本轮 `_frozen` 路线
- Public surface:
  - 维持现有最小入口
- Internal clusters:
  - 按工具自身组织
- Test mirror:
  - 维持现状
- Special notes:
  - 默认 out-of-cutover
  - 只有阻塞主线时才重新裁决
