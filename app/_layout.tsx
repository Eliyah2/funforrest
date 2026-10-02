import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/lib/AuthProvider";

export const unstable_settings = {
  anchor: "login",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

// Breedte van de app-kolom: op telefoon vult hij het scherm, op laptop
// blijft hij een strakke, gecentreerde kolom (geen uitgerekte layouts).
const CONTENT_MAX_WIDTH = 560;

function RootNavigator() {
  const { hydrated } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width > 640;

  // Sessie nog aan het laden: laat de navigator nog niet mounten,
  // anders proberen schermen te redirecten voordat de router klaar is.
  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.light.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isWide ? Colors.light.paleGreen : Colors.light.background,
      }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          backgroundColor: Colors.light.background,
          borderLeftWidth: Platform.OS === "web" && isWide ? 1 : 0,
          borderRightWidth: Platform.OS === "web" && isWide ? 1 : 0,
          borderColor: "#F3E6D8",
        }}
      >
        <Stack>
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: "none" }}
        />
        <Stack.Screen
          name="dashboard"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="seasonpass"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reservations"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />        <Stack.Screen
          name="info"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="codes"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="overview"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="checkin"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        </Stack>
      </View>
    </SafeAreaView>
  );
}
