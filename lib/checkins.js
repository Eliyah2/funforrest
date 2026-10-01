// Check-in via QR-scan: de code op de seizoenkaart verwijst naar /checkin, waar
// het bezoek op het account wordt gezet en de bezoekenteller telt. Er is geen
// knop meer waarmee een gast zelf bezoeken bijschrijft — alleen de scan telt,
// en die telt maximaal één keer per dag.

/** Kaartnummer FF-###### afgeleid van het e-mailadres (altijd hetzelfde). */
export function passIdFor(email = "") {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return `FF-${String(hash % 1000000).padStart(6, "0")}`;
}

/** Kaartnummer zoals het in de QR en de database staat (FF-123456). */
export function normalizePass(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Vandaag als YYYY-MM-DD (lokale tijd). */
export function todayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Mooie teller: "1 bezoek", "12 bezoeken". */
export function visitsLabel(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 bezoek" : `${n} bezoeken`;
}

/** Tijdstip als HH:MM. */
export function hhmm(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Link die in de QR-code staat. Op het web wijst hij naar waar de app draait
 * (localhost bij testen, de Vercel-url live), zodat scannen altijd op de juiste
 * plek uitkomt.
 */
export function checkinUrl(passId) {
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "https://funforest-app.vercel.app";
  return `${origin}/checkin?pass=${encodeURIComponent(normalizePass(passId))}`;
}
