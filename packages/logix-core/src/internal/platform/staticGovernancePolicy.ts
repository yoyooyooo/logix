export type StaticRoleStatus = 'keep' | 'postpone' | 'drop'

export type StaticRole =
  | 'definition-anchor'
  | 'strict-static-profile'
  | 'local-verification-prototype'
  | 'workflow-public-mainline'

export type InstantiationBoundary =
  | 'public-assembly'
  | 'public-runtime'
  | 'module-def'
  | 'workflow'

export type NamingTopic = 'ModuleDef' | 'Workflow' | 'roots'
export type StaticGovernanceConcern = 'structure' | 'naming'

export type StaticGovernanceReopenTopic =
  | 'static-role-benefit'
  | 'moduledef-public-anchor'
  | 'workflow-public-capability'
  | 'roots-misread-evidence'
  | 'platform-narrative-only'
  | 'legacy-term-familiarity'
  | 'implementation-residue-only'

export const classifyStaticRoleStatus = (role: StaticRole): StaticRoleStatus => {
  switch (role) {
    case 'definition-anchor':
    case 'strict-static-profile':
      return 'keep'
    case 'local-verification-prototype':
      return 'postpone'
    case 'workflow-public-mainline':
      return 'drop'
  }
}

export const getInstantiationBoundaryNarrative = (boundary: InstantiationBoundary): string => {
  switch (boundary) {
    case 'public-assembly':
      return 'Program.make(Module, config)'
    case 'public-runtime':
      return 'Runtime.make(Program)'
    case 'module-def':
      return 'definition-anchor-only'
    case 'workflow':
      return 'prototype-or-history-only'
  }
}

export const getNamingBucketNarrative = (topic: NamingTopic): string => {
  switch (topic) {
    case 'ModuleDef':
      return 'definition-anchor-only'
    case 'Workflow':
      return 'prototype-or-history-only'
    case 'roots':
      return 'keep-roots-name'
  }
}

export const getStaticGovernanceOwner = (input: {
  readonly topic: NamingTopic
  readonly concern: StaticGovernanceConcern
}): 'platform/02' | 'naming-bucket' => (input.concern === 'structure' ? 'platform/02' : 'naming-bucket')

export const shouldReopenStaticGovernanceTopic = (topic: StaticGovernanceReopenTopic): boolean => {
  switch (topic) {
    case 'static-role-benefit':
    case 'moduledef-public-anchor':
    case 'workflow-public-capability':
    case 'roots-misread-evidence':
      return true
    case 'platform-narrative-only':
    case 'legacy-term-familiarity':
    case 'implementation-residue-only':
      return false
  }
}
