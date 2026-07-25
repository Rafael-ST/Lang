import {
  Animated,
  Image,
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
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { API_BASE_URL } from "../config/api";
import {
  fetchCards,
  markCardsAsSeen,
} from "../features/cards/services/cardsApi";
import {
  completeExercise,
  fetchExercisesBySet,
} from "../features/exercises/services/exercisesApi";
import { resetExerciseSet } from "../features/exerciseSets/services/exerciseSetsApi";
import {
  fetchProfileByUsername,
  updateProfilePoints,
} from "../features/profiles/services/profilesApi";
import { showCompletionInterstitial } from "../services/interstitialAd";
import { useTheme } from "../theme";

const EXERCISE_TYPES = {
  JUST_AUDIO: "JUST_AUDIO",
  MULTIPLE_CHOICE_TRANSLATION: "multiple_choice_translation",
  MULTIPLE_CHOICE_AUDIO_ENGLISH: "multiple_choice_audio_english",
  MATCHING_PAIRS: "matching_pairs",
  COMPLETE_AUDIO_TEXT: "complete_audio_text",
  IMAGE_PRESENTATION: "image_presentation",
  IMAGE_MULTIPLE_CHOICE_ENGLISH: "image_multiple_choice_english",
  SPEAK_WRITTEN_TEXT: "speak_written_text",
  WRITE_TRANSLATION_FROM_AUDIO: "write_translation_from_audio",
  WRITE_TRANSLATION_FROM_TEXT_AUDIO: "write_translation_from_text_audio",
};
const PROGRESS_ADVANCE_DELAY_MS = 650;
const COMPLETION_COUNT_UP_DURATION_MS = 1200;

export default function CategoryModuleScreen({
  category,
  exerciseSet,
  isReviewMode = false,
  onBack,
  onProfileChange,
  soundEnabled = true,
  sublevel,
  user,
  vibrationEnabled = true,
}) {
  const { colors, shadows } = useTheme();
  const [exercises, setExercises] = useState([]);
  const [translationCards, setTranslationCards] = useState([]);
  const [selectedWordTranslation, setSelectedWordTranslation] = useState(null);
  const [firstSeenCardExerciseIds, setFirstSeenCardExerciseIds] = useState(
    () => new Map()
  );
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [wrongOptionId, setWrongOptionId] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [completedExerciseIds, setCompletedExerciseIds] = useState([]);
  const [progressCompletedExerciseIds, setProgressCompletedExerciseIds] =
    useState([]);
  const [postponedExerciseIds, setPostponedExerciseIds] = useState([]);
  const [isSetCompleted, setIsSetCompleted] = useState(false);
  const [isLeavingCompletion, setIsLeavingCompletion] = useState(false);
  const [pendingSetCompletionExerciseId, setPendingSetCompletionExerciseId] =
    useState(null);
  const [isJustAudioCorrect, setIsJustAudioCorrect] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedAnswerStatus, setTypedAnswerStatus] = useState(null);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [spokenAnswerStatus, setSpokenAnswerStatus] = useState(null);
  const [matchingSelection, setMatchingSelection] = useState(null);
  const [matchedPairIds, setMatchedPairIds] = useState([]);
  const [wrongMatchingPair, setWrongMatchingPair] = useState(null);
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
  const [answerStats, setAnswerStats] = useState({ correct: 0, wrong: 0 });
  const [completionStats, setCompletionStats] = useState(null);
  const [animatedCompletionStats, setAnimatedCompletionStats] = useState({
    correct: 0,
    durationMs: 0,
    total: 0,
    wrong: 0,
  });
  const [exerciseReplayVersion, setExerciseReplayVersion] = useState(0);
  const nextExerciseTimeout = useRef(null);
  const speechAnswerSubmitRef = useRef(null);
  const isSubmittingSpeechAnswer = useRef(false);
  const exerciseSetStartedAt = useRef(null);
  const submittedCardAccessIds = useRef(new Set());
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const correctSoundPlayer = useAudioPlayer(
    require("../../assets/correct-answer.ogg"),
    { keepAudioSessionActive: true }
  );
  const celebrationSoundPlayer = useAudioPlayer(
    require("../../assets/celebration.mp3"),
    { keepAudioSessionActive: true }
  );
  const styles = createStyles(colors, shadows);
  speechAnswerSubmitRef.current = handleSpeechAnswerSubmit;
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
  const isRetryingExercise = postponedExerciseIds.includes(
    selectedExercise?.id
  );
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
  const wordTranslations = useMemo(() => {
    const cardsFromExercises = exercises.map(getExerciseCard).filter(Boolean);
    const translations = new Map();

    [...translationCards, ...cardsFromExercises].forEach((card) => {
      const key = normalizeTranslationKey(card?.english_name);

      if (key && card?.international_name && card?.is_active !== false) {
        translations.set(key, {
          audioUri: getCardAudioUri(card),
          cardId: String(card.id),
          translation: card.international_name,
        });
      }
    });

    const selectedCardKey = normalizeTranslationKey(selectedCard?.english_name);

    const selectedCardTranslation =
      selectedCard?.international_name || translationText;

    if (selectedCardKey && selectedCardTranslation) {
      translations.set(selectedCardKey, {
        audioUri: getCardAudioUri(selectedCard),
        cardId: String(selectedCard.id),
        translation: selectedCardTranslation,
      });
    }

    return translations;
  }, [exercises, selectedCard, translationCards, translationText]);
  const expectedTranscript = getExpectedTranscript(selectedExercise);
  const clozeTextParts = getClozeTextParts(selectedExercise);
  const visibleWordCardIds = useMemo(() => {
    const visibleTexts = [];

    if (isEnglishExerciseTitle(exerciseType)) {
      visibleTexts.push(moduleName);
    }

    if (exerciseType === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO) {
      visibleTexts.push(getPromptText(selectedExercise));
    }

    if (exerciseType === EXERCISE_TYPES.SPEAK_WRITTEN_TEXT) {
      visibleTexts.push(
        expectedTranscript || getPromptText(selectedExercise)
      );
    }

    return [
      ...new Set(
        visibleTexts.flatMap((text) =>
          splitEnglishText(text)
            .map((part) =>
              wordTranslations.get(normalizeTranslationKey(part))?.cardId
            )
            .filter(Boolean)
        )
      ),
    ];
  }, [
    exerciseType,
    expectedTranscript,
    moduleName,
    selectedExercise,
    wordTranslations,
  ]);
  const audioUri = getAudioUri(selectedExercise);
  const imageUri = getCardImageUri(selectedCard);
  const username = user?.username || user?.email;
  const isProfilePending = Boolean(username && !profile && !pointsError);
  const hasNoPoints = Boolean(profile && profile.pontos <= 0);
  const exerciseAudioPlayer = useAudioPlayer(
    null,
    { keepAudioSessionActive: true }
  );
  const translationAudioPlayer = useAudioPlayer(
    null,
    { keepAudioSessionActive: true }
  );
  const speechRecognition = useMemo(() => getSpeechRecognitionModule(), []);

  function handleTranslationSelect(nextTranslation) {
    const isSameWord =
      normalizeTranslationKey(selectedWordTranslation?.word) ===
      normalizeTranslationKey(nextTranslation.word);

    if (isSameWord) {
      setSelectedWordTranslation(null);
      return;
    }

    setSelectedWordTranslation(nextTranslation);

    if (nextTranslation.audioUri) {
      try {
        translationAudioPlayer.replace({ uri: nextTranslation.audioUri });
        playAudio(translationAudioPlayer);
      } catch (error) {
        console.warn(
          "[audio] Nao foi possivel tocar o audio da traducao:",
          error
        );
      }
    }
  }

  const optionCards = useMemo(() => {
    if (
      exerciseType !== EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION &&
      exerciseType !== EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH &&
      exerciseType !== EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH
    ) {
      return [];
    }

    const configuredOptions = getExerciseOptions(selectedExercise);

    if (configuredOptions.length) {
      return shuffleItems(configuredOptions);
    }

    const useEnglishOptions =
      exerciseType === EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH ||
      exerciseType === EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH;
    const selectedOptionText = useEnglishOptions
      ? selectedCard?.english_name
      : selectedCard?.international_name;

    if (!selectedOptionText) {
      return [];
    }

    const wrongCards = shuffleItems(
      playableExercises
        .map(getExerciseCard)
        .filter(
          (card) =>
            card?.id !== selectedCard.id &&
            (useEnglishOptions ? card?.english_name : card?.international_name)
        )
    );

    return shuffleItems([
      {
        id: selectedCard.id,
        text: selectedOptionText,
      },
      ...wrongCards.slice(0, 3).map((card) => ({
        id: card.id,
        text: useEnglishOptions ? card.english_name : card.international_name,
      })),
    ]);
  }, [
    exerciseReplayVersion,
    exerciseType,
    playableExercises,
    selectedCard,
    selectedExercise,
  ]);
  const matchingColumns = useMemo(() => {
    if (exerciseType !== EXERCISE_TYPES.MATCHING_PAIRS) {
      return { english: [], translations: [] };
    }

    const pairCards = getMatchingPairCards(selectedExercise);

    return {
      english: shuffleItems(
        pairCards.map((card) => ({
          audioUri: getCardAudioUri(card),
          cardId: String(card.id),
          text: card.english_name,
        }))
      ),
      translations: shuffleItems(
        pairCards.map((card) => ({
          cardId: String(card.id),
          text: card.international_name,
        }))
      ),
    };
  }, [exerciseReplayVersion, exerciseType, selectedExercise]);

  useEffect(() => {
    let isMounted = true;

    async function loadTranslationCards() {
      try {
        const data = await fetchCards();

        if (isMounted) {
          setTranslationCards(normalizeExerciseList(data));
        }
      } catch {
        // The exercise card still provides a local translation fallback.
      }
    }

    loadTranslationCards();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedWordTranslation(null);
  }, [exerciseReplayVersion, selectedExercise?.id]);

  useEffect(() => {
    if (
      !selectedExercise?.id ||
      isLoadingExercises ||
      isProfilePending ||
      hasNoPoints ||
      pointsError
    ) {
      return;
    }

    const cardIdsToSubmit = visibleWordCardIds.filter(
      (cardId) => !submittedCardAccessIds.current.has(cardId)
    );

    if (!cardIdsToSubmit.length) {
      return;
    }

    cardIdsToSubmit.forEach((cardId) =>
      submittedCardAccessIds.current.add(cardId)
    );
    const firstSeenExerciseId = selectedExercise.id;

    markCardsAsSeen(cardIdsToSubmit)
      .then((result) => {
        const newCardIds = result?.first_seen_card_ids || [];

        if (newCardIds.length) {
          setFirstSeenCardExerciseIds((currentExerciseIds) => {
            const nextExerciseIds = new Map(currentExerciseIds);

            newCardIds.forEach((cardId) =>
              nextExerciseIds.set(cardId, firstSeenExerciseId)
            );

            return nextExerciseIds;
          });
        }
      })
      .catch((error) => {
        cardIdsToSubmit.forEach((cardId) =>
          submittedCardAccessIds.current.delete(cardId)
        );
        console.warn(
          "[cards] Nao foi possivel registrar o primeiro acesso:",
          error
        );
      });
  }, [
    hasNoPoints,
    isLoadingExercises,
    isProfilePending,
    pointsError,
    selectedExercise?.id,
    visibleWordCardIds,
  ]);

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

        if (event.isFinal) {
          setIsListeningSpeech(false);
          speechAnswerSubmitRef.current?.(transcript);
        }
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
        const data = await fetchExercisesBySet(exerciseSet?.id, {
          includeCompleted: isReviewMode,
        });

        if (isMounted) {
          const nextExercises = normalizeExerciseList(data);

          console.info("[exercises] Retorno de /exercises/:", data);
          console.info("[exercises] Exercicios normalizados:", nextExercises);

          setExercises(sortExercisesByOrder(nextExercises));
          setSelectedExerciseIndex(0);
          setCompletedExerciseIds([]);
          setProgressCompletedExerciseIds([]);
          setPostponedExerciseIds([]);
          setAnswerStats({ correct: 0, wrong: 0 });
          setCompletionStats(null);
          exerciseSetStartedAt.current = Date.now();
          setIsSetCompleted(
            isReviewMode
              ? false
              : isExerciseSetCompleted(exerciseSet) || nextExercises.length === 0
          );
          setWrongOptionId(null);
          setCorrectOptionId(null);
          setIsJustAudioCorrect(false);
          setTypedAnswer("");
          setTypedAnswerStatus(null);
          setSpokenTranscript("");
          setSpokenAnswerStatus(null);
          setMatchingSelection(null);
          setMatchedPairIds([]);
          setWrongMatchingPair(null);
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
  }, [exerciseSet, isReviewMode]);

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
    exerciseReplayVersion,
    hasNoPoints,
    isProfilePending,
    soundEnabled,
  ]);

  useEffect(() => {
    setTypedAnswer("");
    setTypedAnswerStatus(null);
    setSpokenTranscript("");
    setSpokenAnswerStatus(null);
    setMatchingSelection(null);
    setMatchedPairIds([]);
    setWrongMatchingPair(null);
    setSpeechError("");
    isSubmittingSpeechAnswer.current = false;

    try {
      speechRecognition?.abort();
    } catch {
      // Speech recognition may already be inactive.
    }
  }, [exerciseReplayVersion, selectedExercise?.id, speechRecognition]);

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

  async function handleMatchingOptionPress(side, option) {
    if (
      matchedPairIds.includes(option.cardId) ||
      wrongMatchingPair ||
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

    if (side === "english" && soundEnabled && option.audioUri) {
      try {
        translationAudioPlayer.replace({ uri: option.audioUri });
        playAudio(translationAudioPlayer);
      } catch (error) {
        console.warn(
          "[audio] Nao foi possivel tocar o audio do card:",
          error
        );
      }
    }

    if (!matchingSelection || matchingSelection.side === side) {
      setMatchingSelection({ side, ...option });
      return;
    }

    const leftOption = side === "translation" ? option : matchingSelection;
    const rightOption = side === "english" ? option : matchingSelection;
    const isCorrectPair = leftOption.cardId === rightOption.cardId;

    setMatchingSelection(null);

    if (!isCorrectPair) {
      if (vibrationEnabled) {
        Vibration.vibrate(500);
      }

      const nextWrongPair = {
        englishId: rightOption.cardId,
        translationId: leftOption.cardId,
      };
      setWrongMatchingPair(nextWrongPair);
      setAnswerStats((currentStats) => ({
        ...currentStats,
        wrong: currentStats.wrong + 1,
      }));

      const completeResult = await completeCurrentExercise({
        answer: {
          english_card_id: rightOption.cardId,
          translation_card_id: leftOption.cardId,
        },
        is_correct: false,
      });
      const nextPoints = await spendPoint();

      if (completeResult === null || nextPoints === null) {
        setWrongMatchingPair(null);
        return;
      }

      if (nextPoints <= 0) {
        setIsNoPointsModalVisible(true);
      }

      nextExerciseTimeout.current = setTimeout(() => {
        setWrongMatchingPair(null);
      }, 550);
      return;
    }

    const nextMatchedPairIds = [...matchedPairIds, option.cardId];
    setMatchedPairIds(nextMatchedPairIds);
    if (soundEnabled) {
      playAudio(correctSoundPlayer);
    }

    if (nextMatchedPairIds.length < matchingColumns.english.length) {
      return;
    }

    clearTimeout(nextExerciseTimeout.current);
    const completeResult = await completeCurrentExercise({
      answer: { matched_card_ids: nextMatchedPairIds },
      is_correct: true,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setMatchedPairIds(matchedPairIds);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      goToNextExercise(completeResult, true);
    }, 700);
  }

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

    if (
      exerciseType === EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH &&
      soundEnabled
    ) {
      const optionAudioUri = getOptionAudioUri(optionCard);

      if (optionAudioUri) {
        try {
          translationAudioPlayer.replace({ uri: optionAudioUri });
          playAudio(translationAudioPlayer);
        } catch (error) {
          console.warn(
            "[audio] Nao foi possivel tocar o audio da alternativa:",
            error
          );
        }
      }
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
    if (exerciseType !== EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH) {
      playAudio(correctSoundPlayer);
    }
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

  async function handleSpeechAnswerSubmit(recognizedTranscript = spokenTranscript) {
    if (
      isLoadingProfile ||
      isSpendingPoint ||
      isSubmittingSpeechAnswer.current ||
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

    if (!recognizedTranscript.trim()) {
      return;
    }

    isSubmittingSpeechAnswer.current = true;
    const isCorrect = isCorrectSpokenAnswer(
      recognizedTranscript,
      selectedExercise
    );

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
        transcript: recognizedTranscript,
        expected_transcript: expectedTranscript,
      },
      is_correct: isCorrect,
    });
    const nextPoints = await spendPoint();

    if (completeResult === null || nextPoints === null) {
      setSpokenAnswerStatus(null);
      isSubmittingSpeechAnswer.current = false;
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

    if (isReviewMode) {
      return {
        exercise_completed: Boolean(payload?.is_correct),
        review: true,
        set_completed: pendingExercises.length <= 1,
      };
    }

    try {
      return await completeExercise(selectedExercise.id, {
        ...payload,
        duration_ms: Date.now() - (exerciseSetStartedAt.current || Date.now()),
      });
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

    const completedExerciseId = selectedExercise.id;
    const nextStats = {
      correct: answerStats.correct + (wasCorrect ? 1 : 0),
      wrong: answerStats.wrong + (wasCorrect ? 0 : 1),
    };

    setAnswerStats(nextStats);

    if (!wasCorrect) {
      setPostponedExerciseIds((currentIds) => [
        ...new Set([...currentIds, selectedExercise.id]),
      ]);
      setSelectedExerciseIndex(0);
      setExerciseReplayVersion((currentVersion) => currentVersion + 1);
      return;
    }

    setProgressCompletedExerciseIds((currentIds) => [
      ...new Set([...currentIds, completedExerciseId]),
    ]);

    if (completeResult?.set_completed || pendingExercises.length <= 1) {
      setCompletionStats({
        correct: nextStats.correct,
        durationMs: Date.now() - (exerciseSetStartedAt.current || Date.now()),
        total: playableExercises.length,
        wrong: nextStats.wrong,
      });
      setPendingSetCompletionExerciseId(completedExerciseId);
      return;
    }

    nextExerciseTimeout.current = setTimeout(() => {
      setCompletedExerciseIds((currentIds) => [
        ...new Set([...currentIds, selectedExercise.id]),
      ]);
      setPostponedExerciseIds((currentIds) =>
        currentIds.filter((id) => id !== selectedExercise.id)
      );
      setSelectedExerciseIndex(0);
    }, PROGRESS_ADVANCE_DELAY_MS);
  }

  async function resetCurrentExerciseSetIfNeeded() {
    if (isReviewMode || !exerciseSet?.id || isSetCompleted) {
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

  async function handleCompletionContinuePress() {
    if (isLeavingCompletion) {
      return;
    }

    setIsLeavingCompletion(true);

    try {
      await showCompletionInterstitial();
    } finally {
      onBack?.();
    }
  }

  const shouldShowOnlyNoPointsModal = Boolean(
    isNoPointsModalVisible && hasNoPoints
  );
  const totalProgressExercises = playableExercises.length;
  const completedProgressExercises = isSetCompleted
    ? totalProgressExercises
    : Math.min(progressCompletedExerciseIds.length, totalProgressExercises);
  const progressPercent = totalProgressExercises
    ? (completedProgressExercises / totalProgressExercises) * 100
    : 0;
  const animatedProgressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    const animation = Animated.spring(progressAnimation, {
      toValue: progressPercent,
      friction: 9,
      tension: 70,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (
        !finished ||
        pendingSetCompletionExerciseId === null ||
        progressPercent < 100
      ) {
        return;
      }

      setCompletedExerciseIds((currentIds) => [
        ...new Set([...currentIds, pendingSetCompletionExerciseId]),
      ]);
      setPostponedExerciseIds((currentIds) =>
        currentIds.filter((id) => id !== pendingSetCompletionExerciseId)
      );

      if (soundEnabled) {
        playAudio(celebrationSoundPlayer);
      }

      setPendingSetCompletionExerciseId(null);
      setIsSetCompleted(true);
    });

    return () => animation.stop();
  }, [
    celebrationSoundPlayer,
    pendingSetCompletionExerciseId,
    progressAnimation,
    progressPercent,
    soundEnabled,
  ]);

  const completionDurationMs = completionStats?.durationMs ?? 0;
  const completionTotal = completionStats?.total ?? playableExercises.length;
  const completionCorrect = completionStats?.correct ?? answerStats.correct;
  const completionWrong = completionStats?.wrong ?? answerStats.wrong;

  useEffect(() => {
    if (!isSetCompleted) {
      return;
    }

    let animationFrameId;
    const startedAt = Date.now();

    setAnimatedCompletionStats({
      correct: 0,
      durationMs: 0,
      total: 0,
      wrong: 0,
    });

    function updateCountUp() {
      const progress = Math.min(
        (Date.now() - startedAt) / COMPLETION_COUNT_UP_DURATION_MS,
        1
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedCompletionStats({
        correct: Math.round(completionCorrect * easedProgress),
        durationMs: Math.round(completionDurationMs * easedProgress),
        total: Math.round(completionTotal * easedProgress),
        wrong: Math.round(completionWrong * easedProgress),
      });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCountUp);
      }
    }

    animationFrameId = requestAnimationFrame(updateCountUp);

    return () => cancelAnimationFrame(animationFrameId);
  }, [
    completionCorrect,
    completionDurationMs,
    completionTotal,
    completionWrong,
    isSetCompleted,
  ]);

  return (
    <ScreenContainer
      contentStyle={styles.container}
      scroll={exerciseType === EXERCISE_TYPES.MATCHING_PAIRS}
    >
      {isSetCompleted ? (
        <View style={styles.card}>
          <Text style={styles.moduleName}>Parabéns!</Text>
          <Text style={styles.translationText}>
            Você concluiu este conjunto de exercicios.
          </Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tempo</Text>
              <Text style={styles.summaryValue}>
                {formatDuration(animatedCompletionStats.durationMs)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>
                {animatedCompletionStats.total}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Certas</Text>
              <Text style={[styles.summaryValue, styles.summaryValueSuccess]}>
                {animatedCompletionStats.correct}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Erradas</Text>
              <Text style={[styles.summaryValue, styles.summaryValueError]}>
                {animatedCompletionStats.wrong}
              </Text>
            </View>
          </View>
          <Pressable
            disabled={isLeavingCompletion}
            style={[
              styles.nextButton,
              isLeavingCompletion ? styles.disabledButton : null,
            ]}
            onPress={handleCompletionContinuePress}
          >
            <Text style={styles.nextButtonText}>
              {isLeavingCompletion ? "Continuando..." : "Continuar"}
            </Text>
          </Pressable>
        </View>
      ) : isProfilePending ? (
        <View style={styles.card}>
          <Text style={styles.helperText}>Carregando seus pontos...</Text>
        </View>
      ) : shouldShowOnlyNoPointsModal ? null : (
      <View style={[styles.card, styles.exerciseCard]}>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: totalProgressExercises,
            now: completedProgressExercises,
          }}
          style={styles.progressContainer}
        >
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: animatedProgressWidth },
              ]}
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
        {isRetryingExercise ? (
          <View accessibilityRole="alert" style={styles.retryMessage}>
            <Ionicons
              color={colors.error}
              name="refresh-circle"
              size={22}
            />
            <View style={styles.retryMessageContent}>
              <Text style={styles.retryMessageTitle}>
                Vamos tentar de novo!
              </Text>
              <Text style={styles.retryMessageText}>
                Esta é uma nova chance. Você consegue!
              </Text>
            </View>
          </View>
        ) : null}
        {exerciseType ===
        EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO ? (
          <Text style={styles.exerciseInstruction}>Escreva a tradução</Text>
        ) : null}
        {exerciseType === EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH ||
        exerciseType === EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH ? null :
        isEnglishExerciseTitle(exerciseType) ? (
          <ClickableEnglishText
            exerciseId={selectedExercise?.id}
            firstSeenCardExerciseIds={firstSeenCardExerciseIds}
            firstSeenStyle={styles.firstSeenWord}
            linkStyle={styles.translatableWord}
            style={styles.moduleName}
            text={moduleName}
            translations={wordTranslations}
            onTranslationSelect={handleTranslationSelect}
          />
        ) : (
          <Text style={styles.moduleName}>{moduleName}</Text>
        )}
        {translationText &&
        exerciseType !== EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION &&
        exerciseType !== EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH &&
        exerciseType !== EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH &&
        exerciseType !== EXERCISE_TYPES.MATCHING_PAIRS &&
        !isWrittenAnswerExerciseType(exerciseType) ? (
          <Text style={styles.titleTranslationText}>{translationText}</Text>
        ) : null}
        {selectedWordTranslation ? (
          <View style={styles.wordTranslationCard}>
            <Text style={styles.wordTranslationLabel}>
              {selectedWordTranslation.word}
            </Text>
            <Text style={styles.wordTranslationText}>
              {selectedWordTranslation.translation}
            </Text>
          </View>
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
        ) : exerciseType === EXERCISE_TYPES.MATCHING_PAIRS ? (
          <View style={styles.matchingContent}>
            <Text style={styles.matchingHint}>
              Toque em um item de cada coluna para formar os pares.
            </Text>
            <View style={styles.matchingColumns}>
              <View style={styles.matchingColumn}>
                {matchingColumns.translations.map((option) => {
                  const isMatched = matchedPairIds.includes(option.cardId);
                  const isSelected =
                    matchingSelection?.side === "translation" &&
                    matchingSelection.cardId === option.cardId;
                  const isWrong =
                    wrongMatchingPair?.translationId === option.cardId;

                  return (
                    <Pressable
                      accessibilityState={{ disabled: isMatched, selected: isSelected }}
                      disabled={isMatched || isSpendingPoint}
                      key={`translation-${option.cardId}`}
                      style={({ pressed }) => [
                        styles.matchingItem,
                        isSelected ? styles.matchingItemSelected : null,
                        isMatched ? styles.matchingItemCorrect : null,
                        isWrong ? styles.matchingItemWrong : null,
                        pressed && !isMatched ? styles.optionItemPressed : null,
                      ]}
                      onPress={() =>
                        handleMatchingOptionPress("translation", option)
                      }
                    >
                      <Text
                        style={[
                          styles.matchingItemText,
                          isMatched ? styles.matchingItemTextCorrect : null,
                        ]}
                      >
                        {option.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.matchingColumn}>
                {matchingColumns.english.map((option) => {
                  const isMatched = matchedPairIds.includes(option.cardId);
                  const isSelected =
                    matchingSelection?.side === "english" &&
                    matchingSelection.cardId === option.cardId;
                  const isWrong = wrongMatchingPair?.englishId === option.cardId;

                  return (
                    <Pressable
                      accessibilityState={{ disabled: isMatched, selected: isSelected }}
                      disabled={isMatched || isSpendingPoint}
                      key={`english-${option.cardId}`}
                      style={({ pressed }) => [
                        styles.matchingItem,
                        isSelected ? styles.matchingItemSelected : null,
                        isMatched ? styles.matchingItemCorrect : null,
                        isWrong ? styles.matchingItemWrong : null,
                        pressed && !isMatched ? styles.optionItemPressed : null,
                      ]}
                      onPress={() => handleMatchingOptionPress("english", option)}
                    >
                      <Text
                        style={[
                          styles.matchingItemText,
                          isMatched ? styles.matchingItemTextCorrect : null,
                        ]}
                      >
                        {option.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : exerciseType === EXERCISE_TYPES.IMAGE_PRESENTATION ? (
          <View style={styles.imagePresentationContent}>
            {imageUri ? (
              <Image
                accessibilityLabel={`Imagem de ${moduleName}`}
                resizeMode="contain"
                source={{ uri: imageUri }}
                style={styles.presentationImage}
              />
            ) : (
              <Text style={styles.errorText}>Imagem indisponível.</Text>
            )}

            <Pressable
              accessibilityLabel={audioUri ? "Ouvir áudio" : "Áudio indisponível"}
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
                {isSpendingPoint ? "Avançando..." : "Próximo"}
              </Text>
            </Pressable>
          </View>
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
        ) : exerciseType === EXERCISE_TYPES.COMPLETE_AUDIO_TEXT ? (
          <View style={styles.writtenAnswerContent}>
            <Pressable
              accessibilityLabel={audioUri ? "Ouvir áudio" : "Áudio indisponível"}
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

            <View style={styles.clozeSentence}>
              {clozeTextParts.before ? (
                <Text style={styles.clozeText}>{clozeTextParts.before}</Text>
              ) : null}
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSpendingPoint && !typedAnswerStatus}
                onChangeText={setTypedAnswer}
                onSubmitEditing={handleWrittenAnswerSubmit}
                placeholder="..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                style={[
                  styles.clozeInput,
                  {
                    width: Math.min(
                      160,
                      Math.max(34, expectedTranscript.length * 13 + 4)
                    ),
                  },
                  typedAnswerStatus === "wrong"
                    ? styles.answerInputWrong
                    : null,
                  typedAnswerStatus === "correct"
                    ? styles.answerInputCorrect
                    : null,
                ]}
                value={typedAnswer}
              />
              {clozeTextParts.after ? (
                <Text style={styles.clozeText}>{clozeTextParts.after}</Text>
              ) : null}
            </View>

            <Pressable
              disabled={Boolean(
                !typedAnswer.trim() || isSpendingPoint || typedAnswerStatus
              )}
              style={({ pressed }) => [
                styles.nextButton,
                typedAnswerStatus === "correct"
                  ? styles.nextButtonCorrect
                  : null,
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
            <ClickableEnglishText
              exerciseId={selectedExercise?.id}
              firstSeenCardExerciseIds={firstSeenCardExerciseIds}
              firstSeenStyle={styles.firstSeenWord}
              linkStyle={styles.translatableWord}
              style={styles.promptText}
              text={
                expectedTranscript ||
                getPromptText(selectedExercise) ||
                "Texto indisponivel"
              }
              translations={wordTranslations}
              onTranslationSelect={handleTranslationSelect}
            />

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
                isSpendingPoint && !spokenAnswerStatus
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleSpeechStartPress}
            >
              <Text style={styles.nextButtonText}>
                {spokenAnswerStatus === "correct"
                  ? "Correto!"
                  : spokenAnswerStatus === "wrong"
                    ? "Incorreto"
                    : isSpendingPoint
                      ? "Verificando..."
                      : isListeningSpeech
                        ? "Parar"
                        : "Falar"}
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
          <View style={styles.multipleChoiceContent}>
            {exerciseType ===
              EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH &&
            imageUri ? (
              <Image
                accessibilityLabel="Imagem da pergunta"
                resizeMode="contain"
                source={{ uri: imageUri }}
                style={styles.presentationImage}
              />
            ) : null}
            {audioUri &&
            exerciseType !==
              EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH ? (
              <Pressable
                accessibilityLabel="Repetir audio"
                style={({ pressed }) => [
                  styles.audioButton,
                  pressed ? styles.audioButtonPressed : null,
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
            <Text style={styles.modalTitle}>Sair da lição?</Text>
            <Text style={styles.modalText}>
              Caso saia você perderá o progresso dessa lição.
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

function ClickableEnglishText({
  exerciseId,
  firstSeenCardExerciseIds,
  firstSeenStyle,
  linkStyle,
  onTranslationSelect,
  style,
  text,
  translations,
}) {
  const parts = splitEnglishText(text);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const translationEntry = translations.get(
          normalizeTranslationKey(part)
        );

        if (!translationEntry?.translation) {
          return part;
        }

        return (
          <Text
            accessibilityHint={`Exibe a traducao de ${part}`}
            accessibilityRole="link"
            key={`${part}-${index}`}
            style={[
              linkStyle,
              firstSeenCardExerciseIds.get(translationEntry.cardId) ===
              exerciseId
                ? firstSeenStyle
                : null,
            ]}
            onPress={() =>
              onTranslationSelect({
                audioUri: translationEntry.audioUri,
                cardId: translationEntry.cardId,
                word: part,
                translation: translationEntry.translation,
              })
            }
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

function splitEnglishText(value) {
  return String(value || "").split(
    /([A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*)/g
  );
}

function normalizeTranslationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
    type === EXERCISE_TYPES.MATCHING_PAIRS ||
    type === EXERCISE_TYPES.IMAGE_PRESENTATION ||
    type === EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH ||
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION ||
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH ||
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
    type === "MATCHING_PAIRS" ||
    type === "MATCHING-PAIRS"
  ) {
    return EXERCISE_TYPES.MATCHING_PAIRS;
  }

  if (
    type === "IMAGE_MULTIPLE_CHOICE_ENGLISH" ||
    type === "IMAGE-MULTIPLE-CHOICE-ENGLISH"
  ) {
    return EXERCISE_TYPES.IMAGE_MULTIPLE_CHOICE_ENGLISH;
  }

  if (
    type === "IMAGE_PRESENTATION" ||
    type === "IMAGE-PRESENTATION"
  ) {
    return EXERCISE_TYPES.IMAGE_PRESENTATION;
  }

  if (
    type === "COMPLETE_AUDIO_TEXT" ||
    type === "COMPLETE-AUDIO-TEXT"
  ) {
    return EXERCISE_TYPES.COMPLETE_AUDIO_TEXT;
  }

  if (
    type === "MULTIPLE_CHOICE_TRANSLATION" ||
    type === "MULTIPLE-CHOICE-TRANSLATION"
  ) {
    return EXERCISE_TYPES.MULTIPLE_CHOICE_TRANSLATION;
  }

  if (
    type === "MULTIPLE_CHOICE_AUDIO_ENGLISH" ||
    type === "MULTIPLE-CHOICE-AUDIO-ENGLISH"
  ) {
    return EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH;
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
    type === EXERCISE_TYPES.MULTIPLE_CHOICE_AUDIO_ENGLISH ||
    type === EXERCISE_TYPES.IMAGE_PRESENTATION ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO ||
    type === EXERCISE_TYPES.COMPLETE_AUDIO_TEXT
  );
}

function isWrittenAnswerExerciseType(type) {
  return (
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO ||
    type === EXERCISE_TYPES.WRITE_TRANSLATION_FROM_TEXT_AUDIO ||
    type === EXERCISE_TYPES.COMPLETE_AUDIO_TEXT
  );
}

function isEnglishExerciseTitle(type) {
  return (
    type !== EXERCISE_TYPES.WRITE_TRANSLATION_FROM_AUDIO &&
    type !== EXERCISE_TYPES.SPEAK_WRITTEN_TEXT
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

  if (type === EXERCISE_TYPES.MATCHING_PAIRS) {
    return "Encontre os pares";
  }

  if (type === EXERCISE_TYPES.COMPLETE_AUDIO_TEXT) {
    return "Complete o que ouvir";
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

function getCardAudioUri(card) {
  return replaceLocalhostOrigin(card?.audio_url || card?.audio || "");
}

function getCardImageUri(card) {
  return replaceLocalhostOrigin(card?.image_url || card?.image || "");
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
        audioUri: replaceLocalhostOrigin(
          option.audio_url || option.audio || ""
        ),
      };
    })
    .filter((option) => option.id && option.text);
}

function getMatchingPairCards(exercise) {
  const pairCards = Array.isArray(exercise?.pair_card_details)
    ? exercise.pair_card_details
    : [];

  return pairCards.filter(
    (card) =>
      card?.id &&
      card?.english_name &&
      card?.international_name &&
      card?.is_active !== false
  );
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

  if (type === EXERCISE_TYPES.COMPLETE_AUDIO_TEXT) {
    return [...new Set(acceptedAnswers.filter(Boolean).map(String))];
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

function getOptionAudioUri(option) {
  return replaceLocalhostOrigin(
    option?.audioUri || option?.audio_url || option?.audio || ""
  );
}

function getClozeTextParts(exercise) {
  const [before = "", after = ""] = getPromptText(exercise).split("__");

  return { after, before };
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

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
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
    progressContainer: {
      width: "100%",
      marginBottom: 14,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    progressLabel: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
    },
    progressValue: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "900",
    },
    progressTrack: {
      height: 18,
      overflow: "hidden",
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.success,
      overflow: "hidden",
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 3,
    },
    progressGlow: {
      position: "absolute",
      top: 1,
      right: 2,
      bottom: 1,
      width: 12,
      borderRadius: 999,
      backgroundColor: "rgba(255, 255, 255, 0.32)",
    },
    progressGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
    },
    retryMessage: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: `${colors.error}14`,
      borderWidth: 1,
      borderColor: `${colors.error}55`,
    },
    retryMessageContent: {
      flex: 1,
    },
    retryMessageTitle: {
      color: colors.error,
      fontSize: 14,
      fontWeight: "900",
    },
    retryMessageText: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 17,
    },
    exerciseInstruction: {
      color: colors.textMutedDark,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 4,
      marginBottom: -10,
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
    translatableWord: {
      textDecorationLine: "underline",
    },
    firstSeenWord: {
      color: colors.newWord,
    },
    titleTranslationText: {
      color: colors.textSecondary,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 28,
      textAlign: "center",
      marginBottom: 20,
    },
    wordTranslationCard: {
      position: "absolute",
      top: 150,
      left: 20,
      right: 20,
      zIndex: 30,
      elevation: 30,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    wordTranslationLabel: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      textTransform: "uppercase",
    },
    wordTranslationText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 24,
      marginTop: 3,
      textAlign: "center",
    },
    exerciseBody: {
      flex: 1,
    },
    imagePresentationContent: {
      gap: 14,
      marginBottom: 18,
    },
    presentationImage: {
      width: "100%",
      height: 230,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    matchingContent: {
      gap: 14,
      marginBottom: 18,
    },
    matchingHint: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
      textAlign: "center",
    },
    matchingColumns: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    matchingColumn: {
      flex: 1,
      gap: 10,
    },
    matchingColumnTitle: {
      color: colors.textMutedDark,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },
    matchingItem: {
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    matchingItemSelected: {
      borderColor: colors.link,
      backgroundColor: colors.surfaceMuted,
    },
    matchingItemCorrect: {
      borderColor: colors.success,
      backgroundColor: colors.success,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 10,
      elevation: 6,
    },
    matchingItemWrong: {
      borderColor: colors.error,
    },
    matchingItemText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "center",
    },
    matchingItemTextCorrect: {
      color: colors.surfaceMuted,
    },
    justAudioContent: {
      gap: 16,
      marginBottom: 18,
    },
    writtenAnswerContent: {
      gap: 14,
      marginBottom: 18,
    },
    clozeSentence: {
      minHeight: 78,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    clozeText: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 34,
    },
    clozeInput: {
      height: 46,
      marginHorizontal: 1,
      paddingHorizontal: 2,
      borderWidth: 0,
      backgroundColor: "transparent",
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
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
    summaryCard: {
      width: "100%",
      gap: 10,
      marginTop: 22,
      marginBottom: 18,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    summaryLabel: {
      color: colors.textMutedDark,
      fontSize: 14,
      fontWeight: "700",
    },
    summaryValue: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "right",
    },
    summaryValueSuccess: {
      color: colors.success,
    },
    summaryValueError: {
      color: colors.error,
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
    multipleChoiceContent: {
      gap: 14,
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
