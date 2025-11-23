import { Schema } from "effect"
import { Field, useForm, useFieldArray } from "../index"
import { FormValuesPanel } from "./components/FormValuesPanel"

const PeopleSchema = Schema.Struct({
  people: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      email: Schema.String,
    }),
  ),
})

type PeopleForm = Schema.Schema.Type<typeof PeopleSchema>

const initialValues: PeopleForm = {
  people: [
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
  ],
}

export function ArrayFormPage() {
  const form = useForm(PeopleSchema, initialValues, {
    mode: "onChange",
    reValidateMode: "onChange",
  })
  // 使用新的 useFieldArray Hook
  const { fields, append, remove, swap } = useFieldArray<PeopleForm, PeopleForm['people'][number]>(form.control, "people")

  if (!form.control) return <div>初始化中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">数组字段与动态项</h2>
          <p className="text-sm text-gray-600">
            使用 useFieldArray 管理动态列表，支持增删改查。
          </p>
        </div>
        <div className="text-xs text-gray-500">校验: onChange</div>
      </div>

      <div className="grid grid-cols-[2fr,1fr] gap-8 items-start">
        <div className="space-y-4 border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">成员列表</div>
            <button
              type="button"
              onClick={() => append({ name: "", email: "" })}
              className="text-blue-600 text-xs font-medium"
            >
              + 新增成员
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((_, i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">姓名</label>
                    {/* 这里演示如何更新数组中的特定项，目前我们还没有 useFieldArrayItem，所以手动拼接 path */}
                    <Field<PeopleForm, string> control={form.control} name={`people.${i}.name`}>
                        {({ value, handleChange, error }) => (
                            <>
                                <input
                                    value={value}
                                    onChange={(e) => handleChange(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="姓名"
                                />
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </>
                        )}
                    </Field>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">邮箱</label>
                    <Field<PeopleForm, string> control={form.control} name={`people.${i}.email`}>
                        {({ value, handleChange, error }) => (
                            <>
                                <input
                                    value={value}
                                    onChange={(e) => handleChange(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="email"
                                />
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </>
                        )}
                    </Field>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Row {i + 1}</span>
                  <div className="space-x-2">
                    <button
                        type="button"
                        onClick={() => i > 0 && swap(i, i - 1)}
                        disabled={i === 0}
                        className="text-gray-500 disabled:opacity-30"
                    >
                        上移
                    </button>
                    <button
                        type="button"
                        onClick={() => i < fields.length - 1 && swap(i, i + 1)}
                        disabled={i === fields.length - 1}
                        className="text-gray-500 disabled:opacity-30"
                    >
                        下移
                    </button>
                    <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-red-500"
                    >
                        删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded text-blue-800">
            <strong>观察点：</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>使用 useFieldArray 进行 append/remove/swap。</li>
              <li>每个输入框使用 Field 绑定具体路径 (people.0.name)。</li>
              <li>错误信息自动映射到对应路径。</li>
            </ul>
          </div>
          <FormValuesPanel control={form.control} />
        </div>
      </div>
    </div>
  )
}
