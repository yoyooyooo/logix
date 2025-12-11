import type { Field } from "../model/field.js"
import type { FieldCapability, FieldCapabilityKind } from "../model/capability.js"
import type {
  CapabilityBlueprint,
  CapabilityScanResult
} from "./blueprint.js"
import type { ResourceMetadata } from "../model/resource.js"

/**
 * 描述一个字段在 Schema 层的结构与能力 Blueprint。
 * 实际的 Schema 类型（effect Schema / runtime-logix ModuleShape）可以在
 * 自己的适配层先转换成这个描述，再交给 @logix/data 扫描。
 */
export interface FieldSchemaDescriptor {
  readonly path: string
  readonly valueType: string
  readonly displayName?: string
  readonly capabilities?: ReadonlyArray<CapabilityBlueprint>
}

export interface ModuleSchemaDescriptor {
  readonly moduleId: string
  readonly fields: ReadonlyArray<FieldSchemaDescriptor>
}

const toPathSegments = (path: string): ReadonlyArray<string> =>
  path.split(".").filter(Boolean)

/**
 * 从模块 Schema 描述中提取 Field 与 FieldCapability 集合。
 */
export const scanModuleSchema = (schema: ModuleSchemaDescriptor): CapabilityScanResult => {
  const fields: Field[] = []
  const capabilities: FieldCapability[] = []

  for (const fieldDesc of schema.fields) {
    const fieldId = fieldDesc.path

    const field: Field = {
      id: fieldId,
      path: fieldDesc.path,
      pathSegments: toPathSegments(fieldDesc.path),
      valueType: fieldDesc.valueType,
      displayName: fieldDesc.displayName
    }

    fields.push(field)

    const blueprints = fieldDesc.capabilities ?? []
    for (const blueprint of blueprints) {
      const kind = blueprint.kind as FieldCapabilityKind

      const capability: FieldCapability = {
        fieldId,
        kind,
        // deps / direction / resource / statusModel 等具体解释由上层在 options 中约定；
        // 此处只做浅透传，不强行解析结构。
        deps: (blueprint.options?.deps as ReadonlyArray<string> | undefined) ?? undefined,
        direction: blueprint.options?.direction as "one-way" | "two-way" | undefined,
        resource: blueprint.options?.resource as ResourceMetadata | undefined,
        statusModel: blueprint.options?.statusModel as Record<string, unknown> | undefined,
        constraints: blueprint.options?.constraints as Record<string, unknown> | undefined
      }

      capabilities.push(capability)
    }
  }

  return { fields, capabilities }
}
