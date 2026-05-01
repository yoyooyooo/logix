import { strict as assert } from 'node:assert'
import { AddressInfo } from 'node:net'
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import { createServer, type ViteDevServer } from 'vite'
import type { PlaygroundProject } from '@logixjs/playground/Project'
import {
  assertProofRecipeCoverage,
  logixReactPlaygroundProofRecipes,
} from './playground-proof-recipes'
import { runProjectProofRecipe } from './playground-proof-packs'

const root = new URL('../..', import.meta.url).pathname
const viewport = { width: 1366, height: 768 }

type ScrollInfo = {
  readonly scrollHeight: number
  readonly clientHeight: number
  readonly overflowY: string
}

type Box = {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

const routes = {
  default: '/playground/logix-react.new-project',
  localCounter: '/playground/logix-react.local-counter',
  bare: '/playground',
  actionDense: '/playground/logix-react.pressure.action-dense',
  stateLarge: '/playground/logix-react.pressure.state-large',
  traceHeavy: '/playground/logix-react.pressure.trace-heavy',
  diagnosticsDense: '/playground/logix-react.pressure.diagnostics-dense',
  diagnosticsCheckImports: '/playground/logix-react.diagnostics.check-imports',
  diagnosticsTrialMissingConfig: '/playground/logix-react.diagnostics.trial-missing-config',
  driverPayload: '/playground/logix-react.pressure.scenario-driver-payload',
} as const

async function main() {
  const server = await createServer({
    root,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
    configFile: new URL('../../vite.config.ts', import.meta.url).pathname,
  })
  let browser: Browser | undefined

  try {
    await server.listen()
    const baseUrl = getServerUrl(server)
    const registry = await loadPlaygroundRegistry(server)
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport })

    await run('default Monaco TypeScript language service', () => assertDefaultMonacoTypeService(page, baseUrl))
    await run('default desktop shell regions', () => assertDefaultShell(page, baseUrl))
    await run('resizable workbench handles', () => assertResizableWorkbenchHandles(page, baseUrl))
    await run('bottom drawer collapse restores saved height', () => assertBottomDrawerCollapseRestoresSavedHeight(page, baseUrl))
    await run('pressure fixture shell regions', () => assertPressureShells(page, baseUrl))
    await run('pressure visual defaults and local scroll contracts', () => assertPressureVisualContracts(page, baseUrl))
    await run('inspector local scroll ownership', () => assertInspectorScrollOwnership(page, baseUrl))
    await run('bottom drawer local scroll ownership', () => assertBottomDrawerScrollOwnership(page, baseUrl))
    await run('default action dispatch runtime session', () => assertDefaultActionDispatch(page, baseUrl))
    await run('default driver and scenario runtime session', () => assertDefaultDriverAndScenario(page, baseUrl))
    await run('default top run result', () => assertDefaultTopRun(page, baseUrl))
    await run('action-dense top run result', () => assertActionDenseTopRun(page, baseUrl))
    await run('default top trial diagnostics', () => assertDefaultTopTrial(page, baseUrl))
    await run('diagnostics demo real Runtime reports', () => assertDiagnosticsDemoRealReports(page, baseUrl))
    await run('bare route opens default project', () => assertBareRoute(page, baseUrl))
    await run('top project switcher navigates between registered projects', () => assertTopProjectSwitcher(page, baseUrl))
    await run('registry-indexed dogfood proof recipes', () => assertRegistryIndexedDogfoodProofs(page, baseUrl, registry))

    console.log('playground route Playwright contract passed')
  } finally {
    await browser?.close()
    await server.close()
  }
}

