import type { FieldPath } from '../field-path.js'

const getAtFieldPath = (state: any, path: FieldPath): any => {
  let current: any = state
  for (let i = 0; i < path.length; i++) {
    if (current == null) return undefined
    current = current[path[i]!]
  }
  return current
}

const isObjectLike = (value: unknown): value is object => typeof value === 'object' && value !== null

const shallowCopy = (value: object): any => {
  if (Array.isArray(value)) {
    return value.slice()
  }
  const proto = Object.getPrototypeOf(value)
  const out = proto === null ? Object.create(null) : Object.create(proto)
  return Object.assign(out, value)
}

export class CowDraft<S extends object> {
  private root: S
  private readonly owned = new WeakSet<object>()
  private readonly copies = new WeakMap<object, object>()

  constructor(base: S) {
    this.root = base
  }

  getRoot(): S {
    return this.root
  }

  getAt(path: FieldPath): unknown {
    return getAtFieldPath(this.root as any, path)
  }

  setAt(path: FieldPath, value: unknown, _prev?: unknown): void {
    if (path.length === 0) return
    this.root = this.ensureOwnedRoot()

    let current: any = this.root
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!
      const existing = current[key]

      if (!isObjectLike(existing)) {
        const created = {}
        this.owned.add(created)
        current[key] = created
        current = created
        continue
      }

      if (this.owned.has(existing)) {
        current = existing
        continue
      }

      const cached = this.copies.get(existing)
      const next = cached ?? shallowCopy(existing)
      if (!cached) {
        this.copies.set(existing, next)
      }
      this.owned.add(next)
      current[key] = next
      current = next
    }

    current[path[path.length - 1]!] = value
  }

  private ensureOwnedRoot(): S {
    const root = this.root as any as unknown
    if (!isObjectLike(root)) {
      return this.root
    }
    if (this.owned.has(root)) {
      return this.root
    }
    const cached = this.copies.get(root)
    const next = (cached ?? shallowCopy(root)) as S
    if (!cached) {
      this.copies.set(root, next as any)
    }
    this.owned.add(next as any)
    return next
  }
}

export class ShallowInPlaceDraft<S extends object> {
  private readonly root: S
  private readonly keys: Array<string> = []
  private readonly prev: Array<unknown> = []
  private readonly had: Array<boolean> = []

  constructor(base: S) {
    this.root = base
  }

  getRoot(): S {
    return this.root
  }

  getAt(path: FieldPath): unknown {
    if (path.length === 1) {
      return (this.root as any)[path[0]!]
    }
    return getAtFieldPath(this.root as any, path)
  }

  setAt(path: FieldPath, value: unknown, _prev?: unknown): void {
    if (path.length !== 1) {
      throw new Error('[StateTrait.converge] ShallowInPlaceDraft only supports root-level writes')
    }
    const key = path[0]!
    const root: any = this.root
    const had = Object.prototype.hasOwnProperty.call(root, key)
    this.keys.push(key)
    this.had.push(had)
    this.prev.push(had ? root[key] : undefined)
    root[key] = value
  }

  rollback(): void {
    const root: any = this.root
    for (let i = this.keys.length - 1; i >= 0; i--) {
      const key = this.keys[i]!
      if (this.had[i]!) {
        root[key] = this.prev[i]
      } else {
        delete root[key]
      }
    }
    this.keys.length = 0
    this.prev.length = 0
    this.had.length = 0
  }
}

