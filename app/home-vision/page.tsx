import { listPublicMarketplaceVehicles } from "../../lib/marketplace/public-vehicles";
import AutoPonteExperience from "./experience";

export default async function HomeVisionPreview() {
  const vehicles = await listPublicMarketplaceVehicles(8);
  return <AutoPonteExperience initialVehicles={vehicles} />;
}