async function run(name: string, body: () => Promise<void>): Promise<void> {
  try {
    await body()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

async function loadPlaygroundRegistry(server: ViteDevServer): Promise<ReadonlyArray<PlaygroundProject>> {
  const mod = await server.ssrLoadModule('/src/playground/registry.ts') as {
    readonly logixReactPlaygroundRegistry: ReadonlyArray<PlaygroundProject>
  }
  return mod.logixReactPlaygroundRegistry
}

async function assertRegistryIndexedDogfoodProofs(
  page: Page,
  baseUrl: string,
  registry: ReadonlyArray<PlaygroundProject>,
): Promise<void> {
  assertProofRecipeCoverage(registry, logixReactPlaygroundProofRecipes)
  const recipes = logixReactPlaygroundProofRecipes as Record<string, typeof logixReactPlaygroundProofRecipes[keyof typeof logixReactPlaygroundProofRecipes]>
  for (const project of registry) {
    const recipe = recipes[project.id]
    assert(recipe, `Missing proof recipe for ${project.id}`)
    await runProjectProofRecipe({ page, baseUrl, project, recipe })
    console.log(`PASS ${project.id} ${recipe.proofPackIds.join(',')}`)
  }
}

function getServerUrl(server: ViteDevServer): string {
  const address = server.httpServer?.address()
  assert(address && typeof address !== 'string', 'Vite dev server did not expose a TCP address')
  const { port } = address as AddressInfo
  return `http://127.0.0.1:${port}`
}

async function gotoPlayground(page: Page, baseUrl: string, path: string): Promise<void> {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  await page.getByText('Logix Playground').waitFor({ state: 'visible' })
}

async function assertDefaultShell(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)

  await expectVisible(getHostCommand(page, 'Run'), 'Run command')
  assert(!await page.locator('[data-playground-region="top-command-bar"]').getByText('Examples').isVisible(), 'top command bar should not render a route-level back button')
  await expectVisible(page.getByRole('navigation', { name: 'File navigator' }), 'file navigator')
  await expectVisible(page.getByLabel('Source editor'), 'source editor')
  await expectVisible(page.getByRole('region', { name: 'Runtime inspector' }), 'runtime inspector')
  await expectVisible(page.getByRole('region', { name: 'Workbench bottom console' }), 'bottom console')

  const regions = await getRequiredRegionBoxes(page)
  assertNoPageOverflow(await getPageScrollHeight(page))
  assertPositiveBoxes(regions)
  assertShellRegionsDoNotOverlap(regions)
  assertDefaultShellGeometry(regions)
}

async function assertDefaultMonacoTypeService(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)
  await assertDarkSourceEditor(page, routes.default)

  await page.waitForTimeout(3500)
  const importSquiggles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.squiggly-error, .squiggly-warning, .squiggly-info')).map((node) => {
      const line = node.closest('.view-line')?.textContent ?? ''
      const rect = node.getBoundingClientRect()
      return { line, className: node.className, x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }).filter((marker) => marker.line.includes('from')),
  )
  assert.deepEqual(importSquiggles, [], `Monaco should resolve package and virtual source imports: ${JSON.stringify(importSquiggles)}`)

  const editorBox = await page.locator('.monaco-editor.vs-dark').first().boundingBox()
  assert(editorBox, 'Monaco editor should have a bounding box before completion probe')
  await page.mouse.click(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height / 2)
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End')
  await page.keyboard.type('\nLogix.M')
  await page.keyboard.press('Control+Space')
  await page.locator('.suggest-widget.visible').waitFor({ state: 'visible', timeout: 10000 })
  const suggestions = await page.locator('.suggest-widget .monaco-list-row .label-name').evaluateAll((nodes) =>
    nodes.slice(0, 40).map((node) => node.textContent ?? ''),
  )
  assert(suggestions.includes('Module'), `Monaco should expose @logixjs/core completions for Logix.M: ${JSON.stringify(suggestions)}`)
}

