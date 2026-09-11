import { eq } from "drizzle-orm";
import { requireSellerOperations } from "../../app-auth";
import { getDb } from "../../../db";
import { partners } from "../../../db/partner-schema";
import { InventoryShell } from "../../../features/vehicle-registry/components/InventoryShell";
import { VehicleCreateForm } from "../../../features/vehicle-registry/components/VehicleCreateForm";
import styles from "../../../features/vehicle-registry/components/VehicleRegistry.module.css";
import Link from "next/link";

export default async function NewVehiclePage() {
  await requireSellerOperations("/veiculos/novo");
  const partnerRows = await getDb().select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.status, "active")).limit(500);
  return <InventoryShell breadcrumb={<><Link href="/crm">Mission Control</Link><b>›</b><Link href="/veiculos">Estoque</Link><b>›</b><span>Cadastrar veículo</span></>}>
    <div className={styles.pageHeader}><div><h1>Cadastrar veículo</h1><p>Dados estruturados para estoque, parceiros, consignação e troca.</p></div><div className={styles.pageActions}><Link href="/crm">← Voltar ao CRM</Link><Link href="/veiculos">Cancelar e voltar</Link><Link href="/parceiros/novo">Cadastrar parceiro</Link></div></div>
    <VehicleCreateForm partners={partnerRows}/>
  </InventoryShell>;
}
