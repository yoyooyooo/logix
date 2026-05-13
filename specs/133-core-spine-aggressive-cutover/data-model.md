# Data Model: Core Spine Aggressive Cutover

## Core Entities

### Module Definition

- `id`
- `state schema`
- `action map`
- `default reducers / effects / fields`
- 只承接定义期事实

### Logic Unit

- `logic id`
- `moduleId`
- `behavior body`
- `kind / name / source`
- 绑定到单个 `Module`

### Program Assembly

- `module`
- `initial`
- `capabilities.services`
- `capabilities.imports`
- `logics`
- 可作为 imports entry 复用与组合

### Runtime Tree

- `root program`
- `child programs`
- `runtime options`
- `control plane`

### Domain Program Kit

- 领域级默认 `Module + Program + Logic` 组合
- 输出形态是 `program-first` 或 `service-first`

## Business Mapping Example: CRUD 管理页

### Recommended Modules

- `ListModule`
- `EditorModule`
- `DetailModule`
- `BulkActionModule`
- `PageModule`

### Recommended Logic Units

- `list-fetch`
- `list-refresh`
- `editor-submit`
- `editor-reset`
- `detail-load`
- `bulk-delete`
- `page-coordinate-selection-to-detail`

### Recommended Programs

- `ListProgram`
- `EditorProgram`
- `DetailProgram`
- `BulkActionProgram`
- `PageProgram`

### Recommended Runtime Composition

`PageProgram` 作为 root program，通过 `capabilities.imports` 组合子 `Program`，页面层只承接协调逻辑与运行容器边界。
