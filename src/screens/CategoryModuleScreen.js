import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchExercisesByCategory } from "../features/exercises/services/exercisesApi";
import {
  fetchProfileByUsername,
  updateProfilePoints,
} from "../features/profiles/services/profilesApi";
import { useTheme } from "../theme";

const EXERCISE_TYPES = {
  JUST_AUDIO: "JUST_AUDIO",
  MULTIPLE_CHOICE_TRANSLATION: "multiple_choice_translation",
};

export default function CategoryModuleScreen({
  category,
  onBack,
  onProfileChange,
  soundEnabled = true,
  sublevel,
  user,
  vibrationEnabled = true,
}) {
  const { colors, shadows } = useTheme();
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [wrongOptionId, setWrongOptionId] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [isJustAudioCorrect, setIsJustAudioCorrect] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSpendingPoint, setIsSpendingPoint] = useState(false);
  const [exercisesError, setExercisesError] = useState("");
  const [profile, setProfile] = useState(null);
  const [pointsError, setPointsError] = useState("");
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [isNoPointsModalVisible, setIsNoPointsModalVisible] = useState(false);
  const nextExerciseTimeout = useRef(null);
  const correctSoundPlayer = useAudioPlayer(
    require("../../assets/correct-answer.ogg"),
    { keepAudioSessionActive: true }
  );
  const styles = createStyles(colors, shadows);
  const playableExercises = useMemo(
    () => exercises.filter(isSupportedExercise),
    [exercises]
  );
  const selectedExercise = playableExercises[selectedExerciseIndex];
  const selectedCard = getExerciseCard(selectedExercise);
  const exerciseType = getExerciseType(selectedExercise);
  const moduleName =
    getExerciseTitle(selectedExercise) ||
    selectedCard?.english_name ||
    category?.nome ||
    sublevel?.nome ||
    "Modulo";
  const translationText = getTranslationText(selectedExercise);
  const audioUri = getAudioUri(selectedExercise);
  const username = user?.username || user?.email;
  const exerciseAudioPlayer = useAudioPlayer(
    audioUri ? { uri: audioUri } : null,
    { keepAudioSessionActive: true }
  );
  const optionCards = useMemo(() => {
    if (exerciseType !== EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION) {
      return [];
    }

    const configuredOptions = getExerciseOptions(selectedExercise);

    if (configuredOptions.length) {
      return configuredOptions;
    }

    if (!selectedCard?.international_name) {
      return [];
    }

    const wrongCards = shuffleItems(
      playableExercises
        .map(getExerciseCard)
        .filter(
          (card) => card?.id !== selectedCard.id && card?.international_name
        )
    );

    return shuffleItems([
      {
        id: selectedCard.id,
        text: selectedCard.international_name,
      },
      ...wrongCards.slice(0, 3).map((card) => ({
        id: card.id,
        text: card.international_name,
      })),
    ]);
  }, [exerciseType, playableExercises, selectedCard, selectedExercise]);

  useEffect(() => {
    let isMounted = true;

    async function loadExercises() {
      setIsLoadingExercises(true);
      setExercisesError("");

      try {
        const data = await fetchExercisesByCategory(category?.id);

        if (isMounted) {
          const nextExercises = normalizeExerciseList(data);

          console.info("[exercises] Retorno de /exercises/:", data);
          console.info("[exercises] Exercicios normalizados:", nextExercises);

          setExercises(shuffleItems(nextExercises));
          setSelectedExerciseIndex(0);
          setWrongOptionId(null);
          setCorrectOptionId(null);
          setIsJustAudioCorrect(false);
        }
      } catch {
        if (isMounted) {
          setExercises([]);
          setExercisesError("Nao foi possivel carregar os exercicios.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingExercises(false);
        }
      }
    }

    loadExercises();

    return () => {
      isMounted = false;
      clearTimeout(nextExerciseTimeout.current);
    };
  }, [category?.id]);

  useEffect(() => {
    if (
      exerciseType !== EXERCISE_TYPES.JUST_AUDIO ||
      !soundEnabled ||
      !audioUri
    ) {
      return;
    }

    playAudio(exerciseAudioPlayer);
  }, [audioUri, exerciseAudioPlayer, exerciseType, soundEnabled]);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        setIsLoadingProfile(true);
        setPointsError("");
        const nextProfile = await fetchProfileByUsername(username);

        if (isMounted) {
          setProfile(nextProfile);
          onProfileChange?.(nextProfile);
          setPointsError(nextProfile ? "" : "Perfil nao encontrado.");
          setIsNoPointsModalVisible(
            Boolean(nextProfile && nextProfile.pontos <= 0)
          );
        }
      } catch {
        if (isMounted) {
          setPointsError("Nao foi possivel carregar seus pontos.");
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
  }, [username]);

  async function handleOptionPress(optionCard) {
    if (
      correctOptionId ||
      wrongOptionId ||
      isLoadingProfile ||
      isSpendingPoint
    ) {
      return;
    }

    if (!profile) {
      setPointsError("Perfil nao encontrado.");
      return;
    }

    if (profile.pontos <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    if (!isCorrectOption(optionCard, selectedExercise)) {
      if (vibrationEnabled) {
        Vibration.vibrate(500);
      }

      setWrongOptionId(optionCard.id);
      clearTimeout(nextExerciseTimeout.current);

      const nextPoints = await spendPoint();

      if (nextPoints === null) {
        return;
      }

      if (nextPoints <= 0) {
        setIsNoPointsModalVisible(true);
        return;
      }

      nextExerciseTimeout.current = setTimeout(() => {
        setWrongOptionId(null);
        goToRandomExercise();
      }, 700);
      return;
    }

    setWrongOptionId(null);
    setCorrectOptionId(optionCard.id);
    playAudio(correctSoundPlayer);
    clearTimeout(nextExerciseTimeout.current);

    const nextPoints = await spendPoint();

    if (nextPoints === null) {
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setCorrectOptionId(null);
      goToRandomExercise();
    }, 700);
  }

  async function handleJustAudioNextPress() {
    if (isLoadingProfile || isSpendingPoint || isJustAudioCorrect) {
      return;
    }

    if (!profile) {
      setPointsError("Perfil nao encontrado.");
      return;
    }

    if (profile.pontos <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    setIsJustAudioCorrect(true);
    playAudio(correctSoundPlayer);

    const nextPoints = await spendPoint();

    if (nextPoints === null) {
      setIsJustAudioCorrect(false);
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setIsJustAudioCorrect(false);
      goToRandomExercise();
    }, 700);
  }

  async function spendPoint() {
    if (!profile) {
      return Number.POSITIVE_INFINITY;
    }

    const nextPoints = Math.max(profile.pontos - 1, 0);

    try {
      setIsSpendingPoint(true);
      const updatedProfile = await updateProfilePoints(profile.id, nextPoints);
      const nextProfile = updatedProfile || { ...profile, pontos: nextPoints };

      setProfile(nextProfile);
      onProfileChange?.(nextProfile);
      setPointsError("");

      return nextPoints;
    } catch {
      setCorrectOptionId(null);
      setPointsError("Nao foi possivel atualizar seus pontos.");

      return null;
    } finally {
      setIsSpendingPoint(false);
    }
  }

  function goToRandomExercise() {
    setSelectedExerciseIndex((currentIndex) => {
      if (!playableExercises.length) {
        return 0;
      }

      let nextIndex = currentIndex;

      while (nextIndex === currentIndex && playableExercises.length > 1) {
        nextIndex = Math.floor(Math.random() * playableExercises.length);
      }

      return nextIndex;
    });
  }

  function handleNoPointsBackPress() {
    setIsNoPointsModalVisible(false);
    onBack?.();
  }

  function handleStayPress() {
    setIsExitModalVisible(false);
  }

  function handleExitConfirmPress() {
    setIsExitModalVisible(false);
    onBack?.();
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.moduleName}>{moduleName}</Text>

        {isLoadingExercises || isLoadingProfile ? (
          <Text style={styles.helperText}>Carregando exercicios...</Text>
        ) : exercisesError ? (
          <Text style={styles.errorText}>{exercisesError}</Text>
        ) : pointsError ? (
          <Text style={styles.errorText}>{pointsError}</Text>
        ) : !exercises.length ? (
          <Text style={styles.helperText}>Nenhum exercicio encontrado.</Text>
        ) : !playableExercises.length ? (
          <Text style={styles.helperText}>
            Nenhum exercicio compativel encontrado.
          </Text>
        ) : exerciseType === EXERCISE_TYPES.JUST_AUDIO ? (
          <View style={styles.justAudioContent}>
            <Pressable
              disabled={!audioUri}
              style={({ pressed }) => [
                styles.audioButton,
                pressed && audioUri ? styles.audioButtonPressed : null,
                !audioUri ? styles.disabledButton : null,
              ]}
              onPress={() => playAudio(exerciseAudioPlayer)}
            >
              <Text style={styles.audioButtonText}>
                {audioUri ? "Ouvir audio" : "Audio indisponivel"}
              </Text>
            </Pressable>

            <Text style={styles.translationText}>
              {translationText || "Traducao indisponivel"}
            </Text>

            <Pressable
              disabled={isSpendingPoint}
              style={({ pressed }) => [
                styles.nextButton,
                isJustAudioCorrect ? styles.nextButtonCorrect : null,
                pressed ? styles.nextButtonPressed : null,
                isSpendingPoint && !isJustAudioCorrect
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleJustAudioNextPress}
            >
              <Text style={styles.nextButtonText}>
                {isSpendingPoint ? "Avancando..." : "Proximo"}
              </Text>
            </Pressable>
          </View>
        ) : optionCards.length ? (
          <View style={styles.optionsList}>
            {optionCards.map((card) => (
              <Pressable
                key={card.id}
                disabled={Boolean(
                  correctOptionId ||
                    wrongOptionId ||
                    isLoadingProfile ||
                    isSpendingPoint
                )}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && !correctOptionId && !wrongOptionId
                    ? styles.optionItemPressed
                    : null,
                  wrongOptionId === card.id ? styles.optionItemWrong : null,
                  correctOptionId === card.id ? styles.optionItemCorrect : null,
                ]}
                onPress={() => handleOptionPress(card)}
              >
                <Text style={styles.optionText}>{card.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>Nenhum exercicio encontrado.</Text>
        )}

        <Pressable
          style={styles.backButton}
          onPress={() => setIsExitModalVisible(true)}
        >
          <Text style={styles.backButtonText}>Voltar para categorias</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isNoPointsModalVisible}
        onRequestClose={handleNoPointsBackPress}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sem pontos</Text>
            <Text style={styles.modalText}>
              Voce nao tem mais pontos para continuar esta licao.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={handleNoPointsBackPress}
            >
              <Text style={styles.modalButtonText}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isExitModalVisible}
        onRequestClose={handleStayPress}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sair da licao?</Text>
            <Text style={styles.modalText}>
              Caso saia voce perdera o progresso dessa licao.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalSecondaryButton]}
                onPress={handleStayPress}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalSecondaryButtonText,
                  ]}
                >
                  Permanecer
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalActionButton]}
                onPress={handleExitConfirmPress}
              >
                <Text style={styles.modalButtonText}>Voltar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function playAudio(player) {
  try {
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  } catch {
    // Audio feedback is optional; the exercise flow should continue if playback fails.
  }
}

