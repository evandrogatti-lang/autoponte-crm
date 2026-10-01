import { getDb } from "../../../db";
import { resolvePublicIntake } from "../../../lib/tenant-runtime";
import { opportunityEvents, tradeIns } from "../../../db/schema";
import { getFipeQuote, parseFipeSubmission } from "../../../lib/fipe";
import { createMatchesForVehicle } from "../../../lib/match-engine";
import { uploadVehiclePhoto } from "../../../lib/supabase-server";
import { evaluateOpportunity } from "../../../lib/ade";
import { opportunitySignalsFromRow } from "../../../lib/opportunities";

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
function value(form: FormData, name: string) { const item = form.get(name); return typeof item === "string" ? item.trim() : ""; }
function safeFilename(filename: string) { return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-90) || "foto.jpg"; }
function estimateTrade(referencePrice: number, mileage: number, condition: string, photoCount: number) {
  const conditionFactor = condition === "excellent" ? 0.91 : condition === "good" ? 0.85 : 0.76;
  const mileagePenalty = Math.min(0.08, Math.max(0, mileage - 60000) / 1_500_000);
  const midpoint = referencePrice * (conditionFactor - mileagePenalty - 0.02 + (photoCount >= 6 ? 0.01 : 0));
  return { estimatedMin: Math.max(3000, Math.round(midpoint * 0.96 / 500) * 500), estimatedMax: Math.max(3500, Math.round(midpoint * 1.04 / 500) * 500) };
}
export async function POST(request: Request) {
  try {
    await resolvePublicIntake("trade_in");
    const form = await request.formData();
    const required = ["name", "whatsapp", "email", "city", "mileage", "condition", "desiredVehicle", "brandCode", "modelCode", "yearCode"];
    if (required.find((field) => !value(form, field))) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    if (value(form, "consent") !== "yes") return Response.json({ error: "O consentimento é necessário para enviar a avaliação." }, { status: 400 });
    const photos = form.getAll("photos").filter((item): item is File => item instanceof File);
    if (photos.length < 3 || photos.length > MAX_PHOTOS) return Response.json({ error: "Envie entre 3 e 8 fotos do veículo." }, { status: 400 });
    if (photos.some((photo) => !ACCEPTED_TYPES.has(photo.type) || photo.size > MAX_FILE_SIZE)) return Response.json({ error: "Use apenas JPG, PNG ou WebP, com até 8 MB por foto." }, { status: 400 });
    const mileage = Number(value(form, "mileage"));
    if (!Number.isFinite(mileage) || mileage < 0 || mileage > 900000) return Response.json({ error: "Revise a quilometragem informada." }, { status: 400 });
    let fipe;
    try { fipe = await getFipeQuote(value(form, "brandCode"), value(form, "modelCode"), value(form, "yearCode")); }
    catch { fipe = parseFipeSubmission({ price: value(form, "fipePrice"), brand: value(form, "fipeBrand"), model: value(form, "fipeModel"), modelYear: value(form, "fipeModelYear"), fuel: value(form, "fipeFuel"), fipeCode: value(form, "fipeCode"), referenceMonth: value(form, "fipeMonth") }); }
    const id = crypto.randomUUID(); const photoKeys: string[] = [];
    for (const [index, photo] of photos.entries()) { const key = `trade-ins/${id}/${String(index + 1).padStart(2, "0")}-${safeFilename(photo.name)}`; await uploadVehiclePhoto(key, photo); photoKeys.push(key); }
    const estimate = estimateTrade(fipe.price, mileage, value(form, "condition"), photos.length);
    const leadCategory = value(form, "condition") === "excellent" ? "hot" : value(form, "condition") === "good" ? "warm" : "review";
    const nextFollowUp = new Date(Date.now() + 3 * 86400000).toISOString();
    const createdAt = new Date();
    const opportunity = { id, name: value(form, "name"), whatsapp: value(form, "whatsapp"), email: value(form, "email"), city: value(form, "city"), brand: fipe.brand, model: fipe.model, version: fipe.model, year: `${fipe.modelYear} ${fipe.fuel}`, mileage, condition: value(form, "condition"), desiredVehicle: value(form, "desiredVehicle"), referencePrice: fipe.price, fipeCode: fipe.fipeCode, fipeMonth: fipe.referenceMonth, estimatedMin: estimate.estimatedMin, estimatedMax: estimate.estimatedMax, photoKeys: JSON.stringify(photoKeys), status: "pre_evaluated", leadCategory, nextFollowUp, lastContactAt: "", notes: "", nextAction: "", consentAt: createdAt.toISOString(), createdAt, updatedAt: createdAt };
    const assessment = evaluateOpportunity(opportunitySignalsFromRow(opportunity), createdAt);
    const context = await getDb().transaction(async (tx) => {
      const route = await resolvePublicIntake("trade_in", tx);
      await tx.insert(tradeIns).values({
        tenantId: route.tenantId,
        ...opportunity,
        probability: assessment.dna.chance,
        confidenceScore: assessment.confidence.score,
        temperatureScore: assessment.temperature.score,
        momentum: assessment.momentum,
        priorityScore: assessment.dna.priorityScore,
        recommendationAction: assessment.recommendation.action,
        recommendationChannel: assessment.recommendation.channel,
        recommendationUrgency: assessment.recommendation.urgency,
        recommendationRationale: assessment.recommendation.rationale,
      });
      await tx.insert(opportunityEvents).values({ id: crypto.randomUUID(), opportunityId: id, eventType: "created", title: "Oportunidade criada", description: `Avaliação online recebida para ${fipe.brand} ${fipe.model}.`, metadata: JSON.stringify({ source: "trade_in_form" }), actorName: "Sistema AutoPonte", actorEmail: "", createdAt });
      return route;
    });
    let potentialBuyers = 0;
    try { potentialBuyers = await createMatchesForVehicle({ sourceType: "trade_in", sourceId: id, label: `${fipe.brand} ${fipe.model}`, price: estimate.estimatedMax, city: value(form, "city"), year: fipe.modelYear, mileage, fuel: fipe.fuel }, context.tenantId); } catch (error) { console.error("trade-in matching failed", error); }
    return Response.json({ protocol: id.slice(0, 8).toUpperCase(), fipeValue: fipe.price, fipeCode: fipe.fipeCode, fipeMonth: fipe.referenceMonth, ...estimate, potentialBuyers, nextStep: `Recebemos seu cadastro vinculado ao ${value(form, "desiredVehicle")}. A equipe AutoPonte revisará as fotos e entrará em contato.` }, { status: 201 });
  } catch (error) { console.error("trade-in submission failed", error); return Response.json({ error: "Não foi possível salvar a avaliação agora. Verifique a configuração do banco e do Storage." }, { status: 500 }); }
}
