import { describe, expect, it } from 'vitest'
import { FORM_DEMO_MATRIX, FORM_DEMO_SECTIONS } from '../src/demos/form/demoMatrix'

describe('examples/logix-react form demo matrix contract', () => {
  it('pins retained form demo routes, labels, sections, and human-readable roles', () => {
    expect(
      FORM_DEMO_MATRIX.map(({ route, label, summary, section, role, narrative }) => ({
        route,
        label,
        summary,
        section,
        role,
        narrative,
      })),
    ).toEqual([
      {
        route: '/form-quick-start',
        label: 'Quick Start Form',
        summary: 'Minimal rule, submit, and selector flow',
        section: 'getting-started',
        role: 'Minimum stable form flow',
        narrative: 'quick-start',
      },
      {
        route: '/form-field-source',
        label: 'Field Source',
        summary: 'Remote facts, submit impact, and row-scoped source',
        section: 'data-source',
        role: 'Remote dependency field',
        narrative: 'field-source',
      },
      {
        route: '/form-field-companion',
        label: 'Field Companion',
        summary: 'Local availability and candidate coordination',
        section: 'local-coordination',
        role: 'Local soft fact coordination',
        narrative: 'field-companion',
      },
      {
        route: '/form-source-query',
        label: 'Query Source Contrast',
        summary: 'Program-level resource snapshot for source comparison',
        section: 'data-source',
        role: 'Query contrast for Form source',
        narrative: 'query-source-contrast',
      },
      {
        route: '/form-field-arrays',
        label: 'Field Arrays',
        summary: 'Row identity, byRowId actions, and cleanup evidence',
        section: 'rows-lifecycle',
        role: 'Form row lifecycle',
        narrative: 'field-arrays',
      },
      {
        route: '/form-advanced-field-behavior',
        label: 'Advanced Field Behavior',
        summary: 'Host selector reads over field-derived state',
        section: 'truth-diagnostics',
        role: 'Selector and diagnostics adjunct',
        narrative: 'advanced-field-behavior',
      },
    ])
  })

  it('pins human-first form navigation sections', () => {
    expect(FORM_DEMO_SECTIONS.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'getting-started', title: 'Getting Started' },
      { id: 'data-source', title: 'Data & Source' },
      { id: 'local-coordination', title: 'Local Coordination' },
      { id: 'rows-lifecycle', title: 'Rows & Lifecycle' },
      { id: 'truth-diagnostics', title: 'Truth & Diagnostics' },
    ])

    for (const section of FORM_DEMO_SECTIONS) {
      expect(FORM_DEMO_MATRIX.some((entry) => entry.section === section.id)).toBe(true)
    }
  })

  it('pins retained form demo mappings back to the SSoT scenario matrix', () => {
    expect(
      FORM_DEMO_MATRIX.map(({ route, scenarioIds, capabilityIds, proofIds, coverageFamilies, ownerLanes }) => ({
        route,
        scenarioIds,
        capabilityIds,
        proofIds,
        coverageFamilies,
        ownerLanes,
      })),
    ).toEqual([
      {
        route: '/form-quick-start',
        scenarioIds: ['SC-A'],
        capabilityIds: ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04', 'CAP-24', 'CAP-25'],
        proofIds: ['PF-01'],
        coverageFamilies: [],
        ownerLanes: ['declaration', 'rule', 'submit', 'host'],
      },
      {
        route: '/form-field-source',
        scenarioIds: ['SC-B', 'SC-D'],
        capabilityIds: [
          'CAP-05',
          'CAP-06',
          'CAP-07',
          'CAP-08',
          'CAP-09',
          'CAP-14',
          'CAP-15',
          'CAP-16',
          'CAP-17',
          'CAP-18',
          'CAP-25',
        ],
        proofIds: ['PF-02', 'PF-04', 'PF-08'],
        coverageFamilies: ['WF1', 'WF4', 'WF5'],
        ownerLanes: ['source', 'submit', 'reason', 'evidence', 'host'],
      },
      {
        route: '/form-field-companion',
        scenarioIds: ['SC-C', 'SC-D'],
        capabilityIds: ['CAP-10', 'CAP-11', 'CAP-12', 'CAP-13', 'CAP-14', 'CAP-15', 'CAP-16', 'CAP-17', 'CAP-18'],
        proofIds: ['PF-03', 'PF-04', 'PF-08'],
        coverageFamilies: ['WF1', 'WF5'],
        ownerLanes: ['companion', 'rule', 'submit', 'host', 'reason'],
      },
      {
        route: '/form-source-query',
        scenarioIds: ['SC-B'],
        capabilityIds: ['CAP-05', 'CAP-06', 'CAP-07', 'CAP-09'],
        proofIds: ['PF-02'],
        coverageFamilies: ['WF1'],
        ownerLanes: ['source', 'host'],
      },
      {
        route: '/form-field-arrays',
        scenarioIds: ['SC-E'],
        capabilityIds: ['CAP-17', 'CAP-19', 'CAP-20', 'CAP-21', 'CAP-22', 'CAP-23', 'CAP-25'],
        proofIds: ['PF-05', 'PF-06', 'PF-08'],
        coverageFamilies: ['WF2', 'WF3', 'WF5'],
        ownerLanes: ['active-shape', 'cleanup', 'host', 'reason', 'evidence'],
      },
      {
        route: '/form-advanced-field-behavior',
        scenarioIds: ['SC-F'],
        capabilityIds: ['CAP-13', 'CAP-17', 'CAP-18', 'CAP-24', 'CAP-25', 'CAP-26'],
        proofIds: ['PF-07', 'PF-08'],
        coverageFamilies: ['WF5'],
        ownerLanes: ['host', 'reason', 'evidence'],
      },
    ])
  })

  it('keeps the example projection closed over the current frozen matrix coordinates', () => {
    const allScenarioIds = new Set(FORM_DEMO_MATRIX.flatMap((entry) => entry.scenarioIds))
    const allCapabilityIds = new Set(FORM_DEMO_MATRIX.flatMap((entry) => entry.capabilityIds))
    const allProofIds = new Set(FORM_DEMO_MATRIX.flatMap((entry) => entry.proofIds))
    const expectedScenarioIds = ['SC-A', 'SC-B', 'SC-C', 'SC-D', 'SC-E', 'SC-F']
    const requiredCapabilityIds = Array.from({ length: 26 }, (_, index) => `CAP-${String(index + 1).padStart(2, '0')}`)

    expect([...allScenarioIds].sort()).toEqual(expectedScenarioIds)
    expect([...allCapabilityIds].sort()).toEqual(requiredCapabilityIds)
    expect([...allProofIds].sort()).toEqual(['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07', 'PF-08'])
  })
})
