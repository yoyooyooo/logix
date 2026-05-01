import React from 'react'
import {
  BoxesIcon,
  BracesIcon,
  ChartSplineIcon,
  ChevronRightIcon,
  FlaskConicalIcon,
  FormInputIcon,
  HomeIcon,
  Layers3Icon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  RouteIcon,
  SparklesIcon,
  SunIcon,
} from 'lucide-react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Route as RouterRoute,
  Routes as RouterRoutes,
  useLocation,
} from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { GlobalRuntimeLayout } from './demos/GlobalRuntimeLayout'
import { AppDemoLayout } from './demos/AppDemoLayout'
import { LocalModuleLayout } from './demos/LocalModuleLayout'
import { AsyncLocalModuleLayout } from './demos/AsyncLocalModuleLayout'
import { FractalRuntimeLayout } from './demos/FractalRuntimeLayout'
import { LayerOverrideDemoLayout } from './demos/LayerOverrideDemoLayout'
import { SessionModuleLayout } from './demos/SessionModuleLayout'
import { SuspenseModuleLayout } from './demos/SuspenseModuleLayout'
import { CounterWithProfileDemo } from './demos/CounterWithProfileDemo'
import { FieldTxnDevtoolsDemoLayout } from './demos/field-txn-devtools-demo'
import { TaskRunnerDemoLayout } from './demos/TaskRunnerDemoLayout'
import { DiShowcaseLayout } from './demos/DiShowcaseLayout'
import { I18nDemoLayout } from './demos/I18nDemoLayout'
import { PerfTuningLabLayout } from './demos/PerfTuningLabLayout'
import { TrialRunEvidenceDemo } from './demos/TrialRunEvidenceDemo'
import { FORM_DEMO_MATRIX, FORM_DEMO_SECTIONS, type FormDemoSection } from './demos/form/demoMatrix'
import { LogixReactPlaygroundRoute } from './playground/routes'
import './style.css'

const Link: any = RouterLink
const NavLink: any = RouterNavLink
const Route: any = RouterRoute
const Routes: any = RouterRoutes

type DemoItem = {
  readonly route: string
  readonly label: string
  readonly summary: string
  readonly section?: FormDemoSection
}

type DemoCategory = {
  readonly id: 'start' | 'runtime' | 'host' | 'form' | 'diagnostics' | 'expert'
  readonly label: string
  readonly summary: string
  readonly route: string
  readonly tone: string
  readonly icon: React.ComponentType<{ readonly className?: string }>
  readonly items: ReadonlyArray<DemoItem>
}

const runtimeItems: ReadonlyArray<DemoItem> = [
  { route: '/global-runtime', label: 'Global Runtime', summary: 'ManagedRuntime and shared ModuleTag lookup' },
  { route: '/runtime-counter', label: 'Runtime Counter', summary: 'Single module runtime definition' },
  { route: '/local-program', label: 'Local Program', summary: 'Component-scoped Program instance' },
  { route: '/async-local-program', label: 'Async Local Program', summary: 'suspend:true with ModuleCache' },
  { route: '/session-program', label: 'Session Program', summary: 'key + gcTime session instance' },
  { route: '/suspense-program', label: 'Suspense Program', summary: 'Async Layer dependency boundary' },
]

const hostItems: ReadonlyArray<DemoItem> = [
  { route: '/host-nested-providers', label: 'Nested Providers', summary: 'Host projection on the same Runtime' },
  { route: '/host-root-imports', label: 'Root / Imports / Env', summary: 'Root provider and imports scope' },
  { route: '/i18n-demo', label: 'i18n Runtime', summary: 'Root singleton and message token wiring' },
  { route: '/host-env-override', label: 'Env Override', summary: 'Package-local subtree layer override' },
]

const diagnosticsItems: ReadonlyArray<DemoItem> = [
  { route: '/trial-run-evidence', label: 'TrialRun Evidence', summary: 'RunSession and EvidencePackage export' },
  { route: '/perf-tuning-lab', label: 'Perf Tuning Lab', summary: 'Control-plane tuning and pressure view' },
  { route: '/field-txn-devtools-demo', label: 'Fields + Txn + Devtools', summary: 'Transaction view and time-travel ergonomics' },
]

const expertItems: ReadonlyArray<DemoItem> = [
  { route: '/task-runner-demo', label: 'Task Runner', summary: 'runLatestTask and runExhaustTask behavior' },
  { route: '/counter-with-profile-demo', label: 'Counter + Profile Fields', summary: 'Computed, source, and link contrast' },
]

const formItems: ReadonlyArray<DemoItem> = FORM_DEMO_MATRIX.map((entry) => ({
  route: entry.route,
  label: entry.label,
  summary: entry.summary,
  section: entry.section,
}))

