import Constants from "expo-constants";
import { Platform } from "react-native";

const googleAuth = Constants.expoConfig?.extra?.googleAuth ?? {};

export const googleAuthConfig = {
  androidClientId: googleAuth.androidClientId ?? "",
  iosClientId: googleAuth.iosClientId ?? "",
  webClientId: googleAuth.webClientId ?? "",
};

export function isGoogleAuthConfigured() {
  const hasWebClientId =
    Boolean(googleAuthConfig.webClientId) &&
    !String(googleAuthConfig.webClientId).startsWith("COLE_AQUI");
  const hasAndroidClientId =
    Boolean(googleAuthConfig.androidClientId) &&
    !String(googleAuthConfig.androidClientId).startsWith("COLE_AQUI");
  const hasIosClientId =
    Boolean(googleAuthConfig.iosClientId) &&
    !String(googleAuthConfig.iosClientId).startsWith("COLE_AQUI");

  if (Platform.OS === "android") {
    return hasAndroidClientId || hasWebClientId;
  }

  if (Platform.OS === "ios") {
    return hasIosClientId || hasWebClientId;
  }

  return hasWebClientId;
}
