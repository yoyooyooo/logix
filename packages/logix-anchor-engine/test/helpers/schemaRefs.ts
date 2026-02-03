import fs from 'node:fs/promises'
import path from 'node:path'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

const collectRefs = (value: unknown, refs: Set<string>): void => {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs)
    return
  }
  if (typeof value !== 'object') return

  for (const [key, v] of Object.entries(value)) {
    if (key === '$ref' && typeof v === 'string') refs.add(v)
    else collectRefs(v, refs)
  }
}

const resolveRefFile = (ref: string, schemaFilePath: string): string | undefined => {
  if (ref.startsWith('#')) return undefined
  if (ref.startsWith('http://') || ref.startsWith('https://')) return undefined
  const [refPath] = ref.split('#')
  if (!refPath) return undefined
  return path.resolve(path.dirname(schemaFilePath), refPath)
}

export const assertJsonSchemaRefsParseable = async (schemaFilePath: string): Promise<void> => {
  const visited = new Set<string>()
  const queue: string[] = [schemaFilePath]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break
    if (visited.has(current)) continue
    visited.add(current)

    const schema = await readJson(current)
    const refs = new Set<string>()
    collectRefs(schema, refs)

    for (const ref of refs) {
      const next = resolveRefFile(ref, current)
      if (next) queue.push(next)
    }
  }
}

