import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('browser DOM integration smoke', async () => {
  // Mount a small interactive DOM snippet in a real browser environment.
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

  // Initial state assertion
  await expect.element(page.getByText('Hi, my name is Alice')).toBeInTheDocument()

  // Query the input by label and simulate user input.
  const usernameInput = page.getByLabelText(/username/i)
  await usernameInput.fill('Bob')

  // Assert the text updates with input.
  await expect.element(page.getByText('Hi, my name is Bob')).toBeInTheDocument()
})
