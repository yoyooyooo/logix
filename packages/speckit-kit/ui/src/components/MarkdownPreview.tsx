import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  markdown: string
  highlightLine?: number | null
}

type NodeWithPosition = {
  readonly position?: {
    readonly start?: {
      readonly line?: number
    }
  }
}

function getStartLine(node: unknown): number | null {
  const line = (node as NodeWithPosition | null)?.position?.start?.line
  return typeof line === 'number' ? line : null
}

function headingClass(level: number): string {
  switch (level) {
    case 1:
      return 'mt-4 text-lg font-semibold text-foreground'
    case 2:
      return 'mt-4 text-base font-semibold text-foreground'
    case 3:
      return 'mt-3 text-sm font-semibold text-foreground'
    default:
      return 'mt-3 text-sm font-semibold text-foreground'
  }
}

export function MarkdownPreview({ markdown, highlightLine }: Props) {
  if (markdown.trim() === '') {
    return <div className="text-sm text-muted-foreground">（空）</div>
  }

  const shouldHighlight = (line: number | null): boolean => typeof highlightLine === 'number' && line === highlightLine

  const withLine = (node: unknown): { readonly 'data-md-line'?: number } => {
    const line = getStartLine(node)
    return line ? { 'data-md-line': line } : {}
  }

  return (
    <div className="min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h1 {...withLine(node)} className={[headingClass(1), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h1>
            )
          },
          h2: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h2 {...withLine(node)} className={[headingClass(2), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h2>
            )
          },
          h3: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h3 {...withLine(node)} className={[headingClass(3), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h3>
            )
          },
          h4: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h4 {...withLine(node)} className={[headingClass(4), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h4>
            )
          },
          h5: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h5 {...withLine(node)} className={[headingClass(5), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h5>
            )
          },
          h6: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <h6 {...withLine(node)} className={[headingClass(6), shouldHighlight(line) ? 'speckit-task-highlight' : null].filter(Boolean).join(' ')}>
                {children}
              </h6>
            )
          },
          hr: () => <hr className="my-2 border-border/60" />,
          p: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <p
                data-md-line={line ?? undefined}
                className={[
                  'whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90',
                  shouldHighlight(line) ? 'speckit-task-highlight' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {children}
              </p>
            )
          },
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-sm text-foreground/90">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-sm text-foreground/90">{children}</ol>,
          li: ({ node, children }) => {
            const line = getStartLine(node)
            return (
              <li
                data-md-line={line ?? undefined}
                className={['whitespace-pre-wrap break-words', shouldHighlight(line) ? 'speckit-task-highlight' : null]
                  .filter(Boolean)
                  .join(' ')}
              >
                {children}
              </li>
            )
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary/60"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="max-w-full overflow-x-auto rounded-xl border border-border/60 bg-muted p-3 font-mono text-xs leading-5 text-foreground">
              {children}
            </pre>
          ),
          code: ({ node: _node, className, children, ...props }) => {
            const raw =
              typeof children === 'string'
                ? children
                : Array.isArray(children) && children.every((c) => typeof c === 'string')
                  ? children.join('')
                  : null
            const isBlock = (className?.includes('language-') ?? false) || (raw?.includes('\n') ?? false)

            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <code
                className={['rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground', className ?? null]
                  .filter(Boolean)
                  .join(' ')}
                {...props}
              >
                {children}
              </code>
            )
          },
          input: ({ node: _node, type, ...props }) => {
            if (type !== 'checkbox') return <input type={type} {...props} />
            return <input type="checkbox" className="mr-2 align-middle" disabled readOnly {...props} />
          },
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full border-collapse text-sm text-foreground/90">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border/60 bg-muted px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border/60 px-2 py-1 align-top">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border/60 pl-3 text-sm text-muted-foreground">{children}</blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
