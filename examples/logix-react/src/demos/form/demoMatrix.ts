import type { ComponentType } from 'react'
import { FormDemoLayout } from './FormDemoLayout'
import { FormFieldSourceDemoLayout } from './FormFieldSourceDemoLayout'
import { FormCompanionDemoLayout } from './FormCompanionDemoLayout'
import { QuerySearchDemoLayout } from './QuerySearchDemoLayout'
import { FormFieldArraysDemoLayout } from './FormFieldArraysDemoLayout'
import { FieldFormDemoLayout } from './FieldFormDemoLayout'

export type FormDemoSection =
  | 'getting-started'
  | 'data-source'
  | 'local-coordination'
  | 'rows-lifecycle'
  | 'truth-diagnostics'
export type FormScenarioId = 'SC-A' | 'SC-B' | 'SC-C' | 'SC-D' | 'SC-E' | 'SC-F'
export type FormCapabilityId =
  | 'CAP-01'
  | 'CAP-02'
  | 'CAP-03'
  | 'CAP-04'
  | 'CAP-05'
  | 'CAP-06'
  | 'CAP-07'
  | 'CAP-08'
  | 'CAP-09'
  | 'CAP-10'
  | 'CAP-11'
  | 'CAP-12'
  | 'CAP-13'
  | 'CAP-14'
  | 'CAP-15'
  | 'CAP-16'
  | 'CAP-17'
  | 'CAP-18'
  | 'CAP-19'
  | 'CAP-20'
  | 'CAP-21'
  | 'CAP-22'
  | 'CAP-23'
  | 'CAP-24'
  | 'CAP-25'
  | 'CAP-26'
export type FormProofId = 'PF-01' | 'PF-02' | 'PF-03' | 'PF-04' | 'PF-05' | 'PF-06' | 'PF-07' | 'PF-08'
export type FormCoverageFamilyId = 'WF1' | 'WF2' | 'WF3' | 'WF4' | 'WF5' | 'WF6'
export type FormOwnerLane =
  | 'declaration'
  | 'rule'
  | 'submit'
  | 'source'
  | 'companion'
  | 'active-shape'
  | 'cleanup'
  | 'host'
  | 'reason'
  | 'evidence'
export type FormDemoNarrative =
  | 'quick-start'
  | 'field-source'
  | 'field-companion'
  | 'query-source-contrast'
  | 'field-arrays'
  | 'advanced-field-behavior'

export type FormDemoEntry = {
  readonly route: string
  readonly label: string
  readonly summary: string
  readonly section: FormDemoSection
  readonly role: string
  readonly narrative: FormDemoNarrative
  readonly scenarioIds: ReadonlyArray<FormScenarioId>
  readonly capabilityIds: ReadonlyArray<FormCapabilityId>
  readonly proofIds: ReadonlyArray<FormProofId>
  readonly coverageFamilies: ReadonlyArray<FormCoverageFamilyId>
  readonly ownerLanes: ReadonlyArray<FormOwnerLane>
  readonly sourceFiles: ReadonlyArray<string>
  readonly testFiles: ReadonlyArray<string>
  readonly component: ComponentType
}

export const FORM_DEMO_SECTIONS: ReadonlyArray<{
  readonly id: FormDemoSection
  readonly title: string
  readonly activeTone: string
}> = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    activeTone: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
  },
  {
    id: 'data-source',
    title: 'Data & Source',
    activeTone: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20',
  },
  {
    id: 'local-coordination',
    title: 'Local Coordination',
    activeTone: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
  },
  {
    id: 'rows-lifecycle',
    title: 'Rows & Lifecycle',
    activeTone: 'bg-violet-600 text-white shadow-md shadow-violet-600/20',
  },
  {
    id: 'truth-diagnostics',
    title: 'Truth & Diagnostics',
    activeTone: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
  },
] as const

