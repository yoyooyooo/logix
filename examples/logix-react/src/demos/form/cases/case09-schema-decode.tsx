import React from "react"
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useField, useForm } from "@logix/form/react"
import type { FormCaseLink } from "./types"
import { JsonCard, SectionTitle, TextField, NumberField, PrimaryButton, GhostButton } from "./shared"

const DecodeValues = Schema.Struct({
  amountText: Schema.String,
  startDate: Schema.String,
  endDate: Schema.String,
})

const DecodeTarget = Schema.Struct({
  amount: Schema.Number,
  startDate: Schema.String,
  endDate: Schema.String,
})

const DecodeForm = Form.make("FormCase.SchemaDecode", {
  values: DecodeValues,
  mode: "onBlur",
  initialValues: { amountText: "", startDate: "", endDate: "" },
})

const runtime = Logix.Runtime.make(DecodeForm.impl, {
  label: "FormCase.SchemaDecode",
  devtools: true,
})

const SchemaDecodeCase: React.FC = () => {
  const form = useForm(DecodeForm)
  const dispatch = useDispatch(form.runtime as any)
  const state = useSelector(form.runtime as any) as any

  const amountText = useField(form, "amountText")
  const startDate = useField(form, "startDate")
  const endDate = useField(form, "endDate")

  const decodeAndWriteErrors = (rename?: Record<string, string>) => {
    const amount = Number(String(state?.amountText ?? ""))
    const input = {
      amount,
      startDate: String(state?.startDate ?? ""),
      endDate: String(state?.endDate ?? ""),
    }

    const result = Schema.decodeUnknownEither(DecodeTarget)(input as any) as any
    if (result._tag === "Right") {
      dispatch({ _tag: "setValue", payload: { path: "errors", value: {} } })
      return
    }

    const schemaError = result.left
    const writes = Form.SchemaErrorMapping.toSchemaErrorWrites(schemaError, {
      rename,
      toLeaf: () => "字段不合法（来自 schema decode）",
    })

    dispatch({ _tag: "setValue", payload: { path: "errors", value: {} } })
    for (const w of writes) {
      dispatch({ _tag: "setValue", payload: { path: w.errorPath, value: w.error } })
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Case 09 · Schema 解码错误映射"
        desc="模拟提交时 Schema.decode 失败：用 SchemaErrorMapping 把错误归属到 errors.<fieldPath> 并写回。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <NumberField
              label="amountText（这里用 NumberField，内部仍写入 string）"
              value={Number(String(amountText.value ?? "0"))}
              onChange={(n) => amountText.onChange(String(n))}
              onBlur={amountText.onBlur}
              touched={amountText.touched}
              dirty={amountText.dirty}
              error={amountText.error}
            />
            <TextField
              label="startDate"
              value={startDate.value}
              error={startDate.error}
              touched={startDate.touched}
              dirty={startDate.dirty}
              onChange={(next) => startDate.onChange(next)}
              onBlur={startDate.onBlur}
              placeholder="随便填点东西"
            />
            <TextField
              label="endDate"
              value={endDate.value}
              error={endDate.error}
              touched={endDate.touched}
              dirty={endDate.dirty}
              onChange={(next) => endDate.onChange(next)}
              onBlur={endDate.onBlur}
              placeholder="随便填点东西"
            />

            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => decodeAndWriteErrors()}>
                模拟提交（decode → 写回 errors）
              </PrimaryButton>
              <GhostButton type="button" onClick={() => decodeAndWriteErrors({ amount: "amountText" })}>
                使用 rename（amount→amountText）
              </GhostButton>
              <GhostButton type="button" onClick={() => dispatch({ _tag: "setValue", payload: { path: "errors", value: {} } })}>
                清空 errors
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

const SchemaDecodePage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <SchemaDecodeCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case09SchemaDecode: FormCaseLink = {
  id: "09",
  title: "Schema 错误映射",
  to: "schema-decode",
  desc: "decode → errors.*",
  element: <SchemaDecodePage />,
}

