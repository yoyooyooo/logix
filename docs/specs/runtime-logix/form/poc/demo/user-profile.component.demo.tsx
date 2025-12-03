import React from "react"

import { FormReact, UserProfileForm, UserProfileFormModule } from "../src"

export interface UserProfilePageProps {
  readonly onSubmit: (values: UserProfileForm.Values) => void
}

// 单文件 demo：组件内直接使用 Form API，串起完整表单流程。
export const UserProfilePage: React.FC<UserProfilePageProps> = (props) => {
  const controller = FormReact.useForm<UserProfileForm.Values>(UserProfileFormModule)

  const username = FormReact.useField<UserProfileForm.Values, string>(
    controller,
    "username",
  )
  const email = FormReact.useField<UserProfileForm.Values, string>(
    controller,
    "email",
  )
  const phone = FormReact.useField<UserProfileForm.Values, string>(
    controller,
    "phone",
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    props.onSubmit(controller.getState().values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={username.value}
        onChange={(e) =>
          username.onChange({ target: { value: e.target.value } })
        }
        onBlur={() => username.onBlur()}
      />

      <input
        value={email.value}
        onChange={(e) =>
          email.onChange({ target: { value: e.target.value } })
        }
        onBlur={() => email.onBlur()}
      />

      <input
        value={phone.value}
        onChange={(e) =>
          phone.onChange({ target: { value: e.target.value } })
        }
      />

      <button type="submit">提交</button>
    </form>
  )
}

