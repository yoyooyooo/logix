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

export const KanbanAppModule = KanbanAppDef.implement<SpecboardApi>({
  initial: initialState,
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

export const KanbanAppImpl = KanbanAppModule.impl
