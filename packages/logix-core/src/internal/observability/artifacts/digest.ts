import { fnv1a32, stableStringify } from '../../digest.js'
import type { JsonValue } from '../jsonValue.js'

export interface JsonValueDigest {
  readonly stableJson: string
  readonly bytes: number
  readonly digest: string
}

const utf8ByteLengthString = (text: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length
  }
  return text.length
}

export const digestJsonValue = (value: JsonValue): JsonValueDigest => {
  const stableJson = stableStringify(value)
  const bytes = utf8ByteLengthString(stableJson)
  return {
    stableJson,
    bytes,
    digest: `artifact:031:${fnv1a32(stableJson)}`,
  }
}
