import { deriveNextAction, type CaseTaskPriority } from "./contracts.ts";

export type MissionControlCaseSource={id:string;pilotCode:string;customerName:string|null;status:string;finalOutcome:string;noNextActionReason:string|null;updatedAt:Date;closedAt:Date|null;sellerName:string|null};
export type MissionControlTaskSource={id:string;caseId:string;actionType:string;ownerId:string;ownerName:string|null;dueAt:Date;priority:string;status:string;context:string;createdAt:Date};
export type MissionControlLossSource={caseId:string;lossReason:string|null};
export type MissionControlState="URGENT"|"OVERDUE"|"DUE_TODAY"|"HIGH"|"NO_NEXT_ACTION"|"RECENTLY_LOST"|"ACTIVE";
export type MissionControlCase={id:string;caseLabel:string;customerName:string;status:string;nextAction:string|null;owner:string;dueAt:Date|null;priority:CaseTaskPriority|null;reason:string|null;state:MissionControlState;updatedAt:Date};
export type MissionControlCasesModel={items:MissionControlCase[];counters:{overdue:number;dueToday:number;noNextAction:number;highOrUrgent:number;recentlyLost:number}};

const priorities=new Set<CaseTaskPriority>(["LOW","NORMAL","HIGH","URGENT"]);
const activeStatuses=new Set(["opened","active"]);
const actionLabels:Record<string,string>={CONTACT_CUSTOMER:"Contatar cliente",REQUEST_DOCUMENTS:"Solicitar documentos",REVIEW_PROPOSAL:"Revisar proposta",SCHEDULE_FOLLOW_UP:"Agendar retorno",MARK_CASE_LOST:"Marcar caso como perdido"};
const lossLabels:Record<string,string>={PRICE:"Preço",FINANCING:"Financiamento",VEHICLE_MISMATCH:"Veículo incompatível",CUSTOMER_WITHDREW:"Cliente desistiu",BOUGHT_FROM_COMPETITOR:"Comprou de concorrente",NO_RESPONSE:"Sem resposta",OTHER:"Outro"};
const stateRank:Record<MissionControlState,number>={URGENT:0,OVERDUE:1,DUE_TODAY:2,HIGH:3,NO_NEXT_ACTION:4,RECENTLY_LOST:5,ACTIVE:6};
// Temporary Slice 2 operating window; revisit after real usage establishes a durable policy.
export const RECENTLY_LOST_DAYS=14;

function dayStart(value:Date){const result=new Date(value);result.setHours(0,0,0,0);return result;}
function stateFor(active:boolean,priority:CaseTaskPriority|null,dueAt:Date|null,now:Date):MissionControlState{if(!active)return "RECENTLY_LOST";if(priority==="URGENT")return "URGENT";if(dueAt&&dueAt<dayStart(now))return "OVERDUE";if(dueAt&&dueAt<new Date(dayStart(now).valueOf()+86_400_000))return "DUE_TODAY";if(priority==="HIGH")return "HIGH";if(!dueAt)return "NO_NEXT_ACTION";return "ACTIVE";}

export function buildCasesMissionControl(cases:readonly MissionControlCaseSource[],tasks:readonly MissionControlTaskSource[],losses:readonly MissionControlLossSource[],now=new Date()):MissionControlCasesModel{
  const recentLossThreshold=new Date(now.valueOf()-RECENTLY_LOST_DAYS*86_400_000),tasksByCase=new Map<string,MissionControlTaskSource[]>();
  for(const task of tasks){const group=tasksByCase.get(task.caseId)??[];group.push(task);tasksByCase.set(task.caseId,group);}
  const lossByCase=new Map(losses.map(item=>[item.caseId,item.lossReason])),items:MissionControlCase[]=[];
  for(const source of cases){const active=activeStatuses.has(source.status),recentlyLost=source.status==="lost"&&source.closedAt!==null&&source.closedAt>=recentLossThreshold;if(!active&&!recentlyLost)continue;const next=active?deriveNextAction(tasksByCase.get(source.id)??[]):undefined;const priority=next&&priorities.has(next.priority as CaseTaskPriority)?next.priority as CaseTaskPriority:null;items.push({id:source.id,caseLabel:source.pilotCode||source.id,customerName:source.customerName||"Cliente não identificado",status:source.status,nextAction:next?(actionLabels[next.actionType]??next.actionType):null,owner:next?.ownerName||source.sellerName||"Não atribuído",dueAt:next?.dueAt??null,priority,state:stateFor(active,priority,next?.dueAt??null,now),reason:active?(next?null:source.noNextActionReason||"Motivo não registrado"):(lossLabels[lossByCase.get(source.id)??""]??lossByCase.get(source.id)??"Motivo não registrado"),updatedAt:source.updatedAt});}
  items.sort((a,b)=>stateRank[a.state]-stateRank[b.state]||(a.dueAt?.valueOf()??Number.MAX_SAFE_INTEGER)-(b.dueAt?.valueOf()??Number.MAX_SAFE_INTEGER)||b.updatedAt.valueOf()-a.updatedAt.valueOf());
  return {items,counters:{overdue:items.filter(x=>x.state==="OVERDUE").length,dueToday:items.filter(x=>x.state==="DUE_TODAY").length,noNextAction:items.filter(x=>x.state==="NO_NEXT_ACTION").length,highOrUrgent:items.filter(x=>x.priority==="HIGH"||x.priority==="URGENT").length,recentlyLost:items.filter(x=>x.state==="RECENTLY_LOST").length}};
}
