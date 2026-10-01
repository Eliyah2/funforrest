import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Vul deze twee waarden in .env (zie .env.example). Zonder hen draait de app
// gewoon verder in de lokale modus (opslag per apparaat).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Profiel uit de database omzetten naar het user-object dat de app al kent.
export function profileToUser(profile, email) {
  if (!profile) return null;
  const since = profile.member_since || new Date().toISOString();
  return {
    id: profile.id,
    email: profile.email || email,
    name: profile.name || "",
    visits: profile.visits || 0,
    notifications: profile.notifications !== false,
    passNumber: profile.pass_number || null,
    memberSinceISO: since,
    memberSince: new Date(since).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}
