import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { checkAccessCode, registrationOpen } from "@/lib/access";
import { profileToUser, supabase, supabaseEnabled } from "@/lib/supabase";

const AuthContext = createContext(null);

const USERS_KEY = "funforest_users";
const SESSION_KEY = "funforest_session";

// In-memory user database voor de lokale modus (zonder Supabase-sleutels),
// gespiegeld naar opslag zodat hij een refresh overleeft.
const USERS_DB = [];

async function persistUsers() {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(USERS_DB));
  } catch {
    // opslag niet beschikbaar: app blijft in-memory werken
  }
}

async function persistSession(user) {
  try {
    if (user) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // opslag niet beschikbaar: geen sessie bewaren
  }
}

// ---------- Supabase-hulpjes -----------------------------------------------
function mapAuthError(message = "") {
  const text = String(message).toLowerCase();
  if (text.includes("already registered")) return "Dit e-mailadres is al in gebruik.";
  if (text.includes("invalid login")) return "Ongeldige inloggegevens.";
  if (text.includes("email not confirmed")) return "Bevestig eerst je e-mail voordat je inlogt.";
  if (text.includes("password")) return "Het wachtwoord voldoet niet aan de eisen (minstens 6 tekens).";
  if (text.includes("rate limit")) return "Te veel pogingen. Probeer het over een minuut opnieuw.";
  return message;
}

async function fetchProfile(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mapAuthError(error.message));
  return data || null;
}

