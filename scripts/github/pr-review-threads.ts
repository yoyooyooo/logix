import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export type OutputFormat = 'json' | 'markdown'

export type CliOptions = {
  readonly pr?: number
  readonly owner?: string
  readonly repo?: string
  readonly format: OutputFormat
  readonly includeResolved: boolean
  readonly failOnUnresolved: boolean
}

export type RepoRef = {
  readonly owner: string
  readonly name: string
}

export type ReviewComment = {
  readonly id: string
  readonly author: string | null
  readonly body: string
  readonly url: string
  readonly createdAt: string
}

export type ReviewThread = {
  readonly id: string
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly path: string
  readonly line: number | null
  readonly startLine: number | null
  readonly originalLine: number | null
  readonly originalStartLine: number | null
  readonly url: string
  readonly comments: ReadonlyArray<ReviewComment>
}

export type ReviewThreadReport = {
  readonly repo: RepoRef
  readonly pr: {
    readonly number: number
    readonly title: string
    readonly url: string
    readonly headRefName: string
  }
  readonly totalThreadCount: number
  readonly unresolvedThreadCount: number
  readonly threads: ReadonlyArray<ReviewThread>
}

type PullRequestSummary = {
  readonly number: number
  readonly title: string
  readonly url: string
  readonly headRefName: string
}

type GraphqlBranchLookupResponse = {
  readonly data: {
    readonly repository: {
      readonly pullRequests: {
        readonly nodes: ReadonlyArray<PullRequestSummary>
      }
    } | null
  }
}

type GraphqlReviewThreadsResponse = {
  readonly data: {
    readonly repository: {
      readonly pullRequest: {
        readonly number: number
        readonly title: string
        readonly url: string
        readonly headRefName: string
        readonly reviewThreads: {
          readonly nodes: ReadonlyArray<{
            readonly id: string
            readonly isResolved: boolean
            readonly isOutdated: boolean
            readonly path: string
            readonly line: number | null
            readonly startLine: number | null
            readonly originalLine: number | null
            readonly originalStartLine: number | null
            readonly comments: {
              readonly nodes: ReadonlyArray<{
                readonly id: string
                readonly body: string
                readonly url: string
                readonly createdAt: string
                readonly author: {
                  readonly login: string
                } | null
              }>
            }
          }>
          readonly pageInfo: {
            readonly hasNextPage: boolean
            readonly endCursor: string | null
          }
        }
      } | null
    } | null
  }
}

type GraphqlReviewThreadNode =
  NonNullable<
    NonNullable<GraphqlReviewThreadsResponse['data']['repository']>['pullRequest']
  >['reviewThreads']['nodes'][number]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

const usage = (): string => `\
Usage:
  pnpm pr:review-threads [-- --pr <number>] [--owner <owner>] [--repo <repo>] [--format json|markdown] [--include-resolved] [--fail-on-unresolved]
  pnpm pr:review-threads -- --help

Behavior:
  - 默认查询当前分支在当前仓库对应的 open PR
  - --pr 可直接指定 PR 编号
  - --owner/--repo 可覆盖从 git remote 推导出的仓库
  - --fail-on-unresolved 在存在 unresolved threads 时返回退出码 1
`

export const parseArgs = (argv: ReadonlyArray<string>): CliOptions => {
  let pr: number | undefined
  let owner: string | undefined
  let repo: string | undefined
  let format: OutputFormat = 'markdown'
  let includeResolved = false
  let failOnUnresolved = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    switch (arg) {
      case '--':
        continue
      case '--pr': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --pr <number>')
        }
        const parsed = Number.parseInt(value, 10)
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`Invalid PR number: ${value}`)
        }
        pr = parsed
        index += 1
        continue
      }
      case '--owner': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --owner <owner>')
        }
        owner = value
        index += 1
        continue
      }
      case '--repo': {
        const value = argv[index + 1]
        if (!value) {
          throw new Error('Missing value for --repo <repo>')
        }
        repo = value
        index += 1
        continue
      }
      case '--format': {
        const value = argv[index + 1]
        if (value !== 'json' && value !== 'markdown') {
          throw new Error(`Invalid format: ${value ?? '<missing>'}. Expected json or markdown.`)
        }
        format = value
        index += 1
        continue
      }
      case '--include-resolved':
        includeResolved = true
        continue
      case '--fail-on-unresolved':
        failOnUnresolved = true
        continue
      case '--help':
      case '-h':
        continue
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return {
    pr,
    owner,
    repo,
    format,
    includeResolved,
    failOnUnresolved,
  }
}

