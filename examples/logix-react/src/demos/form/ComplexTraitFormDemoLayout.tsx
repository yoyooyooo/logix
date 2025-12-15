import React from "react"
import { Schema } from "effect"
import * as Logix from "@logix/core"
import { RuntimeProvider, useDispatch, useSelector } from "@logix/react"
import { Form } from "@logix/form"
import { useForm, useFieldArray } from "@logix/form/react"

const ValuesSchema = Schema.Struct({
  profile: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    fullName: Schema.String,
  }),
  contact: Schema.Struct({
    email: Schema.String,
    phone: Schema.String,
    preferredChannel: Schema.Literal("email", "phone"),
  }),
  shipping: Schema.Struct({
    recipientName: Schema.String,
    contactEmail: Schema.String,
  }),
  items: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      quantity: Schema.Number,
      price: Schema.Number,
    }),
  ),
  summary: Schema.Struct({
    itemCount: Schema.Number,
    totalQuantity: Schema.Number,
    totalAmount: Schema.Number,
    hasInvalid: Schema.Boolean,
  }),
  validation: Schema.Struct({
    emailValid: Schema.Boolean,
    phoneRequired: Schema.Boolean,
    formValid: Schema.Boolean,
  }),
  submit: Schema.Struct({
    attempted: Schema.Boolean,
    result: Schema.Literal("idle", "success", "error"),
  }),
})

const FormStateSchema = Schema.extend(
  ValuesSchema,
  Schema.Struct({
    errors: Schema.Any,
    ui: Schema.Any,
  }),
)

type Values = Schema.Schema.Type<typeof ValuesSchema>
type FormState = Values & { readonly errors: any; readonly ui: any }

const ComplexForm = Form.make("ComplexFormDemo", {
  values: ValuesSchema,
  initialValues: {
    profile: {
      firstName: "",
      lastName: "",
      fullName: "",
    },
    contact: {
      email: "",
      phone: "",
      preferredChannel: "email",
    },
    shipping: {
      recipientName: "",
      contactEmail: "",
    },
    items: [{ name: "", quantity: 1, price: 0 }],
    summary: {
      itemCount: 1,
      totalQuantity: 1,
      totalAmount: 0,
      hasInvalid: true,
    },
    validation: {
      emailValid: false,
      phoneRequired: false,
      formValid: false,
    },
    submit: {
      attempted: false,
      result: "idle",
    },
  },
  traits: Logix.StateTrait.from<any, any>(FormStateSchema as any)({
    "profile.fullName": Logix.StateTrait.computed({
      deps: ["profile.firstName", "profile.lastName"],
      get: (s) => `${s.profile.firstName} ${s.profile.lastName}`.trim(),
    }),
    "shipping.recipientName": Logix.StateTrait.link({
      from: "profile.fullName",
    }),
    "shipping.contactEmail": Logix.StateTrait.link({
      from: "contact.email",
    }),

    "validation.emailValid": Logix.StateTrait.computed({
      deps: ["contact.email"],
      get: (s) => {
        const email = s.contact.email.trim()
        return email !== "" && email.includes("@")
      },
    }),
    "validation.phoneRequired": Logix.StateTrait.computed({
      deps: ["contact.preferredChannel", "contact.phone"],
      get: (s) =>
        s.contact.preferredChannel === "phone" && s.contact.phone.trim() === "",
    }),
    "validation.formValid": Logix.StateTrait.computed({
      deps: [
        "contact.email",
        "contact.preferredChannel",
        "contact.phone",
        "items",
      ],
      get: (s) => {
        const emailValid =
          s.contact.email.trim() !== "" && s.contact.email.includes("@")
        const phoneRequired =
          s.contact.preferredChannel === "phone" && s.contact.phone.trim() === ""
        const hasBadItem =
          s.items.length === 0 ||
          s.items.some(
            (item: any) =>
              item.name.trim() === "" || item.quantity <= 0 || item.price < 0,
          )
        return emailValid && !phoneRequired && !hasBadItem
      },
    }),

    "errors.email": Logix.StateTrait.computed({
      deps: ["contact.email"],
      get: (s) => {
        const email = s.contact.email.trim()
        if (email === "") return "请填写邮箱"
        if (!email.includes("@")) return "邮箱格式不正确"
        return null
      },
    }),
    "errors.phone": Logix.StateTrait.computed({
      deps: ["contact.preferredChannel", "contact.phone"],
      get: (s) => {
        const phoneRequired =
          s.contact.preferredChannel === "phone" && s.contact.phone.trim() === ""
        if (phoneRequired) return "当首选渠道为电话时，手机号必填"
        return null
      },
    }),
    "errors.items": Logix.StateTrait.computed({
      deps: ["items"],
      get: (s) => {
        if (s.items.length === 0) return "至少需要一行商品"
        const hasBadItem = s.items.some(
          (item: any) => item.name.trim() === "" || item.quantity <= 0 || item.price < 0,
        )
        if (hasBadItem) return "请检查商品名称、数量和价格"
        return null
      },
    }),

    "summary.itemCount": Logix.StateTrait.computed({
      deps: ["items"],
      get: (s) => s.items.length,
    }),
    "summary.totalQuantity": Logix.StateTrait.computed({
      deps: ["items"],
      get: (s) =>
        s.items.reduce((acc: number, item: any) => acc + item.quantity, 0),
    }),
    "summary.totalAmount": Logix.StateTrait.computed({
      deps: ["items"],
      get: (s) =>
        s.items.reduce(
          (acc: number, item: any) => acc + item.quantity * item.price,
          0,
        ),
    }),
    "summary.hasInvalid": Logix.StateTrait.computed({
      deps: [
        "contact.email",
        "contact.preferredChannel",
        "contact.phone",
        "items",
      ],
      get: (s) => {
        const hasBadItem =
          s.items.length === 0 ||
          s.items.some(
            (item: any) =>
              item.name.trim() === "" || item.quantity <= 0 || item.price < 0,
          )
        const emailValid =
          s.contact.email.trim() !== "" && s.contact.email.includes("@")
        const phoneRequired =
          s.contact.preferredChannel === "phone" && s.contact.phone.trim() === ""
        return !emailValid || phoneRequired || hasBadItem
      },
    }),
  }),
})

