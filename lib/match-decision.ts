export const MATCH_DECISION_SCORING_VERSION = "phase2.1-structure-v1";

export type ConstraintType = "HARD" | "SOFT" | "PREFERENCE";
export type Requirement = {
  key: "maxPriceAbsolute" | "maxPricePreferred" | "bodyType" | "transmission" | "minYear" | "maxMileage" | "brand" | "model" | "useCase";
  constraintType: ConstraintType;
  operator: "<=" | ">=" | "=";
  target: string | number;
  tolerance?: number | null;
  clarificationNeeded?: boolean;
};
export type DecisionIntent = {
  budgetMax: number;
  priceTolerance?: number;
  vehicleTypes: string[];
  preferredModels: string[];
  preferredBrands?: string[];
  minYear: number;
  maxMileage: number;
  transmission: string;
  useCase: string;
  mandatory?: Partial<Record<"bodyType" | "transmission" | "minYear" | "maxMileage", boolean>>;
};
export type DecisionVehicle = {
  label: string; price: number; year: number; mileage: number; type?: string;
  transmission?: string; brand?: string; model?: string; city?: string;
  marketPrice?: number; documentApproved?: boolean; inspectionApproved?: boolean;
  condition?: string; immediateAvailability?: boolean;
};
export type MatchDecision = {
  matchFitScore: number;
  opportunityScore: number;
  hardConstraintPass: boolean;
  hardConstraintFailures: Array<{ key: string; expected: string | number; actual: string | number | undefined; operator: string }>;
  softDeviations: Array<{ key: string; target: string | number; actual: string | number | undefined; deviation: string | number; tolerance: number | null; toleranceExceeded: boolean | null; clarificationNeeded: boolean }>;
  preferencesSatisfied: Array<{ key: string; value: string }>;
  commercialAdvantages: Array<{ signal: string; value?: string | number }>;
  compensationReasons: string[];
  opportunityOverride: boolean;
  requirements: Requirement[];
  rankingPosition?: number;
  evaluationRunId?: string;
  scoringVersion: string;
  evaluatedAt: Date;
};

const norm=(value?:string)=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const same=(a?:string,b?:string)=>norm(a)===norm(b);

export function classifyRequirements(intent: DecisionIntent): Requirement[] {
  const absoluteBudget=Math.round(intent.budgetMax*(1+(intent.priceTolerance||0)));
  const requirements:Requirement[]=[
    {key:"maxPriceAbsolute",constraintType:"HARD",operator:"<=",target:absoluteBudget},
    {key:"maxPricePreferred",constraintType:"SOFT",operator:"<=",target:intent.budgetMax,tolerance:absoluteBudget-intent.budgetMax,clarificationNeeded:false},
  ];
  const type=intent.vehicleTypes[0];
  if(type)requirements.push({key:"bodyType",constraintType:intent.mandatory?.bodyType?"HARD":"SOFT",operator:"=",target:type,clarificationNeeded:!intent.mandatory?.bodyType});
  if(intent.transmission&&norm(intent.transmission)!=="indiferente")requirements.push({key:"transmission",constraintType:intent.mandatory?.transmission?"HARD":"SOFT",operator:"=",target:intent.transmission,clarificationNeeded:!intent.mandatory?.transmission});
  if(intent.minYear)requirements.push({key:"minYear",constraintType:intent.mandatory?.minYear?"HARD":"SOFT",operator:">=",target:intent.minYear,clarificationNeeded:!intent.mandatory?.minYear});
  if(intent.maxMileage)requirements.push({key:"maxMileage",constraintType:intent.mandatory?.maxMileage?"HARD":"SOFT",operator:"<=",target:intent.maxMileage,clarificationNeeded:!intent.mandatory?.maxMileage});
  for(const brand of intent.preferredBrands||[])requirements.push({key:"brand",constraintType:"PREFERENCE",operator:"=",target:brand});
  for(const model of intent.preferredModels)requirements.push({key:"model",constraintType:"PREFERENCE",operator:"=",target:model});
  if(intent.useCase)requirements.push({key:"useCase",constraintType:"PREFERENCE",operator:"=",target:intent.useCase});
  return requirements;
}

