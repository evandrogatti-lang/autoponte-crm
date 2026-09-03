import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMissionControl,
  type MissionControlCaseInput,
  type MissionControlProposalInput,
  type MissionControlTaskInput,
} from "../lib/commercial-cases/mission-control.ts";

const now = new Date("2026-09-01T15:00:00.000Z");
const manager = { crmUserId: "manager-1", roleCode: "manager", sellerProfileId: null, userName: "Gerente" };

function caseInput(
  id: string,
  overrides: Partial<MissionControlCaseInput> = {},
): MissionControlCaseInput {
  return {
    id,
    pilotCode: `CASE-${id}`,
    status: "active",
    finalOutcome: "",
    customerName: `Cliente ${id}`,
    noNextActionReason: null,
    notes: "",
    closedAt: null,
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
    sellerProfileId: "seller-profile-1",
    sellerName: "Operador",
    opportunityStatus: "qualified",
    leadCategory: "warm",
    vehicleLabel: "Honda Civic",
    vehicleValue: 100_000,
    ...overrides,
  };
}

function taskInput(
  caseId: string,
  priority: MissionControlTaskInput["priority"],
  dueAt: string,
): MissionControlTaskInput {
  return {
    id: `task-${caseId}-${priority}`,
    caseId,
    actionType: "CONTACT_CUSTOMER",
    ownerId: "user-1",
    ownerName: "Operador",
    dueAt: new Date(dueAt),
    priority,
    status: "OPEN",
    context: "Retomar negociação",
    createdAt: new Date("2026-08-30T12:00:00.000Z"),
  };
}

test("Mission Control follows the approved attention precedence and excludes irrelevant cases", () => {
  const cases = [
    caseInput("urgent"),
    caseInput("overdue"),
    caseInput("today"),
    caseInput("high"),
    caseInput("no-next", { noNextActionReason: "Aguardando definição do vendedor" }),
    caseInput("recent-lost", {
      status: "lost",
      finalOutcome: "negotiation_lost",
      notes: "Cliente comprou de concorrente",
      closedAt: new Date("2026-08-27T12:00:00.000Z"),
    }),
    caseInput("remaining"),
    caseInput("old-lost", {
      status: "lost",
      finalOutcome: "negotiation_lost",
      closedAt: new Date("2026-07-01T12:00:00.000Z"),
    }),
    caseInput("closed", { status: "closed", finalOutcome: "sold" }),
  ];
  const tasks = [
    taskInput("urgent", "URGENT", "2026-09-03T15:00:00.000Z"),
    taskInput("overdue", "NORMAL", "2026-08-31T15:00:00.000Z"),
    taskInput("today", "NORMAL", "2026-09-01T18:00:00.000Z"),
    taskInput("high", "HIGH", "2026-09-03T15:00:00.000Z"),
    taskInput("remaining", "NORMAL", "2026-09-04T15:00:00.000Z"),
  ];

  const model = buildMissionControl(cases, tasks, [], [], [], manager, now);

  assert.deepEqual(
    model.cases.map((item) => item.id),
    ["urgent", "overdue", "today", "high", "no-next", "recent-lost", "remaining", "closed", "old-lost"],
  );
  assert.deepEqual(model.counters, {
    overdue: 1,
    dueToday: 1,
    noNextAction: 1,
    urgentHigh: 2,
    openNegotiations: 0,
    pendingProposals: 0,
  });
  assert.equal(
    model.cases.find((item) => item.id === "recent-lost")?.lostReason,
    "Cliente comprou de concorrente",
  );
});

test("Mission Control consumes the canonical Next Action derivation", () => {
  const cases = [caseInput("case-1")];
  const tasks = [
    taskInput("case-1", "LOW", "2026-08-30T15:00:00.000Z"),
    taskInput("case-1", "URGENT", "2026-09-05T15:00:00.000Z"),
  ];

  const model = buildMissionControl(cases, tasks, [], [], [], manager, now);

  assert.equal(model.cases[0]?.nextAction?.priority, "URGENT");
  assert.equal(model.cases[0]?.attention, "urgent");
  assert.equal(model.counters.overdue, 0);
  assert.equal(model.counters.urgentHigh, 1);
});

test("Mission Control restricts sellers to assigned negotiations and gives managers the team view", () => {
  const cases = [
    caseInput("mine", { sellerProfileId: "seller-profile-1" }),
    caseInput("other", { sellerProfileId: "seller-profile-2", sellerName: "Outro vendedor" }),
  ];
  const tasks = [taskInput("mine", "NORMAL", "2026-09-02T15:00:00.000Z"), { ...taskInput("other", "HIGH", "2026-09-02T15:00:00.000Z"), ownerId: "user-2" }];
  const seller = buildMissionControl(cases, tasks, [], [], [], { crmUserId: "user-1", roleCode: "sales", sellerProfileId: "seller-profile-1", userName: "Vendedor" }, now);
  const managerView = buildMissionControl(cases, tasks, [], [], [], manager, now);
  assert.equal(seller.role, "seller");
  assert.deepEqual(seller.cases.map((item) => item.id), ["mine"]);
  assert.equal(managerView.role, "manager");
  assert.equal(managerView.cases.length, 2);
});

test("funnel mapping uses real case and proposal states without inventing a second pipeline", () => {
  const cases = [
    caseInput("lead", { status: "opened", opportunityStatus: "new", leadCategory: "new" }),
    caseInput("potential", { status: "opened", opportunityStatus: "contacted", leadCategory: "warm" }),
    caseInput("opportunity", { status: "active" }),
    caseInput("negotiation", { status: "active_negotiation" }),
    caseInput("proposal", { status: "active_negotiation" }),
    caseInput("closed", { status: "closed", finalOutcome: "sold", closedAt: now }),
  ];
  const proposalRows: MissionControlProposalInput[] = [{ id: "proposal-1", caseId: "proposal", status: "sent", totalAmount: 120_000, proposedAt: now }];
  const model = buildMissionControl(cases, [], proposalRows, [], [], manager, now);
  assert.deepEqual(model.funnel.map((stage) => [stage.stage, stage.count]), [
    ["new_leads", 1], ["potential_clients", 1], ["opportunities", 1],
    ["negotiations", 1], ["proposals", 1], ["closed", 1],
  ]);
  assert.equal(model.funnel.find((stage) => stage.stage === "proposals")?.value, 120_000);
});
