import type { Page } from 'playwright'
import type { PlaygroundProject } from '@logixjs/playground/Project'
import type { PlaygroundProofContext, PlaygroundRouteProofRecipe, ProofPackId } from './playground-proof-recipes'
import { assertEvidenceCoordinate, selectBottomEvidenceTab } from './playground-evidence-coordinate'
import { assertAllRouteGapHarvest, assertNoSilentFallback } from './playground-gap-harvest'
import { assertRenderIsolationProbe } from './playground-render-isolation'
import {
  assertNoPageOverflow,
  expectVisible,
  formatProjectLabel,
  getDiagnosticsDemoFixture,
  getHostCommand,
  getPressureFixture,
  gotoProjectRoute,
  routeForPlaygroundProject,
} from './playground-proof-context'

export interface RunProofPackInput {
  readonly page: Page
  readonly baseUrl: string
  readonly project: PlaygroundProject
  readonly recipe: PlaygroundRouteProofRecipe
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const waitForProgramResult = async (page: Page): Promise<void> => {
  await page.getByRole('region', { name: 'Program result' }).waitFor({ state: 'visible' })
}

export const assertAllRouteInvariants = async ({ page, baseUrl, project, recipe }: RunProofPackInput): Promise<void> => {
  await gotoProjectRoute(page, baseUrl, project)
  assertCondition(page.url().endsWith(routeForPlaygroundProject(project)), `${project.id} route should remain stable`)
  await page.getByLabel('Playground project').getByText(formatProjectLabel(project.id)).waitFor({ state: 'visible' })
  await expectVisible(page.getByRole('navigation', { name: 'File navigator' }), `${project.id} file navigator`)
  await expectVisible(page.getByLabel('Source editor'), `${project.id} source editor`)
  await expectVisible(page.getByRole('region', { name: 'Runtime inspector' }), `${project.id} runtime inspector`)
  await expectVisible(page.getByRole('region', { name: 'Workbench bottom console' }), `${project.id} bottom console`)
  if (project.program?.entry) {
    await page.getByRole('navigation', { name: 'File navigator' }).getByRole('button', { name: project.program.entry }).waitFor({ state: 'visible' })
  }
  await assertNoPageOverflow(page, `${project.id} ${recipe.reportLabel}`)
  await assertNoSilentFallback(page, project.id, 'gapHarvest')
}

const assertScrollable = async (page: Page, selector: string, label: string): Promise<void> => {
  const info = await page.locator(selector).evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
    }
  })
  assertCondition(/auto|scroll/.test(info.overflowY), `${label} should own vertical overflow`)
  assertCondition(info.scrollHeight >= info.clientHeight, `${label} scroll height should be at least its client height`)
}

