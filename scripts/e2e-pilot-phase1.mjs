import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required (use the staging env file).");
const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const money = (value) => Math.round(value);
const at = (day, hour = 10) => new Date(`2026-08-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00-03:00`);

const cases = [
  { n:1, mode:"direct_purchase", vehicle:"Toyota Corolla XEi", brand:"Toyota", model:"Corolla XEi", year:2022, km:42000, buy:112000, extra:3800, price:129900, finalPrice:127000, customer:"Mariana Alves", outcome:"sold", payment:"financing", document:"approved", work:"preparation" },
  { n:2, mode:"trade_in", vehicle:"Honda HR-V EXL", brand:"Honda", model:"HR-V EXL", year:2021, km:57000, buy:101000, extra:6200, price:119900, finalPrice:116500, customer:"Ricardo Nunes", outcome:"sold", payment:"mixed", document:"approved", work:"maintenance" },
  { n:3, mode:"consignment", vehicle:"Jeep Compass Longitude", brand:"Jeep", model:"Compass Longitude", year:2023, km:28000, buy:0, extra:1900, price:159900, finalPrice:155000, customer:"Camila Rocha", outcome:"negotiation_lost", payment:"financing", document:"approved", work:"preparation" },
  { n:4, mode:"appraisal_only", vehicle:"Volkswagen T-Cross Comfortline", brand:"Volkswagen", model:"T-Cross Comfortline", year:2020, km:76000, buy:0, extra:0, price:103000, finalPrice:0, customer:"Paulo Mendes", outcome:"appraisal_completed", payment:"none", document:"pending", work:"none" },
  { n:5, mode:"direct_purchase", vehicle:"Chevrolet Onix Premier", brand:"Chevrolet", model:"Onix Premier", year:2022, km:35000, buy:76000, extra:4400, price:89900, finalPrice:87500, customer:"Juliana Costa", outcome:"sold", payment:"cash", document:"approved", work:"repair" },
  { n:6, mode:"consignment", vehicle:"BMW 320i GP", brand:"BMW", model:"320i GP", year:2021, km:41000, buy:0, extra:2400, price:219900, finalPrice:0, customer:"André Lima", outcome:"proposal_rejected", payment:"financing", document:"approved", work:"preparation" },
  { n:7, mode:"trade_in", vehicle:"Fiat Toro Volcano", brand:"Fiat", model:"Toro Volcano", year:2022, km:68000, buy:119000, extra:8700, price:143900, finalPrice:139000, customer:"Fernanda Souza", outcome:"sold", payment:"mixed", document:"approved", work:"maintenance" },
  { n:8, mode:"direct_purchase", vehicle:"Hyundai Creta Platinum", brand:"Hyundai", model:"Creta Platinum", year:2023, km:22000, buy:128000, extra:3100, price:149900, finalPrice:0, customer:"Lucas Martins", outcome:"active_negotiation", payment:"financing", document:"approved", work:"preparation" },
  { n:9, mode:"consignment", vehicle:"Nissan Kicks Exclusive", brand:"Nissan", model:"Kicks Exclusive", year:2022, km:39000, buy:0, extra:1700, price:128900, finalPrice:0, customer:"Beatriz Freire", outcome:"negotiation_lost", payment:"cash", document:"approved", work:"none" },
  { n:10, mode:"trade_in", vehicle:"Ford Ranger Limited", brand:"Ford", model:"Ranger Limited", year:2021, km:89000, buy:154000, extra:12500, price:184900, finalPrice:0, customer:"Gustavo Ribeiro", outcome:"awaiting_documents", payment:"financing", document:"pending", work:"repair" },
];

function ids(c) { const p=`pilot-p1-${String(c.n).padStart(2,"0")}`; return { p, vehicle:`${p}-vehicle`, customer:`${p}-customer`, opportunity:`${p}-opportunity`, buyer:`${p}-buyer`, match:`${p}-match`, proposal:`${p}-proposal` }; }
function finalStatus(c) { return c.outcome === "sold" ? "closed" : ["negotiation_lost","proposal_rejected"].includes(c.outcome) ? "lost" : c.outcome === "active_negotiation" ? "negotiating" : "qualified"; }

async function migrate() {
  const migration = await readFile(new URL("../drizzle/0017_e2e_pilot_operational_spine.sql", import.meta.url), "utf8");
  await db.unsafe(migration);
}

