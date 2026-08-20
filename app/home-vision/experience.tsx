"use client";

import { FormEvent, PointerEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PublicMarketplaceVehicle } from "../../lib/marketplace/public-vehicles";
import home from "./home-vision.module.css";
import work from "../match-workspace/workspace.module.css";

type Match = { vehicle: PublicMarketplaceVehicle; score: number; reasons: string[] };
type MatchResponse = { recommendations?: Match[]; error?: string };
type Stage = "home" | "matches";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR");
const clamp = (value: number) => Math.max(28, Math.min(65, value));

function vehicleImage(bodyType: string) {
  const type = bodyType.toLowerCase();
  if (type.includes("sedan")) return "/vehicle-sedan.png";
  if (type.includes("hatch")) return "/vehicle-hatch.png";
  return "/vehicle-suv.png";
}

export default function AutoPonteExperience({ initialVehicles }: { initialVehicles: PublicMarketplaceVehicle[] }) {
  const [stage, setStage] = useState<Stage>("home");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [split, setSplit] = useState(42);
  const [dragging, setDragging] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const vehicleRef = useRef<HTMLElement | null>(null);

  const active = selected === null ? null : matches[selected];
  const layout = useMemo(() => ({ gridTemplateColumns: active ? `${split}% 8px minmax(0,1fr)` : "1fr" }), [split, active]);
  const stores = Array.from(new Map(initialVehicles.map(v => [v.partner.id, v.partner])).values()).slice(0, 4);

  async function runSearch(search: string) {
    const clean = search.trim();
    if (!clean) return;
    setLoading(true);
    setError("");
    setSelected(null);
    setStage("matches");
    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredModels: clean, budgetMax: 0, maxMatches: 60 }),
      });
      const payload = await response.json() as MatchResponse;
      if (!response.ok) throw new Error(payload.error || "Não foi possível calcular os Matches.");
      setMatches(payload.recommendations || []);
    } catch (cause) {
      setMatches([]);
      setError(cause instanceof Error ? cause.message : "Não foi possível calcular os Matches.");
    } finally {
      setLoading(false);
    }
  }

  function submitHomeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = String(data.get("q") || "");
    setQuery(value);
    void runSearch(value);
  }

  function submitResultSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function chooseMatch(index: number) {
    setSelected(index);
    requestAnimationFrame(() => {
      const panel = vehicleRef.current;
      if (!panel) return;
      panel.scrollTop = 0;
      if (window.matchMedia("(max-width: 760px)").matches) {
        setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }), 160);
      }
    });
  }

  function moveDivider(clientX: number) {
    const box = workspaceRef.current?.getBoundingClientRect();
    if (!box) return;
    setSplit(clamp(((clientX - box.left) / box.width) * 100));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    moveDivider(event.clientX);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (dragging) moveDivider(event.clientX);
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  function keySplit(key: string) {
    if (key === "ArrowLeft") setSplit(v => clamp(v - 2));
    if (key === "ArrowRight") setSplit(v => clamp(v + 2));
    if (key === "Home") setSplit(28);
    if (key === "End") setSplit(65);
  }

  function goHome() {
    setStage("home");
    setSelected(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <main className={home.page}>
    <header className={home.header}>
      <button className={home.brandButton} type="button" onClick={goHome} aria-label="AutoPonte início"><span>AP</span><b>AutoPonte</b></button>
      <nav className={home.nav} aria-label="Navegação principal">
        <button type="button" onClick={goHome}>Comprar</button><button type="button" onClick={goHome}>Vender</button><button type="button" onClick={goHome}>Trocar</button><button type="button" onClick={goHome}>Como funciona</button><button type="button" onClick={goHome}>Lojas</button>
      </nav>
      <div className={home.headerActions}><button className={home.heart} aria-label="Favoritos">♡</button><Link className={home.login} href="/crm">Entrar</Link></div>
    </header>

    <div className={`${home.homeStage} ${stage === "home" ? home.stageVisible : home.stageRetracted}`} aria-hidden={stage !== "home"}>
      <section className={home.hero}>
        <div className={home.heroBackdrop}/>
        <div className={home.heroContent}>
          <p className={home.eyebrow}>AUTOPONTE MATCH</p>
          <h1>Encontre o carro certo. A AutoPonte faz o Match para você.</h1>
          <p className={home.heroText}>Conte o que procura. Nossa inteligência cruza sua intenção com o estoque real e mostra as opções que mais fazem sentido.</p>
          <div className={home.entryGrid}>
            <form className={home.searchPanel} onSubmit={submitHomeSearch}>
              <label htmlFor="smart-search">Já sabe o que procura?</label>
              <p>Busque por modelo, categoria ou descreva o carro ideal.</p>
              <div className={home.searchRow}><input id="smart-search" name="q" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex.: Jeep Compass automático até R$ 150 mil" required/><button type="submit">Buscar</button></div>
            </form>
            <div className={home.aiPanel}><div><span className={home.aiMark}>✦</span><div><strong>Ainda não sabe por onde começar?</strong><p>A IA ajuda a descobrir o carro certo para você.</p></div></div><Link href="/atendimento">Começar Busca Inteligente</Link></div>
          </div>
        </div>
      </section>

      <section className={home.how}><div className={home.sectionHeading}><p className={home.eyebrow}>COMO FUNCIONA</p><h2>Em 3 passos.</h2></div><div className={home.steps}><article><span>1</span><div><h3>Conte o que você precisa</h3><p>Orçamento, rotina e prioridades.</p></div></article><article><span>2</span><div><h3>A IA faz o Match</h3><p>Cruzamos seu contexto com o estoque.</p></div></article><article><span>3</span><div><h3>Receba os melhores Matches</h3><p>Menos opções. Mais relevância.</p></div></article></div></section>

      <section className={home.inventory}><div className={home.sectionHeadingRow}><div><p className={home.eyebrow}>RECÉM-CHEGADOS</p><h2>Novidades no estoque.</h2></div></div>{initialVehicles.length ? <div className={home.vehicleGrid}>{initialVehicles.slice(0,4).map((vehicle,index)=><article className={home.vehicleCard} key={vehicle.id}><div className={home.vehicleImageWrap}><img src={vehicleImage(vehicle.bodyType)} alt={`${vehicle.brand} ${vehicle.model}`}/>{index<2&&<span className={home.newChip}>NOVO</span>}</div><div className={home.vehicleBody}><p className={home.verified}>✓ Loja verificada</p><h3>{vehicle.brand} {vehicle.model}</h3><p>{vehicle.modelYear} · {number.format(vehicle.mileage)} km · {vehicle.transmission||"Câmbio não informado"}</p><strong>{money.format(vehicle.price)}</strong><div className={home.vehicleFooter}><span>{vehicle.city}{vehicle.state?`, ${vehicle.state}`:""}</span><span>♡</span></div></div></article>)}</div> : <div className={home.emptyState}><strong>O marketplace está pronto para receber o estoque publicado.</strong></div>}</section>

      <section className={home.storeSection}><div className={home.sectionHeadingRow}><div><p className={home.eyebrow}>LOJAS VERIFICADAS</p><h2>Compre com mais confiança.</h2></div></div>{stores.length?<div className={home.storeGrid}>{stores.map(store=><article className={home.storeCard} key={store.id}><div className={home.storeLogo}>AP</div><div><p>✓ VERIFICADA</p><h3>{store.name}</h3><span>{store.city}{store.state?`, ${store.state}`:""}</span></div></article>)}</div>:null}</section>
    </div>

    <div className={`${home.resultsStage} ${stage === "matches" ? home.stageVisible : home.stageHidden}`} aria-hidden={stage !== "matches"}>
      <section className={work.searchBand}>
        <div><p>RESULTADO DE BUSCA</p><h1>{loading ? "Calculando seus Matches…" : `${matches.length} Matches encontrados.`}</h1><span>Escolha um veículo. A lista continua aberta enquanto você compara.</span></div>
        <form onSubmit={submitResultSearch}><input name="query" value={query} onChange={e=>setQuery(e.target.value)} required/><button type="submit" disabled={loading}>{loading?"Analisando…":"Refinar"}</button></form>
        {error && <strong className={work.error}>{error}</strong>}
      </section>

      {loading && !matches.length ? <section className={work.empty}><div>◎</div><h2>Buscando no estoque real…</h2><p>Estamos ordenando as opções por compatibilidade.</p></section> : !matches.length ? <section className={work.empty}><div>◎</div><h2>Nenhum Match forte nessa busca.</h2><p>Tente outro modelo ou uma descrição mais ampla.</p><button type="button" onClick={goHome}>Voltar para a Home</button></section> : <section ref={workspaceRef} className={`${work.workspace} ${dragging?work.isDragging:""}`} style={layout}>
        <aside className={`${work.matches} ${active?work.matchesCompact:work.matchesFull}`}>
          <div className={work.listHeader}><div><span>MELHORES MATCHES</span><h2>{active?"Compare sem perder a lista":"Escolha por onde começar"}</h2></div><button type="button" onClick={goHome}>Início</button></div>
          <div className={work.list}>{matches.map((match,index)=><button key={match.vehicle.id} type="button" className={`${work.matchCard} ${index===selected?work.active:""}`} onClick={()=>chooseMatch(index)}><div className={work.thumb}><img src={vehicleImage(match.vehicle.bodyType)} alt=""/></div><div className={work.cardBody}><div><span className={work.score}>{match.score}% match</span>{index===0&&<small>TOP MATCH</small>}</div><strong>{match.vehicle.brand} {match.vehicle.model}</strong><p>{match.vehicle.modelYear} · {number.format(match.vehicle.mileage)} km · {match.vehicle.city}</p><b>{money.format(match.vehicle.price)}</b><span className={work.reason}>{match.reasons[0]||"Boa compatibilidade"}</span></div></button>)}</div>
        </aside>

        {active && <><div className={work.divider} role="separator" aria-label="Ajustar largura entre resultados e veículo" aria-orientation="vertical" aria-valuemin={28} aria-valuemax={65} aria-valuenow={Math.round(split)} tabIndex={0} onKeyDown={e=>keySplit(e.key)} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag}><span>⋮</span></div>
        <article ref={vehicleRef} key={active.vehicle.id} className={`${work.vehicle} ${work.vehicleEnter}`}>
          <div className={work.vehicleTop}><div><span className={work.scoreLarge}>{active.score}% Match</span><p>{active.reasons.length} razões para esta recomendação</p></div><div><button type="button" onClick={()=>setSplit(35)}>Lista</button><button type="button" onClick={()=>setSplit(50)}>Meio a meio</button><button type="button" onClick={()=>setSplit(28)}>Ver veículo</button><button type="button" onClick={()=>setSelected(null)}>Fechar</button></div></div>
          <div className={work.hero}><img src={vehicleImage(active.vehicle.bodyType)} alt={`${active.vehicle.brand} ${active.vehicle.model}`}/><button aria-label="Favoritar">♡</button></div>
          <div className={work.vehicleInfo}><div className={work.title}><div><p>{active.vehicle.partner.name} · VERIFICADA</p><h2>{active.vehicle.brand} {active.vehicle.model}</h2><span>{active.vehicle.modelYear} · {number.format(active.vehicle.mileage)} km · {active.vehicle.city}</span></div><strong>{money.format(active.vehicle.price)}</strong></div><div className={work.actions}><button>Tenho interesse</button><button>Simular financiamento</button><button>Tenho carro na troca</button></div><section className={work.why}><p>POR QUE DEU MATCH?</p><h3>O que aproxima este carro da sua busca</h3><ul>{active.reasons.slice(0,5).map(reason=><li key={reason}>✓ {reason}</li>)}</ul></section><div className={work.specs}>{[active.vehicle.transmission,active.vehicle.fuel,active.vehicle.bodyType,active.vehicle.color].filter(Boolean).map(value=><span key={value}>{value}</span>)}</div><section className={work.assistant}><div><b>Assistant AutoPonte</b><p>Posso explicar este Match, comparar com outro carro ou refinar sua busca.</p></div><button>Perguntar ao Assistant</button></section></div>
        </article></>}
      </section>}
    </div>
  </main>;
}
