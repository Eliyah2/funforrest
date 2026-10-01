import AsyncStorage from "@react-native-async-storage/async-storage";
import { dateKey } from "@/lib/reservations";

// Open kalender-API van funforest.nl (WordPress REST, CORS toegestaan).
// Let op: opening_time/closing_time in het antwoord zijn UTC; de lokale
// tijden staan in label/display_value ("12:00 - 18:00"). Wij gebruiken label.
const API_URL =
  "https://www.funforest.nl/wp-json/funforest-airtable/v1/calendar";
const CACHE_PREFIX = "funforest_calendar_";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 uur
const CHUNK_DAYS = 60; // de API geeft per stuk data terug
const FETCH_TIMEOUT_MS = 12000;

// Hoe ver gasten vooruit kunnen plannen (zover de kalender gevuld is).
export const HORIZON_DAYS = 150;

export const PARKS = {
  venlo: {
    id: "venlo",
    name: "Fun Forest Venlo",
    address: "Verlengde Trappistenweg 35, 5932 ND Tegelen",
    city: "Tegelen (Venlo)",
    phoneDisplay: "088 - 369 7000",
    phoneHref: "tel:+31883697000",
    email: "venlo@funforest.nl",
    website: "https://www.funforest.nl/venlo",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=Verlengde+Trappistenweg+35+5932+ND+Tegelen",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Verlengde+Trappistenweg+35+5932+ND+Tegelen",
  },
};

export const DEFAULT_PARK = "venlo";

// Alleen gebruikt als de API niet bereikbaar is én er geen cache is.
const FALLBACK_HOURS = {
  2: ["13:00", "18:00"], // woensdag
  5: ["12:00", "18:00"], // zaterdag
  6: ["12:00", "18:00"], // zondag
};

const subscribers = new Set();

// Ontvang een melding zodra verse kalenderdata binnenkomt.
export function subscribeParkDays(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notify(result) {
  subscribers.forEach((cb) => {
    try {
      cb(result);
    } catch {
      // abonnement fout, negeren
    }
  });
}

function pad(n) {
  return `${n}`.padStart(2, "0");
}

function addDays(key, days) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function parseLabel(label) {
  const match = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/.exec(
    String(label || "").trim()
  );
  if (!match) return { open: null, close: null };
  return { open: match[1], close: match[2] };
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("aanvraag")) return "aanvraag";
  if (value.includes("gesloten")) return "gesloten";
  if (value.includes("geopend")) return "open";
  return "onbekend";
}

function parseRecords(records, parkName) {
  const days = {};
  let lastDate = null;
  records.forEach((record) => {
    if (record.location_name !== parkName) return;
    if (!record.date) return;
    const status = normalizeStatus(record.status);
    const { open, close } = parseLabel(record.display_value || record.label);
    days[record.date] = {
      date: record.date,
      status,
      open: status === "open" ? open : null,
      close: status === "open" ? close : null,
      label:
        status === "open" && open && close
          ? `${open} - ${close}`
          : status === "aanvraag"
            ? "Open op aanvraag"
            : status === "gesloten"
              ? "Gesloten"
              : "Nog niet bekend",
    };
    if (!lastDate || record.date > lastDate) lastDate = record.date;
  });
  return { days, lastDate };
}

async function fetchRange(parkId, start, end) {
  const url = `${API_URL}?start=${start}&end=${end}`;
  const controller =
    typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller
    ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    : null;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseRecords(data.records || [], PARKS[parkId].name);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readCache(parkId) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + parkId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.days) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(parkId, days, lastDate) {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + parkId,
      JSON.stringify({ updatedAt: Date.now(), lastDate, days })
    );
  } catch {
    // opslag niet beschikbaar: app blijft werken met geheugendata
  }
}

function fallbackDays(fromKey, toKey) {
  const days = {};
  let cursor = fromKey;
  while (cursor <= toKey) {
    const weekday = new Date(`${cursor}T00:00:00`).getDay();
    const hours = FALLBACK_HOURS[weekday];
    days[cursor] = hours
      ? {
          date: cursor,
          status: "open",
          open: hours[0],
          close: hours[1],
          label: `${hours[0]} - ${hours[1]}`,
          estimated: true,
        }
      : {
          date: cursor,
          status: "aanvraag",
          open: null,
          close: null,
          label: "Open op aanvraag",
          estimated: true,
        };
    cursor = addDays(cursor, 1);
  }
  return days;
}

function lastKeyOf(days) {
  const keys = Object.keys(days);
  return keys.length ? keys.sort()[keys.length - 1] : null;
}

/**
 * Openingstijden per dag voor een park.
 * - verse cache (< 6 uur) wordt direct gebruikt
 * - oude cache wordt meteen getoond én op de achtergrond ververst
 * - geen cache + netwerk falen -> statisch rijtijden (marked estimated)
 */
