import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SCHEMA_ROOT = path.resolve(__dirname, '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/schemas')

describe('contracts 103 scenario-playbook input schema', () => {
  it('loads scenario-playbook.input.v1 schema and keeps strict root fields', async () => {
    const schema = JSON.parse(await fs.readFile(path.join(SCHEMA_ROOT, 'scenario-playbook.input.v1.schema.json'), 'utf8')) as any

    expect(schema.$id).toContain('scenario-playbook.input.v1.schema.json')
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toEqual([
      'schemaVersion',
      'kind',
      'scenarioId',
      'runIdPrefix',
      'context',
      'primitiveChain',
      'actions',
      'assertions',
    ])
    expect(schema.properties?.kind?.const).toBe('ScenarioPlaybookInput')
    expect(schema.properties?.context?.additionalProperties).toBe(false)
    expect(Array.isArray(schema.properties?.primitiveChain?.items?.enum)).toBe(true)
    expect(schema.properties?.primitiveChain?.items?.enum).toContain('describe')
    expect(schema.properties?.primitiveChain?.items?.enum).toContain('verify-loop.run')
    expect(schema.properties?.context?.properties?.timeBudgetMs?.minimum).toBe(1)
    expect(schema.properties?.assertions?.items?.properties?.type?.enum).toContain('step.duration-ms.lte')
    expect(schema.properties?.fixtures?.properties?.adapters?.items?.properties?.kind?.enum).toEqual([
      'inline-json',
      'copy-file',
    ])
  })
})
