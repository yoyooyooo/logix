import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { type Draft } from "@/types"

type SpecNode = {
  id?: string
  title: string
  level: string
  path: string
  status?: string
  value?: string
  priority?: string | number
  depends_on: string[]
  related: string[]
}

type ItemNode = {
  id: string
  kind: "US" | "FR" | "NFR" | "SC"
  spec_id: string
  text: string
  file: string
  depends: string[]
  relates: string[]
  supports: string[]
}

type Graph = {
  generated_at: string
  specs: SpecNode[]
  items: ItemNode[]
}

function isSpecId(value: string): boolean {
  return /^[0-9]{3}$/.test(value)
}

function trimDraftsPrefix(pathValue: string): string {
  return pathValue.replace(/^docs\/specs\/drafts\//, "")
}

type Props = {
  drafts: Draft[]
  onNavigate: (link: string) => void
}

export function SpecGraphView({ drafts, onNavigate }: Props) {
  const [query, setQuery] = useState("")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["graph"],
    queryFn: async () => {
      const res = await fetch("/api/graph")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      return (await res.json()) as Graph
    },
  })

  const itemsBySpecId = useMemo(() => {
    const m = new Map<string, ItemNode[]>()
    if (!data) return m
    for (const item of data.items) {
      const list = m.get(item.spec_id) ?? []
      list.push(item)
      m.set(item.spec_id, list)
    }
    return m
  }, [data])

  const filteredSpecs = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const specs = data.specs.slice()

    const match = (s: SpecNode) => {
      if (!q) return true
      return (
        (s.id ?? "").includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.path.toLowerCase().includes(q) ||
        s.level.toLowerCase().includes(q)
      )
    }

    const getIdForSort = (s: SpecNode) => (s.id ? Number.parseInt(s.id, 10) : Number.POSITIVE_INFINITY)
    const levelRank = (level: string) => {
      if (level === "Topics") return 0
      const m = level.match(/^L([0-9])$/)
      if (m) return 100 + Number.parseInt(m[1]!, 10)
      return 999
    }

    return specs
      .filter(match)
      .sort((a, b) => {
        const lr = levelRank(a.level) - levelRank(b.level)
        if (lr !== 0) return lr
        return getIdForSort(a) - getIdForSort(b)
      })
  }, [data, query])

  const summary = useMemo(() => {
    if (!data) return { specs: 0, items: 0, withId: 0 }
    const withId = data.specs.filter((s) => Boolean(s.id)).length
    return { specs: data.specs.length, items: data.items.length, withId }
  }, [data])

  const navigateSpec = (spec: SpecNode) => {
    if (spec.id) {
      onNavigate(spec.id)
      return
    }

    const rel = trimDraftsPrefix(spec.path)
    const byPath = drafts.find((d) => d.path === rel)
    if (byPath) {
      onNavigate(byPath.path)
      return
    }

    onNavigate(rel)
  }

  const navigateLink = (value: string) => {
    const v = value.trim()
    if (!v) return
    if (isSpecId(v)) {
      onNavigate(v)
      return
    }
    onNavigate(v)
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading graph…</div>
  }

  if (isError || !data) {
    return <div className="text-sm text-destructive">Failed to load graph.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{summary.specs} specs</Badge>
          <Badge variant="secondary">{summary.items} items</Badge>
          <Badge variant="outline" className="font-mono">
            {summary.withId}/{summary.specs} with id
          </Badge>
          <span className="text-xs text-muted-foreground">
            Generated: {new Date(data.generated_at).toLocaleString()}
          </span>
        </div>

        <div className="w-full md:w-[360px]">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search id / title / path…" />
        </div>
      </div>

      <div className="grid gap-3">
        {filteredSpecs.map((spec) => {
          const itemCount = spec.id ? (itemsBySpecId.get(spec.id)?.length ?? 0) : 0
          return (
            <Card key={spec.path} className="overflow-hidden">
              <CardHeader className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      <button className="text-left hover:underline" onClick={() => navigateSpec(spec)}>
                        {spec.title}
                      </button>
                    </CardTitle>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{spec.path}</div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="secondary">{spec.level}</Badge>
                    {spec.id && (
                      <Badge variant="outline" className="font-mono">
                        ID {spec.id}
                      </Badge>
                    )}
                    {itemCount > 0 && <Badge variant="outline">{itemCount} items</Badge>}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                {spec.depends_on.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Depends:</span>
                    {spec.depends_on.map((dep) => (
                      <Button
                        key={dep}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 font-mono text-xs"
                        onClick={() => navigateLink(dep)}
                      >
                        {dep}
                      </Button>
                    ))}
                  </div>
                )}

                {spec.related.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Related:</span>
                    {spec.related.map((rel) => (
                      <Button
                        key={rel}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => navigateLink(rel)}
                      >
                        <span className={isSpecId(rel) ? "font-mono" : "truncate"}>{rel}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
