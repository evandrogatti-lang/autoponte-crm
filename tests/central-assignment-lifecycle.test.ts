import assert from "node:assert/strict";
import test from "node:test";
import { activeAssignmentStatuses, canAssignWithoutExplicitReopen, centralQueueLeadStatuses, countActiveAssignmentStatuses, isActiveAssignmentStatus, isCompletedAssignmentStatus, shouldKeepOpportunityInCentralQueue } from "../lib/central-assignment-lifecycle.ts";
import { isSellerEligibleForOpportunity } from "../lib/seller-eligibility.ts";

test("status contacted permanece ativo e completed libera capacidade", () => {
  assert.deepEqual(activeAssignmentStatuses, ["assigned", "accepted", "contacted"]);
  assert.equal(isActiveAssignmentStatus("contacted"), true);
  assert.equal(isActiveAssignmentStatus("completed"), false);
  assert.equal(isCompletedAssignmentStatus("completed"), true);

  const timeline = ["assigned", "accepted", "contacted", "completed"];
  assert.equal(countActiveAssignmentStatuses(timeline.slice(0, 1)), 1);
  assert.equal(countActiveAssignmentStatuses(timeline.slice(0, 2)), 2);
  assert.equal(countActiveAssignmentStatuses(timeline.slice(0, 3)), 3);
  assert.equal(countActiveAssignmentStatuses(timeline.slice(3, 4)), 0);
});

test("oportunidade com assignment ativa permanece elegível para exibição da central", () => {
  const queueStatuses = [...centralQueueLeadStatuses];
  assert.equal(queueStatuses.includes("new"), true);
  assert.equal(queueStatuses.includes("sent_to_store"), false);
  assert.equal(isActiveAssignmentStatus("contacted"), true);
});

test("oportunidade concluída só volta com reabertura explícita", () => {
  assert.equal(canAssignWithoutExplicitReopen("completed"), false);
  assert.equal(canAssignWithoutExplicitReopen("contacted"), true);
  assert.equal(canAssignWithoutExplicitReopen(null), true);
  assert.equal(shouldKeepOpportunityInCentralQueue("completed", false), false);
  assert.equal(shouldKeepOpportunityInCentralQueue("completed", true), true);
});

test("ao concluir atendimento o vendedor volta a ficar elegível para outro lead", () => {
  const seller = {
    availabilityStatus: "available",
    capacity: 1,
    specialties: [],
    activeAssignments: 1,
  };
  const opportunity = { brand: "", model: "" };

  assert.equal(isSellerEligibleForOpportunity(seller, opportunity), false);
  assert.equal(
    isSellerEligibleForOpportunity({ ...seller, activeAssignments: 0 }, opportunity),
    true,
  );
});
