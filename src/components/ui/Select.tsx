interface SelectOption {
  value: string
  label: string
  subtitle?: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = '请选择',
  label,
}: SelectProps) {
  return (
    <div>
      {label && <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-1.5">{label}</div>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 dark:focus:border-accent-600 focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none transition-colors cursor-pointer"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
