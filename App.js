import AppNavigator from "./src/app/AppNavigator";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import { initializeAds } from "./src/services/interstitialAd";
import { ThemeProvider } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { setAudioModeAsync } from "expo-audio";

export default function App() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      console.warn("[audio] Nao foi possivel configurar o audio:", error);
    });
    initializeAds();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
