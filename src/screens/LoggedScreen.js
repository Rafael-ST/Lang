import { Image, StyleSheet, Text, View } from "react-native";

import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../features/auth/context/AuthContext";
import { colors, shadows } from "../theme";

export default function LoggedScreen({ loading = false, onLogout }) {
  const { signOut, user } = useAuth();

  function handleLogout() {
    if (user) {
      signOut();
      return;
    }

    onLogout?.();
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <Text style={styles.text}>carregando...</Text>
        ) : (
          <>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : null}
            <Text style={styles.text}>logado</Text>
            <Text style={styles.name}>{user?.name ?? "Sem nome"}</Text>
            <Text style={styles.email}>{user?.email ?? "Sem e-mail"}</Text>
            <View style={styles.buttonWrap}>
              <AppButton label="Sair" onPress={handleLogout} />
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    minWidth: 220,
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 20,
    backgroundColor: colors.border,
  },
  text: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    textTransform: "lowercase",
  },
  name: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  email: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMutedDark,
    textAlign: "center",
  },
  buttonWrap: {
    width: "100%",
    marginTop: 28,
  },
});
