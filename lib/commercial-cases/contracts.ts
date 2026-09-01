export const workOrderStatuses = ["open", "in_progress", "completed", "cancelled"] as const;
export const publicationStatuses = ["draft", "published", "paused", "ended"] as const;
export const proposalStatuses = ["draft", "sent", "accepted", "rejected", "lost", "expired"] as const;
export const contractStatuses = ["draft", "signed", "cancelled"] as const;
export const paymentStatuses = ["pending", "settled", "failed", "cancelled"] as const;
export const deliveryStatuses = ["scheduled", "delivered", "cancelled"] as const;
export const followUpStatuses = ["scheduled", "completed", "cancelled"] as const;

export type CaseOperationCommand =
  | { type:"work_order.create"; workType:string; description:string; estimatedCost:number }
  | { type:"work_order.transition"; id:string; status:typeof workOrderStatuses[number]; actualCost?:number }
  | { type:"publication.create"; channel:string; askingPrice:number; externalReference?:string }
  | { type:"publication.transition"; id:string; status:typeof publicationStatuses[number] }
  | { type:"proposal.create"; matchId:string; vehiclePrice:number; tradeInCredit:number; downPayment:number; financedAmount:number; installments:number; installmentAmount:number; fees:number; validUntil?:string }
  | { type:"proposal.transition"; id:string; status:typeof proposalStatuses[number]; reason?:string }
  | { type:"contract.create"; proposalId:string; contractType:string; contractNumber?:string }
  | { type:"contract.transition"; id:string; status:typeof contractStatuses[number] }
  | { type:"payment.create"; proposalId:string; paymentType:string; provider?:string; amount:number; dueAt?:string }
  | { type:"payment.transition"; id:string; status:typeof paymentStatuses[number] }
  | { type:"delivery.schedule"; scheduledAt:string; notes?:string }
  | { type:"delivery.complete"; checklist:Record<string,boolean>; notes?:string }
  | { type:"post_sale.schedule"; dueAt:string; notes?:string }
  | { type:"post_sale.complete"; id:string; outcome:string; notes?:string };

export const caseActionTypes = ["CONTACT_CUSTOMER","REQUEST_DOCUMENTS","REVIEW_PROPOSAL","SCHEDULE_FOLLOW_UP","MARK_CASE_LOST"] as const;
export const caseTaskPriorities = ["LOW","NORMAL","HIGH","URGENT"] as const;
export const caseTaskStatuses = ["OPEN","DONE","CANCELLED"] as const;
export const caseLossReasons = ["PRICE","FINANCING","VEHICLE_MISMATCH","CUSTOMER_WITHDREW","BOUGHT_FROM_COMPETITOR","NO_RESPONSE","OTHER"] as const;
export const caseTaskMutableCaseStatuses = ["opened","active","appraisal_completed","awaiting_documents","active_negotiation"] as const;
export type CaseActionType=typeof caseActionTypes[number];
export type CaseTaskPriority=typeof caseTaskPriorities[number];
export type CaseLossReason=typeof caseLossReasons[number];
export type CreateCaseTaskCommand={type:"task.create";actionType:CaseActionType;ownerId:string;dueAt:string;priority:CaseTaskPriority;context:string};
export type CompleteCaseTaskCommand={type:"task.complete";id:string;result:string;lossReason?:CaseLossReason;note:string;nextTask?:CreateCaseTaskCommand;noNextActionReason:string};
export type CaseTaskCommand=CreateCaseTaskCommand|CompleteCaseTaskCommand|{type:"task.cancel";id:string;reason:string;noNextActionReason:string};
export type CaseCommand=CaseOperationCommand|CaseTaskCommand;

export class CaseOperationError extends Error { readonly status:number; constructor(message:string,status=400){ super(message);this.status=status; } }
export function canOperateCaseTasks(status:string){return (caseTaskMutableCaseStatuses as readonly string[]).includes(status);}
const text=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const cash=(v:unknown)=>{const n=Number(v);if(!Number.isInteger(n)||n<0)throw new CaseOperationError("Valor monetário inválido.");return n;};
const date=(v:unknown,required=false)=>{const s=text(v,40);if(!s&&!required)return "";if(!s||Number.isNaN(new Date(s).valueOf()))throw new CaseOperationError("Data inválida.");return s;};
const oneOf=<T extends readonly string[]>(v:unknown,values:T,label:string)=>{const s=text(v,40);if(!values.includes(s))throw new CaseOperationError(`${label} inválido.`);return s as T[number];};

