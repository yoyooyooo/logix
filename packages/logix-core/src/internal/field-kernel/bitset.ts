export class DenseIdBitSet {
  readonly size: number

  private readonly words: Uint32Array
  private readonly touchedWords: Uint32Array | undefined
  private readonly touchedFlags: Uint8Array | undefined
  private touchedCount = 0

  constructor(
    size: number,
    options?: {
      readonly clearStrategy?: 'fill' | 'touched-words'
    },
  ) {
    const nextSize = Math.max(0, Math.floor(size))
    this.size = nextSize

    const wordCount = Math.ceil(nextSize / 32)
    this.words = new Uint32Array(wordCount)

    if (options?.clearStrategy === 'touched-words') {
      this.touchedWords = new Uint32Array(wordCount)
      this.touchedFlags = new Uint8Array(wordCount)
    } else {
      this.touchedWords = undefined
      this.touchedFlags = undefined
    }
  }

  clear(): void {
    if (!this.touchedWords) {
      this.words.fill(0)
      return
    }

    for (let i = 0; i < this.touchedCount; i++) {
      const wordIndex = this.touchedWords[i]!
      this.words[wordIndex] = 0
      this.touchedFlags![wordIndex] = 0
    }
    this.touchedCount = 0
  }

  has(id: number): boolean {
    if (!(id >= 0 && id < this.size)) return false
    const wordIndex = (id / 32) | 0
    const bit = id & 31
    return (this.words[wordIndex]! & (1 << bit)) !== 0
  }

  add(id: number): void {
    if (!(id >= 0 && id < this.size)) return
    const wordIndex = (id / 32) | 0
    const bit = id & 31
    const mask = 1 << bit

    const prev = this.words[wordIndex]!
    if ((prev & mask) !== 0) return

    this.words[wordIndex] = prev | mask

    if (!this.touchedWords) return
    if (this.touchedFlags![wordIndex] === 1) return
    this.touchedFlags![wordIndex] = 1
    this.touchedWords[this.touchedCount] = wordIndex
    this.touchedCount += 1
  }
}