function isSupportedExercise(exercise) {
  const type = getExerciseType(exercise);

  return (
    type === EXERCISE_TYPES.JUST_AUDIO ||
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION
  );
}

function getExerciseType(exercise) {
  const type = String(exercise?.type || "")
    .trim()
    .toUpperCase();

  if (type === "JUST_AUDIO") {
    return EXERCISE_TYPES.JUST_AUDIO;
  }

  if (
    type === "MULTIPLE_CHOICE_TRANSLATION" ||
    type === "MULTIPLE-CHOICE-TRANSLATION"
  ) {
    return EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION;
  }

  return exercise?.type || "";
}

function getExerciseCard(exercise) {
  if (exercise?.card_detail && typeof exercise.card_detail === "object") {
    return exercise.card_detail;
  }

  if (exercise?.card && typeof exercise.card === "object") {
    return exercise.card;
  }

  return null;
}

function getExerciseTitle(exercise) {
  const card = getExerciseCard(exercise);

  if (getExerciseType(exercise) === EXERCISE_TYPES.JUST_AUDIO) {
    return card?.english_name || getPromptText(exercise);
  }

  return getPromptText(exercise) || card?.english_name || "";
}

function getPromptText(exercise) {
  const prompt = parseMaybeJson(exercise?.prompt);

  if (typeof prompt === "string") {
    return prompt;
  }

  return prompt?.text || prompt?.english_name || "";
}

