import { listPublicMarketplaceVehicles } from "../../lib/marketplace/public-vehicles";
import AutoPonteExperience from "./experience";
import ThemeSwitcher from "./ThemeSwitcher";

export default async function HomeVisionPreview() {
  const vehicles = await listPublicMarketplaceVehicles(20);
  return (
    <>
      <AutoPonteExperience initialVehicles={vehicles} />
      <ThemeSwitcher />
    </>
  );
}
