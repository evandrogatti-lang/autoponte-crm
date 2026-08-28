import fs from "node:fs";
import postgres from "postgres";

const expected="prcmlynykncfgzwluoef";
const env=Object.fromEntries(fs.readFileSync(".env.staging.local","utf8").split(/\r?\n/).filter(x=>x&&!x.startsWith("#")&&x.includes("=")).map(x=>{const i=x.indexOf("=");return [x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]}));
const dbUrl=new URL(env.DATABASE_URL),authUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
if(env.AUTOPONTE_ENV!=="staging"||dbUrl.hostname!==`db.${expected}.supabase.co`||authUrl.hostname.split(".")[0]!==expected)throw new Error("Unsafe target");

const source=fs.readFileSync("app/casos/[id]/CaseWorkspace.tsx","utf8");
const commercial=source.slice(source.indexOf("<section className={styles.paymentSummary}"),source.indexOf("{hasTradeIn && opportunity"));
const commercialFields=["Preço anunciado","Proposta aceita","Fechamento","Desconto sobre anúncio","Entrada","Troca","Financiado","Parcelas","Saldo à vista","Aprovação financeira","Instituição","Aprovado por","Data da aprovação"];
const headerFields=["CLIENTE","Status","Vendedor","Última interação","Preço anunciado","Proposta aceita","Fechamento","PRÓXIMA AÇÃO","BLOQUEIO"];
const contract={header:headerFields.every(x=>source.includes(x)),commercial:commercialFields.every(x=>commercial.includes(`label=\"${x}\"`)),neutralFallbacks:["Nenhuma","Não concluído","Não informada","Não informado"].every(x=>commercial.includes(x)),canonicalSections:["styles.stages","styles.timeline","styles.matchCard"].every(x=>source.includes(x))};

const db=postgres(env.DATABASE_URL,{prepare:false,max:1});
try{
 const [states]=await db.unsafe(`select
   count(*) filter(where final_outcome='sold')::int sold,
   count(*) filter(where final_outcome='active_negotiation' or (status in ('opened','active') and final_outcome=''))::int active,
   count(*) filter(where final_outcome in ('negotiation_lost','proposal_rejected') or status='lost')::int lost,
   count(*) filter(where final_outcome='awaiting_documents')::int awaiting_documents,
   count(*) filter(where acquisition_mode='trade_in' or exists(select 1 from proposals p where p.case_id=commercial_cases.id and p.status='accepted' and p.trade_in_credit>0))::int with_trade_in,
   count(*) filter(where acquisition_mode<>'trade_in' and not exists(select 1 from proposals p where p.case_id=commercial_cases.id and p.status='accepted' and p.trade_in_credit>0))::int without_trade_in
   from commercial_cases`);
 const representatives=await db.unsafe(`select distinct on(kind) kind,id,pilot_code from (
   select 'sold' kind,id,pilot_code,updated_at from commercial_cases where final_outcome='sold'
   union all select 'active',id,pilot_code,updated_at from commercial_cases where final_outcome='active_negotiation' or(status in('opened','active')and final_outcome='')
   union all select 'lost',id,pilot_code,updated_at from commercial_cases where final_outcome in('negotiation_lost','proposal_rejected')or status='lost'
   union all select 'awaiting_documents',id,pilot_code,updated_at from commercial_cases where final_outcome='awaiting_documents'
   union all select 'with_trade_in',c.id,c.pilot_code,c.updated_at from commercial_cases c where c.acquisition_mode='trade_in'or exists(select 1 from proposals p where p.case_id=c.id and p.status='accepted'and p.trade_in_credit>0)
   union all select 'without_trade_in',c.id,c.pilot_code,c.updated_at from commercial_cases c where c.acquisition_mode<>'trade_in'and not exists(select 1 from proposals p where p.case_id=c.id and p.status='accepted'and p.trade_in_credit>0)
 )x order by kind,updated_at desc`);
 const passed=Object.values(states).every(Number)&&Object.values(contract).every(Boolean)&&representatives.length===6;
 console.log(JSON.stringify({target:expected,contract,states,representatives,passed},null,2));
 if(!passed)process.exitCode=1;
}finally{await db.end()}