async function ensureActors(tx) {
  await tx`insert into public.partners (id,name,legal_name,document,partner_type,status,contact_name,phone_ddi,phone_local,phone_e164,email,city,state,integration_mode,external_system,notes)
    values ('pilot-p1-partner','AutoPonte Pilot Partner','AutoPonte Pilot Partner Ltda','00999999000190','dealer','active','Operações Pilot','55','11990001010','5511990001010','pilot.partner@autoponte.test','São Paulo','SP','manual','','Phase 1 only') on conflict (id) do nothing`;
  await tx`insert into public.crm_roles (id,code,name,description,is_system) values ('pilot-p1-role','pilot_sales','Vendas Pilot','E2E Pilot Phase 1',false) on conflict (id) do nothing`;
  for (const [i,name] of ["Ana Martins","Bruno Tavares"].entries()) {
    const user=`pilot-p1-user-${i+1}`, seller=`pilot-p1-seller-${i+1}`;
    await tx`insert into public.crm_users (id,name,email,role_id,store_id,status) values (${user},${name},${`pilot.seller${i+1}@autoponte.test`},'pilot-p1-role','pilot-p1-partner','active') on conflict (id) do nothing`;
    await tx`insert into public.seller_profiles (id,crm_user_id,partner_id,status,availability_status,capacity,notes) values (${seller},${user},'pilot-p1-partner','active','available',10,'E2E Pilot Phase 1') on conflict (id) do nothing`;
  }
}

