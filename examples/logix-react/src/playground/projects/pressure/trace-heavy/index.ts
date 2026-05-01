import { definePressureProject } from '../shared'

export const logixReactTraceHeavyPressureProject = definePressureProject({
  id: 'logix-react.pressure.trace-heavy',
  actionCount: 16,
  initialState: '{ count: 1200, label: "trace-heavy" }',
  pressure: {
    id: 'trace-heavy',
    activeInspectorTab: 'Actions',
    activeBottomTab: 'Trace',
    dataProfile: {
      traceEvents: 1200,
      traceColumns: 9,
      actions: 16,
      stateNodes: 60,
    },
    scrollOwners: ['BottomEvidenceDrawer.TraceTable'],
    stickyRegions: ['BottomEvidenceDrawer.TabStrip', 'TraceTable.Header', 'RuntimeInspector.StateSummary'],
    requiredVisibleRegions: [
      'TopCommandBar',
      'FilesPanel',
      'SourceEditor',
      'RuntimeInspector',
      'BottomEvidenceDrawer.TraceTable',
    ],
    forbiddenOverflow: ['PageBody', 'RuntimeInspector'],
  },
})
