import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): string => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('Logic lifecycle text sweep', () => {
  it('keeps active public authoring guidance on $.readyAfter without lifecycle success snippets', () => {
    const activeSources = [
      read('src/internal/runtime/core/BoundApiRuntime.ts'),
      read('src/internal/runtime/core/module.ts'),
      read('../../docs/ssot/runtime/01-public-api-spine.md'),
      read('../../docs/ssot/runtime/03-canonical-authoring.md'),
      read('../../docs/standards/logix-api-next-guardrails.md'),
      read('../../skills/logix-best-practices/references/agent-first-api-generation.md'),
      read('../../examples/logix/src/scenarios/lifecycle-gate.ts'),
      read('../../examples/logix/src/i18n-async-ready.ts'),
      read('../../packages/logix-cli/test/fixtures/MissingServiceProgram.ts'),
      read('../../packages/logix-devtools-react/src/internal/state/logic.ts'),
      read('../../packages/logix-query/src/internal/logics/auto-trigger.ts'),
      read('../../packages/logix-perf-evidence/scripts/011-upgrade-lifecycle.lifecycle-baseline.ts'),
    ].join('\n')

    expect(activeSources).toContain('$.readyAfter')
    expect(activeSources).not.toContain('$.lifecycle.onInitRequired')
    expect(activeSources).not.toContain('$.lifecycle.onStart')
    expect(activeSources).not.toContain('$.lifecycle.onDestroy')
    expect(activeSources).not.toContain('$.lifecycle.onError')
    expect(activeSources).not.toContain('$.lifecycle.onSuspend')
    expect(activeSources).not.toContain('$.lifecycle.onResume')
    expect(activeSources).not.toContain('$.lifecycle.onReset')
    expect(read('src/internal/runtime/core/BoundApiRuntime.ts')).not.toContain('startup:')
    expect(read('src/internal/runtime/core/BoundApiRuntime.ts')).not.toContain('resources:')
    expect(read('src/internal/runtime/core/BoundApiRuntime.ts')).not.toContain('signals:')
  })
})
