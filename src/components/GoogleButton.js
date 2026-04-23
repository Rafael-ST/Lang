import { Image, Pressable, StyleSheet, Text } from "react-native";

import { googleIcon } from "../constants/assets";
import { colors } from "../theme";

export default function GoogleButton({
  disabled = false,
  label = "Entrar com Google",
  onPress,
}) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Image source={googleIcon} style={styles.icon} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  text: {
    color: colors.textButtonSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
});
