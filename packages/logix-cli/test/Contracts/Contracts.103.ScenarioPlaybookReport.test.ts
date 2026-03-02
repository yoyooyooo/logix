import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SCHEMA_ROOT = path.resolve(__dirname, '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/schemas')

describe('contracts 103 scenario-playbook report schema', () => {
  it('loads report/verdict schemas and keeps strict object boundaries', async () => {
    const reportSchema = JSON.parse(
      await fs.readFile(path.join(SCHEMA_ROOT, 'scenario-playbook.report.v1.schema.json'), 'utf8'),
    ) as any
    const verdictSchema = JSON.parse(await fs.readFile(path.join(SCHEMA_ROOT, 'scenario.verdict.v1.schema.json'), 'utf8')) as any

    expect(reportSchema.$id).toContain('scenario-playbook.report.v1.schema.json')
    expect(reportSchema.additionalProperties).toBe(false)
    expect(reportSchema.properties?.summary?.additionalProperties).toBe(false)
    expect(reportSchema.properties?.steps?.items?.properties?.durationMs?.minimum).toBe(0)
    expect(reportSchema.properties?.summary?.properties?.finalVerdict?.enum).toEqual([
      'PASS',
      'FAIL_HARD',
      'FAIL_SOFT',
      'BLOCKED',
      'INFRA_FLAKY',
    ])

    expect(verdictSchema.$id).toContain('scenario.verdict.v1.schema.json')
    expect(verdictSchema.additionalProperties).toBe(false)
    expect(verdictSchema.properties?.decision?.additionalProperties).toBe(false)
    expect(verdictSchema.properties?.decision?.properties?.steps?.items?.additionalProperties).toBe(false)
  })
})
