"use client";

import { useEffect, useState } from "react";

const scenes = [
  { kicker: "Quem somos", title: "Somos a ponte entre pessoas, carros e boas oportunidades.", text: "A AutoPonte conecta compradores, proprietários e lojas parceiras em uma jornada mais clara, rápida e humana.", focus: "center" },
  { kicker: "01 • Entendemos", title: "Tudo começa com uma conversa.", text: "Nosso atendimento inteligente entende orçamento, preferências, prazo, troca e a real necessidade de cada cliente.", focus: "left" },
  { kicker: "02 • Encontramos", title: "A tecnologia procura a melhor combinação.", text: "A IA compara o perfil com o estoque e novas oportunidades de troca ou consignação — sempre explicando os motivos.", focus: "center" },
  { kicker: "03 • Avaliamos", title: "Fotos, FIPE e critérios transparentes.", text: "Na troca ou consignação, organizamos imagens, referências de mercado e pré-avaliações, condicionadas à vistoria e aos documentos.", focus: "inspect" },
  { kicker: "04 • Conectamos", title: "A loja recebe o contexto completo.", text: "O CRM leva histórico, interesse, simulação e próximos passos para que a equipe comercial finalize sem fazer o cliente recomeçar.", focus: "right" },
  { kicker: "AutoPonte", title: "Do primeiro contato ao fechamento.", text: "Mais inteligência para vender. Mais transparência para comprar. Mais controle para quem confia seu carro à nossa operação.", focus: "wide" },
];

export default function QuemSomosPage() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setScene((current) => (current + 1) % scenes.length), 5200);
    return () => window.clearInterval(timer);
  }, [playing]);
  const item = scenes[scene];
  function restart() { setScene(0); setPlaying(true); }
  return <main className="story-page">
    <header className="story-header"><a className="brand" href="/"><span>AutoPonte</span> Veículos</a><div><span>Apresentação institucional</span><a href="/">Voltar ao portal</a></div></header>
    <section className="story-shell">
      <div className={`story-stage focus-${item.focus}`} aria-live="polite">
        <div className="paper-grain" />
        <div className="watercolor-image" role="img" aria-label="Ilustração em aquarela mostrando compra, avaliação e consignação de veículos" />
        <div className="ink-wash wash-one" /><div className="ink-wash wash-two" />
        <article className="story-copy" key={scene}><p>{item.kicker}</p><h1>{item.title}</h1><span>{item.text}</span>{scene === scenes.length - 1 && <a href="/atendimento">Começar uma conversa →</a>}</article>
        <div className="story-brand"><b>AutoPonte</b><span>Conectando caminhos.</span></div>
        <div className="story-progress">{scenes.map((_, index) => <button key={index} className={index === scene ? "active" : ""} onClick={() => { setScene(index); setPlaying(false); }} aria-label={`Ir para cena ${index + 1}`}><i /></button>)}</div>
      </div>
      <div className="story-controls"><div><button onClick={() => setPlaying((value) => !value)}>{playing ? "❚❚ Pausar" : "▶ Reproduzir"}</button><button onClick={restart}>↻ Reiniciar</button></div><p>Duração aproximada: 31 segundos • Sem áudio • Formato adaptável para apresentações e mídias sociais</p></div>
      <section className="story-use"><div><p className="eyebrow dark">Uma história, vários formatos</p><h2>Pronta para apresentar a AutoPonte.</h2></div><div className="story-format-grid"><article><b>16:9</b><span>Site, YouTube e apresentações</span></article><article><b>9:16</b><span>Reels, Stories e TikTok</span></article><article><b>1:1</b><span>Feed e campanhas patrocinadas</span></article></div><p className="story-export-note">Esta é a versão animada para o portal. A mesma narrativa e arte podem ser exportadas em vídeos específicos para cada canal na etapa de produção de mídia.</p></section>
    </section>
  </main>;
}