const demoCategories: ReadonlyArray<DemoCategory> = [
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

const allKnownRoutes = new Set(demoCategories.flatMap((category) => [category.route, ...category.items.map((item) => item.route)]))

const isPlaygroundPath = (pathname: string): boolean =>
  pathname === '/playground' || pathname.startsWith('/playground/')

const getActiveCategory = (pathname: string): DemoCategory => {
  if (isPlaygroundPath(pathname)) return demoCategories[1]!
  if (pathname === '/') return demoCategories[0]!
  return demoCategories.find((category) => category.items.some((item) => item.route === pathname) || category.route === pathname) ?? demoCategories[0]!
}

const getActiveItem = (category: DemoCategory, pathname: string): DemoItem | undefined =>
  category.items.find((item) => item.route === pathname) ?? category.items.find((item) => item.route === category.route)

const getFormSectionTitle = (sectionId: FormDemoSection): string =>
  FORM_DEMO_SECTIONS.find((section) => section.id === sectionId)?.title ?? sectionId

type ColorScheme = 'light' | 'dark'

const colorSchemeStorageKey = 'logix-react-example-color-scheme'

const getInitialColorScheme = (): ColorScheme => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(colorSchemeStorageKey)
  if (stored === 'light' || stored === 'dark') return stored
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const applyColorScheme = (scheme: ColorScheme) => {
  document.documentElement.classList.toggle('dark', scheme === 'dark')
  document.documentElement.style.colorScheme = scheme
}

const primaryActiveRouteClass = 'bg-foreground text-background shadow-sm dark:bg-accent dark:text-accent-foreground dark:shadow-none'
const primaryActiveRouteSummaryClass = 'text-background/65 dark:text-muted-foreground'
const secondaryActiveRouteClass =
  'border-foreground bg-foreground text-background shadow-sm dark:border-border dark:bg-accent dark:text-accent-foreground dark:shadow-none'
const formActiveRouteClass = 'bg-amber-600 text-white dark:bg-accent dark:text-accent-foreground dark:ring-1 dark:ring-border'

function BrandMark({ collapsed = false }: { readonly collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
        <SparklesIcon className="size-4" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="font-heading text-lg font-semibold tracking-tight">Logix + React</div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Example Gallery</div>
        </div>
      )}
    </div>
  )
}