const runCommand = (command: string, args: ReadonlyArray<string>, cwd: string): string => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 64,
    }).trim()
  } catch (error) {
    const stderr =
      typeof error === 'object' &&
      error != null &&
      'stderr' in error &&
      typeof (error as { readonly stderr?: unknown }).stderr === 'string'
        ? (error as { readonly stderr: string }).stderr.trim()
        : undefined
    const message = stderr && stderr.length > 0 ? stderr : String(error)
    throw new Error(`${command} ${args.join(' ')} failed: ${message}`)
  }
}

const parseRemoteUrl = (remoteUrl: string): RepoRef | null => {
  const trimmed = remoteUrl.trim().replace(/\/+$/, '')

  const scpLike = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  if (scpLike) {
    return {
      owner: scpLike[1],
      name: scpLike[2],
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('ssh://')) {
    const url = new URL(trimmed)
    if (url.hostname !== 'github.com') {
      return null
    }
    const parts = url.pathname.replace(/^\/+/, '').replace(/\.git$/, '').split('/')
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return {
        owner: parts[0],
        name: parts[1],
      }
    }
  }

  return null
}

const inferRepoRef = (cliOptions: CliOptions): RepoRef => {
  if (cliOptions.owner && cliOptions.repo) {
    return {
      owner: cliOptions.owner,
      name: cliOptions.repo,
    }
  }

  const remoteUrl = runCommand('git', ['remote', 'get-url', 'origin'], repoRoot)
  const remoteRepo = parseRemoteUrl(remoteUrl)

  if (!remoteRepo) {
    throw new Error(
      'Unable to infer owner/repo from git remote origin. Use --owner <owner> --repo <repo> explicitly.',
    )
  }

  return {
    owner: cliOptions.owner ?? remoteRepo.owner,
    name: cliOptions.repo ?? remoteRepo.name,
  }
}

const getCurrentBranch = (): string => {
  const branch = runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot)
  if (!branch || branch === 'HEAD') {
    throw new Error('Current HEAD is detached. Use --pr <number> explicitly.')
  }
  return branch
}

const runGraphql = <T>(query: string, variables: Record<string, string | number | boolean | undefined>): T => {
  const args = ['api', 'graphql', '-f', `query=${query}`]

  for (const [key, value] of Object.entries(variables)) {
    if (value == null) {
      continue
    }
    args.push('-F', `${key}=${String(value)}`)
  }

  const raw = runCommand('gh', args, repoRoot)
  return JSON.parse(raw) as T
}

const BRANCH_LOOKUP_QUERY = `
query ReviewThreadsPullRequestsByBranch($owner: String!, $repo: String!, $branch: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: 10, states: OPEN, headRefName: $branch, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes {
        number
        title
        url
        headRefName
      }
    }
  }
}
`

const REVIEW_THREADS_QUERY = `
query ReviewThreadsPullRequest($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      number
      title
      url
      headRefName
      reviewThreads(first: 100, after: $after) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          startLine
          originalLine
          originalStartLine
          comments(last: 1) {
            nodes {
              id
              body
              url
              createdAt
              author {
                login
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`

const resolvePullRequestNumber = (repo: RepoRef, cliOptions: CliOptions): number => {
  if (cliOptions.pr != null) {
    return cliOptions.pr
  }

  const branch = getCurrentBranch()
  const response = runGraphql<GraphqlBranchLookupResponse>(BRANCH_LOOKUP_QUERY, {
    owner: repo.owner,
    repo: repo.name,
    branch,
  })

  const candidates = response.data.repository?.pullRequests.nodes ?? []

  if (candidates.length === 0) {
    throw new Error(`No open pull request found for branch ${branch} in ${repo.owner}/${repo.name}.`)
  }

  if (candidates.length > 1) {
    const listed = candidates.map((candidate) => `#${candidate.number} ${candidate.title}`).join(', ')
    throw new Error(`Multiple open pull requests found for branch ${branch}: ${listed}. Use --pr <number>.`)
  }

  return candidates[0].number
}

const mapThread = (node: GraphqlReviewThreadNode, fallbackUrl: string): ReviewThread => {
  const comments = node.comments.nodes.map((comment) => ({
    id: comment.id,
    author: comment.author?.login ?? null,
    body: comment.body,
    url: comment.url,
    createdAt: comment.createdAt,
  }))

  return {
    id: node.id,
    isResolved: node.isResolved,
    isOutdated: node.isOutdated,
    path: node.path,
    line: node.line,
    startLine: node.startLine,
    originalLine: node.originalLine,
    originalStartLine: node.originalStartLine,
    url: comments[comments.length - 1]?.url ?? fallbackUrl,
    comments,
  }
}

