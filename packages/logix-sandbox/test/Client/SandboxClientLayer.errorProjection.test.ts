import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('SandboxClientLayer error projection', () => {
  it('keeps sandbox client promise errors as original errors', () => {
    const source = readFileSync(join(process.cwd(), 'src/Service.ts'), 'utf8')

    expect(source).not.toContain('Effect.tryPromise(() => sandboxClient.run')
    expect(source).not.toContain('Effect.tryPromise(() => sandboxClient.compile')
    expect(source).not.toContain('Effect.tryPromise(() => sandboxClient.trial')
    expect(source).toContain('try: () => sandboxClient.run(options)')
    expect(source).toContain('try: () => sandboxClient.compile(code, filename, mockManifest, options)')
    expect(source).toContain('catch: (error) => error')
  })
})
