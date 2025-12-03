import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Draft } from '../types';
import ReactMarkdown from 'react-markdown';

interface Props {
    draft: Draft | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface DraftDetail extends Draft {
    content?: string;
    fullPath?: string;
}

export function DraftDetailDialog({ draft, open, onOpenChange }: Props) {
    const [detail, setDetail] = useState<DraftDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && draft) {
            setLoading(true);
            fetch(`/api/drafts/${draft.filename}`)
                .then((res) => res.json())
                .then((data) => {
                    setDetail({ ...draft, ...data });
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            setDetail(null);
        }
    }, [open, draft]);

    if (!draft) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-background text-foreground border-border shadow-2xl shadow-black/20 p-0 gap-0">
                <DialogHeader className="p-6 border-b border-border bg-background/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{draft.title}</DialogTitle>
                            <DialogDescription className="text-muted-foreground font-mono text-xs mt-2 flex items-center gap-2">
                                <span>{draft.filename}</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                <span>{draft.level}</span>
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-border hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                            onClick={() => {
                                if (detail?.fullPath) {
                                    window.location.href = `vscode://file/${detail.fullPath}`;
                                }
                            }}
                        >
                            Open in VS Code
                        </Button>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <div className="bg-secondary px-3 py-1 rounded-md border border-border flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Priority</span>
                            <span className="font-mono text-secondary-foreground">#{draft.priority}</span>
                        </div>
                        <div className="bg-secondary px-3 py-1 rounded-md border border-border flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Value</span>
                            <span className="font-medium text-secondary-foreground capitalize">{draft.value}</span>
                        </div>
                        <div className="bg-secondary px-3 py-1 rounded-md border border-border flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Status</span>
                            <span className="font-medium text-secondary-foreground capitalize">{draft.status}</span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 bg-background">
                    {loading ? (
                        <div className="h-32 flex items-center justify-center text-muted-foreground animate-pulse">
                            Loading content...
                        </div>
                    ) : (
                        <div className="prose dark:prose-invert max-w-none prose-sm prose-headings:font-semibold prose-a:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                            <ReactMarkdown>
                                {detail?.content || 'No content available.'}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
