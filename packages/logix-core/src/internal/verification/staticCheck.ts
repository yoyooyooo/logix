import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../module.js'
import { getProgramAssemblyIssues, type ProgramAssemblyIssue } from '../program.js'
import { extractManifest } from '../reflection/manifest.js'

export type RuntimeStaticFindingKind = 'blueprint' | 'import' | 'declaration' | 'sourceRef' | 'pass-boundary'

export interface RuntimeStaticSourceArtifact {
  readonly sourceRef: string
  readonly digest: string
  readonly producer: 'source' | 'package' | 'typecheck' | 'cli-source'
  readonly artifactRef?: string
}

export interface RuntimeStaticFinding {
  readonly kind: RuntimeStaticFindingKind
  readonly code: string
  readonly ownerCoordinate: string
  readonly summary: string
  readonly focusRef?: {
    readonly declSliceId?: string
    readonly sourceRef?: string
  }
  readonly sourceArtifactRef?: RuntimeStaticSourceArtifact
}

export interface RuntimeStaticCheckOptions {
  readonly includeStaticIr?: boolean
  readonly maxManifestBytes: number
  readonly owner?: unknown
  readonly sourceArtifacts?: ReadonlyArray<RuntimeStaticSourceArtifact>
}

export interface RuntimeStaticCheckArtifact {
  readonly manifestDigest: string
  readonly findings: ReadonlyArray<RuntimeStaticFinding>
}

export const makeMissingBlueprintFinding = (): RuntimeStaticFinding => ({
  kind: 'blueprint',
  code: 'PROGRAM_BLUEPRINT_MISSING',
  ownerCoordinate: 'Program.runtimeBlueprint',
  summary: 'Program is missing its internal runtime blueprint.',
  focusRef: {
    declSliceId: 'Program.runtimeBlueprint',
  },
})

const moduleIdOf = <Sh extends AnyModuleShape>(root: ProgramRuntimeBlueprint<any, Sh, any>): string => {
  const id = (root.module as any)?.id
  return typeof id === 'string' && id.length > 0 ? id : 'unknown'
}

const findingFromAssemblyIssue = (issue: ProgramAssemblyIssue): RuntimeStaticFinding => ({
  kind: 'import',
  code: issue.code,
  ownerCoordinate: issue.ownerCoordinate,
  summary: issue.message,
  focusRef: {
    declSliceId: issue.ownerCoordinate,
  },
})

const sourceFindings = (args: {
  readonly ownerCoordinate: string
  readonly declarationDigest: string
  readonly sourceArtifacts: ReadonlyArray<RuntimeStaticSourceArtifact>
}): ReadonlyArray<RuntimeStaticFinding> =>
  args.sourceArtifacts.flatMap((artifact) => {
    if (artifact.digest === args.declarationDigest) return []
    return [
      {
        kind: 'declaration',
        code: 'DECLARATION_DIGEST_STALE',
        ownerCoordinate: args.ownerCoordinate,
        summary: 'Derived source artifact digest does not match the Program declaration digest.',
        focusRef: {
          declSliceId: args.ownerCoordinate,
          sourceRef: artifact.sourceRef,
        },
        sourceArtifactRef: artifact,
      } satisfies RuntimeStaticFinding,
    ]
  })

export const extractRuntimeStaticCheckArtifact = <Sh extends AnyModuleShape>(
  root: ProgramRuntimeBlueprint<any, Sh, any>,
  options: RuntimeStaticCheckOptions,
): RuntimeStaticCheckArtifact => {
  const manifest = extractManifest(root, {
    includeStaticIr: options.includeStaticIr,
    budgets: {
      maxBytes: options.maxManifestBytes,
    },
  })

  return {
    manifestDigest: manifest.digest,
    findings: [
      ...getProgramAssemblyIssues(options.owner).map(findingFromAssemblyIssue),
      ...sourceFindings({
        ownerCoordinate: `Program(${moduleIdOf(root)}).declaration`,
        declarationDigest: manifest.digest,
        sourceArtifacts: options.sourceArtifacts ?? [],
      }),
    ],
  }
}
