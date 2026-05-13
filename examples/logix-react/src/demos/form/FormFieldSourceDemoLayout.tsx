// Example role: Remote dependency field
// Covers: SC-B, SC-D
// Capability refs: CAP-05, CAP-06, CAP-07, CAP-08, CAP-09, CAP-14, CAP-15, CAP-16, CAP-17, CAP-18, CAP-25
// Proof refs: PF-02, PF-04, PF-08
// SSoT: docs/ssot/form/06-capability-scenario-api-support-map.md

import React from 'react'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '@logixjs/form'
import * as Query from '@logixjs/query'
import { RuntimeProvider, fieldValue, useModule, useSelector } from '@logixjs/react'

const ProfileKeySchema = Schema.Struct({
  userId: Schema.String,
})

type ProfileData = {
  readonly name: string
  readonly tier: 'free' | 'pro' | 'enterprise'
}

type SourceStatus = 'idle' | 'loading' | 'success' | 'error'

type SourceSnapshotView = {
  readonly status: SourceStatus
  readonly keyHash?: string
  readonly data?: ProfileData
  readonly error?: string
}

const Profiles: Readonly<Record<string, ProfileData>> = {
  'u-1': { name: 'Ada Lovelace', tier: 'enterprise' },
  'u-2': { name: 'Grace Hopper', tier: 'pro' },
  'u-3': { name: 'Margaret Hamilton', tier: 'enterprise' },
  'u-4': { name: 'Barbara Liskov', tier: 'free' },
}

const ProfileResource = Query.Engine.Resource.make({
  id: 'demo/form/profile',
  keySchema: ProfileKeySchema,
  load: ({ userId }) =>
    Effect.sleep(Duration.millis(420)).pipe(
      Effect.flatMap(() => {
        const profile = Profiles[userId]
        return profile
          ? Effect.succeed(profile)
          : Effect.fail(new Error(`profile not found: ${userId}`))
      }),
    ),
})

const RowSchema = Schema.Struct({
  id: Schema.String,
  profileId: Schema.String,
  profileResource: Schema.Unknown,
})

const ValuesSchema = Schema.Struct({
  profileId: Schema.String,
  profileResource: Schema.Unknown,
  observerProfileId: Schema.String,
  observerProfileResource: Schema.Unknown,
  items: Schema.Array(RowSchema),
})

type Values = Schema.Schema.Type<typeof ValuesSchema>

const makeIdleSnapshot = () => Query.Engine.Resource.Snapshot.idle()

const FormSourceProgram = Form.make(
  'FormFieldSourceDemo',
  {
    values: ValuesSchema,
    initialValues: {
      profileId: 'u-1',
      profileResource: makeIdleSnapshot(),
      observerProfileId: 'u-2',
      observerProfileResource: makeIdleSnapshot(),
      items: [
        { id: 'row-a', profileId: 'u-3', profileResource: makeIdleSnapshot() },
        { id: 'row-b', profileId: 'u-4', profileResource: makeIdleSnapshot() },
      ],
    },
    validateOn: ['onSubmit'],
    reValidateOn: ['onChange'],
  },
  (form) => {
    form.field('profileResource').source({
      resource: ProfileResource,
      deps: ['profileId'],
      triggers: ['onMount', 'onKeyChange'],
      concurrency: 'switch',
      submitImpact: 'block',
      key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
    })

    form.field('observerProfileResource').source({
      resource: ProfileResource,
      deps: ['observerProfileId'],
      triggers: ['onMount', 'onKeyChange'],
      concurrency: 'switch',
      submitImpact: 'observe',
      key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
    })

    form.list('items', {
      identity: { mode: 'trackBy', trackBy: 'id' },
    })

    form.field('items.profileResource').source({
      resource: ProfileResource,
      deps: ['items.profileId'],
      triggers: ['onMount', 'onKeyChange'],
      concurrency: 'switch',
      submitImpact: 'observe',
      key: (profileId) => (profileId ? { userId: String(profileId) } : undefined),
    })

    form.submit()
  },
)

