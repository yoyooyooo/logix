import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { localCounterProjectFixture } from './support/projectFixtures.js'
import { DocsConsumerPlaygroundFixture } from './support/docsConsumerFixture.js'

describe('docs-style Playground consumer contract', () => {
  it('renders PlaygroundPage from registry and project id without copying shell internals', () => {
    render(
      <DocsConsumerPlaygroundFixture
        registry={[localCounterProjectFixture]}
        projectId="logix-react.local-counter"
      />,
    )

    expect(screen.getByText('Logix Playground')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'File navigator' })).toBeTruthy()
    expect(screen.getByLabelText('Source editor')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Result' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Program result' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Program session' })).toBeTruthy()
  })

  it('renders a bounded not-found state for missing project ids', () => {
    render(<DocsConsumerPlaygroundFixture registry={[localCounterProjectFixture]} projectId="missing" />)

    expect(screen.getByText('Playground project not found')).toBeTruthy()
    expect(screen.getByText('missing')).toBeTruthy()
  })
})
