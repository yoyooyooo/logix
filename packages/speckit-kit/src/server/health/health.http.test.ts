import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { EffectApi } from '../app/effect-api.js'
import { SpecboardLive } from '../specboard/specboard.http.live.js'
import { SpecboardServiceLive } from '../specboard/specboard.service.live.js'
import { HealthLive } from './health.http.live.js'

describe('GET /health', () => {
  it('返回 ok=true', async () => {
    const tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-kanban-'))
    await fs.mkdir(path.join(tmpRepo, 'specs'))

    const prevRepoRoot = process.env.SPECKIT_KIT_REPO_ROOT
    process.env.SPECKIT_KIT_REPO_ROOT = tmpRepo

    try {
      const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(
        Layer.provide(HealthLive),
        Layer.provide(SpecboardLive),
        Layer.provide(SpecboardServiceLive),
      )

      const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

      try {
        const response = await handler(new Request('http://local.test/health'))
        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toEqual({ ok: true })
      } finally {
        await dispose()
      }
    } finally {
      if (prevRepoRoot === undefined) {
        delete process.env.SPECKIT_KIT_REPO_ROOT
      } else {
        process.env.SPECKIT_KIT_REPO_ROOT = prevRepoRoot
      }
    }
  })
})
