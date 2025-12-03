import React from "react"

import { FormReact, AddressForm, AddressFormModule } from "../src"

export interface AddressFormPageProps {
  readonly onSubmit: (values: AddressForm.Values) => void
}

// 单文件 demo：演示数组字段 + useFieldArray 的使用方式。
export const AddressFormPage: React.FC<AddressFormPageProps> = (props) => {
  const controller = FormReact.useForm<AddressForm.Values>(AddressFormModule)

  const country = FormReact.useField<AddressForm.Values, string>(
    controller,
    "defaultCountry",
  )

  const addresses = FormReact.useFieldArray<AddressForm.Values, AddressForm.AddressLine>(
    controller,
    "addresses",
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    props.onSubmit(controller.getState().values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={country.value}
        onChange={(e) =>
          country.onChange({ target: { value: e.target.value } })
        }
      />

      {addresses.fields.map((item, index) => (
        <div key={item.id}>
          <input
            value={item.label}
            onChange={(e) =>
              addresses.replace(
                addresses.fields.map((field, i) =>
                  i === index ? { ...field, label: e.target.value } : field,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => addresses.remove(index)}
          >
            删除
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          addresses.append({
            id: String(Date.now()),
            label: "",
            detail: "",
          })
        }
      >
        新增地址
      </button>

      <button type="submit">提交</button>
    </form>
  )
}