export const runFacetProofPack = async (
  input: RunProofPackInput,
  packId: ProofPackId,
): Promise<void> => {
  const { page, project } = input
  if (packId === 'run') {
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await result.waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: `${project.id} Run`,
      expectedProjectId: project.id,
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
    return
  }
  if (packId === 'runFailure') {
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' })
    await result.getByRole('alert').waitFor({ state: 'visible' })
    const text = await result.textContent()
    assertCondition(text?.includes('run failure demo'), `${project.id} should expose Runtime.run failure`)
    assertCondition(!text?.includes('"value": null'), `${project.id} should not render failed Run as null success`)
    return
  }
  if (packId === 'check') {
    await getHostCommand(page, 'Check').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
    await report.waitFor({ state: 'visible' })
    await report.getByText('PASS', { exact: true }).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Check`,
      expectedProjectId: project.id,
      expectedOperationKind: 'check',
    })
    return
  }
  if (packId === 'checkFailure') {
    const diagnosticsDemo = getDiagnosticsDemoFixture(project)
    assertCondition(diagnosticsDemo, `${project.id} should have diagnostics demo metadata`)
    await getHostCommand(page, 'Check').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
    await report.waitFor({ state: 'visible' })
    await report.getByText('FAIL', { exact: true }).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Check failure`,
      expectedProjectId: project.id,
      expectedOperationKind: 'check',
    })
    await assertDiagnosticsDemoRows(page, project.id, diagnosticsDemo, 'runtime.check/static')
    return
  }
  if (packId === 'trialStartup') {
    await getHostCommand(page, 'Trial').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Trial report' })
    await report.waitFor({ state: 'visible' })
    await report.getByText('PASS', { exact: true }).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Trial`,
      expectedProjectId: project.id,
      expectedOperationKind: 'trialStartup',
    })
    return
  }
  if (packId === 'trialFailure') {
    const diagnosticsDemo = getDiagnosticsDemoFixture(project)
    assertCondition(diagnosticsDemo, `${project.id} should have diagnostics demo metadata`)
    await getHostCommand(page, 'Trial').click()
    const report = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Trial report' })
    await report.waitFor({ state: 'visible' })
    await report.getByText('FAIL', { exact: true }).waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: report,
      diagnostics: page.getByLabel('Diagnostics detail'),
      snapshot: page.getByLabel('Snapshot summary'),
      context: `${project.id} Trial failure`,
      expectedProjectId: project.id,
      expectedOperationKind: 'trialStartup',
    })
    await assertDiagnosticsDemoRows(page, project.id, diagnosticsDemo, 'runtime.trial/startup')
    return
  }
  if (packId === 'actions') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('region', { name: 'Action workbench' }).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'drivers') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
    await page.getByRole('region', { name: 'Drivers' }).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'scenarios') {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
    await page.getByText(/Scenario|Counter demo/).first().waitFor({ state: 'visible' })
    return
  }
  if (packId === 'serviceFiles') {
    await page.getByRole('navigation', { name: 'File navigator' }).getByRole('button', { name: '/src/services/search.service.ts' }).waitFor({ state: 'visible' })
    return
  }
  if (packId === 'pressureVisualCapacity') {
    const pressure = getPressureFixture(project)
    assertCondition(pressure, `${project.id} should have pressure fixture metadata`)
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: pressure.activeInspectorTab }).click()
    const bottomButton = page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: pressure.activeBottomTab })
    await bottomButton.waitFor({ state: 'attached' })
    if (pressure.activeBottomTab === 'Diagnostics' || pressure.activeBottomTab === 'Scenario') {
      await bottomButton.evaluate((element) => {
        if (element instanceof HTMLElement) element.click()
      })
    } else {
      await bottomButton.click()
    }
    if (pressure.dataProfile.actions) await page.getByText(`${pressure.dataProfile.actions} actions`).first().waitFor({ state: 'visible' })
    if (pressure.dataProfile.stateNodes) await page.getByText(new RegExp(`nodes: ${pressure.dataProfile.stateNodes}`)).first().waitFor({ state: 'visible' })
    if (pressure.dataProfile.traceEvents) await page.getByText(String(pressure.dataProfile.traceEvents)).first().waitFor({ state: 'visible' })
    if (pressure.dataProfile.realAuthorities) {
      const diagnostics = page.getByRole('region', { name: 'Diagnostics detail' })
      await diagnostics.getByText('runtime.check/static').first().waitFor({ state: 'visible' })
      await diagnostics.getByText('runtime.trial/startup').first().waitFor({ state: 'visible' })
    }
    if (pressure.dataProfile.payloadBytes) await page.getByLabel('Driver payload JSON').waitFor({ state: 'visible' })
    if (pressure.id === 'action-dense') await assertScrollable(page, '[data-playground-section="actions-list"]', 'action dense actions list')
    if (pressure.id === 'state-large') await assertScrollable(page, '[data-playground-section="state"]', 'state large state tree')
    if (pressure.id === 'trace-heavy') await assertScrollable(page, '[data-playground-section="trace-table"]', 'trace heavy trace table')
    if (pressure.id === 'diagnostics-dense') await assertScrollable(page, '[data-playground-section="diagnostics-table"]', 'diagnostics dense table')
    if (pressure.id === 'scenario-driver-payload') await assertScrollable(page, '[data-playground-section="driver-payload"]', 'driver payload editor')
    return
  }
  if (packId === 'runtimeEvidenceProbe') {
    await getHostCommand(page, 'Run').click()
    const result = page.getByRole('region', { name: 'Program result' }).getByLabel('Run result')
    await result.waitFor({ state: 'visible' })
    await assertEvidenceCoordinate({
      page,
      source: result,
      context: `${project.id} runtimeEvidenceProbe`,
      expectedProjectId: project.id,
      expectedOperationKind: 'run',
      snapshot: page.getByLabel('Snapshot summary'),
      consoleOrState: page.getByRole('region', { name: 'Workbench bottom console' }),
    })
    return
  }
  if (packId === 'gapHarvest') {
    await waitForProgramResult(page)
    await assertAllRouteGapHarvest({
      page,
      projectId: project.id,
      packId,
      hasRun: Boolean(project.capabilities?.run),
      hasCheck: Boolean(project.capabilities?.check),
      hasTrialStartup: Boolean(project.capabilities?.trialStartup),
      hasActions: true,
    })
    return
  }
  if (packId === 'renderIsolationProbe') {
    await assertRenderIsolationProbe({ page, projectId: project.id })
    return
  }
  if (packId === 'boundaryProbe') {
    await assertNoSilentFallback(page, project.id, packId)
    return
  }
}

const assertDiagnosticsDemoRows = async (
  page: Page,
  projectId: string,
  diagnosticsDemo: {
    readonly expectedCodes: ReadonlyArray<string>
    readonly expectedAuthorities: ReadonlyArray<string>
    readonly expectedEvidence: ReadonlyArray<string>
  },
  expectedAuthority: string,
): Promise<void> => {
  await selectBottomEvidenceTab(page, 'Diagnostics')
  const detail = page.getByLabel('Diagnostics detail')
  await detail.waitFor({ state: 'visible' })
  const text = await detail.textContent()
  assertCondition(text, `${projectId} diagnostics detail should expose report rows`)
  for (const code of diagnosticsDemo.expectedCodes) {
    assertCondition(text.includes(code), `${projectId} diagnostics detail should include ${code}`)
  }
  for (const evidence of diagnosticsDemo.expectedEvidence) {
    assertCondition(text.includes(evidence), `${projectId} diagnostics detail should include ${evidence}`)
  }
  assertCondition(
    diagnosticsDemo.expectedAuthorities.includes(expectedAuthority),
    `${projectId} diagnostics fixture should expect ${expectedAuthority}`,
  )
  assertCondition(text.includes(expectedAuthority), `${projectId} diagnostics detail should include ${expectedAuthority}`)
  assertCondition(!text.includes('Pressure diagnostic'), `${projectId} diagnostics detail should not include synthetic pressure rows`)
  assertCondition(!text.includes('LC-0001'), `${projectId} diagnostics detail should not include synthetic LC rows`)
}

export const assertActionDispatchProof = async (
  input: PlaygroundProofContext,
  actionButtonName: string,
  expectedState: RegExp,
): Promise<void> => {
  const { page, project } = input
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: actionButtonName }).click()
  const actionWorkbench = page.getByRole('region', { name: 'Action workbench' })
  await page.getByLabel('Action workbench state preview').getByText(expectedState).waitFor({ state: 'visible' })
  await assertEvidenceCoordinate({
    page,
    source: actionWorkbench.getByLabel('Dispatch result'),
    context: `${project.id} ${actionButtonName}`,
    expectedProjectId: project.id,
    expectedOperationKind: 'dispatch',
    snapshot: page.getByLabel('Snapshot summary'),
    consoleOrState: page.getByLabel('Action workbench state preview'),
  })
}

export const runProjectProofRecipe = async (input: RunProofPackInput): Promise<void> => {
  await assertAllRouteInvariants(input)
  for (const packId of input.recipe.proofPackIds) {
    await runFacetProofPack(input, packId)
  }
  await input.recipe.assertDemoProof?.({
    page: input.page,
    baseUrl: input.baseUrl,
    project: input.project,
    route: routeForPlaygroundProject(input.project),
  })
}
