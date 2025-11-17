import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type Options = {
  readonly outDir: string
  readonly domain: string
  readonly wire: boolean
  readonly dryRun: boolean
}

type DomainNames = {
  readonly words: ReadonlyArray<string>
  readonly pascal: string
  readonly camel: string
  readonly routePlural: string
  readonly tablePlural: string
}

function usage(): never {
  // eslint-disable-next-line no-console
  console.error(
    [
      '用法:',
      '  pnpm -C .codex/skills/effect-httpapi-postgres-crud generate -- --out apps/logix-galaxy-api/src --domain Todo',
      '  pnpm -C .codex/skills/effect-httpapi-postgres-crud generate -- --out examples/effect-api/src --domain user-profile',
      '',
      '参数:',
      '  --out <dir>        目标输出目录（通常是 apps/<service>/src）',
      '  --domain <name>    领域名称（支持 Todo / todo / userProfile / user-profile / user_profile）',
      '  --wire             自动注册到 src/app/effect-api.ts 与 src/main.ts（默认开启）',
      '  --no-wire          不做注册，仅生成 src/<resource> 文件夹',
      '  --dry-run          不写入文件，仅打印计划（仍会做校验与解析）',
      '',
      '环境变量（PG 集成测试）:',
      '  DATABASE_URL=...               启用 pg 集成测试',
      "  LOGIX_PG_TEST_KEEP_SCHEMA=1    保留 schema + 跳过 delete，方便人工验证数据库写入",
    ].join('\n'),
  )
  process.exit(1)
}

function takeFlag(args: string[], flag: string): boolean {
  const idx = args.indexOf(flag)
  if (idx === -1) return false
  args.splice(idx, 1)
  return true
}

function takeArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) return undefined
  const value = args[idx + 1]
  if (!value) return undefined
  args.splice(idx, 2)
  return value
}

function splitWords(raw: string): ReadonlyArray<string> {
  const normalized = raw
    .trim()
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return normalized
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}

function upperFirst(s: string): string {
  return s ? s.slice(0, 1).toUpperCase() + s.slice(1) : s
}

function toPascal(words: ReadonlyArray<string>): string {
  return words.map(upperFirst).join('')
}

function toCamel(words: ReadonlyArray<string>): string {
  if (words.length === 0) return ''
  return [words[0]!, ...words.slice(1).map(upperFirst)].join('')
}

function toSnake(words: ReadonlyArray<string>): string {
  return words.join('_')
}

function toKebab(words: ReadonlyArray<string>): string {
  return words.join('-')
}

