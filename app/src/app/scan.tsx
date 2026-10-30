import { useCallback, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ApiError, checkIn, formatDate } from "@/api";

type Result = { color: string; text: string };

export default function ScanScreen() {
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
      setResult({ color: "#1a7f37", text: `Checked in\n${ticket.event?.name ?? ticket.code}` });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409)
        setResult({ color: "#bf8700", text: `Already checked in at ${formatDate(e.body.checkedInAt)}` });
      else if (e instanceof ApiError && e.status === 404) setResult({ color: "#c00", text: "Unknown ticket" });
      else setResult({ color: "#c00", text: (e as Error).message });
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
            <Text style={styles.text}>Camera access is needed to scan tickets.</Text>
            <Button title="Allow camera" onPress={requestPermission} />
          </>
        ) : (
          <Text style={styles.text}>Camera access was denied. Enable it for this app in your phone's settings.</Text>
        )}
      </View>
    );

  return (
    <View style={styles.flex}>
      {focused && (
        <CameraView style={styles.flex} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
      )}
      {result && (
        <View style={[styles.panel, { backgroundColor: result.color }]}>
          <Text style={styles.result}>{result.text}</Text>
          <Button title="Scan next" onPress={next} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  text: { textAlign: "center", color: "#333" },
  panel: { position: "absolute", left: 16, right: 16, bottom: 32, borderRadius: 12, padding: 20, gap: 12 },
  result: { color: "#fff", fontSize: 20, fontWeight: "600", textAlign: "center" },
});
