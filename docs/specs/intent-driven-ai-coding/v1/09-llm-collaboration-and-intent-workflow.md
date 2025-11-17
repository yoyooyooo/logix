---
title: LLM 协同视角下的意图驱动工作流
status: draft
version: v1
---

> 本文站在 “LLM 第一视角” 重述整套意图驱动体系：  
> 假设我们已经拥有 IMD 仓库 `/Users/yoyo/projj/git.imile.com/ux/imd` 与 best-practice 仓库 `/Users/yoyo/projj/git.imile.com/ux/best-practice`，  
> 目标是让开发者在面对未知场景时，只需要把需求讲清楚，剩下交给「LLM + Intent + Pattern + 模板」协同完成。

## 1. 定位：Intent 是 LLM 的结构化 Prompt

如果没有今天的 LLM，这套 Intent / Pattern / Template / Plan 体系基本是自找麻烦：  
人类直接看文档 + 写代码更快。

有了 LLM，Intent 的意义在于：

- 从 LLM 的角度，Intent 是一份**结构化的需求 Prompt**：
  - 比散文式 prompt 强在：可解析、可校验、可复用、可追溯；
  - 可以作为后续 Pattern 匹配、Plan 生成、重构建议的稳定输入。
- Pattern / Template / best-practice 则分别扮演：
  - **Pattern YAML**：LLM 的“可索引经验库”（什么场景用什么套路）；
  - **Template / snippets**：LLM 的“代码积木”；  
    通过模板 + 片段约束结构，LLM 只填 slot，而不是自由发挥；
  - **rules-registry**：LLM 的“硬性红线”，例如禁止在 Zustand 中放服务端数据。

本文件聚焦一件事：

> 描述在 “订单 CRUD” 这种典型场景下，一个 LLM 实例如何沿着  
> 「自然语言需求 → Intent → Pattern → Plan → 代码骨架 → 增量重构」这条链条工作，  
> 以及这些现有 YAML/文档在每一步给它提供了什么支撑。

## 2. 四类一等工件：LLM 眼中的世界

从 LLM 视角看，平台需要它理解和操作的“硬货”只有四种：

1. **Intent（意图说明）**  
   - 文件：`intents/<feature-id>.intent.yaml`  
   - 描述内容：goals（目标）、scene（场景结构）、patterns（已选模式）、domain（实体 + 接口）。
   - 示例：`order-management.intent.yaml` 描述订单列表 + 筛选 + 快速编辑 + 导出等需求。

2. **Pattern（模式）**  
   - 文件：`patterns/*.pattern.yaml`  
   - 描述内容：某类场景的一贯套路：问题、适用性、roles（代码角色）、dataContract、paramsSchema、uiSchema 等。
   - 示例：
     - 列表页壳：`list-page.pattern.yaml`
     - 筛选条：`filter-bar.pattern.yaml`
     - 服务端筛选表格：`table-with-server-filter.pattern.yaml`
     - 工具栏 + 快速编辑：`toolbar-with-quick-edit.pattern.yaml`
     - 服务层 + 适配器 + Query Hook：`service-adapter-query.pattern.yaml`
     - Zustand Store + Slice 拆分：`zustand-store-with-slices.pattern.yaml`
     - CRUD 垂直特性骨架：`crud-feature-skeleton.pattern.yaml`

3. **Template Meta（模板元数据）**  
   - 文件：`templates/*.template.yaml` 以及 IMD 内部的模板 meta 文件。  
   - 描述内容：某个模式在当前工程环境（IMD + best-practice）下如何被实现：
     - 实现了哪些 `patternId` / `roles`；
     - 需要哪些参数；
     - 引用了哪些 snippet/template（例如 `tpl-service-layer`、`tpl-zustand-basic-store` 等）。
   - 典型来源：
     - best-practice 模板索引：`/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/03-templates.yaml`
     - IMD registry 模板：`/Users/yoyo/projj/git.imile.com/ux/imd/apps/www2/registry/default/templates/*`

