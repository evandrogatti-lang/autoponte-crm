export const centralQueueLeadStatuses = [
  "pre_evaluated",
  "new",
  "received",
  "contacted",
  "qualified",
  "negotiating",
] as const;

export const activeAssignmentStatuses = ["assigned", "accepted", "contacted"] as const;
export const completedAssignmentStatuses = ["completed"] as const;

export function isActiveAssignmentStatus(status: string): boolean {
  return activeAssignmentStatuses.includes(status as (typeof activeAssignmentStatuses)[number]);
}

export function isCompletedAssignmentStatus(status: string): boolean {
  return completedAssignmentStatuses.includes(status as (typeof completedAssignmentStatuses)[number]);
}

export function countActiveAssignmentStatuses(statuses: string[]): number {
  return statuses.filter(isActiveAssignmentStatus).length;
}

export function canAssignWithoutExplicitReopen(latestAssignmentStatus: string | null): boolean {
  return latestAssignmentStatus == null || !isCompletedAssignmentStatus(latestAssignmentStatus);
}

export function shouldKeepOpportunityInCentralQueue(
  latestAssignmentStatus: string | null,
  hasActiveAssignment: boolean,
): boolean {
  if (hasActiveAssignment) return true;
  return !isCompletedAssignmentStatus(latestAssignmentStatus ?? "");
}
