import * as Logix from '@logixjs/core'

type EntryRef = Logix.Reflection.EntryControlSurfaceEntryRef

export type WorkflowSurfaceItem = Logix.Reflection.EntryWorkflowSurfaceItem

export type ControlSurfaceManifest = Logix.Reflection.EntryControlSurfaceManifest

export type ControlSurfaceProjection = Logix.Reflection.EntryControlSurfaceProjection

export const projectEntryControlSurface = (entry: EntryRef): ControlSurfaceProjection =>
  Logix.Reflection.projectControlSurfaceFromEntryRef(entry)

export const makeWorkflowSurfaces = (entry: EntryRef): ReadonlyArray<WorkflowSurfaceItem> =>
  projectEntryControlSurface(entry).workflowSurfaces

export const makeControlSurfaceManifest = (entry: EntryRef): ControlSurfaceManifest =>
  projectEntryControlSurface(entry).manifest
