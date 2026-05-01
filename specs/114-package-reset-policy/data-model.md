# Data Model: Package Reset Policy

## 1. `PackageDispositionRecord`

| Field | Type | Description |
| --- | --- | --- |
| `packageName` | string | npm 包名 |
| `currentDir` | string | 当前仓库目录 |
| `family` | enum | `core` / `host` / `domain` / `cli` / `tooling` |
| `disposition` | enum | `preserve` / `freeze-and-rebootstrap` / `merge-into-kernel` / `drop` |
| `reuseCandidates` | string[] | 可直接复用或平移的实现 / 协议 / 测试资产 |
| `ownerSpec` | string | 后续负责该包的 spec 编号 |
| `docsRefs` | string[] | 需要同步回写的 docs 页面 |
| `successorTemplate` | string | 继承的 family template |
| `notes` | string | 额外说明 |

## 2. `ArchiveOperation`

| Field | Type | Description |
| --- | --- | --- |
| `sourceDir` | string | 旧实现目录 |
| `archiveDir` | string | 旧实现封存目录 |
| `successorDir` | string | 新主线目录 |
| `migrationNotePath` | string | 迁移说明或回写落点 |
| `preservedFiles` | string[] | 封存时必须保留的文件类别 |
| `reuseLedgerPath` | string | 对应 reuse ledger 落点 |
| `docsWriteback` | string[] | 需要同步回写的 docs 页面 |

## 3. `PackageFamilyTemplate`

| Field | Type | Description |
| --- | --- | --- |
| `family` | enum | 包家族 |
| `publicSurfaceRule` | string | 公开层规则 |
| `internalRule` | string | internal 层规则 |
| `testMirrorRule` | string | 测试镜像规则 |
| `specialDirs` | string[] | 特殊目录 |

## 4. `TopologyContract`

| Field | Type | Description |
| --- | --- | --- |
| `canonicalPackageDir` | string | 主线包目录 |
| `familyTemplate` | string | 适用的 family template |
| `publicModules` | string[] | 公开子模块 |
| `internalClusters` | string[] | internal 功能簇 |
| `reusedAssets` | string[] | 计划直接沿用的实现或测试资产 |
| `testFolders` | string[] | 测试目录 |
| `fixturesFolders` | string[] | fixtures 或 browser 验证目录 |
| `adjacentExamples` | string[] | 邻接的 examples / fixtures |

## 5. Canonical Topology Examples

### Host Family Example

```json
{
  "canonicalPackageDir": "packages/logix-react",
  "familyTemplate": "host",
  "publicModules": ["src/index.ts", "src/RuntimeProvider.ts", "src/Hooks.ts"],
  "internalClusters": ["src/internal/provider/**", "src/internal/store/**", "src/internal/hooks/**"],
  "reusedAssets": ["src/internal/provider/**", "test/RuntimeProvider/**", "test/integration/**"],
  "testFolders": ["test/RuntimeProvider/**", "test/integration/**", "test/browser/**"],
  "fixturesFolders": ["test/browser/**"],
  "adjacentExamples": ["examples/logix-react/src/demos/**"]
}
```

### CLI Family Example

```json
{
  "canonicalPackageDir": "packages/logix-cli",
  "familyTemplate": "cli",
  "publicModules": ["src/index.ts", "src/bin/logix.ts"],
  "internalClusters": ["src/internal/commands/**", "src/internal/artifacts.ts", "src/internal/output.ts"],
  "reusedAssets": ["src/internal/artifacts.ts", "src/internal/result.ts", "src/internal/commands/trialRun.ts"],
  "testFolders": ["test/Integration/**", "test/Args/**"],
  "fixturesFolders": [],
  "adjacentExamples": ["examples/logix/src/scenarios/**"]
}
```

## Relationship Notes

- `PackageDispositionRecord` 决定包是否产生 `ArchiveOperation`
- `PackageFamilyTemplate` 约束 `TopologyContract`
- `ownerSpec` 把 inventory 路由到 `115` 到 `119`
- `successorTemplate` 让每个包在进入 owner spec 前先绑定模板
- `ArchiveOperation` 与 `TopologyContract` 一起构成 T014 的最小执行合同
