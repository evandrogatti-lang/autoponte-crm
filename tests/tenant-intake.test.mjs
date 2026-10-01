import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
function load(file, dependencies) {
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,crypto,console:{error(){}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name];}});
  return exports;
}
test("Buyer intake uses only resolved Tenant despite conflicting client input",async()=>{
  const writes=[];
  const tx={insert:()=>({values:async row=>writes.push(row)})};
  const route=load("app/api/buyer-profiles/route.ts",{
    "../../../db":{getDb:()=>({transaction:fn=>fn(tx)})},
    "../../../db/schema":{buyerProfiles:{}},
    "../../../lib/tenant-runtime":{resolvePublicIntake:async(kind,executor)=>{assert.equal(kind,"buyer_profile");assert.equal(executor,tx);return {tenantId:"resolved",storeId:null};}},
    "../../../lib/catalog":{catalogVehicles:[]},
    "../../../lib/match-engine":{createMatchesForBuyer:async(profile,tenant)=>{assert.equal(tenant,"resolved");return 0;},scoreBuyerVehicle:()=>{throw Error("unexpected scoring");}},
  });
  const response=await route.POST({json:async()=>({name:"Fixture",email:"fixture@example.test",whatsapp:"123",city:"Test",budgetMax:10000,consent:true,tenantId:"attacker",storeId:"attacker-store"})});
  assert.equal(response.status,201);
  assert.equal(writes.length,1);assert.equal(writes[0].tenantId,"resolved");assert.equal(writes[0].storeId,undefined);
});
test("Buyer intake route failure leaves zero records",async()=>{
  let writes=0;
  const route=load("app/api/buyer-profiles/route.ts",{
    "../../../db":{getDb:()=>({transaction:fn=>fn({insert:()=>{writes++;throw Error("unexpected insert");}})})},
    "../../../db/schema":{buyerProfiles:{}},
    "../../../lib/tenant-runtime":{resolvePublicIntake:async()=>{throw Error("missing/inactive route");}},
    "../../../lib/catalog":{catalogVehicles:[]},"../../../lib/match-engine":{},
  });
  const response=await route.POST({json:async()=>({name:"Fixture",email:"fixture@example.test",whatsapp:"123",city:"Test",budgetMax:10000,consent:true})});
  assert.equal(response.status,500);assert.equal(writes,0);
});
test("trade-in fails closed before upload or persistence when routing is unavailable",async()=>{
  const route=load("app/api/trade-in/route.ts",{
    "../../../db":{getDb:()=>{throw Error("unexpected database write");}},"../../../db/schema":{},
    "../../../lib/tenant-runtime":{resolvePublicIntake:async()=>{throw Error("inactive route");}},
    "../../../lib/fipe":{},"../../../lib/match-engine":{},"../../../lib/supabase-server":{},"../../../lib/ade":{},"../../../lib/opportunities":{},
  });
  const response=await route.POST({formData:()=>{throw Error("unexpected input processing");}});
  assert.equal(response.status,500);
});
