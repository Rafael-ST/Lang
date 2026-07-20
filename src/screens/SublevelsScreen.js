import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchSublevels } from "../features/sublevels/services/sublevelsApi";
import { useTheme } from "../theme";

export default function SublevelsScreen({
  level,
  loading = false,
  onBack,
  onSublevelPress,
}) {
  const { colors, shadows } = useTheme();
  const [sublevels, setSublevels] = useState([]);
  const [isLoadingSublevels, setIsLoadingSublevels] = useState(false);
  const [sublevelsError, setSublevelsError] = useState("");
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    async function loadSublevels() {
      setIsLoadingSublevels(true);
      setSublevelsError("");

      try {
        const data = await fetchSublevels(level?.id);

        if (isMounted) {
          setSublevels(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setSublevelsError("Nao foi possivel carregar os subniveis.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingSublevels(false);
        }
      }
    }

    loadSublevels();

    return () => {
      isMounted = false;
    };
  }, [level?.id, loading]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      {loading ? (
        <View style={styles.sublevelsCard}>
          <Text style={styles.helperText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.sublevelsCard}>
          {onBack ? (
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Voltar para niveis</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Subniveis</Text>
          {level?.nome ? (
            <Text style={styles.sectionSubtitle}>{level.nome}</Text>
          ) : null}

          {isLoadingSublevels ? (
            <Text style={styles.helperText}>Carregando subniveis...</Text>
          ) : sublevelsError ? (
            <Text style={styles.errorText}>{sublevelsError}</Text>
          ) : sublevels.length ? (
            <View style={styles.sublevelsList}>
              {sublevels.map((sublevel, index) => {
                const isActive = sublevel.is_active !== false;
                const isCompleted = Boolean(sublevel.is_completed);
                const previousSublevel = sublevels[index - 1];
                const isLocked = Boolean(
                  index > 0 && !previousSublevel?.is_completed
                );
                const canPress = isActive && !isLocked;

                return (
                  <Pressable
                    key={sublevel.id}
                    disabled={!canPress}
                    style={({ pressed }) => [
                      styles.sublevelItem,
                      pressed && canPress ? styles.sublevelItemPressed : null,
                      isCompleted ? styles.sublevelItemCompleted : null,
                      !canPress ? styles.sublevelItemDisabled : null,
                    ]}
                    onPress={() => onSublevelPress?.(sublevel)}
                  >
                    <Text
                      style={[
                        styles.sublevelName,
                        !canPress ? styles.sublevelNameDisabled : null,
                      ]}
                    >
                      {sublevel.nome || "Subnivel sem nome"}
                    </Text>
                    {!isActive ? (
                      <Text style={styles.sublevelStatus}>Inativo</Text>
                    ) : isLocked ? (
                      <Text style={styles.sublevelStatus}>
                        Complete o anterior
                      </Text>
                    ) : isCompleted ? (
                      <Text style={styles.sublevelCompleted}>Concluído</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>Nenhum subnivel encontrado.</Text>
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
    sublevelsCard: {
      width: "100%",
      maxWidth: 340,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    sublevelsList: {
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
    sublevelItem: {
      minHeight: 64,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    sublevelItemPressed: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.borderStrong,
    },
    sublevelItemDisabled: {
      opacity: 0.6,
    },
    sublevelItemCompleted: {
      borderColor: colors.success,
    },
    sublevelName: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    sublevelNameDisabled: {
      color: colors.textMuted,
    },
    sublevelStatus: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
      textTransform: "uppercase",
    },
    sublevelCompleted: {
      color: colors.success,
      fontSize: 12,
      fontWeight: "800",
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
