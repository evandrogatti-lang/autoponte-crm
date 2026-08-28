import fs from "node:fs";
import postgres from "postgres";
const expected="prcmlynykncfgzwluoef";
const env=Object.fromEntries(fs.readFileSync(".env.staging.local","utf8").split(/\r?\n/).filter(x=>x&&!x.startsWith("#")&&x.includes("=")).map(x=>{const i=x.indexOf("=");return [x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}));
const u=new URL(env.DATABASE_URL),a=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const directTarget=u.hostname===`db.${expected}.supabase.co`;
const poolerTarget=u.hostname.endsWith(".pooler.supabase.com")&&u.username===`postgres.${expected}`;
if(env.AUTOPONTE_ENV!=="staging"||(!directTarget&&!poolerTarget)||a.hostname.split(".")[0]!==expected)throw new Error("Unsafe target");
const db=postgres(env.DATABASE_URL,{prepare:false,max:1});
try {
 const vehicleOrigins=await db`select source_type,origin,count(*)::int total from vehicles group by source_type,origin order by total desc`;
 const matchShapes=await db`select source_type,count(*)::int total,count(vehicle_id)::int with_vehicle,count(case_id)::int with_case from vehicle_matches group by source_type order by total desc`;
 const caseShapes=await db`select acquisition_mode,count(*)::int total,count(vehicle_id)::int with_vehicle,count(customer_id)::int with_customer,count(opportunity_id)::int with_opportunity from commercial_cases group by acquisition_mode order by total desc`;
 const candidates=await db`select count(*)::int total,
   count(*) filter(where c.customer_id is not null)::int with_customer,
   count(*) filter(where c.opportunity_id is not null)::int with_opportunity
   from vehicles v join commercial_cases c on c.vehicle_id=v.id where v.origin='trade_in'`;
 const sourceCandidates=await db`select count(*)::int total from vehicles v join vehicle_matches m on m.vehicle_id=v.id and m.source_type='trade_in'`;
 console.log(JSON.stringify({vehicleOrigins,matchShapes,caseShapes,tradeVehiclesLinkedDirectlyToCases:candidates[0],tradeVehiclesLinkedAsMatchSource:sourceCandidates[0]},null,2));
}finally{await db.end()}
