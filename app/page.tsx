"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { catalogVehicles as vehicles } from "../lib/catalog";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type TradeResult = {
  protocol: string;
  fipeValue: number;
  fipeCode: string;
  fipeMonth: string;
  estimatedMin: number;
  estimatedMax: number;
  nextStep: string;
};

type FipeOption = { codigo: string; nome: string };
type FipeQuote = {
  price: number;
  priceFormatted: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
};

async function fetchFipe<T>(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  let response = await fetch(`/api/fipe?${query}`);
  if (!response.ok) {
    const paths: Record<string, string> = {
      brands: "/marcas",
      models: `/marcas/${params.brand}/modelos`,
      years: `/marcas/${params.brand}/modelos/${params.model}/anos`,
      quote: `/marcas/${params.brand}/modelos/${params.model}/anos/${params.year}`,
    };
    response = await fetch(`https://parallelum.com.br/fipe/api/v1/carros${paths[params.resource]}`, { headers: { Accept: "application/json" } });
  }
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) {
    const message = payload.error && !payload.error.toLowerCase().includes("internal error") ? payload.error : "A consulta FIPE está temporariamente indisponível.";
    throw new Error(message);
  }
  if (params.resource === "models") return ((payload as unknown as { modelos?: T }).modelos ?? payload) as T;
  if (params.resource === "quote") {
    const raw = payload as unknown as { Valor?: string; Marca?: string; Modelo?: string; AnoModelo?: number; Combustivel?: string; CodigoFipe?: string; MesReferencia?: string };
    if (raw.Valor) return {
      price: Number(raw.Valor.replace(/[^0-9,]/g, "").replace(",", ".")), priceFormatted: raw.Valor,
      brand: raw.Marca, model: raw.Modelo, modelYear: raw.AnoModelo, fuel: raw.Combustivel,
      fipeCode: raw.CodigoFipe, referenceMonth: raw.MesReferencia,
    } as T;
  }
  return payload;
}

