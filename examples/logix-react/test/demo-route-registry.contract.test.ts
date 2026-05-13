import { describe, expect, it } from 'vitest'
import { logixReactDemoCategories, logixReactDirectDemoRoutes } from '../src/demoRouteRegistry'
import { FORM_DEMO_MATRIX } from '../src/demos/form/demoMatrix'
import { logixReactPlaygroundRegistry } from '../src/playground/registry'
import { scenarioAnchors } from '../src/scenarioAnchors'

const forbiddenProcessName = /R[0-9]{3}-|TASK-[0-9]|CAP-[0-9]|PF-[0-9]|matrixRow|Probe|Witness|Pressure/
const semanticRoute = /^\/(?:[a-z][a-z0-9-]*)(?:\/[a-z][a-z0-9-]*)*$/
const playgroundRoute = /^\/playground\/[a-z][a-z0-9.-]*$/

describe('examples/logix-react direct demo route registry', () => {
  it('keeps gallery routes semantic, unique, and closed over retained demo inventory', () => {
    expect(logixReactDirectDemoRoutes).toEqual([
      '/',
      '/global-runtime',
      '/runtime-counter',
      '/local-program',
      '/async-local-program',
      '/session-program',
      '/suspense-program',
      '/host-nested-providers',
      '/host-root-provider',
      '/host-imports-scope',
      '/i18n-demo',
      '/host-env-override',
      '/form-quick-start',
      '/form-field-source',
      '/form-field-companion',
      '/form-source-query',
      '/form-field-arrays',
      '/form-advanced-field-behavior',
      '/trial-run-evidence',
      '/perf-tuning-lab',
      '/field-txn-devtools-demo',
      '/task-runner-demo',
      '/counter-with-profile-demo',
    ])

    expect(new Set(logixReactDirectDemoRoutes).size).toBe(logixReactDirectDemoRoutes.length)

    for (const route of logixReactDirectDemoRoutes.filter((route) => route !== '/')) {
      expect(route).toMatch(semanticRoute)
      expect(route).not.toMatch(forbiddenProcessName)
    }
  })

  it('keeps scenario anchors and form demos reachable from gallery route registry', () => {
    const galleryRoutes = new Set(logixReactDirectDemoRoutes)

    for (const anchor of scenarioAnchors) {
      expect(galleryRoutes.has(anchor.route), `${anchor.scenario} route must be a direct gallery route`).toBe(true)
    }

    for (const entry of FORM_DEMO_MATRIX) {
      expect(galleryRoutes.has(entry.route), `${entry.label} route must be a direct gallery route`).toBe(true)
    }
  })

  it('keeps category landing routes aligned with their first direct route', () => {
    for (const category of logixReactDemoCategories) {
      const firstRoute = category.items[0]?.route ?? '/'
      expect(category.route).toBe(firstRoute)
    }
  })

  it('keeps every Playground project available through a stable project route', () => {
    const routes = logixReactPlaygroundRegistry.map((project) => `/playground/${project.id}`)

    expect(new Set(routes).size).toBe(routes.length)

    for (const route of routes) {
      expect(route).toMatch(playgroundRoute)
      expect(route).not.toMatch(/R[0-9]{3}-|TASK-[0-9]|CAP-[0-9]|PF-[0-9]|matrixRow|Probe|Witness/)
    }
  })
})
