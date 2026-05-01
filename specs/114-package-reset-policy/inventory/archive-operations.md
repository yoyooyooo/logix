# Inventory: Archive Operations

## Canonical Rule

- 旧实现需要退出主线时，先迁到 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- canonical 目录 `packages/<dir>/` 继续保留给新主线
- 封存动作必须和 owner spec、相关 docs 一起回写

## Procedure

### 1. Freeze Decision

- 在 `disposition-matrix.md` 明确该包为 `freeze-and-rebootstrap`
- 在 `reuse-candidates.md` 先登记可平移资产

### 2. Archive Move

- 旧主线目录迁到 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- 封存目录内保留 `package.json`、`src/**`、`test/**`、必要脚本和迁移说明

### 3. Rebootstrap

- 新主线在原 canonical 路径重建
- 只把 reuse ledger 中登记过的实现、helper、fixtures、tests 平移回新主线

### 4. Writeback

- owner spec 记录迁移说明、successor path、剩余待处理资产
- 相关 docs 页面补回新包角色、旧入口去向、examples 或 verification 影响

## Topology Contract Before Move

在真正封存前，每个 `freeze-and-rebootstrap` 包至少先补这 5 项：

| Field | Meaning |
| --- | --- |
| `familyTemplate` | 继承哪个 family template |
| `publicModules` | 新主线公开入口保留哪些 `src/*.ts` |
| `internalClusters` | 新主线的 internal 功能簇 |
| `testFolders` | 需要平移的测试镜像 |
| `fixturesFolders` | browser / fixtures / examples 邻接目录 |

若这 5 项没有先写清，禁止开始目录级 freeze。

## Examples

| Package | Archive Pattern | Successor Owner |
| --- | --- | --- |
| `logix-react` | `packages/_frozen/logix-react-legacy-20260405/` | `116` |
| `logix-sandbox` | `packages/_frozen/logix-sandbox-legacy-20260405/` | `116` |
| `logix-query` | `packages/_frozen/logix-query-legacy-20260405/` | `117` |
| `i18n` | `packages/_frozen/i18n-legacy-20260405/` | `117` |
| `logix-cli` | `packages/_frozen/logix-cli-legacy-20260405/` | `118` |

## Package-Level Archive Notes

- `logix-react`
  - 平移优先级：`provider / store / hooks / integration tests`
  - 邻接验证：`test/browser/**`, `test/integration/**`
- `logix-form`
  - 平移优先级：`internal/form`, `internal/schema`, `validators`, `test/Form/**`
  - 邻接验证：`src/react/**` 只作为 host 邻接，不再替代 domain 主线
- `logix-cli`
  - 平移优先级：`artifacts`, `output`, `result`, `stableJson`, `trialRun`
  - 退出主线：`anchor*`, `ir*`, `describe`, `transformModule`, `unsupported`

## Guardrails

- 不在 canonical 路径内保留第二套 legacy 子树
- 不在新主线保留隐式兼容层
- 不跳过 reuse ledger 直接封存