function PrimaryNavigation({
  pathname,
  collapsed,
  onNavigate,
}: {
  readonly pathname: string
  readonly collapsed?: boolean
  readonly onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1">
      {demoCategories.map((category) => {
        const Icon = category.icon
        const active = category.id === getActiveCategory(pathname).id
        return (
          <NavLink
            key={category.id}
            to={category.route}
            end={category.id === 'start'}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
              active ? primaryActiveRouteClass : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? category.label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate">{category.label}</span>
                <span className={cn('block truncate text-[11px] font-normal', active ? primaryActiveRouteSummaryClass : 'text-muted-foreground')}>
                  {category.summary}
                </span>
              </span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function FormSecondaryNavigation({
  pathname,
  onNavigate,
}: {
  readonly pathname: string
  readonly onNavigate?: () => void
}) {
  const current = formItems.find((item) => item.route === pathname)
  const currentSection = current?.section

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <FormInputIcon className="size-3.5" />
        Form path
      </div>
      <div className="grid gap-2 lg:grid-cols-5">
        {FORM_DEMO_SECTIONS.map((section) => {
          const entries = formItems.filter((item) => item.section === section.id)
          if (entries.length === 0) return null
          const sectionActive = currentSection === section.id

          return (
            <Card key={section.id} size="sm" className={cn('bg-background/70', sectionActive && 'ring-1 ring-foreground/35 dark:ring-border')}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {entries.map((entry) => (
                  <NavLink
                    key={entry.route}
                    to={entry.route}
                    onClick={onNavigate}
                    className={cn(
                      'block rounded-lg px-2 py-1.5 text-xs transition-colors',
                      pathname === entry.route ? formActiveRouteClass : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {entry.label}
                  </NavLink>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function SecondaryNavigation({
  category,
  pathname,
  onNavigate,
}: {
  readonly category: DemoCategory
  readonly pathname: string
  readonly onNavigate?: () => void
}) {
  if (category.id === 'start') return null
  if (category.id === 'form') return <FormSecondaryNavigation pathname={pathname} onNavigate={onNavigate} />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <RouteIcon className="size-3.5" />
        {category.label} routes
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {category.items.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            onClick={onNavigate}
            className={cn(
              'min-w-48 rounded-2xl border bg-background px-3 py-2 text-left text-sm transition-colors',
              pathname === item.route
                ? secondaryActiveRouteClass
                : 'border-border text-muted-foreground hover:border-foreground/25 hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="block font-medium">{item.label}</span>
            <span className={cn('mt-0.5 block truncate text-xs', pathname === item.route ? primaryActiveRouteSummaryClass : 'text-muted-foreground')}>
              {item.summary}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function CurrentRouteHeader({ pathname }: { readonly pathname: string }) {
  const activeCategory = getActiveCategory(pathname)
  const activeItem = getActiveItem(activeCategory, pathname)
  const isPlaygroundRoute = isPlaygroundPath(pathname)
  const isUnknownRoute = pathname !== '/' && !allKnownRoutes.has(pathname) && !isPlaygroundRoute

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-background/70">
          {activeCategory.label}
        </Badge>
        {activeItem?.section && (
          <Badge variant="secondary">
            {getFormSectionTitle(activeItem.section)}
          </Badge>
        )}
        {isUnknownRoute && <Badge variant="destructive">Unknown route</Badge>}
      </div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {isPlaygroundRoute ? 'Playground' : pathname === '/' ? 'Example Gallery' : activeItem?.label ?? activeCategory.label}
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {isPlaygroundRoute
          ? 'Source, React preview, and Logix Program run/check/trial share one Playground project.'
          : pathname === '/'
          ? 'A curated public-facing map of Logix runtime, React host, Form, diagnostics, and expert routes.'
          : activeItem?.summary ?? activeCategory.summary}
      </p>
    </div>
  )
}

function CompactRouteBar({
  pathname,
  onOpenNavigation,
  colorScheme,
  onToggleColorScheme,
}: {
  readonly pathname: string
  readonly onOpenNavigation: () => void
  readonly colorScheme: ColorScheme
  readonly onToggleColorScheme: () => void
}) {
  const activeCategory = getActiveCategory(pathname)
  const activeItem = getActiveItem(activeCategory, pathname)
  const isPlaygroundRoute = isPlaygroundPath(pathname)
  const title = isPlaygroundRoute ? 'Playground' : pathname === '/' ? 'Example Gallery' : activeItem?.label ?? activeCategory.label
  const summary = isPlaygroundRoute
    ? 'Source, preview, and Program share one project snapshot'
    : pathname === '/'
    ? 'Runtime, host, Form, diagnostics, and expert routes'
    : activeItem?.summary ?? activeCategory.summary

  return (
    <header className="z-40 border-b bg-background/95 backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-3 px-4 py-2 lg:px-7">
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation"
          className="lg:hidden"
          onClick={onOpenNavigation}
        >
          <MenuIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="outline" className="hidden shrink-0 bg-background/70 sm:inline-flex">
              {activeCategory.label}
            </Badge>
            {activeItem?.section && (
              <Badge variant="secondary" className="hidden shrink-0 md:inline-flex">
                {getFormSectionTitle(activeItem.section)}
              </Badge>
            )}
            <h1 className="truncate font-heading text-sm font-semibold tracking-tight sm:text-base">
              {title}
            </h1>
          </div>
          <p className="hidden truncate text-xs text-muted-foreground md:block">{summary}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Switch to ${colorScheme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={onToggleColorScheme}
        >
          {colorScheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  )
}

function RouteContextPanel({
  category,
  pathname,
}: {
  readonly category: DemoCategory
  readonly pathname: string
}) {
  if (category.id === 'start') return null

  return (
    <section className="mb-6 rounded-[1.75rem] border bg-card p-4 shadow-sm lg:p-5">
      <div className="space-y-5">
        <CurrentRouteHeader pathname={pathname} />
        <Separator />
        <SecondaryNavigation category={category} pathname={pathname} />
      </div>
    </section>
  )
}

function Sidebar({
  collapsed,
  onToggle,
  pathname,
}: {
  readonly collapsed: boolean
  readonly onToggle: () => void
  readonly pathname: string
}) {
  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 border-r bg-sidebar/80 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-20' : 'w-80'
      )}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <BrandMark collapsed={collapsed} />
        {!collapsed && (
          <Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar" onClick={onToggle}>
            <PanelLeftCloseIcon />
          </Button>
        )}
      </div>
      {collapsed && (
        <div className="px-4 pb-3">
          <Button variant="ghost" size="icon-sm" aria-label="Expand sidebar" onClick={onToggle}>
            <PanelLeftOpenIcon />
          </Button>
        </div>
      )}
      <Separator />
      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <PrimaryNavigation pathname={pathname} collapsed={collapsed} />
      </ScrollArea>
    </aside>
  )
}

function MobileNavigation({
  open,
  onOpenChange,
  pathname,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pathname: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-sm">
        <SheetHeader>
          <BrandMark />
          <SheetTitle className="sr-only">Example navigation</SheetTitle>
          <SheetDescription>Navigate Logix React examples by scenario family.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <PrimaryNavigation pathname={pathname} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ExamplesOverview() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border bg-card">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_left,oklch(0.92_0.06_80),transparent_35%),linear-gradient(135deg,oklch(0.99_0_0),oklch(0.95_0.02_230))] p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div className="space-y-5">
            <Badge variant="outline" className="bg-background/70">
              Public example surface
            </Badge>
            <div className="space-y-3">
              <h2 className="font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Explore Logix through stable user-facing paths.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                The gallery is organized by how a user learns the system: runtime basics, React host acquisition,
                frozen Form API scenarios, diagnostics, and expert behavior labs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button render={<Link to="/global-runtime" />}>
                Start with Runtime
                <ChevronRightIcon />
              </Button>
              <Button variant="outline" render={<Link to="/playground" />}>
                <BracesIcon />
                Open Playground
              </Button>
              <Button variant="outline" render={<Link to="/form-quick-start" />}>
                Open Form path
              </Button>
            </div>
          </div>
          <Card className="self-end bg-background/75 shadow-sm">
            <CardHeader>
              <CardTitle>Navigation model</CardTitle>
              <CardDescription>Left rail selects the learning family. The top strip previews routes inside that family.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-xl bg-muted p-3">Collapsible desktop rail</div>
              <div className="rounded-xl bg-muted p-3">Mobile drawer</div>
              <div className="rounded-xl bg-muted p-3">Form scenario map</div>
              <div className="rounded-xl bg-muted p-3">Proof refs stay in code metadata</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoCategories.filter((category) => category.id !== 'start').map((category) => {
          const Icon = category.icon
          return (
            <Link key={category.id} to={category.route} className="group block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className={cn('flex size-10 items-center justify-center rounded-2xl', category.tone)}>
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="secondary">{category.items.length} routes</Badge>
                  </div>
                  <CardTitle>{category.label}</CardTitle>
                  <CardDescription>{category.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.items.slice(0, 3).map((item) => (
                    <div key={item.route} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRightIcon className="size-3" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

export function App() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [colorScheme, setColorScheme] = React.useState<ColorScheme>(getInitialColorScheme)
  const activeCategory = getActiveCategory(location.pathname)
  const isPlaygroundRoute = isPlaygroundPath(location.pathname)

  React.useLayoutEffect(() => {
    applyColorScheme(colorScheme)
    window.localStorage.setItem(colorSchemeStorageKey, colorScheme)
  }, [colorScheme])

  if (isPlaygroundRoute) {
    return (
      <Routes>
        <Route path="/playground" element={<LogixReactPlaygroundRoute />} />
        <Route path="/playground/:id" element={<LogixReactPlaygroundRoute />} />
      </Routes>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        pathname={location.pathname}
      />
      <MobileNavigation open={mobileOpen} onOpenChange={setMobileOpen} pathname={location.pathname} />

      <main className="flex min-w-0 flex-1 flex-col">
        <CompactRouteBar
          pathname={location.pathname}
          onOpenNavigation={() => setMobileOpen(true)}
          colorScheme={colorScheme}
          onToggleColorScheme={() => setColorScheme((scheme) => scheme === 'dark' ? 'light' : 'dark')}
        />

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-6xl p-4 lg:p-8">
            <RouteContextPanel category={activeCategory} pathname={location.pathname} />
            <Routes>
              <Route path="/" element={<ExamplesOverview />} />
              <Route path="/global-runtime" element={<GlobalRuntimeLayout />} />
              <Route path="/runtime-counter" element={<AppDemoLayout />} />
              <Route path="/local-program" element={<LocalModuleLayout />} />
              <Route path="/async-local-program" element={<AsyncLocalModuleLayout />} />
              <Route path="/session-program" element={<SessionModuleLayout />} />
              <Route path="/host-nested-providers" element={<FractalRuntimeLayout />} />
              <Route path="/host-root-imports" element={<DiShowcaseLayout />} />
              <Route path="/i18n-demo" element={<I18nDemoLayout />} />
              <Route path="/host-env-override" element={<LayerOverrideDemoLayout />} />
              <Route path="/task-runner-demo" element={<TaskRunnerDemoLayout />} />
              <Route path="/suspense-program" element={<SuspenseModuleLayout />} />
              <Route path="/counter-with-profile-demo" element={<CounterWithProfileDemo />} />
              <Route path="/trial-run-evidence" element={<TrialRunEvidenceDemo />} />
              {FORM_DEMO_MATRIX.map((entry) => {
                const Component = entry.component
                return <Route key={entry.route} path={entry.route} element={<Component />} />
              })}
              <Route path="/field-txn-devtools-demo" element={<FieldTxnDevtoolsDemoLayout />} />
              <Route path="/perf-tuning-lab" element={<PerfTuningLabLayout />} />
            </Routes>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
