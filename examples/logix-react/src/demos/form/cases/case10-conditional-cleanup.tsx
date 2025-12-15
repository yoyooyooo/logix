import React from "react"
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useField, useForm } from "@logix/form/react"
import type { FormCaseLink } from "./types"
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton } from "./shared"

const ConditionalValues = Schema.Struct({
  hasSecondary: Schema.Boolean,
  primaryName: Schema.String,
  secondaryName: Schema.String,
})

type ConditionalV = Schema.Schema.Type<typeof ConditionalValues>

const ConditionalForm = Form.make("FormCase.Conditional", {
  values: ConditionalValues,
  mode: "onBlur",
  initialValues: { hasSecondary: false, primaryName: "", secondaryName: "" },
  traits: Logix.StateTrait.from(ConditionalValues)({
    primaryName: Logix.StateTrait.node({
      check: {
        required: {
          deps: [""],
          validate: (v: unknown, ctx) => {
            if (ctx.mode === "valueChange") return undefined
            return typeof v === "string" && v.trim() ? undefined : "主联系人必填"
          },
        },
      },
    }),
    secondaryName: Logix.StateTrait.node({
      check: {
        requiredWhenEnabled: {
          deps: ["", "hasSecondary"],
          validate: (v: unknown, ctx) => {
            if (ctx.mode === "valueChange") return undefined
            const s = ctx.state as any
            if (!s.hasSecondary) return undefined
            return typeof v === "string" && v.trim() ? undefined : "启用后必填"
          },
        },
      },
    }),
  }),
})

const runtime = Logix.Runtime.make(ConditionalForm.impl, {
  label: "FormCase.Conditional",
  devtools: true,
})

const ConditionalCase: React.FC = () => {
  const form = useForm(ConditionalForm)
  const dispatch = useDispatch(form.runtime as any)
  const state = useSelector(form.runtime as any) as any

  const primaryName = useField(form, "primaryName")
  const secondaryName = useField(form, "secondaryName")

  const toggle = (next: boolean) => {
    dispatch({ _tag: "setValue", payload: { path: "hasSecondary", value: next } })
    if (!next) {
      dispatch({ _tag: "setValue", payload: { path: "errors.secondaryName", value: undefined } })
      dispatch({ _tag: "setValue", payload: { path: "ui.secondaryName", value: undefined } })
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Case 10 · 条件显示 + 清理" desc="字段隐藏时，错误与交互态需要确定性清理（这里用最小示例模拟 unregister）。" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={Boolean(state?.hasSecondary)} onChange={(e) => toggle(e.target.checked)} />
              启用 secondaryName
            </label>

            <TextField
              label="primaryName"
              value={primaryName.value}
              error={primaryName.error}
              touched={primaryName.touched}
              dirty={primaryName.dirty}
              onChange={(next) => primaryName.onChange(next)}
              onBlur={primaryName.onBlur}
            />

            {state?.hasSecondary ? (
              <TextField
                label="secondaryName"
                value={secondaryName.value}
                error={secondaryName.error}
                touched={secondaryName.touched}
                dirty={secondaryName.dirty}
                onChange={(next) => secondaryName.onChange(next)}
                onBlur={secondaryName.onBlur}
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">secondaryName 已隐藏（并已清理 errors/ui）</div>
            )}

            <div className="flex gap-2">
              <PrimaryButton type="button" onClick={() => dispatch({ _tag: "submit", payload: undefined })}>
                提交校验
              </PrimaryButton>
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

const ConditionalPage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <ConditionalCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case10Conditional: FormCaseLink = {
  id: "10",
  title: "条件显示 + 清理",
  to: "conditional",
  desc: "隐藏字段清理 errors/ui",
  element: <ConditionalPage />,
}

