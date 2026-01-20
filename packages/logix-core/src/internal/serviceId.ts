import type { Context } from 'effect'

/**
 * ServiceId contract (specs/078-module-service-manifest/contracts/service-id.md):
 * - Stable string derived from Context.Tag by priority: tag.key ?? tag.id ?? tag._id
 * - tag.toString() is forbidden as an identity source (diagnostics only).
 */

export type ServiceId = string

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

export const fromTag = (tag: Context.Tag<any, any>): ServiceId | undefined => {
  const anyTag = tag as any
  return asNonEmptyString(anyTag.key) ?? asNonEmptyString(anyTag.id) ?? asNonEmptyString(anyTag._id)
}

export const requireFromTag = (tag: Context.Tag<any, any>, options?: { readonly hint?: string }): ServiceId => {
  const id = fromTag(tag)
  if (id) return id

  const hint =
    options?.hint ??
    'Define the Tag with a stable string key, e.g. `class X extends Context.Tag("my-svc/x")<X, Service>() {}`.'

  throw new Error(`[InvalidServiceId] Tag is missing a stable id (tag.key/tag.id/tag._id).\n${hint}`)
}
