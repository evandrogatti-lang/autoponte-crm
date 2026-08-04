export type BuyerProfile = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  budget_max: number;
  vehicle_types: string;
  preferred_models: string;
  min_year: number;
  max_mileage: number;
  transmission: string;
  fuel: string;
  use_case: string;
  purchase_timeline: string;
  alerts_consent: number;
};

export type MatchableVehicle = {
  sourceType: "catalog" | "consignment" | "trade_in";
  sourceId: string;
  label: string;
  price: number;
  city: string;
  year: number;
  mileage: number;
  type?: string;
  transmission?: string;
  fuel?: string;
  useCases?: readonly string[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseTypes(value: string) {
  try { return JSON.parse(value || "[]") as string[]; } catch { return []; }
}

function guessedType(label: string) {
  const name = normalize(label);
  if (name.includes("suv")) return "SUV";
  if (name.includes("sedan") || name.includes("civic") || name.includes("corolla")) return "Sedan";
  if (name.includes("hatch")) return "Hatch";
  if (name.includes("pickup") || name.includes("picape")) return "Picape";
  return "Outro";
}

export function scoreBuyerVehicle(profile: BuyerProfile, vehicle: MatchableVehicle) {
  let score = 0;
  const reasons: string[] = [];
  const types = parseTypes(profile.vehicle_types).map(normalize);
  const vehicleType = normalize(vehicle.type || guessedType(vehicle.label));
  const preferred = normalize(profile.preferred_models);
  const label = normalize(vehicle.label);

  if (vehicle.price <= profile.budget_max) {
    score += 25;
    reasons.push("dentro do orçamento");
  } else if (vehicle.price <= profile.budget_max * 1.08) {
    score += 12;
    reasons.push("próximo do orçamento");
  }

  if (preferred && preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3 && label.includes(term.trim()))) {
    score += 25;
    reasons.push("modelo solicitado");
  } else if (!types.length || types.includes(vehicleType)) {
    score += 20;
    reasons.push("categoria preferida");
  }

  if (!profile.min_year || vehicle.year >= profile.min_year) {
    score += 15;
    reasons.push("ano compatível");
  }
  if (!profile.max_mileage || vehicle.mileage <= profile.max_mileage) {
    score += 12;
    reasons.push("quilometragem compatível");
  }
  if (normalize(profile.city) === normalize(vehicle.city)) {
    score += 8;
    reasons.push("na mesma cidade");
  }
  if (profile.transmission === "Indiferente" || !vehicle.transmission || normalize(profile.transmission) === normalize(vehicle.transmission)) {
    score += 8;
    if (profile.transmission !== "Indiferente") reasons.push("câmbio desejado");
  }
  if (profile.use_case && vehicle.useCases?.some((item) => normalize(item) === normalize(profile.use_case))) {
    score += 7;
    reasons.push("adequado ao uso informado");
  }
  return { score: Math.min(100, score), reasons };
}

export async function ensureMatchTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS buyer_profiles (
      id text PRIMARY KEY NOT NULL, name text NOT NULL, whatsapp text NOT NULL, email text NOT NULL,
      city text NOT NULL, budget_max integer NOT NULL, down_payment integer DEFAULT 0 NOT NULL,
      max_monthly_payment integer DEFAULT 0 NOT NULL, vehicle_types text DEFAULT '[]' NOT NULL,
      preferred_models text DEFAULT '' NOT NULL, min_year integer DEFAULT 0 NOT NULL,
      max_mileage integer DEFAULT 999999 NOT NULL, transmission text DEFAULT 'Indiferente' NOT NULL,
      fuel text DEFAULT 'Indiferente' NOT NULL, use_case text DEFAULT '' NOT NULL,
      purchase_timeline text DEFAULT 'Sem urgência' NOT NULL, alerts_consent integer DEFAULT 0 NOT NULL,
      consent_at text NOT NULL, status text DEFAULT 'active' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS vehicle_matches (
      id text PRIMARY KEY NOT NULL, buyer_profile_id text NOT NULL, source_type text NOT NULL,
      source_id text NOT NULL, vehicle_label text NOT NULL, vehicle_price integer DEFAULT 0 NOT NULL,
      score integer NOT NULL, reasons text DEFAULT '[]' NOT NULL, message_draft text DEFAULT '' NOT NULL,
      status text DEFAULT 'review_pending' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      reviewed_at text DEFAULT '' NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS vehicle_matches_source_buyer_unique ON vehicle_matches (source_type, source_id, buyer_profile_id)"),
  ]);
}

