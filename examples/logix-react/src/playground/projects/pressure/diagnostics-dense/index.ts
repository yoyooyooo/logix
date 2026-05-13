import { definePressureProject } from '../shared'

export const logixReactDiagnosticsDensePressureProject = definePressureProject({
  id: 'logix-react.pressure.diagnostics-dense',
  actionCount: 8,
  initialState: '{ count: 64, label: "diagnostics-dense" }',
  pressure: {
    id: 'diagnostics-dense',
    activeInspectorTab: 'Diagnostics',
    activeBottomTab: 'Diagnostics',
    dataProfile: {
      realAuthorities: 2,
      projectedReportFields: 5,
      minimumRowsAfterCheckTrial: 2,
    },
    scrollOwners: ['BottomEvidenceDrawer.DiagnosticsTable', 'RuntimeInspector.DiagnosticsSummary'],
    stickyRegions: ['DiagnosticsSummary.Counters', 'DiagnosticsTable.Header', 'BottomEvidenceDrawer.TabStrip'],
    requiredVisibleRegions: [
      'TopCommandBar',
      'SourceEditor',
      'RuntimeInspector.DiagnosticsSummary',
      'BottomEvidenceDrawer.DiagnosticsTable',
      'RunCheckTrialStatus',
    ],
    forbiddenOverflow: ['PageBody', 'SourceEditor'],
  },
})
