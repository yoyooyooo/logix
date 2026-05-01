import type { Locator, Page } from 'playwright'

export interface EvidenceCoordinate {
  readonly projectId: string
  readonly sourceRevision: string
  readonly sourceDigest: string
  readonly operationKind: string
  readonly operationId: string
}

const requiredKeys = ['projectId', 'sourceRevision', 'sourceDigest', 'operationKind', 'operationId'] as const

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export const parseEvidenceCoordinateText = (text: string): EvidenceCoordinate => {
  const entries = new Map(
    text
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=')
        return [key, rest.join('=')] as const
      }),
  )
  for (const key of requiredKeys) {
    assertCondition(entries.get(key), `Missing evidence coordinate key ${key} in ${JSON.stringify(text)}`)
  }
  return {
    projectId: entries.get('projectId')!,
    sourceRevision: entries.get('sourceRevision')!,
    sourceDigest: entries.get('sourceDigest')!,
    operationKind: entries.get('operationKind')!,
    operationId: entries.get('operationId')!,
  }
}

export const readEvidenceCoordinate = async (
  locator: Locator,
  label: string,
): Promise<EvidenceCoordinate> => {
  const attr = await locator.getAttribute('data-playground-evidence-coordinate')
  if (attr) return parseEvidenceCoordinateText(attr)
  const text = await locator.textContent()
  assertCondition(text, `${label} should expose evidence coordinate text or data-playground-evidence-coordinate`)
  return parseEvidenceCoordinateText(text)
}

export const assertSameEvidenceCoordinate = (
  expected: EvidenceCoordinate,
  actual: EvidenceCoordinate,
  context: string,
): void => {
  const expectedJson = JSON.stringify(expected)
  const actualJson = JSON.stringify(actual)
  assertCondition(actualJson === expectedJson, `${context} should share the same evidence coordinate`)
}

export const selectBottomEvidenceTab = async (
  page: Page,
  tab: 'Console' | 'Diagnostics' | 'Trace' | 'Snapshot' | 'Scenario',
): Promise<void> => {
  const button = page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: tab })
  if (tab === 'Diagnostics' || tab === 'Scenario') {
    await button.evaluate((element) => {
      if (element instanceof HTMLElement) element.click()
    })
    return
  }
  await button.click()
}

export const assertRegionContainsCoordinate = async (
  locator: Locator,
  expected: EvidenceCoordinate,
  context: string,
): Promise<void> => {
  const attr = await locator.getAttribute('data-playground-evidence-coordinate')
  const text = [attr, await locator.textContent()].filter(Boolean).join('\n')
  assertCondition(text.includes(expected.operationId), `${context} should include operationId ${expected.operationId}`)
  assertCondition(text.includes(expected.sourceRevision), `${context} should include sourceRevision ${expected.sourceRevision}`)
  assertCondition(text.includes(expected.sourceDigest), `${context} should include sourceDigest ${expected.sourceDigest}`)
}

export const assertTraceContainsCoordinate = async (
  page: Page,
  expected: EvidenceCoordinate,
  context: string,
): Promise<void> => {
  await selectBottomEvidenceTab(page, 'Trace')
  const trace = page.getByLabel('Trace detail')
  const attr = await trace.getAttribute('data-playground-evidence-coordinate')
  const text = [attr, await trace.textContent()].filter(Boolean).join('\n')
  assertCondition(text.includes(expected.operationId), `${context} Trace should include operationId ${expected.operationId}`)
  assertCondition(text.includes(expected.sourceRevision), `${context} Trace should include sourceRevision ${expected.sourceRevision}`)
  assertCondition(text.includes(expected.sourceDigest), `${context} Trace should include sourceDigest ${expected.sourceDigest}`)
  if (attr) return
  assertCondition(
    text.includes('operation.completed') || text.includes('operation.failed') || text.includes('evidence.gap'),
    `${context} Trace should include a terminal operation event or evidence gap`,
  )
}

export const assertEvidenceCoordinate = async (input: {
  readonly page: Page
  readonly source: Locator
  readonly context: string
  readonly expectedProjectId: string
  readonly expectedOperationKind?: string
  readonly diagnostics?: Locator
  readonly consoleOrState?: Locator
  readonly snapshot?: Locator
}): Promise<EvidenceCoordinate> => {
  const coordinate = await readEvidenceCoordinate(input.source, input.context)
  assertCondition(coordinate.projectId === input.expectedProjectId, `${input.context} projectId should match`)
  if (input.expectedOperationKind) {
    assertCondition(coordinate.operationKind === input.expectedOperationKind, `${input.context} operationKind should match`)
  }
  await assertTraceContainsCoordinate(input.page, coordinate, input.context)

  if (input.diagnostics) {
    await selectBottomEvidenceTab(input.page, 'Diagnostics')
    await assertRegionContainsCoordinate(input.diagnostics, coordinate, `${input.context} Diagnostics detail`)
  }
  if (input.consoleOrState) {
    await selectBottomEvidenceTab(input.page, 'Console')
    await assertRegionContainsCoordinate(input.consoleOrState, coordinate, `${input.context} console/state detail`)
  }

  const snapshot = input.snapshot ?? input.page.getByLabel('Snapshot summary')
  await selectBottomEvidenceTab(input.page, 'Snapshot')
  await assertRegionContainsCoordinate(snapshot, coordinate, `${input.context} Snapshot summary`)

  return coordinate
}
