import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import {
    CAPACITY,
    dateKey,
    formatBookingDate,
    loadReservations,
    parseKey,
} from "@/lib/reservations";
import {
    loadParkDays,
    slotsForDay,
    subscribeParkDays,
} from "@/lib/parkHours";
import { supabaseEnabled } from "@/lib/supabase";

/**
 * Beheerdersscherm voor het park: wie heeft er gereserveerd?
 * Per dag alle tijdslots met de namen erbij en hoe vol het slot is.
 */
export default function OverviewScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [calendar, setCalendar] = useState({ days: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);

  const isAdmin = Boolean(user?.isAdmin);
  // Zonder Supabase is alles apparaatgebonden; dan mag dit scherm gewoon
  // open (met een duidelijke waarschuwing), want er is geen andere plek waar
  // je de boekingen kunt zien. Met Supabase leest alleen een beheerder mee.
  const canView = isAdmin || !supabaseEnabled;

  const reload = useCallback(async () => {
    const list = await loadReservations();
    setReservations(list);
    setLoading(false);
  }, []);

  // Echte openingstijden, zodat we per dag de volledige tijdsloten tonen
  // (ook de lege — dat is juist wat het park wil weten).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadParkDays();
      if (!cancelled) setCalendar(result);
    })();
    const unsubscribe = subscribeParkDays((result) => {
      if (!cancelled) setCalendar(result);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
    setNotice({ type: "ok", text: "Bijgewerkt." });
  };

  if (!user) {
    return <Redirect href="/login" />;
  }

  const days = calendar.days || {};
  const today = dateKey(new Date());

  const upcoming = reservations
    .filter((r) => r.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const byDate = {};
  upcoming.forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  const dateKeys = Object.keys(byDate).sort();

  const todayCount = byDate[today] ? byDate[today].length : 0;
  const weekEnd = dateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const weekCount = upcoming.filter((r) => r.date <= weekEnd).length;

  // Alle slots van een dag tonen (ook voorbijgaande van vandaag): reken de
  // "verstreken"-filter van slotsForDay weg door een dag later te passen.
  const slotsForKey = (key) => {
    const day = days[key];
    const afterDay = new Date(parseKey(key).getTime() + 36 * 60 * 60 * 1000);
    const fromCalendar = slotsForDay(day, afterDay).map((s) => s.time);
    const booked = byDate[key].map((r) => r.time);
    return [...new Set([...fromCalendar, ...booked])].sort();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.heading }}>
            Beheer
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.paleGreen,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Melding */}
        {notice && (
          <View
            style={{
              backgroundColor: colors.paleGreen,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.success,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="check-circle"
              size={20}
              color={colors.success}
              style={{ marginRight: 10 }}
            />
            <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
              {notice.text}
            </Text>
            <TouchableOpacity onPress={() => setNotice(null)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={16} color={colors.lightBrown} />
            </TouchableOpacity>
          </View>
        )}

        {/* Zonder Supabase: alleen dit apparaat */}
        {!supabaseEnabled && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              <Text style={{ fontWeight: "700" }}>Lokale modus.</Text> Je ziet de
              reserveringen van dit apparaat. Koppel Supabase om het overzicht
              van alle gasten te zien (ook vanaf de telefoon van het park).
            </Text>
          </View>
        )}

        {/* Met Supabase: alleen beheerders */}
        {supabaseEnabled && !isAdmin && !loading && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: colors.error,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Dit account is geen beheerder. Zet in de SQL Editor één keer:
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.heading,
                marginTop: 8,
                fontWeight: "700",
              }}
            >
              {`update public.profiles set is_admin = true where email = '${user.email}';`}
            </Text>
          </View>
        )}

        {canView && (
          <>
            {/* Cijfers */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Vandaag", value: todayCount },
                { label: "7 dagen", value: weekCount },
                { label: "Vooruit", value: upcoming.length },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    backgroundColor: colors.white,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 10,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.paleGreen,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: colors.heading,
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.lightBrown,
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Verversen */}
            <TouchableOpacity
              onPress={refresh}
              disabled={refreshing}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.paleGreen,
                borderRadius: 12,
                paddingVertical: 12,
                marginBottom: 20,
              }}
            >
              <MaterialIcons
                name="refresh"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
                {refreshing ? "Vernieuwen..." : "Vernieuwen"}
              </Text>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            )}

            {!loading && dateKeys.length === 0 && (
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  paddingVertical: 24,
                  paddingHorizontal: 14,
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name="event-busy"
                  size={28}
                  color={colors.lightBrown}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.lightBrown,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  Nog geen reserveringen vanaf vandaag.{"\n"}
                  Zodra een gast boekt, verschijnt die hier.
                </Text>
              </View>
            )}

            {/* Per dag */}
            {dateKeys.map((key) => {
              const list = byDate[key];
              const times = slotsForKey(key);
              const day = days[key];
              return (
                <View
                  key={key}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: colors.paleGreen,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.heading,
                      }}
                    >
                      {key === today ? "Vandaag · " : ""}
                      {formatBookingDate(parseKey(key))}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.lightBrown }}>
                      {list.length} {list.length === 1 ? "gast" : "gasten"}
                    </Text>
                  </View>

                  {day && day.status !== "open" && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.lightBrown,
                        marginBottom: 8,
                        fontStyle: "italic",
                      }}
                    >
                      {day.label || "Niet open volgens de kalender"}
                    </Text>
                  )}

                  {times.length === 0 && (
                    <Text style={{ fontSize: 12, color: colors.lightBrown }}>
                      Geen tijdsloten (kalender nog niet gepubliceerd).
                    </Text>
                  )}

                  {times.map((time) => {
                    const booked = list.filter((r) => r.time === time);
                    return (
                      <View
                        key={time}
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          paddingVertical: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.paleGreen,
                        }}
                      >
                        <Text
                          style={{
                            width: 52,
                            fontSize: 14,
                            fontWeight: "700",
                            color: colors.text,
                          }}
                        >
                          {time}
                        </Text>

                        <View style={{ flex: 1 }}>
                          {booked.length === 0 ? (
                            <Text style={{ fontSize: 13, color: colors.lightBrown }}>
                              nog niemand
                            </Text>
                          ) : (
                            booked.map((r) => (
                              <View key={r.id} style={{ marginBottom: 3 }}>
                                <Text
                                  style={{ fontSize: 14, color: colors.text, fontWeight: "600" }}
                                >
                                  {r.name || "Naam onbekend"}
                                </Text>
                                {!!r.email && (
                                  <Text style={{ fontSize: 11, color: colors.lightBrown }}>
                                    {r.email}
                                  </Text>
                                )}
                              </View>
                            ))
                          )}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginLeft: 8,
                          }}
                        >
                          <View style={{ flexDirection: "row", gap: 3, marginRight: 6 }}>
                            {Array.from({ length: CAPACITY }).map((_, i) => (
                              <View
                                key={i}
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor:
                                    i < booked.length ? colors.primary : colors.lightGray,
                                }}
                              />
                            ))}
                          </View>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color:
                                booked.length >= CAPACITY ? colors.error : colors.lightBrown,
                            }}
                          >
                            {booked.length}/{CAPACITY}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}
