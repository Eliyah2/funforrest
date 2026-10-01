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
export const ACCESS_CODE = "FUNFOREST-ABO";

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

/** Gebruik van een code tellen (na een geslaagde registratie). */
export async function registerCodeUse(input) {
  if (!supabaseEnabled) return;
  try {
    await supabase.rpc("use_activation_code", { p_code: normalize(input) });
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
