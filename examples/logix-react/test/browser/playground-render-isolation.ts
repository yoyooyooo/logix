import type { Page } from 'playwright'

export type PlaygroundRegionId =
  | 'top-command-bar'
  | 'files-panel'
  | 'source-editor'
  | 'runtime-inspector'
  | 'bottom-evidence-drawer'

export interface RenderIsolationProbeInput {
  readonly page: Page
  readonly projectId: string
}

interface RenderStats {
  readonly commits: Record<string, number>
  readonly mounts: Record<string, number>
}

const regionIds: ReadonlyArray<PlaygroundRegionId> = [
  'top-command-bar',
  'files-panel',
  'source-editor',
  'runtime-inspector',
  'bottom-evidence-drawer',
]

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const resetProbe = async (page: Page): Promise<void> => page.evaluate(() => {
  ;(window as typeof window & {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: RenderStats
  }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__ = { commits: {}, mounts: {} }
})

const readStats = async (page: Page): Promise<RenderStats> => page.evaluate(() => {
  const probe = (window as typeof window & {
    __LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__?: {
      commits: Record<string, number>
      mounts: Record<string, number>
    }
  }).__LOGIX_PLAYGROUND_RENDER_ISOLATION_PROBE__
  return {
    commits: { ...(probe?.commits ?? {}) },
    mounts: { ...(probe?.mounts ?? {}) },
  }
})

const diffStats = (before: RenderStats, after: RenderStats): RenderStats => {
  const commits: Record<string, number> = {}
  const mounts: Record<string, number> = {}
  for (const id of regionIds) {
    commits[id] = (after.commits[id] ?? 0) - (before.commits[id] ?? 0)
    mounts[id] = (after.mounts[id] ?? 0) - (before.mounts[id] ?? 0)
  }
  return { commits, mounts }
}

const assertFanout = (
  projectId: string,
  trigger: string,
  diff: RenderStats,
  allowedRegions: ReadonlyArray<PlaygroundRegionId>,
): void => {
  const allowed = new Set(allowedRegions)
  const committed = Object.entries(diff.commits)
    .filter(([, count]) => count > 0)
    .map(([region]) => region)
  const remounted = Object.entries(diff.mounts)
    .filter(([, count]) => count > 0)
    .map(([region]) => region)
  const disallowedCommits = committed.filter((region) => !allowed.has(region as PlaygroundRegionId))
  const disallowedRemounts = remounted.filter((region) => !allowed.has(region as PlaygroundRegionId))
  assertCondition(
    disallowedCommits.length === 0,
    `${projectId} ${trigger} committed unrelated regions: ${disallowedCommits.join(', ')}; diff=${JSON.stringify(diff.commits)}`,
  )
  assertCondition(
    disallowedRemounts.length === 0,
    `${projectId} ${trigger} remounted unrelated regions: ${disallowedRemounts.join(', ')}; diff=${JSON.stringify(diff.mounts)}`,
  )
}

const triggerAndAssert = async (
  page: Page,
  projectId: string,
  trigger: string,
  allowedRegions: ReadonlyArray<PlaygroundRegionId>,
  action: () => Promise<void>,
): Promise<void> => {
  const before = await readStats(page)
  await action()
  await page.waitForTimeout(80)
  const after = await readStats(page)
  assertFanout(projectId, trigger, diffStats(before, after), allowedRegions)
}

export const assertRenderIsolationProbe = async ({ page, projectId }: RenderIsolationProbeInput): Promise<void> => {
  await resetProbe(page)
  await triggerAndAssert(page, projectId, 'inspector tab change', ['runtime-inspector'], async () => {
    await page.getByRole('region', { name: 'Runtime inspector' }).getByRole('button', { name: 'Diagnostics' }).click()
  })
  await triggerAndAssert(page, projectId, 'bottom tab change', ['bottom-evidence-drawer'], async () => {
    await page.getByRole('region', { name: 'Workbench bottom console' }).getByRole('button', { name: 'Trace' }).click()
  })
  await triggerAndAssert(page, projectId, 'file selection', ['files-panel', 'source-editor'], async () => {
    const buttons = page.getByRole('navigation', { name: 'File navigator' }).getByRole('button')
    const count = await buttons.count()
    if (count > 1) await buttons.nth(1).click()
  })
  await triggerAndAssert(page, projectId, 'run command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Run', exact: true }).click()
  })
  await triggerAndAssert(page, projectId, 'reset command', ['top-command-bar', 'runtime-inspector', 'bottom-evidence-drawer'], async () => {
    await page.locator('[data-playground-region="top-command-bar"]').getByRole('button', { name: 'Reset', exact: true }).click()
  })
}
