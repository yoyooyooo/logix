import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as Core from '../../../src/index.js'
import * as Runtime from '../../../src/Runtime.js'
import * as ControlPlane from '../../../src/ControlPlane.js'
import * as Workbench from '@logixjs/core/repo-internal/workbench-api'

describe('Runtime Workbench public surface guard', () => {
  it('keeps workbench off public root and public runtime/control-plane facades', () => {
    expect('Workbench' in Core).toBe(false)
    expect('workbench' in Runtime).toBe(false)
    expect('devtools' in Runtime).toBe(false)
    expect('inspect' in Runtime).toBe(false)
    expect('playground' in Runtime).toBe(false)
    expect('Workbench' in ControlPlane).toBe(false)
    expect(typeof Workbench.deriveRuntimeWorkbenchProjectionIndex).toBe('function')
  })

  it('blocks repo-internal workbench bridge in publish config', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
      readonly exports: Record<string, unknown>
      readonly publishConfig: { readonly exports: Record<string, unknown> }
    }

    expect(pkg.exports['./repo-internal/workbench-api']).toBe('./src/internal/workbench-api.ts')
    expect(pkg.publishConfig.exports['./repo-internal/workbench-api']).toBeNull()
  })
})
