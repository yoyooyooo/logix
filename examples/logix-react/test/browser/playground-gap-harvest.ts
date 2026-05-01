import type { Locator, Page } from 'playwright'
import type { ProofPackId } from './playground-proof-recipes'

export type GapOwnerClass =
  | 'reflection'
  | 'runtime-run'
  | 'runtime-dispatch'
  | 'control-plane-check'
  | 'control-plane-trial'
  | 'transport'
  | 'projection'
  | 'playground-product'

const ownerClasses = new Set<GapOwnerClass>([
  'reflection',
  'runtime-run',
  'runtime-dispatch',
  'control-plane-check',
  'control-plane-trial',
  'transport',
  'projection',
  'playground-product',
])

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export const isKnownOwnerClass = (value: string): value is GapOwnerClass =>
  ownerClasses.has(value as GapOwnerClass)

export const formatGapFailure = (input: {
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly message: string
}): string =>
  `projectId=${input.projectId} packId=${input.packId} ownerClass=${input.ownerClass} ${input.message}`

export const assertNoSilentFallback = async (
  page: Page,
  projectId: string,
  packId: ProofPackId,
): Promise<void> => {
  const body = await page.locator('body').textContent()
  const forbidden = ['[object Event]', 'fallback-source-regex', 'deriveFallbackActionManifestFromSnapshot']
  for (const item of forbidden) {
    assertCondition(
      !body?.includes(item),
      formatGapFailure({ projectId, packId, ownerClass: 'playground-product', message: `forbidden silent fallback leaked ${item}` }),
    )
  }
}

export const assertGapVisible = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly expectedText: string | RegExp
}): Promise<void> => {
  const body = await input.page.locator('body').textContent()
  const matched = typeof input.expectedText === 'string'
    ? body?.includes(input.expectedText)
    : input.expectedText.test(body ?? '')
  assertCondition(
    matched,
    formatGapFailure({
      projectId: input.projectId,
      packId: input.packId,
      ownerClass: input.ownerClass,
      message: `expected visible gap/failure ${String(input.expectedText)}`,
    }),
  )
}

const knownAuthorityOrGap = /runtime-reflection|operation\.accepted|operation\.completed|operation\.failed|evidence\.gap|transportFailure|compile-failure|runtime failure|Runtime reflection manifest unavailable|unavailable|FAIL|PASS/i

const selectHiddenBottomEvidenceTab = async (page: Page, tab: 'Diagnostics' | 'Scenario'): Promise<void> => {
  await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: tab }).evaluate((element) => {
    if (element instanceof HTMLElement) element.click()
  })
}

const clickHostCommand = async (page: Page, name: 'Check' | 'Trial'): Promise<void> => {
  await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name, exact: true }).click()
}

export const assertKnownAuthorityOrGapText = (input: {
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly regionLabel: string
  readonly text: string | undefined | null
}): void => {
  assertCondition(
    input.text && knownAuthorityOrGap.test(input.text),
    formatGapFailure({
      projectId: input.projectId,
      packId: input.packId,
      ownerClass: input.ownerClass,
      message: `${input.regionLabel} should expose existing authority, failure, or evidence gap face`,
    }),
  )
}

export const assertKnownAuthorityOrGap = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly ownerClass: GapOwnerClass
  readonly region: Locator
  readonly regionLabel: string
}): Promise<void> => {
  await assertKnownAuthorityOrGapText({
    projectId: input.projectId,
    packId: input.packId,
    ownerClass: input.ownerClass,
    regionLabel: input.regionLabel,
    text: await input.region.textContent(),
  })
}

export const assertAllRouteGapHarvest = async (input: {
  readonly page: Page
  readonly projectId: string
  readonly packId: ProofPackId
  readonly hasRun: boolean
  readonly hasCheck: boolean
  readonly hasTrialStartup: boolean
  readonly hasActions: boolean
  readonly expectedMissingAuthorityRegions?: ReadonlyArray<{
    readonly ownerClass: GapOwnerClass
    readonly region: Locator
    readonly regionLabel: string
  }>
}): Promise<void> => {
  const { page, projectId, packId } = input
  await assertNoSilentFallback(page, projectId, packId)

  if (input.hasActions) {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'reflection',
      region: page.getByRole('region', { name: 'Action workbench' }),
      regionLabel: 'Action workbench',
    })
  } else {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'reflection',
      region: page.getByRole('region', { name: 'Runtime inspector' }),
      regionLabel: 'Runtime inspector action unavailable state',
    })
  }

  await assertKnownAuthorityOrGap({
    page,
    projectId,
    packId,
    ownerClass: input.hasRun ? 'runtime-run' : 'runtime-run',
    region: page.getByRole('region', { name: 'Program result' }),
    regionLabel: input.hasRun ? 'Program result' : 'Program result unavailable state',
  })

  if (input.hasCheck) {
    if (await page.getByRole('region', { name: 'Check report' }).count() === 0) {
      await clickHostCommand(page, 'Check')
      await page.getByRole('region', { name: 'Check report' }).getByText('PASS', { exact: true }).waitFor({ state: 'visible' })
    }
    await selectHiddenBottomEvidenceTab(page, 'Diagnostics')
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'control-plane-check',
      region: page.getByRole('region', { name: 'Check report' }),
      regionLabel: 'Check report',
    })
  }

  if (input.hasTrialStartup) {
    if (await page.getByRole('region', { name: 'Trial report' }).count() === 0) {
      await clickHostCommand(page, 'Trial')
      await page.getByRole('region', { name: 'Trial report' }).getByText('PASS', { exact: true }).waitFor({ state: 'visible' })
    }
    await selectHiddenBottomEvidenceTab(page, 'Diagnostics')
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: 'control-plane-trial',
      region: page.getByRole('region', { name: 'Trial report' }),
      regionLabel: 'Trial report',
    })
  }

  for (const item of input.expectedMissingAuthorityRegions ?? []) {
    await assertKnownAuthorityOrGap({
      page,
      projectId,
      packId,
      ownerClass: item.ownerClass,
      region: item.region,
      regionLabel: item.regionLabel,
    })
  }

  await assertKnownAuthorityOrGap({
    page,
    projectId,
    packId,
    ownerClass: 'projection',
    region: page.getByRole('region', { name: 'Workbench bottom console' }),
    regionLabel: 'Workbench bottom console',
  })

  await assertKnownAuthorityOrGap({
    page,
    projectId,
    packId,
    ownerClass: 'transport',
    region: page.getByRole('region', { name: 'Program result' }),
    regionLabel: 'Program result transport/compile/runtime face',
  })
}
