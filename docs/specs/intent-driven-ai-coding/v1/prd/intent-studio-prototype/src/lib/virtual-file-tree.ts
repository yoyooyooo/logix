import type { PlanSpec } from '../types'

export type FileTree = FileTreeNode[]

export type FileTreeNode =
  | { type: 'dir'; name: string; children: FileTree }
  | { type: 'file'; name: string; meta?: { template?: string; patternId?: string } }

const ensureDir = (children: FileTree, segment: string) => {
  let dir = children.find((child) => child.type === 'dir' && child.name === segment) as
    | FileTreeNode
    | undefined
  if (!dir) {
    dir = { type: 'dir', name: segment, children: [] }
    children.push(dir)
  }
  return dir
}

export function buildFileTree(plan?: PlanSpec): FileTree {
  if (!plan) return []
  const root: FileTree = []

  for (const action of plan.actions) {
    const segments = action.path.split('/')
    let cursor = root

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1
      if (isLast) {
        cursor.push({
          type: 'file',
          name: segment,
          meta: { template: action.template, patternId: action.patternId },
        })
      } else {
        const dir = ensureDir(cursor, segment) as { type: 'dir'; name: string; children: FileTree }
        cursor = dir.children
      }
    })
  }

  return root
}
