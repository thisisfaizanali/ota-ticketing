import { useCallback, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/i18n";
import { formatDate, getMyTickets, type TicketWithEvent } from "@/api";
import { colors, radius, space } from "@/theme";

export default function TicketsScreen() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<TicketWithEvent[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTickets(await getMyTickets());
      setError(null);
    } catch (e) {
      setError(e);
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
        <Text style={styles.error}>{errorMessage(error)}</Text>
        <Button title={t("common.retry")} onPress={() => { setError(null); load(); }} />
      </View>
    );

  return (
    <FlatList
      data={tickets}
      keyExtractor={(t) => t.code}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={refresh}
      ListHeaderComponent={error ? <Text style={styles.banner}>{errorMessage(error)}</Text> : undefined}
      ListEmptyComponent={<Text style={styles.empty}>{t("tickets.empty")}</Text>}
      renderItem={({ item }) => (
        <View style={[styles.card, item.checkedInAt && styles.used]}>
          <View style={styles.qr}>
            <QRCode value={item.code} size={160} />
          </View>
          {/* Dashed tear line between the stub and the details. */}
          <View style={styles.tear} />
          <View style={styles.info}>
            <Text style={styles.title}>{item.event.name}</Text>
            <Text style={styles.muted}>{formatDate(item.event.date)}</Text>
            <Text style={styles.muted}>{item.event.venue}</Text>
            <Text style={styles.code}>{item.code}</Text>
            {item.checkedInAt && (
              <Text style={styles.badge}>{t("tickets.checkedIn", { date: formatDate(item.checkedInAt) })}</Text>
            )}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  list: { padding: space.lg, gap: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, elevation: 2, overflow: "hidden" },
  used: { opacity: 0.5 },
  qr: { alignItems: "center", padding: space.xl },
  tear: { borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.border, marginHorizontal: space.md },
  info: { alignItems: "center", gap: 2, padding: space.lg },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  muted: { color: colors.muted },
  code: { fontFamily: "monospace", marginTop: space.sm, color: colors.text, letterSpacing: 1 },
  error: { color: colors.danger, textAlign: "center" },
  banner: { backgroundColor: colors.danger, color: colors.white, borderRadius: radius.sm, padding: 10, textAlign: "center", overflow: "hidden" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 48 },
  badge: { marginTop: space.sm, backgroundColor: colors.success, color: colors.white, fontWeight: "600", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: space.xs, overflow: "hidden" },
});
