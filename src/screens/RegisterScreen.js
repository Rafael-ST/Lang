import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import AppTextField from "../components/AppTextField";
import ScreenContainer from "../components/ScreenContainer";
import { createUser } from "../features/users/services/usersApi";
import { useTheme } from "../theme";

export default function RegisterScreen({ onBack, onRegisterPress }) {
  const { colors, shadows } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const styles = createStyles(colors, shadows);

  async function handleRegisterPress() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedConfirmPassword
    ) {
      setRegisterError("Preencha todos os campos para criar sua conta.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setRegisterError("Digite um e-mail válido.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setRegisterError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setRegisterError("As senhas não conferem.");
      return;
    }

    try {
      setIsRegistering(true);
      setRegisterError("");
      await createUser({
        email: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        password: trimmedPassword,
      });
      onRegisterPress?.();
    } catch (error) {
      setRegisterError(error.message);
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <ScreenContainer keyboard contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Cadastro</Text>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>
          Cadastre seus dados para começar a usar o Lang.
        </Text>
      </View>

      <View style={styles.card}>
        <AppTextField
          label="Nome"
          placeholder="Seu nome"
          value={firstName}
          onChangeText={setFirstName}
        />

        <AppTextField
          label="Sobrenome"
          placeholder="Seu sobrenome"
          value={lastName}
          onChangeText={setLastName}
        />

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
          placeholder="Crie uma senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AppTextField
          label="Confirmar senha"
          placeholder="Repita sua senha"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <AppButton
          label={isRegistering ? "Criando..." : "Criar conta"}
          disabled={isRegistering}
          onPress={handleRegisterPress}
        />

        {registerError ? (
          <Text style={styles.errorText}>{registerError}</Text>
        ) : null}

        <Pressable style={styles.linkButton} onPress={onBack}>
          <Text style={styles.linkText}>Já tenho uma conta</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },
  header: {
    marginBottom: 28,
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
  errorText: {
    marginTop: 12,
    color: colors.error,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  });
}
