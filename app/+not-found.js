import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";

/**
 * 404-pagina. Gasten typen weleens een verkeerde URL of een link is oud —
 * dan wil je geen doodlopend scherm maar een duidelijke weg terug.
 */
export default function NotFoundScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();
  const homeHref = user ? "/dashboard" : "/login";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingBottom: 40,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Image
          source={require("@/assets/brand/funforest-logo-web.png")}
          style={{ width: 88, height: 88, marginBottom: 12 }}
          resizeMode="contain"
          accessibilityLabel="Fun Forest logo"
        />
        <Text
          style={{
            fontSize: 14,
            color: colors.lightBrown,
            fontWeight: "600",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          404
        </Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: colors.heading,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Deze pagina bestaat niet
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.text,
            marginTop: 10,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          Geen zorgen: je kaart, je reserveringen en de openingstijden vind je
          gewoon in de app.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.replace(homeHref)}
        activeOpacity={0.85}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: "700" }}>
          {user ? "Terug naar mijn dashboard" : "Terug naar inloggen"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/info")}
        activeOpacity={0.85}
        style={{
          backgroundColor: colors.white,
          borderWidth: 2,
          borderColor: colors.paleGreen,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <MaterialIcons
          name="schedule"
          size={18}
          color={colors.primary}
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: colors.heading, fontSize: 15, fontWeight: "700" }}>
          Openingstijden &amp; contact
        </Text>
      </TouchableOpacity>
    </View>
  );
}
