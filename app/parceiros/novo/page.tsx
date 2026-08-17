import { requireChatGPTUser } from "../../chatgpt-auth";
import { PartnerCreateForm } from "../../../features/partner-registry/components/PartnerCreateForm";
import styles from "../../../features/partner-registry/components/PartnerRegistry.module.css";
import Link from "next/link";
export default async function NewPartnerPage(){await requireChatGPTUser("/parceiros/novo");return <main className={styles.page}><div className={styles.topbar}><div><p>REDE AUTOPONTE</p><h1>Cadastrar parceiro</h1></div><div className={styles.actions}><Link href="/crm">Voltar ao CRM</Link><Link href="/parceiros">Voltar aos parceiros</Link></div></div><PartnerCreateForm/></main>}
