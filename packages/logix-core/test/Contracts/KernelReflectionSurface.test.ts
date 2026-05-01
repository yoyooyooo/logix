import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const reflectionSurfacePath = resolve(fileURLToPath(new URL('../../src/internal/reflection-api.ts', import.meta.url)))
const controlSurfacePath = resolve(fileURLToPath(new URL('../../src/internal/reflection/controlSurface.ts', import.meta.url)))

describe('Kernel reflection surface', () => {
  it('should not import deleted root observability shells from the repo-internal reflection surface', () => {
    const source = readFileSync(reflectionSurfacePath, 'utf8')

    expect(source.includes('../Observability')).toBe(false)
  })

  it('should not import deleted root observability shells from reflection control-surface helpers', () => {
    const source = readFileSync(controlSurfacePath, 'utf8')

    expect(source.includes('../../Observability')).toBe(false)
  })
})
