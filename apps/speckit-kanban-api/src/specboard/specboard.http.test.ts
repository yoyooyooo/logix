import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { EffectApi } from '../app/effect-api.js'
import { HealthLive } from '../health/health.http.live.js'
import { SpecboardLive } from './specboard.http.live.js'
import { SpecboardServiceLive } from './specboard.service.live.js'

describe('Specboard', () => {
  it('list/tasks/toggle/files', async () => {
    const tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-kanban-'))
    const specsRoot = path.join(tmpRepo, 'specs')
    await fs.mkdir(specsRoot)

    const specId = '001-a'
    const specDir = path.join(specsRoot, specId)
    await fs.mkdir(specDir)

    await fs.writeFile(path.join(specDir, 'spec.md'), '# Feature Specification: A\n', 'utf8')
    await fs.writeFile(path.join(specDir, 'tasks.md'), '# Tasks\n- [ ] T001 first\n- [x] T002 done\n', 'utf8')

    const prevRepoRoot = process.env.SPECKIT_KANBAN_REPO_ROOT
    process.env.SPECKIT_KANBAN_REPO_ROOT = tmpRepo

    try {
      const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(
        Layer.provide(HealthLive),
        Layer.provide(SpecboardLive),
        Layer.provide(SpecboardServiceLive),
      )

      const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

      try {
        const list = await handler(new Request('http://local.test/specs'))
        expect(list.status).toBe(200)
        await expect(list.json()).resolves.toEqual({
          items: [
            {
              id: specId,
              num: 1,
              title: 'Feature Specification: A',
              taskStats: { total: 2, done: 1, todo: 1 },
            },
          ],
        })

        const tasks = await handler(new Request(`http://local.test/specs/${specId}/tasks`))
        expect(tasks.status).toBe(200)
        await expect(tasks.json()).resolves.toEqual({
          specId,
          tasks: [
            { line: 2, checked: false, raw: '- [ ] T001 first', title: 'T001 first', taskId: 'T001' },
            { line: 3, checked: true, raw: '- [x] T002 done', title: 'T002 done', taskId: 'T002' },
          ],
        })

        const toggled = await handler(
          new Request(`http://local.test/specs/${specId}/tasks/toggle`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ line: 2, checked: true }),
          }),
        )
        expect(toggled.status).toBe(200)
        await expect(toggled.json()).resolves.toMatchObject({
          specId,
          tasks: [{ line: 2, checked: true }, { line: 3, checked: true }],
        })

        const tasksMd = await fs.readFile(path.join(specDir, 'tasks.md'), 'utf8')
        expect(tasksMd).toContain('- [x] T001 first')

        const wrote = await handler(
          new Request(`http://local.test/specs/${specId}/files/plan.md`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: '# Plan\n' }),
          }),
        )
        expect(wrote.status).toBe(200)
        await expect(wrote.json()).resolves.toEqual({ name: 'plan.md', path: `specs/${specId}/plan.md` })

        const read = await handler(new Request(`http://local.test/specs/${specId}/files/plan.md`))
        expect(read.status).toBe(200)
        await expect(read.json()).resolves.toEqual({
          name: 'plan.md',
          path: `specs/${specId}/plan.md`,
          content: '# Plan\n',
        })

        const quickstartWrote = await handler(
          new Request(`http://local.test/specs/${specId}/files/quickstart.md`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: '# Quickstart\n' }),
          }),
        )
        expect(quickstartWrote.status).toBe(200)
        await expect(quickstartWrote.json()).resolves.toEqual({
          name: 'quickstart.md',
          path: `specs/${specId}/quickstart.md`,
        })

        const quickstartRead = await handler(new Request(`http://local.test/specs/${specId}/files/quickstart.md`))
        expect(quickstartRead.status).toBe(200)
        await expect(quickstartRead.json()).resolves.toEqual({
          name: 'quickstart.md',
          path: `specs/${specId}/quickstart.md`,
          content: '# Quickstart\n',
        })

        const dataModelWrote = await handler(
          new Request(`http://local.test/specs/${specId}/files/data-model.md`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: '# Data Model\n' }),
          }),
        )
        expect(dataModelWrote.status).toBe(200)
        await expect(dataModelWrote.json()).resolves.toEqual({
          name: 'data-model.md',
          path: `specs/${specId}/data-model.md`,
        })

        const dataModelRead = await handler(new Request(`http://local.test/specs/${specId}/files/data-model.md`))
        expect(dataModelRead.status).toBe(200)
        await expect(dataModelRead.json()).resolves.toEqual({
          name: 'data-model.md',
          path: `specs/${specId}/data-model.md`,
          content: '# Data Model\n',
        })

        const researchWrote = await handler(
          new Request(`http://local.test/specs/${specId}/files/research.md`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: '# Research\n' }),
          }),
        )
        expect(researchWrote.status).toBe(200)
        await expect(researchWrote.json()).resolves.toEqual({
          name: 'research.md',
          path: `specs/${specId}/research.md`,
        })

        const researchRead = await handler(new Request(`http://local.test/specs/${specId}/files/research.md`))
        expect(researchRead.status).toBe(200)
        await expect(researchRead.json()).resolves.toEqual({
          name: 'research.md',
          path: `specs/${specId}/research.md`,
          content: '# Research\n',
        })
      } finally {
        await dispose()
      }
    } finally {
      if (prevRepoRoot === undefined) {
        delete process.env.SPECKIT_KANBAN_REPO_ROOT
      } else {
        process.env.SPECKIT_KANBAN_REPO_ROOT = prevRepoRoot
      }
    }
  })

})
