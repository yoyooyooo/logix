import { describe, expect, it } from 'vitest'

import {
  filterThreadsForOutput,
  getExitCode,
  parseArgs,
  renderReport,
  type ReviewThreadReport,
} from './pr-review-threads'

const sampleReport: ReviewThreadReport = {
  repo: {
    owner: 'acme',
    name: 'widgets',
  },
  pr: {
    number: 42,
    title: 'Tighten runtime surface',
    url: 'https://github.com/acme/widgets/pull/42',
    headRefName: 'feat/review-threads',
  },
  totalThreadCount: 2,
  unresolvedThreadCount: 1,
  threads: [
    {
      id: 'thread-unresolved',
      isResolved: false,
      isOutdated: false,
      path: 'packages/logix-core/src/Runtime.ts',
      line: 88,
      startLine: 84,
      originalLine: null,
      originalStartLine: null,
      url: 'https://github.com/acme/widgets/pull/42#discussion_r1',
      comments: [
        {
          id: 'comment-1',
          author: 'reviewer-a',
          body: 'Please split this branch.',
          url: 'https://github.com/acme/widgets/pull/42#discussion_r1',
          createdAt: '2026-03-30T08:00:00Z',
        },
      ],
    },
    {
      id: 'thread-resolved',
      isResolved: true,
      isOutdated: false,
      path: 'packages/logix-core/src/Flow.ts',
      line: 19,
      startLine: 19,
      originalLine: null,
      originalStartLine: null,
      url: 'https://github.com/acme/widgets/pull/42#discussion_r2',
      comments: [
        {
          id: 'comment-2',
          author: 'reviewer-b',
          body: 'Fixed.',
          url: 'https://github.com/acme/widgets/pull/42#discussion_r2',
          createdAt: '2026-03-30T08:05:00Z',
        },
      ],
    },
  ],
}

describe('parseArgs', () => {
  it('returns markdown defaults', () => {
    expect(parseArgs([])).toEqual({
      format: 'markdown',
      includeResolved: false,
      failOnUnresolved: false,
    })
  })

  it('parses explicit flags', () => {
    expect(
      parseArgs([
        '--pr',
        '123',
        '--owner',
        'logixjs',
        '--repo',
        'intent-flow',
        '--format',
        'json',
        '--include-resolved',
        '--fail-on-unresolved',
      ]),
    ).toEqual({
      pr: 123,
      owner: 'logixjs',
      repo: 'intent-flow',
      format: 'json',
      includeResolved: true,
      failOnUnresolved: true,
    })
  })

  it('ignores the pnpm argument separator', () => {
    expect(parseArgs(['--', '--pr', '148', '--format', 'json'])).toEqual({
      pr: 148,
      format: 'json',
      includeResolved: false,
      failOnUnresolved: false,
    })
  })
})

describe('filterThreadsForOutput', () => {
  it('hides resolved threads by default', () => {
    expect(filterThreadsForOutput(sampleReport.threads, false).map((thread) => thread.id)).toEqual([
      'thread-unresolved',
    ])
  })

  it('keeps resolved threads when requested', () => {
    expect(filterThreadsForOutput(sampleReport.threads, true).map((thread) => thread.id)).toEqual([
      'thread-unresolved',
      'thread-resolved',
    ])
  })
})

describe('renderReport', () => {
  it('renders markdown summary with unresolved-only view by default', () => {
    const text = renderReport(sampleReport, {
      format: 'markdown',
      includeResolved: false,
      failOnUnresolved: false,
    })

    expect(text).toContain('# PR #42 review threads')
    expect(text).toContain('Unresolved: 1 / Total: 2')
    expect(text).toContain('packages/logix-core/src/Runtime.ts')
    expect(text).not.toContain('packages/logix-core/src/Flow.ts')
  })

  it('renders json with resolved threads when requested', () => {
    const text = renderReport(sampleReport, {
      format: 'json',
      includeResolved: true,
      failOnUnresolved: false,
    })

    expect(JSON.parse(text)).toMatchObject({
      unresolvedThreadCount: 1,
      totalThreadCount: 2,
      threads: [{ id: 'thread-unresolved' }, { id: 'thread-resolved' }],
    })
  })
})

describe('getExitCode', () => {
  it('returns non-zero when fail-on-unresolved is enabled', () => {
    expect(
      getExitCode(sampleReport, {
        format: 'markdown',
        includeResolved: false,
        failOnUnresolved: true,
      }),
    ).toBe(1)
  })

  it('returns zero when unresolved threads are allowed', () => {
    expect(
      getExitCode(sampleReport, {
        format: 'markdown',
        includeResolved: false,
        failOnUnresolved: false,
      }),
    ).toBe(0)
  })
})
