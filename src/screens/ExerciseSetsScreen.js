import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchExerciseSetsBySublevel } from "../features/exerciseSets/services/exerciseSetsApi";
import { useTheme } from "../theme";

export default function ExerciseSetsScreen({
  loading = false,
  onBack,
  onExerciseSetPress,
  sublevel,
}) {
  const { colors, shadows } = useTheme();
  const [exerciseSets, setExerciseSets] = useState([]);
  const [isLoadingExerciseSets, setIsLoadingExerciseSets] = useState(false);
  const [exerciseSetsError, setExerciseSetsError] = useState("");
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    async function loadExerciseSets() {
      setIsLoadingExerciseSets(true);
      setExerciseSetsError("");

      try {
        const data = await fetchExerciseSetsBySublevel(sublevel?.id);

        if (isMounted) {
          setExerciseSets(sortExerciseSetsByOrder(normalizeList(data)));
        }
      } catch {
        if (isMounted) {
          setExerciseSets([]);
          setExerciseSetsError(
            "Nao foi possivel carregar os conjuntos de exercicios."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingExerciseSets(false);
        }
      }
    }

    loadExerciseSets();

    return () => {
      isMounted = false;
    };
  }, [loading, sublevel?.id]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      {loading ? (
        <View style={styles.exerciseSetsCard}>
          <Text style={styles.helperText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.exerciseSetsCard}>
          {onBack ? (
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Voltar para subniveis</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Exercicios</Text>
          {sublevel?.nome ? (
            <Text style={styles.sectionSubtitle}>{sublevel.nome}</Text>
          ) : null}

          {isLoadingExerciseSets ? (
            <Text style={styles.helperText}>Carregando exercicios...</Text>
          ) : exerciseSetsError ? (
            <Text style={styles.errorText}>{exerciseSetsError}</Text>
          ) : exerciseSets.length ? (
            <View style={styles.exerciseSetsList}>
              {exerciseSets.map((exerciseSet, index) => {
                const isActive = exerciseSet.is_active !== false;
                const isCompleted = isExerciseSetCompleted(exerciseSet);
                const previousExerciseSet = exerciseSets[index - 1];
                const isLocked = Boolean(
                  index > 0 && !isExerciseSetCompleted(previousExerciseSet)
                );
                const canPress = isActive && !isLocked;

                return (
                  <Pressable
                    key={exerciseSet.id}
                    disabled={!canPress}
                    style={({ pressed }) => [
                      styles.exerciseSetItem,
                      pressed && canPress
                        ? styles.exerciseSetItemPressed
                        : null,
                      isCompleted ? styles.exerciseSetItemCompleted : null,
                      !canPress ? styles.exerciseSetItemDisabled : null,
                    ]}
                    onPress={() => {
                      if (canPress) {
                        onExerciseSetPress?.(exerciseSet);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.exerciseSetTitle,
                        !canPress ? styles.exerciseSetTitleDisabled : null,
                      ]}
                    >
                      {exerciseSet.title || "Conjunto sem titulo"}
                    </Text>
                    {exerciseSet.description ? (
                      <Text style={styles.exerciseSetDescription}>
                        {exerciseSet.description}
                      </Text>
                    ) : null}
                    {!isActive ? (
                      <Text style={styles.exerciseSetStatus}>Inativo</Text>
                    ) : isLocked ? (
                      <Text style={styles.exerciseSetStatus}>
                        Complete o anterior
                      </Text>
                    ) : isCompleted ? (
                      <Text style={styles.exerciseSetCompleted}>
                        Concluído
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>
              Nenhum conjunto de exercicios encontrado.
            </Text>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function isExerciseSetCompleted(exerciseSet) {
  return (
    exerciseSet?.is_completed ||
    exerciseSet?.progress?.status === "completed"
  );
}

function sortExerciseSetsByOrder(items) {
  return [...items].sort((firstSet, secondSet) => {
    const firstOrder = Number(firstSet?.order ?? 0);
    const secondOrder = Number(secondSet?.order ?? 0);

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return Number(firstSet?.id ?? 0) - Number(secondSet?.id ?? 0);
  });
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
    exerciseSetsCard: {
      width: "100%",
      maxWidth: 340,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    exerciseSetsList: {
      gap: 12,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 4,
    },
    sectionSubtitle: {
      color: colors.textMutedDark,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 14,
    },
    backButton: {
      alignSelf: "flex-start",
      marginBottom: 14,
      paddingVertical: 6,
    },
    backButtonText: {
      color: colors.link,
      fontSize: 14,
      fontWeight: "800",
    },
    exerciseSetItem: {
      minHeight: 72,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    exerciseSetItemPressed: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.borderStrong,
    },
    exerciseSetItemDisabled: {
      opacity: 0.6,
    },
    exerciseSetItemCompleted: {
      borderColor: colors.success,
    },
    exerciseSetTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    exerciseSetTitleDisabled: {
      color: colors.textMuted,
    },
    exerciseSetDescription: {
      color: colors.textMutedDark,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 18,
      marginTop: 4,
    },
    exerciseSetStatus: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
      textTransform: "uppercase",
    },
    exerciseSetCompleted: {
      color: colors.success,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 6,
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
