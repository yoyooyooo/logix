import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'
import { runLiveClientTask } from '../../src/internal/liveClient.js'
import {
  cleanupStaleLiveDaemonSnapshot,
  makeStoppedLiveDaemonOperatorSnapshot,
  readLiveDaemonOperatorSnapshot,
  writeLiveDaemonOperatorSnapshot,
} from '../../src/internal/liveDaemonOperatorSnapshot.js'
import { makeTestLiveDaemonLaunchOverride, resolveLiveDaemonLaunchSpec, startLiveDaemonProcess } from '../../src/internal/liveDaemonLauncher.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'
import { resolveLiveTransportPaths } from '../../src/internal/liveTransportPaths.js'

const previousStateDir = process.env.LOGIX_LIVE_STATE_DIR
const previousPort = process.env.LOGIX_LIVE_PORT
const previousLaunchCommand = process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
const previousLaunchArgs = process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON
const previousCliEntry = process.env.LOGIX_INTERNAL_CLI_ENTRY
const previousCliExecArgv = process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON

afterEach(() => {
  if (previousStateDir === undefined) delete process.env.LOGIX_LIVE_STATE_DIR
  else process.env.LOGIX_LIVE_STATE_DIR = previousStateDir
  if (previousPort === undefined) delete process.env.LOGIX_LIVE_PORT
  else process.env.LOGIX_LIVE_PORT = previousPort
  if (previousLaunchCommand === undefined) delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
  else process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND = previousLaunchCommand
  if (previousLaunchArgs === undefined) delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON
  else process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON = previousLaunchArgs
  if (previousCliEntry === undefined) delete process.env.LOGIX_INTERNAL_CLI_ENTRY
  else process.env.LOGIX_INTERNAL_CLI_ENTRY = previousCliEntry
  if (previousCliExecArgv === undefined) delete process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON
  else process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON = previousCliExecArgv
})