4. **Plan + Execution Log（出码计划与执行日志）**  
   - 文件：
     - Plan：`.plans/<feature-id>.plan.json`
     - Log：`.plans/logs/<feature-id>/<timestamp>.log.json`
   - 描述内容：
     - 将创建/修改/删除哪些文件；
     - 每个 action 对应的 `patternId` / `templateId` / params；
     - 实际执行结果和 diff。

LLM 与 CLI 的职责分工：

- LLM 负责：补全 Intent、匹配 Pattern、选模板、填参数，生成 **Plan 草稿** 和解释；
- CLI / 平台内核负责：验证、执行 Plan，真正写文件、记录日志。

## 3. 阶段一：自然语言需求 → 初版 Intent YAML

**目标**：开发者只需要“讲需求”，LLM 帮忙产出一份结构化 `order-management.intent.yaml` 草稿。

### 3.1 LLM 需要知道什么？

LLM 角色可以称为「Intent Builder」。system prompt 中需要挂载的关键文档包括：

- Intent/Pattern 规划：
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/01-overview.md`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/02-patterns-and-intents.md`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/intents/order-management.intent.yaml`（作为风格示例）
- best-practice 的基础约束和命名习惯：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/00-constitution.md`
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/05-file-conventions.md`
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/06-state-management.md`
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/03-api-integration-guide.md`
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/03-development-guides/11-adapter-pattern-guide.md`

LLM 必须遵守：

- 输出严格符合 Intent YAML 结构（goals/scene/domain/patterns/openQuestions/autoFill 等）；
- 字段命名与接口风格尽量贴近 best-practice 中的约定。

### 3.2 典型输入与输出

**开发者输入（自然语言）：**

> “我要做一个订单管理模块：  
>  - 列表要按状态、下单时间、买家名称筛选  
>  - 要能查看详情、修改备注、导出当前筛选条件下的订单  
>  - 后端会提供 listOrders / getOrder / updateOrder / exportOrders 四个接口  
>  你帮我生成一份 Intent YAML 草稿。”

**LLM 输出：**

一份结构化 Intent YAML，例如：

- `id: order-management`
- `goals`：提效、统一导出能力等；
- `scene`：`type: list-page`，regions: filters/toolbar/table，actors/flows 基于描述推导；
- `domain.entities[Order]`：字段列表（id/status/createdAt/updatedAt/buyerName/totalAmount/remark 等）；
- `domain.apis`：listOrders, getOrder, updateOrder, exportOrders 的 path/method/参数；
- `patterns`：可以先只声明场景类型（如 `list-page`），后续由 Pattern 阶段补全具体模式。

**节省了什么？**

- 开发者只需用自然语言解释业务，不必自己手写 YAML 结构；
- 字段和接口命名自动对齐 best-practice 的术语和风格，减少“想名字 + 查规范”的时间；
- 为后续 Pattern 匹配和 Plan 生成提供稳定结构。

## 4. 阶段二：Intent → Pattern 选择与配置

**目标**：基于 Intent，自动挑选合适的 Pattern 组合，并初步填好各自的 config。

### 4.1 LLM 需要知道什么？

LLM 角色可称为「Pattern Advisor」，system prompt 挂载：

- 所有 Pattern 定义：
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/list-page.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/filter-bar.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/table-with-server-filter.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/toolbar-with-quick-edit.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/service-adapter-query.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/zustand-store-with-slices.pattern.yaml`
  - `/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/patterns/crud-feature-skeleton.pattern.yaml`
- best-practice 的关键规则（用来约束 LLM 的选择）：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/01-rules-registry.yaml`

约束：

- 只能从上述 Pattern 列表中选择 `id`，不得随意创造新 patternId；
- 填写各模式的 `config` 时必须遵循该模式的 `paramsSchema`。

### 4.2 典型行为：订单 CRUD 场景

LLM 根据 Intent 的 `scene` + `domain` 推断：