async function ensureProfile(authUser, name = "", passNumber = null) {
  const existing = await fetchProfile(authUser.id);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: authUser.id,
        email: authUser.email,
        name: name || authUser.user_metadata?.name || "",
        pass_number: passNumber || authUser.user_metadata?.pass_number || null,
      },
      { onConflict: "id" },
    )
    .select()
    .single();
  if (error) throw new Error(mapAuthError(error.message));
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Accounts en sessie terugladen bij het opstarten
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (supabaseEnabled) {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (!cancelled && session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (!cancelled && profile) setUser(profileToUser(profile, session.user.email));
          }
          // Meeluisteren met inloggen/uitloggen/verversen van de sessie
          supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (cancelled) return;
            if (!nextSession?.user) {
              setUser(null);
              return;
            }
            fetchProfile(nextSession.user.id)
              .then((profile) => {
                if (!cancelled && profile) {
                  setUser(profileToUser(profile, nextSession.user.email));
                }
              })
              .catch(() => {});
          });
        } else {
          const [rawUsers, rawSession] = await Promise.all([
            AsyncStorage.getItem(USERS_KEY),
            AsyncStorage.getItem(SESSION_KEY),
          ]);
          if (cancelled) return;

          if (rawUsers) {
            const parsed = JSON.parse(rawUsers);
            if (Array.isArray(parsed)) {
              USERS_DB.length = 0;
              USERS_DB.push(...parsed);
            }
          }
          if (rawSession) {
            setUser(JSON.parse(rawSession));
          }
        }
      } catch {
        // kapotte/lege opslag of even geen verbinding: gewoon leeg starten
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Registreren: alleen abonnementhouders met een geldige activatiecode
  const signup = async (email, password, name, accessCode, passNumber) => {
    if (!registrationOpen()) {
      throw new Error(
        "Registreren is gesloten. Alleen bestaande accounts kunnen inloggen.",
      );
    }
    if (!checkAccessCode(accessCode)) {
      throw new Error(
        "Deze activatiecode hoort niet bij een abonnement. Vraag de code bij het park.",
      );
    }

    if (supabaseEnabled) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || "",
            pass_number: passNumber || null,
          },
        },
      });
      if (error) throw new Error(mapAuthError(error.message));
      if (!data.session) {
        throw new Error(
          "Check je e-mail om je account te bevestigen; daarna kun je inloggen.",
        );
      }
      const profile = await ensureProfile(data.user, name, passNumber);
      const u = profileToUser(profile, email);
      setUser(u);
      return u;
    }

    // Lokale modus
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (USERS_DB.some((u) => u.email === email)) {
          reject(new Error("Email al in gebruik"));
          return;
        }
        const newUser = {
          email,
          password,
          name,
          passNumber: passNumber || null,
          visits: 0,
          memberSinceISO: new Date().toISOString(),
          memberSince: new Date().toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        };
        USERS_DB.push(newUser);
        const session = {
          email: newUser.email,
          name: newUser.name,
          passNumber: newUser.passNumber,
          visits: newUser.visits,
          memberSince: newUser.memberSince,
          memberSinceISO: newUser.memberSinceISO,
        };
        setUser(session);
        await persistUsers();
        await persistSession(session);
        resolve(newUser);
      }, 800);
    });
  };

  const login = async (email, password) => {
    if (supabaseEnabled) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(mapAuthError(error.message));
      const profile = await ensureProfile(data.user);
      const u = profileToUser(profile, email);
      setUser(u);
      return u;
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const found = USERS_DB.find(
          (u) => u.email === email && u.password === password,
        );
        if (found) {
          const u = {
            email: found.email,
            name: found.name,
            passNumber: found.passNumber || null,
            visits: found.visits,
            memberSince: found.memberSince,
            memberSinceISO: found.memberSinceISO,
            notifications: found.notifications,
          };
          setUser(u);
          await persistSession(u);
          resolve(u);
        } else {
          reject(new Error("Ongeldige inloggegevens"));
        }
      }, 800);
    });
  };

  const addVisit = async () => {
    if (!user) return;

    if (supabaseEnabled) {
      const next = (user.visits || 0) + 1;
      const { error } = await supabase
        .from("profiles")
        .update({ visits: next })
        .eq("id", user.id);
      if (error) throw new Error(mapAuthError(error.message));
      setUser((prev) => ({ ...prev, visits: next }));
      return;
    }

    const dbUser = USERS_DB.find((u) => u.email === user.email);
    if (dbUser) {
      dbUser.visits += 1;
    }
    // Functionele update: ook bij snelle dubbele tik altijd de juiste teller
    setUser((prev) => ({
      ...prev,
      visits: dbUser ? dbUser.visits : (prev.visits || 0) + 1,
    }));
    await persistUsers();
    await persistSession({
      ...user,
      visits: dbUser ? dbUser.visits : user.visits + 1,
    });
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) {
      throw new Error("Je bent niet ingelogd.");
    }
    if (!currentPassword || !newPassword) {
      throw new Error("Vul beide wachtwoorden in.");
    }
    if (newPassword.length < 6) {
      throw new Error("Het nieuwe wachtwoord moet minstens 6 tekens lang zijn.");
    }

    if (supabaseEnabled) {
      // Eerst het huidige wachtwoord controleren, daarna wijzigen
      const verify = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verify.error) throw new Error("Het huidige wachtwoord klopt niet.");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(mapAuthError(error.message));
      return;
    }

    const dbUser = USERS_DB.find((u) => u.email === user.email);
    if (!dbUser) {
      throw new Error("Dit account staat niet op dit apparaat.");
    }
    if (dbUser.password !== currentPassword) {
      throw new Error("Het huidige wachtwoord klopt niet.");
    }
    dbUser.password = newPassword;
    await persistUsers();
  };

  const updateSession = async (patch) => {
    if (!user) return;
    const updated = { ...user, ...patch };
    setUser(updated);

    if (supabaseEnabled && user.id) {
      const allowed = {};
      if ("name" in patch) allowed.name = patch.name;
      if ("notifications" in patch) allowed.notifications = patch.notifications;
      if ("passNumber" in patch) allowed.pass_number = patch.passNumber;
      if (Object.keys(allowed).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(allowed)
          .eq("id", user.id);
        if (error) throw new Error(mapAuthError(error.message));
      }
      return;
    }

    const dbUser = USERS_DB.find((u) => u.email === user.email);
    if (dbUser) {
      Object.assign(dbUser, patch);
      await persistUsers();
    }
    await persistSession(updated);
  };

  const logout = async () => {
    setUser(null);
    if (supabaseEnabled) {
      await supabase.auth.signOut();
    }
    await persistSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        signup,
        addVisit,
        changePassword,
        updateSession,
        hydrated,
        loading: !hydrated,
        supabaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
