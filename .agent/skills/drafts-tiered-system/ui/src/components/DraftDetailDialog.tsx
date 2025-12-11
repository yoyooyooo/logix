import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, X, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { type Draft } from '../types';
import { useQuery } from '@tanstack/react-query';

interface Props {
    draft: Draft | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface DraftDetail extends Draft {
    content: string;
    fullPath: string;
}

export function DraftDetailDialog({ draft, open, onOpenChange }: Props) {
    const { data: detail, isLoading } = useQuery({
        queryKey: ['draft', draft?.filename],
        queryFn: async () => {
            if (!draft) return null;
            const res = await fetch(`/api/drafts/${draft.filename}`);
            const data = await res.json();
            return { ...draft, ...data } as DraftDetail;
        },
        enabled: !!draft && open
    });

    if (!draft) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[calc(100vw-200px)] max-h-[85vh] overflow-y-auto bg-background text-foreground border-border shadow-2xl shadow-black/20 p-0 gap-0">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
                    <div className="flex items-start justify-between p-6 pb-4">
                        <div className="space-y-1 pr-8">
                            <DialogTitle className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                                {draft.title}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground flex items-center gap-2 text-sm">
                                <FileText className="w-3 h-3" />
                                {draft.filename}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 border-input hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                    if (detail?.fullPath) {
                                        fetch('/api/open', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ path: detail.fullPath })
                                        });
                                    }
                                }}
                            >
                                <Edit className="w-3 h-3" />
                                Edit
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="px-6 pb-4 flex flex-wrap gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${draft.status === 'done' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                            {draft.status}
                        </span>
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium border border-primary/20 text-primary bg-primary/5">
                            {draft.level}
                        </span>
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium border border-border text-muted-foreground">
                            {draft.value}
                        </span>
                    </div>
                </div>

                <div className="p-8 bg-background">
                    {isLoading ? (
                        <div className="h-32 flex items-center justify-center text-muted-foreground animate-pulse">
                            Loading content...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {detail?.related && detail.related.length > 0 && (
                                <div className="bg-accent/30 border border-accent rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-primary rounded-full" />
                                        Related Documents
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.related.map((rel) => (
                                            <Button
                                                key={rel}
                                                variant="secondary"
                                                size="sm"
                                                className="h-7 text-xs bg-background hover:bg-primary hover:text-primary-foreground border border-border transition-all"
                                                onClick={() => {
                                                    window.dispatchEvent(new CustomEvent('navigate-draft', { detail: rel }));
                                                }}
                                            >
                                                {rel}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="prose dark:prose-invert max-w-none prose-sm prose-headings:font-semibold prose-a:text-primary prose-pre:bg-transparent prose-pre:p-0">
                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={`${className} bg-muted px-1 py-0.5 rounded-sm`} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}
                                >
                                    {detail?.content || ''}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
