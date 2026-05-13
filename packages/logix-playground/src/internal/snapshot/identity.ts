export const stableHash = (input: string): string => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export const makeEnvSeed = (projectId: string, sessionSeed = 'default'): string =>
  `env:${stableHash(`${projectId}:${sessionSeed}`)}`

export const makeRunId = (projectId: string, revision: number, kind: string, seq: number): string =>
  `${projectId}:${kind}:r${revision}:op${seq}`
