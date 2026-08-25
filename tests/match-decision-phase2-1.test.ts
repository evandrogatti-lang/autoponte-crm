import assert from "node:assert/strict";
import test from "node:test";
import { classifyRequirements, evaluateMatchDecision, rankMatchDecisions } from "../lib/match-decision.ts";

const baseIntent={budgetMax:150000,priceTolerance:.05,vehicleTypes:["SUV"],preferredModels:["Creta"],preferredBrands:["Hyundai"],minYear:2021,maxMileage:50000,transmission:"Automático",useCase:"family"};
const vehicle=(overrides={})=>({label:"Hyundai Creta",price:145000,year:2022,mileage:45000,type:"SUV",transmission:"Automático",brand:"Hyundai",model:"Creta",...overrides});

test("HARD-ineligible candidate never outranks an eligible candidate",()=>{
  const intent={...baseIntent,mandatory:{bodyType:true}};
  const eligible=evaluateMatchDecision(intent,vehicle(),58);
  const ineligible=evaluateMatchDecision(intent,vehicle({label:"VW Polo",type:"Hatch",brand:"Volkswagen",model:"Polo",price:90000}),90);
  const ranked=rankMatchDecisions([{id:"eligible",decision:eligible},{id:"ineligible",decision:ineligible}],"run-hard");
  assert.equal(ranked[0].id,"eligible"); assert.equal(ranked[1].decision.hardConstraintPass,false);
});

test("SOFT deviation remains eligible and records clarification",()=>{
  const decision=evaluateMatchDecision(baseIntent,vehicle({mileage:58000}),78);
  assert.equal(decision.hardConstraintPass,true);
  assert.equal(decision.softDeviations.some(x=>x.key==="maxMileage"&&x.clarificationNeeded),true);
});

test("Opportunity Override is separate and explainable",()=>{
  const decision=evaluateMatchDecision(baseIntent,vehicle({mileage:58000,price:125000,marketPrice:145000,documentApproved:true,inspectionApproved:true,condition:"good",immediateAvailability:true}),78);
  assert.equal(decision.opportunityOverride,true);
  assert.equal(decision.matchFitScore,78);
  assert.ok(decision.opportunityScore>=75);
  assert.ok(decision.compensationReasons.includes("below_market_price"));
  assert.ok(decision.softDeviations.some(x=>x.key==="maxMileage"&&x.actual===58000));
});

test("preferred brand and model are PREFERENCE, never automatic HARD",()=>{
  const requirements=classifyRequirements(baseIntent);
  assert.equal(requirements.find(x=>x.key==="brand")?.constraintType,"PREFERENCE");
  assert.equal(requirements.find(x=>x.key==="model")?.constraintType,"PREFERENCE");
});

test("ambiguous limits produce clarification state",()=>{
  const requirements=classifyRequirements(baseIntent);
  assert.equal(requirements.find(x=>x.key==="maxMileage")?.clarificationNeeded,true);
  assert.equal(requirements.find(x=>x.key==="transmission")?.clarificationNeeded,true);
});

test("P2-10/P2-30 Pickup shape keeps eligible Pickup above higher-fit Hatch",()=>{
  const intent={...baseIntent,budgetMax:182127,priceTolerance:.03,vehicleTypes:["Pickup"],preferredModels:["Ranger Limited"],preferredBrands:["Ford"],minYear:2019,maxMileage:119000,useCase:"work",mandatory:{bodyType:true}};
  const ranger=evaluateMatchDecision(intent,vehicle({label:"Ford Ranger Limited",brand:"Ford",model:"Ranger Limited",type:"Pickup",price:184900,year:2021,mileage:89000}),58);
  const polo=evaluateMatchDecision(intent,vehicle({label:"VW Polo",brand:"Volkswagen",model:"Polo",type:"Hatch",price:98900,year:2023,mileage:26000}),72);
  const ranked=rankMatchDecisions([{id:"ranger",decision:ranger},{id:"polo",decision:polo}],"run-pickup");
  assert.equal(ranked[0].id,"ranger"); assert.deepEqual(ranked[1].decision.hardConstraintFailures.map(x=>x.key),["bodyType"]);
});

test("<=50k km SOFT preference can surface justified 55-60k km opportunity",()=>{
  const decision=evaluateMatchDecision(baseIntent,vehicle({mileage:57000,price:120000,marketPrice:145000,documentApproved:true,inspectionApproved:true,condition:"good",immediateAvailability:true}),76);
  assert.equal(decision.hardConstraintPass,true);
  assert.equal(decision.opportunityOverride,true);
  assert.equal(decision.softDeviations.find(x=>x.key==="maxMileage")?.deviation,7000);
});
