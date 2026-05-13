import { describe, expect, it } from 'vitest'

import { assertArtifactLinks } from '../../src/internal/result.js'

describe('CLI artifact key namespace', () => {
  it('requires repair hints to link artifacts by artifacts[].outputKey only', () => {
    const artifacts = [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', ok: true }] as const
    expect(() => assertArtifactLinks(artifacts, ['checkReport'])).not.toThrow()
    expect(() => assertArtifactLinks(artifacts, ['artifact://checkReport'])).toThrow(/outputKey/)
  })
})
