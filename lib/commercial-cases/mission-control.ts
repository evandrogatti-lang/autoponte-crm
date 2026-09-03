import { canOperateCaseTasks, deriveNextAction } from "./contracts.ts";

export const RECENTLY_LOST_DAYS = 14;
export const MISSION_CONTROL_TIME_ZONE = "America/Sao_Paulo";

export type CockpitRole = "seller" | "manager" | "owner";
export type FunnelStage = "new_leads" | "potential_clients" | "opportunities" | "negotiations" | "proposals" | "closed";

export type MissionControlCaseInput = {
  id: string; pilotCode: string; status: string; finalOutcome: string;
  customerName: string | null; noNextActionReason: string | null; notes: string;
  closedAt: Date | null; updatedAt: Date; sellerProfileId: string | null;
  sellerName: string | null; opportunityStatus: string | null; leadCategory: string | null;
  vehicleLabel: string | null; vehicleValue: number;
};

export type MissionControlTaskInput = {
  id: string; caseId: string; actionType: string; ownerId: string;
  ownerName: string | null; dueAt: Date; priority: string; status: string;
  context: string; createdAt: Date;
};

export type MissionControlProposalInput = {
  id: string; caseId: string; status: string; totalAmount: number; proposedAt: Date;
};

export type MissionControlVehicleInput = {
  id: string; status: string; askingPrice: number; acquisitionCost: number; additionalCosts: number;
};

export type MissionControlEventInput = {
  id: string; caseId: string; eventType: string; description: string; occurredAt: Date;
};

export type MissionControlAccessInput = {
  crmUserId: string; roleCode: string; sellerProfileId: string | null; userName: string;
};

export type MissionControlCase = MissionControlCaseInput & {
  nextAction?: MissionControlTaskInput;
  proposals: MissionControlProposalInput[];
  funnelStage: FunnelStage;
  displayValue: number;
  lostReason: string | null;
  attention: "urgent" | "overdue" | "due_today" | "high" | "no_next_action" | "recently_lost" | "active";
};

export type MissionControlModel = {
  role: CockpitRole;
  userName: string;
  cases: MissionControlCase[];
  attentionNow: MissionControlCase[];
  hotNegotiations: MissionControlCase[];
  agendaActions: MissionControlTaskInput[];
  todayActions: MissionControlTaskInput[];
  approvals: MissionControlTaskInput[];
  recentActivity: MissionControlEventInput[];
  counters: { overdue: number; dueToday: number; noNextAction: number; urgentHigh: number; openNegotiations: number; pendingProposals: number };
  performance: { active: number; closedWon: number; recentlyLost: number; conversion: number };
  financial: { proposalValue: number; activeStockValue: number; potentialMargin: number };
  stock: { active: number; reserved: number; evaluation: number; sold: number };
  team: Array<{ name: string; activeCases: number; overdue: number; dueToday: number }>;
  funnel: Array<{ stage: FunnelStage; label: string; count: number; value: number; cases: MissionControlCase[] }>;
};

const funnelLabels: Record<FunnelStage, string> = {
  new_leads: "Leads novos", potential_clients: "Qualificação", opportunities: "Match",
  negotiations: "Negociações", proposals: "Propostas", closed: "Fechadas",
};

export function resolveCockpitRole(roleCode: string): CockpitRole {
  if (roleCode === "admin") return "owner";
  if (roleCode === "manager") return "manager";
  return "seller";
}

function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: MISSION_CONTROL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isLost(item: MissionControlCaseInput) {
  return item.status === "lost" || item.status === "negotiation_lost" || item.finalOutcome === "negotiation_lost";
}

function isClosed(item: MissionControlCaseInput) {
  return isLost(item) || item.status === "closed" || Boolean(item.closedAt);
}

function isRecentlyLost(item: MissionControlCaseInput, now: Date) {
  if (!isLost(item)) return false;
  return (item.closedAt ?? item.updatedAt).valueOf() >= now.valueOf() - RECENTLY_LOST_DAYS * 86_400_000;
}

function dueState(task: MissionControlTaskInput | undefined, today: string) {
  if (!task) return { overdue: false, dueToday: false };
  const due = localDateKey(task.dueAt);
  return { overdue: due < today, dueToday: due === today };
}

