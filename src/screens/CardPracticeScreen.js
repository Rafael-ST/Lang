import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { showPracticeCategoryInterstitial } from "../services/interstitialAd";
import { useTheme } from "../theme";

export default function CardPracticeScreen({ category, onBack, onComplete, soundEnabled = true }) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);
  const [index, setIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const cards = category?.cards || [];
  const card = cards[index];
  const progressPercent = cards.length ? ((index + 1) / cards.length) * 100 : 0;
  const animatedProgressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const audioPlayer = useAudioPlayer(null, { keepAudioSessionActive: true });

  useEffect(() => {
    if (!soundEnabled || !card?.audio) return;

    try {
      audioPlayer.replace({ uri: card.audio });
      audioPlayer.play();
    } catch {
      // A apresentação continua normalmente quando o áudio está indisponível.
    }
  }, [audioPlayer, card?.audio, soundEnabled]);

  useEffect(() => {
    const animation = Animated.spring(progressAnimation, {
      toValue: progressPercent,
      friction: 9,
      tension: 70,
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [progressAnimation, progressPercent]);

  function playCardAudio() {
    if (!card?.audio) return;
    try {
      audioPlayer.replace({ uri: card.audio });
      audioPlayer.play();
    } catch {
      // O botão de avançar permanece disponível.
    }
  }

  async function handleNext() {
    if (index < cards.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    if (isCompleting) return;
    setIsCompleting(true);
    await showPracticeCategoryInterstitial();
    onComplete?.();
  }

  if (!card) {
    return (
      <ScreenContainer contentStyle={styles.container}>
        <Text style={styles.helperText}>Nenhum card disponível.</Text>
        <Pressable style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="Voltar" style={styles.iconButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.progressText}>{index + 1} de {cards.length}</Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: cards.length, now: index + 1 }}
        style={styles.progressContainer}
      >
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: animatedProgressWidth }]}
          >
            <LinearGradient
              colors={colors.successGradient}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.progressGradient}
            />
            <View style={styles.progressGlow} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.presentationCard}>
        {card.image ? (
          <Image source={{ uri: card.image }} resizeMode="cover" style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        <Text style={styles.englishText}>{card.english_name}</Text>
        <Text style={styles.translationText}>{card.international_name}</Text>

        {card.audio ? (
          <Pressable accessibilityLabel="Ouvir card" style={styles.audioButton} onPress={playCardAudio}>
            <Ionicons name="volume-high" size={28} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        disabled={isCompleting}
        style={({ pressed }) => [styles.nextButton, pressed ? styles.nextButtonPressed : null, isCompleting ? styles.disabledButton : null]}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>
          {isCompleting ? "Concluindo..." : index === cards.length - 1 ? "Concluir categoria" : "Próximo card"}
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
    progressText: { color: colors.textMutedDark, fontSize: 14, fontWeight: "800" },
    progressContainer: { width: "100%", marginTop: 18 },
    progressTrack: { height: 18, overflow: "hidden", borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.success, overflow: "hidden", shadowColor: colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
    progressGlow: { position: "absolute", top: 1, right: 2, bottom: 1, width: 12, borderRadius: 999, backgroundColor: "rgba(255, 255, 255, 0.32)" },
    progressGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
    presentationCard: { flex: 1, alignItems: "center", justifyContent: "center", marginVertical: 24, padding: 22, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, ...shadows.soft },
    image: { width: "100%", maxWidth: 360, height: 230, borderRadius: 20, marginBottom: 24 },
    imagePlaceholder: { width: "100%", maxWidth: 360, height: 180, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, marginBottom: 24 },
    englishText: { color: colors.textPrimary, fontSize: 34, fontWeight: "900", textAlign: "center" },
    translationText: { color: colors.textMutedDark, fontSize: 19, fontWeight: "700", textAlign: "center", marginTop: 10 },
    audioButton: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, marginTop: 22 },
    nextButton: { minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.textPrimary },
    nextButtonPressed: { opacity: 0.8 },
    disabledButton: { opacity: 0.55 },
    nextButtonText: { color: colors.surfaceMuted, fontSize: 16, fontWeight: "900" },
    helperText: { color: colors.textMutedDark, fontSize: 15, textAlign: "center", marginTop: 120 },
    secondaryButton: { alignSelf: "center", padding: 16, marginTop: 16 },
    secondaryButtonText: { color: colors.link, fontSize: 15, fontWeight: "800" },
  });
}
