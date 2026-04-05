# Effect v4 Schema 升级机会分析（Logix）

## 1. 结论

- Logix 可以明显受益于 Effect v4 Schema 升级能力，且值得纳入 `103` 主线。
- 不建议“全仓同步大扫除”，建议按收益优先：
  1. `packages/logix-form`
  2. `packages/logix-core`
  3. `packages/logix-query`
  4. `apps/docs` / `packages/domain`

## 2. 仓库现状（worktree 实测）

在 `effect-v4` worktree 扫描结果：

- `Schema.Union(`：36
- `Schema.Literal(`：163
- `Schema.Record({ key:`：9
- `Schema.partial(`：7
- `Schema.pattern(`：1
- `ParseResult.TreeFormatter`：1

重点模块 `Schema.` 命中规模：

- `packages/logix-core`：1147
- `packages/logix-form`：163
- `packages/logix-query`：63
- `packages/domain`：97
- `apps/docs`：366

## 3. 关键机会点

## 3.1 低阻力高收益

- `SchemaIssue` 错误格式化能力替换 `ParseResult.TreeFormatter`（表单链路优先）。
- `toJsonSchemaDocument` / `toStandardSchemaV1` 导出能力打通契约输出。
- `SchemaError` + issue 模型统一解码失败语义，强化诊断解释链路。

## 3.2 中等改造（语法迁移）

- `Schema.Union(a, b)` -> `Schema.Union([a, b])`
- `Schema.Literal("a", "b")` -> `Schema.Literals(["a", "b"])`
- `Schema.Record({ key, value })` -> `Schema.Record(key, value)`
- `Schema.partial(...)` / `Schema.pattern(...)` 迁移到 v4 风格 API

## 3.3 结构重构

- `logix-form` 错误路径模型从多形态对象切到 issue/standard schema 语义。
- `logix-core/logix-query` 动态 schema 生成从 variadic 风格重构为结构化风格。
- 以 runtime schema 为单一事实源，驱动 JSON Schema 文档输出。

## 4. 模块优先级矩阵

| 模块 | 建议动作 | 预期收益 | 风险 | 优先级 |
|---|---|---|---|---|
| `packages/logix-form` | 错误格式化与 decode 管线升级 | 错误可解释性与序列化一致性提升 | 错误路径兼容变化 | P0 |
| `packages/logix-core` | `onAction(schema)` 安全解码 + 语法迁移 | 核心稳定性提升，异常噪音下降 | 热路径性能回归 | P0 |
| `packages/logix-query` | 动态 Union/Literal 迁移 | 类型推导与可维护性提升 | 泛型推导退化 | P1 |
| `apps/docs` | 示例全面切 v4 schema 写法 | 文档与实现一致 | 文档改动量大 | P1 |
| `packages/domain` | 迁移语法并试点契约导出 | 领域契约可导出 | demo/生产边界混用 | P2 |

## 5. 建议 PoC

1. Form 错误管线 v4 化（`ParseResult.TreeFormatter` 清零）。
2. Core `onAction(schema)` 安全解码（非法输入不抛异常）。
3. Query 动态 Union/Literal 迁移样板。
4. 单模块 JSON Schema 导出试点（docs/devtools 可消费）。

## 6. 与 103 的衔接建议

- 在 Stage 2（core P0）加入 Schema 子轨道：`core + form + query` 的高收益点。
- 在 Gate G1 增加 Schema 专项检查：
  - 目标模块旧 API 命中下降到阶段目标；
  - `ParseResult.TreeFormatter` 在生产路径清零；
  - 至少 1 个 JSON Schema 导出试点落地。
- 在 Stage 5 完成 docs Schema 示例全量收口。

## 7. 关键命中文件（样例）

- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/configValidation.ts`
- `packages/logix-query/src/Query.ts`
- `packages/logix-form/src/internal/form/controller.ts`
- `packages/logix-form/src/internal/validators/index.ts`
- `apps/docs/content/docs/guide/recipes/react-integration.cn.md`

## 8. 外部参考

- https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md
- https://github.com/Effect-TS/effect-smol/blob/main/packages/effect/SCHEMA.md
- https://effect.website/docs/schema/json-schema
- https://effect.website/docs/schema/error-formatters
