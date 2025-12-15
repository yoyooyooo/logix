import React from "react"
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useField, useForm } from "@logix/form/react"
import type { FormCaseLink } from "./types"
import { JsonCard, SectionTitle, TextField, PrimaryButton, GhostButton } from "./shared"

const BasicProfileValues = Schema.Struct({
  firstName: Schema.String,
  lastName: Schema.String,
  fullName: Schema.String,
  email: Schema.String,
  preferredChannel: Schema.Literal("email", "phone"),
  phone: Schema.String,
})

type BasicProfileV = Schema.Schema.Type<typeof BasicProfileValues>

const basicProfileInitialValues: BasicProfileV = {
  firstName: "",
  lastName: "",
  fullName: "",
  email: "",
  preferredChannel: "email",
  phone: "",
}

const BasicProfileForm = Form.make("FormCase.BasicProfile", {
  values: BasicProfileValues,
  mode: "onBlur",
  initialValues: basicProfileInitialValues,
  traits: Logix.StateTrait.from(BasicProfileValues)({
    fullName: Logix.StateTrait.computed({
      deps: ["firstName", "lastName"],
      get: (s: Readonly<BasicProfileV>) => `${s.firstName} ${s.lastName}`.trim(),
    }),

    firstName: Logix.StateTrait.node({
      check: {
        required: {
          deps: [""],
          validate: (v: unknown, ctx) => {
            if (ctx.mode === "valueChange") return undefined
            if (typeof v !== "string" || v.trim() === "") return "请填写名"
            return undefined
          },
        },
      },
    }),

    email: Logix.StateTrait.node({
      check: {
        requiredAndFormat: {
          deps: [""],
          validate: (v: unknown, ctx) => {
            if (ctx.mode === "valueChange") return undefined
            const email = typeof v === "string" ? v.trim() : ""
            if (!email) return "请填写邮箱"
            if (!email.includes("@")) return "邮箱格式不正确"
            return undefined
          },
        },
      },
    }),

    phone: Logix.StateTrait.node({
      check: {
        requiredWhenPhone: {
          deps: ["", "preferredChannel"],
          validate: (v: unknown, ctx) => {
            if (ctx.mode === "valueChange") return undefined
            const state = ctx.state as any
            if (state.preferredChannel !== "phone") return undefined
            const phone = typeof v === "string" ? v.trim() : ""
            return phone ? undefined : "首选渠道为电话时，手机号必填"
          },
        },
      },
    }),
  }),
})

const runtime = Logix.Runtime.make(BasicProfileForm.impl, {
  label: "FormCase.BasicProfile",
  devtools: true,
})

const BasicProfileCase: React.FC = () => {
  const form = useForm(BasicProfileForm)
  const dispatch = useDispatch(form.runtime as any)
  const state = useSelector(form.runtime as any) as any

  const firstName = useField(form, "firstName")
  const lastName = useField(form, "lastName")
  const email = useField(form, "email")
  const phone = useField(form, "phone")

  return (
    <div className="space-y-6">
      <SectionTitle title="Case 01 · 基础档案" desc="字段级 touched/dirty + blur/submit scopedValidate（错误树写回到 state.errors.*）。" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="First Name"
                value={firstName.value}
                error={firstName.error}
                touched={firstName.touched}
                dirty={firstName.dirty}
                onChange={(next) => firstName.onChange(next)}
                onBlur={firstName.onBlur}
              />
              <TextField
                label="Last Name"
                value={lastName.value}
                error={lastName.error}
                touched={lastName.touched}
                dirty={lastName.dirty}
                onChange={(next) => lastName.onChange(next)}
                onBlur={lastName.onBlur}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Email"
                value={email.value}
                error={email.error}
                touched={email.touched}
                dirty={email.dirty}
                onChange={(next) => email.onChange(next)}
                onBlur={email.onBlur}
                placeholder="name@company.com"
              />

              <label className="block text-sm text-gray-700 dark:text-gray-200">
                Preferred Channel
                <select
                  value={String(state?.preferredChannel ?? "email")}
                  onChange={(e) =>
                    dispatch({
                      _tag: "setValue",
                      payload: { path: "preferredChannel", value: e.target.value },
                    })
                  }
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                </select>
              </label>
            </div>

            <TextField
              label="Phone"
              value={phone.value}
              error={phone.error}
              touched={phone.touched}
              dirty={phone.dirty}
              onChange={(next) => phone.onChange(next)}
              onBlur={phone.onBlur}
              placeholder="仅当首选渠道为 phone 时必填"
            />

            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">fullName（computed）</div>
              <div className="text-sm font-mono text-gray-900 dark:text-gray-100">{String(state?.fullName ?? "") || "（空）"}</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <PrimaryButton type="button" onClick={() => dispatch({ _tag: "submit", payload: undefined })}>
                提交（触发 submit validate）
              </PrimaryButton>
              <GhostButton
                type="button"
                onClick={() => dispatch({ _tag: "setValue", payload: { path: "errors", value: {} } })}
              >
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

const BasicProfilePage: React.FC = () => (
  <RuntimeProvider runtime={runtime}>
    <React.Suspense fallback={<div>加载中…</div>}>
      <BasicProfileCase />
    </React.Suspense>
  </RuntimeProvider>
)

export const case01BasicProfile: FormCaseLink = {
  id: "01",
  title: "基础档案",
  to: "basic-profile",
  desc: "touched/dirty + submit validate",
  element: <BasicProfilePage />,
}

