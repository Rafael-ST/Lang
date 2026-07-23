import AppNavigator from "./src/app/AppNavigator";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import { initializeAds } from "./src/services/interstitialAd";
import { ThemeProvider } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";

export default function App() {
  useEffect(() => {
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
