import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const targetFiles = [
  'src/demos/TaskRunnerDemoLayout.tsx',
  'src/demos/GlobalRuntimeLayout.tsx',
  'src/demos/AppDemoLayout.tsx',
  'src/demos/AsyncLocalModuleLayout.tsx',
  'src/demos/CounterWithProfileDemo.tsx',
  'src/demos/DiShowcaseLayout.tsx',
  'src/demos/FractalRuntimeLayout.tsx',
  'src/demos/I18nDemoLayout.tsx',
  'src/demos/LayerOverrideDemoLayout.tsx',
  'src/demos/LocalModuleLayout.tsx',
  'src/demos/SessionModuleLayout.tsx',
  'src/demos/SuspenseModuleLayout.tsx',
  'src/demos/form/FormDemoLayout.tsx',
  'src/demos/form/FieldFormDemoLayout.tsx',
  'src/demos/form/FormCompanionDemoLayout.tsx',
  'src/demos/form/FormFieldArraysDemoLayout.tsx',
  'src/demos/form/FormFieldSourceDemoLayout.tsx',
  'src/modules/querySearchDemo.ts',
]

describe('example HMR lifecycle dogfood sweep', () => {
  it('keeps covered runtime demos on normal authoring and host-carrier lifecycle support', () => {
    for (const file of targetFiles) {
      const source = readFileSync(resolve(root, file), 'utf8')
      expect(source).not.toContain('createExampleRuntimeOwner')
      expect(source).not.toContain('import.meta.hot.dispose')
    }
  })

  it('enables the dev lifecycle carrier once at the example host boundary', () => {
    const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
    const vitestConfig = readFileSync(resolve(root, 'vitest.config.ts'), 'utf8')
    const vitestSetup = readFileSync(resolve(root, 'test/setup/logix-dev-lifecycle.ts'), 'utf8')

    expect(viteConfig).toContain('logixReactDevLifecycle()')
    expect(vitestConfig).toContain('test/setup/logix-dev-lifecycle.ts')
    expect(vitestSetup).toContain('installLogixDevLifecycleForVitest()')
  })

  it('keeps only interaction-scoped runtime factories outside module-level owner sweep', () => {
    const source = readFileSync(resolve(root, 'src/demos/PerfTuningLabLayout.tsx'), 'utf8')
    expect(source).toContain('const runtime = Logix.Runtime.make(program')
    expect(source).not.toContain('import.meta.hot.dispose')
  })
})
