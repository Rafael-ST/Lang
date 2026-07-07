import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { API_BASE_URL } from "../config/api";
import {
  completeExercise,
  fetchExercisesBySet,
} from "../features/exercises/services/exercisesApi";
import { resetExerciseSet } from "../features/exerciseSets/services/exerciseSetsApi";
import {
  fetchProfileByUsername,
  updateProfilePoints,
} from "../features/profiles/services/profilesApi";
import { useTheme } from "../theme";

const EXERCISE_TYPES = {
  JUST_AUDIO: "JUST_AUDIO",
  MULTIPLE_CHOICE_TRANSLATION: "multiple_choice_translation",
  SPEAK_WRITTEN_TEXT: "speak_written_text",
  WRITE_TRANSLATION_FROM_AUDIO: "write_translation_from_audio",
  WRITE_TRANSLATION_FROM_TEXT_AUDIO: "write_translation_from_text_audio",
};

export default function CategoryModuleScreen({
  category,
  exerciseSet,
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
  const [completedExerciseIds, setCompletedExerciseIds] = useState([]);
  const [postponedExerciseIds, setPostponedExerciseIds] = useState([]);
  const [isSetCompleted, setIsSetCompleted] = useState(false);
  const [isJustAudioCorrect, setIsJustAudioCorrect] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedAnswerStatus, setTypedAnswerStatus] = useState(null);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [spokenAnswerStatus, setSpokenAnswerStatus] = useState(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [speechError, setSpeechError] = useState("");
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
  const pendingExercises = useMemo(
    () => {
      const pending = playableExercises.filter(
        (exercise) => !completedExerciseIds.includes(exercise.id)
      );
      const regular = pending.filter(
        (exercise) => !postponedExerciseIds.includes(exercise.id)
      );
      const postponed = pending.filter((exercise) =>
        postponedExerciseIds.includes(exercise.id)
      );

      return [...regular, ...postponed];
    },
    [completedExerciseIds, playableExercises, postponedExerciseIds]
  );
  const selectedExercise = pendingExercises[selectedExerciseIndex];
  const selectedCard = getExerciseCard(selectedExercise);
  const exerciseType = getExerciseType(selectedExercise);
  const moduleName =
    getExerciseTitle(selectedExercise) ||
    selectedCard?.english_name ||
    exerciseSet?.title ||
    category?.nome ||
    sublevel?.nome ||
    "Modulo";
  const translationText = getTranslationText(selectedExercise);
  const expectedTranscript = getExpectedTranscript(selectedExercise);
  const audioUri = getAudioUri(selectedExercise);
  const username = user?.username || user?.email;
  const isProfilePending = Boolean(username && !profile && !pointsError);
  const hasNoPoints = Boolean(profile && profile.pontos <= 0);
  const exerciseAudioPlayer = useAudioPlayer(
    null,
    { keepAudioSessionActive: true }
  );
  const speechRecognition = useMemo(() => getSpeechRecognitionModule(), []);
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
    if (!speechRecognition) {
      return undefined;
    }

    const startSubscription = speechRecognition.addListener("start", () => {
      setIsListeningSpeech(true);
      setSpeechError("");
    });
    const endSubscription = speechRecognition.addListener("end", () => {
      setIsListeningSpeech(false);
    });
    const resultSubscription = speechRecognition.addListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript || "";

      if (transcript) {
        setSpokenTranscript(transcript);
      }
    });
    const errorSubscription = speechRecognition.addListener("error", (event) => {
      setIsListeningSpeech(false);

      if (event.error === "aborted") {
        return;
      }

      setSpeechError(
        event.message || "Nao foi possivel reconhecer sua fala. Tente novamente."
      );
    });

    return () => {
      startSubscription.remove();
      endSubscription.remove();
      resultSubscription.remove();
      errorSubscription.remove();
    };
  }, [speechRecognition]);

  useEffect(() => {
    let isMounted = true;

    async function loadExercises() {
      setIsLoadingExercises(true);
      setExercisesError("");

      try {
        const data = await fetchExercisesBySet(exerciseSet?.id);

        if (isMounted) {
          const nextExercises = normalizeExerciseList(data);

          console.info("[exercises] Retorno de /exercises/:", data);
          console.info("[exercises] Exercicios normalizados:", nextExercises);

          setExercises(sortExercisesByOrder(nextExercises));
          setSelectedExerciseIndex(0);
          setCompletedExerciseIds([]);
          setPostponedExerciseIds([]);
          setIsSetCompleted(
            isExerciseSetCompleted(exerciseSet) || nextExercises.length === 0
          );
          setWrongOptionId(null);
          setCorrectOptionId(null);
          setIsJustAudioCorrect(false);
          setTypedAnswer("");
          setTypedAnswerStatus(null);
          setSpokenTranscript("");
          setSpokenAnswerStatus(null);
          setSpeechError("");
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
  }, [exerciseSet]);

  useEffect(() => {
    try {
      exerciseAudioPlayer.replace(audioUri ? { uri: audioUri } : null);
    } catch (error) {
      console.warn("[audio] Nao foi possivel carregar o audio:", audioUri, error);
    }
  }, [audioUri, exerciseAudioPlayer]);

  useEffect(() => {
    if (
      !isAudioFirstExerciseType(exerciseType) ||
      !soundEnabled ||
      !audioUri ||
      isProfilePending ||
      hasNoPoints
    ) {
      return;
    }

    playAudio(exerciseAudioPlayer);
  }, [
    audioUri,
    exerciseAudioPlayer,
    exerciseType,
    hasNoPoints,
    isProfilePending,
    soundEnabled,
  ]);

  useEffect(() => {
    setTypedAnswer("");
    setTypedAnswerStatus(null);
    setSpokenTranscript("");
    setSpokenAnswerStatus(null);
    setSpeechError("");

    try {
      speechRecognition?.abort();
    } catch {
      // Speech recognition may already be inactive.
    }
  }, [selectedExercise?.id, speechRecognition]);

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

      const completeResult = await completeCurrentExercise({
        answer: { selected_option_id: optionCard.id, selected_text: optionCard.text },
        is_correct: false,
      });
      const nextPoints = await spendPoint();

      if (completeResult === null || nextPoints === null) {
        return;
      }

      if (completeResult?.set_completed) {
        nextExerciseTimeout.current = setTimeout(() => {
          setWrongOptionId(null);
          goToNextExercise(completeResult, false);
        }, 700);
        return;
      }

      if (nextPoints <= 0) {
        setIsNoPointsModalVisible(true);
        return;
      }

      nextExerciseTimeout.current = setTimeout(() => {
        setWrongOptionId(null);
        goToNextExercise(completeResult, false);
      }, 700);
      return;
    }

    setWrongOptionId(null);
    setCorrectOptionId(optionCard.id);
    playAudio(correctSoundPlayer);
    clearTimeout(nextExerciseTimeout.current);

    const completeResult = await completeCurrentExercise({
      answer: { selected_option_id: optionCard.id, selected_text: optionCard.text },
      is_correct: true,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      return;
    }

    if (completeResult?.set_completed) {
        nextExerciseTimeout.current = setTimeout(() => {
          setCorrectOptionId(null);
          goToNextExercise(completeResult, true);
        }, 700);
        return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setCorrectOptionId(null);
      goToNextExercise(completeResult, true);
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

    const completeResult = await completeCurrentExercise({
      answer: {},
      is_correct: true,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setIsJustAudioCorrect(false);
      return;
    }

    if (completeResult?.set_completed) {
      nextExerciseTimeout.current = setTimeout(() => {
        setIsJustAudioCorrect(false);
        goToNextExercise(completeResult, true);
      }, 700);
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setIsJustAudioCorrect(false);
      goToNextExercise(completeResult, true);
    }, 700);
  }

  async function handleWrittenAnswerSubmit() {
    if (
      isLoadingProfile ||
      isSpendingPoint ||
      typedAnswerStatus === "correct" ||
      typedAnswerStatus === "wrong"
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

    const isCorrect = isCorrectWrittenAnswer(typedAnswer, selectedExercise);

    if (!isCorrect && vibrationEnabled) {
      Vibration.vibrate(500);
    }

    setTypedAnswerStatus(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      playAudio(correctSoundPlayer);
    }

    clearTimeout(nextExerciseTimeout.current);

    const completeResult = await completeCurrentExercise({
      answer: { text: typedAnswer },
      is_correct: isCorrect,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setTypedAnswerStatus(null);
      return;
    }

    if (completeResult?.set_completed) {
      nextExerciseTimeout.current = setTimeout(() => {
        setTypedAnswer("");
        setTypedAnswerStatus(null);
        goToNextExercise(completeResult, isCorrect);
      }, 700);
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setTypedAnswer("");
      setTypedAnswerStatus(null);
      goToNextExercise(completeResult, isCorrect);
    }, 700);
  }

  async function handleSpeechStartPress() {
    if (
      isLoadingProfile ||
      isSpendingPoint ||
      spokenAnswerStatus === "correct" ||
      spokenAnswerStatus === "wrong"
    ) {
      return;
    }

    if (isListeningSpeech) {
      speechRecognition?.stop();
      return;
    }

    setSpeechError("");
    setSpokenTranscript("");
    setSpokenAnswerStatus(null);

    try {
      if (!speechRecognition) {
        setSpeechError(
          "Reconhecimento de fala ainda nao esta no app instalado. Recompile o Android."
        );
        return;
      }

      if (!speechRecognition.isRecognitionAvailable()) {
        setSpeechError("Reconhecimento de fala indisponivel neste aparelho.");
        return;
      }

      const permission = await speechRecognition.requestPermissionsAsync();

      if (!permission.granted) {
        setSpeechError("Permissao de microfone/reconhecimento de fala negada.");
        return;
      }

      speechRecognition.start({
        lang: getSpeechRecognitionLanguage(selectedExercise),
        interimResults: true,
        maxAlternatives: 3,
        continuous: false,
        contextualStrings: getAcceptedSpokenAnswers(selectedExercise),
      });
    } catch (error) {
      setIsListeningSpeech(false);
      setSpeechError("Nao foi possivel iniciar o reconhecimento de fala.");
      console.warn("[speech] Nao foi possivel iniciar:", error);
    }
  }

  async function handleSpeechAnswerSubmit() {
    if (
      isLoadingProfile ||
      isSpendingPoint ||
      isListeningSpeech ||
      spokenAnswerStatus === "correct" ||
      spokenAnswerStatus === "wrong"
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

    const isCorrect = isCorrectSpokenAnswer(spokenTranscript, selectedExercise);

    if (!isCorrect && vibrationEnabled) {
      Vibration.vibrate(500);
    }

    setSpokenAnswerStatus(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      playAudio(correctSoundPlayer);
    }

    clearTimeout(nextExerciseTimeout.current);

    const completeResult = await completeCurrentExercise({
      answer: {
        transcript: spokenTranscript,
        expected_transcript: expectedTranscript,
      },
      is_correct: isCorrect,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setSpokenAnswerStatus(null);
      return;
    }

    if (completeResult?.set_completed) {
      nextExerciseTimeout.current = setTimeout(() => {
        setSpokenTranscript("");
        setSpokenAnswerStatus(null);
        goToNextExercise(completeResult, isCorrect);
      }, 700);
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setSpokenTranscript("");
      setSpokenAnswerStatus(null);
      goToNextExercise(completeResult, isCorrect);
    }, 700);
  }

  async function handleSpeechSkipPress() {
    if (
      isLoadingProfile ||
      isSpendingPoint ||
      isListeningSpeech ||
      spokenAnswerStatus === "correct" ||
      spokenAnswerStatus === "wrong"
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

    setSpeechError("");
    setSpokenTranscript("");
    setSpokenAnswerStatus("correct");
    clearTimeout(nextExerciseTimeout.current);

    try {
      speechRecognition?.abort();
    } catch {
      // Speech recognition may already be inactive.
    }

    const completeResult = await completeCurrentExercise({
      answer: {
        skipped: true,
        reason: "user_cannot_speak_now",
        expected_transcript: expectedTranscript,
      },
      is_correct: true,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setSpokenAnswerStatus(null);
      return;
    }

    if (completeResult?.set_completed) {
      nextExerciseTimeout.current = setTimeout(() => {
        setSpokenTranscript("");
        setSpokenAnswerStatus(null);
        goToNextExercise(completeResult, true);
      }, 700);
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setSpokenTranscript("");
      setSpokenAnswerStatus(null);
      goToNextExercise(completeResult, true);
    }, 700);
  }

  async function completeCurrentExercise(payload) {
    if (!selectedExercise?.id) {
      return null;
    }

    try {
      return await completeExercise(selectedExercise.id, payload);
    } catch {
      setCorrectOptionId(null);
      setWrongOptionId(null);
      setIsJustAudioCorrect(false);
      setTypedAnswerStatus(null);
      setSpokenAnswerStatus(null);
      setPointsError("Nao foi possivel registrar o exercicio.");

      return null;
    }
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

  function goToNextExercise(completeResult, wasCorrect) {
    if (!selectedExercise?.id) {
      return;
    }

    if (!wasCorrect) {
      setPostponedExerciseIds((currentIds) => [
        ...new Set([...currentIds, selectedExercise.id]),
      ]);
      setSelectedExerciseIndex(0);
      return;
    }

    if (completeResult?.set_completed || pendingExercises.length <= 1) {
      setCompletedExerciseIds((currentIds) => [
        ...new Set([...currentIds, selectedExercise.id]),
      ]);
      setPostponedExerciseIds((currentIds) =>
        currentIds.filter((id) => id !== selectedExercise.id)
      );
      setIsSetCompleted(true);
      setSelectedExerciseIndex(0);
      return;
    }

    setCompletedExerciseIds((currentIds) => [
      ...new Set([...currentIds, selectedExercise.id]),
    ]);
    setPostponedExerciseIds((currentIds) =>
      currentIds.filter((id) => id !== selectedExercise.id)
    );
    setSelectedExerciseIndex(0);
  }

  async function resetCurrentExerciseSetIfNeeded() {
    if (!exerciseSet?.id || isSetCompleted) {
      return;
    }

    try {
      await resetExerciseSet(exerciseSet.id);
    } catch {
      // Leaving the lesson should not be blocked if the reset request fails.
    }
  }

  async function handleNoPointsBackPress() {
    setIsNoPointsModalVisible(false);
    await resetCurrentExerciseSetIfNeeded();
    onBack?.();
  }

  function handleStayPress() {
    setIsExitModalVisible(false);
  }

  async function handleExitConfirmPress() {
    setIsExitModalVisible(false);
    await resetCurrentExerciseSetIfNeeded();
    onBack?.();
  }

  const shouldShowOnlyNoPointsModal = Boolean(
    isNoPointsModalVisible && hasNoPoints
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      {isSetCompleted ? (
        <View style={styles.card}>
          <Text style={styles.moduleName}>Parabéns!</Text>
          <Text style={styles.translationText}>
            Você concluiu este conjunto de exercicios.
          </Text>
          <Pressable style={styles.nextButton} onPress={onBack}>
            <Text style={styles.nextButtonText}>Voltar</Text>
          </Pressable>
        </View>
      ) : isProfilePending ? (
        <View style={styles.card}>
          <Text style={styles.helperText}>Carregando seus pontos...</Text>
        </View>
      ) : shouldShowOnlyNoPointsModal ? null : (
      <View style={[styles.card, styles.exerciseCard]}>
        <Text style={styles.moduleName}>{moduleName}</Text>
        {translationText ? (
          <Text style={styles.titleTranslationText}>{translationText}</Text>
        ) : null}

        <View style={styles.exerciseBody}>
        {isLoadingExercises || isLoadingProfile ? (
          <Text style={styles.helperText}>Carregando exercicios...</Text>
        ) : exercisesError ? (
          <Text style={styles.errorText}>{exercisesError}</Text>
        ) : pointsError ? (
          <Text style={styles.errorText}>{pointsError}</Text>
        ) : !exercises.length ? (
          <Text style={styles.helperText}>Nenhum exercicio encontrado.</Text>
        ) : !pendingExercises.length ? (
          <Text style={styles.helperText}>
            Nenhum exercicio compativel encontrado.
          </Text>
        ) : exerciseType === EXERCISE_TYPES.JUST_AUDIO ? (
          <View style={styles.justAudioContent}>
            <Pressable
              accessibilityLabel={
                audioUri ? "Ouvir audio" : "Audio indisponivel"
              }
              disabled={!audioUri}
              style={({ pressed }) => [
                styles.audioButton,
                pressed && audioUri ? styles.audioButtonPressed : null,
                !audioUri ? styles.disabledButton : null,
              ]}
              onPress={() => playAudio(exerciseAudioPlayer)}
            >
              <Ionicons
                name="volume-high"
                size={26}
                color={colors.textPrimary}
              />
            </Pressable>

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
                {isSpendingPoint ? "Avancando..." : "Próximo"}
              </Text>
            </Pressable>
          </View>
        ) : isWrittenAnswerExerciseType(exerciseType) ? (
          <View style={styles.writtenAnswerContent}>
            {audioUri ? (
              <Pressable
                accessibilityLabel="Ouvir audio"
                disabled={!audioUri}
                style={({ pressed }) => [
                  styles.audioButton,
                  pressed && audioUri ? styles.audioButtonPressed : null,
                ]}
                onPress={() => playAudio(exerciseAudioPlayer)}
              >
                <Ionicons
                  name="volume-high"
                  size={26}
                  color={colors.textPrimary}
                />
              </Pressable>
            ) : null}

            {exerciseType === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO &&
            getPromptText(selectedExercise) ? (
              <Text style={styles.promptText}>
                {getPromptText(selectedExercise)}
              </Text>
            ) : null}

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSpendingPoint && !typedAnswerStatus}
              onChangeText={setTypedAnswer}
              onSubmitEditing={handleWrittenAnswerSubmit}
              placeholder="Digite a resposta"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              style={[
                styles.answerInput,
                typedAnswerStatus === "wrong" ? styles.answerInputWrong : null,
                typedAnswerStatus === "correct"
                  ? styles.answerInputCorrect
                  : null,
              ]}
              value={typedAnswer}
            />

            <Pressable
              disabled={Boolean(
                !typedAnswer.trim() || isSpendingPoint || typedAnswerStatus
              )}
              style={({ pressed }) => [
                styles.nextButton,
                typedAnswerStatus === "correct" ? styles.nextButtonCorrect : null,
                typedAnswerStatus === "wrong" ? styles.nextButtonWrong : null,
                pressed ? styles.nextButtonPressed : null,
                !typedAnswer.trim() || (isSpendingPoint && !typedAnswerStatus)
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleWrittenAnswerSubmit}
            >
              <Text style={styles.nextButtonText}>
                {isSpendingPoint ? "Verificando..." : "Responder"}
              </Text>
            </Pressable>
          </View>
        ) : exerciseType === EXERCISE_TYPES.SPEAK_WRITTEN_TEXT ? (
          <View style={styles.speechContent}>
            <Text style={styles.promptText}>
              {expectedTranscript || getPromptText(selectedExercise) || "Texto indisponivel"}
            </Text>

            {audioUri ? (
              <Pressable
                accessibilityLabel="Ouvir modelo"
                disabled={!audioUri}
                style={({ pressed }) => [
                  styles.audioButton,
                  pressed && audioUri ? styles.audioButtonPressed : null,
                ]}
                onPress={() => playAudio(exerciseAudioPlayer)}
              >
                <Ionicons
                  name="volume-high"
                  size={26}
                  color={colors.textPrimary}
                />
              </Pressable>
            ) : null}

            <Pressable
              disabled={Boolean(isSpendingPoint || spokenAnswerStatus)}
              style={({ pressed }) => [
                styles.speechButton,
                isListeningSpeech ? styles.speechButtonListening : null,
                spokenAnswerStatus === "correct" ? styles.nextButtonCorrect : null,
                spokenAnswerStatus === "wrong" ? styles.nextButtonWrong : null,
                pressed ? styles.nextButtonPressed : null,
                isSpendingPoint || spokenAnswerStatus ? styles.disabledButton : null,
              ]}
              onPress={handleSpeechStartPress}
            >
              <Text style={styles.nextButtonText}>
                {isListeningSpeech ? "Parar" : "Falar"}
              </Text>
            </Pressable>

            <Text
              style={[
                styles.transcriptText,
                spokenAnswerStatus === "wrong" ? styles.transcriptTextWrong : null,
                spokenAnswerStatus === "correct" ? styles.transcriptTextCorrect : null,
              ]}
            >
              {spokenTranscript ||
                (isListeningSpeech ? "Ouvindo..." : "Toque em Falar e repita o texto.")}
            </Text>

            {speechError ? (
              <Text style={styles.errorText}>{speechError}</Text>
            ) : null}

            <Pressable
              disabled={Boolean(
                !spokenTranscript.trim() ||
                  isListeningSpeech ||
                  isSpendingPoint ||
                  spokenAnswerStatus
              )}
              style={({ pressed }) => [
                styles.nextButton,
                spokenAnswerStatus === "correct" ? styles.nextButtonCorrect : null,
                spokenAnswerStatus === "wrong" ? styles.nextButtonWrong : null,
                pressed ? styles.nextButtonPressed : null,
                !spokenTranscript.trim() ||
                isListeningSpeech ||
                (isSpendingPoint && !spokenAnswerStatus)
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleSpeechAnswerSubmit}
            >
              <Text style={styles.nextButtonText}>
                {isSpendingPoint ? "Verificando..." : "Responder"}
              </Text>
            </Pressable>

            <Pressable
              disabled={Boolean(
                isListeningSpeech ||
                  isSpendingPoint ||
                  spokenAnswerStatus
              )}
              style={({ pressed }) => [
                styles.skipSpeechButton,
                pressed ? styles.audioButtonPressed : null,
                isListeningSpeech ||
                (isSpendingPoint && !spokenAnswerStatus) ||
                spokenAnswerStatus
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleSpeechSkipPress}
            >
              <Text style={styles.skipSpeechButtonText}>
                {isSpendingPoint ? "Pulando..." : "Pular exercicio"}
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
        </View>

        <Pressable
          style={styles.backButton}
          onPress={() => setIsExitModalVisible(true)}
        >
          <Text style={styles.backButtonText}>Voltar para exercicios</Text>
        </Pressable>
      </View>
      )}

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
              Você não tem mais pontos para continuar esta lição.
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
  } catch (error) {
    // Audio feedback is optional; the exercise flow should continue if playback fails.
    console.warn("[audio] Nao foi possivel tocar o audio:", error);
  }
}

function getSpeechRecognitionModule() {
  try {
    return require("expo-speech-recognition").ExpoSpeechRecognitionModule;
  } catch (error) {
    console.warn("[speech] Modulo nativo indisponivel:", error);
    return null;
  }
}

function isSupportedExercise(exercise) {
  const type = getExerciseType(exercise);

  return (
    type === EXERCISE_TYPES.JUST_AUDIO ||
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION ||
    type === EXERCISE_TYPES.SPEAK_WRITTEN_TEXT ||
    isWrittenAnswerExerciseType(type)
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

  if (
    type === "WRITE_TRANSLATION_FROM_AUDIO" ||
    type === "WRITE-TRANSLATION-FROM-AUDIO"
  ) {
    return EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO;
  }

  if (
    type === "WRITE_TRANSLATION_FROM_TEXT_AUDIO" ||
    type === "WRITE-TRANSLATION-FROM-TEXT-AUDIO"
  ) {
    return EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO;
  }

  if (type === "SPEAK_WRITTEN_TEXT" || type === "SPEAK-WRITTEN-TEXT") {
    return EXERCISE_TYPES.SPEAK_WRITTEN_TEXT;
  }

  return exercise?.type || "";
}

function isAudioFirstExerciseType(type) {
  return (
    type === EXERCISE_TYPES.JUST_AUDIO ||
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO
  );
}

function isWrittenAnswerExerciseType(type) {
  return (
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO
  );
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
  const type = getExerciseType(exercise);

  if (type === EXERCISE_TYPES.JUST_AUDIO) {
    return card?.english_name || getPromptText(exercise);
  }

  if (type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO) {
    return "Escreva o que ouvir";
  }

  if (type === EXERCISE_TYPES.SPEAK_WRITTEN_TEXT) {
    return "Fale em voz alta";
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
  const type = getExerciseType(exercise);
  const answerConfig = parseMaybeJson(exercise?.answer_config);

  if (typeof answerConfig === "string") {
    return answerConfig;
  }

  if (type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO) {
    return answerConfig?.translation || card?.international_name || "";
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
  const promptAudioUri =
    prompt && typeof prompt === "object" ? prompt.audio_url : "";
  const cardAudioUri = card?.audio_url || card?.audio || "";

  if (isLocalhostUri(promptAudioUri) && !isLocalhostUri(cardAudioUri)) {
    return cardAudioUri || replaceLocalhostOrigin(promptAudioUri);
  }

  return replaceLocalhostOrigin(promptAudioUri || cardAudioUri || "");
}

function getExpectedTranscript(exercise) {
  const card = getExerciseCard(exercise);
  const answerConfig = parseMaybeJson(exercise?.answer_config);

  return (
    answerConfig?.expected_transcript ||
    answerConfig?.correct_text ||
    getPromptText(exercise) ||
    card?.english_name ||
    ""
  );
}

function isLocalhostUri(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(
    String(value || "")
  );
}

function replaceLocalhostOrigin(value) {
  if (!isLocalhostUri(value)) {
    return value;
  }

  const apiOrigin = getUrlOrigin(API_BASE_URL);

  if (!apiOrigin) {
    return value;
  }

  return String(value).replace(
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
    apiOrigin
  );
}

function getUrlOrigin(value) {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.origin;
  } catch {
    return "";
  }
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

function isCorrectWrittenAnswer(answer, exercise) {
  const answerConfig = parseMaybeJson(exercise?.answer_config);
  const acceptedAnswers = getAcceptedWrittenAnswers(exercise);

  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeWrittenAnswer(answer, answerConfig) ===
      normalizeWrittenAnswer(acceptedAnswer, answerConfig)
  );
}

function isCorrectSpokenAnswer(answer, exercise) {
  const acceptedAnswers = getAcceptedSpokenAnswers(exercise);

  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeSpokenAnswer(answer) === normalizeSpokenAnswer(acceptedAnswer)
  );
}

function getAcceptedSpokenAnswers(exercise) {
  const answerConfig = parseMaybeJson(exercise?.answer_config);
  const acceptedAnswers = [];

  if (Array.isArray(answerConfig?.accept)) {
    acceptedAnswers.push(...answerConfig.accept);
  }

  if (answerConfig?.expected_transcript) {
    acceptedAnswers.push(answerConfig.expected_transcript);
  }

  if (answerConfig?.correct_text) {
    acceptedAnswers.push(answerConfig.correct_text);
  }

  const promptText = getPromptText(exercise);

  if (promptText) {
    acceptedAnswers.push(promptText);
  }

  const card = getExerciseCard(exercise);

  if (card?.english_name) {
    acceptedAnswers.push(card.english_name);
  }

  return [...new Set(acceptedAnswers.filter(Boolean).map(String))];
}

function getSpeechRecognitionLanguage(exercise) {
  const answerConfig = parseMaybeJson(exercise?.answer_config);

  return answerConfig?.language || "en-US";
}

function normalizeSpokenAnswer(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAcceptedWrittenAnswers(exercise) {
  const card = getExerciseCard(exercise);
  const type = getExerciseType(exercise);
  const answerConfig = parseMaybeJson(exercise?.answer_config);
  const acceptedAnswers = [];

  if (Array.isArray(answerConfig?.accept)) {
    acceptedAnswers.push(...answerConfig.accept);
  }

  if (answerConfig?.correct_text) {
    acceptedAnswers.push(answerConfig.correct_text);
  }

  if (type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO) {
    if (card?.english_name) {
      acceptedAnswers.push(card.english_name);
    }

    return [...new Set(acceptedAnswers.filter(Boolean).map(String))];
  }

  if (answerConfig?.translation) {
    acceptedAnswers.push(answerConfig.translation);
  }

  if (card?.international_name) {
    acceptedAnswers.push(card.international_name);
  }

  return [...new Set(acceptedAnswers.filter(Boolean).map(String))];
}

function normalizeWrittenAnswer(value, answerConfig) {
  const shouldTrim = answerConfig?.trim !== false && answerConfig?.trim !== "false";
  const isCaseSensitive =
    answerConfig?.case_sensitive === true ||
    answerConfig?.case_sensitive === "true";
  const nextValue = shouldTrim ? String(value || "").trim() : String(value || "");

  return isCaseSensitive ? nextValue : nextValue.toLocaleLowerCase();
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

function isExerciseSetCompleted(exerciseSet) {
  return (
    exerciseSet?.is_completed ||
    exerciseSet?.progress?.status === "completed"
  );
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sortExercisesByOrder(items) {
  return [...items].sort((firstExercise, secondExercise) => {
    const firstOrder = Number(firstExercise?.order ?? 0);
    const secondOrder = Number(secondExercise?.order ?? 0);

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return Number(firstExercise?.id ?? 0) - Number(secondExercise?.id ?? 0);
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
    card: {
      width: "100%",
      maxWidth: 340,
      borderRadius: 22,
      padding: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "flex-start",
      ...shadows.soft,
    },
    exerciseCard: {
      flex: 1,
      minHeight: 560,
    },
    moduleName: {
      color: colors.textPrimary,
      fontSize: 34,
      fontWeight: "800",
      textAlign: "center",
      minHeight: 96,
      textAlignVertical: "center",
      paddingVertical: 24,
      marginBottom: 6,
    },
    titleTranslationText: {
      color: colors.textSecondary,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 28,
      textAlign: "center",
      marginBottom: 20,
    },
    exerciseBody: {
      flex: 1,
    },
    justAudioContent: {
      gap: 16,
      marginBottom: 18,
    },
    writtenAnswerContent: {
      gap: 14,
      marginBottom: 18,
    },
    speechContent: {
      gap: 14,
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
    translationText: {
      color: colors.textSecondary,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 28,
      textAlign: "center",
    },
    promptText: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 30,
      textAlign: "center",
    },
    answerInput: {
      height: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      paddingHorizontal: 16,
      textAlign: "center",
    },
    answerInputWrong: {
      borderColor: colors.error,
    },
    answerInputCorrect: {
      borderColor: colors.success,
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
    nextButtonWrong: {
      backgroundColor: colors.error,
    },
    nextButtonText: {
      color: colors.surfaceMuted,
      fontSize: 15,
      fontWeight: "800",
    },
    speechButton: {
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
      ...shadows.soft,
    },
    speechButtonListening: {
      backgroundColor: colors.link,
    },
    skipSpeechButton: {
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    skipSpeechButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
    },
    transcriptText: {
      minHeight: 48,
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
      textAlign: "center",
    },
    transcriptTextWrong: {
      color: colors.error,
    },
    transcriptTextCorrect: {
      color: colors.success,
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
      marginTop: "auto",
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