async function assertResizableWorkbenchHandles(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)

  const initial = await getRequiredRegionBoxes(page)
  const initialState = await getWorkbenchLayoutState(page)
  await dragSeparator(page, 'Resize files panel', 72, 0)
  await waitForWorkbenchLayoutState(page, 'filesWidth', initialState.filesWidth + 40)
  const afterFiles = await getRequiredRegionBoxes(page)
  assert(
    afterFiles['files-panel'].width >= initial['files-panel'].width + 40,
    `files panel should grow after dragging its separator: ${afterFiles['files-panel'].width} <= ${initial['files-panel'].width}`,
  )
  assertShellRegionsDoNotOverlap(afterFiles)
  assertNoPageOverflow(await getPageScrollHeight(page), 'files resize')

  await dragSeparator(page, 'Resize runtime inspector', -72, 0)
  await waitForWorkbenchLayoutState(page, 'inspectorWidth', initialState.inspectorWidth + 40)
  const afterInspector = await getRequiredRegionBoxes(page)
  assert(
    afterInspector['runtime-inspector'].width >= afterFiles['runtime-inspector'].width + 40,
    `runtime inspector should grow after dragging its separator: ${afterInspector['runtime-inspector'].width} <= ${afterFiles['runtime-inspector'].width}`,
  )
  assertShellRegionsDoNotOverlap(afterInspector)
  assertNoPageOverflow(await getPageScrollHeight(page), 'inspector resize')

  await dragSeparator(page, 'Resize bottom drawer', 0, -72)
  await waitForWorkbenchLayoutState(page, 'bottomHeight', initialState.bottomHeight + 40)
  const afterBottom = await getRequiredRegionBoxes(page)
  assert(
    afterBottom['bottom-evidence-drawer'].height >= afterInspector['bottom-evidence-drawer'].height + 40,
    `bottom drawer should grow after dragging its separator: ${afterBottom['bottom-evidence-drawer'].height} <= ${afterInspector['bottom-evidence-drawer'].height}`,
  )
  assertShellRegionsDoNotOverlap(afterBottom)
  assertNoPageOverflow(await getPageScrollHeight(page), 'bottom resize')
}

async function assertBottomDrawerCollapseRestoresSavedHeight(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)

  const initialBoxes = await getRequiredRegionBoxes(page)
  const initialLayout = await getWorkbenchLayoutState(page)
  assert(
    initialBoxes['bottom-evidence-drawer'].height >= 184,
    `bottom drawer should start expanded near its saved height: ${initialBoxes['bottom-evidence-drawer'].height}`,
  )

  await page.getByRole('button', { name: 'Collapse bottom panel' }).click()
  await waitForBottomCollapsedState(page, true)
  const collapsedBoxes = await getRequiredRegionBoxes(page)
  const collapsedLayout = await getWorkbenchLayoutState(page)
  assert(
    collapsedBoxes['bottom-evidence-drawer'].height <= 40,
    `bottom drawer should collapse to the tab bar: ${collapsedBoxes['bottom-evidence-drawer'].height}`,
  )
  assert.equal(collapsedLayout.bottomHeight, initialLayout.bottomHeight, 'collapsed drawer should preserve saved bottom height')

  await page.getByRole('button', { name: 'Expand bottom panel' }).click()
  await waitForBottomCollapsedState(page, false)
  await page.waitForTimeout(200)
  const expandedBoxes = await getRequiredRegionBoxes(page)
  const expandedLayout = await getWorkbenchLayoutState(page)
  assert(
    expandedBoxes['bottom-evidence-drawer'].height >= initialBoxes['bottom-evidence-drawer'].height - 4,
    `bottom drawer should restore saved height after expand: ${expandedBoxes['bottom-evidence-drawer'].height} < ${initialBoxes['bottom-evidence-drawer'].height}`,
  )
  assert.equal(expandedLayout.bottomHeight, initialLayout.bottomHeight, 'expanded drawer should not overwrite saved bottom height')
}

async function assertPressureShells(page: Page, baseUrl: string): Promise<void> {
  const pressureRoutes = [
    routes.actionDense,
    routes.stateLarge,
    routes.traceHeavy,
    routes.diagnosticsDense,
    routes.driverPayload,
  ] as const

  for (const route of pressureRoutes) {
    await gotoPlayground(page, baseUrl, route)
    await expectVisible(getHostCommand(page, 'Run'), `Run command for ${route}`)
    await expectVisible(page.getByRole('navigation', { name: 'File navigator' }), `file navigator for ${route}`)
    await expectVisible(page.getByLabel('Source editor'), `source editor for ${route}`)
    await expectVisible(page.getByRole('region', { name: 'Runtime inspector' }), `runtime inspector for ${route}`)
    await expectVisible(page.getByRole('region', { name: 'Workbench bottom console' }), `bottom console for ${route}`)
    assertNoPageOverflow(await getPageScrollHeight(page), route)
  }
}

