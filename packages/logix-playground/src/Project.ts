export type PlaygroundFileLanguage = 'ts' | 'tsx' | 'js' | 'jsx' | 'json' | 'css' | 'md'

export interface PlaygroundFile {
  readonly language: PlaygroundFileLanguage
  readonly content: string
  readonly editable?: boolean
}

export interface PlaygroundPreviewEntry {
  readonly entry: string
}

export interface PlaygroundProgramEntry {
  readonly entry: string
}

export interface PlaygroundCapabilities {
  /** Optional preview adapter capability. Logic-first projects normally omit this. */
  readonly preview?: boolean
  readonly run?: boolean
  readonly check?: boolean
  readonly trialStartup?: boolean
}

export interface PlaygroundDriverPayload {
  readonly kind: 'void' | 'json'
  readonly value?: unknown
}

export interface PlaygroundDriverExample {
  readonly id: string
  readonly label: string
  readonly payload?: unknown
}

export interface PlaygroundDriverReadAnchor {
  readonly id: string
  readonly label: string
  readonly target: 'state' | 'result' | 'log' | 'trace' | 'diagnostics'
}

export interface PlaygroundDriver {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly operation: 'dispatch'
  readonly actionTag: string
  readonly payload: PlaygroundDriverPayload
  readonly examples?: ReadonlyArray<PlaygroundDriverExample>
  readonly readAnchors?: ReadonlyArray<PlaygroundDriverReadAnchor>
}

export type PlaygroundScenarioReadTarget = 'state' | 'result' | 'log' | 'trace' | 'diagnostics'

export type PlaygroundScenarioExpectation =
  | { readonly assertion: 'changed' }
  | { readonly assertion: 'exists' }
  | { readonly assertion: 'equals'; readonly value: unknown }

export type PlaygroundScenarioStep =
  | {
      readonly id: string
      readonly kind: 'driver'
      readonly driverId: string
      readonly exampleId?: string
      readonly payload?: unknown
    }
  | {
      readonly id: string
      readonly kind: 'wait'
      readonly timeoutMs: number
    }
  | {
      readonly id: string
      readonly kind: 'settle'
      readonly timeoutMs: number
    }
  | {
      readonly id: string
      readonly kind: 'observe'
      readonly target: PlaygroundScenarioReadTarget
    }
  | ({
      readonly id: string
      readonly kind: 'expect'
      readonly target: PlaygroundScenarioReadTarget
    } & PlaygroundScenarioExpectation)

export interface PlaygroundScenario {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly steps: ReadonlyArray<PlaygroundScenarioStep>
}

export interface PlaygroundServiceFileEntry {
  readonly path: string
  readonly label: string
  readonly role: 'service-provider' | 'fixture' | 'test-double' | 'environment' | string
  readonly serviceRef?: string
  readonly schemaSummary?: string
}

export interface PlaygroundServiceFileGroup {
  readonly id: string
  readonly label: string
  readonly files: ReadonlyArray<PlaygroundServiceFileEntry>
}

export type PlaygroundProjectServiceFiles = ReadonlyArray<PlaygroundServiceFileGroup>

export interface PlaygroundProject {
  readonly id: string
  /**
   * Virtual source files shown in Playground and consumed by the current ProjectSnapshot.
   * Logic-first projects should use /src/main.program.ts for Program assembly and
   * /src/logic/*.logic.ts for domain logic. Preview files belong under /src/preview/*
   * only when preview is explicitly declared.
   */
  readonly files: Readonly<Record<string, PlaygroundFile>>
  /** Optional UI preview entry. It is not required for Logic-first runtime projects. */
  readonly preview?: PlaygroundPreviewEntry
  /** Runtime Program entry. Logic-first projects should point this at /src/main.program.ts. */
  readonly program?: PlaygroundProgramEntry
  /** Docs-friendly curated interactions. They are product metadata, not virtual runtime source. */
  readonly drivers?: ReadonlyArray<PlaygroundDriver>
  /** Product-level playback metadata. It is not virtual runtime source or control-plane authority. */
  readonly scenarios?: ReadonlyArray<PlaygroundScenario>
  /** Service source grouping metadata. Referenced files remain ordinary PlaygroundFile entries. */
  readonly serviceFiles?: PlaygroundProjectServiceFiles
  readonly capabilities?: PlaygroundCapabilities
  readonly fixtures?: unknown
}

export type PlaygroundRegistry =
  | ReadonlyArray<PlaygroundProject>
  | Readonly<Record<string, PlaygroundProject>>

export interface PlaygroundProjectSourcePaths {
  readonly mainProgram: '/src/main.program.ts'
  readonly previewApp: '/src/preview/App.tsx'
  readonly logic: (name: string) => `/src/logic/${string}.logic.ts`
  readonly service: (name: string) => `/src/services/${string}.service.ts`
  readonly fixture: (name: string) => `/src/fixtures/${string}.fixture.ts`
}

const sourceNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/

const makeSourcePath = <T extends string>(
  kind: 'logic' | 'service' | 'fixture',
  name: string,
  format: (name: string) => T,
): T => {
  if (!sourceNamePattern.test(name)) {
    throw new Error(`Invalid Playground ${kind} source name: ${name}`)
  }
  return format(name)
}

/** Standard virtual source paths for docs-ready Playground project declarations. */
export const playgroundProjectSourcePaths: PlaygroundProjectSourcePaths = {
  mainProgram: '/src/main.program.ts',
  previewApp: '/src/preview/App.tsx',
  logic: (name) => makeSourcePath('logic', name, (safeName) => `/src/logic/${safeName}.logic.ts`),
  service: (name) => makeSourcePath('service', name, (safeName) => `/src/services/${safeName}.service.ts`),
  fixture: (name) => makeSourcePath('fixture', name, (safeName) => `/src/fixtures/${safeName}.fixture.ts`),
}

export const definePlaygroundProject = <P extends PlaygroundProject>(project: P): P => project

export const definePlaygroundRegistry = <R extends PlaygroundRegistry>(registry: R): R => registry

export const resolvePlaygroundProject = (
  registry: PlaygroundRegistry,
  projectId: string,
): PlaygroundProject | undefined => {
  if (Array.isArray(registry)) {
    return registry.find((project) => project.id === projectId)
  }
  return (registry as Readonly<Record<string, PlaygroundProject>>)[projectId]
}
