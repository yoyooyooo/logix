import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraftCard } from './DraftCard';
import { type Draft } from '../types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
    id: string;
    title: string;
    drafts: Draft[];
    onCardClick: (draft: Draft) => void;
}

export function KanbanColumn({ id, title, drafts, onCardClick }: Props) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <Card className="flex w-80 flex-col border-border/50 bg-card/50 shadow-none backdrop-blur-sm">
            {/* Sticky Header */}
            <div className="p-4 font-semibold border-b border-border flex justify-between items-center bg-card/80 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
                <span className="text-card-foreground tracking-tight">{title}</span>
                <Badge variant="outline" className="rounded-full border-border/50 bg-muted text-muted-foreground">
                    {drafts.length}
                </Badge>
            </div>

            <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto min-h-[150px] scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
                <SortableContext
                    id={id}
                    items={drafts.map((d) => d.filename)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-1 min-h-[100px]">
                        {drafts.map((draft) => (
                            <DraftCard key={draft.filename} draft={draft} onClick={onCardClick} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </Card>
    );
}
