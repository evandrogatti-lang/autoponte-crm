import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMissionControl,
  type MissionControlCaseInput,
  type MissionControlTaskInput,
} from "../lib/commercial-cases/mission-control.ts";

const now = new Date("2026-09-01T15:00:00.000Z");

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

  const model = buildMissionControl(cases, tasks, now);

  assert.deepEqual(
    model.cases.map((item) => item.id),
    ["urgent", "overdue", "today", "high", "no-next", "recent-lost", "remaining"],
  );
  assert.deepEqual(model.counters, {
    overdue: 1,
    dueToday: 1,
    noNextAction: 1,
    urgentHigh: 2,
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

  const model = buildMissionControl(cases, tasks, now);

  assert.equal(model.cases[0]?.nextAction?.priority, "URGENT");
  assert.equal(model.cases[0]?.attention, "urgent");
  assert.equal(model.counters.overdue, 0);
  assert.equal(model.counters.urgentHigh, 1);
});