- 这是一个标准列表页场景：`list-page`；
- 有顶部筛选区：`filter-bar`；
- 顶部工具栏包含导出/快速编辑：`toolbar-with-quick-edit`；
- 表格需要服务端筛选/分页：`table-with-server-filter`；
- 需要规范的服务层/适配器/Query Hook：`service-adapter-query`；
- 需要跨组件的 UI 状态（筛选、当前行、弹层）：`zustand-store-with-slices`；
- 整个特性可以由一条“垂直骨架”模式串起：`crud-feature-skeleton`。

LLM 输出（直接写回 Intent 的 `patterns` 字段，例如）：

- `list-page`：
  - `target: page`
  - `config.regions: ["filters", "toolbar", "table"]`
- `filter-bar`：
  - `target: filters`
  - `config.entity: Order`
  - `config.fields: ["status", "createdAt", "buyerName"]`
  - `inlineSearch: true`
- `toolbar-with-quick-edit`：
  - `target: toolbar`
  - `config.supportQuickEdit: true`
  - `config.supportExport: true`
  - `editableFields: ["remark"]`
- `table-with-server-filter`：
  - `target: table`
  - `config.entity: Order`
  - `config.columns`: 根据 Order 字段生成列配置初稿
  - `config.batchActions: ["export"]`
- `service-adapter-query`：
  - `config.entity: Order`
  - `config.resourceName: "orders"`
  - `config.operations: ["list","detail","update","export"]`
  - `config.hasPagination: true`
- `zustand-store-with-slices`：
  - `config.storeName: "order"`
  - `config.enableImmer: true`
  - `config.slices`: data/ui 等 slice 描述
- `crud-feature-skeleton`：
  - `config.entity: Order`
  - `config.routePath: "/orders"`
  - `config.enableQuickEdit: true`
  - `config.enableExport: true`
  - `config.enableDetailPage: true`

**节省了什么？**

- 开发者不再需要每次“凭经验”决定：要不要抽 Store、要不要写 Query、要不要写 adapter；  
- LLM 基于 Pattern 文档和 best-practice 约束，把常见 CRUD 场景自动映射到一套标准模式组合；
- 对未知场景，你只要解释业务，LLM 会用 Pattern 帮你选择技术落地路线。

## 5. 阶段三：Pattern → Template/snippet → Plan 草稿

**目标**：基于 Intent + Pattern 配置，生成 `.plans/order-management.plan.json` 草稿——一份可审阅的“出码施工图”。

### 5.1 LLM 需要知道什么？

LLM 角色可以称为「Plan Drafter」，system prompt 中需要挂载：

