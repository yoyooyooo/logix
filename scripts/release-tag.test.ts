import { describe, expect, it } from 'vitest'

import {
  bumpVersion,
  compareSemver,
  parseSemver,
  previousReleaseAnchorTag,
  releaseBranchName,
  resolveReleaseBranchPlan,
  resolveVersion,
} from './release-tag.mjs'

describe('release-tag version helpers', () => {
  it('parses semver with prerelease', () => {
    expect(parseSemver('1.2.3-beta.4')).toEqual({
      raw: '1.2.3-beta.4',
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.4',
    })
  })

  it('compares stable and prerelease versions correctly', () => {
    expect(compareSemver(parseSemver('1.2.3'), parseSemver('1.2.3-beta.4'))).toBeGreaterThan(0)
    expect(compareSemver(parseSemver('1.2.3-beta.2'), parseSemver('1.2.3-beta.4'))).toBeLessThan(0)
  })

  it('bumps patch, minor, and major versions', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('defaults to the next stable patch release', () => {
    const version = resolveVersion(
      {
        channel: 'stable',
        bump: 'patch',
        base: null,
        version: null,
      },
      [
        {
          tag: 'logix-v1.2.3',
          version: '1.2.3',
          parsed: parseSemver('1.2.3'),
        },
      ],
    )

    expect(version).toBe('1.2.4')
  })

  it('plans prerelease tags from the next stable base', () => {
    const version = resolveVersion(
      {
        channel: 'beta',
        bump: 'minor',
        base: null,
        version: null,
      },
      [
        {
          tag: 'logix-v1.2.3',
          version: '1.2.3',
          parsed: parseSemver('1.2.3'),
        },
      ],
    )

    expect(version).toBe('1.3.0-beta.1')
  })

  it('names local release branches after the tag', () => {
    expect(releaseBranchName('logix-v1.2.4')).toBe('release/logix-v1.2.4')
  })

  it('auto-creates a release branch from clean main', () => {
    const plan = resolveReleaseBranchPlan(
      {
        autoReleaseBranch: true,
        dryRun: false,
        mainBranch: 'main',
      },
      {
        currentBranch: 'main',
        clean: true,
        head: 'abc',
        releaseBranchExists: false,
        releaseBranchHead: null,
      },
      'logix-v1.2.4',
    )

    expect(plan).toEqual({
      currentBranch: 'main',
      releaseBranch: 'release/logix-v1.2.4',
      action: 'create',
    })
  })

  it('keeps dry-run branch creation as a plan only', () => {
    const plan = resolveReleaseBranchPlan(
      {
        autoReleaseBranch: true,
        dryRun: true,
        mainBranch: 'main',
      },
      {
        currentBranch: 'main',
        clean: true,
        head: 'abc',
        releaseBranchExists: false,
        releaseBranchHead: null,
      },
      'logix-v1.2.4',
    )

    expect(plan.action).toBe('would-create')
  })

  it('does not auto-switch from non-main branches or dirty main', () => {
    const options = {
      autoReleaseBranch: true,
      dryRun: false,
      mainBranch: 'main',
    }

    expect(
      resolveReleaseBranchPlan(
        options,
        {
          currentBranch: 'next-api',
          clean: true,
          head: 'abc',
          releaseBranchExists: false,
          releaseBranchHead: null,
        },
        'logix-v1.2.4',
      ).action,
    ).toBe('none')

    expect(
      resolveReleaseBranchPlan(
        options,
        {
          currentBranch: 'main',
          clean: false,
          head: 'abc',
          releaseBranchExists: false,
          releaseBranchHead: null,
        },
        'logix-v1.2.4',
      ).action,
    ).toBe('none')
  })

  it('reuses an existing release branch only when it points at the same commit', () => {
    expect(
      resolveReleaseBranchPlan(
        {
          autoReleaseBranch: true,
          dryRun: false,
          mainBranch: 'main',
        },
        {
          currentBranch: 'main',
          clean: true,
          head: 'abc',
          releaseBranchExists: true,
          releaseBranchHead: 'abc',
        },
        'logix-v1.2.4',
      ).action,
    ).toBe('switch-existing')

    expect(() =>
      resolveReleaseBranchPlan(
        {
          autoReleaseBranch: true,
          dryRun: false,
          mainBranch: 'main',
        },
        {
          currentBranch: 'main',
          clean: true,
          head: 'abc',
          releaseBranchExists: true,
          releaseBranchHead: 'def',
        },
        'logix-v1.2.4',
      ),
    ).toThrow(/different commit/)
  })

  it('uses the previous unified tag as the release notes anchor when available', () => {
    expect(
      previousReleaseAnchorTag(
        ['@logixjs/core@1.0.1', 'logix-v1.0.2', 'logix-v1.0.3'],
        'logix-v1.0.4',
        '1.0.4',
      ),
    ).toBe('logix-v1.0.3')
  })

  it('falls back to the historical stable core tag for the first unified stable release', () => {
    expect(
      previousReleaseAnchorTag(
        ['@logixjs/core@1.0.0', '@logixjs/core@1.0.1', '@logixjs/core@1.0.2-beta.1'],
        'logix-v1.0.2',
        '1.0.2',
      ),
    ).toBe('@logixjs/core@1.0.1')
  })
})
