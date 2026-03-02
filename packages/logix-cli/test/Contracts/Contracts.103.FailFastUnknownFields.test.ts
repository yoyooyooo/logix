import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SCHEMAS_ROOT = path.resolve(__dirname, '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/schemas')

const loadSchema = async (fileName: string): Promise<any> => {
  const text = await fs.readFile(path.join(SCHEMAS_ROOT, fileName), 'utf8')
  return JSON.parse(text)
}

const allowsUnknownRootField = (schema: any, field: string): boolean => {
  const properties = schema?.properties ?? {}
  const explicitlyDefined = Object.prototype.hasOwnProperty.call(properties, field)
  if (explicitlyDefined) return true
  return schema?.additionalProperties !== false
}

describe('contracts 103 fail-fast unknown fields', () => {
  it('rejects unknown root fields for command-result and extension-manifest', async () => {
    const commandResult = await loadSchema('command-result.v2.schema.json')
    const extensionManifest = await loadSchema('extension-manifest.v1.schema.json')

    expect(commandResult.additionalProperties).toBe(false)
    expect(extensionManifest.additionalProperties).toBe(false)

    expect(allowsUnknownRootField(commandResult, '__unknown__')).toBe(false)
    expect(allowsUnknownRootField(extensionManifest, '__unknown__')).toBe(false)
  })

  it('keeps extension sub-objects in strict mode (runtime/capabilities/limits)', async () => {
    const extensionManifest = await loadSchema('extension-manifest.v1.schema.json')
    const defs = extensionManifest.$defs ?? {}

    expect(defs.runtime?.additionalProperties).toBe(false)
    expect(defs.capabilities?.additionalProperties).toBe(false)
    expect(defs.limits?.additionalProperties).toBe(false)
  })
})
