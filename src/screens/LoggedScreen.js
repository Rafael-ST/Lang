import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../features/auth/context/AuthContext";
import { useTheme } from "../theme";

export default function LoggedScreen({ loading = false, onLogout }) {
  const { signOut, user } = useAuth();
  const { colors, isDarkMode, setDarkMode, shadows } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors, shadows);

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

  function handleLogout() {
    if (user) {
      signOut();
      return;
    }

    onLogout?.();
  }

  function handleSettingsPress() {
    const nextIsOpen = !isSettingsOpen;

    Animated.timing(rotation, {
      toValue: nextIsOpen ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();

    setIsSettingsOpen(nextIsOpen);
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      {!loading ? (
        <View style={styles.settingsWrap}>
          <Pressable
            accessibilityLabel="Abrir configuracoes"
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
              <Text style={styles.settingsTitle}>Opcoes</Text>
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
              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sair</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        {loading ? (
          <Text style={styles.text}>carregando...</Text>
        ) : (
          <>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : null}
            <Text style={styles.text}>logado</Text>
            <Text style={styles.name}>{user?.name ?? "Sem nome"}</Text>
            <Text style={styles.email}>{user?.email ?? "Sem e-mail"}</Text>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    minWidth: 220,
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 20,
    backgroundColor: colors.border,
  },
  text: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    textTransform: "lowercase",
  },
  name: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  email: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMutedDark,
    textAlign: "center",
  },
  settingsWrap: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 10,
    alignItems: "flex-end",
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
    width: 220,
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
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