async function assertPressureVisualContracts(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.actionDense)
  await assertActiveRuntimeTab(page, 'Actions')
  await assertActiveBottomTab(page, 'Console')
  await assertDarkSourceEditor(page, routes.actionDense)
  await assertPressureFileTree(page, routes.actionDense)
  await assertStrictScrollable(page, '[data-playground-section="actions-list"]', 'Action dense actions list')
  await expectVisible(page.getByRole('textbox', { name: 'Search actions' }), 'action search')
  assertNoPageOverflow(await getPageScrollHeight(page), routes.actionDense)

  await gotoPlayground(page, baseUrl, routes.stateLarge)
  await assertActiveRuntimeTab(page, 'Actions')
  await assertActiveBottomTab(page, 'Snapshot')
  await assertDarkSourceEditor(page, routes.stateLarge)
  await assertPressureFileTree(page, routes.stateLarge)
  await assertStrictScrollable(page, '[data-playground-section="state"]', 'State large state tree')
  await expectVisible(page.getByText(/nodes: 420/), 'state pressure node count')
  await assertDrawerContained(page, routes.stateLarge)

  await gotoPlayground(page, baseUrl, routes.traceHeavy)
  await assertActiveRuntimeTab(page, 'Actions')
  await assertActiveBottomTab(page, 'Trace')
  await assertDarkSourceEditor(page, routes.traceHeavy)
  await assertPressureFileTree(page, routes.traceHeavy)
  await assertStrictScrollable(page, '[data-playground-section="trace-table"]', 'Trace heavy trace table')
  await expectVisible(page.getByText('1200').first(), 'trace pressure row count')
  await assertDrawerContained(page, routes.traceHeavy)

  await gotoPlayground(page, baseUrl, routes.diagnosticsDense)
  await assertActiveRuntimeTab(page, 'Diagnostics')
  await assertActiveBottomTab(page, 'Diagnostics')
  await assertDarkSourceEditor(page, routes.diagnosticsDense)
  await assertPressureFileTree(page, routes.diagnosticsDense)
  await assertScrollable(await getScrollInfo(page, '[data-playground-region="runtime-inspector"] [data-playground-section="diagnostics-summary"]'), 'Diagnostics dense summary')
  await expectVisible(page.getByRole('region', { name: 'Diagnostics detail' }).getByText('No Check/Trial diagnostics captured.'), 'empty real diagnostics table')
  const diagnosticsText = await page.getByRole('region', { name: 'Diagnostics detail' }).textContent()
  assert(!diagnosticsText?.includes('LC-0001'), 'diagnostics dense route should not render synthetic LC diagnostics')
  assert(!diagnosticsText?.includes('Pressure diagnostic'), 'diagnostics dense route should not render synthetic pressure diagnostics')
  await expectVisible(
    page.getByRole('region', { name: 'Diagnostics detail' }).getByText('No Check/Trial diagnostics captured.'),
    'empty real diagnostics state',
  )
  await assertDrawerContained(page, routes.diagnosticsDense)

  await gotoPlayground(page, baseUrl, routes.driverPayload)
  await assertActiveRuntimeTab(page, 'Drivers')
  await assertActiveBottomTab(page, 'Scenario')
  await assertDarkSourceEditor(page, routes.driverPayload)
  await assertPressureFileTree(page, routes.driverPayload)
  await assertStrictScrollable(page, '[data-playground-section="drivers"]', 'Driver payload driver list')
  await assertStrictScrollable(page, '[data-playground-section="driver-payload"]', 'Driver payload editor')
  await assertStrictScrollable(page, '[data-playground-region="bottom-evidence-drawer"] [data-playground-section="scenario"]', 'Scenario step list')
  await expectVisible(page.getByLabel('Driver payload JSON'), 'driver payload JSON editor')
  await assertDrawerContained(page, routes.driverPayload)
}

async function assertInspectorScrollOwnership(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.actionDense)
  await expectVisible(page.getByRole('region', { name: 'Action workbench' }), 'action workbench')
  const actions = await getScrollInfo(page, '[data-playground-section="actions-list"]')
  assertScrollable(actions, 'RuntimeInspector.ActionsList')
  assertNoPageOverflow(await getPageScrollHeight(page), routes.actionDense)

  await gotoPlayground(page, baseUrl, routes.stateLarge)
  await expectVisible(page.getByRole('region', { name: 'State' }), 'state region')
  const state = await getScrollInfo(page, '[data-playground-section="state"]')
  assertScrollable(state, 'RuntimeInspector.StateTree')
  assertNoPageOverflow(await getPageScrollHeight(page), routes.stateLarge)
}

