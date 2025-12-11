import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('browser DOM integration smoke', async () => {
  // 在真实浏览器环境里挂载一段简单的交互式 DOM
  const root = document.createElement('div')
  root.innerHTML = `
    <label>
      Username
      <input id="username-input" />
    </label>
    <p id="greeting">Hi, my name is Alice</p>
  `
  document.body.appendChild(root)

  const input = document.getElementById('username-input') as HTMLInputElement
  const greeting = document.getElementById('greeting')!
  input.addEventListener('input', () => {
    greeting.textContent = `Hi, my name is ${input.value || 'Alice'}`
  })

  // 初始状态断言
  await expect.element(page.getByText('Hi, my name is Alice')).toBeInTheDocument()

  // 通过 label 查询 input，并模拟用户输入
  const usernameInput = page.getByLabelText(/username/i)
  await usernameInput.fill('Bob')

  // 断言文案随输入更新
  await expect.element(page.getByText('Hi, my name is Bob')).toBeInTheDocument()
})
