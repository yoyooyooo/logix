# Research: Domain Package Rebootstrap

## Decision 1: query 明确走 program-first

- **Decision**: `@logixjs/query` 的主输出形态固定为 program-first，`Engine` / `TanStack` 作为辅助集成层。
- **Rationale**: docs 已经明确 query 属于 resource program kit。
- **Alternatives considered**:
  - 继续维持“查询模块”叙事。否决，原因是会长第二语义面。

## Decision 2: i18n 明确走 service-first

- **Decision**: `@logixjs/i18n` 的主入口固定为服务能力与 token contract，`I18nModule` 只允许进入辅助层或退出主线。
- **Rationale**: i18n 的核心价值在 driver 与 token。
- **Alternatives considered**:
  - 继续把 module 形态当默认入口。否决，原因是与 service-first 方向冲突。

## Decision 3: domain 明确走 pattern-kit

- **Decision**: `@logixjs/domain` 聚焦 pattern-kit 与业务模板，不再把 `CRUDModule` 一类旧命名留在主线。
- **Rationale**: domain 包应提供模式工具，不应再次占用核心相位名词。
- **Alternatives considered**:
  - 继续让 `Module` 命名留在领域包主入口。否决，原因是会回到第二管理模型。

## Decision 4: form 保留领域层表达，但边界严守

- **Decision**: `@logixjs/form` 保留 form 主线与 react 子树，同时把 field-kernel 明确停在 expert 边界。
- **Rationale**: form 是领域层，不应让底层 expert 入口回到默认主写法。
- **Alternatives considered**:
  - 让 form 直接退化为 field-kernel façade。否决，原因是会损失领域层抽象。

## Decision 5: 领域包优先复用已对齐资产

- **Decision**: 现有协议、helper、fixtures 和覆盖测试中，凡已对齐主链语义者优先保留或平移。
- **Rationale**: 领域包的主要问题是边界与默认入口，不是所有内部实现都失效。
- **Alternatives considered**:
  - 整包重写。否决，原因是重复劳动过大。

## Decision 6: 第一轮先用直接 public API 测试固定主输出形态

- **Decision**: 不再通过 `querySurface`、`i18nSurface`、`crudPatternKitSurface`、`formDomainSurface` 这类对象固定边界；改为直接断言 `make / from / fields / service-first entry / Crud entry` 等真实公开 API。
- **Rationale**: 这样能把边界事实直接压到真实公开面，而不是再长一层只服务 spec/test 的元数据对象。
- **Alternatives considered**:
  - 直接在同一轮做全量目录重排。否决，原因是当前更适合先钉住边界合同。
