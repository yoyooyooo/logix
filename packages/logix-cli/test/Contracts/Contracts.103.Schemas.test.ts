import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SPEC_103_ROOT = path.resolve(
  __dirname,
  '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/schemas',
)

const loadSchema = async (fileName: string): Promise<any> => {
  const text = await fs.readFile(path.join(SPEC_103_ROOT, fileName), 'utf8')
  return JSON.parse(text)
}

describe('contracts 103 schema loading', () => {
  it('loads command-result/describe/guidance/verify-loop schemas', async () => {
    const commandResult = await loadSchema('command-result.v2.schema.json')
    const extensionManifest = await loadSchema('extension-manifest.v1.schema.json')
    const describeReport = await loadSchema('describe.report.v1.schema.json')
    const verificationChainCatalog = await loadSchema('verification-chain.catalog.v1.schema.json')
    const verifyLoopReport = await loadSchema('verify-loop.report.v1.schema.json')
    const verifyLoopInput = await loadSchema('verify-loop.input.v1.schema.json')
    const scenarioPlaybookInput = await loadSchema('scenario-playbook.input.v1.schema.json')
    const scenarioPlaybookReport = await loadSchema('scenario-playbook.report.v1.schema.json')
    const scenarioVerdict = await loadSchema('scenario.verdict.v1.schema.json')

    expect(commandResult.$id).toContain('command-result.v2.schema.json')
    expect(extensionManifest.$id).toContain('extension-manifest.v1.schema.json')
    expect(describeReport.$id).toContain('describe.report.v1.schema.json')
    expect(verificationChainCatalog.$id).toContain('verification-chain.catalog.v1.schema.json')
    expect(verifyLoopReport.$id).toContain('verify-loop.report.v1.schema.json')
    expect(verifyLoopInput.$id).toContain('verify-loop.input.v1.schema.json')
    expect(scenarioPlaybookInput.$id).toContain('scenario-playbook.input.v1.schema.json')
    expect(scenarioPlaybookReport.$id).toContain('scenario-playbook.report.v1.schema.json')
    expect(scenarioVerdict.$id).toContain('scenario.verdict.v1.schema.json')
  })
})
