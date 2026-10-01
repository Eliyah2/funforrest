import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user, logout, changePassword, updateSession } = useAuth();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  // if no user, redirect back to login
  if (!user) {
    return <Redirect href="/login" />;
  }

  const notificationsOn = user.notifications !== false;

  const handleSavePassword = async () => {
    setPwBusy(true);
    setMessage(null);
    try {
      if (newPassword !== confirmPassword) {
        throw new Error("De nieuwe wachtwoorden komen niet overeen.");
      }
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setMessage({ type: "success", text: "Je wachtwoord is gewijzigd." });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setPwBusy(false);
    }
  };

  const toggleNotifications = async (value) => {
    await updateSession({ notifications: value });
    setMessage({
      type: "success",
      text: value ? "Meldingen staan aan." : "Meldingen staan uit.",
    });
  };

  const profileOptions = [
    { icon: "person", label: "Naam", value: user.name },
    { icon: "email", label: "E-mail", value: user.email },
    {
      icon: "card-membership",
      label: "Lid sinds",
      value: user.memberSince || "2024",
    },
    { icon: "login", label: "Bezoeken", value: `${user.visits || 0} keer` },
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
            Profiel
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
        {message && (
          <View
            style={{
              backgroundColor:
                message.type === "error" ? "#FDECEA" : colors.paleGreen,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 24,
              borderLeftWidth: 4,
              borderLeftColor:
                message.type === "error" ? colors.error : colors.success,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={message.type === "error" ? "error-outline" : "check-circle"}
              size={22}
              color={message.type === "error" ? colors.error : colors.success}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}
            >
              {message.text}
            </Text>
            <TouchableOpacity
              onPress={() => setMessage(null)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="close" size={18} color={colors.lightBrown} />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Avatar */}
        <View
          style={{
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.heading,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              shadowColor: colors.heading,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <MaterialIcons name="person" size={48} color={colors.white} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {user.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.lightBrown,
              fontWeight: "500",
            }}
          >
            FunForest Member
          </Text>
        </View>

        {/* Profile Info */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 14,
          }}
        >
          Account Gegevens
        </Text>

        <View style={{ marginBottom: 24 }}>
          {profileOptions.map((option, idx) => (
            <View
              key={idx}
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
                <MaterialIcons
                  name={option.icon}
                  size={22}
                  color={colors.primary}
                />
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
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {option.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 14,
          }}
        >
          Acties
        </Text>

        <TouchableOpacity
          onPress={() => {
            setShowPasswordForm((v) => !v);
            setMessage(null);
          }}
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
            <MaterialIcons name="security" size={22} color={colors.primary} />
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            Wachtwoord Wijzigen
          </Text>
          <MaterialIcons
            name={showPasswordForm ? "expand-less" : "expand-more"}
            size={24}
            color={colors.lightBrown}
          />
        </TouchableOpacity>

        {showPasswordForm && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
            }}
          >
            {[
              {
                label: "Huidig wachtwoord",
                value: currentPassword,
                setter: setCurrentPassword,
              },
              {
                label: "Nieuw wachtwoord",
                value: newPassword,
                setter: setNewPassword,
              },
              {
                label: "Herhaal nieuw wachtwoord",
                value: confirmPassword,
                setter: setConfirmPassword,
              },
            ].map((field) => (
              <View key={field.label} style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.primary,
                    marginBottom: 8,
                  }}
                >
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry
                  placeholderTextColor={colors.lightGray}
                  style={{
                    borderWidth: 2,
                    borderColor: colors.paleGreen,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.text,
                    backgroundColor: colors.background,
                  }}
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={handleSavePassword}
              disabled={
                pwBusy || !currentPassword || !newPassword || !confirmPassword
              }
              style={{
                backgroundColor:
                  pwBusy || !currentPassword || !newPassword || !confirmPassword
                    ? colors.lightGray
                    : colors.primary,
                borderRadius: 10,
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
                {pwBusy ? "Bezig met opslaan..." : "Wachtwoord opslaan"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
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
            <MaterialIcons name="notifications" size={22} color={colors.primary} />
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            Meldingen
          </Text>
          <Switch
            value={notificationsOn}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={() => {
            logout();
            router.replace("/login");
          }}
          style={{
            backgroundColor: colors.white,
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 14,
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: colors.error,
          }}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={colors.error}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontWeight: "700",
              color: colors.error,
              fontSize: 14,
            }}
          >
            Uitloggen
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
