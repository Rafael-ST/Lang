import { Alert, Linking } from "react-native";

import { API_BASE_URL } from "../config/api";

const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ||
  `${apiOrigin}/politica-de-privacidade/`;

export async function openPrivacyPolicy() {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert(
      "Não foi possível abrir",
      "Verifique sua conexão e tente acessar a Política de Privacidade novamente."
    );
  }
}
