import { Pressable, Text } from "react-native";
import { Tabs } from "expo-router/js-tabs";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { colors } from "@/theme";

export default function RootLayout() {
  const { t, i18n } = useTranslation();
  const toggle = () => i18n.changeLanguage(i18n.language === "ja" ? "en" : "ja");

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
        headerRight: () => (
          <Pressable onPress={toggle} style={{ paddingHorizontal: 16 }} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              {i18n.language === "ja" ? "EN" : "日本語"}
            </Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.events") }} />
      <Tabs.Screen name="tickets" options={{ title: t("tabs.tickets") }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan") }} />
    </Tabs>
  );
}
