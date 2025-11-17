import type { ProcessIdentity, ProcessInstanceIdentity, ProcessScope } from './protocol.js'

export type ProcessScopeKey = string

export const scopeKeyFromScope = (scope: ProcessScope): ProcessScopeKey => {
  switch (scope.type) {
    case 'app':
      return `app:${scope.appId}`
    case 'moduleInstance':
      return `moduleInstance:${scope.moduleId}::${scope.instanceId}`
    case 'uiSubtree':
      return `uiSubtree:${scope.subtreeId}`
  }
}

export const installationKeyFromIdentity = (identity: ProcessIdentity): string =>
  `${identity.processId}@@${scopeKeyFromScope(identity.scope)}`

export const processInstanceIdFromIdentity = (identity: ProcessInstanceIdentity): string => {
  const scopeKey = scopeKeyFromScope(identity.identity.scope)
  return `process:${identity.identity.processId}::${scopeKey}::r${identity.runSeq}`
}
