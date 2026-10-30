import { useCallback, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { formatDate, getMyTickets, type TicketWithEvent } from "@/api";

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<TicketWithEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTickets(await getMyTickets());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!tickets && !error) return <ActivityIndicator style={styles.center} size="large" />;
  if (!tickets)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Retry" onPress={() => { setError(null); load(); }} />
      </View>
    );

  return (
    <FlatList
      data={tickets}
      keyExtractor={(t) => t.code}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={refresh}
      ListEmptyComponent={<Text style={styles.empty}>No tickets yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <QRCode value={item.code} size={160} />
          <View style={styles.info}>
            <Text style={styles.title}>{item.event.name}</Text>
            <Text style={styles.muted}>{formatDate(item.event.date)}</Text>
            <Text style={styles.muted}>{item.event.venue}</Text>
            <Text style={styles.code}>{item.code}</Text>
            {item.checkedInAt && (
              <Text style={styles.badge}>Checked in {formatDate(item.checkedInAt)}</Text>
            )}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", gap: 12, elevation: 2 },
  info: { alignItems: "center", gap: 2 },
  title: { fontSize: 18, fontWeight: "600" },
  muted: { color: "#666" },
  code: { fontFamily: "monospace", marginTop: 4 },
  error: { color: "#c00", textAlign: "center" },
  empty: { textAlign: "center", color: "#666", marginTop: 48 },
  badge: { marginTop: 8, backgroundColor: "#1a7f37", color: "#fff", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden" },
});
