// Toegang tot de app: alleen vaste-abonnementhouders mogen een account maken.
//
// WIJZIG HIER DE CODE die op de seizoenkaart / het abonnement staat.
// Zet je de code op "" (leeg), dan verdwijnt registreren helemaal en kan er
// alleen nog ingelogd worden met een bestaand account.
//
// Let op: dit is een zachte poort in de app. Wil je het waterdicht, dan komt
// er een server-backend bij (bijv. Supabase) die de codes controleert.
export const ACCESS_CODE = "FUNFOREST-ABO";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** Mag er überhaupt nog geregistreerd worden? */
export function registrationOpen() {
  return normalize(ACCESS_CODE).length > 0;
}

/** Klopt de ingevulde activatiecode? */
export function checkAccessCode(input) {
  if (!registrationOpen()) return false;
  const given = normalize(input);
  return given.length > 0 && given === normalize(ACCESS_CODE);
}

/** Korte tekst voor in het scherm. */
export function accessHint() {
  return registrationOpen()
    ? "Alleen abonnementhouders: vul de activatiecode van je seizoenkaart in."
    : "Alleen bestaande accounts kunnen inloggen. Nieuwe accounts maakt het park aan.";
}
