import React, { useEffect, useRef } from 'react'

export function Editor({ code, onChange }: { code: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-relaxed bg-transparent text-zinc-700 dark:text-zinc-300 resize-none focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
      style={{ tabSize: 2 }}
    />
  )
}
