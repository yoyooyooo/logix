import { describe, it, expect } from '@effect/vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readJson = (url: URL): any => JSON.parse(readFileSync(url, 'utf8'))

const collectRefs = (value: unknown, out: string[] = []): string[] => {
  if (!value || typeof value !== 'object') {
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, out)
    }
    return out
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === '$ref' && typeof v === 'string') {
      out.push(v)
      continue
    }
    collectRefs(v, out)
  }
  return out
}

describe('contracts (012): process contracts', () => {
  it('parses all schemas and keeps title/$ref/enum aligned', () => {
    const schemasDirUrl = new URL('../../../../specs/012-program-api/contracts/schemas/', import.meta.url)

    const expectedTitles: Record<string, string> = {
      'error-summary.schema.json': 'SerializableErrorSummary',
      'process-installation.schema.json': 'ProcessInstallation',
      'process-concurrency-policy.schema.json': 'ProcessConcurrencyPolicy',
      'process-instance-identity.schema.json': 'ProcessInstanceIdentity',
      'process-control-request.schema.json': 'ProcessControlRequest',
      'process-instance-status.schema.json': 'ProcessInstanceStatus',
      'process-definition.schema.json': 'ProcessDefinition',
      'process-platform-event.schema.json': 'ProcessPlatformEvent',
      'process-error-policy.schema.json': 'ProcessErrorPolicy',
      'process-scope.schema.json': 'ProcessScope',
      'process-event.schema.json': 'ProcessEvent',
      'process-trigger-spec.schema.json': 'ProcessTriggerSpec',
      'process-identity.schema.json': 'ProcessIdentity',
      'process-trigger.schema.json': 'ProcessTrigger',
    }

    const schemaFiles = readdirSync(fileURLToPath(schemasDirUrl)).filter((f) => f.endsWith('.schema.json'))
    expect(schemaFiles.sort()).toEqual(Object.keys(expectedTitles).sort())

    const schemas = new Map<string, any>()
    for (const file of schemaFiles) {
      const url = new URL(file, schemasDirUrl)
      const schema = readJson(url)
      schemas.set(file, { schema, url })

      expect(String(schema.$schema)).toContain('json-schema')
      expect(schema.title).toBe(expectedTitles[file])

      const refs = collectRefs(schema)
      for (const ref of refs) {
        if (ref.startsWith('http://') || ref.startsWith('https://')) {
          continue
        }
        const targetUrl = new URL(ref, url)
        expect(existsSync(fileURLToPath(targetUrl))).toBe(true)
      }
    }

    const processDefinition = schemas.get('process-definition.schema.json')!.schema
    expect(processDefinition.properties?.triggers?.items?.$ref).toBe('./process-trigger-spec.schema.json')
    expect(processDefinition.properties?.concurrency?.$ref).toBe('./process-concurrency-policy.schema.json')
    expect(processDefinition.properties?.errorPolicy?.$ref).toBe('./process-error-policy.schema.json')
    expect(processDefinition.properties?.diagnosticsLevel?.enum).toEqual(['off', 'light', 'full'])

    const scope = schemas.get('process-scope.schema.json')!.schema
    const scopeTypes = new Set((scope.oneOf ?? []).map((s: any) => s.properties?.type?.const))
    expect(scopeTypes).toEqual(new Set(['app', 'moduleInstance', 'uiSubtree']))

    const concurrency = schemas.get('process-concurrency-policy.schema.json')!.schema
    expect(concurrency.properties?.mode?.enum).toEqual(['latest', 'serial', 'drop', 'parallel'])

    const errorPolicy = schemas.get('process-error-policy.schema.json')!.schema
    expect(errorPolicy.properties?.mode?.enum).toEqual(['failStop', 'supervise'])

    const control = schemas.get('process-control-request.schema.json')!.schema
    expect(control.properties?.action?.enum).toEqual(['start', 'stop', 'restart'])

    const events = schemas.get('process-event.schema.json')!.schema
    expect(events.properties?.type?.enum).toEqual([
      'process:start',
      'process:stop',
      'process:restart',
      'process:trigger',
      'process:dispatch',
      'process:error',
    ])
    expect(events.properties?.severity?.enum).toEqual(['info', 'warning', 'error'])
    expect(events.properties?.identity?.$ref).toBe('./process-instance-identity.schema.json')
    expect(events.properties?.trigger?.$ref).toBe('./process-trigger.schema.json')
    expect(events.properties?.error?.$ref).toBe('./error-summary.schema.json')
  })
})
