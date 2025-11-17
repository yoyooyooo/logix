import type { TraitConvergePlanCacheEvidence } from './model.js'

interface ConvergePlanCacheEntry {
  readonly hash: number
  readonly rootIds: ReadonlyArray<number>
  planStepIds: Int32Array
  prev?: ConvergePlanCacheEntry
  next?: ConvergePlanCacheEntry
}

const rootIdsEquals = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * ConvergePlanCache：
 * - Per-module-instance ExecutionPlan cache (LRU + bounded capacity + stats).
 * - Triggers self-protection under low hit-rate: disable reuse and clear the cache to avoid long-term negative optimization.
 */
export class ConvergePlanCache {
  readonly capacity: number
  private readonly buckets = new Map<number, Array<ConvergePlanCacheEntry>>()
  private head?: ConvergePlanCacheEntry
  private tail?: ConvergePlanCacheEntry
  private size_ = 0
  private hits_ = 0
  private misses_ = 0
  private evicts_ = 0

  private disabled_ = false
  private disableReason_: TraitConvergePlanCacheEvidence['disableReason'] | undefined

  constructor(capacity: number) {
    const next = Math.floor(capacity)
    this.capacity = next > 0 ? next : 0
  }

  isDisabled(): boolean {
    return this.disabled_
  }

  disable(reason: TraitConvergePlanCacheEvidence['disableReason']): void {
    if (this.disabled_) return
    this.disableInternal(reason)
  }

  get(hash: number, rootIds: ReadonlyArray<number>): Int32Array | undefined {
    if (this.capacity <= 0) return undefined
    if (this.disabled_) return undefined

    const bucket = this.buckets.get(hash)
    if (!bucket) {
      this.misses_ += 1
      return undefined
    }
    for (const entry of bucket) {
      if (!rootIdsEquals(entry.rootIds, rootIds)) continue
      this.hits_ += 1
      this.touch(entry)
      return entry.planStepIds
    }
    this.misses_ += 1
    return undefined
  }

  set(hash: number, rootIds: ReadonlyArray<number>, planStepIds: Int32Array): void {
    if (this.capacity <= 0) {
      return
    }
    if (this.disabled_) {
      return
    }

    const bucket = this.buckets.get(hash) ?? []
    for (const entry of bucket) {
      if (!rootIdsEquals(entry.rootIds, rootIds)) continue
      entry.planStepIds = planStepIds
      this.touch(entry)
      if (!this.buckets.has(hash)) this.buckets.set(hash, bucket)
      return
    }

    const entry: ConvergePlanCacheEntry = {
      hash,
      rootIds,
      planStepIds,
    }
    bucket.push(entry)
    this.buckets.set(hash, bucket)
    this.attachFront(entry)
    this.size_ += 1

    while (this.size_ > this.capacity) {
      this.evictOne()
    }

    this.maybeTriggerLowHitRateProtection()
  }

  evidence(options: {
    readonly hit: boolean
    readonly keySize?: number
    readonly missReason?: TraitConvergePlanCacheEvidence['missReason']
  }): TraitConvergePlanCacheEvidence {
    return {
      capacity: this.capacity,
      size: this.size_,
      hits: this.hits_,
      misses: this.misses_,
      evicts: this.evicts_,
      hit: options.hit,
      ...(typeof options.keySize === 'number' ? { keySize: options.keySize } : null),
      ...(options.hit ? null : options.missReason ? { missReason: options.missReason } : null),
      ...(this.disabled_
        ? {
            disabled: true,
            disableReason: this.disableReason_ ?? 'unknown',
          }
        : null),
    }
  }

  private maybeTriggerLowHitRateProtection(): void {
    if (this.disabled_) return
    if (this.capacity <= 0) return

    const total = this.hits_ + this.misses_
    // Only make a call after at least one eviction could have happened.
    if (total < Math.max(64, this.capacity + 1)) return

    const hitRate = total > 0 ? this.hits_ / total : 1
    if (hitRate > 0.01) return

    this.disable('low_hit_rate')
  }

  private disableInternal(reason: TraitConvergePlanCacheEvidence['disableReason']): void {
    this.disabled_ = true
    this.disableReason_ = reason
    this.clearEntries()
  }

  private clearEntries(): void {
    this.buckets.clear()
    this.head = undefined
    this.tail = undefined
    this.size_ = 0
  }

  private attachFront(entry: ConvergePlanCacheEntry): void {
    entry.prev = undefined
    entry.next = this.head
    if (this.head) {
      this.head.prev = entry
    } else {
      this.tail = entry
    }
    this.head = entry
  }

  private detach(entry: ConvergePlanCacheEntry): void {
    const prev = entry.prev
    const next = entry.next
    if (prev) {
      prev.next = next
    } else {
      this.head = next
    }
    if (next) {
      next.prev = prev
    } else {
      this.tail = prev
    }
    entry.prev = undefined
    entry.next = undefined
  }

  private touch(entry: ConvergePlanCacheEntry): void {
    if (this.head === entry) return
    this.detach(entry)
    this.attachFront(entry)
  }

  private evictOne(): void {
    const entry = this.tail
    if (!entry) return

    this.detach(entry)
    const bucket = this.buckets.get(entry.hash)
    if (bucket) {
      const idx = bucket.indexOf(entry)
      if (idx >= 0) bucket.splice(idx, 1)
      if (bucket.length === 0) this.buckets.delete(entry.hash)
    }
    this.size_ = Math.max(0, this.size_ - 1)
    this.evicts_ += 1
  }
}
