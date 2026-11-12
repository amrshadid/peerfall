import './Segmented.css'

export interface SegmentedOption<T extends string> {
  readonly value: T
  readonly label: string
}

export interface SegmentedProps<T extends string> {
  legend: string
  /** Shown visually before the options; otherwise the legend is for screen readers only. */
  showLegend?: boolean
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function Segmented<T extends string>({
  legend,
  showLegend = false,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="pf-seg">
      <legend className={showLegend ? 'pf-seg__legend' : 'pf-visually-hidden'}>{legend}</legend>
      <div className="pf-seg__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
