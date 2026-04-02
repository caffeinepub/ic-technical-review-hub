/**
 * Format a timestamp (in nanoseconds) to a readable date and time string
 * @param timestampNs - Timestamp in nanoseconds
 * @returns Formatted date and time string (e.g., "Jan 9, 2026, 3:45 PM")
 */
export function formatDateTime(timestampNs: bigint): string {
  const date = new Date(Number(timestampNs) / 1_000_000);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a timestamp (in nanoseconds) to a short date and time string
 * @param timestampNs - Timestamp in nanoseconds
 * @returns Formatted short date and time string (e.g., "1/9/26, 3:45 PM")
 */
export function formatDateTimeShort(timestampNs: bigint): string {
  const date = new Date(Number(timestampNs) / 1_000_000);
  return date.toLocaleString("en-US", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Check if an initial deadline has passed
 * @param initialDeadlineNs - Initial deadline timestamp in nanoseconds
 * @returns True if initial deadline has passed
 */
export function isInitialDeadlinePassed(initialDeadlineNs: bigint): boolean {
  const now = Date.now() * 1_000_000;
  return now > Number(initialDeadlineNs);
}
