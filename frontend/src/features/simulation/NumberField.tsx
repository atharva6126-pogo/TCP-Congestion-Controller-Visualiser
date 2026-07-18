import { useId } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit?: string
  error?: string
  /** Rendered for the value instead of the raw number (e.g. percentages). */
  format?: (value: number) => string
  disabled?: boolean
}

/**
 * A labelled numeric control: slider for direct manipulation with the
 * exact value shown in mono alongside, plus the field-level error
 * treatment from DESIGN_SPEC §13.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  error,
  format,
  disabled,
}: NumberFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const invalid = error !== undefined

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-label text-fg-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-axis text-fg">
          {format?.(value) ?? value.toLocaleString()}
          {unit !== undefined && unit !== '' && <span className="ml-1 text-fg-muted">{unit}</span>}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={`transport-scrubber w-full ${invalid ? 'outline outline-danger' : ''}`}
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => {
          onChange(Number(event.target.value))
        }}
      />
      {invalid && (
        <p id={errorId} className="text-label text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
