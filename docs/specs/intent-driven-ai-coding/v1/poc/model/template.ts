// 模板元数据：把模式中的“角色”映射到具体文件路径模式。

export interface TemplateRoleMapping {
  roleId: string
  files: string[] // 带有占位符的路径，例如 src/features/__FEATURE__/components/__ENTITY__-table.tsx
}

export interface TemplateMeta {
  id: string
  patternId: string
  name?: string
  implements: TemplateRoleMapping[]
  // 可扩展：支持哪些技术栈 / UI 库、是否稳定等
}

export interface TemplateRepo {
  getByPattern(patternId: string): Promise<TemplateMeta[]>
}

