import { definePressureProject } from '../shared'

export const logixReactActionDensePressureProject = definePressureProject({
  id: 'logix-react.pressure.action-dense',
  actionCount: 74,
  initialState: '{ count: 74, label: "action-dense" }',
  pressure: {
    id: 'action-dense',
    activeInspectorTab: 'Actions',
    activeBottomTab: 'Console',
    dataProfile: {
      actions: 74,
      actionGroups: 9,
      stateNodes: 18,
      consoleRows: 24,
    },
    scrollOwners: ['RuntimeInspector.ActionsList'],
    stickyRegions: ['RuntimeInspector.StateSummary', 'RuntimeInspector.ActionsToolbar', 'BottomEvidenceDrawer.TabStrip'],
    requiredVisibleRegions: [
      'TopCommandBar',
      'FilesPanel',
      'SourceEditor',
      'RuntimeInspector.StateSummary',
      'RuntimeInspector.ActionsList',
      'BottomEvidenceDrawer',
    ],
    forbiddenOverflow: ['PageBody', 'BottomEvidenceDrawer'],
  },
})
