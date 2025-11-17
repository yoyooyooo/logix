import React from 'react'
import { Duration, Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider, useModule, useSelector } from '@logix/react'
import * as Form from '@logix/form'
import { useField, useFieldArray } from '@logix/form/react'
import type { FormCaseLink } from './types'
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton, ResourceSnapshotSchema } from './shared'

const UploadKeySchema = Schema.Struct({ fileKey: Schema.String })

const UploadSpec = Logix.Resource.make({
  id: 'demo/form/upload',
  keySchema: UploadKeySchema,
  load: (key: { readonly fileKey: string }) =>
    Effect.sleep(Duration.millis(700)).pipe(
      Effect.zipRight(
        Effect.succeed({
          url: `https://example.local/files/${encodeURIComponent(key.fileKey)}.png`,
        }),
      ),
    ),
})

const Attachment = Schema.Struct({
  id: Schema.String,
  fileKey: Schema.String,
  upload: ResourceSnapshotSchema(Schema.Struct({ url: Schema.String })),
})

const UploadValues = Schema.Struct({
  attachments: Schema.Array(Attachment),
})

type UploadV = Schema.Schema.Type<typeof UploadValues>

let nextAttId = 1
const makeAttachment = () => ({
  id: `att-${nextAttId++}`,
  fileKey: '',
  upload: Logix.Resource.Snapshot.idle(),
})

const $ = Form.from(UploadValues)
const z = $.rules

const UploadForm = Form.make('FormCase.AttachmentsUpload', {
  values: UploadValues,
  validateOn: ['onBlur'],
  reValidateOn: ['onBlur'],
  initialValues: { attachments: [makeAttachment()] },
  rules: z(
    z.list('attachments', {
      identity: { mode: 'trackBy', trackBy: 'id' },
    }),
  ),
  traits: Form.traits(UploadValues)({
    attachments: {
      item: {
        source: {
          upload: Form.Trait.source({
            resource: UploadSpec.id,
            deps: ['fileKey'],
            triggers: ['onValueChange'],
            concurrency: 'switch',
            key: (row: any) => {
              const fileKey = String(row?.fileKey ?? '').trim()
              return fileKey ? { fileKey } : undefined
            },
          }),
        },
      },
    },
  }),
})

const runtime = Logix.Runtime.make(UploadForm, {
  label: 'FormCase.AttachmentsUpload',
  devtools: true,
  layer: Logix.Resource.layer([UploadSpec]),
})

const AttachmentRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly row: any
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, row, canRemove, onRemove }) => {
  const fileKey = useField(form, `attachments.${index}.fileKey`)
  const upload = row?.upload as any
  const status = String(upload?.status ?? 'unknown')
  const url = upload?.status === 'success' ? String(upload?.data?.url ?? '') : ''

  return (
    <div
      key={fieldsId}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          #{index + 1} · {String(row?.id ?? '')} · status:{status}
        </div>
        <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
          删除
        </GhostButton>
      </div>

      <TextField
        label="fileKey（留空=idle）"
        value={fileKey.value}
        onChange={(next) => fileKey.onChange(next)}
        onBlur={fileKey.onBlur}
        touched={fileKey.touched}
        dirty={fileKey.dirty}
      />

      {status === 'loading' ? <div className="text-sm text-amber-700 dark:text-amber-300">Uploading…</div> : null}
      {status === 'success' ? (
        <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all">{url}</div>
      ) : null}
    </div>
  )
}

const UploadCase: React.FC = () => {
  const form = useModule(UploadForm)
  const state = useSelector(form) as any
  const items: ReadonlyArray<any> = Array.isArray(state?.attachments) ? state.attachments : []
  const arr = useFieldArray(form, 'attachments')

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 06 · 按行上传（source）"
        desc="attachments[].upload 使用 list.item source；改变 fileKey 会触发 refresh，RowId gate 保证删行/重排下不会写错行。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Attachments</div>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => arr.append(makeAttachment())}>
                  新增
                </GhostButton>
                <PrimaryButton type="button" onClick={() => form.actions.submit()}>
                  提交
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((row, index) => (
                <AttachmentRow
                  key={arr.fields[index]?.id ?? String(index)}
                  form={form as any}
                  fieldsId={arr.fields[index]?.id ?? String(index)}
                  index={index}
                  row={row}
                  canRemove={items.length > 1}
                  onRemove={arr.remove}
                />
              ))}
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

const UploadPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <UploadCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case06AttachmentsUpload: FormCaseLink = {
  id: '06',
  title: '按行上传',
  to: 'attachments-upload',
  desc: 'list.item source + RowId gate',
  element: <UploadPage />,
}