function draftMessage(profile: BuyerProfile, vehicle: MatchableVehicle) {
  const stage = vehicle.sourceType === "consignment"
    ? "entrou em pré-avaliação para consignação"
    : vehicle.sourceType === "trade_in"
      ? "pode entrar no estoque por meio de uma troca"
      : "está disponível no estoque";
  return `Olá, ${profile.name.split(" ")[0]}! Um ${vehicle.label}, compatível com a sua busca, ${stage} na AutoPonte. O veículo ainda depende das validações aplicáveis. Gostaria de receber os detalhes quando estiver aprovado?`;
}

export async function createMatchesForVehicle(db: D1Database, vehicle: MatchableVehicle) {
  await ensureMatchTables(db);
  const result = await db.prepare("SELECT * FROM buyer_profiles WHERE status = 'active'").all<BuyerProfile>();
  let created = 0;
  for (const profile of result.results ?? []) {
    const match = scoreBuyerVehicle(profile, vehicle);
    if (match.score < 55) continue;
    await db.prepare(`INSERT OR IGNORE INTO vehicle_matches
      (id, buyer_profile_id, source_type, source_id, vehicle_label, vehicle_price, score, reasons, message_draft, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), profile.id, vehicle.sourceType, vehicle.sourceId, vehicle.label, vehicle.price,
        match.score, JSON.stringify(match.reasons), draftMessage(profile, vehicle), profile.alerts_consent ? "review_pending" : "internal_only")
      .run();
    created += 1;
  }
  return created;
}

export async function createMatchesForBuyer(db: D1Database, profile: BuyerProfile) {
  await ensureMatchTables(db);
  const vehicles: MatchableVehicle[] = [];
  const consignments = await db.prepare("SELECT id, vehicle_name, asking_price, city, year, mileage FROM consignments ORDER BY created_at DESC LIMIT 100").all<Record<string, string | number>>();
  for (const item of consignments.results ?? []) vehicles.push({ sourceType: "consignment", sourceId: String(item.id), label: String(item.vehicle_name), price: Number(item.asking_price), city: String(item.city), year: Number(String(item.year).match(/\d{4}/)?.[0] || 0), mileage: Number(item.mileage) });
  const trades = await db.prepare("SELECT id, brand, model, estimated_max, city, year, mileage FROM trade_ins ORDER BY created_at DESC LIMIT 100").all<Record<string, string | number>>();
  for (const item of trades.results ?? []) vehicles.push({ sourceType: "trade_in", sourceId: String(item.id), label: `${item.brand} ${item.model}`, price: Number(item.estimated_max), city: String(item.city), year: Number(String(item.year).match(/\d{4}/)?.[0] || 0), mileage: Number(item.mileage) });
  let created = 0;
  for (const vehicle of vehicles) {
    const match = scoreBuyerVehicle(profile, vehicle);
    if (match.score < 55) continue;
    await db.prepare(`INSERT OR IGNORE INTO vehicle_matches
      (id, buyer_profile_id, source_type, source_id, vehicle_label, vehicle_price, score, reasons, message_draft, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), profile.id, vehicle.sourceType, vehicle.sourceId, vehicle.label, vehicle.price,
        match.score, JSON.stringify(match.reasons), draftMessage(profile, vehicle), profile.alerts_consent ? "review_pending" : "internal_only")
      .run();
    created += 1;
  }
  return created;
}