export function mapFunnelStage(item: MissionControlCaseInput, caseProposals: readonly MissionControlProposalInput[]): FunnelStage {
  if (isClosed(item)) return "closed";
  if (caseProposals.some((proposal) => ["draft", "sent", "accepted"].includes(proposal.status))) return "proposals";
  if (item.status === "active_negotiation") return "negotiations";
  if (item.status === "opened" && ["new", "pre_evaluated"].includes(item.opportunityStatus ?? "")) return "new_leads";
  if (item.status === "opened" && ["new", "review"].includes(item.leadCategory ?? "")) return "new_leads";
  if (item.status === "opened") return "potential_clients";
  return "opportunities";
}

function attentionFor(item: MissionControlCaseInput, nextAction: MissionControlTaskInput | undefined, now: Date): MissionControlCase["attention"] {
  const due = dueState(nextAction, localDateKey(now));
  if (nextAction?.priority === "URGENT") return "urgent";
  if (due.overdue) return "overdue";
  if (due.dueToday) return "due_today";
  if (nextAction?.priority === "HIGH") return "high";
  if (canOperateCaseTasks(item.status) && !nextAction) return "no_next_action";
  if (isRecentlyLost(item, now)) return "recently_lost";
  return "active";
}

const attentionWeight: Record<MissionControlCase["attention"], number> = {
  urgent: 0, overdue: 1, due_today: 2, high: 3, no_next_action: 4, recently_lost: 5, active: 6,
};

function sortCases(left: MissionControlCase, right: MissionControlCase) {
  const attention = attentionWeight[left.attention] - attentionWeight[right.attention];
  if (attention !== 0) return attention;
  const leftDue = left.nextAction?.dueAt.valueOf() ?? Number.POSITIVE_INFINITY;
  const rightDue = right.nextAction?.dueAt.valueOf() ?? Number.POSITIVE_INFINITY;
  return leftDue - rightDue || right.updatedAt.valueOf() - left.updatedAt.valueOf() || left.id.localeCompare(right.id);
}

function scopeCases(cases: readonly MissionControlCaseInput[], tasks: readonly MissionControlTaskInput[], access: MissionControlAccessInput) {
  if (resolveCockpitRole(access.roleCode) !== "seller") return [...cases];
  const ownedCaseIds = new Set(tasks.filter((task) => task.status === "OPEN" && task.ownerId === access.crmUserId).map((task) => task.caseId));
  return cases.filter((item) => Boolean(access.sellerProfileId && item.sellerProfileId === access.sellerProfileId) || ownedCaseIds.has(item.id));
}