function pluralizeWord(word: string): string {
  if (!word) return word
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

function pluralizeWords(words: ReadonlyArray<string>): ReadonlyArray<string> {
  if (words.length === 0) return words
  const last = words[words.length - 1]!
  return [...words.slice(0, -1), pluralizeWord(last)]
}

function makeDomainNames(domainRaw: string): DomainNames {
  const words = splitWords(domainRaw)
  if (words.length === 0) {
    throw new Error('domain 为空')
  }

  const singularWords = words
  const pluralWords = pluralizeWords(singularWords)

  return {
    words: singularWords,
    pascal: toPascal(singularWords),
    camel: toCamel(singularWords),
    routePlural: `/${toKebab(pluralWords)}`,
    tablePlural: toSnake(pluralWords),
  }
}

function renderContract(names: DomainNames): string {
  const GroupName = `${names.pascal}Group`
  const dto = `${names.pascal}Dto`
  const listResponse = `${names.pascal}ListResponse`
  const createReq = `${names.pascal}CreateRequest`
  const updateReq = `${names.pascal}UpdateRequest`
  const notFoundErr = `NotFoundError`
  const svcUnavailableErr = `ServiceUnavailableError`

  const createEndpoint = `${names.camel}Create`
  const listEndpoint = `${names.camel}List`
  const getEndpoint = `${names.camel}Get`
  const updateEndpoint = `${names.camel}Update`
  const deleteEndpoint = `${names.camel}Delete`

  return [
    `import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'`,
    `import { Schema } from 'effect'`,
    ``,
    `export const ${dto} = Schema.Struct({`,
    `  id: Schema.Number,`,
    `  name: Schema.String,`,
    `  enabled: Schema.Boolean,`,
    `  createdAt: Schema.String,`,
    `})`,
    ``,
    `export const ${listResponse} = Schema.Array(${dto})`,
    ``,
    `export const ${createReq} = Schema.Struct({`,
    `  name: Schema.String,`,
    `  enabled: Schema.optional(Schema.Boolean),`,
    `})`,
    ``,
    `export const ${updateReq} = Schema.Struct({`,
    `  name: Schema.optional(Schema.String),`,
    `  enabled: Schema.optional(Schema.Boolean),`,
    `})`,
    ``,
    `export const ${notFoundErr} = Schema.Struct({`,
    `  _tag: Schema.Literal('${notFoundErr}'),`,
    `  message: Schema.String,`,
    `})`,
    ``,
    `export const ${svcUnavailableErr} = Schema.Struct({`,
    `  _tag: Schema.Literal('${svcUnavailableErr}'),`,
    `  message: Schema.String,`,
    `})`,
    ``,
    `export const ${GroupName} = HttpApiGroup.make('${names.pascal}')`,
    `  .addError(${svcUnavailableErr}, { status: 503 })`,
    `  .add(`,
    `    HttpApiEndpoint.post('${createEndpoint}')\`${names.routePlural}\``,
    `      .setPayload(${createReq})`,
    `      .addSuccess(${dto}, { status: 201 }),`,
    `  )`,
    `  .add(HttpApiEndpoint.get('${listEndpoint}')\`${names.routePlural}\`.addSuccess(${listResponse}))`,
    `  .add(`,
    `    HttpApiEndpoint.get('${getEndpoint}')\`${names.routePlural}/\${HttpApiSchema.param('id', Schema.NumberFromString)}\``,
    `      .addSuccess(${dto})`,
    `      .addError(${notFoundErr}, { status: 404 }),`,
    `  )`,
    `  .add(`,
    `    HttpApiEndpoint.patch('${updateEndpoint}')\`${names.routePlural}/\${HttpApiSchema.param('id', Schema.NumberFromString)}\``,
    `      .setPayload(${updateReq})`,
    `      .addSuccess(${dto})`,
    `      .addError(${notFoundErr}, { status: 404 }),`,
    `  )`,
    `  .add(`,
    `    HttpApiEndpoint.del('${deleteEndpoint}')\`${names.routePlural}/\${HttpApiSchema.param('id', Schema.NumberFromString)}\``,
    `      .addSuccess(Schema.Void, { status: 204 })`,
    `      .addError(${notFoundErr}, { status: 404 }),`,
    `  )`,
    ``,
  ].join('\n')
}

function renderModel(names: DomainNames): string {
  return [
    `export interface ${names.pascal} {`,
    `  readonly id: number`,
    `  readonly name: string`,
    `  readonly enabled: boolean`,
    `  readonly createdAt: string`,
    `}`,
    ``,
    `export interface ${names.pascal}CreateInput {`,
    `  readonly name: string`,
    `  readonly enabled?: boolean`,
    `}`,
    ``,
    `export interface ${names.pascal}UpdateInput {`,
    `  readonly name?: string`,
    `  readonly enabled?: boolean`,
    `}`,
    ``,
  ].join('\n')
}

function renderRepo(names: DomainNames): string {
  const repoName = `${names.pascal}Repo`
  const serviceName = `${repoName}Service`
  return [
    `import { Context, Effect, Option } from 'effect'`,
    ``,
    `import { DbError } from '../db/db.js'`,
    `import type { ${names.pascal}, ${names.pascal}CreateInput, ${names.pascal}UpdateInput } from './${names.camel}.model.js'`,
    ``,
    `export interface ${serviceName} {`,
    `  readonly create: (input: ${names.pascal}CreateInput) => Effect.Effect<${names.pascal}, DbError>`,
    `  readonly get: (id: number) => Effect.Effect<Option.Option<${names.pascal}>, DbError>`,
    `  readonly list: Effect.Effect<ReadonlyArray<${names.pascal}>, DbError>`,
    `  readonly update: (id: number, patch: ${names.pascal}UpdateInput) => Effect.Effect<Option.Option<${names.pascal}>, DbError>`,
    `  readonly remove: (id: number) => Effect.Effect<boolean, DbError>`,
    `}`,
    ``,
    `export class ${repoName} extends Context.Tag('${repoName}')<${repoName}, ${serviceName}>() {}`,
    ``,
  ].join('\n')
}

function renderRepoLive(names: DomainNames): string {
  const repoName = `${names.pascal}Repo`
  const serviceName = `${repoName}Service`

  const rowType = `${names.pascal}Row`
  const toEntity = `to${names.pascal}`

  return [
    `import { Effect, Layer, Option } from 'effect'`,
    ``,
    `import { Db } from '../db/db.js'`,
    `import type { ${names.pascal}, ${names.pascal}CreateInput, ${names.pascal}UpdateInput } from './${names.camel}.model.js'`,
    `import { ${repoName}, type ${serviceName} } from './${names.camel}.repo.js'`,
    ``,
    `interface ${rowType} {`,
    `  readonly id: number`,
    `  readonly name: string`,
    `  readonly enabled: boolean`,
    `  readonly createdAt: string`,
    `}`,
    ``,
    `const ${toEntity} = (row: ${rowType}): ${names.pascal} => ({`,
    `  id: row.id,`,
    `  name: row.name,`,
    `  enabled: row.enabled,`,
    `  createdAt: row.createdAt,`,
    `})`,
    ``,
    `export const ${names.pascal}RepoLive: Layer.Layer<${repoName}, never, Db> = Layer.effect(`,
    `  ${repoName},`,
    `  Effect.gen(function* () {`,
    `    const db = yield* Db`,
    ``,
    `    const ensureTable = yield* Effect.once(`,
    `      db`,
    `        .query(`,
    `          \`create table if not exists ${names.tablePlural} (`,
    `            id serial primary key,`,
    `            name text not null,`,
    `            enabled boolean not null default true,`,
    `            created_at timestamptz not null default now()`,
    `          )\`,`,
    `        )`,
    `        .pipe(Effect.asVoid),`,
    `    )`,
    ``,
    `    const create: ${serviceName}['create'] = (input: ${names.pascal}CreateInput) =>`,
    `      ensureTable.pipe(`,
    `        Effect.zipRight(`,
    `          db`,
    `            .query<${rowType}>(`,
    `              \`insert into ${names.tablePlural} (name, enabled)`,
    `              values ($1, $2)`,
    `              returning id, name, enabled, created_at::text as "createdAt"\`,`,
    `              [input.name, input.enabled ?? true],`,
    `            )`,
    `            .pipe(`,
    `              Effect.flatMap((rows) =>`,
    `                rows[0] ? Effect.succeed(${toEntity}(rows[0])) : Effect.dieMessage('insert should return one row'),`,
    `              ),`,
    `            ),`,
    `        ),`,
    `      )`,
    ``,
    `    const get: ${serviceName}['get'] = (id: number) =>`,
    `      ensureTable.pipe(`,
    `        Effect.zipRight(`,
    `          db`,
    `            .query<${rowType}>(`,
    `              \`select id, name, enabled, created_at::text as "createdAt"`,
    `              from ${names.tablePlural}`,
    `              where id = $1\`,`,
    `              [id],`,
    `            )`,
    `            .pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(${toEntity})))),`,
    `        ),`,
    `      )`,
    ``,
    `    const list: ${serviceName}['list'] = ensureTable.pipe(`,
    `      Effect.zipRight(`,
    `        db`,
    `          .query<${rowType}>(`,
    `            \`select id, name, enabled, created_at::text as "createdAt"`,
    `            from ${names.tablePlural}`,
    `            order by id asc\`,`,
    `          )`,
    `          .pipe(Effect.map((rows) => rows.map(${toEntity}))),`,
    `      ),`,
    `    )`,
    ``,
    `    const update: ${serviceName}['update'] = (id: number, patch: ${names.pascal}UpdateInput) =>`,
    `      ensureTable.pipe(`,
    `        Effect.zipRight(`,
    `          db`,
    `            .query<${rowType}>(`,
    `              \`update ${names.tablePlural}`,
    `              set`,
    `                name = coalesce($2, name),`,
    `                enabled = coalesce($3, enabled)`,
    `              where id = $1`,
    `              returning id, name, enabled, created_at::text as "createdAt"\`,`,
    `              [id, patch.name ?? null, patch.enabled ?? null],`,
    `            )`,
    `            .pipe(Effect.map((rows) => Option.fromNullable(rows[0]).pipe(Option.map(${toEntity})))),`,
    `        ),`,
    `      )`,
    ``,
    `    const remove: ${serviceName}['remove'] = (id: number) =>`,
    `      ensureTable.pipe(`,
    `        Effect.zipRight(`,
    `          db`,
    `            .query<{ readonly id: number }>(`,
    `              \`delete from ${names.tablePlural}`,
    `              where id = $1`,
    `              returning id\`,`,
    `              [id],`,
    `            )`,
    `            .pipe(Effect.map((rows) => rows.length > 0)),`,
    `        ),`,
    `      )`,
    ``,
    `    return { create, get, list, update, remove } satisfies ${serviceName}`,
    `  }),`,
    `)`,
    ``,
  ].join('\n')
}

function renderHttpLive(names: DomainNames): string {
  const repoName = `${names.pascal}Repo`
  const liveName = `${names.pascal}Live`

  const createEndpoint = `${names.camel}Create`
  const listEndpoint = `${names.camel}List`
  const getEndpoint = `${names.camel}Get`
  const updateEndpoint = `${names.camel}Update`
  const deleteEndpoint = `${names.camel}Delete`

  return [
    `import { HttpApiBuilder } from '@effect/platform'`,
    `import { Effect, Option } from 'effect'`,
    ``,
    `import { EffectApi } from '../app/effect-api.js'`,
    `import { DbError } from '../db/db.js'`,
    `import { ${repoName} } from './${names.camel}.repo.js'`,
    ``,
    `const toServiceUnavailable = (e: DbError): { readonly _tag: 'ServiceUnavailableError'; readonly message: string } => ({`,
    `  _tag: 'ServiceUnavailableError',`,
    `  message: e.reason === 'disabled' ? 'DATABASE_URL is not set' : 'Database error',`,
    `})`,
    ``,
    `export const ${liveName} = HttpApiBuilder.group(EffectApi, '${names.pascal}', (handlers) =>`,
    `  handlers`,
    `    .handle('${createEndpoint}', ({ payload }) =>`,
    `      Effect.gen(function* () {`,
    `        const repo = yield* ${repoName}`,
    `        return yield* repo.create(payload).pipe(Effect.mapError(toServiceUnavailable))`,
    `      }),`,
    `    )`,
    `    .handle('${listEndpoint}', () =>`,
    `      Effect.gen(function* () {`,
    `        const repo = yield* ${repoName}`,
    `        return yield* repo.list.pipe(Effect.mapError(toServiceUnavailable))`,
    `      }),`,
    `    )`,
    `    .handle('${getEndpoint}', ({ path }) =>`,
    `      Effect.gen(function* () {`,
    `        const repo = yield* ${repoName}`,
    `        const entityOpt = yield* repo.get(path.id).pipe(Effect.mapError(toServiceUnavailable))`,
    `        return yield* Option.match(entityOpt, {`,
    `          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: '${names.pascal} not found' } as const),`,
    `          onSome: Effect.succeed,`,
    `        })`,
    `      }),`,
    `    )`,
    `    .handle('${updateEndpoint}', ({ path, payload }) =>`,
    `      Effect.gen(function* () {`,
    `        const repo = yield* ${repoName}`,
    `        const entityOpt = yield* repo.update(path.id, payload).pipe(Effect.mapError(toServiceUnavailable))`,
    `        return yield* Option.match(entityOpt, {`,
    `          onNone: () => Effect.fail({ _tag: 'NotFoundError', message: '${names.pascal} not found' } as const),`,
    `          onSome: Effect.succeed,`,
    `        })`,
    `      }),`,
    `    )`,
    `    .handle('${deleteEndpoint}', ({ path }) =>`,
    `      Effect.gen(function* () {`,
    `        const repo = yield* ${repoName}`,
    `        const ok = yield* repo.remove(path.id).pipe(Effect.mapError(toServiceUnavailable))`,
    `        if (!ok) {`,
    `          return yield* Effect.fail({ _tag: 'NotFoundError', message: '${names.pascal} not found' } as const)`,
    `        }`,
    `      }),`,
    `    ),`,
    `)`,
    ``,
  ].join('\n')
}

function renderHttpTest(names: DomainNames): string {
  const repoName = `${names.pascal}Repo`
  const modelName = names.pascal
  const createdAt = '1970-01-01T00:00:00.000Z'

  const makeRepoFn = `make${names.pascal}RepoTest`

  return [
    `import { HttpApiBuilder, HttpServer } from '@effect/platform'`,
    `import { Effect, Layer, Option } from 'effect'`,
    `import { describe, expect, it } from 'vitest'`,
    ``,
    `import { EffectApi } from '../app/effect-api.js'`,
    `import { DbError } from '../db/db.js'`,
    `import { DbLive } from '../db/db.live.js'`,
    `import { HealthLive } from '../health/health.http.live.js'`,
    `import { ${names.pascal}Live } from './${names.camel}.http.live.js'`,
    `import type { ${modelName} } from './${names.camel}.model.js'`,
    `import { ${repoName} } from './${names.camel}.repo.js'`,
    ``,
    `const ${makeRepoFn} = (): Layer.Layer<${repoName}> => {`,
    `  let nextId = 1`,
    `  const store = new Map<number, ${modelName}>()`,
    ``,
    `  return Layer.succeed(${repoName}, {`,
    `    create: (input) =>`,
    `      Effect.sync(() => {`,
    `        const entity: ${modelName} = {`,
    `          id: nextId++,`,
    `          name: input.name,`,
    `          enabled: input.enabled ?? true,`,
    `          createdAt: '${createdAt}',`,
    `        }`,
    `        store.set(entity.id, entity)`,
    `        return entity`,
    `      }),`,
    `    get: (id) => Effect.sync(() => Option.fromNullable(store.get(id))),`,
    `    list: Effect.sync(() => Array.from(store.values())),`,
    `    update: (id, patch) =>`,
    `      Effect.sync(() => {`,
    `        const prev = store.get(id)`,
    `        if (!prev) {`,
    `          return Option.none()`,
    `        }`,
    `        const next: ${modelName} = {`,
    `          ...prev,`,
    `          name: patch.name ?? prev.name,`,
    `          enabled: patch.enabled ?? prev.enabled,`,
    `        }`,
    `        store.set(id, next)`,
    `        return Option.some(next)`,
    `      }),`,
    `    remove: (id) => Effect.sync(() => store.delete(id)),`,
    `  })`,
    `}`,
    ``,
    `describe('${names.pascal} CRUD', () => {`,
    `  it('create/list/get/update/delete', async () => {`,
    `    const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(`,
    `      Layer.provide(HealthLive),`,
    `      Layer.provide(${names.pascal}Live),`,
    `      Layer.provide(${makeRepoFn}()),`,
    `      Layer.provide(DbLive),`,
    `    )`,
    ``,
    `    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))`,
    ``,
    `    try {`,
    `      const created = await handler(`,
    `        new Request('http://local.test${names.routePlural}', {`,
    `          method: 'POST',`,
    `          headers: { 'content-type': 'application/json' },`,
    `          body: JSON.stringify({ name: 'a' }),`,
    `        }),`,
    `      )`,
    `      expect(created.status).toBe(201)`,
    `      await expect(created.json()).resolves.toEqual({`,
    `        id: 1,`,
    `        name: 'a',`,
    `        enabled: true,`,
    `        createdAt: '${createdAt}',`,
    `      })`,
    ``,
    `      const list = await handler(new Request('http://local.test${names.routePlural}'))`,
    `      expect(list.status).toBe(200)`,
    `      await expect(list.json()).resolves.toEqual([{ id: 1, name: 'a', enabled: true, createdAt: '${createdAt}' }])`,
    ``,
    `      const get = await handler(new Request('http://local.test${names.routePlural}/1'))`,
    `      expect(get.status).toBe(200)`,
    `      await expect(get.json()).resolves.toEqual({ id: 1, name: 'a', enabled: true, createdAt: '${createdAt}' })`,
    ``,
    `      const updated = await handler(`,
    `        new Request('http://local.test${names.routePlural}/1', {`,
    `          method: 'PATCH',`,
    `          headers: { 'content-type': 'application/json' },`,
    `          body: JSON.stringify({ enabled: false }),`,
    `        }),`,
    `      )`,
    `      expect(updated.status).toBe(200)`,
    `      await expect(updated.json()).resolves.toEqual({ id: 1, name: 'a', enabled: false, createdAt: '${createdAt}' })`,
    ``,
    `      const deleted = await handler(new Request('http://local.test${names.routePlural}/1', { method: 'DELETE' }))`,
    `      expect(deleted.status).toBe(204)`,
    `      await expect(deleted.text()).resolves.toBe('')`,
    ``,
    `      const missing = await handler(new Request('http://local.test${names.routePlural}/1'))`,
    `      expect(missing.status).toBe(404)`,
    `      await expect(missing.json()).resolves.toEqual({ _tag: 'NotFoundError', message: '${names.pascal} not found' })`,
    `    } finally {`,
    `      await dispose()`,
    `    }`,
    `  })`,
    ``,
    `  it('数据库 disabled 时返回 503 ServiceUnavailableError', async () => {`,
    `    const DbDisabled = new DbError({`,
    `      reason: 'disabled',`,
    `      message: 'DATABASE_URL is not set',`,
    `    })`,
    ``,
    `    const RepoDbDisabledTest = Layer.succeed(${repoName}, {`,
    `      create: () => Effect.fail(DbDisabled),`,
    `      get: () => Effect.fail(DbDisabled),`,
    `      list: Effect.fail(DbDisabled),`,
    `      update: () => Effect.fail(DbDisabled),`,
    `      remove: () => Effect.fail(DbDisabled),`,
    `    })`,
    ``,
    `    const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(`,
    `      Layer.provide(HealthLive),`,
    `      Layer.provide(${names.pascal}Live),`,
    `      Layer.provide(RepoDbDisabledTest),`,
    `      Layer.provide(DbLive),`,
    `    )`,
    ``,
    `    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))`,
    ``,
    `    try {`,
    `      const response = await handler(new Request('http://local.test${names.routePlural}'))`,
    `      expect(response.status).toBe(503)`,
    `      await expect(response.json()).resolves.toEqual({ _tag: 'ServiceUnavailableError', message: 'DATABASE_URL is not set' })`,
    `    } finally {`,
    `      await dispose()`,
    `    }`,
    `  })`,
    ``,
    `  it('数据库 query 错误时返回 503 ServiceUnavailableError', async () => {`,
    `    const DbQuery = new DbError({`,
    `      reason: 'query',`,
    `      message: 'Postgres query failed',`,
    `    })`,
    ``,
    `    const RepoDbQueryTest = Layer.succeed(${repoName}, {`,
    `      create: () => Effect.fail(DbQuery),`,
    `      get: () => Effect.fail(DbQuery),`,
    `      list: Effect.fail(DbQuery),`,
    `      update: () => Effect.fail(DbQuery),`,
    `      remove: () => Effect.fail(DbQuery),`,
    `    })`,
    ``,
    `    const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(`,
    `      Layer.provide(HealthLive),`,
    `      Layer.provide(${names.pascal}Live),`,
    `      Layer.provide(RepoDbQueryTest),`,
    `      Layer.provide(DbLive),`,
    `    )`,
    ``,
    `    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))`,
    ``,
    `    try {`,
    `      const response = await handler(new Request('http://local.test${names.routePlural}'))`,
    `      expect(response.status).toBe(503)`,
    `      await expect(response.json()).resolves.toEqual({ _tag: 'ServiceUnavailableError', message: 'Database error' })`,
    `    } finally {`,
    `      await dispose()`,
    `    }`,
    `  })`,
    `})`,
    ``,
  ].join('\n')
}

function renderPgIntegrationTest(names: DomainNames): string {
  const repoName = `${names.pascal}Repo`
  const liveName = `${names.pascal}Live`
  const repoLiveName = `${names.pascal}RepoLive`
  return [
    `import { HttpApiBuilder, HttpServer } from '@effect/platform'`,
    `import { Effect, Layer } from 'effect'`,
    `import { Pool } from 'pg'`,
    `import { afterAll, beforeAll, describe, expect, it } from 'vitest'`,
    ``,
    `import { EffectApi } from '../app/effect-api.js'`,
    `import { Db, DbError, type DbService } from '../db/db.js'`,
    `import { HealthLive } from '../health/health.http.live.js'`,
    `import { ${liveName} } from './${names.camel}.http.live.js'`,
    `import { ${repoLiveName} } from './${names.camel}.repo.live.js'`,
    ``,
    `const databaseUrl = process.env.DATABASE_URL`,
    `const describePg = databaseUrl ? describe : describe.skip`,
    `const keepSchema =`,
    `  process.env.LOGIX_PG_TEST_KEEP_SCHEMA === '1' || process.env.LOGIX_PG_TEST_KEEP_SCHEMA === 'true'`,
    ``,
    `const quoteIdent = (ident: string): string => \`"\${ident.replaceAll('"', '""')}"\``,
    ``,
    `describePg('${names.pascal} CRUD（PostgreSQL 集成）', () => {`,
    `  const schema = \`vitest_${names.tablePlural}_\${process.pid}_\${Date.now()}\``,
    `  let adminPool: Pool`,
    `  let appPool: Pool`,
    ``,
    `  beforeAll(async () => {`,
    `    adminPool = new Pool({ connectionString: databaseUrl, max: 1 })`,
    `    await adminPool.query(\`create schema \${quoteIdent(schema)}\`)`,
    ``,
    `    appPool = new Pool({`,
    `      connectionString: databaseUrl,`,
    `      max: 1,`,
    `      options: \`-csearch_path=\${schema}\`,`,
    `    })`,
    ``,
    `    if (keepSchema) {`,
    `      // eslint-disable-next-line no-console`,
    `      console.log(\`[${names.camel}.pg.integration] keeping schema: \${schema}\`)`,
    `    }`,
    `  })`,
    ``,
    `  afterAll(async () => {`,
    `    if (appPool) {`,
    `      await appPool.end()`,
    `    }`,
    `    if (adminPool) {`,
    `      if (!keepSchema) {`,
    `        await adminPool.query(\`drop schema if exists \${quoteIdent(schema)} cascade\`)`,
    `      }`,
    `      await adminPool.end()`,
    `    }`,
    `  })`,
    ``,
    `  const DbPgTest: Layer.Layer<Db> = Layer.succeed(Db, {`,
    `    query: (sql, params = []) =>`,
    `      Effect.tryPromise({`,
    `        try: () => appPool.query(sql, params as any[]).then((r) => r.rows as ReadonlyArray<any>),`,
    `        catch: (cause) =>`,
    `          new DbError({`,
    `            reason: 'query',`,
    `            message: 'Postgres query failed',`,
    `            cause,`,
    `          }),`,
    `      }),`,
    `    ping: Effect.tryPromise({`,
    `      try: () => appPool.query('select 1').then(() => undefined),`,
    `      catch: (cause) =>`,
    `        new DbError({`,
    `          reason: 'query',`,
    `          message: 'Postgres query failed',`,
    `          cause,`,
    `        }),`,
    `    }),`,
    `  } satisfies DbService)`,
    ``,
    `  it('create/list/get/update/delete', async () => {`,
    `    const ApiLive = HttpApiBuilder.api(EffectApi).pipe(`,
    `      Layer.provide(HealthLive),`,
    `      Layer.provide(${liveName}),`,
    `      Layer.provide(${repoLiveName}),`,
    `      Layer.provide(DbPgTest),`,
    `    )`,
    ``,
    `    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiLive, HttpServer.layerContext))`,
    ``,
    `    try {`,
    `      const created = await handler(`,
    `        new Request('http://local.test${names.routePlural}', {`,
    `          method: 'POST',`,
    `          headers: { 'content-type': 'application/json' },`,
    `          body: JSON.stringify({ name: 'hello' }),`,
    `        }),`,
    `      )`,
    `      expect(created.status).toBe(201)`,
    `      const createdJson = (await created.json()) as any`,
    `      expect(typeof createdJson.id).toBe('number')`,
    `      expect(createdJson.name).toBe('hello')`,
    `      expect(createdJson.enabled).toBe(true)`,
    `      expect(typeof createdJson.createdAt).toBe('string')`,
    `      expect(Number.isNaN(Date.parse(createdJson.createdAt))).toBe(false)`,
    ``,
    `      const id = createdJson.id as number`,
    `      const createdAt = createdJson.createdAt as string`,
    ``,
    `      const list = await handler(new Request('http://local.test${names.routePlural}'))`,
    `      expect(list.status).toBe(200)`,
    `      await expect(list.json()).resolves.toEqual([{ id, name: 'hello', enabled: true, createdAt }])`,
    ``,
    `      const got = await handler(new Request(\`http://local.test${names.routePlural}/\${id}\`))`,
    `      expect(got.status).toBe(200)`,
    `      await expect(got.json()).resolves.toEqual({ id, name: 'hello', enabled: true, createdAt })`,
    ``,
    `      const updated = await handler(`,
    `        new Request(\`http://local.test${names.routePlural}/\${id}\`, {`,
    `          method: 'PATCH',`,
    `          headers: { 'content-type': 'application/json' },`,
    `          body: JSON.stringify({ enabled: false }),`,
    `        }),`,
    `      )`,
    `      expect(updated.status).toBe(200)`,
    `      await expect(updated.json()).resolves.toEqual({ id, name: 'hello', enabled: false, createdAt })`,
    ``,
    `      if (keepSchema) {`,
    `        // eslint-disable-next-line no-console`,
    `        console.log(\`[${names.camel}.pg.integration] kept row: \${schema}.${names.tablePlural} id=\${id}\`)`,
    `        return`,
    `      }`,
    ``,
    `      const deleted = await handler(new Request(\`http://local.test${names.routePlural}/\${id}\`, { method: 'DELETE' }))`,
    `      expect(deleted.status).toBe(204)`,
    `      await expect(deleted.text()).resolves.toBe('')`,
    ``,
    `      const missing = await handler(new Request(\`http://local.test${names.routePlural}/\${id}\`))`,
    `      expect(missing.status).toBe(404)`,
    `      await expect(missing.json()).resolves.toEqual({ _tag: 'NotFoundError', message: '${names.pascal} not found' })`,
    `    } finally {`,
    `      await dispose()`,
    `    }`,
    `  })`,
    `})`,
    ``,
  ].join('\n')
}

async function pathExists(fileOrDir: string): Promise<boolean> {
  try {
    await fs.stat(fileOrDir)
    return true
  } catch {
    return false
  }
}

async function writeFileSafe(filePath: string, content: string, dryRun: boolean): Promise<void> {
  if (await pathExists(filePath)) {
    throw new Error(`文件已存在，拒绝覆盖：${filePath}`)
  }
  if (dryRun) return
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
}

async function updateTextFile(filePath: string, update: (prev: string) => string, dryRun: boolean): Promise<boolean> {
  const prev = await fs.readFile(filePath, 'utf8')
  const next = update(prev)
  if (next === prev) return false
  if (dryRun) return true
  await fs.writeFile(filePath, next, 'utf8')
  return true
}

function ensureWireableEffectApi(text: string): void {
  if (!text.includes(`export const EffectApi =`)) {
    throw new Error('effect-api.ts 不包含 export const EffectApi = ...，无法自动注册')
  }
}

function wireEffectApi(names: DomainNames, prev: string): string {
  ensureWireableEffectApi(prev)

  const groupName = `${names.pascal}Group`
  const importLine = `import { ${groupName} } from '../${names.camel}/${names.camel}.contract.js'`

  let next = prev
  if (!next.includes(importLine)) {
    const lines = next.split('\n')
    const exportIdx = lines.findIndex((l) => l.startsWith('export const EffectApi ='))
    if (exportIdx === -1) {
      throw new Error('effect-api.ts 未找到 export const EffectApi 行')
    }

    let insertIdx = exportIdx
    for (let i = exportIdx - 1; i >= 0; i--) {
      const line = lines[i] ?? ''
      if (line.startsWith('import ')) {
        insertIdx = i + 1
        break
      }
    }

    lines.splice(insertIdx, 0, importLine)

    next = lines.join('\n')
    if (!next.includes('\n\nexport const EffectApi =')) {
      next = next.replaceAll('\nexport const EffectApi =', '\n\nexport const EffectApi =')
    }
  }

  next = next.replace(/^export const EffectApi = (.*)$/m, (match, rhs) => {
    if (typeof rhs !== 'string') return match
    if (rhs.includes(`.add(${groupName})`)) return match
    return `export const EffectApi = ${rhs}.add(${groupName})`
  })

  return next
}

function ensureWireableMain(text: string): void {
  if (!text.includes(`const ApiLive =`)) {
    throw new Error('main.ts 不包含 const ApiLive = ...，无法自动注册')
  }
}

function wireMain(names: DomainNames, prev: string): string {
  ensureWireableMain(prev)

  const liveName = `${names.pascal}Live`
  const repoLiveName = `${names.pascal}RepoLive`

  const liveImport = `import { ${liveName} } from './${names.camel}/${names.camel}.http.live.js'`
  const repoLiveImport = `import { ${repoLiveName} } from './${names.camel}/${names.camel}.repo.live.js'`

  let next = prev

  if (!next.includes(liveImport) || !next.includes(repoLiveImport)) {
    const lines = next.split('\n')
    const portIdx = lines.findIndex((l) => l.startsWith('const port ='))
    if (portIdx === -1) {
      throw new Error('main.ts 未找到 const port = 行，无法定位插入点')
    }

    let lastImportIdx = -1
    for (let i = 0; i < portIdx; i++) {
      if ((lines[i] ?? '').startsWith('import ')) {
        lastImportIdx = i
      }
    }
    if (lastImportIdx === -1) {
      throw new Error('main.ts 未找到 import 区域')
    }

    const importsToAdd: string[] = []
    if (!next.includes(liveImport)) importsToAdd.push(liveImport)
    if (!next.includes(repoLiveImport)) importsToAdd.push(repoLiveImport)

    lines.splice(lastImportIdx + 1, 0, ...importsToAdd)
    next = lines.join('\n')
  }

  if (!next.includes(`Layer.provide(${liveName}),`)) {
    next = next.replace('  Layer.provide(DbLive),', `  Layer.provide(${liveName}),\n  Layer.provide(${repoLiveName}),\n  Layer.provide(DbLive),`)
  }

  return next
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--')

  const outDirRaw = takeArg(args, '--out')
  const domain = takeArg(args, '--domain')
  const dryRun = takeFlag(args, '--dry-run')
  const noWire = takeFlag(args, '--no-wire')
  const wire = noWire ? false : (takeFlag(args, '--wire') || true)

  if (!outDirRaw || !domain) {
    usage()
  }

  const unknownFlags = args.filter((a) => a.startsWith('-'))
  if (unknownFlags.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`未知参数：${unknownFlags.join(' ')}`)
    usage()
  }

  const outDir = path.resolve(process.cwd(), outDirRaw)
  if (!(await pathExists(outDir))) {
    throw new Error(
      `未找到输出目录：${outDir}\n` + `提示：--out 通常应指向 app 的 src 目录，例如 apps/logix-galaxy-api/src`,
    )
  }

  const names = makeDomainNames(domain)

  const resourceDir = path.join(outDir, names.camel)
  if (await pathExists(resourceDir)) {
    throw new Error(`资源目录已存在：${resourceDir}`)
  }

  const files: Array<{ path: string; content: string }> = [
    { path: path.join(resourceDir, `${names.camel}.contract.ts`), content: renderContract(names) },
    { path: path.join(resourceDir, `${names.camel}.model.ts`), content: renderModel(names) },
    { path: path.join(resourceDir, `${names.camel}.repo.ts`), content: renderRepo(names) },
    { path: path.join(resourceDir, `${names.camel}.repo.live.ts`), content: renderRepoLive(names) },
    { path: path.join(resourceDir, `${names.camel}.http.live.ts`), content: renderHttpLive(names) },
    { path: path.join(resourceDir, `${names.camel}.http.test.ts`), content: renderHttpTest(names) },
    { path: path.join(resourceDir, `${names.camel}.pg.integration.test.ts`), content: renderPgIntegrationTest(names) },
  ]

  for (const f of files) {
    await writeFileSafe(f.path, f.content, dryRun)
  }

  const changed: string[] = []

  if (wire) {
    const effectApiPath = path.join(outDir, 'app', 'effect-api.ts')
    const mainPath = path.join(outDir, 'main.ts')

    if (!(await pathExists(effectApiPath))) {
      throw new Error(`未找到：${effectApiPath}`)
    }
    if (!(await pathExists(mainPath))) {
      throw new Error(`未找到：${mainPath}`)
    }

    const effectApiChanged = await updateTextFile(effectApiPath, (prev) => wireEffectApi(names, prev), dryRun)
    if (effectApiChanged) changed.push(effectApiPath)

    const mainChanged = await updateTextFile(mainPath, (prev) => wireMain(names, prev), dryRun)
    if (mainChanged) changed.push(mainPath)
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dryRun,
        wire,
        outDir,
        createdDir: resourceDir,
        createdFiles: files.map((f) => path.relative(process.cwd(), f.path)),
        updatedFiles: changed.map((p) => path.relative(process.cwd(), p)),
        names,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