describe('live daemon operator snapshot', () => {
  it('treats invalid metadata as a degraded carrier-local snapshot', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    try {
      const paths = resolveLiveTransportPaths({ stateDir })
      await writeFile(paths.metadataPath, '{"pid":"not-a-number"}', 'utf8')

      const snapshot = await readLiveDaemonOperatorSnapshot(paths)

      expect(snapshot.state).toBe('degraded')
      expect(snapshot.authority).toBe('core-owned-attachment')
      expect(snapshot.transport).toMatchObject({ carrier: 'ipc', health: 'degraded' })
      expect(snapshot.operator).toMatchObject({
        carrierLocal: true,
        publicContract: false,
        reason: 'invalid-metadata',
      })
      expect(snapshot).not.toHaveProperty('targets')
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('writes metadata as an operator-local snapshot, not runtime truth', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    try {
      const paths = resolveLiveTransportPaths({ stateDir, port: 4567 })

      await writeLiveDaemonOperatorSnapshot(paths, {
        pid: process.pid,
        startedAt: 123,
        logPath: path.join(stateDir, 'daemon.log'),
      })

      const raw = JSON.parse(await readFile(paths.metadataPath, 'utf8')) as Record<string, unknown>
      expect(raw).toMatchObject({
        schemaVersion: 1,
        pid: process.pid,
        host: paths.host,
        port: 4567,
        socketPath: paths.socketPath,
        stateDir,
        operator: {
          carrierLocal: true,
          publicContract: false,
        },
      })
      expect(raw).not.toHaveProperty('runtimeId')
      expect(raw).not.toHaveProperty('attachmentId')
      expect(raw).not.toHaveProperty('evidence')
      expect(raw).not.toHaveProperty('report')
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('removes stale metadata and socket paths with cleanup evidence', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-snapshot-'))
    try {
      const paths = resolveLiveTransportPaths({ stateDir })
      await writeFile(
        paths.metadataPath,
        JSON.stringify({
          schemaVersion: 1,
          pid: 99999999,
          host: paths.host,
          port: paths.port,
          socketPath: paths.socketPath,
          stateDir,
        }),
        'utf8',
      )
      await writeFile(paths.socketPath, '', 'utf8')

      const cleanup = await cleanupStaleLiveDaemonSnapshot(paths, 'stale-pid')

      expect(cleanup.cleaned).toBe(true)
      expect(cleanup.reason).toBe('stale-pid')
      await expect(readFile(paths.metadataPath, 'utf8')).rejects.toThrow()
      await expect(readFile(paths.socketPath, 'utf8')).rejects.toThrow()
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('treats live pid metadata with no IPC socket as a stale socket snapshot', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-operator-stale-socket-'))
    try {
      const paths = resolveLiveTransportPaths({ stateDir, port: 0 })
      await writeLiveDaemonOperatorSnapshot(paths, { pid: process.pid })

      const snapshot = await readLiveDaemonOperatorSnapshot(paths)

      expect(snapshot).toMatchObject({
        state: 'degraded',
        transport: { carrier: 'ipc', health: 'degraded' },
        websocket: { carrier: 'websocket', health: 'degraded' },
        operator: { carrierLocal: true, publicContract: false, reason: 'stale-socket' },
      })
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('creates stopped status without process strategy or public file schema', () => {
    const paths = resolveLiveTransportPaths({ stateDir: '/tmp/logix-live-test' })
    const snapshot = makeStoppedLiveDaemonOperatorSnapshot(paths)

    expect(snapshot).toMatchObject({
      state: 'stopped',
      authority: 'core-owned-attachment',
      transport: { carrier: 'ipc', health: 'closed' },
      websocket: { carrier: 'websocket', health: 'closed' },
      operator: { carrierLocal: true, publicContract: false },
    })
    expect(snapshot.operator).not.toHaveProperty('launchCommand')
    expect(snapshot.operator).not.toHaveProperty('schemaContract')
  })

  it('uses the operator snapshot shape for sync live start and stop fallbacks', () => {
    const start = runLiveClientTask({ task: 'start' })
    const stop = runLiveClientTask({ task: 'stop' })

    expect(start.inline).toMatchObject({
      state: 'stopped',
      authority: 'core-owned-attachment',
      websocket: { carrier: 'websocket', health: 'closed' },
      operator: { carrierLocal: true, publicContract: false },
    })
    expect(stop.inline).toMatchObject({
      state: 'stopped',
      authority: 'core-owned-attachment',
      websocket: { carrier: 'websocket', health: 'closed' },
      operator: { carrierLocal: true, publicContract: false },
    })
  })

  it('does not reuse metadata for a non-running pid', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-launcher-stale-'))
    process.env.LOGIX_LIVE_STATE_DIR = stateDir
    process.env.LOGIX_LIVE_PORT = '0'
    try {
      const paths = resolveLiveTransportPaths({ stateDir })
      await writeFile(
        paths.metadataPath,
        JSON.stringify({
          schemaVersion: 1,
          pid: 99999999,
          host: paths.host,
          port: paths.port,
          socketPath: paths.socketPath,
          stateDir,
          operator: { carrierLocal: true, publicContract: false },
        }),
        'utf8',
      )

      const launch = makeTestLiveDaemonLaunchOverride(path.resolve(__dirname, '../../src/bin/logix.ts'))
      process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND = launch.command
      process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON = JSON.stringify(launch.args)

      const started = await startLiveDaemonProcess()

      expect(started.started).toBe(true)
      const metadata = JSON.parse(await readFile(paths.metadataPath, 'utf8')) as Record<string, unknown>
      expect(metadata.pid).not.toBe(99999999)
      expect(metadata.operator).toMatchObject({ carrierLocal: true, publicContract: false })
    } finally {
      await Effect.runPromise(runCli(['live', 'stop', '--runId', 'cleanup-stale-daemon'])).catch(() => undefined)
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('keeps launch override as test-only and defaults to current CLI re-exec', () => {
    delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND
    delete process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON
    process.env.LOGIX_INTERNAL_CLI_ENTRY = '/tmp/logix/dist/logix.js'
    process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON = JSON.stringify(['--enable-source-maps'])

    const spec = resolveLiveDaemonLaunchSpec()

    expect(spec.command).toBe(process.execPath)
    expect(spec.args).toEqual(['--enable-source-maps', '/tmp/logix/dist/logix.js', '__internal_live_daemon'])
    expect(spec.args.join(' ')).not.toContain('tsx')
    expect(spec.args.join(' ')).not.toContain('logix-live-daemon')
  })

  it('server writes operator metadata without runtime or attachment truth', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-server-metadata-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    try {
      const raw = JSON.parse(await readFile(daemon.paths.metadataPath, 'utf8')) as Record<string, unknown>
      expect(raw).toMatchObject({
        schemaVersion: 1,
        pid: process.pid,
        host: '127.0.0.1',
        port: daemon.port,
        socketPath: daemon.paths.socketPath,
        stateDir,
        operator: { carrierLocal: true, publicContract: false },
      })
      expect(raw).not.toHaveProperty('attachments')
      expect(raw).not.toHaveProperty('targets')
      expect(raw).not.toHaveProperty('runtime')
      expect(raw).not.toHaveProperty('evidence')
    } finally {
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('live status reports invalid metadata as degraded operator snapshot', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-status-degraded-'))
    process.env.LOGIX_LIVE_STATE_DIR = stateDir
    try {
      const paths = resolveLiveTransportPaths({ stateDir })
      await writeFile(paths.metadataPath, '{"pid":"bad"}', 'utf8')

      const out = await Effect.runPromise(runCli(['live', 'status', '--runId', 'status-degraded']))

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.result.kind).toBe('LiveCommandResult')
      expect(out.result.artifacts[0]?.inline).toMatchObject({
        state: 'degraded',
        operator: { carrierLocal: true, publicContract: false, reason: 'invalid-metadata' },
      })
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('live status degrades ready-looking metadata when IPC is unavailable', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-status-stale-socket-'))
    process.env.LOGIX_LIVE_STATE_DIR = stateDir
    try {
      const paths = resolveLiveTransportPaths({ stateDir, port: 0 })
      await writeLiveDaemonOperatorSnapshot(paths, { pid: process.pid })

      const out = await Effect.runPromise(runCli(['live', 'status', '--runId', 'status-stale-socket']))

      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.result.kind).toBe('LiveCommandResult')
      expect(out.result.artifacts[0]?.inline).toMatchObject({
        state: 'degraded',
        operator: { carrierLocal: true, publicContract: false, reason: 'stale-socket' },
      })
    } finally {
      await rm(stateDir, { recursive: true, force: true })
    }
  })
})