const runtime = Logix.Runtime.make(FormSourceProgram, {
  label: 'FormFieldSourceDemoRuntime',
  devtools: true,
  layer: Query.Engine.Resource.layer([ProfileResource]),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const isProfileTier = (value: unknown): value is ProfileData['tier'] =>
  value === 'free' || value === 'pro' || value === 'enterprise'

const toSourceSnapshotView = (value: unknown): SourceSnapshotView => {
  if (!isRecord(value)) return { status: 'idle' }

  const rawStatus = value.status
  const status: SourceStatus =
    rawStatus === 'loading' || rawStatus === 'success' || rawStatus === 'error' || rawStatus === 'idle'
      ? rawStatus
      : 'idle'

  const rawData = value.data
  const rawTier = isRecord(rawData) ? rawData.tier : undefined
  const data: ProfileData | undefined =
    isRecord(rawData) &&
    typeof rawData.name === 'string' &&
    isProfileTier(rawTier)
      ? { name: rawData.name, tier: rawTier }
      : undefined

  return {
    status,
    keyHash: readString(value.keyHash),
    data,
    error: value.error instanceof Error ? value.error.message : readString(value.error),
  }
}

const SourceCard: React.FC<{
  readonly title: string
  readonly description: string
  readonly snapshot: SourceSnapshotView
  readonly children?: React.ReactNode
}> = ({ title, description, snapshot, children }) => {
  const tone =
    snapshot.status === 'success'
      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30'
      : snapshot.status === 'loading'
        ? 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30'
        : snapshot.status === 'error'
          ? 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30'
          : 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800'

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-mono ${tone}`}>{snapshot.status}</span>
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-3 font-mono text-xs dark:bg-gray-950/60">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">keyHash</span>
          <span className="text-gray-900 dark:text-gray-100">{snapshot.keyHash ?? 'undefined'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">data.name</span>
          <span className="text-gray-900 dark:text-gray-100">{snapshot.data?.name ?? '-'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500 dark:text-gray-400">data.tier</span>
          <span className="text-gray-900 dark:text-gray-100">{snapshot.data?.tier ?? '-'}</span>
        </div>
        {snapshot.error ? <div className="text-rose-700 dark:text-rose-300">{snapshot.error}</div> : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  )
}

const FormFieldSourcePanel: React.FC = () => {
  const form = useModule(FormSourceProgram)
  const profileId = useSelector(form, fieldValue('profileId'))
  const profileResourceRaw = useSelector(form, fieldValue('profileResource'))
  const observerProfileId = useSelector(form, fieldValue('observerProfileId'))
  const observerProfileResourceRaw = useSelector(form, fieldValue('observerProfileResource'))
  const rows = useSelector(form, fieldValue('items'))
  const submitAttempt = useSelector(form, fieldValue('$form.submitAttempt'))
  const profileResource = React.useMemo(() => toSourceSnapshotView(profileResourceRaw), [profileResourceRaw])
  const observerProfileResource = React.useMemo(
    () => toSourceSnapshotView(observerProfileResourceRaw),
    [observerProfileResourceRaw],
  )

  const setProfileId = (next: string) => {
    void runtime.runPromise(form.field('profileId').set(next))
  }

  const setObserverProfileId = (next: string) => {
    void runtime.runPromise(form.field('observerProfileId').set(next))
  }

  const setRowProfileId = (rowIndex: number, next: string) => {
    void runtime.runPromise(form.field(`items.${rowIndex}.profileId`).set(next))
  }

  const submit = () => {
    void runtime.runPromiseExit(form.submit())
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Form · Field Source</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          这页展示 exact Form authoring route：
          <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-800">
            form.field(path).source(...)
          </code>
          。它覆盖 onMount / onKeyChange、keyHash writeback、submitImpact block/observe，以及 row-scoped source。
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SourceCard
          title="Blocking source"
          description="profileId -> profileResource，submitImpact=block。loading 期间 submitAttempt 会进入 pending。"
          snapshot={profileResource}
        >
          <label className="block text-xs text-gray-600 dark:text-gray-300">
            profileId
            <select
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
            >
              {Object.keys(Profiles).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
              <option value="missing">missing</option>
            </select>
          </label>
        </SourceCard>

        <SourceCard
          title="Observing source"
          description="observerProfileId -> observerProfileResource，submitImpact=observe。它会刷新事实，但不阻塞提交。"
          snapshot={observerProfileResource}
        >
          <label className="block text-xs text-gray-600 dark:text-gray-300">
            observerProfileId
            <select
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={observerProfileId}
              onChange={(event) => setObserverProfileId(event.target.value)}
            >
              {Object.keys(Profiles).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </SourceCard>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Row-scoped source</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              这里用
              <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono dark:bg-gray-800">
                form.field(&apos;items.profileResource&apos;).source(...)
              </code>
              绑定每一行自己的 profileId，并通过 trackBy row identity 保持归属。
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-mono text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            row scope
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rows.map((row, index) => {
            const snapshot = toSourceSnapshotView(row.profileResource)
            return (
              <div key={row.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{row.id}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">deps: items.profileId</div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{snapshot.status}</span>
                </div>
                <label className="block text-xs text-gray-600 dark:text-gray-300">
                  row profileId
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    value={row.profileId}
                    onChange={(event) => setRowProfileId(index, event.target.value)}
                  >
                    {Object.keys(Profiles).map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 rounded-md bg-white p-3 font-mono text-xs dark:bg-gray-900">
                  {snapshot.data?.name ?? '-'} · {snapshot.data?.tier ?? '-'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submit evidence</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              修改 blocking source 后立刻提交，可以观察 pending basis；observe source 与 row source 不会阻塞主提交。
            </p>
          </div>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
          >
            Submit now
          </button>
        </div>

        <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] text-gray-900 dark:bg-gray-950/60 dark:text-gray-100">
          {JSON.stringify(submitAttempt, null, 2)}
        </pre>
      </section>
    </div>
  )
}

export const FormFieldSourceDemoLayout: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <FormFieldSourcePanel />
  </RuntimeProvider>
)