const loadReviewThreadReport = (repo: RepoRef, prNumber: number): ReviewThreadReport => {
  const threads: Array<ReviewThread> = []
  let cursor: string | undefined
  let summary: PullRequestSummary | undefined

  while (true) {
    const response = runGraphql<GraphqlReviewThreadsResponse>(REVIEW_THREADS_QUERY, {
      owner: repo.owner,
      repo: repo.name,
      pr: prNumber,
      after: cursor,
    })

    const pullRequest = response.data.repository?.pullRequest
    if (!pullRequest) {
      throw new Error(`Pull request #${prNumber} was not found in ${repo.owner}/${repo.name}.`)
    }

    if (!summary) {
      summary = {
        number: pullRequest.number,
        title: pullRequest.title,
        url: pullRequest.url,
        headRefName: pullRequest.headRefName,
      }
    }

    threads.push(...pullRequest.reviewThreads.nodes.map((node) => mapThread(node, pullRequest.url)))

    if (!pullRequest.reviewThreads.pageInfo.hasNextPage || !pullRequest.reviewThreads.pageInfo.endCursor) {
      break
    }

    cursor = pullRequest.reviewThreads.pageInfo.endCursor
  }

  if (!summary) {
    throw new Error(`Could not retrieve PR summary for PR #${prNumber}.`)
  }

  return {
    repo,
    pr: summary,
    totalThreadCount: threads.length,
    unresolvedThreadCount: threads.filter((thread) => !thread.isResolved).length,
    threads,
  }
}

export const filterThreadsForOutput = (
  threads: ReadonlyArray<ReviewThread>,
  includeResolved: boolean,
): ReadonlyArray<ReviewThread> => (includeResolved ? threads : threads.filter((thread) => !thread.isResolved))

const getThreadLocation = (thread: ReviewThread): string => {
  const start = thread.startLine ?? thread.originalStartLine ?? null
  const end = thread.line ?? thread.originalLine ?? null

  if (start != null && end != null && start !== end) {
    return `${thread.path}:${start}-${end}`
  }
  if (end != null) {
    return `${thread.path}:${end}`
  }
  if (start != null) {
    return `${thread.path}:${start}`
  }
  return thread.path
}

const summarizeCommentBody = (body: string): string => {
  const compact = body.replace(/\s+/g, ' ').trim()
  if (compact.length <= 160) {
    return compact
  }
  return `${compact.slice(0, 157)}...`
}

const renderMarkdown = (report: ReviewThreadReport, options: CliOptions): string => {
  const visibleThreads = filterThreadsForOutput(report.threads, options.includeResolved)
  const lines: Array<string> = [
    `# PR #${report.pr.number} review threads`,
    '',
    `- Repo: ${report.repo.owner}/${report.repo.name}`,
    `- PR: ${report.pr.title}`,
    `- Branch: ${report.pr.headRefName}`,
    `- URL: ${report.pr.url}`,
    `- Unresolved: ${report.unresolvedThreadCount} / Total: ${report.totalThreadCount}`,
    `- Showing: ${options.includeResolved ? 'all threads' : 'unresolved only'}`,
  ]

  if (visibleThreads.length === 0) {
    lines.push('', 'No review threads to show.')
    return lines.join('\n')
  }

  for (const [index, thread] of visibleThreads.entries()) {
    const latestComment = thread.comments[thread.comments.length - 1]
    lines.push('', `## ${index + 1}. ${thread.isResolved ? 'resolved' : 'unresolved'} ${getThreadLocation(thread)}`)
    lines.push(`- Outdated: ${thread.isOutdated ? 'yes' : 'no'}`)
    lines.push(`- URL: ${thread.url}`)
    if (latestComment) {
      lines.push(
        `- Latest: ${latestComment.author ?? 'unknown'} @ ${latestComment.createdAt} | ${summarizeCommentBody(latestComment.body)}`,
      )
    }
  }

  return lines.join('\n')
}

export const renderReport = (report: ReviewThreadReport, options: CliOptions): string => {
  const visibleThreads = filterThreadsForOutput(report.threads, options.includeResolved)

  if (options.format === 'json') {
    return JSON.stringify(
      {
        ...report,
        threads: visibleThreads,
      },
      null,
      2,
    )
  }

  return renderMarkdown(report, options)
}

export const getExitCode = (report: ReviewThreadReport, options: CliOptions): number =>
  options.failOnUnresolved && report.unresolvedThreadCount > 0 ? 1 : 0

const main = (): void => {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    // eslint-disable-next-line no-console
    console.log(usage())
    return
  }

  const options = parseArgs(argv)
  const repo = inferRepoRef(options)
  const prNumber = resolvePullRequestNumber(repo, options)
  const report = loadReviewThreadReport(repo, prNumber)

  // eslint-disable-next-line no-console
  console.log(renderReport(report, options))
  process.exitCode = getExitCode(report, options)
}

const isEntrypoint = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  try {
    main()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
