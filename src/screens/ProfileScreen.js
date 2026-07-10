import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import ScreenContainer from "../components/ScreenContainer";
import {
  fetchCurrentUser,
  updateCurrentUser,
} from "../features/users/services/usersApi";
import { useTheme } from "../theme";

export default function ProfileScreen({ onUserChange }) {
  const { colors, shadows } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || data.username || "");
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

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Minha conta</Text>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>{email || "Seus dados pessoais"}</Text>
      </View>
      <View style={styles.card}>
        <AppTextField label="Nome" placeholder="Seu nome" value={firstName} onChangeText={setFirstName} />
        <AppTextField label="Sobrenome" placeholder="Seu sobrenome" value={lastName} onChangeText={setLastName} />
        <AppButton
          label={isLoading ? "Carregando..." : isSaving ? "Salvando..." : "Salvar alterações"}
          disabled={isLoading || isSaving}
          onPress={handleSave}
        />
        {message ? <Text style={[styles.message, isError ? styles.error : styles.success]}>{message}</Text> : null}
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
    card: { backgroundColor: colors.surfaceMuted, borderRadius: 28, padding: 24, ...shadows.soft },
    message: { marginTop: 14, textAlign: "center", fontSize: 14, fontWeight: "700" },
    error: { color: colors.error },
    success: { color: colors.success },
  });
}
