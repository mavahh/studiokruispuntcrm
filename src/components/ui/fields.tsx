type Base = { label: string; name: string; required?: boolean; hint?: string; className?: string }

export function TextField({
  label,
  name,
  required,
  hint,
  className = '',
  type = 'text',
  defaultValue,
  placeholder,
  step,
  min,
}: Base & {
  type?: string
  defaultValue?: string | number | null
  placeholder?: string
  step?: string
  min?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="text-rood"> *</span>}
      </span>
      <input
        className="field"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        step={step}
        min={min}
        inputMode={type === 'number' ? 'decimal' : undefined}
      />
      {hint && <span className="mt-1 block text-[12px] text-inkt-zacht">{hint}</span>}
    </label>
  )
}

export function TextArea({ label, name, required, hint, className = '', defaultValue, rows = 3, placeholder }: Base & {
  defaultValue?: string | null
  rows?: number
  placeholder?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="text-rood"> *</span>}
      </span>
      <textarea className="field resize-y" name={name} rows={rows} required={required} defaultValue={defaultValue ?? undefined} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-[12px] text-inkt-zacht">{hint}</span>}
    </label>
  )
}

export function SelectField({
  label,
  name,
  required,
  hint,
  className = '',
  options,
  defaultValue,
  emptyLabel,
}: Base & {
  options: { value: string; label: string }[]
  defaultValue?: string | null
  emptyLabel?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="text-rood"> *</span>}
      </span>
      <select className="field" name={name} required={required} defaultValue={defaultValue ?? ''}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-[12px] text-inkt-zacht">{hint}</span>}
    </label>
  )
}

export function CheckboxGroup({ label, name, options, defaultValues = [] }: { label: string; name: string; options: readonly string[]; defaultValues?: string[] }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="checkbox" name={name} value={o} defaultChecked={defaultValues.includes(o)} className="peer sr-only" />
            <span className="inline-flex h-8 items-center rounded-full border border-lijn bg-white px-3 text-[13px] font-semibold text-inkt-zacht transition-colors duration-150 peer-checked:border-nacht peer-checked:bg-nacht peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-blauw">
              {o}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}
