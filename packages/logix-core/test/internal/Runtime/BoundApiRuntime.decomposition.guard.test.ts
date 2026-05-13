import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('BoundApiRuntime decomposition guard', () => {
  it('keeps helper ownership outside the BoundApiRuntime coordinator', () => {
    const coordinator = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.ts', import.meta.url),
      'utf8',
    )
    const readiness = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.readiness.ts', import.meta.url),
      'utf8',
    )
    const directStateWrite = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.directStateWrite.ts', import.meta.url),
      'utf8',
    )
    const logicBuilder = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.logicBuilder.ts', import.meta.url),
      'utf8',
    )
    const facade = readFileSync(
      new URL('../../../src/internal/runtime/core/BoundApiRuntime.facade.ts', import.meta.url),
      'utf8',
    )

    expect(coordinator).toContain("from './BoundApiRuntime.readiness.js'")
    expect(coordinator).toContain('Readiness.makeReadyAfter')
    expect(coordinator).not.toContain('registerInitRequired(eff as any')
    expect(readiness).toContain('makeReadyAfter')
    expect(readiness).toContain('registerInitRequired')
    expect(coordinator).toContain("from './BoundApiRuntime.directStateWrite.js'")
    expect(coordinator).toContain("from './BoundApiRuntime.logicBuilder.js'")
    expect(coordinator).toContain("from './BoundApiRuntime.facade.js'")
    expect(coordinator).not.toContain("Symbol.for('logix.directStateWriteEffect')")
    expect(coordinator).not.toContain('const LogicBuilderFactory')
    expect(coordinator).not.toContain('const dispatcherCache = new Map')
    expect(directStateWrite).toContain("Symbol.for('logix.directStateWriteEffect')")
    expect(logicBuilder).toContain('makeLogicBuilderFactory')
    expect(logicBuilder).toContain('registerActionStateWriteback')
    expect(facade).toContain('makeDispatchers')
    expect(facade).toContain('buildModuleHandle')
  })
})