export function buildMissionControl(
  cases: readonly MissionControlCaseInput[], tasks: readonly MissionControlTaskInput[],
  proposals: readonly MissionControlProposalInput[] = [], vehicles: readonly MissionControlVehicleInput[] = [],
  events: readonly MissionControlEventInput[] = [],
  access: MissionControlAccessInput = { crmUserId: "", roleCode: "sales", sellerProfileId: null, userName: "Operação" },
  now = new Date(),
): MissionControlModel {
  const visibleCases = scopeCases(cases, tasks, access);
  const visibleCaseIds = new Set(visibleCases.map((item) => item.id));
  const visibleTasks = tasks.filter((task) => visibleCaseIds.has(task.caseId));
  const visibleProposals = proposals.filter((proposal) => visibleCaseIds.has(proposal.caseId));
  const tasksByCase = new Map<string, MissionControlTaskInput[]>();
  const proposalsByCase = new Map<string, MissionControlProposalInput[]>();
  for (const task of visibleTasks) tasksByCase.set(task.caseId, [...(tasksByCase.get(task.caseId) ?? []), task]);
  for (const proposal of visibleProposals) proposalsByCase.set(proposal.caseId, [...(proposalsByCase.get(proposal.caseId) ?? []), proposal]);

  const mapped = visibleCases.map((item): MissionControlCase => {
    const nextAction = deriveNextAction(tasksByCase.get(item.id) ?? []);
    const caseProposals = proposalsByCase.get(item.id) ?? [];
    const proposalValue = caseProposals.reduce((highest, proposal) => Math.max(highest, proposal.totalAmount), 0);
    return { ...item, nextAction, proposals: caseProposals, funnelStage: mapFunnelStage(item, caseProposals), displayValue: proposalValue || item.vehicleValue, lostReason: isLost(item) ? item.notes || "Motivo não registrado." : null, attention: attentionFor(item, nextAction, now) };
  }).sort(sortCases);

  const today = localDateKey(now);
  const activeCases = mapped.filter((item) => canOperateCaseTasks(item.status));
  const recentlyLost = mapped.filter((item) => isRecentlyLost(item, now));
  const todayActions = visibleTasks.filter((task) => task.status === "OPEN" && localDateKey(task.dueAt) === today).sort((a, b) => a.dueAt.valueOf() - b.dueAt.valueOf());
  const approvals = visibleTasks.filter((task) => task.status === "OPEN" && task.actionType === "REVIEW_PROPOSAL").sort((a, b) => a.dueAt.valueOf() - b.dueAt.valueOf());
  const counters = activeCases.reduce((result, item) => {
    if (!item.nextAction) result.noNextAction += 1;
    if (item.nextAction) {
      const due = dueState(item.nextAction, today);
      if (due.overdue) result.overdue += 1;
      if (due.dueToday) result.dueToday += 1;
      if (["URGENT", "HIGH"].includes(item.nextAction.priority)) result.urgentHigh += 1;
    }
    if (item.status === "active_negotiation") result.openNegotiations += 1;
    return result;
  }, { overdue: 0, dueToday: 0, noNextAction: 0, urgentHigh: 0, openNegotiations: 0, pendingProposals: visibleProposals.filter((item) => ["draft", "sent"].includes(item.status)).length });

  const closedWon = mapped.filter((item) => item.status === "closed" && item.finalOutcome === "sold").length;
  const concluded = mapped.filter((item) => isClosed(item)).length;
  const activeVehicles = vehicles.filter((vehicle) => !["sold", "unavailable"].includes(vehicle.status));
  const teamMap = new Map<string, { name: string; activeCases: number; overdue: number; dueToday: number }>();
  for (const item of activeCases) {
    const name = item.sellerName || item.nextAction?.ownerName || "Sem responsável";
    const row = teamMap.get(name) ?? { name, activeCases: 0, overdue: 0, dueToday: 0 };
    row.activeCases += 1;
    const due = dueState(item.nextAction, today);
    if (due.overdue) row.overdue += 1;
    if (due.dueToday) row.dueToday += 1;
    teamMap.set(name, row);
  }

  const stages = Object.keys(funnelLabels) as FunnelStage[];
  return {
    role: resolveCockpitRole(access.roleCode), userName: access.userName, cases: mapped,
    attentionNow: mapped.filter((item) => item.attention !== "active").slice(0, 8),
    hotNegotiations: mapped.filter((item) => canOperateCaseTasks(item.status) && (["URGENT", "HIGH"].includes(item.nextAction?.priority ?? "") || item.status === "active_negotiation")).slice(0, 6),
    agendaActions: visibleTasks.filter((task) => task.status === "OPEN").sort((a, b) => a.dueAt.valueOf() - b.dueAt.valueOf()),
    todayActions, approvals,
    recentActivity: events.filter((event) => visibleCaseIds.has(event.caseId)).sort((a, b) => b.occurredAt.valueOf() - a.occurredAt.valueOf()).slice(0, 8),
    counters,
    performance: { active: activeCases.length, closedWon, recentlyLost: recentlyLost.length, conversion: concluded ? Math.round((closedWon / concluded) * 100) : 0 },
    financial: {
      proposalValue: visibleProposals.filter((item) => ["draft", "sent", "accepted"].includes(item.status)).reduce((sum, item) => sum + item.totalAmount, 0),
      activeStockValue: activeVehicles.reduce((sum, item) => sum + item.askingPrice, 0),
      potentialMargin: activeVehicles.reduce((sum, item) => sum + Math.max(0, item.askingPrice - item.acquisitionCost - item.additionalCosts), 0),
    },
    stock: { active: activeVehicles.length, reserved: vehicles.filter((item) => item.status === "reserved").length, evaluation: vehicles.filter((item) => item.status === "evaluation").length, sold: vehicles.filter((item) => item.status === "sold").length },
    team: [...teamMap.values()].sort((a, b) => b.overdue - a.overdue || b.activeCases - a.activeCases || a.name.localeCompare(b.name, "pt-BR")),
    funnel: stages.map((stage) => { const stageCases = mapped.filter((item) => item.funnelStage === stage); return { stage, label: funnelLabels[stage], count: stageCases.length, value: stageCases.reduce((sum, item) => sum + item.displayValue, 0), cases: stageCases }; }),
  };
}
