export function normalizeClientName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesClientNamePrefix(name: string, query: string) {
  const normalizedQuery = normalizeClientName(query);
  return normalizedQuery.length > 0 && normalizeClientName(name).startsWith(normalizedQuery);
}
