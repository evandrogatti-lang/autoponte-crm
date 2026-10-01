import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL("../lib/tenant-context.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {selectTenantContext,authorizeStore,validateIntakeRoute}=exports;
const base={tenantId:"A",membershipId:"member",tenantStatus:"active",membershipStatus:"active",revokedAt:null,roles:["seller"]};
test("Tenant resolver denies absent, inactive, revoked and conflicting contexts",()=>{
  assert.equal(selectTenantContext([base]).tenantId,"A");
  for(const rows of [[],[{...base,membershipStatus:"suspended"}],[{...base,membershipStatus:"revoked"}],[{...base,revokedAt:new Date()}],[{...base,tenantStatus:"archived"}],[{...base,roles:[]}]]) assert.throws(()=>selectTenantContext(rows));
  assert.throws(()=>selectTenantContext([base],"B"));
  assert.throws(()=>selectTenantContext([base,{...base,tenantId:"B"}]));
  assert.equal(selectTenantContext([base,{...base,tenantId:"B"}],"B").tenantId,"B");
});
test("owner accesses own Stores; manager and seller need explicit access",()=>{
  const store={tenantId:"A",status:"active",hasActiveAccess:false};
  authorizeStore(["owner"],"A",store);
  for(const role of ["manager","seller"]){assert.throws(()=>authorizeStore([role],"A",store));authorizeStore([role],"A",{...store,hasActiveAccess:true});}
  assert.throws(()=>authorizeStore(["owner"],"B",store));
  assert.throws(()=>authorizeStore(["owner"],"A",{...store,status:"inactive"}));
});
test("public route fails closed for inactive, wrong kind and unapproved Store context",()=>{
  const route={tenantId:"A",storeId:null,intakeKind:"buyer_profile",status:"active",tenantStatus:"active"};
  assert.equal(validateIntakeRoute(route,"buyer_profile").tenantId,"A");
  for(const override of [{status:"inactive"},{tenantStatus:"suspended"},{storeId:"store"},{intakeKind:"trade_in"}]) assert.throws(()=>validateIntakeRoute({...route,...override},"buyer_profile"));
});
