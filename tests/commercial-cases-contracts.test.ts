import assert from "node:assert/strict";
import test from "node:test";
import { assertTransition, CaseOperationError, parseCaseAction } from "../lib/commercial-cases/contracts.ts";

test("accepts only forward operational transitions",()=>{
  assert.doesNotThrow(()=>assertTransition("proposal","draft","sent"));
  assert.doesNotThrow(()=>assertTransition("publication","paused","published"));
  assert.throws(()=>assertTransition("proposal","accepted","draft"),CaseOperationError);
  assert.throws(()=>assertTransition("payment","settled","pending"),CaseOperationError);
  assert.throws(()=>assertTransition("work_order","completed","in_progress"),CaseOperationError);
});

test("normalizes proposal and rejects invalid monetary terms",()=>{
  assert.deepEqual(parseCaseAction({type:"proposal.create",matchId:"match-1",vehiclePrice:100000,tradeInCredit:30000,downPayment:20000,financedAmount:50000,installments:48,installmentAmount:1042,fees:0}),{type:"proposal.create",matchId:"match-1",vehiclePrice:100000,tradeInCredit:30000,downPayment:20000,financedAmount:50000,installments:48,installmentAmount:1042,fees:0,validUntil:""});
  assert.throws(()=>parseCaseAction({type:"payment.create",proposalId:"p",paymentType:"cash",amount:-1}),/monetário/i);
});

test("requires valid dates and known actions",()=>{
  assert.throws(()=>parseCaseAction({type:"delivery.schedule",scheduledAt:"not-a-date"}),/Data inválida/);
  assert.throws(()=>parseCaseAction({type:"case.force_close"}),/Ação operacional inválida/);
});
