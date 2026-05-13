# Research: Form Field-Kernel Second Wave

## Decision 1: `06` 需要一个独立 second-wave spec

- `117` 已经覆盖第一波领域边界
- `06` 的 Form / field-kernel 深度比其它领域包更高

## Decision 2: commands 与 logic family 不能分开裁决

- 两者都影响作者面
- 必须在同一 spec 内统一口径

## Decision 3: 退出只服务测试治理的 package surface 元数据

- `formDomainSurface` 退出源码公开面
- package boundary 改为直接断言真实公开 API
- `Form.derived` 退出顶层 barrel，收口到 `$.derived(...)`
