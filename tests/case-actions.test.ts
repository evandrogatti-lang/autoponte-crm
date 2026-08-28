import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { caseActionTypes, caseLossReasons, deriveNextAction, parseCaseAction } from "../lib/commercial-cases/contracts.ts";

test("creates a Case task from the canonical action library",()=>{
  assert.deepEqual(caseActionTypes,["CONTACT_CUSTOMER","REQUEST_DOCUMENTS","REVIEW_PROPOSAL","SCHEDULE_FOLLOW_UP","MARK_CASE_LOST"]);
  assert.deepEqual(parseCaseAction({type:"task.create",actionType:"CONTACT_CUSTOMER",ownerId:"user-1",dueAt:"2026-08-29T10:00:00Z",priority:"HIGH",context:"Confirmar interesse"}),{type:"task.create",actionType:"CONTACT_CUSTOMER",ownerId:"user-1",dueAt:"2026-08-29T10:00:00Z",priority:"HIGH",context:"Confirmar interesse"});
  assert.throws(()=>parseCaseAction({type:"task.create",actionType:"VEHICLE_ACTION",ownerId:"user-1",dueAt:"2026-08-29T10:00:00Z"}),/Tipo de ação inválido/);
});

test("derives Next Action by priority, due date, then creation date",()=>{
  const tasks=[
    {id:"done",status:"DONE",priority:"URGENT",dueAt:new Date("2026-08-28"),createdAt:new Date("2026-08-27")},
    {id:"normal",status:"OPEN",priority:"NORMAL",dueAt:new Date("2026-08-28"),createdAt:new Date("2026-08-27")},
    {id:"high-later",status:"OPEN",priority:"HIGH",dueAt:new Date("2026-08-30"),createdAt:new Date("2026-08-27")},
    {id:"high-next",status:"OPEN",priority:"HIGH",dueAt:new Date("2026-08-29"),createdAt:new Date("2026-08-28")},
  ];
  assert.equal(deriveNextAction(tasks)?.id,"high-next");
});

test("completion requires a result and can define the next action atomically",()=>{
  assert.throws(()=>parseCaseAction({type:"task.complete",id:"task-1",result:""}),/resultado/i);
  const command=parseCaseAction({type:"task.complete",id:"task-1",result:"Cliente contatado",nextTask:{actionType:"REQUEST_DOCUMENTS",ownerId:"user-1",dueAt:"2026-08-30T09:00:00Z",priority:"NORMAL",context:"Solicitar comprovantes"}});
  assert.equal(command.type,"task.complete");
  if(command.type==="task.complete")assert.equal(command.nextTask?.actionType,"REQUEST_DOCUMENTS");
});

test("cancellation requires its recorded reason",()=>{
  assert.throws(()=>parseCaseAction({type:"task.cancel",id:"task-1"}),/cancelamento/i);
  assert.equal(parseCaseAction({type:"task.cancel",id:"task-1",reason:"Duplicada",noNextActionReason:"Outra ação já será aberta"}).type,"task.cancel");
});

test("MARK_CASE_LOST exposes only the initial loss reasons",()=>{
  assert.deepEqual(caseLossReasons,["PRICE","FINANCING","VEHICLE_MISMATCH","CUSTOMER_WITHDREW","BOUGHT_FROM_COMPETITOR","NO_RESPONSE","OTHER"]);
  assert.throws(()=>parseCaseAction({type:"task.complete",id:"task-1",result:"Perdido",lossReason:"UNKNOWN"}),/Motivo da perda inválido/);
});

test("Case task writes remain Case-scoped, transactional, authorized, and timeline-backed",()=>{
  const service=readFileSync("lib/commercial-cases/service.ts","utf8");
  const route=readFileSync("app/api/cases/[id]/route.ts","utf8");
  assert.match(service,/eq\(caseTasks\.id,action\.id\),eq\(caseTasks\.caseId,caseId\)/);
  assert.match(service,/transaction\(async tx/);
  assert.match(service,/writeTaskTimeline/);
  assert.match(service,/status:"lost",finalOutcome:"negotiation_lost"/);
  assert.match(service,/eq\(caseTasks\.status,"OPEN"\)[\s\S]*ne\(caseTasks\.id,task\.id\)/);
  assert.match(route,/requirePermission\(actor,"seller_operations\.manage"\)/);
});
