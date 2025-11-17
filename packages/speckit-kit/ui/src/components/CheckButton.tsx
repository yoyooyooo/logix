interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export function CheckButton({ checked, onChange, className = '' }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`group relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out focus:outline-none ${
        checked
          ? 'bg-[var(--intent-primary-fg)] border-[var(--intent-primary-fg)] shadow-sm scale-100'
          : 'bg-transparent border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 scale-100 active:scale-90'
      } ${className}`}
    >
      <svg
        className={`h-3 w-3 text-white transition-all duration-300 ease-out ${
          checked ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </button>
  )
}
