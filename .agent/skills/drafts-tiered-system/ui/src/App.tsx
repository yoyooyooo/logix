import { useEffect, useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { KanbanColumn } from './components/KanbanColumn';
import { DraftCard } from './components/DraftCard';
import { type Draft } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DraftDetailDialog } from '@/components/DraftDetailDialog';

const COLUMNS = [
  { id: 'Topics', title: 'Topics' },
  { id: 'L9', title: 'L9 Inbox' },
  { id: 'L8', title: 'L8 Research' },
  { id: 'L7', title: 'L7 Notes' },
  { id: 'L6', title: 'L6 Drafting' },
  { id: 'L5', title: 'L5 Proposal' },
  { id: 'L4', title: 'L4 Definition' },
  { id: 'L3', title: 'L3 Spec Draft' },
  { id: 'L2', title: 'L2 Candidate' },
  { id: 'L1', title: 'L1 Stable' },
];

import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KanbanBoard />
    </QueryClientProvider>
  );
}

function KanbanBoard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartLevel, setDragStartLevel] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('all');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);

  // TanStack Query for drafts
  const { data: drafts = [], refetch } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      // Sort by priority (number)
      return data.sort((a: Draft, b: Draft) => {
        const pA = typeof a.priority === 'number' ? a.priority : 9999;
        const pB = typeof b.priority === 'number' ? b.priority : 9999;
        return pA - pB;
      });
    }
  });

  // Optimistic updates helper (local state for drag and drop)
  // We need local state to handle immediate drag updates before refetch
  const [localDrafts, setLocalDrafts] = useState<Draft[]>([]);

  // Sync query data to local state
  useEffect(() => {
    if (drafts.length > 0) {
      setLocalDrafts(drafts);
    }
  }, [drafts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredDrafts = useMemo(() => {
    return localDrafts.filter((d: Draft) => {
      if (filterValue !== 'all' && d.value !== filterValue) return false;
      return true;
    });
  }, [localDrafts, filterValue]);

  const columns = useMemo(() => {
    const cols: Record<string, Draft[]> = {};
    COLUMNS.forEach((c) => (cols[c.id] = []));

    filteredDrafts.forEach((d: Draft) => {
      if (cols[d.level]) {
        cols[d.level].push(d);
      }
    });
    return cols;
  }, [filteredDrafts]);

  const visibleColumns = useMemo(() => {
    if (!hideEmpty) return COLUMNS;
    return COLUMNS.filter(col => columns[col.id].length > 0);
  }, [hideEmpty, columns]);

  function findContainer(id: string) {
    if (id in columns) return id;
    const draft = localDrafts.find((d: Draft) => d.filename === id);
    return draft?.level;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    setDragStartLevel(findContainer(id) || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Moving between columns
    setLocalDrafts((prev) => {
      const overItems = prev.filter((d: Draft) => d.level === overContainer);
      const overIndex = overItems.findIndex((d: Draft) => d.filename === overId);

      // Prevent unused var error
      void overIndex;

      return prev.map((d: Draft) => {
        if (d.filename === activeId) {
          return { ...d, level: overContainer };
        }
        return d;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over ? (over.id as string) : null;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId || '');

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = localDrafts.findIndex((d: Draft) => d.filename === activeId);
      const overIndex = localDrafts.findIndex((d: Draft) => d.filename === overId);

      let newDrafts = localDrafts;
      if (activeIndex !== overIndex) {
        newDrafts = arrayMove(localDrafts, activeIndex, overIndex);
        setLocalDrafts(newDrafts);
      }

      // Check if this was a cross-column move
      const isCrossColumn = dragStartLevel !== activeContainer;

      // Recalculate priority for this column
      const columnDrafts = newDrafts.filter((d: Draft) => d.level === activeContainer);
      columnDrafts.forEach((d: Draft, idx: number) => {
        const updates: any = { priority: (idx + 1) * 100 };
        // If this is the moved item and it's a cross-column move, send level update
        if (d.filename === activeId && isCrossColumn) {
          updates.level = activeContainer;
        }
        updateDraft(d.filename, updates);
      });
    }

    setActiveId(null);
    setDragStartLevel(null);
  }

  async function updateDraft(filename: string, updates: Partial<Draft>) {
    await fetch(`/api/drafts/${filename}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    // Invalidate query to refetch fresh data
    refetch();
  }

  const isFiltered = filterValue !== 'all';

  // Helper: Resolve relative path
  function resolvePath(currentPath: string, relativePath: string): string {
    const currentDir = currentPath.split('/').slice(0, -1);
    const parts = relativePath.split('/');

    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        if (currentDir.length > 0) currentDir.pop();
      } else {
        currentDir.push(part);
      }
    }
    return currentDir.join('/');
  }

  // Wouter hooks
  const [match, params] = useRoute('/draft/:filename');
  const [, setLocation] = useLocation();

  // Sync URL -> State
  useEffect(() => {
    if (match && params?.filename) {
      // Decode filename in case it contains special chars
      const filename = decodeURIComponent(params.filename);

      // Find draft
      let draft = localDrafts.find((d: Draft) => d.filename === filename);

      // Fallback strategies (same as before)
      if (!draft && filename.includes('/')) {
        draft = localDrafts.find((d: Draft) => d.path === filename);
      }
      if (!draft) {
        const basename = filename.split('/').pop();
        if (basename) {
          draft = localDrafts.find((d: Draft) => d.filename === basename);
        }
      }

      if (draft) {
        setSelectedDraft(draft);
        setIsDialogOpen(true);
      } else if (localDrafts.length > 0) {
        console.warn(`Draft not found for: ${filename}`);
      }
    } else {
      setIsDialogOpen(false);
      setSelectedDraft(null);
    }
  }, [match, params, localDrafts]);

  // Handle custom navigation event from Dialog
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const link = (e as CustomEvent).detail;
      let targetFilename = link;

      // Resolve path logic
      if (selectedDraft) {
        try {
           const resolvedPath = resolvePath(selectedDraft.path, link);
           const targetDraft = localDrafts.find((d: Draft) => d.path === resolvedPath);

           if (targetDraft) {
             targetFilename = targetDraft.filename;
           } else {
             const absoluteDraft = localDrafts.find((d: Draft) => d.path === link);
             if (absoluteDraft) {
                targetFilename = absoluteDraft.filename;
             } else {
                targetFilename = link.split('/').pop() || link;
             }
           }
        } catch (err) {
          console.error('Error resolving path:', err);
          targetFilename = link.split('/').pop() || link;
        }
      } else {
          targetFilename = link.split('/').pop() || link;
      }

      // Navigate using wouter
      setLocation(`/draft/${encodeURIComponent(targetFilename)}`);
    };

    window.addEventListener('navigate-draft', handleNavigate);
    return () => window.removeEventListener('navigate-draft', handleNavigate);
  }, [localDrafts, selectedDraft, setLocation]);

  // Sync Dialog state -> URL
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setLocation('/');
    }
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
        {/* Header */}
        <div className="flex items-center gap-6 px-8 py-5 border-b border-border bg-background/50 backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-3 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <span className="font-bold text-white text-lg">D</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Drafts<span className="text-muted-foreground font-normal ml-2">Kanban</span></h1>
          </div>

          <div className="h-6 w-px bg-border mx-2" />

          <div className="flex items-center gap-3">
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="w-[160px] bg-background border-input hover:border-ring focus:ring-ring/20 transition-all text-foreground">
                <SelectValue placeholder="Filter by Value" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground shadow-xl shadow-black/50">
                <SelectItem value="all">All Values</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="vision">Vision</SelectItem>
                <SelectItem value="extension">Extension</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className={`
                border border-input hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-all
                ${!hideEmpty ? 'bg-accent/50 text-foreground border-accent' : ''}
              `}
              onClick={() => setHideEmpty(!hideEmpty)}
            >
              {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {hideEmpty ? 'Show Empty' : 'Hide Empty'}
            </Button>

            <ModeToggle />
          </div>

          {isFiltered && (
            <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-500 text-xs font-medium flex items-center ml-auto animate-in fade-in slide-in-from-top-2">
              ⚠️ Drag disabled (Filtering active)
            </div>
          )}
        </div>

        {/* Kanban Board Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={!isFiltered ? handleDragStart : undefined}
            onDragOver={!isFiltered ? handleDragOver : undefined}
            onDragEnd={!isFiltered ? handleDragEnd : undefined}
          >
            <div className="flex gap-4 h-full min-w-max">
              {visibleColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  drafts={columns[col.id]}
                  onCardClick={(draft) => {
                    setSelectedDraft(draft);
                    setIsDialogOpen(true);
                    // Update URL via wouter
                    setLocation(`/draft/${encodeURIComponent(draft.filename)}`);
                  }}
                />
              ))}
            </div>
            <DragOverlay>
              {activeId ? (
                <DraftCard
                  draft={localDrafts.find((d: Draft) => d.filename === activeId)!}
                  onClick={() => { }}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <DraftDetailDialog
          key={selectedDraft?.filename}
          draft={selectedDraft}
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
        />
      </div>
    </ThemeProvider>
  );
}
