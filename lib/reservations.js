import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseEnabled } from "@/lib/supabase";

const STORAGE_KEY = "funforest_reservations";

export const CAPACITY = 6; // plekken per tijdslot

// Lokale datum-sleutel (YYYY-MM-DD) zonder tijdzone-verrassingen
export function dateKey(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseKey(key) {
  return new Date(`${key}T00:00:00`);
}

export function formatBookingDate(date) {
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function rowToReservation(row) {
  return {
    id: row.id,
    date: row.slot_date,
    time: row.slot_time,
    email: row.user_email,
    name: row.user_name,
  };
}

async function loadLocal() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // opslag niet beschikbaar: lege lijst
  }
  return [];
}

async function saveLocal(list) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // tijdelijk niet op te slaan; de app blijft werken
  }
}

/** Alle reserveringen (nodig voor de beschikbaarheidsteller). */
export async function loadReservations() {
  if (supabaseEnabled) {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("slot_date", { ascending: true })
        .order("slot_time", { ascending: true });
      if (error) throw error;
      return (data || []).map(rowToReservation);
    } catch {
      return loadLocal(); // geen verbinding: laatste bekende stand
    }
  }
  return loadLocal();
}

/**
 * Nieuwe reservering. In de Supabase-modus wordt de capaciteit (6 per slot)
 * in de database afgedwongen via de book_slot-functie.
 */
export async function addReservation({ date, time, email, name }) {
  if (supabaseEnabled) {
    const { data, error } = await supabase.rpc("book_slot", {
      p_date: date,
      p_time: time,
      p_email: email,
      p_name: name,
    });
    if (error) throw new Error(error.message);
    return rowToReservation(data);
  }

  const list = await loadLocal();
  const booking = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    time,
    email,
    name,
  };
  await saveLocal([...list, booking]);
  return booking;
}

/** Reservering annuleren. */
export async function cancelReservation(id) {
  if (supabaseEnabled) {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const list = await loadLocal();
  await saveLocal(list.filter((r) => r.id !== id));
}

export async function saveReservations(list) {
  await saveLocal(list);
}

// Reserveringen vanaf vandaag, voor een e-mailadres
export function upcomingFor(reservations, email) {
  const today = dateKey(new Date());
  return reservations
    .filter((r) => r.email === email && r.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