const runtime = Logix.Runtime.make(ComplexForm.impl, {
  label: "ComplexFormDemoRuntime",
  devtools: true,
})

const ItemList: React.FC<{
  readonly fields: ReadonlyArray<{ readonly id: string }>
  readonly items: ReadonlyArray<any>
  readonly onChange: (index: number, field: "name" | "quantity" | "price") => React.ChangeEventHandler<HTMLInputElement>
  readonly onRemove: (index: number) => void
}> = ({ fields, items, onChange, onRemove }) => (
  <div className="space-y-3">
    {items.map((item, index) => (
      <div
        key={fields[index]?.id ?? index}
        className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-3 space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
            Item #{index + 1}
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            删除
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            value={item?.name ?? ""}
            onChange={onChange(index, "name")}
            placeholder="名称"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={item?.quantity ?? 0}
            onChange={onChange(index, "quantity")}
            placeholder="数量"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={item?.price ?? 0}
            onChange={onChange(index, "price")}
            placeholder="价格"
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    ))}
  </div>
)

const ComplexFormView: React.FC = () => {
  const form = useForm(ComplexForm)
  const dispatch = useDispatch(form.runtime as any)
  const state = useSelector(form.runtime as any) as any
  const items = Array.isArray(state?.items) ? state.items : []

  const { fields, append, remove } = useFieldArray(form, "items")

  const onProfileChange =
    (field: "firstName" | "lastName") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        _tag: "setValue",
        payload: { path: `profile.${field}`, value: e.target.value },
      })
    }

  const onContactChange =
    (field: "email" | "phone") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        _tag: "setValue",
        payload: { path: `contact.${field}`, value: e.target.value },
      })
    }

  const onPreferredChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      _tag: "setValue",
      payload: { path: "contact.preferredChannel", value: e.target.value },
    })
  }

  const onItemChange =
    (index: number, field: "name" | "quantity" | "price") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (field === "name") {
        dispatch({
          _tag: "setValue",
          payload: { path: `items.${index}.name`, value: raw },
        })
        return
      }
      const num = raw === "" ? 0 : Number(raw)
      if (Number.isNaN(num)) return
      dispatch({
        _tag: "setValue",
        payload: { path: `items.${index}.${field}`, value: num },
      })
    }

  const onAddItem = () => {
    append({ name: "", quantity: 1, price: 0 })
  }

  const onSubmit = () => {
    dispatch({
      _tag: "setValue",
      payload: { path: "submit.attempted", value: true },
    })
    dispatch({
      _tag: "setValue",
      payload: {
        path: "submit.result",
        value: state?.validation?.formValid ? "success" : "error",
      },
    })
  }

  const formValid = Boolean(state?.validation?.formValid)

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ComplexForm · Form-first（Trait 内核 + 领域包）
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          这个示例把表单建模为一个“特殊 Module”，业务侧只通过 Form 的基础动作（setValue / array*）驱动，
          派生/联动/校验统一下沉到 StateTrait（显式 deps）。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="space-y-4">
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Profile
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={state?.profile?.firstName ?? ""}
                  onChange={onProfileChange("firstName")}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={state?.profile?.lastName ?? ""}
                  onChange={onProfileChange("lastName")}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Full Name（computed）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.profile?.fullName || (
                    <span className="text-gray-400">尚未填写</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Contact
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={state?.contact?.email ?? ""}
                  onChange={onContactChange("email")}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {state?.errors?.email && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {String(state.errors.email)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={state?.contact?.phone ?? ""}
                  onChange={onContactChange("phone")}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {state?.errors?.phone && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {String(state.errors.phone)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Preferred Channel
                </label>
                <select
                  value={state?.contact?.preferredChannel ?? "email"}
                  onChange={onPreferredChannelChange}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  phoneRequired: {String(Boolean(state?.validation?.phoneRequired))}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Shipping（link）
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Recipient Name（from profile.fullName）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.shipping?.recipientName || (
                    <span className="text-gray-400">尚未填写</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contact Email（from contact.email）
                </label>
                <div className="px-3 py-2 rounded border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {state?.shipping?.contactEmail || (
                    <span className="text-gray-400">尚未填写</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Summary &amp; Validation
              </h3>
              <span
                className={[
                  "px-2 py-0.5 rounded-full text-[10px] font-mono",
                  formValid
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                ].join(" ")}
              >
                formValid: {String(formValid)}
              </span>
            </div>

            {state?.errors?.items && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {String(state.errors.items)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    itemCount:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {state?.summary?.itemCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    totalQuantity:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {state?.summary?.totalQuantity ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    totalAmount:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {Number(state?.summary?.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    emailValid:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {String(Boolean(state?.validation?.emailValid))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    hasInvalid:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {String(Boolean(state?.summary?.hasInvalid))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    submit:
                  </span>
                  <span className="text-blue-600 dark:text-blue-300">
                    {String(state?.submit?.result ?? "idle")}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-all active:scale-95 shadow-sm shadow-blue-600/20 disabled:opacity-50"
              disabled={!Boolean(items.length)}
            >
              提交（setValue 驱动）
            </button>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Items（index 语义）
              </h3>
              <button
                type="button"
                onClick={onAddItem}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                新增一行
              </button>
            </div>

            <ItemList
              fields={fields}
              items={items}
              onChange={onItemChange}
              onRemove={remove}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export const ComplexTraitFormDemoLayout: React.FC = () => {
  return (
    <RuntimeProvider runtime={runtime}>
      <React.Suspense fallback={<div>ComplexForm 模块加载中…</div>}>
        <ComplexFormView />
      </React.Suspense>
    </RuntimeProvider>
  )
}
