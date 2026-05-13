export const counterStep = 1

export const applyCounterStep = (value: number, direction: 1 | -1): number =>
  value + counterStep * direction
