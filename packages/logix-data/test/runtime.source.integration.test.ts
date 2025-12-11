import { describe, it, expect } from "vitest"
import { Source } from "../src/source/schema.js"
import {
  scanModuleSchema,
  type ModuleSchemaDescriptor
} from "../src/internal/schema/scan-capabilities.js"
import { buildSourcePlan } from "../src/internal/runtime/attach-source.js"

describe("runtime integration - source capabilities", () => {
  it("builds source runtime plan from schema descriptors", () => {
    const schema: ModuleSchemaDescriptor = {
      moduleId: "UserModule",
      fields: [
        {
          path: "user.detail",
          valueType: "object",
          capabilities: [
            Source.field({
              resource: {
                resourceKind: "query",
                identifier: "user/detail"
              },
              statusModel: { mode: "inline" }
            })
          ]
        }
      ]
    }

    const { capabilities } = scanModuleSchema(schema)
    const plan = buildSourcePlan(capabilities)

    expect(plan).toHaveLength(1)
    expect(plan[0].fieldId).toBe("user.detail")
    expect(plan[0].resource?.resourceKind).toBe("query")
    expect(plan[0].resource?.identifier).toBe("user/detail")
  })

  it("handles missing resource metadata in a Source capability", () => {
    const schema: ModuleSchemaDescriptor = {
      moduleId: "UserModule",
      fields: [
        {
          path: "user.fallbackDetail",
          valueType: "object",
          // 模拟配置缺失 resource 的 Source 字段
          capabilities: [
            Source.field({
              // 故意缺失 resource，用于验证运行时能识别并回传 undefined
            } as any)
          ]
        }
      ]
    }

    const { capabilities } = scanModuleSchema(schema)
    const plan = buildSourcePlan(capabilities)

    expect(plan).toHaveLength(1)
    // 当 resource 缺失时，运行时计划中应暴露为 undefined，便于上层做诊断或降级处理。
    expect(plan[0].resource).toBeUndefined()
  })
})
