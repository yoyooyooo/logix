'use client'

import { useI18n } from 'fumadocs-ui/contexts/i18n'

export function SidebarLanguageSwitch() {
  const { locales, locale, onChange, text } = useI18n()

  if (!locales || locales.length === 0 || !onChange) {
    return null
  }

  const value = locale ?? locales[0]?.locale

  return (
    <div className="pt-2">
      <div className="text-xs font-medium text-fd-muted-foreground">{text.chooseLanguage}</div>
      <select
        className="mt-2 w-full rounded-md border border-fd-border bg-fd-background px-2 py-1.5 text-sm text-fd-foreground"
        aria-label={text.chooseLanguage}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {locales.map((item) => (
          <option key={item.locale} value={item.locale}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  )
}
