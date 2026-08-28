export const workOrderStatuses = ["open", "in_progress", "completed", "cancelled"] as const;
export const publicationStatuses = ["draft", "published", "paused", "ended"] as const;
export const proposalStatuses = ["draft", "sent", "accepted", "rejected", "lost", "expired"] as const;
export const contractStatuses = ["draft", "signed", "cancelled"] as const;
export const paymentStatuses = ["pending", "settled", "failed", "cancelled"] as const;
export const deliveryStatuses = ["scheduled", "delivered", "cancelled"] as const;
export const followUpStatuses = ["scheduled", "completed", "cancelled"] as const;
export const commercialCaseStatuses = ["opened", "active", "closed", "lost"] as const;
export const commercialCaseOutcomes = ["", "active_negotiation", "awaiting_documents", "proposal_rejected", "negotiation_lost", "sold"] as const;
export const acquisitionModes = ["direct_purchase", "trade_in", "consignment", "appraisal_only", "sale"] as const;

export type CommercialCaseStatus = typeof commercialCaseStatuses[number];
export type CommercialCaseOutcome = typeof commercialCaseOutcomes[number];
export type AcquisitionMode = typeof acquisitionModes[number];

export type CaseAction =
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

export class CaseOperationError extends Error { readonly status:number; constructor(message:string,status=400){ super(message);this.status=status; } }
const text=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const cash=(v:unknown)=>{const n=Number(v);if(!Number.isInteger(n)||n<0)throw new CaseOperationError("Valor monetário inválido.");return n;};
const date=(v:unknown,required=false)=>{const s=text(v,40);if(!s&&!required)return "";if(!s||Number.isNaN(new Date(s).valueOf()))throw new CaseOperationError("Data inválida.");return s;};
const oneOf=<T extends readonly string[]>(v:unknown,values:T,label:string)=>{const s=text(v,40);if(!values.includes(s))throw new CaseOperationError(`${label} inválido.`);return s as T[number];};

export function parseCaseAction(raw:Record<string,unknown>):CaseAction {
  const type=text(raw.type,40);
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

export const caseEntityTransitions:Record<string,Record<string,readonly string[]>>={
  work_order:{open:["in_progress","completed","cancelled"],in_progress:["completed","cancelled"],completed:[],cancelled:[]},
  publication:{draft:["published","ended"],published:["paused","ended"],paused:["published","ended"],ended:[]},
  proposal:{draft:["sent","rejected"],sent:["accepted","rejected","lost","expired"],accepted:[],rejected:[],lost:[],expired:[]},
  contract:{draft:["signed","cancelled"],signed:["cancelled"],cancelled:[]},
  payment:{pending:["settled","failed","cancelled"],failed:["pending","cancelled"],settled:[],cancelled:[]},
};
export function assertTransition(kind:keyof typeof caseEntityTransitions,current:string,next:string){if(current===next)return;if(!(caseEntityTransitions[kind][current]??[]).includes(next))throw new CaseOperationError(`Transição ${kind} ${current} → ${next} não permitida.`,409);}