export async function loadParkDays({
  parkId = DEFAULT_PARK,
  fromKey = dateKey(new Date()),
  toKey = addDays(dateKey(new Date()), HORIZON_DAYS),
  force = false,
} = {}) {
  const cache = await readCache(parkId);
  const coversRange = cache && lastKeyOf(cache.days) >= toKey;
  const fresh =
    cache && Date.now() - cache.updatedAt < TTL_MS && coversRange && !force;

  if (fresh) {
    return { days: cache.days, lastDate: cache.lastDate, source: "cache" };
  }

  if (cache && !force) {
    // meteen tonen wat we hebben, daarna verversen
    refreshParkDays({ parkId, fromKey, toKey });
    return { days: cache.days, lastDate: cache.lastDate, source: "cache" };
  }

  try {
    const merged = { ...(cache ? cache.days : {}) };
    let lastDate = cache ? cache.lastDate : null;
    let cursor = fromKey;
    while (cursor <= toKey) {
      const end = addDays(cursor, CHUNK_DAYS - 1) > toKey ? toKey : addDays(cursor, CHUNK_DAYS - 1);
      const part = await fetchRange(parkId, cursor, end);
      Object.assign(merged, part.days);
      if (part.lastDate && (!lastDate || part.lastDate > lastDate)) {
        lastDate = part.lastDate;
      }
      cursor = addDays(end, 1);
    }
    await writeCache(parkId, merged, lastDate);
    const result = { days: merged, lastDate, source: "net" };
    notify(result);
    return result;
  } catch (error) {
    if (cache) {
      return { days: cache.days, lastDate: cache.lastDate, source: "cache" };
    }
    return {
      days: fallbackDays(fromKey, toKey),
      lastDate: toKey,
      source: "fallback",
    };
  }
}

// Niet-blokkerend verversen (roept subscribers aan zodra er iets nieuws is).
export function refreshParkDays(options = {}) {
  return loadParkDays({ ...options, force: true }).catch(() => null);
}

/** Tijdslots (uur) tussen opening en sluiting, rekening houdend met vandaag. */
export function slotsForDay(day, now = new Date()) {
  if (!day || day.status !== "open" || !day.open || !day.close) return [];
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    return h * 60 + m;
  };
  const from = toMinutes(day.open);
  const to = toMinutes(day.close);
  const todayKey = dateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = [];
  for (let start = from; start < to; start += 60) {
    const end = Math.min(start + 60, to);
    if (end - start < 45) break; // te kort om een bezoek te plannen
    const isPast = day.date === todayKey && end - 60 <= nowMinutes + 30;
    if (isPast) continue;
    const fmt = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
    slots.push({ id: fmt(start), time: fmt(start), end: fmt(end) });
  }
  return slots;
}

/** Dag-status voor een datum; vult aan met fallback-rijtijden. */
export function dayInfo(days, key) {
  return days[key] || null;
}

/** Laatste geopende dag in de opgehaalde kalender (YYYY-MM-DD of null). */
export function lastOpenDate(days) {
  let last = null;
  Object.values(days || {}).forEach((day) => {
    if (day.status === "open" && (!last || day.date > last)) last = day.date;
  });
  return last;
}

/**
 * Winterstop: het park is dicht van ongeveer eind oktober tot begin maart.
 * We volgen de kalender: ligt de laatste geopende dag vóór vandaag, dan zijn
 * we in de winterstop en verschijnt er een duidelijke melding.
 */
export function inWinterstop(days, todayKey = dateKey(new Date())) {
  const last = lastOpenDate(days);
  return Boolean(last && todayKey > last);
}

/**
 * Eerste dag van de winterstop: de dag ná de laatste geopende dag.
 * Alleen zinvol als de kalender ook dagen ná die datum bevat (dus als de
 * winterstop zichtbaar is in de planning). Geeft anders null terug.
 */
export function winterstopStart(days, lastOpen = lastOpenDate(days)) {
  if (!lastOpen) return null;
  const lastPlannable = lastKeyOf(days);
  if (!lastPlannable || lastPlannable <= lastOpen) return null;
  const d = new Date(`${lastOpen}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

/** Verwachte/ruwe openingsuren voor een weekdag (gebruikt op het infoscherm). */
export function typicalWeekdayHours(days) {
  const counts = {};
  Object.values(days).forEach((day) => {
    if (day.status !== "open" || !day.open || !day.close) return;
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    const label = `${day.open} - ${day.close}`;
    counts[weekday] = counts[weekday] || {};
    counts[weekday][label] = (counts[weekday][label] || 0) + 1;
  });
  const result = {};
  Object.keys(counts).forEach((weekday) => {
    const entry = Object.entries(counts[weekday]).sort((a, b) => b[1] - a[1])[0];
    result[weekday] = entry[0];
  });
  return result;
}
