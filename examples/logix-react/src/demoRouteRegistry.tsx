import {
  BoxesIcon,
  ChartSplineIcon,
  FlaskConicalIcon,
  FormInputIcon,
  HomeIcon,
  Layers3Icon,
} from 'lucide-react'
import type React from 'react'
import { FORM_DEMO_MATRIX, type FormDemoSection } from './demos/form/demoMatrix'

export type DemoItem = {
  readonly route: string
  readonly label: string
  readonly summary: string
  readonly section?: FormDemoSection
}

export type DemoCategory = {
  readonly id: 'start' | 'runtime' | 'host' | 'form' | 'diagnostics' | 'expert'
  readonly label: string
  readonly summary: string
  readonly route: string
  readonly tone: string
  readonly icon: React.ComponentType<{ readonly className?: string }>
  readonly items: ReadonlyArray<DemoItem>
}

export const runtimeItems: ReadonlyArray<DemoItem> = [
  { route: '/global-runtime', label: 'Global Runtime', summary: 'ManagedRuntime and shared ModuleTag lookup' },
  { route: '/runtime-counter', label: 'Runtime Counter', summary: 'Single module runtime definition' },
  { route: '/local-program', label: 'Local Program', summary: 'Component-scoped Program instance' },
  { route: '/async-local-program', label: 'Async Local Program', summary: 'suspend:true with ModuleCache' },
  { route: '/session-program', label: 'Session Program', summary: 'key + gcTime session instance' },
  { route: '/suspense-program', label: 'Suspense Program', summary: 'Async Layer dependency boundary' },
]

export const hostItems: ReadonlyArray<DemoItem> = [
  { route: '/host-nested-providers', label: 'Nested Providers', summary: 'Host projection on the same Runtime' },
  { route: '/host-root-provider', label: 'Root Provider', summary: 'Root singleton and Env scope' },
  { route: '/host-imports-scope', label: 'Imports Scope', summary: 'Root host module resolving imported child modules' },
  { route: '/i18n-demo', label: 'i18n Runtime', summary: 'Root singleton and message token wiring' },
  { route: '/host-env-override', label: 'Env Override', summary: 'Package-local subtree layer override' },
]

export const diagnosticsItems: ReadonlyArray<DemoItem> = [
  { route: '/trial-run-evidence', label: 'TrialRun Evidence', summary: 'RunSession and EvidencePackage export' },
  { route: '/perf-tuning-lab', label: 'Perf Tuning Lab', summary: 'Control-plane tuning and pressure view' },
  { route: '/field-txn-devtools-demo', label: 'Fields + Txn + Devtools', summary: 'Transaction view and time-travel ergonomics' },
]

export const expertItems: ReadonlyArray<DemoItem> = [
  { route: '/task-runner-demo', label: 'Task Runner', summary: 'runLatestTask and runExhaustTask behavior' },
  { route: '/counter-with-profile-demo', label: 'Counter + Profile Fields', summary: 'Computed, source, and link contrast' },
]

export const formItems: ReadonlyArray<DemoItem> = FORM_DEMO_MATRIX.map((entry) => ({
  route: entry.route,
  label: entry.label,
  summary: entry.summary,
  section: entry.section,
}))

export const logixReactDemoCategories: ReadonlyArray<DemoCategory> = [
  {
    id: 'start',
    label: 'Start',
    summary: 'Choose a learning path',
    route: '/',
    tone: 'bg-stone-950 text-white',
    icon: HomeIcon,
    items: [],
  },
  {
    id: 'runtime',
    label: 'Runtime',
    summary: 'Module, Program, Runtime',
    route: '/global-runtime',
    tone: 'bg-sky-600 text-white',
    icon: BoxesIcon,
    items: runtimeItems,
  },
  {
    id: 'host',
    label: 'Host',
    summary: 'React acquisition and imports',
    route: '/host-nested-providers',
    tone: 'bg-teal-600 text-white',
    icon: Layers3Icon,
    items: hostItems,
  },
  {
    id: 'form',
    label: 'Form',
    summary: 'Frozen Form API scenarios',
    route: '/form-quick-start',
    tone: 'bg-amber-600 text-white',
    icon: FormInputIcon,
    items: formItems,
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    summary: 'Trial, evidence, and perf',
    route: '/trial-run-evidence',
    tone: 'bg-emerald-600 text-white',
    icon: ChartSplineIcon,
    items: diagnosticsItems,
  },
  {
    id: 'expert',
    label: 'Expert',
    summary: 'Lower-level behavior labs',
    route: '/task-runner-demo',
    tone: 'bg-orange-600 text-white',
    icon: FlaskConicalIcon,
    items: expertItems,
  },
]

export const logixReactDirectDemoRoutes = Array.from(new Set(logixReactDemoCategories.flatMap((category) => [
  category.route,
  ...category.items.map((item) => item.route),
])))