async function assertBottomDrawerScrollOwnership(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.diagnosticsDense)
  await expectVisible(page.getByRole('region', { name: 'Diagnostics detail' }), 'diagnostics detail')
  await assertDrawerContained(page, routes.diagnosticsDense)

  await gotoPlayground(page, baseUrl, routes.traceHeavy)
  await expectVisible(page.getByLabel('Trace detail'), 'trace detail')
  await assertDrawerContained(page, routes.traceHeavy)
}

async function assertBareRoute(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.bare)
  await expectVisible(page.getByLabel('Playground project').getByText('new project'), 'default project label')
  await expectVisible(page.getByRole('navigation', { name: 'File navigator' }).getByText('main.program.ts'), 'default program entry')
  await expectVisible(page.getByRole('region', { name: 'Program result' }), 'program result')
  assertNoPageOverflow(await getPageScrollHeight(page), routes.bare)
}

async function assertTopProjectSwitcher(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)

  const switcher = page.getByLabel('Playground project')
  await expectVisible(switcher, 'project switcher')
  const initialBox = await switcher.boundingBox()
  assert(initialBox, 'project switcher should have an initial bounding box')
  assert(initialBox.width > 120, `project switcher should not keep a narrow max width: ${initialBox.width}`)
  assert(initialBox.height <= 28, `project switcher should stay on one line: ${initialBox.height}`)
  assert((await switcher.textContent())?.includes('new project'), 'project switcher should show the project name without the shared prefix')
  assert(!(await switcher.textContent())?.includes('logix-react.'), 'project switcher should omit the shared project id prefix')
  await switcher.click()
  const serviceOption = page.getByRole('option', { name: 'service-source' })
  await serviceOption.waitFor({ state: 'visible' })
  const triggerBox = await switcher.boundingBox()
  const popupBox = await page.locator('[data-slot="select-content"]').boundingBox()
  assert(triggerBox, 'project switcher should have a bounding box')
  assert(popupBox, 'project switcher popup should have a bounding box')
  assert(popupBox.width >= 180, `project popup should keep at least 180px width: ${popupBox.width}`)
  assert(Math.abs(popupBox.x - triggerBox.x) <= 1, `project popup should align to the trigger left edge: ${popupBox.x} !== ${triggerBox.x}`)
  await serviceOption.click()

  await page.waitForURL(`${baseUrl}/playground/logix-react.service-source`)
  await page.getByLabel('Playground project').getByText('service-source').waitFor({ state: 'visible' })
  await expectVisible(page.getByRole('navigation', { name: 'File navigator' }).getByText('search.service.ts'), 'service source file')
  assertNoPageOverflow(await getPageScrollHeight(page), routes.default)
}

async function assertDefaultActionDispatch(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)
  await page.getByRole('button', { name: 'Dispatch start' }).click()

  const consoleRegion = page.getByRole('region', { name: 'Workbench bottom console' })
  await consoleRegion.getByText('dispatch accepted start').waitFor({ state: 'visible' })
  await consoleRegion.getByText('dispatch completed start').waitFor({ state: 'visible' })
  await page.getByLabel('Action workbench state preview').getByText(/"ready": true/).waitFor({ state: 'visible' })
  const consoleText = await consoleRegion.textContent()
  assert(!consoleText?.includes('Effect.tryPromise'), 'dispatch console should not expose generic Effect.tryPromise error')
  assert(!consoleText?.includes('dispatch failed start'), 'dispatch should not fail')
  assert(!await pageContainsText(page, '[object Event]'), 'dispatch path should not leak React event objects')
}

async function assertDefaultDriverAndScenario(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.localCounter)
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
  await page.getByRole('button', { name: 'Run driver Increase' }).click()
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Actions' }).click()
  await page.getByLabel('Action workbench state preview').getByText(/"count": 1/).waitFor({ state: 'visible' })
  assert(!await pageContainsText(page, '[object Event]'), 'driver path should not leak React event objects')

  await getHostCommand(page, 'Reset').click()
  await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Drivers' }).click()
  await page.getByRole('button', { name: 'Run scenario Counter demo' }).click()
  const scenarioDetail = page.getByRole('region', { name: 'Scenario detail' })
  await scenarioDetail.getByText('expect-state').waitFor({ state: 'visible' })
  await scenarioDetail.getByText(/expect \/ passed/).waitFor({ state: 'visible' })
  const detailText = await scenarioDetail.textContent()
  assert(!detailText?.includes('scenario-expectation'), 'scenario should not fail expectation after driver dispatch')
  assert(!detailText?.includes('Expected state to be changed'), 'scenario expectation should observe updated state')
  assert(!await pageContainsText(page, '[object Event]'), 'scenario path should not leak React event objects')
}

