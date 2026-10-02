import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import { accessHint, checkAccessCode, registrationOpen } from "@/lib/access";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [passNumber, setPassNumber] = useState("");
  // Alleen abonnementhouders met een activatiecode mogen registreren
  const canRegister = registrationOpen();
  const signupMode = isSignup && canRegister;
  const canSubmit = Boolean(
    email && password && (!signupMode || (name && accessCode.trim())),
  );
  const router = useRouter();
  const { user, login, signup } = useAuth();

  const colors = Colors.light;

  // if already logged in, skip login
  if (user) {
    return <Redirect href="/dashboard" />;
  }

  async function handleLogin() {
    setFormError(null);
    setNotice(null);
    if (!email || !password) {
      setFormError("Vul e-mail en wachtwoord in.");
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setFormError(`Login mislukt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup() {
    setFormError(null);
    setNotice(null);
    if (!canRegister) {
      setFormError("Registreren is gesloten. Alleen bestaande accounts kunnen inloggen.");
      return;
    }
    if (!email || !password || !name) {
      setFormError("Vul alle velden in.");
      return;
    }
    if (password.length < 6) {
      setFormError("Wachtwoord moet minstens 6 tekens lang zijn.");
      return;
    }
    if (!(await checkAccessCode(accessCode))) {
      setFormError(
        "Deze activatiecode klopt niet (meer). Vraag een nieuwe code bij het park.",
      );
      return;
    }
    setIsLoading(true);
    try {
      await signup(email, password, name, accessCode, passNumber.trim() || null);
      router.push("/dashboard");
    } catch (err) {
      setFormError(`Registratie mislukt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          {/* Header with Logo */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Image
              source={require("@/assets/brand/funforest-logo-web.png")}
              style={{ width: 104, height: 104, marginBottom: 16 }}
              resizeMode="contain"
              accessibilityLabel="Fun Forest logo"
            />
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: colors.heading,
                marginBottom: 8,
              }}
            >
              FunForest
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.lightBrown,
                fontWeight: "500",
              }}
            >
              Seizoenskaart
            </Text>
          </View>

          {/* Mode Toggle */}
          <View
            style={{
              flexDirection: "row",
              marginBottom: 32,
              backgroundColor: colors.paleGreen,
              borderRadius: 12,
              padding: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setIsSignup(false);
                setName("");
                setAccessCode("");
                setPassNumber("");
                setFormError(null);
                setNotice(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                backgroundColor: !isSignup ? colors.primary : "transparent",
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: !isSignup ? colors.white : colors.text,
                  fontWeight: "700",
                }}
              >
                Inloggen
              </Text>
            </TouchableOpacity>
            {canRegister && (
              <TouchableOpacity
                onPress={() => {
                  setIsSignup(true);
                  setEmail("");
                  setPassword("");
                  setAccessCode("");
                  setPassNumber("");
                  setFormError(null);
                  setNotice(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: isSignup ? colors.primary : "transparent",
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: isSignup ? colors.white : colors.text,
                    fontWeight: "700",
                  }}
                >
                  Registreren
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!canRegister && (
            <Text
              style={{
                fontSize: 12,
                color: colors.lightBrown,
                marginBottom: 24,
                lineHeight: 18,
              }}
            >
              {accessHint()}
            </Text>
          )}

          {/* Input Fields */}
          <View style={{ marginBottom: 32 }}>
            {/* Naam Input (only signup) */}
            {signupMode && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.primary,
                    marginBottom: 10,
                  }}
                >
                  Naam
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: colors.paleGreen,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    backgroundColor: colors.white,
                  }}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={colors.lightBrown}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="Jouw volledige naam"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={colors.lightGray}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: colors.text,
                    }}
                  />
                </View>
              </View>
            )}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.primary,
                  marginBottom: 10,
                }}
              >
                E-mailadres
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: colors.paleGreen,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  backgroundColor: colors.white,
                }}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={colors.lightBrown}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="naam@voorbeeld.nl"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.lightGray}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.text,
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.primary,
                  marginBottom: 10,
                }}
              >
                Wachtwoord
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: colors.paleGreen,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  backgroundColor: colors.white,
                }}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={colors.lightBrown}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  placeholder="Voer wachtwoord in"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.lightGray}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 8 }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={colors.lightBrown}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Activatiecode (alleen bij registreren) */}
            {signupMode && (
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.primary,
                    marginBottom: 10,
                  }}
                >
                  Activatiecode
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: colors.paleGreen,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    backgroundColor: colors.white,
                  }}
                >
                  <MaterialIcons
                    name="vpn-key"
                    size={20}
                    color={colors.lightBrown}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="code van je abonnement"
                    value={accessCode}
                    onChangeText={setAccessCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholderTextColor={colors.lightGray}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: colors.text,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.lightBrown,
                    marginTop: 6,
                    lineHeight: 16,
                  }}
                >
                  {accessHint()}
                </Text>
              </View>
            )}

            {/* Kaartnummer (alleen bij registreren, optioneel) */}
            {signupMode && (
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.primary,
                    marginBottom: 10,
                  }}
                >
                  Kaartnummer seizoenkaart <Text style={{ fontSize: 12, color: colors.lightBrown }}>(optioneel)</Text>
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: colors.paleGreen,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    backgroundColor: colors.white,
                  }}
                >
                  <MaterialIcons
                    name="credit-card"
                    size={20}
                    color={colors.lightBrown}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="bijv. 1234-5678"
                    value={passNumber}
                    onChangeText={setPassNumber}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholderTextColor={colors.lightGray}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: colors.text,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.lightBrown,
                    marginTop: 6,
                    lineHeight: 16,
                  }}
                >
                  Het nummer van je fysieke kaart uit de bevestigingsmail. Dat
                  nummer komt op je digitale kaart te staan en is de code waarmee
                  je boekt op funforest.nl.
                </Text>
              </View>
            )}
          </View>

          {/* Notice */}
          {notice && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.paleGreen,
                borderLeftWidth: 4,
                borderLeftColor: colors.accent,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <MaterialIcons
                name="info-outline"
                size={20}
                color={colors.accent}
                style={{ marginRight: 10 }}
              />
              <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
                {notice}
              </Text>
              <TouchableOpacity onPress={() => setNotice(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={16} color={colors.lightBrown} />
              </TouchableOpacity>
            </View>
          )}

          {/* Error message */}
          {formError && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FDECEA",
                borderLeftWidth: 4,
                borderLeftColor: colors.error,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <MaterialIcons
                name="error-outline"
                size={20}
                color={colors.error}
                style={{ marginRight: 10 }}
              />
              <Text style={{ flex: 1, fontSize: 13, color: colors.error }}>
                {formError}
              </Text>
              <TouchableOpacity onPress={() => setFormError(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={signupMode ? handleSignup : handleLogin}
            disabled={isLoading || !canSubmit}
            style={{
              backgroundColor: canSubmit ? colors.primary : colors.lightBrown,
              opacity: isLoading || !canSubmit ? 0.6 : 1,
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 20,
              alignItems: "center",
              marginBottom: 16,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: colors.white,
                fontSize: 16,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              {isLoading
                ? isSignup
                  ? "Bezig met registreren..."
                  : "Bezig met inloggen..."
                : isSignup
                  ? "Registreren"
                  : "Inloggen"}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => {
              setFormError(null);
              setNotice(
                "Wachtwoord vergeten? Bel het park via 088 - 369 7000 of mail venlo@funforest.nl, dan wordt het voor je aangepast.",
              );
            }}
            style={{
              alignItems: "center",
              paddingVertical: 12,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Wachtwoord vergeten?
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          {canRegister ? (
            <View style={{ alignItems: "center", flexDirection: "row" }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  letterSpacing: 0.2,
                }}
              >
                Abonnementhouder?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignup(true);
                  setAccessCode("");
                  setFormError(null);
                  setNotice(null);
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Activeer je kaart
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={{
                color: colors.lightBrown,
                fontSize: 13,
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Nieuwe accounts worden door het park aangemaakt. Neem contact op
              via 088 - 369 7000.
            </Text>
          )}

          {/* Forest decoration */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              opacity: 0.08,
              width: 200,
              height: 200,
            }}
          >
            <Image
            source={require("@/assets/brand/funforest-logo-web.png")}
            style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
