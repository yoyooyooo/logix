import { PatternRuntimeBinds } from './pattern-runtime-binds'
import { PatternUiSchemaEditor } from './pattern-ui-schema-editor'
import type { PatternSpec } from '../types'

interface Props {
  pattern: PatternSpec
}

export function PatternRuntimeSection({ pattern }: Props) {
  return (
    <div className="split-panel" style={{ marginTop: 16 }}>
      <div>
        <h4>UI Schema（可视化配置）</h4>
        <PatternUiSchemaEditor patternId={pattern.id} uiSchema={pattern.uiSchema as any} />
      </div>
      <div>
        <h4>Runtime Bindings（组件/服务）</h4>
        <PatternRuntimeBinds patternId={pattern.id} runtimeBindings={pattern.runtimeBindings as any} />
      </div>
    </div>
  )
}
