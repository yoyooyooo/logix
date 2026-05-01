import type { Locator, Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'
import { formatLogixReactPlaygroundProjectLabel } from '../../src/playground/projectLabels'

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export const routeForPlaygroundProject = (project: PlaygroundProject): string =>
  `/playground/${project.id}`

export const formatProjectLabel = (projectId: string): string =>
  formatLogixReactPlaygroundProjectLabel(projectId)

export const gotoProjectRoute = async (
  page: Page,
  baseUrl: string,
  project: PlaygroundProject,
): Promise<void> => {
  await page.goto(`${baseUrl}${routeForPlaygroundProject(project)}`, { waitUntil: 'networkidle' })
  await page.getByText('Logix Playground').waitFor({ state: 'visible' })
}

export const getHostCommand = (page: Page, name: string): Locator =>
  page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name, exact: true })

export interface PressureFixtureView {
  readonly id?: string
  readonly activeInspectorTab: string
  readonly activeBottomTab: string
  readonly dataProfile: Readonly<Record<string, number>>
  readonly scrollOwners?: ReadonlyArray<string>
  readonly requiredVisibleRegions?: ReadonlyArray<string>
}

export interface DiagnosticsDemoFixtureView {
  readonly id?: string
  readonly expectedCodes: ReadonlyArray<string>
  readonly expectedAuthorities: ReadonlyArray<string>
  readonly expectedEvidence: ReadonlyArray<string>
  readonly expectedTrialDependencyKinds?: ReadonlyArray<string>
}

export const getPressureFixture = (project: PlaygroundProject): PressureFixtureView | undefined => {
  const pressure = typeof project.fixtures === 'object' && project.fixtures && 'pressure' in project.fixtures
    ? project.fixtures.pressure
    : undefined
  if (!pressure || typeof pressure !== 'object') return undefined
  return pressure as PressureFixtureView
}

export const getDiagnosticsDemoFixture = (project: PlaygroundProject): DiagnosticsDemoFixtureView | undefined => {
  const diagnosticsDemo = typeof project.fixtures === 'object' && project.fixtures && 'diagnosticsDemo' in project.fixtures
    ? project.fixtures.diagnosticsDemo
    : undefined
  if (!diagnosticsDemo || typeof diagnosticsDemo !== 'object') return undefined
  return diagnosticsDemo as DiagnosticsDemoFixtureView
}

export const assertNoPageOverflow = async (page: Page, context: string): Promise<void> => {
  const scrollHeight = await page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)
  const height = page.viewportSize()?.height ?? 768
  assertCondition(scrollHeight <= height + 1, `${context} should not create page overflow: ${scrollHeight}`)
}

export const expectVisible = async (locator: Locator, label: string): Promise<void> => {
  assertCondition(await locator.isVisible(), `${label} should be visible`)
}
