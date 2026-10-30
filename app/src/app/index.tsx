import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { errorMessage, locale } from "@/i18n";
import { ApiError, bookEvent, formatDate, getEvents, type Event } from "@/api";
import { colors, radius, space } from "@/theme";

const yen = (n: number) => new Intl.NumberFormat(locale(), { style: "currency", currency: "JPY" }).format(n);

export default function EventsScreen() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await getEvents());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!events && !error) return <ActivityIndicator style={styles.center} size="large" />;
  if (!events)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorMessage(error)}</Text>
        <Button title={t("common.retry")} onPress={() => { setError(null); load(); }} />
      </View>
    );

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => String(e.id)}
      renderItem={({ item }) => <EventCard event={item} onBooked={load} />}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={error ? <Text style={styles.banner}>{errorMessage(error)}</Text> : undefined}
      ListEmptyComponent={<Text style={styles.muted}>{t("events.empty")}</Text>}
    />
  );
}

function EventCard({ event, onBooked }: { event: Event; onBooked: () => Promise<void> }) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(1);
  const [booking, setBooking] = useState(false);
  const max = Math.min(4, event.ticketsLeft);
  const soldOut = event.ticketsLeft === 0;
  const quantity = Math.min(qty, Math.max(max, 1));

  const book = async () => {
    setBooking(true);
    try {
      await bookEvent(event.id, quantity);
      Alert.alert(t("events.booked"), t("events.bookedMessage", { count: quantity, name: event.name }), [
        { text: t("common.ok") },
        { text: t("events.viewTickets"), onPress: () => router.navigate("/tickets") },
      ]);
      setQty(1);
    } catch (e) {
      const notEnough = e instanceof ApiError && e.status === 409;
      Alert.alert(t("events.bookFailed"), notEnough ? t("events.notEnough") : errorMessage(e));
    } finally {
      await onBooked();
      setBooking(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{event.name}</Text>
      <Text style={styles.muted}>{formatDate(event.date)} · {event.venue}</Text>
      <View style={styles.row}>
        <Text style={styles.price}>{yen(event.priceYen)}</Text>
        {soldOut ? (
          <Text style={styles.soldOutPill}>{t("events.soldOut")}</Text>
        ) : (
          <Text style={[styles.left, event.ticketsLeft <= 5 && styles.leftLow]}>
            {t("events.left", { count: event.ticketsLeft })}
          </Text>
        )}
      </View>
      {!soldOut && (
        <View style={styles.stepper}>
          <StepButton label="−" disabled={quantity <= 1} onPress={() => setQty(quantity - 1)} />
          <Text style={styles.qty}>{quantity}</Text>
          <StepButton label="+" disabled={quantity >= max} onPress={() => setQty(quantity + 1)} />
        </View>
      )}
      <Pressable
        style={[styles.book, (soldOut || booking) && styles.bookDisabled]}
        disabled={soldOut || booking}
        onPress={book}
      >
        {booking ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.bookText}>{soldOut ? t("events.soldOut") : t("events.book", { count: quantity })}</Text>
        )}
      </Pressable>
    </View>
  );
}

function StepButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.step, disabled && styles.stepDisabled]} disabled={disabled} onPress={onPress}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  list: { padding: space.lg, gap: space.md },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.xs, elevation: 2 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  muted: { color: colors.muted },
  error: { color: colors.danger, textAlign: "center" },
  banner: { backgroundColor: colors.danger, color: colors.white, borderRadius: radius.sm, padding: 10, textAlign: "center", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.sm },
  price: { fontSize: 22, fontWeight: "700", color: colors.text },
  left: { color: colors.muted, fontWeight: "600" },
  leftLow: { color: colors.warning },
  soldOutPill: { backgroundColor: colors.danger, color: colors.white, fontWeight: "600", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2, overflow: "hidden" },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.sm },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontSize: 20, color: colors.text },
  qty: { fontSize: 18, minWidth: 20, textAlign: "center", color: colors.text },
  book: { marginTop: space.md, backgroundColor: colors.primary, borderRadius: radius.sm, height: 44, alignItems: "center", justifyContent: "center" },
  bookDisabled: { backgroundColor: colors.disabled },
  bookText: { color: colors.white, fontWeight: "600", fontSize: 16 },
});
