import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ja: { translation: ja } },
  lng: getLocales()[0]?.languageCode === "ja" ? "ja" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
});

export const locale = () => (i18n.language === "ja" ? "ja-JP" : "en-US");

// Translated message for errors every screen shares; anything else shows the server's text.
export const errorMessage = (e: unknown) =>
  (e as { status?: number }).status === 0 ? i18n.t("common.network") : (e as Error).message;

export default i18n;
