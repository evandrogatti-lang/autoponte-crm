const genericVehicleTerms = new Set(["suv", "seminovo", "seminovos"]);

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const hasVehicleData = (brand: string, model: string) => normalize(brand).length > 0 || normalize(model).length > 0;

const normalizedBrandModelSpecialties = (specialties: string[]) =>
  specialties.map(normalize).filter((specialty) => specialty && !genericVehicleTerms.has(specialty));

export type SellerEligibilityInput = {
  availabilityStatus: string;
  capacity: number;
  specialties: string[];
  activeAssignments: number;
};

export type OpportunityEligibilityInput = {
  brand: string;
  model: string;
};

export function matchesOpportunitySpecialty(
  opportunity: OpportunityEligibilityInput,
  specialties: string[],
): boolean {
  if (!hasVehicleData(opportunity.brand, opportunity.model)) return true;

  const scopedSpecialties = normalizedBrandModelSpecialties(specialties);
  if (scopedSpecialties.length === 0) return true;

  const vehicleText = normalize(`${opportunity.brand} ${opportunity.model}`);
  return scopedSpecialties.some((specialty) =>
    vehicleText.includes(specialty) || specialty.includes(vehicleText),
  );
}

export function isSellerEligibleForOpportunity(
  seller: SellerEligibilityInput,
  opportunity: OpportunityEligibilityInput,
): boolean {
  if (seller.availabilityStatus !== "available") return false;
  if (seller.activeAssignments >= seller.capacity) return false;
  return matchesOpportunitySpecialty(opportunity, seller.specialties);
}
