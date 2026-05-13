import { definePressureProject } from '../shared'

export const logixReactStateLargePressureProject = definePressureProject({
  id: 'logix-react.pressure.state-large',
  actionCount: 12,
  initialState: '{ count: 420, label: "state-large" }',
  pressure: {
    id: 'state-large',
    activeInspectorTab: 'Actions',
    activeBottomTab: 'Snapshot',
    dataProfile: {
      stateNodes: 420,
      maxDepth: 9,
      expandedNodes: 120,
      actions: 12,
    },
    scrollOwners: ['RuntimeInspector.StateTree'],
    stickyRegions: [
      'RuntimeInspector.OperationSummary',
      'RuntimeInspector.ActionsSummary',
      'BottomEvidenceDrawer.TabStrip',
    ],
    requiredVisibleRegions: [
      'TopCommandBar',
      'FilesPanel',
      'SourceEditor',
      'RuntimeInspector.OperationSummary',
      'RuntimeInspector.StateTree',
      'RuntimeInspector.ActionsSummary',
      'BottomEvidenceDrawer',
    ],
    forbiddenOverflow: ['PageBody', 'SourceEditor'],
  },
})
