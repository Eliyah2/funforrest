import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Linking, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import {
  DEFAULT_PARK,
  PARKS,
  inWinterstop,
  lastOpenDate,
  loadParkDays,
  subscribeParkDays,
  winterstopStart,
} from "@/lib/parkHours";
import { dateKey, formatBookingDate, parseKey } from "@/lib/reservations";

const WEEKDAYS_LONG = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

export default function InfoScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();
  const park = PARKS[DEFAULT_PARK];

  const [calendar, setCalendar] = useState({ days: {}, source: null });
  const [loading, setLoading] = useState(true);

  // Echte openingstijden ophalen (met cache + live verversing)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadParkDays();
      if (!cancelled) {
        setCalendar(result);
        setLoading(false);
      }
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

  const days = calendar.days || {};
  // Winterstop: park dicht van eind oktober tot begin maart
  const winterstop = inWinterstop(days);
  const lastOpen = lastOpenDate(days);
  const winterStarts = winterstopStart(days, lastOpen);

  // De eerstkomende 14 dagen met echte tijden
  const upcoming = [];
  for (let i = 0; i < 14 && upcoming.length < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const info = days[key];
    if (!info) continue;
    if (info.status === "open" || i === 0) {
      upcoming.push({
        key,
        date: d,
        weekday: WEEKDAYS_LONG[d.getDay()],
        info,
        isToday: i === 0,
      });
    }
  }

  const openCount = Object.values(days).filter(
    (d) => d.status === "open"
  ).length;

  const statusText = (info) => {
    if (info.status === "open") return `${info.open} - ${info.close}`;
    if (info.status === "aanvraag") return "Open op aanvraag";
    if (info.status === "gesloten") return "Gesloten";
    return "Nog niet bekend";
  };

  const openExternal = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const contactRows = [
    {
      icon: "phone",
      label: "Telefoon",
      value: park.phoneDisplay,
      onPress: () => Linking.openURL(park.phoneHref).catch(() => {}),
    },
    {
      icon: "email",
      label: "E-mail",
      value: park.email,
      onPress: () => Linking.openURL(`mailto:${park.email}`).catch(() => {}),
    },
    {
      icon: "language",
      label: "Website",
      value: "www.funforest.nl/venlo",
      onPress: () => openExternal(park.website),
    },
    {
      icon: "help",
      label: "Veel Gestelde Vragen",
      value: "www.funforest.nl/faq",
      onPress: () => openExternal("https://www.funforest.nl/faq"),
    },
  ];

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.heading,
            }}
          >
            Informatie
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

        {/* Parkkaart met adres + route */}
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.paleGreen,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialIcons name="park" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {park.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.lightBrown, marginTop: 2 }}>
                {park.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => openExternal(park.directionsUrl)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 12,
            }}
          >
            <MaterialIcons name="directions" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.white, fontSize: 14, fontWeight: "700" }}>
              Route plannen
            </Text>
          </TouchableOpacity>
        </View>

        {/* Openingstijden */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 4,
          }}
        >
          Openingstijden
        </Text>
        <Text style={{ fontSize: 12, color: colors.lightBrown, marginBottom: 14 }}>
          {loading
            ? "Echte tijden worden geladen…"
            : calendar.source === "fallback"
              ? "Kon de kalender niet ophalen — toon ik een richtlijn. Check de website voor vertrek."
              : openCount > 0
                ? `Live vanuit het park: ${openCount} geopende dagen gepland.`
                : "Binnenkort gepubliceerd op de kalender."}
        </Text>

        {(winterstop || winterStarts) && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 14,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
              flexDirection: "row",
            }}
          >
            <MaterialIcons
              name="severe-cold"
              size={20}
              color={colors.accent}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: colors.text,
                lineHeight: 18,
                fontWeight: "500",
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {winterstop ? "Winterstop." : "Binnenkort winterstop."}
              </Text>{" "}
              {winterstop
                ? "Van eind oktober tot begin maart is het park gesloten."
                : `Vanaf ${winterStarts ? formatBookingDate(parseKey(winterStarts)) : "eind oktober"} tot begin maart is het park gesloten — plan je bezoek vóór die datum.`}{" "}
              Laatste geopende dag in de kalender:{" "}
              {lastOpen ? formatBookingDate(parseKey(lastOpen)) : "–"}.
              {winterstop
                ? " Zodra de nieuwe tijden gepubliceerd zijn, staan ze hier — en kun je weer reserveren."
                : ""}
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 8 }}>
          {upcoming.length === 0 && !loading && (
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: colors.lightBrown, textAlign: "center" }}>
                De openingstijden voor de komende dagen staan nog niet in de
                kalender. Kijk op funforest.nl of bel het park.
              </Text>
            </View>
          )}
          {upcoming.map((item) => {
            const isOpen = item.info.status === "open";
            return (
              <View
                key={item.key}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  marginBottom: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderLeftWidth: 4,
                  borderLeftColor: isOpen ? colors.success : colors.lightGray,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {item.isToday ? "Vandaag" : formatBookingDate(item.date)}
                  </Text>
                  {item.isToday && (
                    <Text style={{ fontSize: 11, color: colors.lightBrown }}>
                      {formatBookingDate(item.date)}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: isOpen ? colors.text : colors.lightBrown,
                    fontWeight: "600",
                  }}
                >
                  {statusText(item.info)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Info Box */}
        <View
          style={{
            backgroundColor: colors.paleGreen,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 28,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
            flexDirection: "row",
          }}
        >
          <MaterialIcons
            name="info"
            size={20}
            color={colors.primary}
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: colors.text,
              lineHeight: 18,
              fontWeight: "500",
            }}
          >
            &ldquo;Open op aanvraag&rdquo; betekent dat het park die dag alleen opent als er
            genoeg aanmeldingen zijn — bel of mail het park. Feestdagen en
            evenementen kunnen afwijkende tijden hebben.
          </Text>
        </View>

        {/* Contact & Hulp */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 14,
          }}
        >
          Contact & Hulp
        </Text>

        {contactRows.map((row) => (
          <TouchableOpacity
            key={row.label}
            onPress={row.onPress}
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 14,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.paleGreen,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 14,
              }}
            >
              <MaterialIcons name={row.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.lightBrown,
                  fontWeight: "600",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                {row.value}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.lightGray} />
          </TouchableOpacity>
        ))}

        {/* App Version */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: colors.lightBrown,
              fontWeight: "500",
            }}
          >
            FunForest App v1.1.0
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
