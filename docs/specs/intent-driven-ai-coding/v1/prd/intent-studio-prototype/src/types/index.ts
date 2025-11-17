export interface SceneRegion {
  id: string
  label: string
  role: string
}

export interface SceneLayout {
  regions?: SceneRegion[]
}

export interface SceneFlowEdge {
  from: string
  to: string
  action: string
}

export interface RuntimeFlowStep {
  call: string
  as?: string
  params?: Record<string, unknown>
}

export interface RuntimeFlow {
  id: string
  trigger?: {
    element: string
    event: string
  }
  pipeline: RuntimeFlowStep[]
}

export interface IntentPatternConfig {
  id: string
  target?: string
  config: Record<string, unknown>
}

export interface IntentEntityField {
  name: string
  type: string
  values?: string[]
}

export interface IntentEntity {
  name: string
  fields: IntentEntityField[]
}

export interface IntentApiParam {
  name: string
  type: string
  optional?: boolean
}

export interface IntentApi {
  name: string
  path: string
  method: string
  query?: IntentApiParam[]
  body?: IntentApiParam[]
  returns?: string
}

export interface IntentDomain {
  entities: IntentEntity[]
  apis: IntentApi[]
}

export interface IntentScene {
  type: string
  layout?: SceneLayout
  actors?: { role: string; description: string }[]
  flows?: SceneFlowEdge[]
}

export interface IntentSpec {
  id: string
  title: string
  description: string
  goals: string[]
  scene: IntentScene
  runtimeFlows?: RuntimeFlow[]
  patterns: IntentPatternConfig[]
  domain: IntentDomain
  openQuestions?: string[]
  autoFill?: string[]
}

export interface PatternRole {
  id: string
  label: string
  description: string
  provides?: string | string[]
  requires?: string[]
}

export interface PatternSpec {
  id: string
  name: string
  version: string
  status: string
  summary: string
  composition?: {
    roles: PatternRole[]
  }
  paramsSchema?: Record<string, unknown>
  uiSchema?: Record<string, unknown>
  runtimeBindings?: Record<string, { component?: string; service?: string }>
}

export interface TemplatePatternImpl {
  role: string
  impl: string
  path: string
  optional?: boolean
}

export interface TemplatePatternBinding {
  patternId: string
  implements: TemplatePatternImpl[]
}

export interface TemplateSpec {
  id: string
  name: string
  version: string
  status: string
  description: string
  runtimeBindings?: Record<string, unknown>
  patterns: TemplatePatternBinding[]
  params: Record<string, { desc: string; required?: boolean }>
}

export interface PlanAction {
  type: string
  path: string
  template: string
  patternId: string
  params: Record<string, unknown>
}

export interface PlanSpec {
  intentId: string
  version: string
  actions: PlanAction[]
}
