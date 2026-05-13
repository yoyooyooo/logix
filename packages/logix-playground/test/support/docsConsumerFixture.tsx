import React from 'react'
import { PlaygroundPage } from '../../src/Playground.js'
import type { PlaygroundRegistry } from '../../src/Project.js'

export function DocsConsumerPlaygroundFixture({
  registry,
  projectId,
}: {
  readonly registry: PlaygroundRegistry
  readonly projectId: string
}): React.ReactElement {
  return <PlaygroundPage registry={registry} projectId={projectId} />
}
