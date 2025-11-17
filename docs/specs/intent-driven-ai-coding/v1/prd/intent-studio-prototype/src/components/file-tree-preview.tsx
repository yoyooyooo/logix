import { buildFileTree } from '../lib/virtual-file-tree'
import type { PlanSpec } from '../types'

interface Props {
  plan?: PlanSpec
}

export function FileTreePreview({ plan }: Props) {
  const tree = buildFileTree(plan)

  const renderNode = (node: ReturnType<typeof buildFileTree>[number], depth = 0) => {
    if (node.type === 'dir') {
      return (
        <div key={`${node.name}-${depth}`} className="file-node" style={{ marginLeft: depth * 12 }}>
          📁 {node.name}
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )
    }
    return (
      <div key={`${node.name}-${depth}`} className="file-node" style={{ marginLeft: depth * 12 }}>
        📄 {node.name}
        <span style={{ color: '#9ca3af', marginLeft: 6 }}>
          {node.meta?.patternId ? `pattern: ${node.meta.patternId}` : ''}
          {node.meta?.template ? ` · tpl: ${node.meta.template}` : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="file-tree">
      {tree.length === 0 ? <div>暂无 Plan 产物</div> : tree.map((node) => renderNode(node))}
    </div>
  )
}
