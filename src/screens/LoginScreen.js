import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import GoogleButton from "../components/GoogleButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../features/auth/context/AuthContext";
import { colors, shadows } from "../theme";

export default function LoginScreen({
  onForgotPasswordPress,
  onLoginPress,
}) {
  const { authError, isConfigured, isSigningIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [manualLoginError, setManualLoginError] = useState("");

  function handleLoginPress() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setManualLoginError("Preencha e-mail e senha para entrar.");
      return;
    }

    setManualLoginError("");
    onLoginPress?.();
  }

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Bem-vindo</Text>
        <Text style={styles.title}>Lang</Text>
        <Text style={styles.subtitle}>Entre na sua conta para continuar.</Text>
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

        <AppTextField
          label="Senha"
          placeholder="Digite sua senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AppButton label="Entrar" onPress={handleLoginPress} />

        {manualLoginError ? (
          <Text style={styles.errorText}>{manualLoginError}</Text>
        ) : null}

        <Pressable style={styles.linkButton} onPress={onForgotPasswordPress}>
          <Text style={styles.linkText}>Esqueceu a senha?</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleButton
          disabled={!isConfigured || isSigningIn}
          label={isSigningIn ? "Conectando..." : "Entrar com Google"}
          onPress={signInWithGoogle}
        />

        {!isConfigured ? (
          <Text style={styles.helperText}>
            Preencha os client IDs do Google em `app.json` para ativar o login.
          </Text>
        ) : null}

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
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
    fontSize: 40,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMutedDark,
    maxWidth: 260,
  },
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 28,
    padding: 24,
    ...shadows.soft,
  },
  linkButton: {
    alignSelf: "center",
    marginTop: 16,
  },
  linkText: {
    color: colors.link,
    fontSize: 14,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  helperText: {
    marginTop: 16,
    color: colors.textMutedDark,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    marginTop: 12,
    color: colors.error,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
