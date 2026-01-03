import { Link } from 'react-router-dom'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { TaskCard } from '../components/TaskCard'
import { UserStoryCard } from '../components/UserStoryCard'

export function DesignSystemPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <header className="border-b-4 border-double border-border/40 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="min-w-0">
            <div className="text-2xl font-bold font-serif tracking-tight text-foreground">Speckit Kit</div>
            <div className="mt-1 text-sm text-muted-foreground font-mono italic">Design System Showcase · Vol. 1</div>
          </div>

          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="font-serif">
              <Link to="/">← Back to Kanban</Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="font-mono text-xs uppercase tracking-wider">
              <Link to="/design-system">System</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="scrollbar-none h-full overflow-y-auto pb-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
          <section>
            <div className="flex items-center gap-4 border-b border-dashed border-border/40 pb-4 mb-8">
              <h2 className="text-2xl font-bold font-serif text-foreground">Buttons</h2>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                ui/button
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 border-b border-dashed border-border/40 pb-4 mb-8">
              <h2 className="text-2xl font-bold font-serif text-foreground">Badges / Stamps</h2>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                ui/badge
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Default</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 border-b border-dashed border-border/40 pb-4 mb-8">
              <h2 className="text-2xl font-bold font-serif text-foreground">Cards / Panes</h2>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                ui/card
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="font-serif">Elevated</CardTitle>
                  <CardDescription>Hard shadow lift</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Used for main content blocks.</div>
                </CardContent>
              </Card>

              <Card variant="inset">
                <CardHeader>
                  <CardTitle className="font-serif">Inset</CardTitle>
                  <CardDescription>Recessed grouping</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Used for containers.</div>
                </CardContent>
              </Card>

              <Card variant="flat">
                <CardHeader>
                  <CardTitle className="font-serif">Flat</CardTitle>
                  <CardDescription>Structure only</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Used for static data.</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 border-b border-dashed border-border/40 pb-4 mb-8">
              <h2 className="text-2xl font-bold font-serif text-foreground">Interactives & Motion</h2>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                Real Components
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Task Cards (Spring Entry + Hover Lift)</div>
                <div className="w-[360px] space-y-2">
                  <TaskCard
                    task={{
                      line: 1,
                      checked: false,
                      raw: '- [ ] T-101 Implement login flow',
                      title: 'Implement login flow',
                      taskId: 'T-101',
                      story: 'US1',
                    }}
                    onToggle={() => {}}
                    onOpenDetail={() => {}}
                  />
                  <TaskCard
                    task={{
                      line: 2,
                      checked: true,
                      raw: '- [x] T-102 Setup database schema',
                      title: 'Setup database schema',
                      taskId: 'T-102',
                      parallel: true,
                    }}
                    onToggle={() => {}}
                    onOpenDetail={() => {}}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">User Story Cards</div>
                <div className="w-[360px] space-y-2">
                  <UserStoryCard
                    storyCode="US1"
                    title="User Authentication"
                    stats={{ total: 5, done: 2, todo: 3 }}
                    hint="Todo 3"
                    onOpen={() => {}}
                  />
                  <UserStoryCard
                    storyCode="US2"
                    title="Payment Gateway Integration"
                    stats={undefined}
                    tone="danger"
                    hint="Missing in spec"
                    onOpen={() => {}}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Highlight</h2>
              <Badge variant="outline" className="font-mono">
                .speckit-task-highlight
              </Badge>
            </div>

            <div className="mt-4">
              <Card variant="flat">
                <CardContent>
                  <div className="speckit-task-highlight inline-block rounded-xl px-2 py-1 text-sm bg-muted">
                    这个块用于验证「滚动居中 + 2 秒高亮」的视觉效果
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
