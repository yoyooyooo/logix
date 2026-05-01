# Data Model: Examples Verification Alignment

## 1. `ExampleDispositionRecord`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | 示例路径 |
| `category` | enum | `feature` / `pattern` / `runtime` / `scenario` / `verification` |
| `status` | enum | `keep` / `adapt` / `archive` |
| `docsAnchor` | string | 对应文档锚点 |

## 2. `VerificationFixtureExample`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | verification 示例路径 |
| `env` | string | fixtures/env 说明 |
| `steps` | string | steps 说明 |
| `expect` | string | expect 说明 |

## 3. `AnchorMapEntry`

| Field | Type | Description |
| --- | --- | --- |
| `docsPath` | string | 文档路径 |
| `examplePath` | string | 对应示例路径 |
| `verificationPath` | string | 对应验证示例路径 |

## 4. `ExampleReuseCandidate`

| Field | Type | Description |
| --- | --- | --- |
| `path` | string | 可复用示例路径 |
| `reason` | string | 可复用原因 |
| `reuseMode` | enum | `keep` / `adapt` / `move` |
