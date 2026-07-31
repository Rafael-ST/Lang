import { Pressable, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../theme";

export default function SublevelIntroductionScreen({ onBack, onContinue, sublevel }) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Voltar para subníveis</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Subnível</Text>
        <Text style={styles.title}>{sublevel?.nome || "Subnível"}</Text>
        <Text style={styles.description}>
          {sublevel?.description ||
            "Prepare-se para praticar o conteúdo deste subnível."}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.continueButton,
            pressed ? styles.continueButtonPressed : null,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>Ver exercícios</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 96 },
    card: { width: "100%", maxWidth: 340, padding: 22, borderRadius: 18, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
    backButton: { alignSelf: "flex-start", marginBottom: 24, paddingVertical: 6 },
    backButtonText: { color: colors.link, fontSize: 14, fontWeight: "800" },
    eyebrow: { color: colors.textMutedDark, fontSize: 13, fontWeight: "800", marginBottom: 6, textTransform: "uppercase" },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", lineHeight: 30, marginBottom: 14 },
    description: { color: colors.textSecondary, fontSize: 15, fontWeight: "600", lineHeight: 22, marginBottom: 28 },
    continueButton: { minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.textPrimary },
    continueButtonPressed: { opacity: 0.82 },
    continueButtonText: { color: colors.surface, fontSize: 15, fontWeight: "800" },
  });
}
