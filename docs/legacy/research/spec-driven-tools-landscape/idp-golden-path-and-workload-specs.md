# IDP / Golden Path / Workload Spec：把规范变成“可执行入口”

目标：补齐“平台工程落地面”的规范化工具：它们往往不叫 spec-driven，但本质是把规范固化成模板、门禁与可复用的工作负载描述，从而降低认知负担与 drift。

## 1) Backstage Software Templates：把“最佳实践”做成可执行蓝图

定位：用模板（YAML）+ steps（actions）+ 参数表单，让工程师一键生成“符合组织规范的工程骨架”，并可记录执行日志与失败原因。

可追溯入口：

- 官方文档（Software Templates）：https://backstage.io/docs/features/software-templates/

对 intent-flow 的启示：

- Backstage 的模板化解决的是“工程形态一致性”；intent-flow 可以把“Flow/Logix 形态一致性”做成类似的“可执行蓝图”（例如一键生成 module/logic skeleton + tests + sandbox scenario）。

## 2) Backstage API Docs / OpenAPI & AsyncAPI 资产化

定位：把 OpenAPI/AsyncAPI/GraphQL 等 API 规范作为 Catalog 的一等实体（API kind），并支持 `$openapi`/`$asyncapi` 占位符解析 `$ref`。

可追溯入口：

- `@backstage/plugin-catalog-backend-module-openapi`（openapi/asyncapi $ref resolver）：  
  https://www.npmjs.com/package/%40backstage%2Fplugin-catalog-backend-module-openapi
- Backstage `api-docs` 插件说明（支持 OpenAPI/AsyncAPI/GraphQL）：  
  https://github.com/backstage/backstage/blob/master/plugins/api-docs/README-alpha.md

对 intent-flow 的启示：

- “把规范当 Catalog 资产 + 自动 resolve refs + UI 浏览”是治理规模化的关键；对应 intent-flow：把 `Static IR`、`Trace Spec`、`Checks ruleset` 也当成可索引资产，而不是散落在文档里。

## 3) EventCatalog × Backstage：事件规范的可发现层

定位：把 Confluent/Apicurio/AWS Glue 的 schemas，以及 AsyncAPI/OpenAPI 等规范汇总成可读文档与可视化，并嵌入 Backstage。

可追溯入口：

- Integrations 总览：https://www.eventcatalog.dev/integrations
- Backstage plugin 导航页：https://www.eventcatalog.dev/docs/backstage

对 intent-flow 的启示：

- 对真实业务组织来说，“规范资产”必须具备 owner、归属域、发现路径与可视化；否则再强的 checks 也会被绕开或退化成摆设。

## 4) Score（Workload Spec）：dev 与 platform 的“契约分层”

定位：用 `score.yaml` 描述 workload 运行需求（vendor/platform-agnostic），由实现工具翻译成 docker-compose/k8s 等目标环境配置。

可追溯入口：

- 规范仓库（README 含示例、理念与实现列表）：https://github.com/score-spec/spec
- 官网（价值主张：config drift、one file、overrides/extensions）：https://score.dev/
- 规范参考（字段与 placeholder 语义）：http://docs.score.dev/docs/score-specification/score-spec-reference/

对 intent-flow 的启示：

- Score 的关键价值是“把 what（workload needs）与 how（平台实现）切开，并把 what 作为单一事实源”；这与 intent-flow 要做的“Intent/Flow（what）与 Runtime 实现（how）分层”高度同构。

