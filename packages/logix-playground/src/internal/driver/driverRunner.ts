import type { ProgramSessionAction } from '../session/programSession.js'
import type { InteractionDriver } from './driverModel.js'

export const resolveDriverAction = (
  driver: InteractionDriver,
  exampleId?: string,
): ProgramSessionAction => {
  const selectedExample = exampleId
    ? driver.examples?.find((example) => example.id === exampleId)
    : undefined
  const payload = selectedExample && 'payload' in selectedExample
    ? selectedExample.payload
    : driver.payload.kind === 'json'
      ? driver.payload.value
      : undefined

  return {
    _tag: driver.actionTag,
    payload,
  }
}
