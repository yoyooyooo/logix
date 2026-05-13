import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(process.cwd(), '../..')
const spec = fs.readFileSync(path.join(repoRoot, 'specs/159-dvtools-internal-workbench-cutover/spec.md'), 'utf8')

const expectedRows = [
  'src/internal/state/model.ts',
  'src/internal/state/compute.ts',
  'src/internal/state/logic.ts',
  'DevtoolsShell',
  'LogixDevtools',
  'LogixIsland',
  'Sidebar',
  'OverviewStrip',
  'OverviewDetails',
  'OperationSummaryBar',
  'EffectOpTimelineView',
  'Timeline',
  'Inspector',
  'FieldGraphView',
  'ConvergePerformancePane',
  'ConvergeTimeline',
  'ConvergeDetailsPanel',
  'SettingsPanel',
  'Time travel controls',
]

describe('159 component disposition freeze', () => {
  it('keeps every current component assigned to one disposition', () => {
    const tableStart = spec.indexOf('## Component Disposition Freeze')
    const tableEnd = spec.indexOf('## Implementation Cutover Plan')
    const dispositionSection = spec.slice(tableStart, tableEnd)

    for (const row of expectedRows) {
      const matches = dispositionSection.match(new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }

    expect(dispositionSection).not.toMatch(/\|\s*(?:or|TBD|candidate)\s*\|/i)
  })
})