function actualFor(vehicle:DecisionVehicle,key:Requirement["key"]){
  if(key==="maxPriceAbsolute"||key==="maxPricePreferred")return vehicle.price;
  if(key==="bodyType")return vehicle.type;
  if(key==="minYear")return vehicle.year;
  if(key==="maxMileage")return vehicle.mileage;
  return vehicle[key as "transmission"|"brand"|"model"];
}
function passes(requirement:Requirement,actual:string|number|undefined){
  if(requirement.operator==="<=")return Number(actual)<=Number(requirement.target);
  if(requirement.operator===">=")return Number(actual)>=Number(requirement.target);
  return same(String(actual||""),String(requirement.target));
}

export function evaluateMatchDecision(intent:DecisionIntent,vehicle:DecisionVehicle,matchFitScore:number,options:{evaluationRunId?:string;evaluatedAt?:Date}={}):MatchDecision{
  const requirements=classifyRequirements(intent),hardConstraintFailures:MatchDecision["hardConstraintFailures"]=[],softDeviations:MatchDecision["softDeviations"]=[],preferencesSatisfied:MatchDecision["preferencesSatisfied"]=[];
  for(const requirement of requirements){
    const actual=actualFor(vehicle,requirement.key),pass=passes(requirement,actual);
    if(requirement.constraintType==="HARD"&&!pass)hardConstraintFailures.push({key:requirement.key,expected:requirement.target,actual,operator:requirement.operator});
    if(requirement.constraintType==="SOFT"&&!pass){const numeric=typeof actual==="number"&&typeof requirement.target==="number";const deviation=numeric?Math.abs(Number(actual)-Number(requirement.target)):`${actual} != ${requirement.target}`;softDeviations.push({key:requirement.key,target:requirement.target,actual,deviation,tolerance:requirement.tolerance??null,toleranceExceeded:numeric&&requirement.tolerance!=null?Number(deviation)>requirement.tolerance:null,clarificationNeeded:Boolean(requirement.clarificationNeeded)});}
    if(requirement.constraintType==="PREFERENCE"&&pass)preferencesSatisfied.push({key:requirement.key,value:String(requirement.target)});
  }
  const commercialAdvantages:MatchDecision["commercialAdvantages"]=[];
  if(vehicle.marketPrice&&vehicle.price<vehicle.marketPrice)commercialAdvantages.push({signal:"below_market_price",value:Math.round((vehicle.marketPrice-vehicle.price)/vehicle.marketPrice*100)});
  if(vehicle.price<=intent.budgetMax)commercialAdvantages.push({signal:"within_preferred_budget"});
  else if(vehicle.price<=intent.budgetMax*(1+(intent.priceTolerance||0)))commercialAdvantages.push({signal:"within_absolute_budget"});
  if(vehicle.documentApproved)commercialAdvantages.push({signal:"documents_approved"});
  if(vehicle.inspectionApproved)commercialAdvantages.push({signal:"inspection_approved"});
  if(norm(vehicle.condition)==="good")commercialAdvantages.push({signal:"good_condition"});
  if(vehicle.immediateAvailability)commercialAdvantages.push({signal:"immediate_availability"});
  const opportunityScore=Math.min(100,commercialAdvantages.reduce((sum,item)=>sum+(item.signal==="below_market_price"?25:item.signal==="within_preferred_budget"?25:item.signal==="within_absolute_budget"?20:10),0));
  const hardConstraintPass=hardConstraintFailures.length===0,opportunityOverride=hardConstraintPass&&softDeviations.length>0&&opportunityScore>=75;
  return {matchFitScore,opportunityScore,hardConstraintPass,hardConstraintFailures,softDeviations,preferencesSatisfied,commercialAdvantages,compensationReasons:opportunityOverride?commercialAdvantages.map(x=>x.signal):[],opportunityOverride,requirements,evaluationRunId:options.evaluationRunId,scoringVersion:MATCH_DECISION_SCORING_VERSION,evaluatedAt:options.evaluatedAt||new Date()};
}

export function rankMatchDecisions<T extends {decision:MatchDecision}>(candidates:T[],evaluationRunId:string=crypto.randomUUID()):T[]{
  return [...candidates].sort((a,b)=>Number(b.decision.hardConstraintPass)-Number(a.decision.hardConstraintPass)||b.decision.matchFitScore-a.decision.matchFitScore||b.decision.opportunityScore-a.decision.opportunityScore||b.decision.preferencesSatisfied.length-a.decision.preferencesSatisfied.length).map((candidate,index)=>({...candidate,decision:{...candidate.decision,rankingPosition:index+1,evaluationRunId}}));
}
