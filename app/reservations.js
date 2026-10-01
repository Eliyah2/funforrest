import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useAuth } from "@/lib/AuthProvider";
import {
  inWinterstop,
  lastOpenDate,
  loadParkDays,
  slotsForDay,
  subscribeParkDays,
  winterstopStart,
} from "@/lib/parkHours";
import {
  CAPACITY,
  addReservation,
  cancelReservation,
  dateKey,
  formatBookingDate as formatDate,
  loadReservations,
  parseKey,
} from "@/lib/reservations";

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function shortHours(day) {
  if (!day || !day.open || !day.close) return null;
  return `${day.open.slice(0, 2)}-${day.close.slice(0, 2)}`;
}

export default function ReservationsScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [reservations, setReservations] = useState([]);
  const [calendar, setCalendar] = useState({
    days: {},
    lastDate: null,
    source: null,
  });
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayKey = dateKey(new Date());
  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  // Op smalle telefoons korten we de daglabels in zodat alles blijft passen.
  const { width: screenWidth } = useWindowDimensions();
  const narrow = screenWidth < 380;

  // Echte openingstijden ophalen (met cache) + live verversen
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadParkDays();
      if (!cancelled) {
        setCalendar(result);
        setLoadingCalendar(false);
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

  // Opgeslagen reserveringen terugladen
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadReservations();
      if (!cancelled) setReservations(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReservations = async () => {
    setReservations(await loadReservations());
  };

  const bookingsFor = (key, time) =>
    reservations.filter((r) => r.date === key && r.time === time);

  const myBookings = reservations
    .filter((r) => r.email === user.email)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const days = calendar.days || {};
  const selectedDay = selectedKey ? days[selectedKey] : null;
  const slots = useMemo(
    () => (selectedDay ? slotsForDay(selectedDay) : []),
    [selectedDay]
  );
  const selectedSlot = slots.find((s) => s.time === selectedTimeSlot) || null;
  const bookableDays = Object.values(days).filter(
    (d) => d.status === "open"
  ).length;
  const lastPlannable = calendar.lastDate;
  // Winterstop: het park is dicht van eind oktober tot begin maart
  const lastOpen = lastOpenDate(days);
  const winterstop = inWinterstop(days, todayKey);
  const winterStarts = winterstopStart(days, lastOpen);

  // Maandnavigatie: van deze maand tot en met de laatst gepubliceerde maand
  const minMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const maxMonth = lastPlannable
    ? new Date(
        parseInt(lastPlannable.slice(0, 4), 10),
        parseInt(lastPlannable.slice(5, 7), 10) + 1, // 2 extra maanden: winterstop tonen
        1
      )
    : new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 2,
        1
      );

  const shiftMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      if (next < minMonth) return minMonth;
      if (next > maxMonth) return maxMonth;
      return next;
    });
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  const canGoPrev = cursor > minMonth;
  const canGoNext = cursor < maxMonth;

  const goToday = () => {
    setCursor(new Date(minMonth));
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  // Kalenderrooster van de zichtbare maand (maandag = eerste kolom)
  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= total; day++) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cursor]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const keyForCell = (day) => dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));

  const renderDayCell = (day, idx) => {
    if (!day) return <View key={`empty-${idx}`} style={{ flex: 1 }} />;
    const key = keyForCell(day);
    const info = days[key];
    const isPast = key < todayKey;
    const isSelected = selectedKey === key;
    const isOpen = info && info.status === "open";
    const bookable = isOpen && !isPast;
    const beyondSeason = Boolean(lastOpen && key > lastOpen);
    const winterLabel = narrow ? "winter" : "winterstop";
    const statusLabel = info
      ? info.status === "open"
        ? shortHours(info)
        : info.status === "aanvraag"
          ? narrow
            ? "aanvr."
            : "aanvraag"
          : info.status === "gesloten"
            ? beyondSeason
              ? winterLabel
              : narrow
                ? "dicht"
                : "gesloten"
            : beyondSeason
              ? winterLabel
              : "volgt"
      : beyondSeason
        ? winterLabel
        : "volgt";

    const backgroundColor = isSelected
      ? colors.primary
      : bookable
        ? colors.white
        : info && info.status === "aanvraag"
          ? "#F2F4F7"
          : "transparent";
    const borderColor = isSelected
      ? colors.primary
      : bookable
        ? colors.paleGreen
        : colors.lightGray;
    const mainColor = isSelected
      ? colors.white
      : bookable
        ? colors.text
        : colors.lightBrown;
    const subColor = isSelected
      ? "rgba(255,255,255,0.85)"
      : bookable
        ? colors.success
        : colors.lightGray;

    return (
      <View key={key} style={{ flex: 1 }}>
        <TouchableOpacity
          disabled={!bookable}
          onPress={() => {
            setSelectedDate(parseKey(key));
            setSelectedTimeSlot(null);
          }}
          accessibilityLabel={`${day} ${MONTHS[cursor.getMonth()]}`}
          style={{
            height: 58,
            borderRadius: 10,
            backgroundColor,
            borderWidth: 2,
            borderColor,
            alignItems: "center",
            justifyContent: "center",
            opacity: isPast ? 0.45 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: mainColor,
              lineHeight: 18,
            }}
          >
            {day}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 8,
              letterSpacing: -0.2,
              fontWeight: "600",
              color: subColor,
              marginTop: 1,
            }}
          >
            {isPast ? "" : statusLabel || ""}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleConfirmReservation = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setMessage({
        type: "error",
        text: "Kies eerst een datum én een tijdslot.",
      });
      return;
    }
    if (!selectedDay || selectedDay.status !== "open" || slots.length === 0) {
      setMessage({
        type: "error",
        text: "Op deze dag is het park niet regulier geopend. Kies een andere datum.",
      });
      return;
    }

    const taken = bookingsFor(selectedKey, selectedTimeSlot);
    const mine = taken.some((r) => r.email === user.email);

    if (mine) {
      setMessage({
        type: "error",
        text: "Je hebt dit tijdslot al gereserveerd. Kies een ander tijdstip.",
      });
      return;
    }
    if (taken.length >= CAPACITY) {
      setMessage({
        type: "error",
        text: "Dit tijdslot is vol. Kies een ander tijdstip.",
      });
      return;
    }

    const booking = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: selectedKey,
      time: selectedTimeSlot,
      email: user.email,
      name: user.name,
    };

    try {
      await addReservation(booking);
      await refreshReservations();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      return;
    }
    setMessage({
      type: "success",
      text: `Gereserveerd: ${formatDate(selectedDate)} om ${selectedTimeSlot}. Check in bij de ingang om een bezoek te tellen.`,
    });
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  const handleCancel = async (id) => {
    try {
      await cancelReservation(id);
      await refreshReservations();
      setMessage({ type: "success", text: "Reservering geannuleerd." });
    } catch (err) {
      setMessage({ type: "error", text: `Annuleren lukte niet: ${err.message}` });
    }
  };

  const dayProblem = (key) => {
    const info = days[key];
    if (!info) return "Nog niet gepubliceerd";
    if (info.status === "gesloten") return "Gesloten";
    if (info.status === "aanvraag") return "Alleen op aanvraag";
    if (info.status === "open") return `Geopend ${info.label}`;
    return "Tijden volgen";
  };

  const canConfirm = Boolean(selectedDate && selectedTimeSlot && slots.length);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
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
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.heading,
            }}
          >
            Reserveren
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

        {/* Planning-vooruit-balk */}
        <View
          style={{
            backgroundColor: colors.paleGreen,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <MaterialIcons
            name="event-available"
            size={20}
            color={colors.primary}
            style={{ marginRight: 10 }}
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
            {loadingCalendar
              ? "Echte openingstijden laden…"
              : winterstop
                ? `Winterstop: het park is dicht${winterStarts ? ` vanaf ${formatDate(parseKey(winterStarts))}` : " van eind oktober"} tot begin maart. Laatste geopende dag in de kalender: ${formatDate(parseKey(lastOpen))}. Reserveren gaat weer open zodra er nieuwe tijden zijn.`
                : winterStarts
                  ? `Binnenkort winterstop: vanaf ${formatDate(parseKey(winterStarts))} is het park dicht tot begin maart (laatste geopende dag: ${formatDate(parseKey(lastOpen))}). Plan je bezoek vóór die datum.`
                  : lastPlannable
                  ? `Plan tot en met ${formatDate(parseKey(lastPlannable))}. Kies een datum die jou uitkomt.`
                  : "Kies een datum die jou uitkomt."}
          </Text>
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
              borderLeftColor: message.type === "error" ? colors.error : colors.success,
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
              style={{
                flex: 1,
                fontSize: 13,
                color: colors.text,
                lineHeight: 19,
              }}
            >
              {message.text}
            </Text>
            <TouchableOpacity
              onPress={() => setMessage(null)}
              style={{ padding: 4 }}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={colors.lightBrown}
              />
            </TouchableOpacity>
          </View>
        )}

        {calendar.source === "fallback" && (
          <View
            style={{
              backgroundColor: "#FFF4E5",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="wifi-off"
              size={20}
              color={colors.accent}
              style={{ marginRight: 10 }}
            />
            <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 }}>
              Geen verbinding met de kalender: het getoonde weekpatroon is een
              richtlijn. Controleer voor vertrek de website.
            </Text>
          </View>
        )}

        {/* Kalender */}
        <View style={{ marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.heading,
              }}
            >
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={goToday}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: colors.paleGreen,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  Vandaag
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.white,
                  borderWidth: 2,
                  borderColor: colors.paleGreen,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: canGoPrev ? 1 : 0.35,
                }}
              >
                <MaterialIcons name="chevron-left" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => shiftMonth(1)}
                disabled={!canGoNext}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.white,
                  borderWidth: 2,
                  borderColor: colors.paleGreen,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: canGoNext ? 1 : 0.35,
                }}
              >
                <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekdagen-kop */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
            {WEEKDAYS.map((label) => (
              <Text
                key={label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: "700",
                  color: colors.lightBrown,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, weekIdx) => (
            <View key={`week-${weekIdx}`} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              {week.map((day, dayIdx) => renderDayCell(day, dayIdx))}
            </View>
          ))}

          {/* Legenda */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.success,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.lightBrown }}>Geopend</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.lightGray,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.lightBrown }}>
                Op aanvraag / gesloten
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#E4E7EC",
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.lightBrown }}>
                Kalender volgt
              </Text>
            </View>
            {winterStarts && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#7FB3D5",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 11, color: colors.lightBrown }}>
                  Winterstop
                </Text>
              </View>
            )}
          </View>

          {bookableDays > 0 && (
            <Text style={{ fontSize: 11, color: colors.lightBrown, marginTop: 8 }}>
              {bookableDays} geopende dagen in de komende periode — reserveren mag
              tot ver vooruit.
            </Text>
          )}
        </View>

        {/* Tijdslots */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.heading,
              marginBottom: 6,
            }}
          >
            Selecteer een tijdslot
          </Text>

          {!selectedKey && (
            <Text
              style={{
                fontSize: 12,
                color: colors.lightBrown,
                marginBottom: 14,
              }}
            >
              Kies eerst een geopende datum om de beschikbaarheid te zien.
            </Text>
          )}

          {selectedKey && selectedDay && selectedDay.status === "open" && (
            <Text
              style={{
                fontSize: 12,
                color: colors.lightBrown,
                marginBottom: 14,
              }}
            >
              {formatDate(selectedDate)} geopend van {selectedDay.open} tot{" "}
              {selectedDay.close} · {CAPACITY} plekken per tijdslot.
            </Text>
          )}

          {selectedKey && (!selectedDay || selectedDay.status !== "open") && (
            <View
              style={{
                backgroundColor: "#F2F4F7",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginBottom: 14,
                borderLeftWidth: 4,
                borderLeftColor: colors.lightGray,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: "600" }}>
                {dayProblem(selectedKey)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.lightBrown, marginTop: 4 }}>
                Kies een andere datum in de kalender hierboven.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {slots.map((slot) => {
              const taken = selectedKey
                ? bookingsFor(selectedKey, slot.time)
                : [];
              const mine = taken.some((r) => r.email === user.email);
              const full = taken.length >= CAPACITY;
              const free = CAPACITY - taken.length;
              const isSelected = selectedTimeSlot === slot.time;
              const disabled = !selectedKey || mine || full;

              let caption = null;
              if (mine) {
                caption = "Van jou";
              } else if (full) {
                caption = "Vol";
              } else {
                caption = `nog ${free} plekken`;
              }

              return (
                <TouchableOpacity
                  key={slot.id}
                  onPress={() => !disabled && setSelectedTimeSlot(slot.time)}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor: disabled
                      ? colors.lightGray
                      : isSelected
                        ? colors.primary
                        : colors.white,
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isSelected ? 0 : 2,
                    borderColor: disabled ? "transparent" : colors.paleGreen,
                    opacity: disabled ? 0.7 : 1,
                    shadowColor: isSelected ? colors.primary : "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.25 : 0.08,
                    shadowRadius: 8,
                    elevation: isSelected ? 6 : 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: disabled
                        ? colors.lightBrown
                        : isSelected
                          ? colors.white
                          : colors.text,
                    }}
                  >
                    {slot.time}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isSelected ? colors.white : colors.lightBrown,
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {`tot ${slot.end}${caption ? ` · ${caption}` : ""}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Samenvatting */}
        {selectedDate && selectedSlot && (
          <View
            style={{
              backgroundColor: colors.paleGreen,
              borderRadius: 14,
              paddingVertical: 18,
              paddingHorizontal: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.lightBrown,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Samenvatting
              </Text>
              <MaterialIcons name="check-circle" size={20} color={colors.primary} />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    marginBottom: 2,
                  }}
                >
                  {formatDate(selectedDate)}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {selectedSlot.time} - {selectedSlot.end}
                </Text>
              </View>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
              </View>
            </View>
          </View>
        )}

        {/* Bevestigen */}
        <TouchableOpacity
          onPress={handleConfirmReservation}
          disabled={!canConfirm}
          style={{
            backgroundColor: canConfirm ? colors.primary : colors.lightGray,
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: "center",
            marginBottom: 24,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canConfirm ? 0.3 : 0,
            shadowRadius: 8,
            elevation: canConfirm ? 8 : 0,
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
            Reservering Bevestigen
          </Text>
        </TouchableOpacity>

        {/* Eigen reserveringen */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.heading,
            marginBottom: 14,
          }}
        >
          Jouw reserveringen
        </Text>

        {myBookings.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              paddingVertical: 18,
              paddingHorizontal: 14,
              marginBottom: 24,
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="event-busy"
              size={26}
              color={colors.lightBrown}
              style={{ marginBottom: 6 }}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.lightBrown,
                textAlign: "center",
              }}
            >
              Nog geen reserveringen. Kies een datum en tijdslot hierboven.
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: 24 }}>
            {myBookings.map((booking) => {
              const info = days[booking.date];
              const changed =
                info && info.status !== "open"
                  ? `Let op: ${dayProblem(booking.date)}`
                  : info &&
                      info.open &&
                      info.close &&
                      (booking.time < info.open || booking.time >= info.close)
                    ? `Openingstijden zijn inmiddels ${info.label}`
                    : null;
              return (
                <View
                  key={booking.id}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    marginBottom: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: changed ? colors.accent : colors.primary,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons
                      name="event-available"
                      size={24}
                      color={changed ? colors.accent : colors.primary}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.text,
                          marginBottom: 2,
                        }}
                      >
                        {formatDate(parseKey(booking.date))} om {booking.time}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.lightBrown }}>
                        {booking.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCancel(booking.id)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: colors.error,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: colors.error,
                        }}
                      >
                        Annuleren
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {changed && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                        marginLeft: 36,
                      }}
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={14}
                        color={colors.accent}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 11, color: colors.accent, flex: 1 }}>
                        {changed}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Info Box */}
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 14,
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
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: colors.text,
              lineHeight: 18,
              fontWeight: "500",
            }}
          >
            Reserveren mag tot ver vooruit zolang de kalender gevuld is. Elke dag
            toont de echte openingstijden van het park. Kom je toch niet?
            Annuleer dan op tijd, dan heeft iemand anders je plek.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
