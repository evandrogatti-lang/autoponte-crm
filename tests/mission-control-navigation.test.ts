import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mission Control navigation uses approved Portuguese labels and real destinations", () => {
  const shell = read("components/crm/CRMAppShell.tsx");
  const expected = [
    ["Central de Operações", "/crm"], ["Leads novos", "/leads/novos"],
    ["Potenciais clientes", "/leads"], ["Clientes", "/clientes"],
    ["Oportunidades", "/oportunidades"], ["Negociações", "/casos"],
    ["Propostas", "/propostas"], ["Funil de vendas", "/funil"],
    ["Estoque", "/veiculos"], ["Avaliações (trocas)", "/trocas"],
    ["Entrega de veículos", "/entregas"], ["Relatórios", "/relatorios"],
    ["Financeiro", "/financeiro"], ["Configurações", "/configuracoes"],
  ];
  for (const [label, href] of expected) {
    assert.match(shell, new RegExp(`label: "${label.replace(/[()]/g, "\\$&")}", href: "${href}"`));
  }
  for (const route of ["crm", "funil", "agenda", "aprovacoes", "entregas", "leads/novos"]) {
    assert.equal(existsSync(new URL(`../app/${route}/page.tsx`, import.meta.url)), true, `missing /${route}`);
  }
});

test("new operational destinations preserve Supabase identity and RBAC", () => {
  const auth = read("app/app-auth.ts");
  assert.match(auth, /requireSellerOperations[\s\S]*requireCurrentAppUser\(returnTo\)[\s\S]*seller_operations\.manage/);
  for (const route of ["app/funil/page.tsx", "app/agenda/page.tsx", "app/aprovacoes/page.tsx", "app/entregas/page.tsx"]) {
    const source = read(route);
    assert.match(source, /requireCurrentAppUser/);
    assert.match(source, /requirePermission\(user,\s*"seller_operations\.manage"\)/);
    assert.doesNotMatch(source, /requireChatGPTUser|signin-with-chatgpt/);
  }
  assert.match(read("app/configuracoes/page.tsx"), /requireCurrentAppUser\("\/configuracoes"\)[\s\S]*requireSystemAdmin\(user\)/);
  const settingsApi = read("app/api/configuracoes/usuarios/route.ts");
  assert.match(settingsApi, /getCurrentAppUser\(\)/);
  assert.doesNotMatch(settingsApi, /getChatGPTUser|signin-with-chatgpt/);
});
