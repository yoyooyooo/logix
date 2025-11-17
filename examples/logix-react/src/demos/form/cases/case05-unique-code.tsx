import React from 'react'
import { Duration, Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector } from '@logix/react'
import * as Form from '@logix/form'
import { useField } from '@logix/form/react'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton, ResourceSnapshotSchema } from './shared'

const UniqueValues = Schema.Struct({
  code: Schema.String,
  codeCheck: ResourceSnapshotSchema(Schema.Struct({ available: Schema.Boolean })),
})

type UniqueV = Schema.Schema.Type<typeof UniqueValues>

const $ = Form.from(UniqueValues)
const z = $.rules

const CodeAvailabilityKey = Schema.Struct({ code: Schema.String })

const TakenCodes = new Set(['A-001', 'A-002', 'B-001', 'HELLO', 'WORLD'])

const CodeAvailabilitySpec = Logix.Resource.make({
  id: 'demo/form/codeAvailability',
  keySchema: CodeAvailabilityKey,
  load: (key: { readonly code: string }) =>
    Effect.sleep(Duration.millis(500)).pipe(
      Effect.zipRight(
        Effect.succeed({
          available: !TakenCodes.has(key.code.toUpperCase()),
        }),
      ),
    ),
})

const UniqueForm = Form.make('FormCase.UniqueCode', {
  values: UniqueValues,
  validateOn: ['onChange', 'onBlur'],
  reValidateOn: ['onChange', 'onBlur'],
  debounceMs: 200,
  initialValues: {
    code: '',
    codeCheck: Logix.Resource.Snapshot.idle(),
  },
  derived: $.derived({
    codeCheck: Form.source({
      resource: CodeAvailabilitySpec.id,
      deps: ['code'],
      triggers: ['onKeyChange'],
      debounceMs: 200,
      concurrency: 'switch',
      key: (code: string) => {
        const trimmed = String(code ?? '').trim()
        return trimmed ? { code: trimmed } : undefined
      },
    }),
  }),
  rules: z(
    z.field('code', {
      validate: (v) => (String(v ?? '').trim() ? undefined : '请输入编码'),
    }),
  ),
})

const runtime = Logix.Runtime.make(UniqueForm, {
  label: 'FormCase.UniqueCode',
  devtools: true,
  layer: Logix.Resource.layer([CodeAvailabilitySpec]),
})

const UniqueCodeCase: React.FC = () => {
  const form = useModule(UniqueForm)
  const state = useSelector(form) as any

  const code = useField(form, 'code')
  const check = state?.codeCheck as any

  const availability = check?.status === 'success' ? Boolean(check?.data?.available) : undefined

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 05 · 唯一性校验（source）"
        desc="输入 code → source 自动 refresh → ResourceSnapshot 写回；key 为空时同一次可观察更新回到 idle。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <TextField
              label="编码（输入后 200ms debounce，500ms 返回）"
              value={code.value}
              error={code.error}
              touched={code.touched}
              dirty={code.dirty}
              onChange={(next) => code.onChange(next)}
              onBlur={code.onBlur}
              placeholder="例如 A-001（会被判定为占用）"
            />

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4 space-y-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">codeCheck snapshot</div>
              <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                status: {String(check?.status ?? 'unknown')} · keyHash: {String(check?.keyHash ?? 'null')}
              </div>
              {check?.status === 'loading' ? (
                <div className="text-sm text-amber-700 dark:text-amber-300">Loading…</div>
              ) : null}
              {check?.status === 'error' ? <div className="text-sm text-rose-700 dark:text-rose-300">Error</div> : null}
              {check?.status === 'success' ? (
                <div
                  className={
                    availability
                      ? 'text-sm text-emerald-700 dark:text-emerald-300'
                      : 'text-sm text-rose-700 dark:text-rose-300'
                  }
                >
                  {availability ? '可用' : '已占用'}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                提交（仅演示 submit validate 入口）
              </PrimaryButton>
              <GhostButton type="button" onClick={() => form.actions.setValue({ path: 'code', value: '' })}>
                清空 code（应回到 idle）
              </GhostButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <JsonCard title="values" value={state} />
          <JsonCard title="errors" value={state?.errors} />
          <JsonCard title="ui" value={state?.ui} />
        </div>
      </div>
    </div>
  )
}

const UniqueCodePage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <UniqueCodeCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case05UniqueCode: FormCaseLink = {
  id: '05',
  title: '唯一性校验',
  to: 'unique-code',
  desc: 'StateTrait.source + keyHash gate',
  element: <UniqueCodePage />,
}
