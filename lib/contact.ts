const EMPTY_MARKERS = new Set(["", "null", "undefined", "n/a", "na", "none", "-", "não informado", "nao informado"]);

export const KNOWN_DDI_CODES = [
  "1","7","20","27","30","31","32","33","34","36","39","40","41","43","44","45","46","47","48","49",
  "51","52","53","54","55","56","57","58","60","61","62","63","64","65","66","81","82","84","86","90","91","92","93","94","95","98",
  "211","212","213","216","218","220","221","222","223","224","225","226","227","228","229","230","231","232","233","234","235","236","237","238","239",
  "240","241","242","243","244","245","246","248","249","250","251","252","253","254","255","256","257","258","260","261","262","263","264","265","266","267","268","269",
  "290","291","297","298","299","350","351","352","353","354","355","356","357","358","359","370","371","372","373","374","375","376","377","378","379","380","381","382","383","385","386","387","389",
  "420","421","423","500","501","502","503","504","505","506","507","508","509","590","591","592","593","594","595","596","597","598","599",
  "670","672","673","674","675","676","677","678","679","680","681","682","683","685","686","687","688","689","690","691","692",
  "850","852","853","855","856","880","886","960","961","962","963","964","965","966","967","968","970","971","972","973","974","975","976","977","992","993","994","995","996","998"
] as const;

export function cleanContactText(value: unknown) {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  return EMPTY_MARKERS.has(clean.toLowerCase()) ? "" : clean;
}

export function normalizeDdi(value: unknown) {
  const digits = cleanContactText(value).replace(/\D/g, "");
  return digits.length >= 1 && digits.length <= 3 ? digits : "";
}

export function normalizeInternationalPhone(value: unknown, ddi?: unknown) {
  const clean = cleanContactText(value);
  if (!clean) return "";
  let digits = clean.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const cleanDdi = normalizeDdi(ddi);
  if (cleanDdi) {
    const national = digits.startsWith(cleanDdi) ? digits.slice(cleanDdi.length) : digits;
    digits = `${cleanDdi}${national.replace(/^0+/, "")}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export function splitInternationalPhone(value: unknown, fallbackDdi = "55") {
  const digits = normalizeInternationalPhone(value);
  if (!digits) return { ddi: fallbackDdi, nationalNumber: "" };
  const match = [...KNOWN_DDI_CODES].sort((a, b) => b.length - a.length).find((code) => digits.startsWith(code));
  const ddi = match ?? fallbackDdi;
  return { ddi, nationalNumber: digits.slice(ddi.length) };
}

export function formatInternationalPhone(value: unknown) {
  const digits = normalizeInternationalPhone(value);
  if (!digits) return "";
  const { ddi, nationalNumber } = splitInternationalPhone(digits);
  if (ddi === "55" && (nationalNumber.length === 10 || nationalNumber.length === 11)) {
    return nationalNumber.length === 11
      ? `+55 (${nationalNumber.slice(0, 2)}) ${nationalNumber.slice(2, 7)}-${nationalNumber.slice(7)}`
      : `+55 (${nationalNumber.slice(0, 2)}) ${nationalNumber.slice(2, 6)}-${nationalNumber.slice(6)}`;
  }
  return `+${ddi} ${nationalNumber}`;
}

export function normalizeBrazilianPhone(value: unknown) {
  const digits = normalizeInternationalPhone(value, "55");
  return digits.startsWith("55") ? digits : "";
}

export function formatBrazilianPhone(value: unknown) {
  return formatInternationalPhone(value);
}

export function normalizeEmail(value: unknown) {
  const clean = cleanContactText(value).toLowerCase();
  if (!clean) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) ? clean : "";
}

export function buildWhatsAppUrl(value: unknown, message = "") {
  const digits = normalizeInternationalPhone(value);
  if (!digits) return null;
  const text = cleanContactText(message);
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function buildMailtoUrl(value: unknown, subject = "") {
  const email = normalizeEmail(value);
  if (!email) return null;
  const cleanSubject = cleanContactText(subject);
  return cleanSubject ? `mailto:${email}?subject=${encodeURIComponent(cleanSubject)}` : `mailto:${email}`;
}

export function buildGmailComposeUrl(value: unknown, subject = "") {
  const email = normalizeEmail(value);
  if (!email) return null;
  const cleanSubject = cleanContactText(subject);
  const params = new URLSearchParams({ view: "cm", fs: "1", to: email });
  if (cleanSubject) params.set("su", cleanSubject);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
