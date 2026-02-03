import { Effect } from 'effect'
import fg from 'fast-glob'
import path from 'node:path'
import { Project } from 'ts-morph'

export type ProjectFiles = {
  readonly repoRootAbs: string
  readonly filesAbs: ReadonlyArray<string>
  readonly project: Project
}

const normalizeAbsPath = (p: string): string => path.resolve(p)

export const buildProject = (args: {
  readonly repoRoot: string
  readonly tsconfig?: string
  readonly includeGlobs?: ReadonlyArray<string>
  readonly excludeGlobs?: ReadonlyArray<string>
}): Effect.Effect<ProjectFiles, unknown> =>
  Effect.gen(function* () {
    const repoRootAbs = normalizeAbsPath(args.repoRoot)
    const tsconfigAbs = args.tsconfig ? (path.isAbsolute(args.tsconfig) ? args.tsconfig : path.join(repoRootAbs, args.tsconfig)) : undefined

    const includeGlobs = Array.from(args.includeGlobs ?? ['**/*.ts', '**/*.tsx'])
    const excludeGlobs = Array.from(
      args.excludeGlobs ??
      [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.turbo/**',
        '**/.vite/**',
        '**/.next/**',
        '**/.source/**',
        '**/public/**',
        '**/.logix/**',
      ]
    )

    const filesAbs = yield* Effect.tryPromise({
      try: () =>
        fg(includeGlobs, {
          cwd: repoRootAbs,
          absolute: true,
          onlyFiles: true,
          ignore: excludeGlobs,
        }).then((xs) => xs.map((x) => normalizeAbsPath(x)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
      catch: (cause) => cause,
    })

    const project = new Project({
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
      ...(tsconfigAbs ? { tsConfigFilePath: tsconfigAbs } : null),
    })

    for (const fileAbs of filesAbs) {
      project.addSourceFileAtPath(fileAbs)
    }

    return { repoRootAbs, filesAbs, project } satisfies ProjectFiles
  })
