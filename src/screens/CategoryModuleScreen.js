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
import { fetchCardsByCategory } from "../features/cards/services/cardsApi";
import {
  fetchProfileByUsername,
  updateProfilePoints,
} from "../features/profiles/services/profilesApi";
import { useTheme } from "../theme";

export default function CategoryModuleScreen({
  category,
  onBack,
  onProfileChange,
  soundEnabled = true,
  user,
  vibrationEnabled = true,
}) {
  const { colors, shadows } = useTheme();
  const [cards, setCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [wrongOptionId, setWrongOptionId] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSpendingPoint, setIsSpendingPoint] = useState(false);
  const [cardsError, setCardsError] = useState("");
  const [profile, setProfile] = useState(null);
  const [pointsError, setPointsError] = useState("");
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [isNoPointsModalVisible, setIsNoPointsModalVisible] = useState(false);
  const nextCardTimeout = useRef(null);
  const correctSoundPlayer = useAudioPlayer(
    require("../../assets/correct-answer.ogg"),
    { keepAudioSessionActive: true }
  );
  const styles = createStyles(colors, shadows);
  const playableCards = useMemo(
    () =>
      cards.filter(
        (card) => card.english_name && card.international_name
      ),
    [cards]
  );
  const selectedCard = playableCards[selectedCardIndex];
  const moduleName = selectedCard?.english_name || category?.nome || "Módulo";
  const username = user?.username || user?.email;
  const optionCards = useMemo(() => {
    if (!selectedCard?.international_name) {
      return [];
    }

    const wrongCards = shuffleItems(
      playableCards.filter(
        (card) => card.id !== selectedCard.id && card.international_name
      )
    );

    return shuffleItems([selectedCard, ...wrongCards.slice(0, 3)]);
  }, [playableCards, selectedCard]);

  useEffect(() => {
    if (!category?.id) {
      setCards([]);
      return;
    }

    let isMounted = true;

    async function loadCards() {
      setIsLoadingCards(true);
      setCardsError("");

      try {
        const data = await fetchCardsByCategory(category.id);

        if (isMounted) {
          const nextCards = Array.isArray(data) ? shuffleItems(data) : [];

          setCards(nextCards);
          setSelectedCardIndex(0);
          setWrongOptionId(null);
          setCorrectOptionId(null);
        }
      } catch {
        if (isMounted) {
          setCards([]);
          setCardsError("Não foi possível carregar os cards.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCards(false);
        }
      }
    }

    loadCards();

    return () => {
      isMounted = false;
      clearTimeout(nextCardTimeout.current);
    };
  }, [category?.id]);

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
          setPointsError(nextProfile ? "" : "Perfil não encontrado.");
          setIsNoPointsModalVisible(
            Boolean(nextProfile && nextProfile.pontos <= 0)
          );
        }
      } catch {
        if (isMounted) {
          setPointsError("Não foi possível carregar seus pontos.");
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
      setPointsError("Perfil não encontrado.");
      return;
    }

    if (profile.pontos <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    if (optionCard.id !== selectedCard?.id) {
      if (vibrationEnabled) {
        Vibration.vibrate(500);
      }

      setWrongOptionId(optionCard.id);
      clearTimeout(nextCardTimeout.current);

      const nextPoints = await spendPoint();

      if (nextPoints === null) {
        return;
      }

      if (nextPoints <= 0) {
        setIsNoPointsModalVisible(true);
        return;
      }

      nextCardTimeout.current = setTimeout(() => {
        setWrongOptionId(null);
        goToRandomCard();
      }, 700);
      return;
    }

    setWrongOptionId(null);
    setCorrectOptionId(optionCard.id);
    playCorrectSound();
    clearTimeout(nextCardTimeout.current);

    const nextPoints = await spendPoint();

    if (nextPoints === null) {
      return;
    }

    if (nextPoints <= 0) {
      setIsNoPointsModalVisible(true);
      return;
    }

    nextCardTimeout.current = setTimeout(() => {
      setCorrectOptionId(null);
      goToRandomCard();
    }, 700);
  }

  function playCorrectSound() {
    if (!soundEnabled) {
      return;
    }

    try {
      correctSoundPlayer
        .seekTo(0)
        .then(() => correctSoundPlayer.play())
        .catch(() => correctSoundPlayer.play());
    } catch {
      // Audio feedback is optional; the answer flow should continue if playback fails.
    }
  }

  function goToRandomCard() {
    setSelectedCardIndex((currentIndex) => {
      if (!playableCards.length) {
        return 0;
      }

      let nextIndex = currentIndex;

      while (nextIndex === currentIndex && playableCards.length > 1) {
        nextIndex = Math.floor(Math.random() * playableCards.length);
      }

      return nextIndex;
    });
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
      setPointsError("Não foi possível atualizar seus pontos.");

      return null;
    } finally {
      setIsSpendingPoint(false);
    }
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

        {isLoadingCards || isLoadingProfile ? (
          <Text style={styles.helperText}>Carregando cards...</Text>
        ) : cardsError ? (
          <Text style={styles.errorText}>{cardsError}</Text>
        ) : pointsError ? (
          <Text style={styles.errorText}>{pointsError}</Text>
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
                <Text style={styles.optionText}>{card.international_name}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>Nenhum card encontrado.</Text>
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
    header: {
      width: "100%",
      maxWidth: 340,
      marginBottom: 20,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 30,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 8,
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
      fontSize: 22,
      fontWeight: "800",
      textAlign: "center",
      minHeight: 96,
      textAlignVertical: "center",
      paddingVertical: 24,
      marginBottom: 20,
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
