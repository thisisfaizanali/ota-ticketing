import { useCallback, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/i18n";
import { ApiError, checkIn, formatDate } from "@/api";
import { colors, radius, space } from "@/theme";

type Result = { color: string; icon: keyof typeof Ionicons.glyphMap; text: string };

export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  // A ref, not state: the scanner fires many times before a re-render would land.
  const busy = useRef(false);

  // Only mount the camera while this tab is focused, so other tabs release it.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const onScan = async ({ data }: { data: string }) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const ticket = await checkIn(data);
      setResult({ color: colors.success, icon: "checkmark-circle", text: t("scan.checkedIn", { name: ticket.event?.name ?? ticket.code }) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        setResult({ color: colors.warning, icon: "alert-circle", text: t("scan.already", { date: formatDate(e.body.checkedInAt) }) });
      else if (e instanceof ApiError && e.status === 404) setResult({ color: colors.danger, icon: "close-circle", text: t("scan.unknown") });
      else setResult({ color: colors.danger, icon: "close-circle", text: errorMessage(e) });
    }
  };

  const next = () => {
    setResult(null);
    busy.current = false;
  };

  if (!permission) return null;
  if (!permission.granted)
    return (
      <View style={styles.center}>
        {permission.canAskAgain ? (
          <>
            <Text style={styles.text}>{t("scan.permission")}</Text>
            <Button title={t("scan.allow")} onPress={requestPermission} />
          </>
        ) : (
          <Text style={styles.text}>{t("scan.denied")}</Text>
        )}
      </View>
    );

  return (
    <View style={styles.flex}>
      {focused && (
        <CameraView style={styles.flex} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
      )}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.viewfinder} />
      </View>
      {result && (
        <View style={styles.panel}>
          <View style={styles.resultRow}>
            <Ionicons name={result.icon} size={44} color={result.color} />
            <Text style={[styles.result, { color: result.color }]}>{result.text}</Text>
          </View>
          <Button title={t("scan.next")} color={colors.primary} onPress={next} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  text: { textAlign: "center", color: colors.text },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  viewfinder: { width: 240, height: 240, borderWidth: 3, borderColor: colors.white, borderRadius: radius.md },
  panel: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: space.xl, gap: space.lg },
  resultRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  result: { flex: 1, fontSize: 18, fontWeight: "600" },
});
