import { getDb } from "../../../db";
import { tradeIns } from "../../../db/schema";
import { getFipeQuote, parseFipeSubmission } from "../../../lib/fipe";
import { createMatchesForVehicle } from "../../../lib/match-engine";

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function value(form: FormData, name: string) {
  const item = form.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function safeFilename(filename: string) {
  return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-90) || "foto.jpg";
}

function estimateTrade(referencePrice: number, mileage: number, condition: string, photoCount: number) {
  const conditionFactor = condition === "excellent" ? 0.91 : condition === "good" ? 0.85 : 0.76;
  const mileagePenalty = Math.min(0.08, Math.max(0, mileage - 60000) / 1_500_000);
  const documentationReserve = 0.02;
  const photoConfidence = photoCount >= 6 ? 0.01 : 0;
  const midpoint = referencePrice * (conditionFactor - mileagePenalty - documentationReserve + photoConfidence);
  return {
    estimatedMin: Math.max(3000, Math.round(midpoint * 0.96 / 500) * 500),
    estimatedMax: Math.max(3500, Math.round(midpoint * 1.04 / 500) * 500),
  };
}

async function ensureTradeInTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS trade_ins (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    whatsapp text NOT NULL,
    email text NOT NULL,
    city text NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    version text NOT NULL,
    year text NOT NULL,
    mileage integer NOT NULL,
    condition text NOT NULL,
    desired_vehicle text DEFAULT '' NOT NULL,
    reference_price integer NOT NULL,
    fipe_code text DEFAULT '' NOT NULL,
    fipe_month text DEFAULT '' NOT NULL,
    estimated_min integer NOT NULL,
    estimated_max integer NOT NULL,
    photo_keys text NOT NULL,
    status text DEFAULT 'pre_evaluated' NOT NULL,
    lead_category text DEFAULT 'new' NOT NULL,
    next_follow_up text DEFAULT '' NOT NULL,
    last_contact_at text DEFAULT '' NOT NULL,
    notes text DEFAULT '' NOT NULL,
    consent_at text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`).run();
}

export async function POST(request: Request) {
  try {
    const { env } = await import("cloudflare:workers");
    const form = await request.formData();
    const required = ["name", "whatsapp", "email", "city", "mileage", "condition", "desiredVehicle", "brandCode", "modelCode", "yearCode"];
    const missing = required.find((field) => !value(form, field));
    if (missing) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    if (value(form, "consent") !== "yes") return Response.json({ error: "O consentimento é necessário para enviar a avaliação." }, { status: 400 });

    const photos = form.getAll("photos").filter((item): item is File => item instanceof File);
    if (photos.length < 3 || photos.length > MAX_PHOTOS) {
      return Response.json({ error: "Envie entre 3 e 8 fotos do veículo." }, { status: 400 });
    }
    if (photos.some((photo) => !ACCEPTED_TYPES.has(photo.type) || photo.size > MAX_FILE_SIZE)) {
      return Response.json({ error: "Use apenas JPG, PNG ou WebP, com até 8 MB por foto." }, { status: 400 });
    }

    const mileage = Number(value(form, "mileage"));
    if (!Number.isFinite(mileage) || mileage < 0 || mileage > 900000) {
      return Response.json({ error: "Revise a quilometragem informada." }, { status: 400 });
    }

    let fipe;
    try {
      fipe = await getFipeQuote(value(form, "brandCode"), value(form, "modelCode"), value(form, "yearCode"));
    } catch {
      // The browser already obtained the automatic quote. This validated fallback
      // keeps the trade-in flow available if the FIPE provider blocks Worker egress.
      fipe = parseFipeSubmission({
        price: value(form, "fipePrice"), brand: value(form, "fipeBrand"), model: value(form, "fipeModel"),
        modelYear: value(form, "fipeModelYear"), fuel: value(form, "fipeFuel"),
        fipeCode: value(form, "fipeCode"), referenceMonth: value(form, "fipeMonth"),
      });
    }
    const referencePrice = fipe.price;

    const id = crypto.randomUUID();
    const photoKeys: string[] = [];
    for (const [index, photo] of photos.entries()) {
      const key = `trade-ins/${id}/${String(index + 1).padStart(2, "0")}-${safeFilename(photo.name)}`;
      await env.BUCKET.put(key, photo.stream(), {
        httpMetadata: { contentType: photo.type },
        customMetadata: { tradeInId: id, uploadedAt: new Date().toISOString() },
      });
      photoKeys.push(key);
    }

    const estimate = estimateTrade(referencePrice, mileage, value(form, "condition"), photos.length);
    const leadCategory = value(form, "condition") === "excellent" ? "hot" : value(form, "condition") === "good" ? "warm" : "review";
    const nextFollowUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await ensureTradeInTable(env.DB);
    await getDb(env.DB).insert(tradeIns).values({
      id,
      name: value(form, "name"),
      whatsapp: value(form, "whatsapp"),
      email: value(form, "email"),
      city: value(form, "city"),
      brand: fipe.brand,
      model: fipe.model,
      version: fipe.model,
      year: `${fipe.modelYear} ${fipe.fuel}`,
      mileage,
      condition: value(form, "condition"),
      desiredVehicle: value(form, "desiredVehicle"),
      referencePrice,
      fipeCode: fipe.fipeCode,
      fipeMonth: fipe.referenceMonth,
      estimatedMin: estimate.estimatedMin,
      estimatedMax: estimate.estimatedMax,
      photoKeys: JSON.stringify(photoKeys),
      leadCategory,
      nextFollowUp,
      consentAt: new Date().toISOString(),
    });

    let potentialBuyers = 0;
    try {
      potentialBuyers = await createMatchesForVehicle(env.DB, { sourceType: "trade_in", sourceId: id, label: `${fipe.brand} ${fipe.model}`, price: estimate.estimatedMax, city: value(form, "city"), year: fipe.modelYear, mileage, fuel: fipe.fuel });
    } catch (matchError) { console.error("trade-in matching failed", matchError); }

    return Response.json({
      protocol: id.slice(0, 8).toUpperCase(),
      fipeValue: referencePrice,
      fipeCode: fipe.fipeCode,
      fipeMonth: fipe.referenceMonth,
      ...estimate,
      potentialBuyers,
      nextStep: `Recebemos seu cadastro vinculado ao ${value(form, "desiredVehicle")}. A equipe AutoPonte revisará as fotos e entrará em contato para confirmar a negociação, os documentos e a vistoria cautelar.`,
    }, { status: 201 });
  } catch (error) {
    console.error("trade-in submission failed", error);
    const isLocalPreview = new URL(request.url).hostname === "terminal.local";
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json({ error: isLocalPreview ? `Prévia local: ${detail}` : "Não foi possível salvar a avaliação agora. Tente novamente em alguns minutos." }, { status: 500 });
  }
}