async function preparePhoto(file: File) {
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} ultrapassa o limite de 8 MB.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((item) => item ? resolve(item) : reject(new Error("Não foi possível preparar a imagem.")), "image/jpeg", .76));
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [type, setType] = useState("Todos");
  const [selected, setSelected] = useState<(typeof vehicles)[number] | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [downPayment, setDownPayment] = useState(25000);
  const [months, setMonths] = useState(48);
  const [tradePhotos, setTradePhotos] = useState<File[]>([]);
  const [tradePreviews, setTradePreviews] = useState<string[]>([]);
  const [tradeStatus, setTradeStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [tradeError, setTradeError] = useState("");
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [photosProcessing, setPhotosProcessing] = useState(false);
  const [fipeBrands, setFipeBrands] = useState<FipeOption[]>([]);
  const [fipeModels, setFipeModels] = useState<FipeOption[]>([]);
  const [fipeYears, setFipeYears] = useState<FipeOption[]>([]);
  const [fipeBrandCode, setFipeBrandCode] = useState("");
  const [fipeModelCode, setFipeModelCode] = useState("");
  const [fipeYearCode, setFipeYearCode] = useState("");
  const [fipeQuote, setFipeQuote] = useState<FipeQuote | null>(null);
  const [fipeLoading, setFipeLoading] = useState(false);
  const [fipeError, setFipeError] = useState("");

  useEffect(() => {
    return () => tradePreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [tradePreviews]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = Number(params.get("vehicle"));
    const matchedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (!matchedVehicle) return;
    setSelected(matchedVehicle);
    setDownPayment(Math.round(matchedVehicle.price * .2));
    const score = Number(params.get("match"));
    setMatchScore(Number.isFinite(score) && score > 0 ? Math.min(100, score) : null);
  }, []);

  useEffect(() => {
    let active = true;
    fetchFipe<FipeOption[]>({ resource: "brands" })
      .then((items) => { if (active) setFipeBrands(items); })
      .catch((error) => { if (active) setFipeError(error instanceof Error ? error.message : "Não foi possível carregar as marcas."); });
    return () => { active = false; };
  }, []);

  async function chooseFipeBrand(brandCode: string) {
    setFipeBrandCode(brandCode);
    setFipeModelCode("");
    setFipeYearCode("");
    setFipeModels([]);
    setFipeYears([]);
    setFipeQuote(null);
    setFipeError("");
    if (!brandCode) return;
    setFipeLoading(true);
    try {
      setFipeModels(await fetchFipe<FipeOption[]>({ resource: "models", brand: brandCode }));
    } catch (error) {
      setFipeError(error instanceof Error ? error.message : "Não foi possível carregar os modelos.");
    } finally {
      setFipeLoading(false);
    }
  }

  async function chooseFipeModel(modelCode: string) {
    setFipeModelCode(modelCode);
    setFipeYearCode("");
    setFipeYears([]);
    setFipeQuote(null);
    setFipeError("");
    if (!modelCode) return;
    setFipeLoading(true);
    try {
      setFipeYears(await fetchFipe<FipeOption[]>({ resource: "years", brand: fipeBrandCode, model: modelCode }));
    } catch (error) {
      setFipeError(error instanceof Error ? error.message : "Não foi possível carregar os anos.");
    } finally {
      setFipeLoading(false);
    }
  }

  async function chooseFipeYear(yearCode: string) {
    setFipeYearCode(yearCode);
    setFipeQuote(null);
    setFipeError("");
    if (!yearCode) return;
    setFipeLoading(true);
    try {
      setFipeQuote(await fetchFipe<FipeQuote>({ resource: "quote", brand: fipeBrandCode, model: fipeModelCode, year: yearCode }));
    } catch (error) {
      setFipeError(error instanceof Error ? error.message : "Não foi possível obter o valor FIPE.");
    } finally {
      setFipeLoading(false);
    }
  }

  async function selectTradePhotos(files: FileList | null) {
    tradePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    const selectedFiles = Array.from(files ?? []).slice(0, 8);
    setPhotosProcessing(true);
    setTradeError("");
    try {
      const preparedFiles = await Promise.all(selectedFiles.map(preparePhoto));
      setTradePhotos(preparedFiles);
      setTradePreviews(preparedFiles.map((file) => URL.createObjectURL(file)));
      setTradeError(preparedFiles.length > 0 && preparedFiles.length < 3 ? "Envie pelo menos 3 fotos para continuar." : "");
    } catch (error) {
      setTradePhotos([]);
      setTradePreviews([]);
      setTradeError(error instanceof Error ? error.message : "Não foi possível preparar as fotos.");
    } finally {
      setPhotosProcessing(false);
    }
  }

  async function submitTradeIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fipeQuote) {
      setTradeError("Selecione marca, modelo e ano para consultar o valor FIPE.");
      return;
    }
    if (tradePhotos.length < 3) {
      setTradeError("Envie pelo menos 3 fotos do veículo.");
      return;
    }

    setTradeStatus("sending");
    setTradeError("");
    setTradeResult(null);

    try {
      const form = new FormData(event.currentTarget);
      tradePhotos.forEach((photo) => form.append("photos", photo));
      const response = await fetch("/api/trade-in", { method: "POST", body: form });
      const responseText = await response.text();
      let payload: TradeResult & { error?: string };
      try {
        payload = JSON.parse(responseText) as TradeResult & { error?: string };
      } catch {
        throw new Error(response.ok ? "Resposta inválida do servidor." : "As fotos ficaram grandes demais. Selecione imagens menores e tente novamente.");
      }
      if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a avaliação.");
      setTradeResult(payload);
      setTradeStatus("done");
    } catch (error) {
      setTradeStatus("error");
      setTradeError(error instanceof Error ? error.message : "Não foi possível concluir a avaliação.");
    }
  }

  const filtered = useMemo(
    () => vehicles.filter((vehicle) => type === "Todos" || vehicle.type === type),
    [type],
  );

  const estimate = selected
    ? Math.max(0, selected.price - downPayment) * (1 + 0.018 * months) / months
    : 0;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="AutoPonte Veículos — início">
          <span>AutoPonte</span> Veículos
        </a>
        <nav aria-label="Navegação principal">
          <a href="#estoque">Comprar</a>
          <a href="#troca">Avaliar troca</a>
          <a href="/atendimento">Atendimento IA</a>
          <a href="#consignacao">Consignação</a>
          <details className="nav-more">
            <summary>Mais <span>⌄</span></summary>
            <div>
              <a href="#quem-somos">Quem somos</a>
              <a href="#como-funciona">Como funciona</a>
              <a href="#lojistas">Para lojistas</a>
              <a href="/demonstracao">Demonstração</a>
            </div>
          </details>
        </nav>
        <div className="header-access">
          <a className="partner-access" href="/crm"><span>Área da loja</span><small>Acesso restrito</small></a>
          <button className="header-cta" onClick={() => scrollToId("estoque")}>Ver estoque</button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Marketplace regional • ABC Paulista</p>
          <h1>Seu próximo carro começa <em>aqui</em></h1>
          <p className="hero-text">
            Carros de lojas parceiras, atendimento inteligente e simulação rápida pelo WhatsApp.
          </p>
          <div className="hero-actions">
            <a className="primary hero-link" href="/atendimento">Encontrar meu carro</a>
            <button className="secondary" onClick={() => scrollToId("troca")}>Avaliar meu carro</button>
          </div>
          <div className="trust-row" aria-label="Diferenciais da plataforma">
            <span>✓ Estoque verificado</span>
            <span>• Atendimento rápido</span>
            <span>• Lojas parceiras</span>
          </div>
        </div>
        <div className="hero-media" role="img" aria-label="SUV azul em ambiente urbano contemporâneo">
          <div className="image-chip"><strong>Atendimento inteligente</strong><small>Humano quando você precisar</small></div>
        </div>
      </section>

      <section className="home-story" id="quem-somos">
        <div className="home-story-art" role="img" aria-label="Ilustração em preto e branco conectando atendimento, veículos, cidade e loja" />
        <div className="home-story-wash" />
        <div className="home-story-brand"><strong>AutoPonte</strong><span>Conectando caminhos.</span></div>
        <article className="home-story-copy">
          <p>01 • ENTENDEMOS</p>
          <h2>Tudo começa com uma conversa.</h2>
          <span>Nosso atendimento inteligente entende orçamento, preferências, prazo, troca e a real necessidade de cada cliente.</span>
          <div className="home-story-actions"><a href="/quem-somos">Ver apresentação completa</a><a className="outline" href="/atendimento">Começar uma conversa</a></div>
        </article>
        <div className="home-story-points" aria-label="Como a AutoPonte atua">
          <div><b>01</b><strong>Entendemos</strong><span>Perfil, orçamento e momento de compra.</span></div>
          <div><b>02</b><strong>Encontramos</strong><span>Veículos e oportunidades compatíveis.</span></div>
          <div><b>03</b><strong>Conectamos</strong><span>Cliente e loja com todo o contexto.</span></div>
        </div>
      </section>

      <section className="match-invite">
        <div><p className="eyebrow dark">AutoPonte Match</p><h2>Uma busca que continua trabalhando por você.</h2><p>Conte orçamento, uso e preferências. O sistema recomenda carros do estoque e cruza seu perfil com novas trocas e consignações, sempre explicando os motivos da compatibilidade.</p></div>
        <a href="/atendimento">Iniciar atendimento inteligente →</a>
      </section>

      <section className="inventory-section" id="estoque">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Seleção inicial</p>
            <h2>Carros prontos para começar uma conversa</h2>
          </div>
          <label className="filter">
            Categoria
            <select value={type} onChange={(event) => setType(event.target.value)}>
              {['Todos', 'SUV', 'Sedan', 'Hatch'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="vehicle-grid">
          {filtered.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.id}>
              <div className="vehicle-photo"><img src={vehicle.image} alt={`${vehicle.name}, veículo ilustrativo`} /></div>
              <div className="vehicle-body">
                <span className="vehicle-badge">{vehicle.badge}</span>
                <h3>{vehicle.name}</h3>
                <p>{vehicle.year} <span>•</span> {vehicle.km}</p>
                <p className="vehicle-city">{vehicle.city}</p>
                <div className="vehicle-footer">
                  <strong>{money.format(vehicle.price)}</strong>
                  <button onClick={() => { setSelected(vehicle); setDownPayment(Math.round(vehicle.price * .2)); }}>Simular</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="prototype-note">Veículos e valores demonstrativos para apresentação do protótipo.</p>
      </section>

      <section className="trade-section" id="troca">
        <div className="trade-intro">
          <p className="eyebrow">Seu carro pode ser a entrada</p>
          <h2>Envie as fotos e receba uma pré-avaliação para troca.</h2>
          <p className="trade-lead">
            A AutoPonte organiza os dados do seu veículo, analisa as informações enviadas e apresenta uma faixa preliminar de compra. Assim, você já chega à negociação do próximo carro com uma referência.
          </p>
          <div className="trade-benefits">
            <article><span>01</span><div><strong>Cadastro rápido</strong><small>Dados básicos e fotos pelo celular.</small></div></article>
            <article><span>02</span><div><strong>Análise digital</strong><small>Quilometragem, conservação e referência de mercado.</small></div></article>
            <article><span>03</span><div><strong>Oferta confirmada</strong><small>Após documentos e inspeção presencial.</small></div></article>
          </div>
          <aside className="resale-note">
            <strong>Aquisição vinculada à troca</strong>
            <p>A AutoPonte não compra veículos isoladamente. A aquisição acontece somente se o carro entrar como parte do pagamento de outro veículo anunciado na plataforma e a negociação principal for concluída.</p>
          </aside>
        </div>

        <form className="trade-form" onSubmit={submitTradeIn}>
          <div className="form-heading">
            <span>Pré-avaliação gratuita</span>
            <strong>Leva cerca de 3 minutos</strong>
          </div>

          <fieldset>
            <legend>Sobre o veículo</legend>
            <div className="form-grid two">
              <label>Marca
                <select value={fipeBrandCode} onChange={(event) => chooseFipeBrand(event.target.value)} required>
                  <option value="">{fipeBrands.length ? "Selecione a marca" : "Carregando marcas…"}</option>
                  {fipeBrands.map((item) => <option value={item.codigo} key={item.codigo}>{item.nome}</option>)}
                </select>
              </label>
              <label>Modelo e versão
                <select value={fipeModelCode} onChange={(event) => chooseFipeModel(event.target.value)} required disabled={!fipeBrandCode || fipeLoading}>
                  <option value="">Selecione o modelo</option>
                  {fipeModels.map((item) => <option value={item.codigo} key={item.codigo}>{item.nome}</option>)}
                </select>
              </label>
              <label>Ano e combustível
                <select value={fipeYearCode} onChange={(event) => chooseFipeYear(event.target.value)} required disabled={!fipeModelCode || fipeLoading}>
                  <option value="">Selecione o ano</option>
                  {fipeYears.map((item) => <option value={item.codigo} key={item.codigo}>{item.nome}</option>)}
                </select>
              </label>
              <label>Quilometragem<input name="mileage" required type="number" min="0" max="900000" placeholder="Ex.: 48000" /></label>
              <label>Estado geral
                <select name="condition" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  <option value="excellent">Excelente</option>
                  <option value="good">Bom, com marcas leves</option>
                  <option value="regular">Regular, precisa de reparos</option>
                </select>
              </label>
            </div>
            <label>Veículo que deseja comprar
              <select name="desiredVehicle" required defaultValue="">
                <option value="" disabled>Selecione o carro de interesse</option>
                {vehicles.map((vehicle) => <option value={vehicle.name} key={vehicle.id}>{vehicle.name} — {money.format(vehicle.price)}</option>)}
              </select>
              <small>A avaliação da troca será vinculada a esta oportunidade de compra.</small>
            </label>
            {fipeLoading && <p className="fipe-loading">Consultando a Tabela FIPE…</p>}
            {fipeError && <p className="form-error" role="alert">{fipeError} Tente novamente em instantes.</p>}
            {fipeQuote && <div className="fipe-card" aria-live="polite">
              <div><span>Valor FIPE automático</span><strong>{money.format(fipeQuote.price)}</strong></div>
              <dl><div><dt>Código FIPE</dt><dd>{fipeQuote.fipeCode}</dd></div><div><dt>Referência</dt><dd>{fipeQuote.referenceMonth}</dd></div></dl>
              <small>{fipeQuote.brand} • {fipeQuote.model} • {fipeQuote.modelYear} {fipeQuote.fuel}</small>
              <input type="hidden" name="brandCode" value={fipeBrandCode} />
              <input type="hidden" name="modelCode" value={fipeModelCode} />
              <input type="hidden" name="yearCode" value={fipeYearCode} />
              <input type="hidden" name="fipePrice" value={fipeQuote.price} />
              <input type="hidden" name="fipeBrand" value={fipeQuote.brand} />
              <input type="hidden" name="fipeModel" value={fipeQuote.model} />
              <input type="hidden" name="fipeModelYear" value={fipeQuote.modelYear} />
              <input type="hidden" name="fipeFuel" value={fipeQuote.fuel} />
              <input type="hidden" name="fipeCode" value={fipeQuote.fipeCode} />
              <input type="hidden" name="fipeMonth" value={fipeQuote.referenceMonth} />
            </div>}
          </fieldset>

          <fieldset>
            <legend>Fotos do carro</legend>
            <label className="upload-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectTradePhotos(event.target.files)} />
              <span className="upload-icon">＋</span>
              <strong>Adicionar de 3 a 8 fotos</strong>
              <small>Frente, traseira, laterais, interior e eventuais avarias • até 8 MB cada</small>
            </label>
            {tradePreviews.length > 0 && <div className="photo-previews" aria-label="Fotos selecionadas">
              {tradePreviews.map((preview, index) => <img src={preview} alt={`Foto selecionada ${index + 1}`} key={preview} />)}
            </div>}
          </fieldset>

          <fieldset>
            <legend>Seus dados</legend>
            <div className="form-grid two">
              <label>Nome<input name="name" required autoComplete="name" /></label>
              <label>WhatsApp<input name="whatsapp" required type="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
              <label>E-mail<input name="email" required type="email" autoComplete="email" /></label>
              <label>Cidade<input name="city" required defaultValue="São Bernardo do Campo" /></label>
            </div>
            <label className="consent"><input name="consent" type="checkbox" required value="yes" /><span>Autorizo o tratamento destes dados e imagens para avaliação, contato comercial e apresentação da proposta, conforme a política de privacidade.</span></label>
          </fieldset>

          <div className="trade-conditions">
            <strong>Condições obrigatórias para aceitar o carro na troca</strong>
            <ul>
              <li>Negociação do veículo de interesse concluída com uma loja parceira.</li>
              <li>Vistoria cautelar completamente aprovada, sem apontamentos graves.</li>
              <li>Ausência de histórico de leilão, restrições relevantes ou comprometimento estrutural.</li>
              <li>Documentação, propriedade, débitos e informações fornecidas devidamente confirmados.</li>
            </ul>
          </div>

          {tradeError && <p className="form-error" role="alert">{tradeError}</p>}
          <button className="trade-submit" disabled={tradeStatus === "sending" || photosProcessing} type="submit">
            {photosProcessing ? "Preparando fotos…" : tradeStatus === "sending" ? "Analisando informações…" : "Receber minha pré-avaliação"}
          </button>

          {tradeResult && <div className="trade-result" role="status">
            <span>Resultado da pré-avaliação</span>
            <div className="trade-comparison">
              <div><small>Valor FIPE automático</small><strong>{money.format(tradeResult.fipeValue)}</strong><em>Código {tradeResult.fipeCode} • {tradeResult.fipeMonth}</em></div>
              <div className="offer-value"><small>Oferta preliminar condicionada à troca</small><strong>{money.format(tradeResult.estimatedMin)} a {money.format(tradeResult.estimatedMax)}</strong></div>
            </div>
            <p className="trade-gap">Diferença para a FIPE: {money.format(Math.max(0, tradeResult.fipeValue - tradeResult.estimatedMax))} a {money.format(Math.max(0, tradeResult.fipeValue - tradeResult.estimatedMin))}, considerando margem de revenda, conservação, quilometragem e custos da operação.</p>
            <p>{tradeResult.nextStep}</p>
            <small>Protocolo {tradeResult.protocol}. O valor FIPE é uma referência, não um preço obrigatório. A aquisição somente ocorrerá com a conclusão da compra do veículo de interesse e aprovação integral da vistoria, sem apontamentos graves ou histórico de leilão. A faixa não constitui oferta vinculante.</small>
          </div>}
        </form>
      </section>

      <section className="process-section" id="como-funciona">
        <p className="eyebrow">Uma ponte até a loja certa</p>
        <h2>Da descoberta à negociação, sem repetir a história</h2>
        <div className="steps">
          <article><span>01</span><h3>Você escolhe</h3><p>Encontre um veículo e conte o que precisa: entrada, parcela, troca e prazo.</p></article>
          <article><span>02</span><h3>A AutoPonte organiza</h3><p>Nosso assistente virtual prepara um resumo e mostra uma estimativa orientativa.</p></article>
          <article><span>03</span><h3>A loja finaliza</h3><p>Com sua autorização, a loja recebe o contexto e assume negociação, crédito e contrato.</p></article>
        </div>
      </section>

      <section className="consignment-invite" id="consignacao">
        <div>
          <p className="eyebrow dark">AutoPonte Consigna</p>
          <h2>Consignou seu carro? Acompanhe cada decisão.</h2>
          <p>Visualizações, propostas, manutenções, documentos e retirada reunidos em um canal oficial entre você e a AutoPonte.</p>
          <div className="consignment-links"><a href="/consignacao/solicitar">Quero consignar meu carro</a><a className="outline" href="/consignacao">Ver demonstração do portal</a></div>
        </div>
        <div className="consignment-preview" aria-label="Resumo do painel de consignação">
          <span>Anúncio ativo</span>
          <strong>482 visualizações</strong>
          <div><b>1 proposta</b><small>Aguardando decisão</small></div>
          <div><b>1 manutenção</b><small>Aguardando autorização</small></div>
        </div>
      </section>

      <section className="partner-section" id="lojistas">
        <div>
          <p className="eyebrow dark">Piloto para lojas parceiras</p>
          <h2>Seu estoque com mais alcance e conversas mais qualificadas.</h2>
          <p>A AutoPonte divulga, atende e organiza. Sua equipe negocia e fecha.</p>
        </div>
        <div className="partner-offer">
          <strong>60 dias sem mensalidade</strong>
          <span>Sem exclusividade • comissão apenas em venda atribuída</span>
          <button onClick={() => alert("Demonstração: o cadastro de lojistas será conectado ao WhatsApp na versão operacional.")}>Quero participar do piloto</button>
        </div>
      </section>

      <section className="legal-note">
        <strong>Transparência em primeiro lugar.</strong>
        <p>As simulações de crédito e avaliações de troca são preliminares. Financiamento, preço de compra, parcelas e condições finais dependem de análise, documentação, inspeção do veículo, instituição financeira e loja responsável.</p>
      </section>

      <footer>
        <a className="brand" href="#inicio"><span>AutoPonte</span> Veículos</a>
        <p>Protótipo comercial • São Bernardo do Campo, SP</p>
        <p>Nome provisório sujeito à pesquisa e registro de marca.</p>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="simulation-title">
            <button className="modal-close" aria-label="Fechar simulação" onClick={() => setSelected(null)}>×</button>
            {matchScore && <span className="modal-match">Recomendado para você • {matchScore}% compatível</span>}
            <p className="eyebrow dark">Simulação orientativa</p>
            <h2 id="simulation-title">{selected.name}</h2>
            <p className="modal-price">{money.format(selected.price)}</p>
            <label>Entrada aproximada <strong>{money.format(downPayment)}</strong>
              <input type="range" min="0" max={Math.round(selected.price * .7)} step="1000" value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} />
            </label>
            <label>Prazo
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[24, 36, 48, 60].map((item) => <option value={item} key={item}>{item} meses</option>)}
              </select>
            </label>
            <div className="estimate"><span>Parcela estimada</span><strong>{money.format(estimate)}</strong><small>Cálculo demonstrativo com taxa hipotética. Não é proposta nem aprovação.</small></div>
            <button className="primary full" onClick={() => alert("Demonstração: na versão operacional, esta ação abrirá o atendimento oficial da AutoPonte no WhatsApp.")}>Continuar pelo WhatsApp</button>
          </section>
        </div>
      )}
    </main>
  );
}
