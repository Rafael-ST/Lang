import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchLevels } from "../features/levels/services/levelsApi";
import { useTheme } from "../theme";

export default function LearningLevelsScreen({ loading = false, onLevelPress }) {
  const { colors, shadows } = useTheme();
  const [levels, setLevels] = useState([]);
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [levelsError, setLevelsError] = useState("");
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    async function loadLevels() {
      setIsLoadingLevels(true);
      setLevelsError("");

      try {
        const data = await fetchLevels();

        if (isMounted) {
          setLevels(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setLevelsError("Nao foi possivel carregar os niveis.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingLevels(false);
        }
      }
    }

    loadLevels();

    return () => {
      isMounted = false;
    };
  }, [loading]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      {loading ? (
        <View style={styles.levelsCard}>
          <Text style={styles.helperText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.levelsCard}>
          <Text style={styles.sectionTitle}>Niveis de aprendizagem</Text>

          {isLoadingLevels ? (
            <Text style={styles.helperText}>Carregando niveis...</Text>
          ) : levelsError ? (
            <Text style={styles.errorText}>{levelsError}</Text>
          ) : levels.length ? (
            levels.map((level) => {
              const isActive = level.is_active !== false;

              return (
                <Pressable
                  key={level.id}
                  disabled={!isActive}
                  style={({ pressed }) => [
                    styles.levelItem,
                    pressed && isActive ? styles.levelItemPressed : null,
                    !isActive ? styles.levelItemDisabled : null,
                  ]}
                  onPress={() => onLevelPress?.(level)}
                >
                  <Text
                    style={[
                      styles.levelName,
                      !isActive ? styles.levelNameDisabled : null,
                    ]}
                  >
                    {level.nome || "Nivel sem nome"}
                  </Text>
                  {!isActive ? (
                    <Text style={styles.levelStatus}>Inativo</Text>
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.helperText}>Nenhum nivel encontrado.</Text>
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
    levelsCard: {
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
    levelItem: {
      minHeight: 54,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    levelItemPressed: {
      backgroundColor: colors.surface,
    },
    levelItemDisabled: {
      opacity: 0.6,
    },
    levelName: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    levelNameDisabled: {
      color: colors.textMuted,
    },
    levelStatus: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
      textTransform: "uppercase",
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
  });
}
