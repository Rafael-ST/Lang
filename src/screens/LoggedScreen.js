import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import { fetchCategories } from "../features/categories/services/categoriesApi";
import { useTheme } from "../theme";

export default function LoggedScreen({ loading = false, onCategoryPress }) {
  const { colors, shadows } = useTheme();
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    if (loading) {
      return;
    }

    let isMounted = true;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoriesError("");

      try {
        const data = await fetchCategories();

        if (isMounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setCategoriesError("Nao foi possivel carregar as categorias.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [loading]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      {loading ? (
        <View style={styles.categoriesCard}>
          <Text style={styles.helperText}>Carregando...</Text>
        </View>
      ) : (
        <View style={styles.categoriesCard}>
          <Text style={styles.sectionTitle}>Categorias</Text>

          {isLoadingCategories ? (
            <Text style={styles.helperText}>Carregando categorias...</Text>
          ) : categoriesError ? (
            <Text style={styles.errorText}>{categoriesError}</Text>
          ) : categories.length ? (
            categories.map((category) => (
              <Pressable
                key={category.id}
                style={({ pressed }) => [
                  styles.categoryItem,
                  pressed ? styles.categoryItemPressed : null,
                ]}
                onPress={() => onCategoryPress?.(category)}
              >
                <Text style={styles.categoryName}>{category.nome}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.helperText}>Nenhuma categoria encontrada.</Text>
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
    categoriesCard: {
      width: "100%",
      maxWidth: 340,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 14,
    },
    categoryItem: {
      minHeight: 48,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    categoryItemPressed: {
      backgroundColor: colors.surface,
    },
    categoryName: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
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
