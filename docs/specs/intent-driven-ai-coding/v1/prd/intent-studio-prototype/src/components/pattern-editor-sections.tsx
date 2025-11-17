import type { PatternSpec } from '../types'
import { PatternRolesEditor } from './pattern-roles-editor'
import { PatternParamsEditor } from './pattern-params-editor'

interface Props {
  pattern: PatternSpec
}

export function PatternEditorSections({ pattern }: Props) {
  return (
    <div>
      <div style={{ marginTop: 16 }}>
        <h4>角色定义</h4>
        <PatternRolesEditor patternId={pattern.id} roles={pattern.composition?.roles ?? []} />
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>参数 Schema</h4>
        <PatternParamsEditor patternId={pattern.id} paramsSchema={pattern.paramsSchema as any} />
      </div>
    </div>
  )
}
