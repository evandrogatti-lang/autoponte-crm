import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { partners } from "../../db/partner-schema";
import { vehicles } from "../../db/vehicle-schema";

export type PublicMarketplaceVehicle = {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  mileage: number;
  price: number;
  city: string;
  state: string;
  fuel: string;
  transmission: string;
  bodyType: string;
  color: string;
  optionalItems: string[];
  fipeValue: number;
  listingDate: string;
  partner: {
    id: string;
    name: string;
    city: string;
    state: string;
    verified: true;
  };
};

function parseOptionalItems(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function listPublicMarketplaceVehicles(limit = 60): Promise<PublicMarketplaceVehicle[]> {
  const safeLimit = Math.max(1, Math.min(70, Math.trunc(limit)));

  const rows = await getDb()
    .select({
      id: vehicles.id,
      brand: vehicles.brand,
      model: vehicles.model,
      modelYear: vehicles.modelYear,
      mileage: vehicles.mileage,
      askingPrice: vehicles.askingPrice,
      city: vehicles.city,
      fuel: vehicles.fuel,
      transmission: vehicles.transmission,
      bodyType: vehicles.bodyType,
      color: vehicles.color,
      optionalItems: vehicles.optionalItems,
      fipeValue: vehicles.fipeValue,
      listingDate: vehicles.listingDate,
      partnerId: partners.id,
      partnerName: partners.name,
      partnerCity: partners.city,
      partnerState: partners.state,
    })
    .from(vehicles)
    .innerJoin(
      partners,
      and(eq(vehicles.partnerId, partners.id), eq(partners.status, "active")),
    )
    .where(eq(vehicles.status, "available"))
    .orderBy(desc(vehicles.updatedAt))
    .limit(safeLimit);

  return rows.map((row) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    modelYear: row.modelYear,
    mileage: row.mileage,
    price: row.askingPrice,
    city: row.city || row.partnerCity,
    state: row.partnerState,
    fuel: row.fuel,
    transmission: row.transmission,
    bodyType: row.bodyType,
    color: row.color,
    optionalItems: parseOptionalItems(row.optionalItems),
    fipeValue: row.fipeValue,
    listingDate: row.listingDate,
    partner: {
      id: row.partnerId,
      name: row.partnerName,
      city: row.partnerCity,
      state: row.partnerState,
      verified: true,
    },
  }));
}