async function assertDefaultTopRun(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)
  await getHostCommand(page, 'Run').click()
  const result = page.getByRole('region', { name: 'Program result' })
  await result.getByText(/"ready": true/).waitFor({ state: 'visible' })
  assert(!await pageContainsText(page, '[object Event]'), 'top Run path should not leak event objects into runtime result')
}

async function assertActionDenseTopRun(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.actionDense)
  await getHostCommand(page, 'Run').click()
  const result = page.getByRole('region', { name: 'Program result' })
  await result.getByText(/"count": 74/).waitFor({ state: 'visible' })
  await result.getByText(/"label": "action-dense"/).waitFor({ state: 'visible' })
  const resultText = await result.textContent()
  assert(!resultText?.includes('"value": null'), 'action-dense Run should project the pressure fixture value')
}

async function assertDefaultTopTrial(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.default)
  await getHostCommand(page, 'Trial').click()
  const result = page.getByRole('region', { name: 'Program result' })
  await result.getByRole('region', { name: 'Trial report' }).getByText('startup').waitFor({ state: 'visible' })
  await result.getByRole('region', { name: 'Trial report' }).getByText('PASS', { exact: true }).waitFor({ state: 'visible' })

  const bodyText = await page.locator('body').textContent()
  assert(!bodyText?.includes('Multiple exports with the same name "default"'), 'Trial should not emit duplicate default export compile failure')
  assert(!bodyText?.includes('编译失败: trial wrapper'), 'Trial should not emit sandbox trial wrapper compile failure')
}

async function assertDiagnosticsDemoRealReports(page: Page, baseUrl: string): Promise<void> {
  await gotoPlayground(page, baseUrl, routes.diagnosticsCheckImports)
  await getHostCommand(page, 'Check').click()
  const checkReport = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Check report' })
  await checkReport.getByText('FAIL', { exact: true }).waitFor({ state: 'visible' })
  await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Diagnostics' }).evaluate((element) => {
    if (element instanceof HTMLElement) element.click()
  })
  const checkDiagnostics = page.getByRole('region', { name: 'Diagnostics detail' })
  await checkDiagnostics.getByText('PROGRAM_IMPORT_INVALID').waitFor({ state: 'visible' })
  await checkDiagnostics.getByText('PROGRAM_IMPORT_DUPLICATE').waitFor({ state: 'visible' })
  await checkDiagnostics.getByText('runtime.check/static').first().waitFor({ state: 'visible' })
  const checkText = await checkDiagnostics.textContent()
  assert(checkText?.includes('Program.capabilities.imports[2]'), 'check diagnostics should include invalid import coordinate')
  assert(checkText?.includes('Program.capabilities.imports:Diagnostics.CheckImports.Child'), 'check diagnostics should include duplicate import coordinate')
  assert(!checkText?.includes('LC-0001'), 'check diagnostics should not contain synthetic LC rows')
  assert(!checkText?.includes('Pressure diagnostic'), 'check diagnostics should not contain synthetic pressure rows')

  await gotoPlayground(page, baseUrl, routes.diagnosticsTrialMissingConfig)
  await getHostCommand(page, 'Trial').click()
  const trialReport = page.getByRole('region', { name: 'Program result' }).getByRole('region', { name: 'Trial report' })
  await trialReport.getByText('FAIL', { exact: true }).waitFor({ state: 'visible' })
  await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Diagnostics' }).evaluate((element) => {
    if (element instanceof HTMLElement) element.click()
  })
  const trialDiagnostics = page.getByRole('region', { name: 'Diagnostics detail' })
  await trialDiagnostics.getByText('MissingDependency').first().waitFor({ state: 'visible' })
  await trialDiagnostics.getByText('runtime.trial/startup').first().waitFor({ state: 'visible' })
  const trialText = await trialDiagnostics.textContent()
  assert(trialText?.includes('config:MISSING_CONFIG_KEY'), 'trial diagnostics should include missing config coordinate')
  assert(!trialText?.includes('LC-0001'), 'trial diagnostics should not contain synthetic LC rows')
  assert(!trialText?.includes('Pressure diagnostic'), 'trial diagnostics should not contain synthetic pressure rows')
}

