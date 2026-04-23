import AppNavigator from "./src/app/AppNavigator";
import { AuthProvider } from "./src/features/auth/context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
