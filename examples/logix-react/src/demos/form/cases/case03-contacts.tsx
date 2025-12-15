import React from "react"
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useField, useFieldArray, useForm } from "@logix/form/react"
import type { FormCaseLink } from "./types"
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton } from "./shared"

const Contact = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  isPrimary: Schema.Boolean,
})

const ContactsValues = Schema.Struct({
  contacts: Schema.Array(Contact),
})

type ContactsV = Schema.Schema.Type<typeof ContactsValues>

let nextContactId = 1
const makeContact = () => ({ id: `c-${nextContactId++}`, name: "", email: "", isPrimary: false })

const ContactsForm = Form.make("FormCase.Contacts", {
  values: ContactsValues,
  mode: "all",
  initialValues: { contacts: [makeContact()] },
  traits: Logix.StateTrait.from(ContactsValues)({
    contacts: Logix.StateTrait.list({
      identityHint: { trackBy: "id" },
      item: Logix.StateTrait.node({
        check: {
          row: {
            deps: ["name", "email", "isPrimary"],
            validate: (row: any, ctx: any) => {
              if (ctx.mode === "valueChange") return undefined
              const errors: Record<string, unknown> = {}

              if (!String(row?.name ?? "").trim()) errors.name = "姓名必填"

              const email = String(row?.email ?? "").trim()
              if (!email) errors.email = "邮箱必填"
              else if (!email.includes("@")) errors.email = "邮箱格式不正确"

              const contacts: ReadonlyArray<any> = Array.isArray(ctx?.state?.contacts) ? ctx.state.contacts : []
              const primaryCount = contacts.filter((x) => x?.isPrimary === true).length
              if (primaryCount > 1 && row?.isPrimary === true) {
                errors.$item = "主联系人只能有一个"
              }

              return Object.keys(errors).length ? errors : undefined
            },
          },
        },
      }),
    }),
  }),
})

const runtime = Logix.Runtime.make(ContactsForm.impl, {
  label: "FormCase.Contacts",
  devtools: true,
})

const ContactRow: React.FC<{
  readonly form: any
  readonly fieldsId: string
  readonly index: number
  readonly row: any
  readonly canRemove: boolean
  readonly onRemove: (index: number) => void
}> = ({ form, fieldsId, index, row, canRemove, onRemove }) => {
  const base = `contacts.${index}`
  const name = useField(form, `${base}.name`)
  const email = useField(form, `${base}.email`)
  const isPrimary = useField(form, `${base}.isPrimary`)
  const rowError = useSelector(form.runtime as any, (s) => (s as any)?.errors?.contacts?.[index]) as any

  return (
    <div key={fieldsId} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          #{index + 1} · {String(row?.id ?? "")}
        </div>
        <GhostButton type="button" onClick={() => onRemove(index)} disabled={!canRemove}>
          删除
        </GhostButton>
      </div>

      {rowError?.$item ? <div className="text-[11px] text-rose-600 dark:text-rose-400">{String(rowError.$item)}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          label="姓名"
          value={name.value}
          error={name.error}
          touched={name.touched}
          dirty={name.dirty}
          onChange={(next) => name.onChange(next)}
          onBlur={name.onBlur}
        />
        <TextField
          label="邮箱"
          value={email.value}
          error={email.error}
          touched={email.touched}
          dirty={email.dirty}
          onChange={(next) => email.onChange(next)}
          onBlur={email.onBlur}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={Boolean(isPrimary.value)}
          onChange={(e) => isPrimary.onChange(e.target.checked)}
          onBlur={isPrimary.onBlur}
        />
        主联系人
      </label>
    </div>
  )
}

const ContactsCase: React.FC = () => {
  const form = useForm(ContactsForm)
  const dispatch = useDispatch(form.runtime as any)
  const state = useSelector(form.runtime as any) as any
  const contacts: ReadonlyArray<any> = Array.isArray(state?.contacts) ? state.contacts : []

  const { fields, append, remove } = useFieldArray(form, "contacts")

  return (
    <div className="space-y-6">
      <SectionTitle title="Case 03 · 联系人列表" desc="list scope check（跨行约束）+ trackBy(id) + errors/ui 数组对齐。" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Contacts</div>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => append(makeContact())}>
                  新增
                </GhostButton>
                <PrimaryButton type="button" onClick={() => dispatch({ _tag: "submit", payload: undefined })}>
                  提交校验
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              {contacts.map((row, index) => (
                <ContactRow
                  key={fields[index]?.id ?? String(index)}
                  form={form as any}
                  fieldsId={fields[index]?.id ?? String(index)}
                  index={index}
                  row={row}
                  canRemove={contacts.length > 1}
                  onRemove={remove}
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

const ContactsPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <ContactsCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case03Contacts: FormCaseLink = {
  id: "03",
  title: "联系人列表",
  to: "contacts",
  desc: "跨行约束（唯一主联系人）",
  element: <ContactsPage />,
}