function getTranslationText(exercise) {
  const card = getExerciseCard(exercise);
  const answerConfig = parseMaybeJson(exercise?.answer_config);

  if (typeof answerConfig === "string") {
    return answerConfig;
  }

  return (
    answerConfig?.translation ||
    answerConfig?.correct_text ||
    card?.international_name ||
    ""
  );
}

function getAudioUri(exercise) {
  const card = getExerciseCard(exercise);
  const prompt = parseMaybeJson(exercise?.prompt);

  if (prompt && typeof prompt === "object" && prompt.audio_url) {
    return prompt.audio_url;
  }

  return card?.audio_url || card?.audio || "";
}

function getExerciseOptions(exercise) {
  const rawOptions = parseMaybeJson(exercise?.options);

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        return {
          id: option,
          text: option,
        };
      }

      return {
        id: option.id || option.card || option.value || option.text,
        text: option.text || option.international_name || option.label,
      };
    })
    .filter((option) => option.id && option.text);
}

function isCorrectOption(option, exercise) {
  const card = getExerciseCard(exercise);
  const answerConfig = parseMaybeJson(exercise?.answer_config);
  const correctId =
    answerConfig?.correct_option_id ||
    answerConfig?.correct_card_id ||
    answerConfig?.card ||
    card?.id;
  const correctText =
    answerConfig?.correct_text ||
    answerConfig?.translation ||
    card?.international_name;

  return option.id === correctId || option.text === correctText;
}