function getHostCommand(page: Page, name: string): Locator {
  return page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name, exact: true })
}

async function dragSeparator(page: Page, name: string, deltaX: number, deltaY: number): Promise<void> {
  const separator = page.getByRole('separator', { name, exact: true })
  const box = await separator.boundingBox()
  assert(box, `${name} separator should have a bounding box`)
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(100)
}

async function getWorkbenchLayoutState(page: Page): Promise<{
  readonly filesWidth: number
  readonly inspectorWidth: number
  readonly bottomHeight: number
}> {
  return await page.getByTestId('resizable-workbench').evaluate((element) => ({
    filesWidth: Number(element.getAttribute('data-files-width')),
    inspectorWidth: Number(element.getAttribute('data-inspector-width')),
    bottomHeight: Number(element.getAttribute('data-bottom-height')),
  }))
}

async function waitForWorkbenchLayoutState(
  page: Page,
  key: 'filesWidth' | 'inspectorWidth' | 'bottomHeight',
  minimum: number,
): Promise<void> {
  const attribute = key === 'filesWidth'
    ? 'data-files-width'
    : key === 'inspectorWidth'
      ? 'data-inspector-width'
      : 'data-bottom-height'
  await page.waitForFunction(
    ({ attributeName, minValue }) => {
      const value = Number(document.querySelector('[data-testid="resizable-workbench"]')?.getAttribute(attributeName))
      return Number.isFinite(value) && value >= minValue
    },
    { attributeName: attribute, minValue: minimum },
  )
}

async function waitForBottomCollapsedState(page: Page, collapsed: boolean): Promise<void> {
  await page.waitForFunction(
    (expected) =>
      document.querySelector('[data-testid="resizable-workbench"]')?.getAttribute('data-bottom-collapsed') === expected,
    collapsed ? 'true' : 'false',
  )
}

async function expectVisible(locator: Locator, label: string): Promise<void> {
  assert(await locator.isVisible(), `${label} should be visible`)
}

async function getRequiredRegionBoxes(page: Page): Promise<Record<string, Box>> {
  const selectors = [
    'top-command-bar',
    'files-panel',
    'source-editor',
    'runtime-inspector',
    'bottom-evidence-drawer',
  ] as const

  const entries = await Promise.all(
    selectors.map(async (selector) => {
      const box = await page.locator(`[data-playground-region="${selector}"]`).boundingBox()
      assert(box, `${selector} should have a bounding box`)
      return [
        selector,
        {
          left: box.x,
          right: box.x + box.width,
          top: box.y,
          bottom: box.y + box.height,
          width: box.width,
          height: box.height,
        },
      ] as const
    }),
  )

  return Object.fromEntries(entries)
}

function assertPositiveBoxes(boxes: Record<string, Box>): void {
  for (const [name, box] of Object.entries(boxes)) {
    assert(box.width > 0, `${name} width should be positive`)
    assert(box.height > 0, `${name} height should be positive`)
  }
}

function assertShellRegionsDoNotOverlap(boxes: Record<string, Box>): void {
  const top = boxes['top-command-bar']
  const files = boxes['files-panel']
  const source = boxes['source-editor']
  const inspector = boxes['runtime-inspector']
  const bottom = boxes['bottom-evidence-drawer']

  assert(top.bottom <= files.top + 1, 'top command bar should sit above body regions')
  assert(top.bottom <= source.top + 1, 'top command bar should sit above source editor')
  assert(top.bottom <= inspector.top + 1, 'top command bar should sit above runtime inspector')
  assert(files.right <= source.left + 1, 'files panel should sit left of source editor')
  assert(source.right <= inspector.left + 1, 'source editor should sit left of runtime inspector')
  assert(files.bottom <= bottom.top + 1, 'files panel should sit above bottom drawer')
  assert(source.bottom <= bottom.top + 1, 'source editor should sit above bottom drawer')
  assert(inspector.bottom <= bottom.top + 1, 'runtime inspector should sit above bottom drawer')
}

