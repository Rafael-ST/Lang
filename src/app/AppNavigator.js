import { StatusBar } from "expo-status-bar";
import { useState } from "react";

import { useAuth } from "../features/auth/context/AuthContext";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import LoggedScreen from "../screens/LoggedScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { useTheme } from "../theme";

export default function AppNavigator() {
  const { isLoading, user } = useAuth();
  const { isDarkMode } = useTheme();
  const [screen, setScreen] = useState("login");
  const [isManualLoggedIn, setIsManualLoggedIn] = useState(false);

  if (isLoading) {
    return (
      <>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <LoggedScreen loading />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      {user || isManualLoggedIn ? (
        <LoggedScreen onLogout={() => setIsManualLoggedIn(false)} />
      ) : screen === "forgot-password" ? (
        <ForgotPasswordScreen onBack={() => setScreen("login")} />
      ) : screen === "register" ? (
        <RegisterScreen
          onBack={() => setScreen("login")}
          onRegisterPress={() => setIsManualLoggedIn(true)}
        />
      ) : (
        <LoginScreen
          onForgotPasswordPress={() => setScreen("forgot-password")}
          onLoginPress={() => setIsManualLoggedIn(true)}
          onRegisterPress={() => setScreen("register")}
        />
      )}
    </>
  );
}
