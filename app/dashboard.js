import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import {
    dateKey,
    formatBookingDate,
    loadReservations,
    parseKey,
    upcomingFor,
} from "@/lib/reservations";
import {
    dayInfo,
    inWinterstop,
    loadParkDays,
    subscribeParkDays,
    winterstopStart,
} from "@/lib/parkHours";
import { supabaseEnabled } from "@/lib/supabase";

export default function DashboardScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [calendar, setCalendar] = useState({ days: {} });

  // Aankomende reserveringen voor de teller op de bel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadReservations();
      if (!cancelled && user) {
        setUpcoming(upcomingFor(list, user.email));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Openingstijden voor de "vandaag"-kaart bovenaan
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

  if (!user) {
    return <Redirect href="/login" />;
  }

  const menuItems = [
    {
      id: 1,
      title: "Seizoenskaart",
      description: "Bekijk je kaartgegevens",
      icon: "card-giftcard",
      route: "/seasonpass",
      color: colors.primary,
    },
    {
      id: 2,
      title: "Reserveringen",
      description: "Maak reserveringen aan",
      icon: "calendar-month",
      route: "/reservations",
      color: colors.accent,
    },
    {
      id: 3,
      title: "Profiel",
      description: "Beheer je account",
      icon: "person",
      route: "/profile",
      color: colors.secondary,
    },
    {
      id: 4,
      title: "Informatie",
      description: "Uren & locaties",
      icon: "info",
      route: "/info",
      color: colors.lightBrown,
    },
    // Zichtbaar voor beheerders (het park).
    ...(user?.isAdmin
      ? [
          {
            id: 5,
            title: "Activatiecodes",
            description: "Codes maken voor gasten",
            icon: "confirmation-number",
            route: "/codes",
            color: colors.success,
          },
        ]
      : []),
    // Beheer-overzicht: alleen beheerders, en in de lokale modus (zonder
    // Supabase is er geen admin-vlag, maar wil je het in de demo wél tonen).
    ...(user?.isAdmin || !supabaseEnabled
      ? [
          {
            id: 6,
            title: "Beheer",
            description: "Wie heeft er gereserveerd?",
            icon: "groups",
            route: "/overview",
            color: colors.heading,
          },
        ]
      : []),
  ];

  // ------------------------------------------------------------
  // Vandaag-kaart: is het park open, tot hoe laat, en wanneer is
  // mijn volgende bezoek? Gasten hoeven hierdoor nergens meer te zoeken.
  // ------------------------------------------------------------
  const days = calendar.days || {};
  const todayKey = dateKey(new Date());
  const todayInfo = dayInfo(days, todayKey);
  const hasCalendar = Object.keys(days).length > 0;
  const winterstop = inWinterstop(days, todayKey);
  const winterStart = winterstopStart(days);
  const nextOpen = Object.values(days)
    .filter((d) => d.status === "open" && d.date >= todayKey && d.open && d.close)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextVisit = upcoming[0] || null;

  const toneColors = {
    open: colors.success,
    aanvraag: colors.primary,
    dicht: colors.lightBrown,
    laden: colors.lightGray,
  };

  let tone = "laden";
  let statusTitle = "Openingstijden laden…";
  let statusSub = "Een ogenblik geduld, dan weet je of je vandaag kunt klimmen.";

  if (hasCalendar && winterstop) {
    tone = "dicht";
    statusTitle = "Nu winterstop";
    statusSub = winterStart
      ? `Het park is dicht sinds ${formatBookingDate(parseKey(winterStart))}. Jouw seizoenkaart blijft geldig zodra we weer open gaan.`
      : "Het park is nu gesloten voor de winter. Jouw seizoenkaart blijft geldig zodra we weer open gaan.";
  } else if (hasCalendar && todayInfo?.status === "open") {
    tone = "open";
    statusTitle = `Geopend tot ${todayInfo.close}`;
    statusSub = todayInfo.estimated
      ? `Vandaag naar verwachting van ${todayInfo.open} tot ${todayInfo.close} (richttijden — de kalender volgt nog).`
      : `Vandaag van ${todayInfo.open} tot ${todayInfo.close} uur.`;
  } else if (hasCalendar && todayInfo?.status === "aanvraag") {
    tone = "aanvraag";
    statusTitle = "Vandaag op aanvraag";
    statusSub = "Klimmen op aanvraag: bel 088 - 369 7000 voor een tijd, of kies een open dag hieronder.";
  } else if (hasCalendar) {
    tone = "dicht";
    statusTitle = "Vandaag gesloten";
    statusSub = nextOpen
      ? `Volgende open dag: ${formatBookingDate(parseKey(nextOpen.date))} van ${nextOpen.open} tot ${nextOpen.close} uur.`
      : "Bekijk de planning voor de dagen die nog open zijn.";
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 14, color: colors.lightBrown, fontWeight: "500", marginBottom: 4 }}>
            Welkom terug!
          </Text>
          {user && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "700", color: colors.heading }}>
                {user.name}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/reservations")}
                accessibilityLabel="Bekijk je reserveringen"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.white,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <MaterialIcons name="notifications" size={22} color={colors.primary} />
                {upcoming.length > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.error,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingHorizontal: 4,
                      borderWidth: 2,
                      borderColor: colors.white,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: colors.white,
                      }}
                    >
                      {upcoming.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Vandaag-kaart: openingstijden + eigen volgende bezoek */}
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 20,
            padding: 18,
            marginBottom: 18,
            borderWidth: 1,
            borderColor: colors.paleGreen,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: toneColors[tone],
                marginRight: 8,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: colors.lightBrown,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Vandaag · {formatBookingDate(parseKey(todayKey))}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.heading,
              marginBottom: 6,
            }}
          >
            {statusTitle}
          </Text>
          <Text style={{ fontSize: 13, color: colors.lightBrown, lineHeight: 19 }}>
            {statusSub}
          </Text>

          {/* Eigen volgende bezoek: één tik naar de reserveringen */}
          {nextVisit && (
            <TouchableOpacity
              onPress={() => router.push("/reservations")}
              activeOpacity={0.75}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 14,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: colors.paleGreen,
              }}
            >
              <MaterialIcons
                name="event-available"
                size={22}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.lightBrown,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 2,
                  }}
                >
                  Jouw volgende bezoek
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                  {formatBookingDate(parseKey(nextVisit.date))} · {nextVisit.time} uur
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.lightBrown} />
            </TouchableOpacity>
          )}

          {/* Snelle acties: kaart tonen en reserveren zonder te zoeken */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => router.push("/seasonpass")}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="qr-code-2"
                size={18}
                color={colors.white}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 14 }}>
                Mijn kaart
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/reservations")}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderWidth: 2,
                borderColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 11,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="add-box"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
                Reserveren
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Banner */}
        <View
          style={{
            backgroundColor: colors.heading,
            borderRadius: 20,
            paddingVertical: 24,
            paddingHorizontal: 20,
            marginBottom: 32,
            shadowColor: colors.heading,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              fontWeight: "600",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Dit Seizoen
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <MaterialIcons name="event-available" size={28} color="#fff" />
            </View>
            <View>
              <Text style={{ fontSize: 40, fontWeight: "700", color: "#fff", lineHeight: 44 }}>
                {user.visits || 0}
              </Text>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: "500" }}>
                Bezoeken
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Heading */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 14 }}>
          Menu
        </Text>

        {/* Menu Items */}
        <View>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => router.push(item.route)}
              activeOpacity={0.8}
              style={{
                backgroundColor: colors.white,
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 16,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: item.color,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <MaterialIcons name={item.icon} size={26} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 2 }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.lightBrown }}>
                  {item.description}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.lightGray} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