async function seedCase(tx, c) {
  const i=ids(c), seller=`pilot-p1-seller-${c.n % 2 + 1}`, opened=at(c.n+1);
  await tx`insert into public.customers (id,name,whatsapp,email,city,state,status) values (${i.customer},${c.customer},${`55119880${String(c.n).padStart(4,"0")}`},${`pilot.customer${c.n}@example.test`},'São Paulo','SP','active') on conflict (id) do nothing`;
  await tx`insert into public.vehicles (id,inventory_scope,partner_id,source_type,status,plate,chassis,stock_code,brand_code,model_code,year_code,brand,model,model_year,fuel,fipe_code,fipe_reference_month,fipe_value,mileage,color,transmission,body_type,doors,engine,power,renavam,registration_state,document_status,vehicle_condition,inspection_status,acquisition_date,listing_date,optional_items,city,owner_name,asking_price,acquisition_cost,additional_costs,notes)
    values (${i.vehicle},'autoponte','pilot-p1-partner',${c.mode},${c.outcome==='sold'?'sold':c.document==='pending'?'document_pending':'available'},${`P1A${String(c.n).padStart(4,"0")}`},${`9BWZZZP1${String(c.n).padStart(8,"0")}`},${`P1-${String(c.n).padStart(3,"0")}`},${String(c.n)},${`${c.n}01`},${String(c.year)},${c.brand},${c.model},${c.year},'Flex',${`P1FIPE${c.n}`},'agosto/2026',${money(c.price*.92)},${c.km},'Prata','Automático','SUV',4,'2.0','150 cv',${`0099999${String(c.n).padStart(4,"0")}`},'SP',${c.document},'good','approved',${`2026-08-${String(c.n+1).padStart(2,"0")}`},${c.outcome==='appraisal_completed'?'':`2026-08-${String(c.n+3).padStart(2,"0")}`},'Ar-condicionado; multimídia','São Paulo',${c.mode==='consignment'?c.customer:'AutoPonte'},${c.price},${c.buy},${c.extra},'E2E Pilot Phase 1') on conflict (id) do nothing`;
  await tx`insert into public.trade_ins (id,name,whatsapp,email,city,brand,model,version,year,mileage,condition,desired_vehicle,reference_price,estimated_min,estimated_max,photo_keys,status,lead_category,next_follow_up,last_contact_at,notes,next_action,consent_at)
    values (${i.opportunity},${c.customer},${`55119880${String(c.n).padStart(4,"0")}`},${`pilot.customer${c.n}@example.test`},'São Paulo',${c.brand},${c.model},${c.model},${String(c.year)},${c.km},'good',${c.vehicle},${c.price},${money(c.price*.9)},${c.price},'[]',${finalStatus(c)},${c.outcome==='sold'?'won':c.outcome.includes('lost')||c.outcome.includes('rejected')?'cold':'hot'},'',${opened.toISOString()},'E2E Pilot Phase 1',${c.outcome==='sold'?'Post-sale follow-up':c.outcome==='appraisal_completed'?'Appraisal delivered':'Commercial follow-up'},${opened.toISOString()}) on conflict (id) do nothing`;
  await tx`insert into public.buyer_profiles (id,name,whatsapp,email,city,budget_max,down_payment,max_monthly_payment,vehicle_types,preferred_models,min_year,max_mileage,transmission,fuel,use_case,purchase_timeline,alerts_consent,consent_at,status)
    values (${i.buyer},${c.customer},${`55119880${String(c.n).padStart(4,"0")}`},${`pilot.customer${c.n}@example.test`},'São Paulo',${c.price},${money(c.price*.2)},${money(c.price*.018)},'["SUV","Sedan"]',${c.model},${c.year-2},${c.km+20000},'Automático','Flex','Uso familiar','Até 30 dias',true,${opened.toISOString()},'active') on conflict (id) do nothing`;
  await tx`insert into public.commercial_cases (id,pilot_code,vehicle_id,customer_id,opportunity_id,partner_id,seller_profile_id,acquisition_mode,status,opened_at,closed_at,final_outcome,notes)
    values (${i.p},${`P1-${String(c.n).padStart(2,"0")}`},${i.vehicle},${i.customer},${i.opportunity},'pilot-p1-partner',${seller},${c.mode},${c.outcome==='sold'?'closed':c.outcome},${opened},${['sold','negotiation_lost','proposal_rejected','appraisal_completed'].includes(c.outcome)?at(c.n+8):null},${c.outcome},'E2E Pilot Phase 1') on conflict (id) do update set status=excluded.status,closed_at=excluded.closed_at,final_outcome=excluded.final_outcome,updated_at=now()`;
  await tx`insert into public.seller_assignments (id,opportunity_id,seller_profile_id,assigned_by_user_id,status,outcome,assigned_at,accepted_at,first_contact_at,completed_at)
    values (${`${i.p}-assignment`},${i.opportunity},${seller},'pilot-p1-user-1',${['sold','negotiation_lost','proposal_rejected','appraisal_completed'].includes(c.outcome)?'completed':'contacted'},${c.outcome},${at(c.n+1,11)},${at(c.n+1,12)},${at(c.n+1,13)},${['sold','negotiation_lost','proposal_rejected','appraisal_completed'].includes(c.outcome)?at(c.n+8):null}) on conflict (id) do nothing`;
  await tx`insert into public.customer_intents (id,case_id,customer_id,buyer_profile_id,status,hard_constraints,preferences,financing,captured_at,closed_at)
    values (${`${i.p}-intent`},${i.p},${i.customer},${i.buyer},${c.outcome==='sold'?'converted':c.outcome},${tx.json({maxPrice:c.price,minYear:c.year-2,maxMileage:c.km+20000,transmission:'automatic'})},${tx.json({models:[c.model],color:['silver','white'],usage:'family'})},${tx.json({scenario:c.payment,downPayment:money(c.price*.2),maxMonthly:money(c.price*.018)})},${at(c.n+1,14)},${c.outcome==='sold'?at(c.n+8):null}) on conflict (id) do nothing`;
  const score=92-c.n;
  await tx`insert into public.vehicle_matches (id,buyer_profile_id,source_type,source_id,vehicle_label,vehicle_price,score,reasons,message_draft,status,reviewed_at,case_id,vehicle_id,outcome)
    values (${i.match},${i.buyer},'inventory',${i.vehicle},${c.vehicle},${c.price},${score},${JSON.stringify(['budget_fit','preferred_model','year_fit','mileage_fit'])},'Contato personalizado revisado',${c.outcome==='sold'?'converted':c.outcome},${at(c.n+2).toISOString()},${i.p},${i.vehicle},${c.outcome}) on conflict (id) do update set status=excluded.status,outcome=excluded.outcome`;
  await tx`insert into public.match_interactions (id,case_id,match_id,interaction_type,channel,outcome,notes,occurred_at) values (${`${i.p}-match-contact`},${i.p},${i.match},'candidate_presented','whatsapp',${c.outcome==='appraisal_completed'?'not_applicable':'engaged'},'Score and reasons reviewed before contact',${at(c.n+2,11)}) on conflict (id) do nothing`;
  const events=[['acquisition',c.document==='pending'?'blocked':'completed',c.buy],['documentation',c.document,c.buy],['inventory_entry','completed',null],['pricing','completed',c.price]];
  if(c.work!=='none') events.push(['vehicle_preparation',c.outcome==='awaiting_documents'?'in_progress':'completed',c.extra]);
  if(c.outcome!=='appraisal_completed') events.push(['publication',c.document==='pending'?'blocked':'completed',c.price],['lead_generated','completed',null],['match_candidate','completed',score]);
  for (const [idx,[type,status,amount]] of events.entries()) await tx`insert into public.vehicle_lifecycle_events (id,case_id,vehicle_id,event_type,status,occurred_at,amount,description,metadata) values (${`${i.p}-event-${idx+1}`},${i.p},${i.vehicle},${type},${status},${at(c.n+1+idx)},${amount},${`Pilot ${type}`},${tx.json({pilot:true})}) on conflict (id) do nothing`;
  if(c.buy>0) await tx`insert into public.vehicle_cost_entries (id,case_id,vehicle_id,category,description,amount,incurred_at,partner_id,status) values (${`${i.p}-cost-acquisition`},${i.p},${i.vehicle},'acquisition','Vehicle acquisition',${c.buy},${`2026-08-${String(c.n+1).padStart(2,"0")}`},'pilot-p1-partner','approved') on conflict (id) do nothing`;
  if(c.extra>0) await tx`insert into public.vehicle_cost_entries (id,case_id,vehicle_id,category,description,amount,incurred_at,partner_id,status) values (${`${i.p}-cost-extra`},${i.p},${i.vehicle},${c.work},'Preparation and related expenses',${c.extra},${`2026-08-${String(c.n+2).padStart(2,"0")}`},'pilot-p1-partner','approved') on conflict (id) do nothing`;
  if(c.work!=='none') await tx`insert into public.vehicle_work_orders (id,case_id,vehicle_id,work_type,description,status,estimated_cost,actual_cost,opened_at,completed_at) values (${`${i.p}-work`},${i.p},${i.vehicle},${c.work},'Pilot vehicle readiness',${c.outcome==='awaiting_documents'?'in_progress':'completed'},${c.extra},${c.outcome==='awaiting_documents'?0:c.extra},${at(c.n+2)},${c.outcome==='awaiting_documents'?null:at(c.n+3)}) on conflict (id) do nothing`;
  if(c.outcome!=='appraisal_completed') {
    for(let p=1;p<=4;p++) await tx`insert into public.vehicle_media (id,case_id,vehicle_id,media_type,storage_key,status,position,captured_at,approved_at) values (${`${i.p}-photo-${p}`},${i.p},${i.vehicle},'photo',${`pilot/${i.p}/photo-${p}.jpg`},'approved',${p},${at(c.n+3)},${at(c.n+3,14)}) on conflict (id) do nothing`;
    await tx`insert into public.vehicle_publications (id,case_id,vehicle_id,channel,status,asking_price,external_reference,published_at,ended_at) values (${`${i.p}-publication`},${i.p},${i.vehicle},'autoponte',${c.document==='pending'?'draft':c.outcome==='sold'?'ended':'published'},${c.price},${`AUTOPONTE-P1-${c.n}`},${c.document==='pending'?null:at(c.n+4)},${c.outcome==='sold'?at(c.n+8):null}) on conflict (id) do nothing`;
    await tx`insert into public.vehicle_price_history (id,case_id,vehicle_id,old_price,new_price,reason,changed_at) values (${`${i.p}-price-1`},${i.p},${i.vehicle},null,${c.price},'Initial pricing',${at(c.n+3)}) on conflict (id) do nothing`;
  }
  if(!['appraisal_completed','awaiting_documents'].includes(c.outcome)) {
    const accepted=c.outcome==='sold', proposalStatus=accepted?'accepted':c.outcome==='proposal_rejected'?'rejected':c.outcome==='negotiation_lost'?'lost':'sent';
    const down=c.payment==='cash'?c.finalPrice||c.price:money((c.finalPrice||c.price)*.2), financed=c.payment==='financing'||c.payment==='mixed'?(c.finalPrice||c.price)-down:0;
    await tx`insert into public.proposals (id,case_id,opportunity_id,match_id,vehicle_id,customer_id,sequence,status,vehicle_price,trade_in_credit,down_payment,financed_amount,installments,installment_amount,fees,total_amount,valid_until,rejection_reason,proposed_at,decided_at)
      values (${i.proposal},${i.p},${i.opportunity},${i.match},${i.vehicle},${i.customer},1,${proposalStatus},${c.finalPrice||c.price},${c.mode==='trade_in'?30000:0},${down},${financed},${financed?48:0},${financed?money(financed/48):0},0,${c.finalPrice||c.price},${`2026-09-${String(c.n).padStart(2,"0")}`},${c.outcome==='proposal_rejected'?'Financing terms declined':c.outcome==='negotiation_lost'?'Price expectation not aligned':''},${at(c.n+5)},${proposalStatus==='sent'?null:at(c.n+6)}) on conflict (id) do update set status=excluded.status,rejection_reason=excluded.rejection_reason`;
    if(accepted) {
      await tx`insert into public.commercial_contracts (id,case_id,proposal_id,contract_type,status,contract_number,signed_at) values (${`${i.p}-contract`},${i.p},${i.proposal},'purchase_and_sale','signed',${`CV-P1-${String(c.n).padStart(3,"0")}`},${at(c.n+7)}) on conflict (id) do nothing`;
      await tx`insert into public.payment_records (id,case_id,proposal_id,payment_type,provider,amount,status,due_at,paid_at) values (${`${i.p}-payment`},${i.p},${i.proposal},${c.payment},${financed?'Banco Pilot':''},${c.finalPrice},'settled',${at(c.n+7)},${at(c.n+7)}) on conflict (id) do nothing`;
      await tx`insert into public.vehicle_deliveries (id,case_id,vehicle_id,customer_id,status,scheduled_at,delivered_at,checklist,notes) values (${`${i.p}-delivery`},${i.p},${i.vehicle},${i.customer},'delivered',${at(c.n+8,10)},${at(c.n+8,11)},${tx.json({documents:true,keys:true,inspection:true,fuel:true})},'Customer accepted vehicle') on conflict (id) do nothing`;
      await tx`insert into public.post_sale_followups (id,case_id,customer_id,status,due_at,completed_at,outcome,notes) values (${`${i.p}-post-sale`},${i.p},${i.customer},'scheduled',${at(c.n+15)},null,'','Seven-day follow-up') on conflict (id) do nothing`;
    }
  }
}

