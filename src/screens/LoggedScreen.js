import {
  Animated,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchCategories } from "../features/categories/services/categoriesApi";
import { useAuth } from "../features/auth/context/AuthContext";
import { useTheme } from "../theme";

export default function LoggedScreen({ loading = false, onLogout }) {
  const { signOut, user } = useAuth();
  const { colors, isDarkMode, setDarkMode, shadows } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const rotation = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoriesError("");

      try {
        const data = await fetchCategories();

        if (isMounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setCategoriesError("Nao foi possivel carregar as categorias.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [loading]);

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

    setSettingsOpen(nextIsOpen);
  }

  function setSettingsOpen(nextIsOpen) {
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
        <>
          {isSettingsOpen ? (
            <Pressable
              accessibilityLabel="Fechar configuracoes"
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
        </>
      ) : null}

      {loading ? (
        <View style={styles.categoriesCard}>
          <Text style={styles.helperText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.categoriesCard}>
          <Text style={styles.sectionTitle}>Categorias</Text>

          {isLoadingCategories ? (
            <Text style={styles.helperText}>Carregando categorias...</Text>
          ) : categoriesError ? (
            <Text style={styles.errorText}>{categoriesError}</Text>
          ) : categories.length ? (
            categories.map((category) => (
              <View key={category.id} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.nome}</Text>
                
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>Nenhuma categoria encontrada.</Text>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 24,
  },
  categoriesCard: {
    width: "100%",
    maxWidth: 340,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  categoryItem: {
    minHeight: 48,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryStatus: {
    marginTop: 4,
    color: colors.textMutedDark,
    fontSize: 13,
    fontWeight: "700",
  },
  helperText: {
    color: colors.textMutedDark,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
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
    height: 190,
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
