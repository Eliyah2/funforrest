import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import { visitsLabel } from "@/lib/checkins";

// Openbaar scherm: het personeel bij de ingang scant de QR van een gast en
// hoeft daar niet voor ingelogd te zijn. De check-in wordt op het account van
// de gast gezet en telt als bezoek (maximaal één keer per dag).
export default function CheckinScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const params = useLocalSearchParams();
  const { scanCheckinByPass, supabaseEnabled, user } = useAuth();

  const [phase, setPhase] = useState("loading"); // loading | input | result | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  // Laatst verwerkte kaartnummer: niet twee keer dezelfde scan, wél een nieuwe
  const lastPass = useRef(null);

  const run = async (value) => {
    setPhase("loading");
    try {
      const res = await scanCheckinByPass(value);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setError(err.message || "Er ging iets mis.");
      setPhase("error");
    }
  };

  useEffect(() => {
    const raw = params.pass;
    const pass = Array.isArray(raw) ? raw[0] : raw;
    const value = pass ? String(pass).trim() : "";
    if (!value) {
      setPhase("input");
      return;
    }
    if (lastPass.current === value) return;
    lastPass.current = value;
    run(value);
    // Een nieuwe scan in hetzelfde scherm moet gewoon verwerkt worden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pass]);

  const status = result ? result.status : null;
  const tone =
    status === "ok"
      ? colors.success
      : status === "al_ingecheckt"
        ? colors.accent
        : colors.error;

  const title =
    status === "ok"
      ? "Ingecheckt"
      : status === "al_ingecheckt"
        ? "Vandaag al ingecheckt"
        : status === "onbekend"
          ? "Kaartnummer niet gevonden"
          : "Kaartnummer ontbreekt";

  const body =
    status === "ok"
      ? `Welkom ${result.name || "terug"}! Je check-in van ${result.time} is opgeslagen en telt als bezoek. Je staat nu op ${visitsLabel(result.visits)}.`
      : status === "al_ingecheckt"
        ? `Je was er vandaag al om ${result.time} — die telt, een tweede scan telt niet twee keer. Je staat op ${visitsLabel(result.visits)}. Morgen kun je weer inchecken.`
        : status === "onbekend"
          ? "Dit kaartnummer hoort bij geen enkel account. Controleer het nummer op de kaart of vraag het park om hulp."
          : "Scan de QR-code op de seizoenkaart, of typ het kaartnummer hieronder in.";

  const showInput =
    phase === "input" ||
    (phase === "result" && (status === "onbekend" || status === "geen_pasmunt")) ||
    (phase === "result" && !params.pass);

  const card = (bg, borderColor, icon, iconColor) => (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: iconColor,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.white,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <MaterialIcons name={icon} size={34} color={iconColor} />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: colors.heading,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.text,
          lineHeight: 21,
          textAlign: "center",
          fontWeight: "500",
        }}
      >
        {body}
      </Text>
      {result && result.name && (status === "ok" || status === "al_ingecheckt") && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 14,
            backgroundColor: colors.white,
            borderRadius: 999,
            paddingVertical: 6,
            paddingHorizontal: 14,
          }}
        >
          <MaterialIcons name="person" size={16} color={colors.primary} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 13,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            {result.name} · {visitsLabel(result.visits)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.heading }}>
            Check-in
          </Text>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/dashboard"))}
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

        <Text style={{ fontSize: 13, color: colors.lightBrown, marginBottom: 18, lineHeight: 19 }}>
          Scan de QR-code op de seizoenkaart van een gast. De check-in wordt op
          het account gezet, telt als bezoek en kan maximaal één keer per dag.
        </Text>

        {phase === "loading" && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              paddingVertical: 36,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 14, fontSize: 14, color: colors.text, fontWeight: "600" }}>
              Check-in verwerken…
            </Text>
          </View>
        )}

        {phase === "error" && (
          <View
            style={{
              backgroundColor: "#FDECEA",
              borderRadius: 16,
              paddingVertical: 24,
              paddingHorizontal: 20,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: colors.error,
              alignItems: "center",
            }}
          >
            <MaterialIcons name="error-outline" size={34} color={colors.error} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.heading, marginTop: 8 }}>
              Het lukte niet
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, marginTop: 6, textAlign: "center" }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => (params.pass ? run(String(params.pass)) : setPhase("input"))}
              style={{
                marginTop: 16,
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 14 }}>Opnieuw proberen</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "result" &&
          result &&
          card(
            status === "ok"
              ? colors.paleGreen
              : status === "al_ingecheckt"
                ? "#FFF4E5"
                : "#FDECEA",
            tone,
            status === "ok"
              ? "check-circle"
              : status === "al_ingecheckt"
                ? "schedule"
                : "error-outline",
            tone,
          )}

        {showInput && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 18,
              marginBottom: 20,
              borderWidth: 2,
              borderColor: colors.paleGreen,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.lightBrown,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Kaartnummer
            </Text>
            <TextInput
              value={manual}
              onChangeText={(t) => setManual(t.toUpperCase())}
              placeholder="FF-123456"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                borderWidth: 2,
                borderColor: colors.lightGray,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: colors.background,
                color: colors.text,
              }}
            />
            <TouchableOpacity
              onPress={() => run(manual)}
              disabled={!manual.trim()}
              style={{
                marginTop: 12,
                backgroundColor: manual.trim() ? colors.primary : colors.lightGray,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "700", fontSize: 15 }}>
                Check-in verwerken
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!supabaseEnabled && (
          <View
            style={{
              backgroundColor: "#FFF4E5",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
              flexDirection: "row",
            }}
          >
            <MaterialIcons
              name="info"
              size={20}
              color={colors.accent}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 }}>
              Lokale modus: check-ins worden alleen op dit apparaat bewaard.
              Zet je de Supabase-sleutels in dan werkt scannen vanaf elke telefoon.
            </Text>
          </View>
        )}

        {/* Acties */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              setManual("");
              setResult(null);
              lastPass.current = null;
              setPhase("input");
            }}
            style={{
              flex: 1,
              backgroundColor: colors.paleGreen,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 2,
              borderColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
              Volgende scan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace(user ? "/seasonpass" : "/login")}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "700", fontSize: 14 }}>
              {user ? "Mijn kaart" : "Inloggen"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
