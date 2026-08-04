import { getDb } from "../../../db";
import { consignments } from "../../../db/schema";
import { createMatchesForVehicle } from "../../../lib/match-engine";

type ConsignmentRow = {
  id: string;
  owner_name: string;
  city: string;
  vehicle_name: string;
  year: string;
  mileage: number;
  plate: string;
  asking_price: number;
  minimum_price: number;
  photo_keys: string;
  status: string;
  created_at: string;
};

async function tokenHash(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureConsignmentsTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS consignments (
    id text PRIMARY KEY NOT NULL,
    access_token_hash text NOT NULL,
    owner_name text NOT NULL,
    whatsapp text NOT NULL,
    email text NOT NULL,
    city text NOT NULL,
    vehicle_name text NOT NULL,
    year text NOT NULL,
    mileage integer NOT NULL,
    plate text DEFAULT '' NOT NULL,
    asking_price integer NOT NULL,
    minimum_price integer NOT NULL,
    photo_keys text DEFAULT '[]' NOT NULL,
    status text DEFAULT 'intake_received' NOT NULL,
    consent_at text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`).run();
}

function text(payload: FormData, key: string) {
  const item = payload.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function integer(payload: FormData, key: string) {
  return Number(text(payload, key));
}

function safeFilename(filename: string) {
  return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-90) || "foto.jpg";
}

export async function POST(request: Request) {
  try {
    const { env } = await import("cloudflare:workers");
    const payload = await request.formData();
    const required = ["ownerName", "whatsapp", "email", "city", "vehicleName", "year"];
    if (required.some((field) => !text(payload, field))) {
      return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }
    if (text(payload, "consent") !== "yes") {
      return Response.json({ error: "O consentimento é necessário para registrar a solicitação." }, { status: 400 });
    }
    const photos = payload.getAll("photos").filter((item): item is File => item instanceof File);
    const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (photos.length < 4 || photos.length > 8) {
      return Response.json({ error: "Envie entre 4 e 8 fotos para a pré-avaliação." }, { status: 400 });
    }
    if (photos.some((photo) => !acceptedTypes.has(photo.type) || photo.size > 8 * 1024 * 1024)) {
      return Response.json({ error: "Use apenas JPG, PNG ou WebP, com até 8 MB por foto." }, { status: 400 });
    }
    const mileage = integer(payload, "mileage");
    const askingPrice = integer(payload, "askingPrice");
    const minimumPrice = integer(payload, "minimumPrice");
    if (![mileage, askingPrice, minimumPrice].every(Number.isFinite) || mileage < 0 || askingPrice < 1000 || minimumPrice < 1000 || minimumPrice > askingPrice) {
      return Response.json({ error: "Revise quilometragem, preço anunciado e valor mínimo." }, { status: 400 });
    }

    await ensureConsignmentsTable(env.DB);
    const id = crypto.randomUUID();
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const photoKeys: string[] = [];
    for (const [index, photo] of photos.entries()) {
      const key = `consignments/${id}/pre-evaluation/${String(index + 1).padStart(2, "0")}-${safeFilename(photo.name)}`;
      await env.BUCKET.put(key, photo.stream(), {
        httpMetadata: { contentType: photo.type },
        customMetadata: { consignmentId: id, stage: "pre-evaluation", uploadedAt: new Date().toISOString() },
      });
      photoKeys.push(key);
    }
    await getDb(env.DB).insert(consignments).values({
      id,
      accessTokenHash: await tokenHash(token),
      ownerName: text(payload, "ownerName"),
      whatsapp: text(payload, "whatsapp"),
      email: text(payload, "email"),
      city: text(payload, "city"),
      vehicleName: text(payload, "vehicleName"),
      year: text(payload, "year"),
      mileage,
      plate: text(payload, "plate").toUpperCase(),
      askingPrice,
      minimumPrice,
      photoKeys: JSON.stringify(photoKeys),
      consentAt: new Date().toISOString(),
    });

    let potentialBuyers = 0;
    try {
      potentialBuyers = await createMatchesForVehicle(env.DB, { sourceType: "consignment", sourceId: id, label: text(payload, "vehicleName"), price: askingPrice, city: text(payload, "city"), year: Number(text(payload, "year").match(/\d{4}/)?.[0] || 0), mileage });
    } catch (matchError) { console.error("consignment matching failed", matchError); }

    return Response.json({
      protocol: id.slice(0, 8).toUpperCase(),
      portalUrl: `/consignacao?protocolo=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
      potentialBuyers,
      nextStep: `Solicitação e ${photoKeys.length} fotos recebidas. A AutoPonte fará a pré-análise e, se o veículo avançar, confirmará contrato, vistoria e sessão profissional de fotos antes da publicação.`,
    }, { status: 201 });
  } catch (error) {
    console.error("consignment intake failed", error);
    return Response.json({ error: "Não foi possível registrar a consignação agora. Tente novamente em alguns minutos." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { env } = await import("cloudflare:workers");
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    const token = url.searchParams.get("token")?.trim() ?? "";
    if (!id || !token) return Response.json({ error: "Acesso incompleto." }, { status: 400 });

    await ensureConsignmentsTable(env.DB);
    const item = await env.DB.prepare(`SELECT id, owner_name, city, vehicle_name, year, mileage, plate, asking_price, minimum_price, photo_keys, status, created_at
      FROM consignments WHERE id = ? AND access_token_hash = ? LIMIT 1`).bind(id, await tokenHash(token)).first<ConsignmentRow>();
    if (!item) return Response.json({ error: "Link inválido ou expirado." }, { status: 404 });
    let photoCount = 0;
    try { photoCount = (JSON.parse(item.photo_keys || "[]") as string[]).length; } catch { photoCount = 0; }
    return Response.json({ ...item, photo_keys: undefined, photo_count: photoCount });
  } catch (error) {
    console.error("consignment lookup failed", error);
    return Response.json({ error: "Não foi possível carregar o acompanhamento." }, { status: 500 });
  }
}
