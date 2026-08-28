import assert from "node:assert/strict";
import test from "node:test";
import { assertReadinessForState, type InventoryReadiness } from "../lib/vehicles/inventory-readiness.ts";

const ready: InventoryReadiness = { documentationReady:true,maintenanceReady:true,vqiRequired:true,vqiReady:true,mediaReady:true,pricingReady:true,publicationReady:true,approvedPhotos:4,openWorkOrders:0,publicationStatus:"published",publicationStartedAt:new Date(),publicationEndedAt:null,blockers:[],nextAction:"Disponibilizar para Matches" };
test("inventory guards block incomplete preparation",()=>{
  assert.throws(()=>assertReadinessForState("READY",{...ready,maintenanceReady:false}),/Manutenção/);
  assert.throws(()=>assertReadinessForState("PUBLISHED",{...ready,documentationReady:false}),/Documentação/);
  assert.throws(()=>assertReadinessForState("PUBLISHED",{...ready,vqiReady:false}),/VQI/);
  assert.throws(()=>assertReadinessForState("PUBLISHED",{...ready,mediaReady:false,approvedPhotos:3}),/4 fotos/);
  assert.throws(()=>assertReadinessForState("AVAILABLE",{...ready,publicationReady:false}),/publicado/);
  assert.doesNotThrow(()=>assertReadinessForState("AVAILABLE",ready));
});
