interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  descClass?: string
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  descClass = 'text-[#86868b] dark:text-[#8e8e93]',
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex rounded-xl bg-[#e8e8ed] dark:bg-[#2c2c2e] p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 text-sm font-medium rounded-[10px] transition-all duration-200 ${
              value === opt.value
                ? 'bg-white dark:bg-[#48484a] text-[#1d1d1f] dark:text-white shadow-sm'
                : 'text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {options.find((o) => o.value === value)?.description && (
        <p className={`text-xs ${descClass}`}>
          {options.find((o) => o.value === value)!.description}
        </p>
      )}
    </div>
  )
}
