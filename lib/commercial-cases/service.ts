import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { crmUsers, sellerProfiles, tradeIns, vehicleMatches } from "../../db/schema.ts";
import { vehicles } from "../../db/vehicle-schema.ts";
import {
  caseTasks, commercialCases, commercialContracts, customerIntents, customers, matchInteractions,
  paymentRecords, postSaleFollowups, proposals, vehicleCostEntries, vehicleDeliveries,
  vehicleLifecycleEvents, vehicleMedia, vehiclePriceHistory, vehiclePublications, vehicleWorkOrders,
} from "../../db/pilot-schema.ts";
import { assertTransition, canOperateCaseTasks, CaseOperationError, deriveNextAction, type CaseCommand, type CaseTaskCommand, type CreateCaseTaskCommand } from "./contracts.ts";

export type CaseActor={name:string;email:string};
function isCaseTaskCommand(action:CaseCommand):action is CaseTaskCommand{return action.type==="task.create"||action.type==="task.complete"||action.type==="task.cancel";}
const eventTitle:Record<string,string>={
  "work_order.create":"Ordem de serviço aberta","work_order.transition":"Ordem de serviço atualizada",
  "publication.create":"Publicação criada","publication.transition":"Publicação atualizada",
  "proposal.create":"Proposta criada","proposal.transition":"Proposta atualizada",
  "contract.create":"Contrato criado","contract.transition":"Contrato atualizado",
  "payment.create":"Pagamento registrado","payment.transition":"Pagamento atualizado",
  "delivery.schedule":"Entrega agendada","delivery.complete":"Veículo entregue",
  "post_sale.schedule":"Pós-venda agendado","post_sale.complete":"Pós-venda concluído",
  "task.create":"Ação do caso criada","task.complete":"Ação do caso concluída","task.cancel":"Ação do caso cancelada",
};

export async function listCommercialCases(){
  return getDb().select({id:commercialCases.id,pilotCode:commercialCases.pilotCode,status:commercialCases.status,finalOutcome:commercialCases.finalOutcome,acquisitionMode:commercialCases.acquisitionMode,openedAt:commercialCases.openedAt,updatedAt:commercialCases.updatedAt,vehicleId:vehicles.id,vehicleBrand:vehicles.brand,vehicleModel:vehicles.model,modelYear:vehicles.modelYear,documentStatus:vehicles.documentStatus,askingPrice:vehicles.askingPrice,customerName:customers.name})
    .from(commercialCases).leftJoin(vehicles,eq(commercialCases.vehicleId,vehicles.id)).leftJoin(customers,eq(commercialCases.customerId,customers.id)).orderBy(desc(commercialCases.updatedAt)).limit(200);
}

