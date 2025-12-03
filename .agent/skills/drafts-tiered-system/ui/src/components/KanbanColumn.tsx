import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraftCard } from './DraftCard';
import { type Draft } from '../types';

interface Props {
    id: string;
    title: string;
    drafts: Draft[];
    onCardClick: (draft: Draft) => void;
}

export function KanbanColumn({ id, title, drafts, onCardClick }: Props) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="flex flex-col w-80 bg-card/50 rounded-xl border border-border/50 backdrop-blur-sm">
            {/* Sticky Header */}
            <div className="p-4 font-semibold border-b border-border flex justify-between items-center bg-card/80 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
                <span className="text-card-foreground tracking-tight">{title}</span>
                <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground border border-border/50">
                    {drafts.length}
                </span>
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
        </div>
    );
}
