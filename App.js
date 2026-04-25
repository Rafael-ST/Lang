import AppNavigator from "./src/app/AppNavigator";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import { ThemeProvider } from "./src/theme";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
