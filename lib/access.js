// Toegang tot de app: alleen abonnementhouders mogen een account maken.
//
// Zo werkt het:
// 1. Met Supabase worden de codes in de tabel  activation_codes  bewaard. Je
//    broer maakt ze zelf aan op het beheerscherm (of in de SQL Editor) en
//    geeft ze aan gasten. De lijst is met RLS niet uit te lezen door gasten.
// 2. Zonder Supabase (of als de code niet gevonden wordt) blijft de statische
//    noodcode hieronder werken. Zet je die op "" en staat Supabase uit, dan is
//    registreren helemaal gesloten.
//
// WIJZIG DE NOODCODE HIER:
// Niet als platte tekst: dan staat hij in de repository én in de bundel die
// iedere bezoeker kan downloaden. Zet je eigen code in `.env` als
// EXPO_PUBLIC_ACCESS_CODE (of in Vercel → Environment Variables); staat die
// niet ingevuld, dan valt de app terug op de ingebouwde code hieronder.
//
// Eerlijk: dit is verbergen, geen echte beveiliging — een statische app kan
// geen geheim bewaren. De échte controle zit in Supabase (activation_codes):
// die codes zijn per gast, worden server-side gecontroleerd en kun je per
// persoon uitzetten. Zonder Supabase blijft dit de enige poort.
const XOR_KEY = 90;
const FALLBACK_CODE = [
  28, 15, 20, 28, 21, 8, 31, 9, 14, 119, 27, 24, 21,
]
  .map((n) => String.fromCharCode(n ^ XOR_KEY))
  .join("");

export const ACCESS_CODE = process.env.EXPO_PUBLIC_ACCESS_CODE || FALLBACK_CODE;

import { supabase, supabaseEnabled } from "@/lib/supabase";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** Mag er überhaupt nog geregistreerd worden? */
export function registrationOpen() {
  return supabaseEnabled || normalize(ACCESS_CODE).length > 0;
}

/**
 * Klopt de ingevulde activatiecode?
 * - Supabase aan: de database controleert (lijst blijft verborgen)
 * - anders: de statische noodcode hierboven
 */
export async function checkAccessCode(input) {
  const given = normalize(input);
  if (!given) return false;

  if (supabaseEnabled) {
    try {
      const { data, error } = await supabase.rpc("is_valid_activation_code", {
        p_code: given,
      });
      if (!error && typeof data === "boolean") return data;
    } catch {
      // geen verbinding: val terug op de noodcode
    }
  }
  return given === normalize(ACCESS_CODE);
}

/** Gebruik van een code vastleggen (na een geslaagde registratie).
 *  Het e-mailadres wordt erbij gezet zodat beheer ziet welke code bij welke
 *  gast hoort; gaat alleen naar de tabel, niet terug naar de app. */
export async function registerCodeUse(input, email) {
  if (!supabaseEnabled) return;
  try {
    await supabase.rpc("use_activation_code", {
      p_code: normalize(input),
      p_email: email || null,
    });
  } catch {
    // tellen is geen reden om de registratie te laten mislukken
  }
}

/** Een nieuwe code maken, bijv. FF-7K2M9Q */
export function generateActivationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // geen verwarrende 0/O/1/I
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FF-${body}`;
}

/** Korte tekst voor in het scherm. */
export function accessHint() {
  if (!registrationOpen()) {
    return "Alleen bestaande accounts kunnen inloggen. Nieuwe accounts maakt het park aan.";
  }
  return supabaseEnabled
    ? "Alleen abonnementhouders: vul de activatiecode van je seizoenkaart in."
    : "Alleen abonnementhouders: vul de activatiecode van je seizoenkaart in.";
}
