import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Draft } from '../types';
import clsx from 'clsx';
import { GripVertical } from 'lucide-react';

interface Props {
    draft: Draft;
    onClick: (draft: Draft) => void;
}

export function DraftCard({ draft, onClick }: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: draft.filename, data: { type: 'Draft', draft } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-accent/50 border border-dashed border-border rounded-lg p-4 mb-3 opacity-50 h-[120px]"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative bg-card border border-border rounded-lg p-4 mb-3 cursor-grab hover:border-ring/50 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 active:cursor-grabbing active:scale-[1.02]"
            onClick={() => onClick(draft)}
        >
            {/* Drag Handle Hint */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                <GripVertical size={14} />
            </div>

            <div className="font-medium mb-3 leading-snug text-sm text-card-foreground pr-4">
                {draft.title}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                {/* Priority Badge */}
                {typeof draft.priority === 'number' ? (
                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
                        #{draft.priority}
                    </span>
                ) : (
                    draft.priority !== '-' && (
                        <span
                            className={clsx(
                                'px-2 py-0.5 rounded-full border',
                                draft.priority === 'now'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400'
                                    : draft.priority === 'next'
                                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 dark:text-orange-400'
                                        : 'bg-secondary text-secondary-foreground border-border'
                            )}
                        >
                            {draft.priority}
                        </span>
                    )
                )}

                {/* Value Badge */}
                {draft.value !== '-' && (
                    <span
                        className={clsx(
                            'px-2 py-0.5 rounded-full border',
                            draft.value === 'core'
                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:text-indigo-400'
                                : draft.value === 'vision'
                                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:text-purple-400'
                                    : 'bg-secondary text-secondary-foreground border-border'
                        )}
                    >
                        {draft.value}
                    </span>
                )}
            </div>

            {/* Filename on hover */}
            <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-muted-foreground font-mono">
                {draft.filename}
            </div>
        </div>
    );
}
