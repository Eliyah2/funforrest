import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/lib/AuthProvider";

// Uniek pasnummer afgeleid van het e-mailadres (altijd hetzelfde per account)
function getPassId(email = "") {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return `FF-${String(hash % 1000000).padStart(6, "0")}`;
}

// Kaart geldig tot en met 31 december van het seizoen waarin het lidmaatschap
// begon — zoals de echte Fun Forest Seizoenkaart ("geldig tot einde van 2026").
function getValidUntil(iso) {
  let start = iso ? new Date(iso) : new Date();
  if (isNaN(start.getTime())) start = new Date();
  const end = new Date(start.getFullYear(), 11, 31);
  return end.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SeasonPassScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user, addVisit } = useAuth();
  const [notice, setNotice] = useState(null);
  if (!user) {
    return <Redirect href="/login" />;
  }

  const seasonPass = {
    name: user?.name || "Onbekend",
    type: "Seizoenkaart",
    validUntil: getValidUntil(user?.memberSinceISO),
    // Echt kaartnummer van de gast (uit de bevestigingsmail) of een eigen
    // nummer als die nog niet is ingevuld
    passId: user?.passNumber || getPassId(user?.email),
    holder: "Houder",
    visits: user?.visits || 0,
  };

  const qrValue = `FUNFOREST ${seasonPass.passId} | ${seasonPass.name} | geldig tot ${seasonPass.validUntil}`;

  // ---- Kaart downloaden als PNG (browser) ---------------------------------
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("afbeelding laden"));
      img.src = src;
    });

  const roundRectPath = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const fitText = (ctx, text, maxPx, weight, startPx) => {
    let size = startPx;
    ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
    while (ctx.measureText(text).width > maxPx && size > 16) {
      size -= 2;
      ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }
    return text;
  };

  const handleDownload = async () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      setNotice(
        "Downloaden werkt in de browser. Open de app op je laptop of maak op je telefoon een screenshot van je kaart.",
      );
      return;
    }
    try {
      const svgEl = document.querySelector('[data-testid="pass-qr"] svg');
      if (!svgEl) throw new Error("QR-code niet gevonden");
      const doc = new DOMParser().parseFromString(
        new XMLSerializer().serializeToString(svgEl),
        "image/svg+xml",
      );
      const root = doc.documentElement;
      root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      root.setAttribute("width", "360");
      root.setAttribute("height", "360");
      const qrImg = await loadImage(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          new XMLSerializer().serializeToString(root),
        )}`,
      );

      const W = 900;
      const H = 1240;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      const font = (weight, size) => {
        ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
      };
      const center = (text, y) => ctx.fillText(text, W / 2, y);

      // Achtergrond
      ctx.fillStyle = "#FFF7ED";
      ctx.fillRect(0, 0, W, H);

      // Afgeronde kaart
      ctx.save();
      roundRectPath(ctx, 40, 40, W - 80, H - 80, 48);
      ctx.clip();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(40, 40, W - 80, H - 80);

      // Kop (donkergroen, zoals hun huisstijl)
      ctx.fillStyle = "#032810";
      ctx.fillRect(40, 40, W - 80, 300);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      font("700", 30);
      center("FUN FOREST", 120);
      ctx.fillStyle = "#FFFFFF";
      font("700", 66);
      center("Seizoenkaart", 205);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      font("500", 30);
      fitText(ctx, seasonPass.name, 700, "500", 30);
      center(seasonPass.name, 265);

      // QR-vlak
      ctx.fillStyle = "#FFEFE4";
      ctx.fillRect(40, 340, W - 80, 560);
      ctx.fillStyle = "#FFFFFF";
      roundRectPath(ctx, 250, 380, 400, 400, 24);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#F76D18";
      ctx.stroke();
      ctx.drawImage(qrImg, 280, 410, 340, 340);

      ctx.fillStyle = "#032810";
      font("700", 46);
      center(seasonPass.passId, 835);
      ctx.fillStyle = "#667085";
      font("500", 26);
      center("Scan deze code bij de ingang", 875);

      // Gegevens
      ctx.strokeStyle = "rgba(3,40,16,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(110, 935);
      ctx.lineTo(W - 110, 935);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#667085";
      font("700", 24);
      ctx.fillText("HOUDER", 110, 990);
      ctx.fillStyle = "#182230";
      fitText(ctx, seasonPass.name, 430, "700", 40);
      ctx.fillText(seasonPass.name, 110, 1042);

      ctx.textAlign = "right";
      ctx.fillStyle = "#667085";
      font("700", 24);
      ctx.fillText("GELDIG TOT", W - 110, 990);
      ctx.fillStyle = "#182230";
      font("700", 40);
      ctx.fillText(seasonPass.validUntil, W - 110, 1042);

      ctx.textAlign = "center";
      ctx.fillStyle = "#F76D18";
      font("700", 26);
      center("Onbeperkt klimmen · alle vier de klimbossen", 1110);
      ctx.fillStyle = "#667085";
      font("500", 22);
      center("Strikt persoonlijk · tonen bij de kassa · funforest.nl", 1155);
      ctx.restore();

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("png kon niet gemaakt worden");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `funforest-seizoenskaart-${seasonPass.passId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNotice(`Kaart gedownload als PNG: funforest-seizoenskaart-${seasonPass.passId}.png`);
    } catch (err) {
      setNotice(`Downloaden lukte niet (${err.message}). Probeer opnieuw.`);
    }
  };

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
            marginBottom: 28,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.heading,
            }}
          >
            Mijn Kaart
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

        {/* Notice */}
        {notice && (
          <View
            style={{
              backgroundColor: colors.paleGreen,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 24,
              borderLeftWidth: 4,
              borderLeftColor: colors.success,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="check-circle"
              size={22}
              color={colors.success}
              style={{ marginRight: 10 }}
            />
            <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}>
              {notice}
            </Text>
            <TouchableOpacity onPress={() => setNotice(null)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={18} color={colors.lightBrown} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Card */}
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 24,
            shadowColor: colors.heading,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {/* Card Top - Bosgroen (hun huisstijl) */}
          <View
            style={{
              backgroundColor: colors.heading,
              paddingVertical: 24,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <MaterialIcons
                name="card-giftcard"
                size={32}
                color={colors.white}
              />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.white,
                marginBottom: 4,
              }}
            >
              {seasonPass.type}
            </Text>
            <Text
              style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500",
            }}
          >
            Geldig op alle locaties
            </Text>
          </View>

          {/* QR Code Section */}
          <View
            style={{
              alignItems: "center",
              paddingVertical: 28,
              paddingHorizontal: 20,
              backgroundColor: colors.paleGreen,
              borderTopWidth: 1,
              borderTopColor: "rgba(45,127,79,0.1)",
            }}
          >
            <View
              testID="pass-qr"
              style={{
                width: 180,
                height: 180,
                backgroundColor: colors.white,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 3,
                borderColor: colors.primary,
                marginBottom: 12,
              }}
            >
              <QRCode
                value={qrValue}
                size={144}
                color={colors.text}
                backgroundColor={colors.white}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.text,
                fontWeight: "600",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              {seasonPass.passId}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.lightBrown,
              }}
            >
              Scan deze code bij de ingang
            </Text>
          </View>

          {/* Details Section */}
          <View style={{ paddingVertical: 24, paddingHorizontal: 20 }}>
            {/* Holder */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.lightBrown,
                  fontWeight: "600",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {seasonPass.holder}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {seasonPass.name}
              </Text>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(45,127,79,0.1)",
                marginVertical: 16,
              }}
            />

            {/* Validity */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.lightBrown,
                    fontWeight: "600",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Geldig tot
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {seasonPass.validUntil}
                </Text>
              </View>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: colors.paleGreen,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons
                  name="check-circle"
                  size={28}
                  color={colors.primary}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 12,
            }}
          >
            Jouw Statistieken
          </Text>

          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              paddingVertical: 20,
              paddingHorizontal: 16,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: colors.paleGreen,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <MaterialIcons
                  name="local-activity"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.lightBrown,
                  fontWeight: "600",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                Bezoeken
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {seasonPass.visits}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 12,
            }}
          >
            Voordelen
          </Text>

          {[
            {
              icon: "all_inclusive",
              title: "Onbeperkt klimmen",
              desc: "Zo vaak als je wil, het hele seizoen",
            },
            {
              icon: "map",
              title: "Alle vier de klimbossen",
              desc: "Almere, Amsterdam, Rotterdam én Venlo",
            },
            {
              icon: "terrain",
              title: "Altijd nieuwe uitdagingen",
              desc: "Elke locatie heeft unieke parcoursen",
            },
            {
              icon: "confirmation_number",
              title: "Geen losse tickets",
              desc: "Eén kaart in plaats van elk bezoek een ticket",
            },
          ].map((benefit, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                backgroundColor: colors.white,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.paleGreen,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 14,
                }}
              >
                <MaterialIcons
                  name={benefit.icon}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 2,
                  }}
                >
                  {benefit.title}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.lightBrown,
                  }}
                >
                  {benefit.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Voorwaarden zoals op funforest.nl */}
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
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: colors.text,
              lineHeight: 18,
              fontWeight: "500",
            }}
          >
            Geldig op alle dagen dat het park open is, tot en met {seasonPass.validUntil}.
            De kaart is strikt persoonlijk en toon je bij de kassa bij elk bezoek.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              addVisit();
              setNotice(`Ingecheckt! Je hebt nu ${user.visits + 1} bezoeken genoten.`);
            }}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.white,
                fontWeight: "700",
                fontSize: 14,
              }}
            >
              Check-in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDownload}
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
            <Text
              style={{
                color: colors.primary,
                fontWeight: "700",
                fontSize: 14,
              }}
            >
              Download
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
