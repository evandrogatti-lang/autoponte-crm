"use client";

import { FormEvent, useEffect, useState } from "react";

type Result = { protocol: string; portalUrl: string; nextStep: string };

export default function RequestConsignmentPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photosProcessing, setPhotosProcessing] = useState(false);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);

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
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((item) => item ? resolve(item) : reject(new Error("Não foi possível preparar a imagem.")), "image/jpeg", .78));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  }

  async function selectPhotos(files: FileList | null) {
    previews.forEach((preview) => URL.revokeObjectURL(preview));
    setPhotosProcessing(true);
    setError("");
    try {
      const prepared = await Promise.all(Array.from(files ?? []).slice(0, 8).map(preparePhoto));
      setPhotos(prepared);
      setPreviews(prepared.map((file) => URL.createObjectURL(file)));
      if (prepared.length > 0 && prepared.length < 4) setError("Envie pelo menos 4 fotos para a pré-avaliação.");
    } catch (problem) {
      setPhotos([]);
      setPreviews([]);
      setError(problem instanceof Error ? problem.message : "Não foi possível preparar as fotos.");
    } finally {
      setPhotosProcessing(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    if (photos.length < 4) { setStatus("error"); setError("Envie pelo menos 4 fotos para a pré-avaliação."); return; }
    photos.forEach((photo) => form.append("photos", photo));
    try {
      const response = await fetch("/api/consignments", {
        method: "POST",
        body: form,
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar a solicitação.");
      setResult(data);
      setStatus("done");
    } catch (problem) {
      setStatus("error");
      setError(problem instanceof Error ? problem.message : "Não foi possível enviar a solicitação.");
    }
  }

  return <main className="consignment-request-page">
    <header className="consignment-header"><a className="brand" href="/"><span>AutoPonte</span> Consigna</a><a className="request-back" href="/consignacao">Ver demonstração do portal</a></header>
    <section className="request-layout">
      <div className="request-intro"><p className="eyebrow">Consignação acompanhada</p><h1>Comece com uma solicitação simples.</h1><p>As fotos enviadas agora servem para a pré-avaliação. Se o veículo avançar, a vistoria presencial e o AutoPonte Fotos produzirão o material definitivo do anúncio.</p><ol><li><span>01</span>Dados e fotos preliminares do carro</li><li><span>02</span>Pré-análise e contato da AutoPonte</li><li><span>03</span>Contrato, vistoria e AutoPonte Fotos</li><li><span>04</span>Anúncio e acompanhamento pelo portal</li></ol></div>
      <form className="request-form" onSubmit={submit}>
        <div className="form-heading"><span>Solicitar consignação</span><strong>Sem compromisso</strong></div>
        <fieldset><legend>Proprietário</legend><div className="form-grid two"><label>Nome completo<input name="ownerName" required autoComplete="name" /></label><label>WhatsApp<input name="whatsapp" required type="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label><label>E-mail<input name="email" required type="email" autoComplete="email" /></label><label>Cidade<input name="city" required defaultValue="São Bernardo do Campo" /></label></div></fieldset>
        <fieldset><legend>Veículo</legend><div className="form-grid two"><label>Marca, modelo e versão<input name="vehicleName" required placeholder="Ex.: Honda Civic EXL 2.0" /></label><label>Ano/modelo<input name="year" required placeholder="Ex.: 2022/2023" /></label><label>Quilometragem<input name="mileage" required type="number" min="0" max="900000" /></label><label>Placa <small>Opcional nesta etapa</small><input name="plate" maxLength={7} placeholder="ABC1D23" /></label><label>Preço pretendido para anúncio<input name="askingPrice" required type="number" min="1000" step="100" /></label><label>Menor valor que deseja analisar<input name="minimumPrice" required type="number" min="1000" step="100" /></label></div></fieldset>
        <fieldset><legend>Fotos para pré-avaliação</legend><p className="photo-guidance">Envie de 4 a 8 imagens: frente, traseira, duas laterais, interior e painel. Mostre também eventuais avarias. Elas não serão usadas no anúncio sem revisão.</p><label className="upload-zone consignment-upload"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(event.target.files)} /><span className="upload-icon">＋</span><strong>Fotografar ou escolher imagens</strong><small>JPG, PNG ou WebP • redução automática • até 8 MB por arquivo</small></label>{previews.length > 0 && <div className="photo-previews" aria-label="Fotos preliminares selecionadas">{previews.map((preview, index) => <figure key={preview}><img src={preview} alt={`Foto preliminar ${index + 1}`} /><figcaption>{index + 1}</figcaption></figure>)}</div>}<div className="preliminary-photo-note"><strong>Pré-avaliação remota</strong><span>A aprovação para consignação, o estado do veículo e as fotos de publicação dependem da vistoria presencial.</span></div></fieldset>
        <div className="request-info"><strong>Importante</strong><p>O cadastro não publica o veículo automaticamente. Preços, responsabilidades, despesas, retirada e autorização de venda serão definidos no contrato de consignação.</p></div>
        <label className="consent"><input name="consent" type="checkbox" value="yes" required /><span>Autorizo o tratamento dos dados para análise da consignação, contato e criação do acompanhamento, conforme a política de privacidade.</span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="trade-submit" disabled={status === "sending" || photosProcessing}>{photosProcessing ? "Preparando fotos…" : status === "sending" ? "Registrando…" : "Enviar solicitação e fotos"}</button>
        {result && <div className="request-result"><span>Protocolo {result.protocol}</span><strong>Solicitação recebida</strong><p>{result.nextStep}</p><a href={result.portalUrl}>Abrir meu acompanhamento</a><small>Guarde este link. Na operação definitiva, ele será enviado pelo WhatsApp e e-mail após confirmação de identidade.</small></div>}
      </form>
    </section>
  </main>;
}
