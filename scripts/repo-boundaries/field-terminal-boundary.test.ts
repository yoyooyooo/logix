import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Repo-wide boundary guard:
// keep canonical examples and operational docs aligned with the terminal field surface.

const guardedFiles = [
  'examples/logix-react/src/modules/counter-with-profile.ts',
  'examples/logix-react/src/modules/field-form.ts',
  'examples/logix-react/src/modules/complex-field-form.ts',
  'examples/logix-react/src/modules/fields-setup-declare.ts',
  'examples/logix/src/patterns/field-reuse.ts',
  'examples/logix/src/scenarios/trial-run-evidence.ts',
  'examples/logix/src/scenarios/external-store-tick.ts',
  'examples/logix/src/scenarios/ir/reflectStaticIr.ts',
  'examples/logix-react/src/demos/CounterWithProfileDemo.tsx',
  'examples/logix-react/src/demos/TrialRunEvidenceDemo.tsx',
  'examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx',
  'examples/logix-react/src/demos/form/FormFieldArraysDemoLayout.tsx',
  'examples/logix-react/src/App.tsx',
  'examples/logix-react/src/demos/PerfTuningLabLayout.tsx',
  'apps/docs/content/docs/guide/learn/query.md',
  'apps/docs/content/docs/guide/learn/query.cn.md',
  'apps/docs/content/docs/guide/advanced/performance-and-optimization.md',
  'apps/docs/content/docs/guide/advanced/performance-and-optimization.cn.md',
  'apps/docs/content/docs/guide/advanced/field-convergence-policy.md',
  'apps/docs/content/docs/guide/advanced/field-convergence-policy.cn.md',
  'apps/docs/content/docs/guide/learn/escape-hatches/task-runner.md',
  'apps/docs/content/docs/guide/learn/escape-hatches/task-runner.cn.md',
  'apps/docs/content/docs/form/derived.md',
  'apps/docs/content/docs/form/derived.cn.md',
  'apps/docs/content/docs/form/when-to-use.md',
  'apps/docs/content/docs/form/field-arrays.cn.md',
  'apps/docs/content/docs/guide/essentials/tick-and-flush.cn.md',
  'apps/docs/content/docs/faq.cn.md',
] as const

const bannedPattern =
  /FieldKernel|FieldRuntime|@logixjs\/query\/Fields|trait converge|trait density|trait\.run|list trait|declarative trait rules|trait behavior|trait-level|traitId|z\.link\(|fieldLink\(/i

describe('field terminal boundary inventory', () => {
  it('keeps canonical examples and operational docs free of retired field families and trait wording', () => {
    for (const file of guardedFiles) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(bannedPattern)
    }
  })
})
