import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchCardsByCategory } from "../features/cards/services/cardsApi";
import { useTheme } from "../theme";

export default function CategoryModuleScreen({ category, onBack }) {
  const { colors, shadows } = useTheme();
  const [cards, setCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [wrongOptionId, setWrongOptionId] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState("");
  const nextCardTimeout = useRef(null);
  const styles = createStyles(colors, shadows);
  const playableCards = useMemo(
    () =>
      cards.filter(
        (card) => card.english_name && card.international_name
      ),
    [cards]
  );
  const selectedCard = playableCards[selectedCardIndex];
  const moduleName = selectedCard?.english_name || category?.nome || "Modulo";
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
          setCardsError("Nao foi possivel carregar os cards.");
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

  function handleOptionPress(optionCard) {
    if (correctOptionId || wrongOptionId) {
      return;
    }

    if (optionCard.id !== selectedCard?.id) {
      setWrongOptionId(optionCard.id);
      clearTimeout(nextCardTimeout.current);

      nextCardTimeout.current = setTimeout(() => {
        setWrongOptionId(null);
        goToRandomCard();
      }, 700);
      return;
    }

    setWrongOptionId(null);
    setCorrectOptionId(optionCard.id);
    clearTimeout(nextCardTimeout.current);

    nextCardTimeout.current = setTimeout(() => {
      setCorrectOptionId(null);
      goToRandomCard();
    }, 700);
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

  function handleBackPress() {
    Alert.alert(
      "Sair da licao?",
      "Caso saia voce perdera o progresso dessa licao.",
      [
        {
          text: "Permanecer",
          style: "cancel",
        },
        {
          text: "Voltar",
          style: "destructive",
          onPress: onBack,
        },
      ]
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      

      <View style={styles.card}>
        <Text style={styles.moduleName}>{moduleName}</Text>

        {isLoadingCards ? (
          <Text style={styles.helperText}>Carregando cards...</Text>
        ) : cardsError ? (
          <Text style={styles.errorText}>{cardsError}</Text>
        ) : optionCards.length ? (
          <View style={styles.optionsList}>
            {optionCards.map((card) => (
              <Pressable
                key={card.id}
                disabled={Boolean(correctOptionId || wrongOptionId)}
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

        <Pressable style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Voltar para categorias</Text>
        </Pressable>
      </View>
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
  });
}
