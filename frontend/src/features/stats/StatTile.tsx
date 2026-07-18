interface StatTileProps {
  label: string
  /** Formatted value; null renders the §11 em-dash empty state. */
  value: string | null
  /** Unit suffix shown after the value when present. */
  unit?: string
}

/** One metric in the stats rail. Values are mono with stable widths. */
export function StatTile({ label, value, unit }: StatTileProps) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-label text-fg-muted">{label}</dt>
      <dd className="font-mono text-axis text-fg">
        {value === null ? (
          <span aria-label="no data" className="text-fg-faint">
            —
          </span>
        ) : (
          <>
            {value}
            {unit !== undefined && <span className="ml-1 text-fg-muted">{unit}</span>}
          </>
        )}
      </dd>
    </div>
  )
}