- 模板与片段索引：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/03-templates.yaml`
- 文件/目录约定：
  - `/Users/yoyo/projj/git.imile.com/ux/best-practice/docs/02-principles-and-architecture/05-file-conventions.md`
- Pattern 的 roles 定义（上一阶段已加载）：
  - 如 service-adapter-query 中的 ServiceModule/AdapterModule/QueryHookModule 等；
  - zustand-store-with-slices 中的 StoreRoot/DataSlice/UISlice 等。

约束：

- 所有目标文件路径必须满足 file-conventions 中的后缀和目录要求；
- `templateId` 必须来自 `03-templates.yaml` 或 IMD 内部的模板 meta，不得随意捏造。

### 5.2 Plan 草稿示例

LLM 输出一个 Plan 草稿（不直接写盘，由 CLI 审核/执行），如：

```json
{
  "featureId": "order-management",
  "actions": [
    {
      "type": "createFile",
      "path": "features/order/services/order.service.ts",
      "patternId": "service-adapter-query",
      "role": "ServiceModule",
      "templateId": "tpl-service-layer",
      "params": {
        "entity": "Order",
        "resourceName": "orders",
        "operations": ["list", "detail", "update", "export"]
      }
    },
    {
      "type": "createFile",
      "path": "features/order/adapters/order.adapter.ts",
      "patternId": "service-adapter-query",
      "role": "AdapterModule",
      "templateId": "tpl-adapter-basic",
      "params": {
        "entity": "Order"
      }
    },
    {
      "type": "createFile",
      "path": "features/order/queries/order.query-keys.ts",
      "patternId": "service-adapter-query",
      "role": "QueryKeysModule",
      "templateId": "tpl-query-keys",
      "params": {
        "resourceName": "orders"
      }
    },
    {
      "type": "createFile",
      "path": "features/order/queries/use-order-list.hook.tsx",
      "patternId": "service-adapter-query",
      "role": "QueryHookModule",
      "templateId": "tpl-query-hook",
      "params": {
        "entity": "Order",
        "operation": "list"
      }
    }
  ]
}
```

类似的 action 会覆盖：

- Zustand Store 聚合根与 slices；
- 特性级测试骨架；
- IMD 里的页面/表格/筛选区/工具栏模板入口等。

**节省了什么？**

- 开发者不必再手动列出“一个完整特性需要哪些文件、在哪些目录、用哪些模板”；
- LLM 基于 Pattern.roles + file-conventions + 模板索引，自动生成一个可以审查的施工计划；
- CLI 可以在此基础上做 schema 校验、冲突检测和 diff 预览。

## 6. 阶段四：执行 Plan + LLM 填 slot + 增量重构

**目标**：在执行 Plan 时，让 CLI/模板负责结构，LLM 只对需要经验判断的“slot”负责；需求变更时，利用 Intent/Plan diff 做增量重构。

### 6.1 执行阶段：结构由模板决定，LLM 只填局部

执行 `imd intent apply order-management` 时：

- CLI 对每个 `createFile` action：
  - 读取对应模板文件（如 `/Users/yoyo/projj/git.imile.com/ux/best-practice/snippets/services/entity.service.ts`）；
  - 拼出固定部分结构（import、函数签名、基本流程）；
  - 对标记为 “由 LLM 填充” 的 slot（列配置、表单字段校验、自定义渲染函数等），调用 LLM；
- LLM 在 slot 内生成代码时必须遵守：
  - `rules-registry` 中的相关规则：`/Users/yoyo/projj/git.imile.com/ux/best-practice/llms/01-rules-registry.yaml`
  - 对应 guide（状态管理、组件设计、错误处理等）。

### 6.2 维护阶段：Intent diff → Plan diff → 局部代码 diff

需求变更示例：

- “导出时需要多过滤一个字段”；  
- “快速编辑里多一个可编辑字段”；  
- “列表上增加新的状态枚举”。

推荐流程：

1. 开发者只更新 Intent：
   - 在 `domain.entities` 或 `domain.apis` 中增加/修改字段；
   - 调整 `patterns.config` 中 filter-bar/table-with-server-filter/toolbar-with-quick-edit 的参数。
2. 调用类似命令：`imd intent plan-diff order-management`：
   - LLM 对比旧 Intent / 新 Intent + 旧 Plan；
   - 输出一个“增量 Plan”：只包含需要新增/修改/删除的 action。
3. CLI 执行增量 Plan：
   - 只对受影响的模板和 slot 生成 patch；
   - LLM 再次只在 slot 内调整局部代码。

**节省了什么？**

- 你不用亲自搜索“这次需求影响了哪些 service/adapter/query/store/组件”；
- LLM 利用结构化 diff（Intent + Plan + Log），做自己最擅长的事：  
  在约束下提出一组三明治式的 patch 建议，而不是随机重写整段代码。

## 7. 渐进落地建议（订单 CRUD 试点）

要验证这套东西是不是“看起来很美”，建议从最小闭环开始：

1. **只做阶段 1 + 2 的 PoC**：
   - 从自然语言需求出发，看 LLM 能否稳定生成高质量的 Intent + patterns.config；
   - 衡量指标：开发者用 LLM 辅助写 Intent 所花的时间 vs 手工写结构 +查规范的时间。

2. **扩展到阶段 3：Plan 草稿**：
   - 让 LLM 在 best-practice 的模板索引与 file-conventions 约束下生成 Plan 草稿；
   - 先不执行，只靠人工审查 Plan 是否合理。

3. **最后才引入阶段 4：模板执行 + slot 填充**：
   - 挑一个订单 CRUD 场景，让 CLI + 模板 + LLM 合作真正生成一套骨架；
   - 对比从零手写订单 CRUD 所需时间与质量。

通过这种渐进方式，可以清楚地看到：

- Intent / Pattern / Template / Plan 这些资产在 LLM 协同下是否真的减少了你的心智开销；
- 哪些 Pattern/模板是“高收益”的，值得继续沉淀；哪些是“噪音”，应该删减或重写。

最终，如果在多个典型场景（CRUD、审批流、工作台等）里都证明“只要把需求讲清楚，LLM + 意图驱动流水线就能帮你稳稳铺出 70% 的骨架”，  
这套平台才配得上被称为“ai 时代下以意图为中心的新一代低代码基座”。

## 8. UI/UX 映射：LLM 在平台界面中的位置

> 本节将上述四个阶段，与平台 UI 中的三个核心工作区对应起来。  
> UI 草图详见：`/Users/yoyo/projj/git.imile.com/ux/imd/docs/specs/intent-driven-ai-coding/v1/06-platform-ui-and-interactions.md`。

### 8.1 Intent Studio：自然语言 → Intent（阶段一）

对应 `06-platform-ui-and-interactions.md` 中的 **Intent Studio** 区域。

- 左侧：Intent 列表（场景列表），右侧：Intent Editor 表单 + YAML 预览。
- LLM 入口：
  - 在“新建场景”向导的每一步（Goals / Scene / Domain / Flows）提供 **[用 AI 补全]** 按钮：
    - 用户先写一两句自然语言说明；
    - LLM 根据当前部分 + 既有上下文补全结构化字段；
    - 结果以可编辑表单和 YAML 预览呈现。
  - 在顶部提供 **[从说明生成 Intent]**：
    - 用户粘贴需求/PRD 摘要；
    - LLM 直接生成一份完整 Intent 草稿，填入编辑器。
- Intent Studio 是“阶段一”的主要 UI 承载地：  
  LLM 在这里主要担任 **Intent Builder**，帮助把自然语言需求转成结构化 YAML。

### 8.2 Intent Studio：推荐与配置 Pattern（阶段二）

同样在 Intent Studio 中，Pattern 相关交互通过“模式推荐”和“模式配置”页签呈现。

- 模式推荐：
  - 在 Intent 概览/场景结构页底部有按钮：
    - `[ 推荐模式 ] [ 手动选择模式 ] [ 查看已绑定模式 ]`
  - 点击“推荐模式”：
    - 前端调用 `/patterns/match`；
    - 后端由 LLM 充当 **Pattern Advisor**，根据当前 Intent 摘要返回候选模式列表及解释。
  - UI 在右侧弹出模式候选侧栏，每个卡片包括：
    - 模式名称 / 摘要 / 适用场景 / 风险提示 / docRefs 链接。
  - 用户勾选模式后，写回 Intent 的 `patterns` 字段。
- 模式配置：
  - 被选中的每个模式，在“模式配置” tab 中有对应的配置表单；
  - 表单结构由 Pattern 的 `paramsSchema` / `uiSchema` 决定；
  - 每个配置块内提供 **[用 AI 推荐]**：
    - LLM 根据 Intent 的 domain 信息（实体字段、接口）和 best-practice 规则，填充默认列集合/筛选字段/操作集等。
- 这一步的 UI 体验可以概括为：
  - 开发者在同一个编辑器里，逐步把“场景结构 → 模式选择 → 模式参数”补齐；
  - LLM 不替代决策，只提供“推荐模式”和“推荐参数”的快捷按钮。

### 8.3 Pattern Studio：沉淀/演进 Pattern（底座准备）

对应 `06-platform-ui-and-interactions.md` 中的 **Pattern Studio**。

- 主要面向：前端架构师 / 平台前端。
- UI 功能：
  - 模式列表视图：显示已有模式（包括新加的 service-adapter-query、zustand-store-with-slices、crud-feature-skeleton 等）；
  - 模式详情：展示 problem/applicability/composition/paramsSchema/uiSchema/docRefs 等；
  - 引用信息：列出当前模式被哪些 Intent / Plan 使用。
- LLM 在 Pattern Studio 中可以提供的能力：
  - 从现有代码反推 Pattern 草稿（比如分析多个类似 CRUD 特性，提取公共 roles + paramsSchema）；
  - 根据 best-practice 文档，给出 paramsSchema / uiSchema 初稿，由架构师审核修改；
  - 提示演进影响（某模式修改后，会影响哪些 Intent/Plan）。
- Pattern Studio 是“静态经验库”的编辑界面，为阶段二和阶段三提供模式定义支撑。

### 8.4 Generation Console（Plans）：Plan 草稿与执行（阶段三 + 四）

对应 `06-platform-ui-and-interactions.md` 中的 **Generation Console / Plans**。

- Plans 列表视图：
  - 按 Intent 分组显示 Plan 历史：`order-management.plan.json` 等；
  - 每条 Plan 显示生成时间、状态（草稿/已执行/部分执行）、说明。
- Plan 详情视图：
  - 上方：Intent 摘要 + 已选模式列表；
  - 中间：action 列表（类似表格形式）：
    - path / type / patternId / templateId / 关键 params 简要；
    - 每行支持查看详细 params 与对应 Pattern / Template Meta；
  - 侧栏：LLM 提供的 Plan 解读：
    - “本次 Plan 将新建 8 个文件，其中服务层 2 个、Query 2 个、Store 2 个、测试文件 2 个”；
    - “不会修改现有文件，风险较低”。
- 交互：
  - 用户可以在 UI 中取消某些 action（例如暂不生成测试），或调整部分 params；
  - 点击 `[ 用 AI 解释本 Plan ]`：LLM 以自然语言解释 Plan 的整体影响和潜在风险。

执行视图：

- 执行 Plan 时，UI 展示实时进度：
  - 每个 action 的执行状态（成功 / 失败 / 跳过）；
  - 失败时显示错误信息和 LLM 的“可能原因解释 + 修复建议”。
- 执行完成后：
  - 提供“查看执行日志 JSON”“在 Git 中对比 diff”等链接；
  - LLM 可以生成执行结果摘要，例如：
    - “本次执行新增 8 个文件，无修改/删除；后续建议补充以下手工逻辑：……”

在这一工作区中，LLM 的主要角色是：

- Plan Drafter：在后端生成 Plan 草稿（阶段三）；
- Plan Interpreter：在前端为开发者解释 Plan 和执行结果（阶段四）。

### 8.5 整体交互链路小结（UI + LLM）

综合来看，整条链路在 UI/UX 层的映射是：

- **Intent Studio**
  - 用户：前端业务开发；
  - LLM 角色：Intent Builder + Pattern Advisor；
  - 关键操作：自然语言 → Intent；Intent → Pattern 选择与配置。
- **Pattern Studio**
  - 用户：前端架构师 / 平台前端；
  - LLM 角色：Pattern Author Assistant；
  - 关键操作：从代码/文档沉淀模式，维护 paramsSchema/uiSchema/docRefs。
- **Generation Console（Plans）**
  - 用户：前端业务开发（偶尔架构师参与审阅）；
  - LLM 角色：Plan Drafter + Plan Interpreter；
  - 关键操作：Pattern → Plan 草稿；Plan 执行结果解读与增量重构建议。

这样的 UI/UX 设计，可以保证：

- 开发者始终在“场景/模式/计划”三个可见视图中工作，不会被 YAML 细节淹没；
- LLM 的能力被包装成具体按钮和侧栏解释，而不是隐形“黑箱决策”；
- Intent / Pattern / Plan 这三类资产既对 LLM 友好（结构化、可解析），也对人类友好（可视化、可审阅）。

