import { StatusBar } from "expo-status-bar";
import {
  Animated,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../features/auth/context/AuthContext";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import LoggedScreen from "../screens/LoggedScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import LearningLevelsScreen from "../screens/LearningLevelsScreen";
import SublevelsScreen from "../screens/SublevelsScreen";
import SublevelIntroductionScreen from "../screens/SublevelIntroductionScreen";
import ExerciseSetsScreen from "../screens/ExerciseSetsScreen";
import ExerciseSetIntroductionScreen from "../screens/ExerciseSetIntroductionScreen";
import CategoryModuleScreen from "../screens/CategoryModuleScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CardsScreen from "../screens/CardsScreen";
import CardPracticeScreen from "../screens/CardPracticeScreen";
import { fetchProfileByUsername } from "../features/profiles/services/profilesApi";
import { findNextLearningExerciseSet } from "../features/learning/services/learningResumeService";
import { useTheme } from "../theme";

const VIBRATION_STORAGE_KEY = "@lang/vibration-enabled";
const SOUND_STORAGE_KEY = "@lang/sound-enabled";

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { isLoading, signOut, updateAuthenticatedUser, user } = useAuth();
  const { colors, isDarkMode, setDarkMode, shadows } = useTheme();
  const [screen, setScreen] = useState("login");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedSublevel, setSelectedSublevel] = useState(null);
  const [selectedExerciseSet, setSelectedExerciseSet] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCardCategory, setSelectedCardCategory] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isResumingLearning, setIsResumingLearning] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const previousPoints = useRef(null);
  const settingsSoundPlayer = useAudioPlayer(
    require("../../assets/correct-answer.ogg"),
    { keepAudioSessionActive: true }
  );
  const styles = createStyles(colors, shadows);
  const isLoggedIn = Boolean(user);
  const username = user?.username || user?.email;

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

  useEffect(() => {
    if (!isLoggedIn || !username) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        const nextProfile = await fetchProfileByUsername(username);

        if (isMounted) {
          setProfile(nextProfile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, username]);

  useEffect(() => {
    const currentPoints = profile?.pontos;

    if (typeof currentPoints !== "number") {
      previousPoints.current = null;
      return;
    }

    if (
      typeof previousPoints.current === "number" &&
      currentPoints < previousPoints.current
    ) {
      heartScale.stopAnimation();
      heartScale.setValue(1);
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.35,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }

    previousPoints.current = currentPoints;
  }, [heartScale, profile?.pontos]);

  async function handleVibrationChange(nextIsEnabled) {
    setIsVibrationEnabled(nextIsEnabled);

    if (nextIsEnabled) {
      Vibration.vibrate(250);
    }

    await AsyncStorage.setItem(
      VIBRATION_STORAGE_KEY,
      nextIsEnabled ? "enabled" : "disabled"
    );
  }

  async function handleSoundChange(nextIsEnabled) {
    setIsSoundEnabled(nextIsEnabled);

    if (nextIsEnabled) {
      playSettingsSound();
    }

    await AsyncStorage.setItem(
      SOUND_STORAGE_KEY,
      nextIsEnabled ? "enabled" : "disabled"
    );
  }

  function playSettingsSound() {
    try {
      settingsSoundPlayer
        .seekTo(0)
        .then(() => settingsSoundPlayer.play())
        .catch(() => settingsSoundPlayer.play());
    } catch {
      // Settings feedback should not block saving the preference.
    }
  }

  function handleLogout() {
    setSettingsOpen(false);

    if (user) {
      signOut();
    }

    setProfile(null);
    setSelectedLevel(null);
    setSelectedSublevel(null);
    setSelectedExerciseSet(null);
    setSelectedCategory(null);
    setSelectedCardCategory(null);
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

  async function handleLearningPress() {
    if (isResumingLearning) {
      return;
    }

    setSettingsOpen(false);

    try {
      setIsResumingLearning(true);
      const nextLearningItem = await findNextLearningExerciseSet();

      if (!nextLearningItem) {
        setScreen("levels");
        Alert.alert(
          "Trilha concluída",
          "Você concluiu todos os exercícios disponíveis."
        );
        return;
      }

      setSelectedLevel(nextLearningItem.level);
      setSelectedSublevel(nextLearningItem.sublevel);
      setSelectedExerciseSet(null);
      setSelectedCategory(null);
      setIsReviewMode(false);
      setScreen("exercise-sets");
    } catch {
      Alert.alert(
        "Não foi possível continuar",
        "Verifique sua conexão e tente novamente."
      );
    } finally {
      setIsResumingLearning(false);
    }
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
          {screen === "profile" ? (
            <ProfileScreen onUserChange={updateAuthenticatedUser} />
          ) : screen === "cards" ? (
            <CardsScreen
              onCategoryPress={(category) => {
                setSelectedCardCategory(category);
                setScreen("card-practice");
              }}
            />
          ) : screen === "card-practice" ? (
            <CardPracticeScreen
              category={selectedCardCategory}
              soundEnabled={isSoundEnabled}
              onBack={() => {
                setSelectedCardCategory(null);
                setScreen("cards");
              }}
              onComplete={() => {
                setSelectedCardCategory(null);
                setScreen("cards");
              }}
            />
          ) : screen === "category-module" ? (
            <CategoryModuleScreen
              category={selectedCategory}
              exerciseSet={selectedExerciseSet}
              isReviewMode={isReviewMode}
              onProfileChange={setProfile}
              soundEnabled={isSoundEnabled}
              sublevel={selectedSublevel}
              user={user}
              vibrationEnabled={isVibrationEnabled}
              onBack={() => {
                setIsReviewMode(false);
                setScreen("exercise-sets");
              }}
            />
          ) : screen === "exercise-set-introduction" ? (
            <ExerciseSetIntroductionScreen
              exerciseSet={selectedExerciseSet}
              isReviewMode={isReviewMode}
              sublevel={selectedSublevel}
              onBack={() => {
                setSelectedExerciseSet(null);
                setIsReviewMode(false);
                setScreen("exercise-sets");
              }}
              onStart={() => setScreen("category-module")}
            />
          ) : screen === "exercise-sets" ? (
            <ExerciseSetsScreen
              sublevel={selectedSublevel}
              onBack={() => {
                setSelectedExerciseSet(null);
                setIsReviewMode(false);
                setScreen("sublevel-introduction");
              }}
              onExerciseSetPress={(exerciseSet, options = {}) => {
                setSelectedExerciseSet(exerciseSet);
                setSelectedCategory(null);
                setIsReviewMode(Boolean(options.isReview));
                setScreen("exercise-set-introduction");
              }}
            />
          ) : screen === "sublevel-introduction" ? (
            <SublevelIntroductionScreen
              sublevel={selectedSublevel}
              onBack={() => {
                setSelectedSublevel(null);
                setScreen("sublevels");
              }}
              onContinue={() => setScreen("exercise-sets")}
            />
          ) : screen === "logged" ? (
            <LoggedScreen
              onBack={() => setScreen("sublevels")}
              sublevel={selectedSublevel}
              onCategoryPress={(category) => {
                setSelectedCategory(category);
                setScreen("category-module");
              }}
            />
          ) : screen === "sublevels" ? (
            <SublevelsScreen
              level={selectedLevel}
              onBack={() => {
                setSelectedSublevel(null);
                setSelectedExerciseSet(null);
                setIsReviewMode(false);
                setScreen("levels");
              }}
              onSublevelPress={(sublevel) => {
                setSelectedSublevel(sublevel);
                setSelectedExerciseSet(null);
                setSelectedCategory(null);
                setScreen("sublevel-introduction");
              }}
            />
          ) : (
            <LearningLevelsScreen
              onLevelPress={(level) => {
                setSelectedLevel(level);
                setSelectedSublevel(null);
                setSelectedExerciseSet(null);
                setSelectedCategory(null);
                setScreen("sublevels");
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
            <View style={styles.settingsControls}>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>
                {isLoadingProfile ? "..." : profile?.pontos ?? 0}
              </Text>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name="heart" size={18} color={colors.error} />
              </Animated.View>
            </View>

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

            </View>

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

          {screen !== "category-module" &&
          screen !== "exercise-set-introduction" &&
          screen !== "sublevel-introduction" &&
          screen !== "card-practice" ? (
            <View
              style={[
                styles.bottomNavigator,
                { bottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir perfil"
                style={styles.bottomTab}
                onPress={() => {
                  setSettingsOpen(false);
                  setScreen("profile");
                }}
              >
                <Ionicons name={screen === "profile" ? "person" : "person-outline"} size={24} color={screen === "profile" ? colors.link : colors.textMuted} />
                <Text style={[styles.bottomTabText, screen === "profile" && styles.bottomTabTextActive]}>Perfil</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Praticar cards vistos"
                style={styles.bottomTab}
                onPress={() => {
                  setSettingsOpen(false);
                  setSelectedCardCategory(null);
                  setScreen("cards");
                }}
              >
                <Ionicons
                  name={screen === "cards" ? "albums" : "albums-outline"}
                  size={24}
                  color={screen === "cards" ? colors.link : colors.textMuted}
                />
                <Text
                  style={[
                    styles.bottomTabText,
                    screen === "cards" && styles.bottomTabTextActive,
                  ]}
                >
                  Cards
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir aprendizado"
                disabled={isResumingLearning}
                style={styles.bottomTab}
                onPress={handleLearningPress}
              >
                <Ionicons
                  name={
                    isResumingLearning
                      ? "hourglass-outline"
                      : screen !== "profile" && screen !== "cards"
                        ? "school"
                        : "school-outline"
                  }
                  size={24}
                  color={
                    screen !== "profile" && screen !== "cards"
                      ? colors.link
                      : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.bottomTabText,
                    screen !== "profile" &&
                      screen !== "cards" &&
                      styles.bottomTabTextActive,
                  ]}
                >
                  {isResumingLearning ? "Buscando..." : "Aprender"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : screen === "forgot-password" ? (
        <ForgotPasswordScreen onBack={() => setScreen("login")} />
      ) : screen === "register" ? (
        <RegisterScreen
          onBack={() => setScreen("login")}
          onRegisterPress={() => setScreen("login")}
        />
      ) : (
        <LoginScreen
          onForgotPasswordPress={() => setScreen("forgot-password")}
          onRegisterPress={() => setScreen("register")}
        />
      )}
    </>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    bottomNavigator: {
      position: "absolute",
      right: 18,
      left: 18,
      height: 72,
      zIndex: 80,
      elevation: 80,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      ...shadows.soft,
    },
    bottomTab: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },
    bottomTabText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    bottomTabTextActive: { color: colors.link },
    settingsWrap: {
      position: "absolute",
      top: 18,
      right: 18,
      zIndex: 100,
      elevation: 100,
      alignItems: "flex-end",
    },
    settingsControls: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      alignSelf: "flex-end",
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
      height: 330,
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
    pointsBadge: {
      width: 74,
      height: 38,
      paddingHorizontal: 12,
      borderRadius: 19,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    pointsText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
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
