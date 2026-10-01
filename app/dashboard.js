import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import { loadReservations, upcomingFor } from "@/lib/reservations";

export default function DashboardScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);

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
  ];

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
