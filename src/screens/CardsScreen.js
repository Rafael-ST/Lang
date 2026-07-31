import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { fetchSeenCards } from "../features/cards/services/cardsApi";
import { fetchCategories } from "../features/categories/services/categoriesApi";
import { useTheme } from "../theme";

export default function CardsScreen({ onCategoryPress }) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchSeenCards(), fetchCategories()])
      .then(([seenCards, availableCategories]) => {
        if (!isMounted) return;
        setCards(Array.isArray(seenCards) ? seenCards : []);
        setCategories(
          Array.isArray(availableCategories) ? availableCategories : []
        );
      })
      .catch(() => {
        if (isMounted) {
          setError("Não foi possível carregar seus cards.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groups = useMemo(() => {
    const categoryNames = new Map(
      categories.map((category) => [String(category.id), category.nome])
    );
    const groupedCards = new Map();

    cards.forEach((card) => {
      const categoryId = String(card.categoria || "uncategorized");
      if (!groupedCards.has(categoryId)) groupedCards.set(categoryId, []);
      groupedCards.get(categoryId).push(card);
    });

    return [...groupedCards.entries()].map(([id, categoryCards]) => ({
      id,
      nome: categoryNames.get(id) || "Outros cards",
      cards: categoryCards,
    }));
  }, [cards, categories]);

  return (
    <ScreenContainer scroll contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cards</Text>
        <Text style={styles.subtitle}>
          Pratique as palavras que você já encontrou.
        </Text>
      </View>

      {isLoading ? (
        <Text style={styles.helperText}>Carregando cards...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : groups.length ? (
        groups.map((group) => (
          <Pressable
            accessibilityRole="button"
            key={group.id}
            style={({ pressed }) => [
              styles.categoryCard,
              pressed ? styles.categoryCardPressed : null,
            ]}
            onPress={() => onCategoryPress?.(group)}
          >
            <View style={styles.categoryIcon}>
              <Ionicons name="albums-outline" size={24} color={colors.link} />
            </View>
            <View style={styles.categoryContent}>
              <Text style={styles.categoryName}>{group.nome}</Text>
              <Text style={styles.cardCount}>
                {group.cards.length} {group.cards.length === 1 ? "card" : "cards"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="albums-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum card visto ainda</Text>
          <Text style={styles.helperText}>
            Os cards aparecerão aqui conforme você avançar nos exercícios.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 92,
      paddingBottom: 116,
    },
    header: { marginBottom: 24 },
    title: { color: colors.textPrimary, fontSize: 32, fontWeight: "900" },
    subtitle: {
      color: colors.textMutedDark,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 6,
    },
    categoryCard: {
      minHeight: 76,
      padding: 16,
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      ...shadows.soft,
    },
    categoryCardPressed: { opacity: 0.78 },
    categoryIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    categoryContent: { flex: 1 },
    categoryName: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
    cardCount: { color: colors.textMutedDark, fontSize: 13, marginTop: 3 },
    emptyCard: {
      alignItems: "center",
      padding: 28,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      marginTop: 12,
      marginBottom: 6,
    },
    helperText: { color: colors.textMutedDark, fontSize: 14, lineHeight: 20, textAlign: "center" },
    errorText: { color: colors.error, fontSize: 14, textAlign: "center" },
  });
}
