import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
function compile(file,dependencies={}) {
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];}});
  return exports;
}
const policy=compile("lib/tenant-context.ts");
function runtime({authenticated=true,membershipStatus="active",tenantStatus="active",revokedAt=null,roleStatus="active",roleRevoked=null,routeRows=[]}={}) {
  const tables={memberships:{userId:"auth-user-id"},tenants:{id:"tenant-id"},roleAssignments:{membershipId:"membership-id",status:"role-status"},stores:{id:"store-id"},storeAccess:{}};
  const queries=[];
  const db={select:()=>({from:table=>({innerJoin:()=>({where:condition=>{queries.push(condition);return [{membership:{id:"member",tenantId:"A",status:membershipStatus,revokedAt},tenant:{id:"A",status:tenantStatus}}];}}),where:condition=>{queries.push(condition);return table===tables.roleAssignments && roleStatus==="active" ? [{roleCode:"seller",revokedAt:roleRevoked}] : [];}})}),execute:async()=>routeRows};
  const tenantModule=compile("lib/tenant-runtime.ts",{
    "drizzle-orm":{eq:(field,value)=>({field,value}),and:(...args)=>args,sql:()=>({})},
    "../app/app-auth":{getCurrentAppUser:async()=>authenticated?{id:"authenticated-user"}:null},
    "../db":{getDb:()=>db},"../db/tenant-schema":tables,"./tenant-context":policy,
  });
  return {module:tenantModule,queries};
}
test("runtime queries canonical Membership by authenticated User ID",async()=>{
  const {module,queries}=runtime();
  assert.equal((await module.resolveTenantContext()).tenantId,"A");
  assert.deepEqual(JSON.parse(JSON.stringify(queries[0])),{field:"auth-user-id",value:"authenticated-user"});
  await assert.rejects(module.resolveTenantContext("B"));
});
test("runtime rejects authentication, membership, Tenant and role revocation failures",async()=>{
  for(const options of [{authenticated:false},{membershipStatus:"suspended"},{membershipStatus:"revoked",revokedAt:new Date()},{tenantStatus:"suspended"},{roleStatus:"revoked"},{roleRevoked:new Date()}]) await assert.rejects(runtime(options).module.resolveTenantContext());
});
test("public resolver rejects missing persistence and returns only stored routing",async()=>{
  await assert.rejects(runtime().module.resolvePublicIntake("buyer_profile"));
  const route={tenantId:"A",storeId:null,status:"active",tenantStatus:"active",intakeKind:"buyer_profile"};
  assert.equal((await runtime({routeRows:[route]}).module.resolvePublicIntake("buyer_profile")).tenantId,"A");
  await assert.rejects(runtime({routeRows:[{...route,status:"inactive"}]}).module.resolvePublicIntake("buyer_profile"));
});
