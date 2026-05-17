// ---------------------------------------------------------------------------
// kills-logging.ts
// Structured console logging for kills changes.
// Format: [kills-log] timestamp | playerId | oldKills → newKills | reason | editedBy
// Can be extended later to push to a Discord webhook or external log sink.
// ---------------------------------------------------------------------------

export interface KillsLogEntry {
  playerId: string;
  oldKills: number;
  newKills: number;
  addedKills?: number;
  reason: string;
  editedBy: string;
}

/**
 * Log a kills change to stdout in a structured, grep-friendly format.
 * Called after every successful kills update (both set and increment).
 */
export function logKillsChange(entry: KillsLogEntry): void {
  const ts = new Date().toISOString();
  const delta = entry.newKills - entry.oldKills;
  const deltaStr = delta >= 0 ? `+${delta}` : String(delta);

  console.log(
    `[kills-log] ${ts} | player=${entry.playerId} | kills=${entry.oldKills} → ${entry.newKills} (${deltaStr})` +
      (entry.addedKills !== undefined ? ` | added=${entry.addedKills}` : "") +
      ` | reason="${entry.reason}" | editedBy=${entry.editedBy}`
  );
}

/**
 * Log a failed kills operation for audit trail purposes.
 */
export function logKillsError(
  playerId: string,
  operation: "set" | "add",
  error: string,
  requestedBy: string
): void {
  const ts = new Date().toISOString();
  console.error(
    `[kills-log] ${ts} | FAILED | player=${playerId} | op=${operation} | error="${error}" | requestedBy=${requestedBy}`
  );
}
