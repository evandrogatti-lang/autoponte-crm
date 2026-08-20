import Link from "next/link";
import { listPublicMarketplaceVehicles } from "../../lib/marketplace/public-vehicles";
import styles from "./home-vision.module.css";

const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
function vehicleImage(bodyType:string){const type=bodyType.toLowerCase();if(type.includes("sedan"))return "/vehicle-sedan.png";if(type.includes("hatch"))return "/vehicle-hatch.png";return "/vehicle-suv.png"}

export default async function HomeVisionPreview(){
  const vehicles=await listPublicMarketplaceVehicles(8);
  const recommended=vehicles.slice(0,4);
  const stores=Array.from(new Map(vehicles.map(v=>[v.partner.id,v.partner])).values()).slice(0,4);

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/home-vision" aria-label="AutoPonte início"><span>AP</span><b>AutoPonte</b></Link>
      <nav className={styles.nav} aria-label="Navegação principal">
        <a href="#comprar">Comprar</a><a href="#comprar">Vender</a><a href="#comprar">Trocar</a><a href="#como-funciona">Como funciona</a><a href="#lojas">Lojas</a><a href="#sobre">Sobre nós</a>
      </nav>
      <div className={styles.headerActions}><button className={styles.heart} aria-label="Favoritos">♡</button><Link className={styles.login} href="/crm">Entrar</Link></div>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroBackdrop}/>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>AUTOPONTE MATCH</p>
        <h1>Encontre o carro certo. A AutoPonte faz o Match para você.</h1>
        <p className={styles.heroText}>Conte o que procura. Nossa inteligência cruza sua intenção com o estoque real e mostra as opções que mais fazem sentido.</p>
        <div className={styles.entryGrid}>
          <form className={styles.searchPanel} action="/match-workspace" method="get">
            <label htmlFor="smart-search">Já sabe o que procura?</label>
            <p>Busque por modelo, categoria ou descreva o carro ideal.</p>
            <div className={styles.searchRow}><input id="smart-search" name="q" placeholder="Ex.: Jeep Compass automático até R$ 150 mil" required/><button type="submit">Buscar</button></div>
          </form>
          <div className={styles.aiPanel}>
            <div><span className={styles.aiMark}>✦</span><div><strong>Ainda não sabe por onde começar?</strong><p>Converse com a AutoPonte. A IA ajuda a descobrir o carro certo para você.</p></div></div>
            <Link href="/atendimento">Começar Busca Inteligente</Link>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.how} id="como-funciona">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>COMO FUNCIONA</p><h2>Em 3 passos.</h2></div>
      <div className={styles.steps}>
        <article><span>1</span><div><h3>Conte o que você precisa</h3><p>Orçamento, rotina, preferências e prioridades.</p></div></article>
        <article><span>2</span><div><h3>A IA faz o Match</h3><p>O sistema cruza seu contexto com o estoque disponível.</p></div></article>
        <article><span>3</span><div><h3>Receba os melhores Matches</h3><p>Menos opções. Mais relevância e explicação.</p></div></article>
      </div>
    </section>

    <section className={styles.inventory} id="comprar">
      <div className={styles.sectionHeadingRow}><div><p className={styles.eyebrow}>RECÉM-CHEGADOS</p><h2>Novidades no estoque.</h2></div><Link href="/match-workspace">Ver todos →</Link></div>
      {vehicles.length?<div className={styles.vehicleGrid}>{vehicles.slice(0,4).map((vehicle,index)=><article className={styles.vehicleCard} key={vehicle.id}><div className={styles.vehicleImageWrap}><img src={vehicleImage(vehicle.bodyType)} alt={`${vehicle.brand} ${vehicle.model}`}/>{index<2&&<span className={styles.newChip}>NOVO</span>}</div><div className={styles.vehicleBody}><p className={styles.verified}>✓ Loja verificada</p><h3>{vehicle.brand} {vehicle.model}</h3><p>{vehicle.modelYear} · {vehicle.mileage.toLocaleString("pt-BR")} km · {vehicle.transmission||"Câmbio não informado"}</p><strong>{money.format(vehicle.price)}</strong><div className={styles.vehicleFooter}><span>{vehicle.city}{vehicle.state?`, ${vehicle.state}`:""}</span><span>♡</span></div></div></article>)}</div>:<div className={styles.emptyState}><strong>O marketplace está pronto para receber o estoque publicado.</strong><span>Assim que houver veículos disponíveis, eles aparecem aqui automaticamente.</span></div>}
    </section>

    <section className={styles.recommended}>
      <div className={styles.sectionHeadingRow}><div><p className={styles.eyebrow}>RECOMENDADOS PARA VOCÊ</p><h2>Comece pelos que mais combinam.</h2></div><Link href="/match-workspace">Encontrar meu Match →</Link></div>
      <div className={styles.vehicleGrid}>{recommended.map((vehicle,index)=><article className={styles.vehicleCard} key={`rec-${vehicle.id}`}><div className={styles.vehicleImageWrap}><img src={vehicleImage(vehicle.bodyType)} alt={`${vehicle.brand} ${vehicle.model}`}/><span className={styles.matchChip}>{Math.max(88,96-index*2)}% Match</span></div><div className={styles.vehicleBody}><h3>{vehicle.brand} {vehicle.model}</h3><p>{vehicle.modelYear} · {vehicle.mileage.toLocaleString("pt-BR")} km · {vehicle.city}</p><strong>{money.format(vehicle.price)}</strong><p className={styles.matchReason}>Boa compatibilidade com sua busca.</p></div></article>)}</div>
    </section>

    <section className={styles.storeSection} id="lojas">
      <div className={styles.sectionHeadingRow}><div><p className={styles.eyebrow}>LOJAS VERIFICADAS</p><h2>Compre com mais confiança.</h2></div></div>
      {stores.length?<div className={styles.storeGrid}>{stores.map(store=><article className={styles.storeCard} key={store.id}><div className={styles.storeLogo}>AP</div><div><p>✓ VERIFICADA</p><h3>{store.name}</h3><span>{store.city}{store.state?`, ${store.state}`:""}</span></div></article>)}</div>:<div className={styles.emptyState}><strong>Lojas parceiras aparecerão aqui.</strong></div>}
    </section>

    <section className={styles.smartSection} id="sobre"><div><p className={styles.eyebrow}>AUTOPONTE</p><h2>Seu próximo carro começa com uma decisão melhor.</h2><p>Busca inteligente, Match explicável e jornada de negociação em um único ambiente.</p></div><Link className={styles.primaryAction} href="/atendimento">Começar agora</Link></section>
  </main>
}
