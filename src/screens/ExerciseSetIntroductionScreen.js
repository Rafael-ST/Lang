import { Pressable, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../theme";

export default function ExerciseSetIntroductionScreen({
  exerciseSet,
  isReviewMode = false,
  onBack,
  onStart,
  sublevel,
}) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Voltar para exercicios</Text>
        </Pressable>

        {sublevel?.nome ? (
          <Text style={styles.eyebrow}>{sublevel.nome}</Text>
        ) : null}
        <Text style={styles.title}>
          {exerciseSet?.title || "Conjunto de exercicios"}
        </Text>
        <Text style={styles.description}>
          {exerciseSet?.description ||
            "Prepare-se para praticar o conteudo deste conjunto."}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.startButton,
            pressed ? styles.startButtonPressed : null,
          ]}
          onPress={onStart}
        >
          <Text style={styles.startButtonText}>
            {isReviewMode ? "Iniciar revisão" : "Iniciar exercicios"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 96,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      padding: 22,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    backButton: {
      alignSelf: "flex-start",
      marginBottom: 24,
      paddingVertical: 6,
    },
    backButtonText: {
      color: colors.link,
      fontSize: 14,
      fontWeight: "800",
    },
    eyebrow: {
      color: colors.textMutedDark,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    title: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 30,
      marginBottom: 14,
    },
    description: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 22,
      marginBottom: 28,
    },
    startButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: colors.textPrimary,
    },
    startButtonPressed: {
      opacity: 0.82,
    },
    startButtonText: {
      color: colors.surface,
      fontSize: 15,
      fontWeight: "800",
    },
  });
}
