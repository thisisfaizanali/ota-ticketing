import { Pressable, Text, type ColorValue } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { colors } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
  <Ionicons name={(focused ? name : `${name}-outline`) as IconName} color={color as string} size={size} />
);

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
      <Tabs.Screen name="index" options={{ title: t("tabs.events"), tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="tickets" options={{ title: t("tabs.tickets"), tabBarIcon: icon("ticket") }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan"), tabBarIcon: icon("qr-code") }} />
    </Tabs>
  );
}
