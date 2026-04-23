import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import ScreenContainer from "../components/ScreenContainer";
import { colors, shadows } from "../theme";

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Recuperação</Text>
        <Text style={styles.title}>Redefinir senha</Text>
        <Text style={styles.subtitle}>
          Informe seu e-mail para receber as instruções de redefinição.
        </Text>
      </View>

      <View style={styles.card}>
        <AppTextField
          label="E-mail"
          placeholder="seuemail@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <AppButton label="Enviar link de reset" />

        <Pressable style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>Voltar para o login</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.badgeBackground,
    color: colors.badgeText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMutedDark,
    maxWidth: 300,
  },
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 28,
    padding: 24,
    ...shadows.soft,
  },
  linkButton: {
    alignSelf: "center",
    marginTop: 18,
  },
  linkText: {
    color: colors.link,
    fontSize: 14,
    fontWeight: "700",
  },
});
