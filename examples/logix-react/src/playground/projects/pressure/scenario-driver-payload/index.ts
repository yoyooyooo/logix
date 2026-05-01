import { definePressureProject } from '../shared'

export const logixReactScenarioDriverPayloadPressureProject = definePressureProject({
  id: 'logix-react.pressure.scenario-driver-payload',
  actionCount: 18,
  initialState: '{ count: 24, label: "scenario-driver-payload" }',
  pressure: {
    id: 'scenario-driver-payload',
    activeInspectorTab: 'Drivers',
    activeBottomTab: 'Scenario',
    dataProfile: {
      drivers: 18,
      scenarioSteps: 24,
      payloadBytes: 8500,
      payloadExamples: 6,
    },
    scrollOwners: [
      'RuntimeInspector.DriverList',
      'RuntimeInspector.DriverPayloadEditor',
      'BottomEvidenceDrawer.ScenarioStepList',
    ],
    stickyRegions: ['DriverToolbar', 'DriverPayloadHeader', 'ScenarioStepList.Header', 'BottomEvidenceDrawer.TabStrip'],
    requiredVisibleRegions: [
      'TopCommandBar',
      'SourceEditor',
      'RuntimeInspector.DriverList',
      'RuntimeInspector.DriverPayloadEditor',
      'BottomEvidenceDrawer.ScenarioStepList',
      'RuntimeInspector.StateSummary',
    ],
    forbiddenOverflow: ['PageBody', 'SourceEditor'],
  },
})
