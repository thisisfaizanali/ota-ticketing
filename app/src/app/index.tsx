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
import { useTranslation } from "react-i18next";
import { errorMessage, locale } from "@/i18n";
import { ApiError, bookEvent, formatDate, getEvents, type Event } from "@/api";

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
      Alert.alert(t("events.booked"), t("events.bookedMessage", { count: quantity, name: event.name }));
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
      <Text style={styles.muted}>{formatDate(event.date)}</Text>
      <Text style={styles.muted}>{event.venue}</Text>
      <View style={styles.row}>
        <Text style={styles.price}>{yen(event.priceYen)}</Text>
        <Text style={styles.muted}>{t("events.left", { count: event.ticketsLeft })}</Text>
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
          <ActivityIndicator color="#fff" />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 4, elevation: 2 },
  title: { fontSize: 18, fontWeight: "600" },
  muted: { color: "#666" },
  error: { color: "#c00", textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  price: { fontSize: 16, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontSize: 20 },
  qty: { fontSize: 18, minWidth: 20, textAlign: "center" },
  book: { marginTop: 12, backgroundColor: "#208AEF", borderRadius: 8, height: 44, alignItems: "center", justifyContent: "center" },
  bookDisabled: { backgroundColor: "#aaa" },
  bookText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