export const FORM_DEMO_MATRIX: ReadonlyArray<FormDemoEntry> = [
  {
    route: '/form-quick-start',
    label: 'Quick Start Form',
    summary: 'Minimal rule, submit, and selector flow',
    section: 'getting-started',
    role: 'Minimum stable form flow',
    narrative: 'quick-start',
    scenarioIds: ['SC-A'],
    capabilityIds: ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04', 'CAP-24', 'CAP-25'],
    proofIds: ['PF-01'],
    coverageFamilies: [],
    ownerLanes: ['declaration', 'rule', 'submit', 'host'],
    sourceFiles: ['examples/logix-react/src/demos/form/FormDemoLayout.tsx'],
    testFiles: ['examples/logix-react/test/frozen-api-shape.contract.test.ts'],
    component: FormDemoLayout,
  },
  {
    route: '/form-field-source',
    label: 'Field Source',
    summary: 'Remote facts, submit impact, and row-scoped source',
    section: 'data-source',
    role: 'Remote dependency field',
    narrative: 'field-source',
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
    sourceFiles: ['examples/logix-react/src/demos/form/FormFieldSourceDemoLayout.tsx'],
    testFiles: [
      'packages/logix-form/test/Form/Form.Source.Authoring.test.ts',
      'packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts',
      'packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts',
    ],
    component: FormFieldSourceDemoLayout,
  },
  {
    route: '/form-field-companion',
    label: 'Field Companion',
    summary: 'Local availability and candidate coordination',
    section: 'local-coordination',
    role: 'Local soft fact coordination',
    narrative: 'field-companion',
    scenarioIds: ['SC-C', 'SC-D'],
    capabilityIds: ['CAP-10', 'CAP-11', 'CAP-12', 'CAP-13', 'CAP-14', 'CAP-15', 'CAP-16', 'CAP-17', 'CAP-18'],
    proofIds: ['PF-03', 'PF-04', 'PF-08'],
    coverageFamilies: ['WF1', 'WF5'],
    ownerLanes: ['companion', 'rule', 'submit', 'host', 'reason'],
    sourceFiles: ['examples/logix-react/src/demos/form/FormCompanionDemoLayout.tsx'],
    testFiles: [
      'packages/logix-form/test/Form/Form.Companion.Authoring.test.ts',
      'packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts',
    ],
    component: FormCompanionDemoLayout,
  },
  {
    route: '/form-source-query',
    label: 'Query Source Contrast',
    summary: 'Program-level resource snapshot for source comparison',
    section: 'data-source',
    role: 'Query contrast for Form source',
    narrative: 'query-source-contrast',
    scenarioIds: ['SC-B'],
    capabilityIds: ['CAP-05', 'CAP-06', 'CAP-07', 'CAP-09'],
    proofIds: ['PF-02'],
    coverageFamilies: ['WF1'],
    ownerLanes: ['source', 'host'],
    sourceFiles: [
      'examples/logix-react/src/demos/form/QuerySearchDemoLayout.tsx',
      'examples/logix-react/src/modules/querySearchDemo.ts',
    ],
    testFiles: ['examples/logix-react/test/module-flows.integration.test.ts'],
    component: QuerySearchDemoLayout,
  },
  {
    route: '/form-field-arrays',
    label: 'Field Arrays',
    summary: 'Row identity, byRowId actions, and cleanup evidence',
    section: 'rows-lifecycle',
    role: 'Form row lifecycle',
    narrative: 'field-arrays',
    scenarioIds: ['SC-E'],
    capabilityIds: ['CAP-17', 'CAP-19', 'CAP-20', 'CAP-21', 'CAP-22', 'CAP-23', 'CAP-25'],
    proofIds: ['PF-05', 'PF-06', 'PF-08'],
    coverageFamilies: ['WF2', 'WF3', 'WF5'],
    ownerLanes: ['active-shape', 'cleanup', 'host', 'reason', 'evidence'],
    sourceFiles: [
      'examples/logix-react/src/demos/form/FormFieldArraysDemoLayout.tsx',
      'examples/logix-react/src/modules/rules-composition-mixed-form.ts',
    ],
    testFiles: [
      'examples/logix-react/test/form-field-arrays-global-instance.integration.test.tsx',
      'packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts',
      'packages/logix-form/test/Form/Form.CleanupReceipt.contract.test.ts',
      'packages/logix-form/test/Form/Form.FieldArray.ExactSurface.test.ts',
    ],
    component: FormFieldArraysDemoLayout,
  },
  {
    route: '/form-advanced-field-behavior',
    label: 'Advanced Field Behavior',
    summary: 'Host selector reads over field-derived state',
    section: 'truth-diagnostics',
    role: 'Selector and diagnostics adjunct',
    narrative: 'advanced-field-behavior',
    scenarioIds: ['SC-F'],
    capabilityIds: ['CAP-13', 'CAP-17', 'CAP-18', 'CAP-24', 'CAP-25', 'CAP-26'],
    proofIds: ['PF-07', 'PF-08'],
    coverageFamilies: ['WF5'],
    ownerLanes: ['host', 'reason', 'evidence'],
    sourceFiles: [
      'examples/logix-react/src/demos/form/FieldFormDemoLayout.tsx',
      'examples/logix-react/src/modules/field-form.ts',
    ],
    testFiles: [
      'packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx',
      'packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx',
      'examples/logix-react/test/use-selector-type-safety.contract.test.ts',
    ],
    component: FieldFormDemoLayout,
  },
] as const