export async function getCommercialCase(caseId:string){
  const db=getDb();
  const [base]=await db.select({case:commercialCases,vehicle:vehicles,customer:customers,opportunity:tradeIns,sellerName:crmUsers.name,sellerUserId:crmUsers.id})
    .from(commercialCases).leftJoin(vehicles,eq(commercialCases.vehicleId,vehicles.id)).leftJoin(customers,eq(commercialCases.customerId,customers.id)).leftJoin(tradeIns,eq(commercialCases.opportunityId,tradeIns.id)).leftJoin(sellerProfiles,eq(commercialCases.sellerProfileId,sellerProfiles.id)).leftJoin(crmUsers,eq(sellerProfiles.crmUserId,crmUsers.id)).where(or(eq(commercialCases.id,caseId),eq(commercialCases.pilotCode,caseId))).limit(1);
  if(!base)throw new CaseOperationError("Caso comercial não encontrado.",404);
  const resolvedCaseId=base.case.id;
  const [timeline,tasks,costs,workOrders,media,publications,prices,intents,matches,interactions,proposalRows,contracts,payments,deliveries,followups,tradeInVehicles]=await Promise.all([
    db.select().from(vehicleLifecycleEvents).where(eq(vehicleLifecycleEvents.caseId,resolvedCaseId)).orderBy(desc(vehicleLifecycleEvents.occurredAt)),
    db.select().from(caseTasks).where(eq(caseTasks.caseId,resolvedCaseId)).orderBy(desc(caseTasks.createdAt)),
    db.select().from(vehicleCostEntries).where(eq(vehicleCostEntries.caseId,resolvedCaseId)).orderBy(desc(vehicleCostEntries.incurredAt)),
    db.select().from(vehicleWorkOrders).where(eq(vehicleWorkOrders.caseId,resolvedCaseId)).orderBy(desc(vehicleWorkOrders.openedAt)),
    db.select().from(vehicleMedia).where(eq(vehicleMedia.caseId,resolvedCaseId)).orderBy(asc(vehicleMedia.position)),
    db.select().from(vehiclePublications).where(eq(vehiclePublications.caseId,resolvedCaseId)).orderBy(desc(vehiclePublications.createdAt)),
    db.select().from(vehiclePriceHistory).where(eq(vehiclePriceHistory.caseId,resolvedCaseId)).orderBy(desc(vehiclePriceHistory.changedAt)),
    db.select().from(customerIntents).where(eq(customerIntents.caseId,resolvedCaseId)).orderBy(desc(customerIntents.capturedAt)),
    db.select().from(vehicleMatches).where(eq(vehicleMatches.caseId,resolvedCaseId)).orderBy(desc(vehicleMatches.score)),
    db.select().from(matchInteractions).where(eq(matchInteractions.caseId,resolvedCaseId)).orderBy(desc(matchInteractions.occurredAt)),
    db.select().from(proposals).where(eq(proposals.caseId,resolvedCaseId)).orderBy(desc(proposals.sequence)),
    db.select().from(commercialContracts).where(eq(commercialContracts.caseId,resolvedCaseId)).orderBy(desc(commercialContracts.createdAt)),
    db.select().from(paymentRecords).where(eq(paymentRecords.caseId,resolvedCaseId)).orderBy(desc(paymentRecords.createdAt)),
    db.select().from(vehicleDeliveries).where(eq(vehicleDeliveries.caseId,resolvedCaseId)),
    db.select().from(postSaleFollowups).where(eq(postSaleFollowups.caseId,resolvedCaseId)).orderBy(desc(postSaleFollowups.dueAt)),
    base.opportunity?.id
      ? db.select({ vehicle: vehicles }).from(vehicleMatches).innerJoin(vehicles,eq(vehicleMatches.vehicleId,vehicles.id)).where(and(eq(vehicleMatches.sourceType,"trade_in"),eq(vehicleMatches.sourceId,base.opportunity.id))).limit(1)
      : Promise.resolve([]),
  ]);
  const totalCosts=costs.filter(x=>x.status==="approved").reduce((n,x)=>n+x.amount,0);
  const settledPayments=payments.filter(x=>x.status==="settled").reduce((n,x)=>n+x.amount,0);
  return {...base,tradeInVehicle:tradeInVehicles[0]?.vehicle??null,timeline,tasks,nextAction:deriveNextAction(tasks)??null,costs,workOrders,media,publications,prices,intents,matches:matches.map(match=>({...match,reasons:safeJson(match.reasons,[]),interactions:interactions.filter(i=>i.matchId===match.id)})),proposals:proposalRows,contracts,payments,deliveries,followups,summary:{totalCosts,approvedPhotos:media.filter(x=>x.mediaType==="photo"&&x.status==="approved").length,settledPayments}};
}

function safeJson(value:string,fallback:unknown){try{return JSON.parse(value)}catch{return fallback}}
type SelectExecutor=Pick<ReturnType<typeof getDb>,"select">;
async function currentCase(tx:SelectExecutor,caseId:string){const [row]=await tx.select({case:commercialCases,vehicle:vehicles,customer:customers}).from(commercialCases).leftJoin(vehicles,eq(commercialCases.vehicleId,vehicles.id)).leftJoin(customers,eq(commercialCases.customerId,customers.id)).where(eq(commercialCases.id,caseId)).limit(1);if(!row||!row.vehicle||!row.customer)throw new CaseOperationError("Caso sem veículo ou cliente operacional.",409);return {case:row.case,vehicle:row.vehicle,customer:row.customer};}

