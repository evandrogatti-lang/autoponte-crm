import {
  canOperateCaseTasks,
  deriveNextAction,
} from "./contracts.ts";

export const RECENTLY_LOST_DAYS = 14;
export const MISSION_CONTROL_TIME_ZONE = "America/Sao_Paulo";

export type MissionControlCaseInput = {
  id: string;
  pilotCode: string;
  status: string;
  finalOutcome: string;
  customerName: string | null;
  noNextActionReason: string | null;
  notes: string;
  closedAt: Date | null;
  updatedAt: Date;
};

export type MissionControlTaskInput = {
  id: string;
  caseId: string;
  actionType: string;
  ownerId: string;
  ownerName: string | null;
  dueAt: Date;
  priority: string;
  status: string;
  context: string;
  createdAt: Date;
};

export type MissionControlCase = MissionControlCaseInput & {
  nextAction?: MissionControlTaskInput;
  lostReason: string | null;
  attention:
    | "urgent"
    | "overdue"
    | "due_today"
    | "high"
    | "no_next_action"
    | "recently_lost"
    | "active";
};

export type MissionControlModel = {
  cases: MissionControlCase[];
  counters: {
    overdue: number;
    dueToday: number;
    noNextAction: number;
    urgentHigh: number;
  };
};

function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MISSION_CONTROL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isLost(item: MissionControlCaseInput) {
  return (
    item.status === "lost" ||
    item.status === "negotiation_lost" ||
    item.finalOutcome === "negotiation_lost"
  );
}

function isRecentlyLost(item: MissionControlCaseInput, now: Date) {
  if (!isLost(item)) return false;
  const lostAt = item.closedAt ?? item.updatedAt;
  return lostAt.valueOf() >= now.valueOf() - RECENTLY_LOST_DAYS * 86_400_000;
}

function dueState(task: MissionControlTaskInput | undefined, today: string) {
  if (!task) return { overdue: false, dueToday: false };
  const due = localDateKey(task.dueAt);
  return { overdue: due < today, dueToday: due === today };
}

function attentionFor(
  item: MissionControlCaseInput,
  nextAction: MissionControlTaskInput | undefined,
  now: Date,
): MissionControlCase["attention"] {
  const today = localDateKey(now);
  const due = dueState(nextAction, today);
  if (nextAction?.priority === "URGENT") return "urgent";
  if (due.overdue) return "overdue";
  if (due.dueToday) return "due_today";
  if (nextAction?.priority === "HIGH") return "high";
  if (canOperateCaseTasks(item.status) && !nextAction) return "no_next_action";
  if (isRecentlyLost(item, now)) return "recently_lost";
  return "active";
}

const attentionWeight: Record<MissionControlCase["attention"], number> = {
  urgent: 0,
  overdue: 1,
  due_today: 2,
  high: 3,
  no_next_action: 4,
  recently_lost: 5,
  active: 6,
};

export function buildMissionControl(
  cases: readonly MissionControlCaseInput[],
  tasks: readonly MissionControlTaskInput[],
  now = new Date(),
): MissionControlModel {
  const tasksByCase = new Map<string, MissionControlTaskInput[]>();
  for (const task of tasks) {
    const caseTasks = tasksByCase.get(task.caseId) ?? [];
    caseTasks.push(task);
    tasksByCase.set(task.caseId, caseTasks);
  }

  const today = localDateKey(now);
  const relevant = cases
    .filter((item) => canOperateCaseTasks(item.status) || isRecentlyLost(item, now))
    .map((item): MissionControlCase => {
      const nextAction = deriveNextAction(tasksByCase.get(item.id) ?? []);
      return {
        ...item,
        nextAction,
        lostReason: isLost(item) ? item.notes || "Motivo não registrado." : null,
        attention: attentionFor(item, nextAction, now),
      };
    });

  const counters = relevant.reduce(
    (result, item) => {
      if (canOperateCaseTasks(item.status) && !item.nextAction) {
        result.noNextAction += 1;
      }
      if (item.nextAction) {
        const due = dueState(item.nextAction, today);
        if (due.overdue) result.overdue += 1;
        if (due.dueToday) result.dueToday += 1;
        if (["URGENT", "HIGH"].includes(item.nextAction.priority)) {
          result.urgentHigh += 1;
        }
      }
      return result;
    },
    { overdue: 0, dueToday: 0, noNextAction: 0, urgentHigh: 0 },
  );

  relevant.sort((left, right) => {
    const attention = attentionWeight[left.attention] - attentionWeight[right.attention];
    if (attention !== 0) return attention;

    const leftDue = left.nextAction?.dueAt.valueOf() ?? Number.POSITIVE_INFINITY;
    const rightDue = right.nextAction?.dueAt.valueOf() ?? Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return right.updatedAt.valueOf() - left.updatedAt.valueOf() || left.id.localeCompare(right.id);
  });

  return { cases: relevant, counters };
}
