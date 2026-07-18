/**
 * What the inspector is currently showing. Both kinds render into the
 * same detail panel (DESIGN_SPEC §5, §16), so there is one selection
 * concept rather than two competing ones.
 */
export type Selection =
  | { kind: 'event'; index: number }
  | { kind: 'packet'; sequenceNumber: number; attempt: number }
  | null

export function isSamePacket(
  selection: Selection,
  sequenceNumber: number,
  attempt: number,
): boolean {
  return (
    selection !== null &&
    selection.kind === 'packet' &&
    selection.sequenceNumber === sequenceNumber &&
    selection.attempt === attempt
  )
}
