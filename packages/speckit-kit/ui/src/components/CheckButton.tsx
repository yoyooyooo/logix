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
      className={`group relative flex h-5 w-5 shrink-0 items-center justify-center rounded-none border-2 transition-all duration-300 ease-out focus:outline-none ${
        checked
          ? 'bg-primary border-primary text-primary-foreground'
          : 'bg-transparent border-input hover:bg-accent hover:border-input'
      } ${className}`}
    >
      <svg
        className={`h-3 w-3 transition-all duration-300 ease-out ${
          checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
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
