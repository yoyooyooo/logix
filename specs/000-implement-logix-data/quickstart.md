# Quickstart · 实现 `@logix/data` 字段能力核心包

> 面向实现者的“如何落地本特性”简要指南，聚焦于路径与工序，不替代正式用户文档。

---

## 1. 目标回顾

- 为 Logix 模块中的字段提供统一的能力建模：`Raw / Computed / Source / Link`。  
- 支持在嵌套对象与动态列表项上声明字段能力。  
- 为 DevTools 与平台提供 State Graph 视图与字段能力元信息。  
- 仅依赖 `effect` v3 与 Logix Runtime 核心，不耦合 React/Router/Query 等上层技术。

---

## 2. 初始化包结构

1. 在 monorepo 中创建或补全子包目录：

   ```text
   packages/logix-data/
   ├── src/
   │   ├── index.ts
   │   ├── computed/
   │   ├── source/
   │   ├── link/
   │   └── internal/
   └── test/
       ├── computed.test.ts
       ├── source.test.ts
       └── link.test.ts
   ```

2. 在 `index.ts` 中只暴露概念命名空间：

   - `Computed`：计算字段相关 API。  
   - `Source`：资源字段相关 API（ResourceField 视角）。  
   - `Link`：跨字段/跨模块联动相关 API。  

内部实现细节统一置于 `internal/`，避免其他包直接耦合。

---

## 3. 建模字段与字段能力

1. 在 `internal/` 中定义数据模型（可与 `data-model.md` 对照）：

   - `Field`（字段基本信息：id/path/valueType 等）。  
   - `FieldCapability`（kind/deps/resource/statusModel 等）。  
   - `ResourceMetadata`（resourceKind/identifier/relation/lifecycle）。  
   - `StateGraph` / `GraphNode` / `GraphEdge`（供 DevTools 使用）。  

2. 在 `computed/`、`source/`、`link/` 中实现用于 Schema 层声明的“能力工厂”，例如：

   - 为 Schema 作者提供 `Computed.for(...)` / `Source.field(...)` / `Link.to(...)` 之类的声明式 API。  
   - 这些 API 只返回能力 Blueprint / CapabilityMeta，不直接执行副作用。

---

## 4. 与 Runtime 对接（Helper/Flow 层）

1. 参考 `docs/specs/runtime-logix/core` 中的 Module/Flow 契约，在 `internal/` 下实现：

   - 从模块 State Schema 中扫描能力 Blueprint → 生成 `Field` + `FieldCapability` 集合。  
   - 将 `FieldCapability` 转换为 `($) => Effect` 的 Helper/Flow 组合（例如 Computed 对应的“订阅依赖字段 → distinct → 更新目标字段”流程）。  

2. 保持约束：

   - 不在此层直接执行纯副作用型 Reactive（如埋点）；这些留给通用 Helper 包。  
   - 所有行为最终都能映射到现有 Runtime 支持的 Effect/Flow 形态，不引入第二套运行时。

---

## 5. 提供 State Graph 与能力查询接口

1. 在对外 API 中提供纯数据函数，例如：

   - `makeStateGraph(module): StateGraph`  
   - `diffGraphs(oldGraph, newGraph): StateGraphDiff`

2. 保证：

   - 顶层字段、嵌套字段、列表项字段都能在 State Graph 中被正确建模。  
   - ResourceField（Source 能力）带有资源类型与关系元信息，方便 DevTools 与平台区分不同来源的数据字段。  

3. 如需远程访问，可由上层工具参考 `contracts/openapi.yaml` 自行包装为 HTTP/GraphQL 接口，本包不直接绑定协议。

---

## 5.1 示例：从 Schema 到 State Graph

下面是一个最小的示例，展示如何从 Schema 声明 → 能力扫描 → State Graph 构建：

```ts
import { Computed, Source } from "@logix/data"
import {
  scanModuleSchema,
  type ModuleSchemaDescriptor
} from "@logix/data/src/internal/schema/scan-capabilities"
import { makeStateGraph } from "@logix/data/graph"

const schema: ModuleSchemaDescriptor = {
  moduleId: "UserModule",
  fields: [
    { path: "user.firstName", valueType: "string" },
    { path: "user.lastName", valueType: "string" },
    {
      path: "user.fullName",
      valueType: "string",
      capabilities: [
        Computed.for({
          deps: ["user.firstName", "user.lastName"],
          derive: "concat"
        })
      ]
    },
    {
      path: "user.detail",
      valueType: "object",
      capabilities: [
        Source.field({
          resource: {
            resourceKind: "query",
            identifier: "user/detail"
          }
        })
      ]
    }
  ]
}

// 1）从 Schema 描述扫描出字段与字段能力
const { fields, capabilities } = scanModuleSchema(schema)

// 2）构建 State Graph，供 DevTools 或平台使用
const graph = makeStateGraph({
  moduleId: schema.moduleId,
  fields,
  capabilities
})
```

在实际项目中，`ModuleSchemaDescriptor` 会由 runtime-logix 的 Module API 自动生成，调用方只需要使用 `Computed/Source/Link` 等能力工厂即可。

---

## 6. 验证与回归

1. 基于 spec 中的 User Stories 和 Success Criteria，至少准备两类示例模块：

   - 表单场景：含多个 Computed 字段与 Source 字段、列表项校验。  
   - 列表/查询场景：含动态列表、资源字段与跨模块 Link。  

2. 为上述模块编写测试：

   - 验证字段能力在典型交互下的行为（值更新、状态变化、联动效果）。  
   - 验证 State Graph 输出结构与预期一致（节点/边数量与类型）。  

3. 在完成实现后，至少运行：

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

确保 `@logix/data` 与现有 Runtime/React 包在类型与行为层面无明显冲突。
