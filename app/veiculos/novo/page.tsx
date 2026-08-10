import { eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { partners } from "../../../db/partner-schema";
import { InventoryShell } from "../../../features/vehicle-registry/components/InventoryShell";
import { VehicleCreateForm } from "../../../features/vehicle-registry/components/VehicleCreateForm";
import styles from "../../../features/vehicle-registry/components/VehicleRegistry.module.css";

export default async function NewVehiclePage() {
  await requireChatGPTUser("/veiculos/novo");
  const partnerRows = await getDb().select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.status, "active")).limit(500);
  return <InventoryShell breadcrumb={<><a href="/crm">Mission Control</a><b>›</b><a href="/veiculos">Estoque</a><b>›</b><span>Cadastrar veículo</span></>}>
    <div className={styles.pageHeader}><div><h1>Cadastrar veículo</h1><p>Dados estruturados para estoque, parceiros, consignação e troca.</p></div><div className={styles.pageActions}><a href="/crm">← Voltar ao CRM</a><a href="/veiculos">Cancelar e voltar</a><a href="/parceiros/novo">Cadastrar parceiro</a></div></div>
    <VehicleCreateForm partners={partnerRows}/>
  </InventoryShell>;
}
