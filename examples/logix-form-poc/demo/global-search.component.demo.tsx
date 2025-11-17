import React from 'react'

import { FormReact, GlobalSearchForm, GlobalSearchFormModule } from '../src'

export interface GlobalSearchBarProps {
  readonly onSearch: (values: GlobalSearchForm.Values) => void
}

// 单文件 demo：头部搜索栏内部直接使用 Form API。
export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = (props) => {
  const controller = FormReact.useForm<GlobalSearchForm.Values>(GlobalSearchFormModule)

  const keyword = FormReact.useField<GlobalSearchForm.Values, string>(controller, 'keyword')
  const status = FormReact.useField<GlobalSearchForm.Values, GlobalSearchForm.StatusFilter>(controller, 'status')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    props.onSearch(controller.getState().values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="关键字"
        value={keyword.value}
        onChange={(e) => keyword.onChange({ target: { value: e.target.value } })}
      />

      <select value={status.value} onChange={(e) => status.onChange({ target: { value: e.target.value } })}>
        <option value="all">全部</option>
        <option value="active">进行中</option>
        <option value="archived">已归档</option>
      </select>

      <button type="submit">搜索</button>
    </form>
  )
}
