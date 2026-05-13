import { describe, expect, it } from 'vitest'

import {
  classifyStaticRoleStatus,
  getInstantiationBoundaryNarrative,
  getNamingBucketNarrative,
  getStaticGovernanceOwner,
  shouldReopenStaticGovernanceTopic,
} from '../../src/internal/platform/staticGovernancePolicy.js'

describe('Static governance policy', () => {
  it('keeps only static roles with identity / validation / diagnostics value', () => {
    expect(classifyStaticRoleStatus('definition-anchor')).toBe('keep')
    expect(classifyStaticRoleStatus('strict-static-profile')).toBe('keep')
    expect(classifyStaticRoleStatus('local-verification-prototype')).toBe('postpone')
    expect(classifyStaticRoleStatus('workflow-public-mainline')).toBe('drop')
  })

  it('pins public instantiation to Program.make / Runtime.make', () => {
    expect(getInstantiationBoundaryNarrative('public-assembly')).toBe('Program.make(Module, config)')
    expect(getInstantiationBoundaryNarrative('public-runtime')).toBe('Runtime.make(Program)')
    expect(getInstantiationBoundaryNarrative('module-def')).toBe('definition-anchor-only')
    expect(getInstantiationBoundaryNarrative('workflow')).toBe('prototype-or-history-only')
  })

  it('separates structure owner from naming bucket owner', () => {
    expect(getNamingBucketNarrative('ModuleDef')).toBe('definition-anchor-only')
    expect(getNamingBucketNarrative('Workflow')).toBe('prototype-or-history-only')
    expect(getNamingBucketNarrative('roots')).toBe('keep-roots-name')

    expect(getStaticGovernanceOwner({ topic: 'ModuleDef', concern: 'structure' })).toBe('platform/02')
    expect(getStaticGovernanceOwner({ topic: 'ModuleDef', concern: 'naming' })).toBe('naming-bucket')
    expect(getStaticGovernanceOwner({ topic: 'Workflow', concern: 'structure' })).toBe('platform/02')
    expect(getStaticGovernanceOwner({ topic: 'Workflow', concern: 'naming' })).toBe('naming-bucket')
  })

  it('only reopens when documented evidence appears', () => {
    expect(shouldReopenStaticGovernanceTopic('static-role-benefit')).toBe(true)
    expect(shouldReopenStaticGovernanceTopic('moduledef-public-anchor')).toBe(true)
    expect(shouldReopenStaticGovernanceTopic('workflow-public-capability')).toBe(true)
    expect(shouldReopenStaticGovernanceTopic('roots-misread-evidence')).toBe(true)

    expect(shouldReopenStaticGovernanceTopic('platform-narrative-only')).toBe(false)
    expect(shouldReopenStaticGovernanceTopic('legacy-term-familiarity')).toBe(false)
    expect(shouldReopenStaticGovernanceTopic('implementation-residue-only')).toBe(false)
  })
})
