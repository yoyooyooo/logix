import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { type KanbanState } from './kanbanApp.def'
import {
  KanbanEnsureTasksLoadedLogic,
  KanbanFilterLogic,
  KanbanFocusLogic,
  KanbanRefreshLogic,
  KanbanSpecDetailLogic,
  KanbanTaskDetailLogic,
  KanbanToggleTaskLogic,
} from './kanbanApp.logic'
import { KanbanAppDef } from './kanbanApp.def'
import { SpecboardApi } from './service'

const initialState: KanbanState = {
  hideDoneTasks: true,
  viewMode: 'us',
  viewModeBySpec: {},
  refreshSeq: 0,
  error: null,
  specs: [],
  tasksBySpec: {},
  loadingBySpec: {},
  storiesBySpec: {},
  loadingStoriesBySpec: {},
  specDetail: {
    open: false,
    specId: null,
    fileName: 'spec.md',
    viewMode: 'preview',
    loadingFile: false,
    fileError: null,
    content: '',
    expandedStoryCode: null,
    pendingScrollToTaskLine: null,
    pendingScrollToStoryLine: null,
    highlightTaskLine: null,
    loadingSpec: false,
    specError: null,
    specMarkdown: '',
    artifactExists: {},
  },
  taskDetail: {
    open: false,
    specId: null,
    taskLine: null,
    fileName: 'tasks.md',
    viewMode: 'preview',
    loading: false,
    error: null,
    content: '',
  },
  focusedTask: null,
}

export const KanbanAppProgram = Logix.Program.make(KanbanAppDef, {
  initial: initialState as KanbanState,
  logics: [
    KanbanRefreshLogic,
    KanbanFilterLogic,
    KanbanEnsureTasksLoadedLogic,
    KanbanToggleTaskLogic,
    KanbanSpecDetailLogic,
    KanbanTaskDetailLogic,
    KanbanFocusLogic,
  ],
})

export const KanbanAppLayer = RuntimeContracts.getProgramRuntimeBlueprint(KanbanAppProgram)
