export const DEADLINE_STATUSES = ['pending', 'done', 'overdue'] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

/** D4: status for a specific user — done (marked), overdue (not done, due in the past), pending. */
export function deadlineStatus(
  dueAt: Date,
  completedAt: Date | null,
  now: Date = new Date(),
): DeadlineStatus {
  if (completedAt) return 'done';
  return dueAt.getTime() < now.getTime() ? 'overdue' : 'pending';
}