async function validate() {
  const rows=await db.unsafe(`select c.pilot_code,c.final_outcome,c.vehicle_id,c.customer_id,c.opportunity_id,c.seller_profile_id,
    coalesce((select sum(x.amount) from vehicle_cost_entries x where x.case_id=c.id),0) cost_total,
    (select count(*)::int from vehicle_lifecycle_events e where e.case_id=c.id) event_count,
    (select count(*)::int from vehicle_matches m where m.case_id=c.id and m.vehicle_id=c.vehicle_id) match_count,
    (select count(*)::int from proposals p where p.case_id=c.id) proposal_count,
    (select count(*)::int from commercial_contracts k where k.case_id=c.id and k.status='signed') contract_count,
    (select count(*)::int from vehicle_deliveries d where d.case_id=c.id and d.status='delivered') delivery_count
    from commercial_cases c where c.pilot_code like 'P1-%' order by c.pilot_code`);
  if(rows.length!==10) throw new Error(`Expected 10 pilot cases, found ${rows.length}`);
  for(const row of rows) {
    if(!row.vehicle_id||!row.customer_id||!row.opportunity_id||!row.seller_profile_id) throw new Error(`${row.pilot_code}: broken core relationship`);
    if(row.event_count<4||row.match_count!==1) throw new Error(`${row.pilot_code}: incomplete trace/match`);
    if(row.final_outcome==='sold'&&(row.proposal_count<1||row.contract_count!==1||row.delivery_count!==1)) throw new Error(`${row.pilot_code}: sold case is incomplete`);
  }
  return rows;
}

try {
  await migrate();
  await db.begin(async tx => { await ensureActors(tx); for(const c of cases) await seedCase(tx,c); });
  const rows=await validate();
  console.log(JSON.stringify({status:"PASS",cases:rows},null,2));
} finally { await db.end(); }
