export type OptimisticOp<Entity, EntityId> =
  | {
      readonly _tag: 'save'
      readonly opId: string
      readonly seq: number
      readonly entity: Entity
    }
  | {
      readonly _tag: 'remove'
      readonly opId: string
      readonly seq: number
      readonly id: EntityId
    }

const upsertById = <Entity, EntityId>(
  items: ReadonlyArray<Entity>,
  entity: Entity,
  getId: (entity: Entity) => EntityId,
): ReadonlyArray<Entity> => {
  const id = getId(entity)
  const idx = items.findIndex((x) => getId(x) === id)
  if (idx < 0) return [...items, entity]
  return items.map((x, i) => (i === idx ? entity : x))
}

const removeById = <Entity, EntityId>(
  items: ReadonlyArray<Entity>,
  id: EntityId,
  getId: (entity: Entity) => EntityId,
): ReadonlyArray<Entity> => items.filter((x) => getId(x) !== id)

export const applyOptimisticOps = <Entity, EntityId>(
  base: ReadonlyArray<Entity>,
  ops: ReadonlyArray<OptimisticOp<Entity, EntityId>>,
  getId: (entity: Entity) => EntityId,
): ReadonlyArray<Entity> => {
  if (ops.length === 0) return base

  const sorted = ops.slice().sort((a, b) => a.seq - b.seq)
  let items: ReadonlyArray<Entity> = base

  for (const op of sorted) {
    if (op._tag === 'save') {
      items = upsertById(items, op.entity, getId)
    } else {
      items = removeById(items, op.id, getId)
    }
  }

  return items
}

export const removeOp = <Op extends { readonly opId: string }>(
  ops: ReadonlyArray<Op>,
  opId: string,
): ReadonlyArray<Op> => ops.filter((op) => op.opId !== opId)
