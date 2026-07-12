import AppNavigator from "./src/app/AppNavigator";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import { ThemeProvider } from "./src/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
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
