export const BRL_CURRENCY = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const BR_NUMBER = new Intl.NumberFormat("pt-BR");

export function formatBRL(value: unknown) {
  const amount = Number(value);
  return BRL_CURRENCY.format(Number.isFinite(amount) ? amount : 0);
}