function assertDefaultShellGeometry(boxes: Record<string, Box>): void {
  const top = boxes['top-command-bar']
  const files = boxes['files-panel']
  const source = boxes['source-editor']
  const inspector = boxes['runtime-inspector']
  const bottom = boxes['bottom-evidence-drawer']

  assert(top.top <= 1, `top command bar should start at viewport top: ${top.top}`)
  assert(top.height >= 40 && top.height <= 48, `top command bar height should stay within the spec range 40-48px: ${top.height}`)
  assert(files.width >= 248 && files.width <= 264, `files panel width should stay near default 256px: ${files.width}`)
  assert(inspector.width >= 332 && inspector.width <= 348, `runtime inspector width should stay near default 340px: ${inspector.width}`)
  assert(bottom.height >= 184 && bottom.height <= 204, `bottom drawer height should stay near default 192px: ${bottom.height}`)
  assert(source.width > files.width, `source editor should be wider than files panel: ${source.width} <= ${files.width}`)
  assert(source.width > inspector.width, `source editor should be wider than runtime inspector: ${source.width} <= ${inspector.width}`)
  assert(bottom.bottom <= viewport.height + 1, `bottom drawer should remain inside viewport: ${bottom.bottom}`)
}

async function getScrollInfo(page: Page, selector: string): Promise<ScrollInfo> {
  return await page.locator(selector).evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
    }
  })
}

async function getPageScrollHeight(page: Page): Promise<number> {
  return await page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0)
}

async function pageContainsText(page: Page, text: string): Promise<boolean> {
  return (await page.locator('body').textContent())?.includes(text) ?? false
}

async function assertActiveRuntimeTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name, exact: true })
  assert(await tab.isVisible(), `${name} runtime tab should be visible`)
  assert(await tab.getAttribute('aria-pressed') === 'true', `${name} runtime tab should be active`)
}

async function assertActiveBottomTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name, exact: true })
  assert(await tab.isVisible(), `${name} bottom tab should be visible`)
  assert(await tab.getAttribute('aria-pressed') === 'true', `${name} bottom tab should be active`)
}

async function assertDarkSourceEditor(page: Page, context: string): Promise<void> {
  const editor = page.locator('[data-testid="monaco-source-editor"][data-editor-engine="monaco"]').first()
  await editor.waitFor({ state: 'visible' })
  assert(await page.locator('.monaco-editor.vs-dark').first().isVisible(), `${context} source editor should use dark Monaco theme`)
}

async function assertPressureFileTree(page: Page, context: string): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'File navigator' })
  await expectVisible(nav.getByText('src').first(), `${context} src folder`)
  await expectVisible(nav.getByRole('button', { name: '/src/actions.ts' }), `${context} actions source`)
  await expectVisible(nav.getByRole('button', { name: '/src/drivers.ts' }), `${context} drivers source`)
  await expectVisible(nav.getByRole('button', { name: '/README.md' }), `${context} readme source`)
}

function assertScrollable(info: ScrollInfo, label: string): void {
  assert(/auto|scroll/.test(info.overflowY), `${label} should own vertical overflow`)
  assert(info.scrollHeight >= info.clientHeight, `${label} scroll height should be at least its client height`)
}

async function assertStrictScrollable(page: Page, selector: string, label: string): Promise<void> {
  const info = await getScrollInfo(page, selector)
  assert(/auto|scroll/.test(info.overflowY), `${label} should own vertical overflow`)
  const text = await page.locator(selector).textContent()
  assert(
    info.scrollHeight > info.clientHeight + 1,
    `${label} should have real overflow: ${JSON.stringify({ ...info, text: text?.slice(0, 240) })}`,
  )
}

async function assertDrawerContained(page: Page, context: string): Promise<void> {
  const drawer = await getScrollInfo(page, '[data-playground-region="bottom-evidence-drawer"]')
  assert(drawer.scrollHeight <= drawer.clientHeight + 1, `${context} bottom drawer should not own outer overflow`)
  assertNoPageOverflow(await getPageScrollHeight(page), context)
}

function assertNoPageOverflow(scrollHeight: number, context = 'page'): void {
  assert(scrollHeight <= viewport.height + 1, `${context} should not create page overflow: ${scrollHeight}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
