import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = process.cwd()
const read = (relativePath: string): string => fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')

describe('DVTools default path residue', () => {
  it('does not import old global bands from DevtoolsShell', () => {
    const shell = read('src/internal/ui/shell/DevtoolsShell.tsx')

    expect(shell).not.toContain('../overview/OverviewStrip')
    expect(shell).not.toContain('../overview/OverviewDetails')
    expect(shell).not.toContain('../summary/OperationSummaryBar')
  })

  it('does not keep default time travel state', () => {
    const model = read('src/internal/state/model.ts')

    expect(model).not.toMatch(/\btimeTravel\b/)
    expect(model).not.toMatch(/\benableTimeTravelUI\b/)
  })
})
