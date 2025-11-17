import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  markdown: string
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
      return 'mt-4 text-lg font-semibold text-zinc-900'
    case 2:
      return 'mt-4 text-base font-semibold text-zinc-900'
    case 3:
      return 'mt-3 text-sm font-semibold text-zinc-900'
    default:
      return 'mt-3 text-sm font-semibold text-zinc-900'
  }
}

export function MarkdownPreview({ markdown }: Props) {
  if (markdown.trim() === '') {
    return <div className="text-sm text-zinc-500">（空）</div>
  }

  return (
    <div className="min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className={headingClass(1)}>{children}</h1>,
          h2: ({ children }) => <h2 className={headingClass(2)}>{children}</h2>,
          h3: ({ children }) => <h3 className={headingClass(3)}>{children}</h3>,
          h4: ({ children }) => <h4 className={headingClass(4)}>{children}</h4>,
          h5: ({ children }) => <h5 className={headingClass(5)}>{children}</h5>,
          h6: ({ children }) => <h6 className={headingClass(6)}>{children}</h6>,
          hr: () => <hr className="my-2 border-zinc-200" />,
          p: ({ node, children }) => (
            <p
              data-md-line={getStartLine(node) ?? undefined}
              className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800"
            >
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-sm text-zinc-800">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-sm text-zinc-800">{children}</ol>,
          li: ({ node, children }) => (
            <li data-md-line={getStartLine(node) ?? undefined} className="whitespace-pre-wrap break-words">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:decoration-sky-400"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-5 text-zinc-900">
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
                className={['rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-zinc-800', className ?? null]
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
              <table className="w-full border-collapse text-sm text-zinc-800">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-zinc-200 px-2 py-1 align-top">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-200 pl-3 text-sm text-zinc-700">{children}</blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
