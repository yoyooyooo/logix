import { asSerializableErrorSummary, makeCliError, type SerializableErrorSummary } from '../errors.js'
import { sha256DigestOfJson } from '../stableJson.js'

import { assertExtensionManifestSecurity, type ExtensionCapabilityPolicy } from './capabilities.js'
import type { ExtensionHostRuntime } from './runtime.js'

export type RevalidateBaseline = {
  readonly manifestDigest: string
  readonly policyDigest: string
}

export type RevalidateBeforeSwapArgs = {
  readonly shadow: ExtensionHostRuntime
  readonly baseline: RevalidateBaseline
  readonly resolvePolicy: () => ExtensionCapabilityPolicy | Promise<ExtensionCapabilityPolicy>
}

export type RevalidateBeforeSwapResult =
  | {
      readonly ok: true
      readonly baseline: RevalidateBaseline
    }
  | {
      readonly ok: false
      readonly reasonCode: 'EXT_MANIFEST_INVALID'
      readonly drift: 'policy-drift' | 'capability-violation' | 'internal-import' | 'manifest-mutated'
      readonly error: SerializableErrorSummary
      readonly baseline: RevalidateBaseline
      readonly current: RevalidateBaseline
    }

type RevalidateDrift = Exclude<RevalidateBeforeSwapResult, { readonly ok: true }>['drift']

const parseDriftType = (summary: SerializableErrorSummary): RevalidateDrift => {
  const message = (summary.message ?? '').toLowerCase()
  if (message.includes('internal')) return 'internal-import'
  if (message.includes('allowlist') || message.includes('未授权') || message.includes('越权')) return 'capability-violation'
  return 'capability-violation'
}

export const makeRevalidateBaseline = (args: {
  readonly manifest: ExtensionHostRuntime['manifest']
  readonly policy: ExtensionCapabilityPolicy
}): RevalidateBaseline => ({
  manifestDigest: sha256DigestOfJson(args.manifest),
  policyDigest: sha256DigestOfJson(args.policy),
})

export const revalidateBeforeSwap = async (args: RevalidateBeforeSwapArgs): Promise<RevalidateBeforeSwapResult> => {
  const currentPolicy = await args.resolvePolicy()
  const current = makeRevalidateBaseline({
    manifest: args.shadow.manifest,
    policy: currentPolicy,
  })

  if (current.manifestDigest !== args.baseline.manifestDigest) {
    return {
      ok: false,
      reasonCode: 'EXT_MANIFEST_INVALID',
      drift: 'manifest-mutated',
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'EXT_MANIFEST_INVALID',
          message: '[Logix][CLI] extension manifest 在 swap 前发生漂移',
        }),
      ),
      baseline: args.baseline,
      current,
    }
  }

  if (current.policyDigest !== args.baseline.policyDigest) {
    return {
      ok: false,
      reasonCode: 'EXT_MANIFEST_INVALID',
      drift: 'policy-drift',
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'EXT_MANIFEST_INVALID',
          message: '[Logix][CLI] extension policy 在 swap 前发生漂移',
        }),
      ),
      baseline: args.baseline,
      current,
    }
  }

  try {
    assertExtensionManifestSecurity(args.shadow.manifest, currentPolicy)
  } catch (cause) {
    const summary = asSerializableErrorSummary(cause)
    return {
      ok: false,
      reasonCode: 'EXT_MANIFEST_INVALID',
      drift: parseDriftType(summary),
      error: summary,
      baseline: args.baseline,
      current,
    }
  }

  return {
    ok: true,
    baseline: args.baseline,
  }
}
