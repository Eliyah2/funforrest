import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import { generateActivationCode } from "@/lib/access";
import { supabase, supabaseEnabled } from "@/lib/supabase";

export default function ActivationCodesScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();

  const [codes, setCodes] = useState([]);
  const [label, setLabel] = useState("");
  // Standaard één code per gast: na één gebruik is de code op
  const [singleUse, setSingleUse] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null); // { type, text }
  const [copied, setCopied] = useState(null);

  const isAdmin = Boolean(user?.isAdmin);

  const load = useCallback(async () => {
    if (!supabaseEnabled || !isAdmin) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setNotice({
        type: "error",
        text: `Codes ophalen mislukt: ${error.message}. Is schema.sql uitgevoerd?`,
      });
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const createCode = async () => {
    setBusy(true);
    setNotice(null);
    const code = generateActivationCode();
    const { error } = await supabase
      .from("activation_codes")
      .insert({
        code,
        label: label.trim(),
        max_uses: singleUse ? 1 : 0,
      });
    if (error) {
      setNotice({
        type: "error",
        text: `Maken mislukt: ${error.message}. Draai eerst supabase/schema.sql en zet jezelf op admin.`,
      });
    } else {
      setNotice({ type: "success", text: `Nieuwe code: ${code}` });
      setLabel("");
      await load();
    }
    setBusy(false);
  };

  const toggleActive = async (row) => {
    const { error } = await supabase
      .from("activation_codes")
      .update({ active: !row.active })
      .eq("code", row.code);
    if (error) {
      setNotice({ type: "error", text: `Wijzigen mislukt: ${error.message}` });
      return;
    }
    await load();
  };

  const copyCode = async (code) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else if (typeof window !== "undefined") {
        window.prompt("Kopieer de code:", code);
      }
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setNotice({ type: "error", text: "Kopiëren lukte niet — selecteer de code handmatig." });
    }
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
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.heading }}>
            Activatiecodes
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
              backgroundColor: notice.type === "error" ? "#FDECEA" : colors.paleGreen,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: notice.type === "error" ? colors.error : colors.success,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={notice.type === "error" ? "error-outline" : "check-circle"}
              size={20}
              color={notice.type === "error" ? colors.error : colors.success}
              style={{ marginRight: 10 }}
            />
            <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}>
              {notice.text}
            </Text>
            <TouchableOpacity onPress={() => setNotice(null)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={16} color={colors.lightBrown} />
            </TouchableOpacity>
          </View>
        )}

        {/* Uitleg */}
        <View
          style={{
            backgroundColor: colors.paleGreen,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 24,
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
          <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 18, fontWeight: "500" }}>
            Maak hier codes aan en geef ze aan gasten met een abonnement. Zij
            vullen de code in bij &ldquo;Activeer je kaart&rdquo; en klaar. De
            codes zijn niet terug te vinden in de app of op de website.
          </Text>
        </View>

        {!supabaseEnabled && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Beheer werkt alleen met Supabase. Zet de sleutels in{" "}
              <Text style={{ fontWeight: "700" }}>.env</Text> en in Vercel, draai{" "}
              <Text style={{ fontWeight: "700" }}>supabase/schema.sql</Text>, en
              kom dan terug. Zolang dat niet staat, blijft de ingebouwde
              noodcode werken.
            </Text>
          </View>
        )}

        {supabaseEnabled && !isAdmin && !loading && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
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

        {/* Nieuwe code */}
        {supabaseEnabled && isAdmin && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.heading,
                marginBottom: 10,
              }}
            >
              Nieuwe code
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Voor wie? (bijv. Familie Jansen)"
                placeholderTextColor={colors.lightGray}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: colors.paleGreen,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.white,
                }}
              />
              <TouchableOpacity
                onPress={createCode}
                disabled={busy}
                style={{
                  backgroundColor: busy ? colors.lightGray : colors.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  alignItems: "center",
                }}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={{ color: colors.white, fontWeight: "700", fontSize: 14 }}>
                    Maken
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Per persoon of onbeperkt */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {[
                { value: true, title: "Per gast (1×)", desc: "Gekoppeld aan één persoon" },
                { value: false, title: "Onbeperkt", desc: "Zelfde code meermaals" },
              ].map((opt) => {
                const selected = singleUse === opt.value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    onPress={() => setSingleUse(opt.value)}
                    style={{
                      flex: 1,
                      backgroundColor: selected ? colors.paleGreen : colors.white,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.lightGray,
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: selected ? colors.primary : colors.text,
                      }}
                    >
                      {opt.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.lightBrown,
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    >
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Lijst */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 12,
          }}
        >
          Codes ({codes.length})
        </Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}

        {!loading && codes.length === 0 && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              paddingVertical: 18,
              paddingHorizontal: 14,
              alignItems: "center",
            }}
          >
            <MaterialIcons name="confirmation-number" size={26} color={colors.lightBrown} style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: 13, color: colors.lightBrown, textAlign: "center" }}>
              Nog geen codes. Maak er hierboven één aan.
            </Text>
          </View>
        )}

        {codes.map((row) => {
          const open = row.active && (row.max_uses === 0 || row.used_count < row.max_uses);
          return (
            <View
              key={row.code}
              style={{
                backgroundColor: colors.white,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginBottom: 10,
                borderLeftWidth: 4,
                borderLeftColor: open ? colors.success : colors.lightGray,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.heading,
                      letterSpacing: 1,
                    }}
                  >
                    {row.code}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.lightBrown, marginTop: 2 }}>
                    {row.label || "Geen label"} ·{" "}
                    {row.max_uses === 0
                      ? `${row.used_count}× gebruikt`
                      : `${row.used_count} van ${row.max_uses}× gebruikt`}
                  </Text>
                  {row.used_by && (
                    <Text style={{ fontSize: 12, color: colors.success, marginTop: 2 }}>
                      Gebruikt door {row.used_by}
                      {row.used_at
                        ? ` · ${new Date(row.used_at).toLocaleDateString("nl-NL")}`
                        : ""}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => copyCode(row.code)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: colors.paleGreen,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                    {copied === row.code ? "Gekopieerd" : "Kopieer"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleActive(row)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: open ? colors.success : colors.lightGray,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: open ? colors.success : colors.lightBrown,
                    }}
                  >
                    {open ? "Actief" : "Uit"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
