import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import ScreenContainer from "../components/ScreenContainer";
import {
  deleteCurrentUser,
  fetchCurrentUser,
  updateCurrentUser,
} from "../features/users/services/usersApi";
import { useAuth } from "../features/auth/context/AuthContext";
import { fetchProfileByUsername } from "../features/profiles/services/profilesApi";
import { useTheme } from "../theme";

export default function ProfileScreen({ onUserChange }) {
  const { signOut } = useAuth();
  const { colors, shadows } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [averageExerciseSetTimeMs, setAverageExerciseSetTimeMs] = useState(null);
  const [learnedWordsCount, setLearnedWordsCount] = useState(0);
  const [completedExercisesCount, setCompletedExercisesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const styles = createStyles(colors, shadows);
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "Usuário";

  useEffect(() => {
    fetchCurrentUser()
      .then(async (data) => {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || data.username || "");
        const profile = await fetchProfileByUsername(data.username);
        setAverageExerciseSetTimeMs(profile?.average_exercise_set_time_ms ?? null);
        setLearnedWordsCount(profile?.learned_words_count ?? 0);
        setCompletedExercisesCount(profile?.completed_exercises_count ?? 0);
      })
      .catch((error) => {
        setIsError(true);
        setMessage(error.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();
    if (!nextFirstName || !nextLastName) {
      setIsError(true);
      setMessage("Preencha o nome e o sobrenome.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      const updated = await updateCurrentUser({
        firstName: nextFirstName,
        lastName: nextLastName,
      });
      await onUserChange?.(updated);
      setIsError(false);
      setMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      "Encerrar conta?",
      "Esta ação é permanente. Seu perfil, progresso, respostas e demais dados da conta serão apagados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar conta",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    try {
      setIsDeleting(true);
      setMessage("");
      await deleteCurrentUser();
      await signOut();
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
      setIsDeleting(false);
    }
  }

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Minha conta</Text>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Seus dados pessoais</Text>
      </View>
      <View style={styles.profileCard}>
        <View
          accessibilityLabel="Foto de perfil ainda não cadastrada"
          style={styles.avatar}
        >
          <Ionicons name="person" size={48} color={colors.link} />
        </View>
        <Text numberOfLines={1} style={styles.profileName}>
          {isLoading ? "Carregando..." : displayName}
        </Text>
        <View style={styles.profileDetail}>
          <Ionicons name="mail-outline" size={18} color={colors.textMutedDark} />
          <Text numberOfLines={1} style={styles.profileDetailText}>
            {email || "E-mail não informado"}
          </Text>
        </View>
        <View style={styles.profileDivider} />
        <View style={styles.profileStat}>
          <View style={styles.profileStatIcon}>
            <Ionicons name="time-outline" size={22} color={colors.link} />
          </View>
          <View style={styles.profileStatContent}>
            <Text style={styles.statLabel}>Tempo médio de resposta</Text>
            <Text style={styles.statValue}>
              {isLoading
                ? "Carregando..."
                : averageExerciseSetTimeMs == null
                  ? "Sem exercícios concluídos"
                  : formatDuration(averageExerciseSetTimeMs)}
            </Text>
          </View>
        </View>
        <View style={styles.profileStatDivider} />
        <View style={styles.profileStat}>
          <View style={styles.profileStatIcon}>
            <Ionicons name="book-outline" size={22} color={colors.link} />
          </View>
          <View style={styles.profileStatContent}>
            <Text style={styles.statLabel}>Palavras aprendidas</Text>
            <Text style={styles.statValue}>
              {isLoading ? "Carregando..." : learnedWordsCount}
            </Text>
          </View>
        </View>
        <View style={styles.profileStatDivider} />
        <View style={styles.profileStat}>
          <View style={styles.profileStatIcon}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={colors.link}
            />
          </View>
          <View style={styles.profileStatContent}>
            <Text style={styles.statLabel}>Exercícios concluídos</Text>
            <Text style={styles.statValue}>
              {isLoading ? "Carregando..." : completedExercisesCount}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.formTitle}>Editar dados</Text>
        <AppTextField label="Nome" placeholder="Seu nome" value={firstName} onChangeText={setFirstName} />
        <AppTextField label="Sobrenome" placeholder="Seu sobrenome" value={lastName} onChangeText={setLastName} />
        <AppButton
          label={isLoading ? "Carregando..." : isSaving ? "Salvando..." : "Salvar alterações"}
          disabled={isLoading || isSaving}
          onPress={handleSave}
        />
        {message ? <Text style={[styles.message, isError ? styles.error : styles.success]}>{message}</Text> : null}
      </View>
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Encerrar conta</Text>
        <Text style={styles.dangerDescription}>
          Apaga permanentemente seu perfil, progresso e histórico de exercícios.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isDeleting}
          onPress={handleDeleteAccountPress}
          style={({ pressed }) => [
            styles.deleteButton,
            (pressed || isDeleting) && styles.deleteButtonPressed,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            {isDeleting ? "Encerrando conta..." : "Encerrar minha conta"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 110 },
    header: { marginBottom: 28 },
    badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.badgeBackground, color: colors.badgeText, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 },
    title: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textMutedDark },
    profileCard: {
      alignItems: "center",
      padding: 24,
      borderRadius: 28,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    avatar: {
      width: 96,
      height: 96,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderRadius: 48,
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.link,
    },
    profileName: {
      maxWidth: "100%",
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
    },
    profileDetail: {
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    profileDetailText: {
      flexShrink: 1,
      color: colors.textMutedDark,
      fontSize: 15,
      fontWeight: "600",
    },
    profileDivider: {
      width: "100%",
      height: 1,
      marginVertical: 22,
      backgroundColor: colors.border,
    },
    profileStat: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    profileStatIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    profileStatContent: { flex: 1 },
    profileStatDivider: {
      width: "100%",
      height: 1,
      marginVertical: 16,
      backgroundColor: colors.border,
    },
    card: { marginTop: 24, backgroundColor: colors.surfaceMuted, borderRadius: 28, padding: 24, ...shadows.soft },
    formTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: "900", marginBottom: 18 },
    statLabel: { color: colors.textMutedDark, fontSize: 13, fontWeight: "700", marginBottom: 6 },
    statValue: { color: colors.textPrimary, fontSize: 19, fontWeight: "900" },
    message: { marginTop: 14, textAlign: "center", fontSize: 14, fontWeight: "700" },
    error: { color: colors.error },
    success: { color: colors.success },
    dangerCard: {
      marginTop: 24,
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: colors.surfaceMuted,
    },
    dangerTitle: {
      color: colors.error,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },
    dangerDescription: {
      color: colors.textMutedDark,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 18,
    },
    deleteButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: colors.error,
    },
    deleteButtonPressed: { opacity: 0.65 },
    deleteButtonText: {
      color: colors.surfaceMuted,
      fontSize: 15,
      fontWeight: "900",
    },
  });
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes ? `${minutes}min ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}
