import { Schema } from 'effect'
import * as Logix from '@logix/core'

import type { SpecListItem, TaskItem } from '../../api/client'

const ArtifactNameSchema = Schema.Literal('spec.md', 'plan.md', 'tasks.md', 'quickstart.md', 'data-model.md', 'research.md')

const SpecTaskStatsSchema = Schema.Struct({
  total: Schema.Number,
  done: Schema.Number,
  todo: Schema.Number,
})

const SpecListItemSchema: Schema.Schema<SpecListItem> = Schema.Struct({
  id: Schema.String,
  num: Schema.Number,
  title: Schema.String,
  taskStats: Schema.optional(SpecTaskStatsSchema),
})

const TaskItemSchema: Schema.Schema<TaskItem> = Schema.Struct({
  line: Schema.Number,
  checked: Schema.Boolean,
  raw: Schema.String,
  title: Schema.String,
  taskId: Schema.optional(Schema.String),
  parallel: Schema.optional(Schema.Boolean),
  story: Schema.optional(Schema.String),
})

const UserStoryDefSchema = Schema.Struct({
  code: Schema.String,
  index: Schema.Number,
  title: Schema.String,
  line: Schema.Number,
})

const SpecDetailStateSchema = Schema.Struct({
  open: Schema.Boolean,
  specId: Schema.NullOr(Schema.String),
  fileName: ArtifactNameSchema,
  viewMode: Schema.Literal('preview', 'edit'),
  loadingFile: Schema.Boolean,
  fileError: Schema.NullOr(Schema.String),
  content: Schema.String,
  expandedStoryCode: Schema.NullOr(Schema.String),
  pendingScrollToTaskLine: Schema.NullOr(Schema.Number),
  highlightTaskLine: Schema.NullOr(Schema.Number),
  loadingSpec: Schema.Boolean,
  specError: Schema.NullOr(Schema.String),
  specMarkdown: Schema.String,
  artifactExists: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
})

const TaskDetailStateSchema = Schema.Struct({
  open: Schema.Boolean,
  specId: Schema.NullOr(Schema.String),
  taskLine: Schema.NullOr(Schema.Number),
  fileName: ArtifactNameSchema,
  viewMode: Schema.Literal('preview', 'edit'),
  loading: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
  content: Schema.String,
})

const FocusedTaskSchema = Schema.Struct({
  specId: Schema.String,
  line: Schema.Number,
})

const KanbanStateSchema = Schema.Struct({
  hideDoneTasks: Schema.Boolean,
  viewMode: Schema.Literal('task', 'us'),
  viewModeBySpec: Schema.Record({ key: Schema.String, value: Schema.Literal('task', 'us') }),
  refreshSeq: Schema.Number,
  error: Schema.NullOr(Schema.String),
  specs: Schema.Array(SpecListItemSchema),
  tasksBySpec: Schema.Record({ key: Schema.String, value: Schema.Array(TaskItemSchema) }),
  loadingBySpec: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
  storiesBySpec: Schema.Record({ key: Schema.String, value: Schema.Array(UserStoryDefSchema) }),
  loadingStoriesBySpec: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
  specDetail: SpecDetailStateSchema,
  taskDetail: TaskDetailStateSchema,
  focusedTask: Schema.NullOr(FocusedTaskSchema),
})

export type KanbanState = Schema.Schema.Type<typeof KanbanStateSchema>

const KanbanActions = {
  'board/refresh': Schema.Void,
  'board/setHideDone': Schema.Boolean,
  'board/setViewMode': Schema.Literal('task', 'us'),
  'board/setSpecViewMode': Schema.Struct({
    specId: Schema.String,
    mode: Schema.Literal('task', 'us'),
  }),
  'board/clearSpecViewMode': Schema.String,
  'board/toggleTask': Schema.Struct({
    specId: Schema.String,
    line: Schema.Number,
    checked: Schema.Boolean,
  }),

  'specDetail/open': Schema.String,
  'specDetail/close': Schema.Void,
  'specDetail/selectFile': ArtifactNameSchema,
  'specDetail/setViewMode': Schema.Literal('preview', 'edit'),
  'specDetail/setContent': Schema.String,
  'specDetail/save': Schema.Void,
  'specDetail/toggleStory': Schema.String,
  'specDetail/jumpToTask': Schema.Number,
  'specDetail/didScrollToTask': Schema.Number,
  'specDetail/clearHighlight': Schema.Void,

  'taskDetail/open': Schema.Struct({
    specId: Schema.String,
    line: Schema.Number,
  }),
  'taskDetail/close': Schema.Void,
  'taskDetail/selectFile': ArtifactNameSchema,
  'taskDetail/setViewMode': Schema.Literal('preview', 'edit'),
  'taskDetail/setContent': Schema.String,
  'taskDetail/save': Schema.Void,

  'board/focusNext': Schema.Void,
  'board/focusPrev': Schema.Void,
  'board/toggleFocusedTask': Schema.Void,
  'board/openFocusedTask': Schema.Void,
  'board/setFocusedTask': Schema.NullOr(FocusedTaskSchema),
} as const

export type KanbanShape = Logix.Shape<typeof KanbanStateSchema, typeof KanbanActions>

export const KanbanAppDef = Logix.Module.make('SpeckitKanbanApp', {
  state: KanbanStateSchema,
  actions: KanbanActions,
})
