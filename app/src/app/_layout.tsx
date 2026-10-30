import { Tabs } from "expo-router/js-tabs";

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Events" }} />
      <Tabs.Screen name="tickets" options={{ title: "My tickets" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
    </Tabs>
  );
}