function parseMaybeJson(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeExerciseList(data) {
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

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
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
    card: {
      width: "100%",
      maxWidth: 340,
      borderRadius: 22,
      padding: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    moduleName: {
      color: colors.textPrimary,
      fontSize: 34,
      fontWeight: "800",
      textAlign: "center",
      minHeight: 96,
      textAlignVertical: "center",
      paddingVertical: 24,
      marginBottom: 20,
    },
    justAudioContent: {
      gap: 16,
      marginBottom: 18,
    },
    audioButton: {
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    audioButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    audioButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
    },
    translationText: {
      color: colors.textSecondary,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 28,
      textAlign: "center",
    },
    nextButton: {
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
      ...shadows.soft,
    },
    nextButtonPressed: {
      opacity: 0.9,
    },
    nextButtonCorrect: {
      backgroundColor: colors.success,
    },
    nextButtonText: {
      color: colors.surfaceMuted,
      fontSize: 15,
      fontWeight: "800",
    },
    disabledButton: {
      opacity: 0.56,
    },
    optionsList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 18,
    },
    optionItem: {
      width: "47%",
      height: 58,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionItemPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    optionItemWrong: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    optionItemCorrect: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    optionText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
    },
    helperText: {
      color: colors.textMutedDark,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 18,
      textAlign: "center",
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 18,
      textAlign: "center",
    },
    backButton: {
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
      ...shadows.soft,
    },
    backButtonText: {
      color: colors.surfaceMuted,
      fontSize: 15,
      fontWeight: "800",
    },
    modalBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: "rgba(0, 0, 0, 0.42)",
    },
    modalCard: {
      width: "100%",
      maxWidth: 320,
      padding: 22,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 8,
      textAlign: "center",
    },
    modalText: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
      textAlign: "center",
    },
    modalButton: {
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
    },
    modalButtonText: {
      color: colors.surfaceMuted,
      fontSize: 15,
      fontWeight: "800",
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
    },
    modalActionButton: {
      flex: 1,
    },
    modalSecondaryButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalSecondaryButtonText: {
      color: colors.textPrimary,
    },
  });
}
