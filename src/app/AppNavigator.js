import { StatusBar } from "expo-status-bar";
import { Animated, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../features/auth/context/AuthContext";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import LoggedScreen from "../screens/LoggedScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CategoryModuleScreen from "../screens/CategoryModuleScreen";
import { useTheme } from "../theme";

const VIBRATION_STORAGE_KEY = "@lang/vibration-enabled";
const SOUND_STORAGE_KEY = "@lang/sound-enabled";

export default function AppNavigator() {
  const { isLoading, signOut, user } = useAuth();
  const { colors, isDarkMode, setDarkMode, shadows } = useTheme();
  const [screen, setScreen] = useState("login");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isManualLoggedIn, setIsManualLoggedIn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors, shadows);
  const isLoggedIn = Boolean(user || isManualLoggedIn);

  const rotationStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
  };

  useEffect(() => {
    async function restoreSettingsPreferences() {
      const [storedVibrationPreference, storedSoundPreference] =
        await Promise.all([
          AsyncStorage.getItem(VIBRATION_STORAGE_KEY),
          AsyncStorage.getItem(SOUND_STORAGE_KEY),
        ]);

      if (
        storedVibrationPreference === "enabled" ||
        storedVibrationPreference === "disabled"
      ) {
        setIsVibrationEnabled(storedVibrationPreference === "enabled");
      }

      if (
        storedSoundPreference === "enabled" ||
        storedSoundPreference === "disabled"
      ) {
        setIsSoundEnabled(storedSoundPreference === "enabled");
      }
    }

    restoreSettingsPreferences();
  }, []);

  async function handleVibrationChange(nextIsEnabled) {
    setIsVibrationEnabled(nextIsEnabled);
    await AsyncStorage.setItem(
      VIBRATION_STORAGE_KEY,
      nextIsEnabled ? "enabled" : "disabled"
    );
  }

  async function handleSoundChange(nextIsEnabled) {
    setIsSoundEnabled(nextIsEnabled);
    await AsyncStorage.setItem(
      SOUND_STORAGE_KEY,
      nextIsEnabled ? "enabled" : "disabled"
    );
  }

  function handleLogout() {
    setSettingsOpen(false);

    if (user) {
      signOut();
    }

    setIsManualLoggedIn(false);
    setSelectedCategory(null);
    setScreen("login");
  }

  function handleSettingsPress() {
    setSettingsOpen(!isSettingsOpen);
  }

  function setSettingsOpen(nextIsOpen) {
    Animated.timing(rotation, {
      toValue: nextIsOpen ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();

    setIsSettingsOpen(nextIsOpen);
  }

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
      {isLoggedIn ? (
        <>
          {screen === "category-module" ? (
            <CategoryModuleScreen
              category={selectedCategory}
              soundEnabled={isSoundEnabled}
              vibrationEnabled={isVibrationEnabled}
              onBack={() => setScreen("logged")}
            />
          ) : (
            <LoggedScreen
              onCategoryPress={(category) => {
                setSelectedCategory(category);
                setScreen("category-module");
              }}
            />
          )}

          {isSettingsOpen ? (
            <Pressable
              accessibilityLabel="Fechar configurações"
              style={styles.settingsBackdrop}
              onPress={() => setSettingsOpen(false)}
            />
          ) : null}

          <View
            style={[
              styles.settingsWrap,
              isSettingsOpen ? styles.settingsWrapOpen : null,
            ]}
          >
            <Pressable
              accessibilityLabel="Abrir configurações"
              style={styles.settingsButton}
              onPress={handleSettingsPress}
            >
              <Animated.View style={rotationStyle}>
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={colors.textPrimary}
                />
              </Animated.View>
            </Pressable>

            {isSettingsOpen ? (
              <View style={styles.settingsPanel}>
                <Text style={styles.settingsTitle}>Opções</Text>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Tema escuro</Text>
                  <Switch
                    value={isDarkMode}
                    onValueChange={setDarkMode}
                    trackColor={{
                      false: colors.borderStrong,
                      true: colors.link,
                    }}
                    thumbColor={colors.surface}
                  />
                </View>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Vibração</Text>
                  <Switch
                    value={isVibrationEnabled}
                    onValueChange={handleVibrationChange}
                    trackColor={{
                      false: colors.borderStrong,
                      true: colors.link,
                    }}
                    thumbColor={colors.surface}
                  />
                </View>
                <View style={styles.optionRow}>
                  <Text style={styles.optionText}>Sons</Text>
                  <Switch
                    value={isSoundEnabled}
                    onValueChange={handleSoundChange}
                    trackColor={{
                      false: colors.borderStrong,
                      true: colors.link,
                    }}
                    thumbColor={colors.surface}
                  />
                </View>
                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Sair</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </>
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

function createStyles(colors, shadows) {
  return StyleSheet.create({
    settingsWrap: {
      position: "absolute",
      top: 18,
      right: 18,
      zIndex: 100,
      elevation: 100,
      alignItems: "flex-end",
    },
    settingsBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 90,
      elevation: 90,
    },
    settingsWrapOpen: {
      width: 220,
      height: 282,
    },
    settingsButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    settingsPanel: {
      position: "absolute",
      top: 58,
      right: 0,
      width: 220,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 101,
      elevation: 101,
      ...shadows.soft,
    },
    settingsTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 12,
    },
    optionRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    optionText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    logoutButton: {
      height: 46,
      marginTop: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
    },
    logoutText: {
      color: colors.surfaceMuted,
      fontSize: 14,
      fontWeight: "800",
    },
  });
}