export async function operateCommercialCase(caseId:string,action:CaseCommand,actor:CaseActor){
  const db=getDb(),now=new Date();
  return db.transaction(async tx=>{
    if(isCaseTaskCommand(action))return operateCaseTask(tx,caseId,action,actor,now);
    const base=await currentCase(tx,caseId); let entityId="",description="";
    if(action.type==="work_order.create"){
      entityId=crypto.randomUUID(); await tx.insert(vehicleWorkOrders).values({id:entityId,caseId,vehicleId:base.vehicle.id,workType:action.workType,description:action.description,status:"open",estimatedCost:action.estimatedCost,openedAt:now}); description=action.description||action.workType;
    } else if(action.type==="work_order.transition"){
      const [row]=await tx.select().from(vehicleWorkOrders).where(and(eq(vehicleWorkOrders.id,action.id),eq(vehicleWorkOrders.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Ordem de serviço não encontrada.",404);assertTransition("work_order",row.status,action.status);entityId=row.id;await tx.update(vehicleWorkOrders).set({status:action.status,actualCost:action.actualCost??row.actualCost,completedAt:action.status==="completed"?now:null}).where(eq(vehicleWorkOrders.id,row.id));description=`${row.status} → ${action.status}`;
      if(action.status==="completed"&&(action.actualCost??row.actualCost)>0){await tx.insert(vehicleCostEntries).values({id:crypto.randomUUID(),caseId,vehicleId:base.vehicle.id,category:row.workType,description:row.description,amount:action.actualCost??row.actualCost,incurredAt:now.toISOString().slice(0,10),partnerId:base.case.partnerId,status:"approved"});}
    } else if(action.type==="publication.create"){
      entityId=crypto.randomUUID();await tx.insert(vehiclePublications).values({id:entityId,caseId,vehicleId:base.vehicle.id,channel:action.channel,status:"draft",askingPrice:action.askingPrice,externalReference:action.externalReference??""});description=action.channel;
    } else if(action.type==="publication.transition"){
      const [row]=await tx.select().from(vehiclePublications).where(and(eq(vehiclePublications.id,action.id),eq(vehiclePublications.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Publicação não encontrada.",404);assertTransition("publication",row.status,action.status);
      if(action.status==="published"){if(base.vehicle.documentStatus!=="approved")throw new CaseOperationError("Documentação precisa estar aprovada antes da publicação.",409);const [photos]=await tx.select({count:sql<number>`count(*)::int`}).from(vehicleMedia).where(and(eq(vehicleMedia.caseId,caseId),eq(vehicleMedia.mediaType,"photo"),eq(vehicleMedia.status,"approved")));if((photos?.count??0)<4)throw new CaseOperationError("A publicação exige ao menos 4 fotos aprovadas.",409);const [openWork]=await tx.select({count:sql<number>`count(*)::int`}).from(vehicleWorkOrders).where(and(eq(vehicleWorkOrders.caseId,caseId),sql`${vehicleWorkOrders.status} in ('open','in_progress')`));if((openWork?.count??0)>0)throw new CaseOperationError("Conclua ou cancele as ordens de serviço abertas.",409);}
      entityId=row.id;await tx.update(vehiclePublications).set({status:action.status,publishedAt:action.status==="published"?(row.publishedAt??now):row.publishedAt,endedAt:action.status==="ended"?now:null}).where(eq(vehiclePublications.id,row.id));description=`${row.status} → ${action.status}`;
    } else if(action.type==="proposal.create"){
      const [match]=await tx.select().from(vehicleMatches).where(and(eq(vehicleMatches.id,action.matchId),eq(vehicleMatches.caseId,caseId),eq(vehicleMatches.vehicleId,base.vehicle.id))).limit(1);if(!match)throw new CaseOperationError("A proposta exige um candidato Match deste caso e veículo.",409);if(action.downPayment+action.tradeInCredit+action.financedAmount!==action.vehiclePrice+action.fees)throw new CaseOperationError("Entrada + troca + financiamento deve reconciliar com veículo + taxas.",409);const [seq]=await tx.select({value:sql<number>`coalesce(max(${proposals.sequence}),0)::int+1`}).from(proposals).where(eq(proposals.caseId,caseId));entityId=crypto.randomUUID();await tx.insert(proposals).values({id:entityId,caseId,opportunityId:base.case.opportunityId,matchId:match.id,vehicleId:base.vehicle.id,customerId:base.customer.id,sequence:seq?.value??1,status:"draft",vehiclePrice:action.vehiclePrice,tradeInCredit:action.tradeInCredit,downPayment:action.downPayment,financedAmount:action.financedAmount,installments:action.installments,installmentAmount:action.installmentAmount,fees:action.fees,totalAmount:action.vehiclePrice+action.fees,validUntil:action.validUntil||null,proposedAt:now});description=`Proposta ${seq?.value??1} vinculada ao Match ${match.score}`;
    } else if(action.type==="proposal.transition"){
      const [row]=await tx.select().from(proposals).where(and(eq(proposals.id,action.id),eq(proposals.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Proposta não encontrada.",404);assertTransition("proposal",row.status,action.status);if(["rejected","lost"].includes(action.status)&&!action.reason)throw new CaseOperationError("Informe o motivo da rejeição/perda.");entityId=row.id;await tx.update(proposals).set({status:action.status,rejectionReason:action.reason??"",decidedAt:["accepted","rejected","lost"].includes(action.status)?now:null}).where(eq(proposals.id,row.id));if(row.matchId)await tx.update(vehicleMatches).set({status:action.status==="accepted"?"proposal_accepted":action.status,outcome:action.status}).where(eq(vehicleMatches.id,row.matchId));description=`${row.status} → ${action.status}`;
    } else if(action.type==="contract.create"){
      const [proposal]=await tx.select().from(proposals).where(and(eq(proposals.id,action.proposalId),eq(proposals.caseId,caseId))).limit(1);if(!proposal||proposal.status!=="accepted")throw new CaseOperationError("Contrato exige proposta aceita.",409);entityId=crypto.randomUUID();await tx.insert(commercialContracts).values({id:entityId,caseId,proposalId:proposal.id,contractType:action.contractType,status:"draft",contractNumber:action.contractNumber??""});description=action.contractNumber||action.contractType;
    } else if(action.type==="contract.transition"){
      const [row]=await tx.select().from(commercialContracts).where(and(eq(commercialContracts.id,action.id),eq(commercialContracts.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Contrato não encontrado.",404);assertTransition("contract",row.status,action.status);entityId=row.id;await tx.update(commercialContracts).set({status:action.status,signedAt:action.status==="signed"?now:null}).where(eq(commercialContracts.id,row.id));description=`${row.status} → ${action.status}`;
    } else if(action.type==="payment.create"){
      const [proposal]=await tx.select().from(proposals).where(and(eq(proposals.id,action.proposalId),eq(proposals.caseId,caseId),eq(proposals.status,"accepted"))).limit(1);if(!proposal)throw new CaseOperationError("Pagamento exige proposta aceita.",409);entityId=crypto.randomUUID();await tx.insert(paymentRecords).values({id:entityId,caseId,proposalId:proposal.id,paymentType:action.paymentType,provider:action.provider??"",amount:action.amount,status:"pending",dueAt:action.dueAt?new Date(action.dueAt):null});description=`${action.paymentType}: ${action.amount}`;
    } else if(action.type==="payment.transition"){
      const [row]=await tx.select().from(paymentRecords).where(and(eq(paymentRecords.id,action.id),eq(paymentRecords.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Pagamento não encontrado.",404);assertTransition("payment",row.status,action.status);if(action.status==="settled"){const [contract]=await tx.select().from(commercialContracts).where(and(eq(commercialContracts.caseId,caseId),eq(commercialContracts.proposalId,row.proposalId),eq(commercialContracts.status,"signed"))).limit(1);if(!contract)throw new CaseOperationError("Liquidação exige contrato assinado.",409);}entityId=row.id;await tx.update(paymentRecords).set({status:action.status,paidAt:action.status==="settled"?now:null}).where(eq(paymentRecords.id,row.id));description=`${row.status} → ${action.status}`;
    } else if(action.type==="delivery.schedule"){
      const [proposal]=await tx.select().from(proposals).where(and(eq(proposals.caseId,caseId),eq(proposals.status,"accepted"))).limit(1);if(!proposal)throw new CaseOperationError("Entrega exige proposta aceita.",409);const [contract]=await tx.select().from(commercialContracts).where(and(eq(commercialContracts.caseId,caseId),eq(commercialContracts.proposalId,proposal.id),eq(commercialContracts.status,"signed"))).limit(1);if(!contract)throw new CaseOperationError("Entrega exige contrato assinado.",409);const [existing]=await tx.select().from(vehicleDeliveries).where(eq(vehicleDeliveries.caseId,caseId)).limit(1);entityId=existing?.id??crypto.randomUUID();if(existing)await tx.update(vehicleDeliveries).set({status:"scheduled",scheduledAt:new Date(action.scheduledAt),notes:action.notes??existing.notes}).where(eq(vehicleDeliveries.id,existing.id));else await tx.insert(vehicleDeliveries).values({id:entityId,caseId,vehicleId:base.vehicle.id,customerId:base.customer.id,status:"scheduled",scheduledAt:new Date(action.scheduledAt),notes:action.notes??""});description=new Date(action.scheduledAt).toISOString();
    } else if(action.type==="delivery.complete"){
      const [delivery]=await tx.select().from(vehicleDeliveries).where(and(eq(vehicleDeliveries.caseId,caseId),eq(vehicleDeliveries.status,"scheduled"))).limit(1);if(!delivery)throw new CaseOperationError("Agende a entrega antes de concluí-la.",409);if(!["documents","keys","inspection"].every(k=>action.checklist[k]===true))throw new CaseOperationError("Checklist de entrega incompleto.",409);const [proposal]=await tx.select().from(proposals).where(and(eq(proposals.caseId,caseId),eq(proposals.status,"accepted"))).limit(1);if(!proposal)throw new CaseOperationError("Proposta aceita não encontrada.",409);const [paid]=await tx.select({total:sql<number>`coalesce(sum(${paymentRecords.amount}),0)::int`}).from(paymentRecords).where(and(eq(paymentRecords.caseId,caseId),eq(paymentRecords.proposalId,proposal.id),eq(paymentRecords.status,"settled")));if((paid?.total??0)<proposal.totalAmount)throw new CaseOperationError("Valor liquidado insuficiente para concluir a entrega.",409);entityId=delivery.id;await tx.update(vehicleDeliveries).set({status:"delivered",deliveredAt:now,checklist:action.checklist,notes:action.notes??delivery.notes}).where(eq(vehicleDeliveries.id,delivery.id));await tx.update(commercialCases).set({status:"closed",finalOutcome:"sold",closedAt:now,updatedAt:now}).where(eq(commercialCases.id,caseId));await tx.update(vehicles).set({status:"sold",updatedAt:now}).where(eq(vehicles.id,base.vehicle.id));if(proposal.matchId)await tx.update(vehicleMatches).set({status:"converted",outcome:"sold"}).where(eq(vehicleMatches.id,proposal.matchId));description="Checklist concluído e pagamento reconciliado";
    } else if(action.type==="post_sale.schedule"){
      const [delivery]=await tx.select().from(vehicleDeliveries).where(and(eq(vehicleDeliveries.caseId,caseId),eq(vehicleDeliveries.status,"delivered"))).limit(1);if(!delivery)throw new CaseOperationError("Pós-venda exige entrega concluída.",409);entityId=crypto.randomUUID();await tx.insert(postSaleFollowups).values({id:entityId,caseId,customerId:base.customer.id,status:"scheduled",dueAt:new Date(action.dueAt),notes:action.notes??""});description=new Date(action.dueAt).toISOString();
    } else {
      const [row]=await tx.select().from(postSaleFollowups).where(and(eq(postSaleFollowups.id,action.id),eq(postSaleFollowups.caseId,caseId))).limit(1);if(!row)throw new CaseOperationError("Follow-up não encontrado.",404);if(row.status!=="scheduled")throw new CaseOperationError("Somente follow-up agendado pode ser concluído.",409);if(!action.outcome)throw new CaseOperationError("Informe o resultado do pós-venda.");entityId=row.id;await tx.update(postSaleFollowups).set({status:"completed",completedAt:now,outcome:action.outcome,notes:action.notes??row.notes}).where(eq(postSaleFollowups.id,row.id));description=action.outcome;
    }
    await tx.insert(vehicleLifecycleEvents).values({id:crypto.randomUUID(),caseId,vehicleId:base.vehicle.id,eventType:action.type,status:"completed",occurredAt:now,description,metadata:{entityId,actor}});
    await tx.update(commercialCases).set({updatedAt:now}).where(eq(commercialCases.id,caseId));
    return {ok:true,entityId,title:eventTitle[action.type]};
  });
}

type CaseTx=Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
async function insertCaseTask(tx:CaseTx,caseId:string,command:CreateCaseTaskCommand,now:Date){
  const [owner]=await tx.select({id:crmUsers.id}).from(crmUsers).where(and(eq(crmUsers.id,command.ownerId),eq(crmUsers.status,"active"))).limit(1);
  if(!owner)throw new CaseOperationError("Responsável ativo não encontrado.",409);
  const id=crypto.randomUUID();
  await tx.insert(caseTasks).values({id,caseId,actionType:command.actionType,ownerId:owner.id,dueAt:new Date(command.dueAt),priority:command.priority,status:"OPEN",context:command.context,createdAt:now});
  return id;
}

async function writeTaskTimeline(tx:CaseTx,caseId:string,vehicleId:string|null,type:string,taskId:string,description:string,actor:CaseActor,now:Date,metadata:Record<string,unknown>={}){
  await tx.insert(vehicleLifecycleEvents).values({id:crypto.randomUUID(),caseId,vehicleId,eventType:type,status:"completed",occurredAt:now,description,metadata:{taskId,actor,...metadata}});
}

async function operateCaseTask(tx:CaseTx,caseId:string,action:CaseTaskCommand,actor:CaseActor,now:Date){
  const [base]=await tx.select({id:commercialCases.id,status:commercialCases.status,vehicleId:commercialCases.vehicleId}).from(commercialCases).where(eq(commercialCases.id,caseId)).limit(1);
  if(!base)throw new CaseOperationError("Caso comercial não encontrado.",404);
  if(!canOperateCaseTasks(base.status))throw new CaseOperationError("Ações só podem ser alteradas em um caso ativo.",409);
  if(action.type==="task.create"){
    const entityId=await insertCaseTask(tx,caseId,action,now);
    await tx.update(commercialCases).set({noNextActionReason:null,updatedAt:now}).where(eq(commercialCases.id,caseId));
    await writeTaskTimeline(tx,caseId,base.vehicleId,"task.create",entityId,action.context||action.actionType,actor,now,{actionType:action.actionType,priority:action.priority,dueAt:action.dueAt});
    return {ok:true,entityId,title:eventTitle[action.type]};
  }
  const [task]=await tx.select().from(caseTasks).where(and(eq(caseTasks.id,action.id),eq(caseTasks.caseId,caseId))).limit(1);
  if(!task)throw new CaseOperationError("Ação do caso não encontrada.",404);
  if(task.status!=="OPEN")throw new CaseOperationError("Somente uma ação aberta pode ser concluída ou cancelada.",409);
  if(action.type==="task.complete"){
    if(!action.result)throw new CaseOperationError("Informe o resultado da ação.");
    if(task.actionType==="MARK_CASE_LOST"){
      if(!action.lossReason)throw new CaseOperationError("Informe o motivo da perda.");
      const cancelled=await tx.select({id:caseTasks.id,actionType:caseTasks.actionType}).from(caseTasks).where(and(eq(caseTasks.caseId,caseId),eq(caseTasks.status,"OPEN"),ne(caseTasks.id,task.id)));
      await tx.update(caseTasks).set({status:"DONE",result:action.result,completedAt:now}).where(eq(caseTasks.id,task.id));
      await tx.update(caseTasks).set({status:"CANCELLED",result:"Caso encerrado como perdido",completedAt:now}).where(and(eq(caseTasks.caseId,caseId),eq(caseTasks.status,"OPEN"),ne(caseTasks.id,task.id)));
      await tx.update(commercialCases).set({status:"lost",finalOutcome:"negotiation_lost",closedAt:now,noNextActionReason:null,notes:action.note||undefined,updatedAt:now}).where(eq(commercialCases.id,caseId));
      await writeTaskTimeline(tx,caseId,base.vehicleId,"task.complete",task.id,action.result,actor,now,{actionType:task.actionType,lossReason:action.lossReason,note:action.note});
      for(const item of cancelled)await writeTaskTimeline(tx,caseId,base.vehicleId,"task.cancel",item.id,"Caso encerrado como perdido",actor,now,{actionType:item.actionType});
      return {ok:true,entityId:task.id,title:"Caso marcado como perdido"};
    }
    await tx.update(caseTasks).set({status:"DONE",result:action.result,completedAt:now}).where(eq(caseTasks.id,task.id));
    let nextId:string|undefined;
    if(action.nextTask)nextId=await insertCaseTask(tx,caseId,action.nextTask,now);
    const [remaining]=await tx.select({id:caseTasks.id}).from(caseTasks).where(and(eq(caseTasks.caseId,caseId),eq(caseTasks.status,"OPEN"))).limit(1);
    if(!remaining&&!action.noNextActionReason)throw new CaseOperationError("Defina a próxima ação ou registre o motivo para não haver uma.");
    await tx.update(commercialCases).set({noNextActionReason:remaining?null:action.noNextActionReason,updatedAt:now}).where(eq(commercialCases.id,caseId));
    await writeTaskTimeline(tx,caseId,base.vehicleId,"task.complete",task.id,action.result,actor,now,{actionType:task.actionType,nextTaskId:nextId});
    if(nextId&&action.nextTask)await writeTaskTimeline(tx,caseId,base.vehicleId,"task.create",nextId,action.nextTask.context||action.nextTask.actionType,actor,now,{actionType:action.nextTask.actionType});
    return {ok:true,entityId:task.id,nextTaskId:nextId,title:eventTitle[action.type]};
  }
  if(!action.reason)throw new CaseOperationError("Informe o motivo do cancelamento.");
  await tx.update(caseTasks).set({status:"CANCELLED",result:action.reason,completedAt:now}).where(eq(caseTasks.id,task.id));
  const [remaining]=await tx.select({id:caseTasks.id}).from(caseTasks).where(and(eq(caseTasks.caseId,caseId),eq(caseTasks.status,"OPEN"))).limit(1);
  if(!remaining&&!action.noNextActionReason)throw new CaseOperationError("Defina uma próxima ação antes de cancelar ou registre o motivo para não haver uma.");
  await tx.update(commercialCases).set({noNextActionReason:remaining?null:action.noNextActionReason,updatedAt:now}).where(eq(commercialCases.id,caseId));
  await writeTaskTimeline(tx,caseId,base.vehicleId,"task.cancel",task.id,action.reason,actor,now,{actionType:task.actionType});
  return {ok:true,entityId:task.id,title:eventTitle[action.type]};
}
