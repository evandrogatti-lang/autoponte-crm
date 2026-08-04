import { eq, and } from "drizzle-orm";
import { getDb } from "../../../db";
import { consignments } from "../../../db/schema";
import { createMatchesForVehicle } from "../../../lib/match-engine";
import { uploadVehiclePhoto } from "../../../lib/supabase-server";
async function tokenHash(token: string) { const bytes = new TextEncoder().encode(token); const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""); }
function text(payload: FormData, key: string) { const item = payload.get(key); return typeof item === "string" ? item.trim() : ""; }
function integer(payload: FormData, key: string) { return Number(text(payload, key)); }
function safeFilename(filename: string) { return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-90) || "foto.jpg"; }
export async function POST(request: Request) {
  try {
    const payload = await request.formData(); const required = ["ownerName", "whatsapp", "email", "city", "vehicleName", "year"];
    if (required.some((field) => !text(payload, field))) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    if (text(payload, "consent") !== "yes") return Response.json({ error: "O consentimento é necessário para registrar a solicitação." }, { status: 400 });
    const photos = payload.getAll("photos").filter((item): item is File => item instanceof File); const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (photos.length < 4 || photos.length > 8) return Response.json({ error: "Envie entre 4 e 8 fotos para a pré-avaliação." }, { status: 400 });
    if (photos.some((photo) => !accepted.has(photo.type) || photo.size > 8 * 1024 * 1024)) return Response.json({ error: "Use apenas JPG, PNG ou WebP, com até 8 MB por foto." }, { status: 400 });
    const mileage = integer(payload, "mileage"), askingPrice = integer(payload, "askingPrice"), minimumPrice = integer(payload, "minimumPrice");
    if (![mileage, askingPrice, minimumPrice].every(Number.isFinite) || mileage < 0 || askingPrice < 1000 || minimumPrice < 1000 || minimumPrice > askingPrice) return Response.json({ error: "Revise quilometragem, preço anunciado e valor mínimo." }, { status: 400 });
    const id = crypto.randomUUID(), token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""), photoKeys: string[] = [];
    for (const [index, photo] of photos.entries()) { const key = `consignments/${id}/pre-evaluation/${String(index + 1).padStart(2, "0")}-${safeFilename(photo.name)}`; await uploadVehiclePhoto(key, photo); photoKeys.push(key); }
    await getDb().insert(consignments).values({ id, accessTokenHash: await tokenHash(token), ownerName: text(payload, "ownerName"), whatsapp: text(payload, "whatsapp"), email: text(payload, "email"), city: text(payload, "city"), vehicleName: text(payload, "vehicleName"), year: text(payload, "year"), mileage, plate: text(payload, "plate").toUpperCase(), askingPrice, minimumPrice, photoKeys: JSON.stringify(photoKeys), consentAt: new Date().toISOString() });
    let potentialBuyers = 0; try { potentialBuyers = await createMatchesForVehicle({ sourceType: "consignment", sourceId: id, label: text(payload, "vehicleName"), price: askingPrice, city: text(payload, "city"), year: Number(text(payload, "year").match(/\d{4}/)?.[0] || 0), mileage }); } catch (error) { console.error("consignment matching failed", error); }
    return Response.json({ protocol: id.slice(0, 8).toUpperCase(), portalUrl: `/consignacao?protocolo=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, potentialBuyers, nextStep: `Solicitação e ${photoKeys.length} fotos recebidas.` }, { status: 201 });
  } catch (error) { console.error("consignment intake failed", error); return Response.json({ error: "Não foi possível registrar a consignação agora." }, { status: 500 }); }
}
export async function GET(request: Request) {
  try { const url = new URL(request.url), id = url.searchParams.get("id")?.trim() ?? "", token = url.searchParams.get("token")?.trim() ?? ""; if (!id || !token) return Response.json({ error: "Acesso incompleto." }, { status: 400 });
    const [item] = await getDb().select().from(consignments).where(and(eq(consignments.id, id), eq(consignments.accessTokenHash, await tokenHash(token)))).limit(1); if (!item) return Response.json({ error: "Link inválido ou expirado." }, { status: 404 });
    let photoCount = 0; try { photoCount = (JSON.parse(item.photoKeys || "[]") as string[]).length; } catch {} return Response.json({ id: item.id, owner_name: item.ownerName, city: item.city, vehicle_name: item.vehicleName, year: item.year, mileage: item.mileage, plate: item.plate, asking_price: item.askingPrice, minimum_price: item.minimumPrice, status: item.status, created_at: item.createdAt, photo_count: photoCount });
  } catch (error) { console.error("consignment lookup failed", error); return Response.json({ error: "Não foi possível carregar o acompanhamento." }, { status: 500 }); }
}
