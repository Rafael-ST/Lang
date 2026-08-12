import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import ScreenContainer from "../components/ScreenContainer";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../features/auth/services/authApi";
import { useTheme } from "../theme";

export default function ForgotPasswordScreen({ onBack }) {
  const { colors, shadows } = useTheme();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const styles = createStyles(colors, shadows);

  async function handleRequestCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const result = await requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setMessage(result?.detail || "Se o e-mail estiver cadastrado, o código será enviado.");
      setStep("code");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmReset() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Informe o código de seis dígitos.");
      return;
    }
    if (!password) {
      setError("Informe a nova senha.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não são iguais.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const result = await confirmPasswordReset({
        email,
        code: code.trim(),
        newPassword: password,
      });
      setMessage(result?.detail || "Senha redefinida com sucesso.");
      setStep("success");
    } catch (confirmError) {
      setError(confirmError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Recuperação</Text>
        <Text style={styles.title}>Redefinir senha</Text>
        <Text style={styles.subtitle}>
          {step === "email"
            ? "Informe seu e-mail para receber um código de redefinição."
            : step === "code"
              ? "Digite o código recebido e escolha uma nova senha."
              : "Sua senha foi atualizada e você já pode entrar."}
        </Text>
      </View>

      <View style={styles.card}>
        {step === "email" ? (
          <>
            <AppTextField
              label="E-mail"
              placeholder="seuemail@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <AppButton
              label={isSubmitting ? "Enviando..." : "Enviar código"}
              disabled={isSubmitting}
              onPress={handleRequestCode}
            />
          </>
        ) : step === "code" ? (
          <>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
            <AppTextField
              label="Código"
              placeholder="000000"
              keyboardType="number-pad"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            />
            <AppTextField
              label="Nova senha"
              placeholder="Digite a nova senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <AppTextField
              label="Confirmar nova senha"
              placeholder="Digite a senha novamente"
              secureTextEntry
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
            />
            <AppButton
              label={isSubmitting ? "Redefinindo..." : "Redefinir senha"}
              disabled={isSubmitting}
              onPress={handleConfirmReset}
            />
            <Pressable
              disabled={isSubmitting}
              style={styles.secondaryLinkButton}
              onPress={handleRequestCode}
            >
              <Text style={styles.linkText}>Reenviar código</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.successText}>{message}</Text>
            <AppButton label="Voltar para o login" onPress={onBack} />
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step !== "success" ? (
          <Pressable style={styles.linkButton} onPress={onBack}>
            <Text style={styles.linkText}>Voltar para o login</Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
    container: { paddingHorizontal: 24, paddingVertical: 32, justifyContent: "center" },
    header: { marginBottom: 32 },
    badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.badgeBackground, color: colors.badgeText, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 },
    title: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, lineHeight: 24, color: colors.textMutedDark, maxWidth: 320 },
    card: { backgroundColor: colors.surfaceMuted, borderRadius: 28, padding: 24, ...shadows.soft },
    linkButton: { alignSelf: "center", marginTop: 18 },
    secondaryLinkButton: { alignSelf: "center", marginTop: 14 },
    linkText: { color: colors.link, fontSize: 14, fontWeight: "700" },
    messageText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
    successText: { color: colors.success, fontSize: 16, fontWeight: "700", lineHeight: 23, textAlign: "center", marginBottom: 20 },
    errorText: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 14 },
  });
}
