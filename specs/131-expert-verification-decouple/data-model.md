# Data Model: Expert Verification Decouple

## 1. `VerificationOwnerRecord`

| Field | Type | Description |
| --- | --- | --- |
| `surface` | string | 路由或 primitive 名称 |
| `routeClass` | string | canonical / expert-only / internal-shared / observability-only |
| `ownerPath` | string | 唯一 owner 文件或目录 |
| `allowedConsumers` | string[] | 允许直接消费该 owner 的模块或消费者 |
| `forbiddenConsumers` | string[] | 明确禁止直接依赖的模块或消费者 |
| `notes` | string | 边界说明 |

## 2. `SharedPrimitiveRecord`

| Field | Type | Description |
| --- | --- | --- |
| `primitive` | string | 共享原语名 |
| `currentPath` | string | 当前 owner 路径 |
| `targetPath` | string | 目标中性 owner 路径 |
| `semanticRole` | string | run harness / evidence / session / protocol / artifact contract |
| `directConsumers` | string[] | 直接消费方 |
| `migrationMode` | string | move / split / narrow / remove |

## 3. `DependencyEdgeRecord`

| Field | Type | Description |
| --- | --- | --- |
| `from` | string | import 发起方 |
| `to` | string | import 指向方 |
| `currentReason` | string | 当前存在这条边的原因 |
| `targetVerdict` | string | keep / move / split / remove |
| `resolutionPath` | string | 计划中的迁移或删除路径 |
| `gate` | string | 对应的 contract test、grep 或 ledger |

## 4. `ConsumerRouteRecord`

| Field | Type | Description |
| --- | --- | --- |
| `consumer` | string | 直接消费者路径 |
| `defaultRoute` | string | 默认验证入口 |
| `allowedExpertRoute` | boolean | 是否允许直接打 expert route |
| `targetStatus` | string | canonical / expert-only / internal-backing-only |
| `notes` | string | 备注 |

## 5. `DocsWritebackRecord`

| Field | Type | Description |
| --- | --- | --- |
| `file` | string | 需要回写的文档或 ledger |
| `role` | string | SSoT / legacy-cutover ledger / spec-local inventory |
| `changeRequired` | string | 需要同步的事实 |
| `gate` | string | 哪个检查点证明已回写 |