export function parseCaseAction(raw:Record<string,unknown>):CaseCommand {
  const type=text(raw.type,40);
  if(type==="task.create"){const ownerId=text(raw.ownerId,80);if(!ownerId)throw new CaseOperationError("Informe o responsável pela ação.");return {type,actionType:oneOf(raw.actionType,caseActionTypes,"Tipo de ação"),ownerId,dueAt:date(raw.dueAt,true),priority:oneOf(raw.priority??"NORMAL",caseTaskPriorities,"Prioridade"),context:text(raw.context,2000)};}
  if(type==="task.complete"){const id=text(raw.id,80),result=text(raw.result,2000);if(!id)throw new CaseOperationError("Ação do caso não informada.");if(!result)throw new CaseOperationError("Informe o resultado da ação.");return {type,id,result,lossReason:raw.lossReason===undefined?undefined:oneOf(raw.lossReason,caseLossReasons,"Motivo da perda"),note:text(raw.note,2000),nextTask:raw.nextTask===undefined?undefined:parseNestedTask(raw.nextTask),noNextActionReason:text(raw.noNextActionReason,1000)};}
  if(type==="task.cancel"){const id=text(raw.id,80),reason=text(raw.reason,2000);if(!id)throw new CaseOperationError("Ação do caso não informada.");if(!reason)throw new CaseOperationError("Informe o motivo do cancelamento.");return {type,id,reason,noNextActionReason:text(raw.noNextActionReason,1000)};}
  if(type==="work_order.create")return {type,workType:text(raw.workType,60)||"preparation",description:text(raw.description,1000),estimatedCost:cash(raw.estimatedCost)};
  if(type==="work_order.transition")return {type,id:text(raw.id,80),status:oneOf(raw.status,workOrderStatuses,"Status da ordem"),actualCost:raw.actualCost===undefined?undefined:cash(raw.actualCost)};
  if(type==="publication.create")return {type,channel:text(raw.channel,60)||"autoponte",askingPrice:cash(raw.askingPrice),externalReference:text(raw.externalReference,180)};
  if(type==="publication.transition")return {type,id:text(raw.id,80),status:oneOf(raw.status,publicationStatuses,"Status da publicação")};
  if(type==="proposal.create")return {type,matchId:text(raw.matchId,80),vehiclePrice:cash(raw.vehiclePrice),tradeInCredit:cash(raw.tradeInCredit??0),downPayment:cash(raw.downPayment??0),financedAmount:cash(raw.financedAmount??0),installments:cash(raw.installments??0),installmentAmount:cash(raw.installmentAmount??0),fees:cash(raw.fees??0),validUntil:date(raw.validUntil)};
  if(type==="proposal.transition")return {type,id:text(raw.id,80),status:oneOf(raw.status,proposalStatuses,"Status da proposta"),reason:text(raw.reason,1000)};
  if(type==="contract.create")return {type,proposalId:text(raw.proposalId,80),contractType:text(raw.contractType,60)||"purchase_and_sale",contractNumber:text(raw.contractNumber,80)};
  if(type==="contract.transition")return {type,id:text(raw.id,80),status:oneOf(raw.status,contractStatuses,"Status do contrato")};
  if(type==="payment.create")return {type,proposalId:text(raw.proposalId,80),paymentType:text(raw.paymentType,60),provider:text(raw.provider,120),amount:cash(raw.amount),dueAt:date(raw.dueAt)};
  if(type==="payment.transition")return {type,id:text(raw.id,80),status:oneOf(raw.status,paymentStatuses,"Status do pagamento")};
  if(type==="delivery.schedule")return {type,scheduledAt:date(raw.scheduledAt,true),notes:text(raw.notes,1000)};
  if(type==="delivery.complete")return {type,checklist:typeof raw.checklist==="object"&&raw.checklist!==null?raw.checklist as Record<string,boolean>:{},notes:text(raw.notes,1000)};
  if(type==="post_sale.schedule")return {type,dueAt:date(raw.dueAt,true),notes:text(raw.notes,1000)};
  if(type==="post_sale.complete")return {type,id:text(raw.id,80),outcome:text(raw.outcome,180),notes:text(raw.notes,1000)};
  throw new CaseOperationError("Ação operacional inválida.");
}

function parseNestedTask(value:unknown):CreateCaseTaskCommand{if(typeof value!=="object"||value===null)throw new CaseOperationError("Próxima ação inválida.");const parsed=parseCaseAction({...value,type:"task.create"});if(parsed.type!=="task.create")throw new CaseOperationError("Próxima ação inválida.");return parsed;}

const priorityWeight:Record<CaseTaskPriority,number>={LOW:0,NORMAL:1,HIGH:2,URGENT:3};
export type NextActionCandidate={status:string;priority:string;dueAt:Date;createdAt:Date};
export function deriveNextAction<T extends NextActionCandidate>(tasks:readonly T[]):T|undefined{return tasks.filter(task=>task.status==="OPEN").sort((a,b)=>(priorityWeight[b.priority as CaseTaskPriority]??-1)-(priorityWeight[a.priority as CaseTaskPriority]??-1)||a.dueAt.valueOf()-b.dueAt.valueOf()||a.createdAt.valueOf()-b.createdAt.valueOf())[0];}

const allowed:Record<string,Record<string,readonly string[]>>={
  work_order:{open:["in_progress","completed","cancelled"],in_progress:["completed","cancelled"],completed:[],cancelled:[]},
  publication:{draft:["published","ended"],published:["paused","ended"],paused:["published","ended"],ended:[]},
  proposal:{draft:["sent","rejected"],sent:["accepted","rejected","lost","expired"],accepted:[],rejected:[],lost:[],expired:[]},
  contract:{draft:["signed","cancelled"],signed:["cancelled"],cancelled:[]},
  payment:{pending:["settled","failed","cancelled"],failed:["pending","cancelled"],settled:[],cancelled:[]},
};
export function assertTransition(kind:keyof typeof allowed,current:string,next:string){if(current===next)return;if(!(allowed[kind][current]??[]).includes(next))throw new CaseOperationError(`Transição ${kind} ${current} → ${next} não permitida.`,409);}
