import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme";

export default function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === "primary" && styles.primaryButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.primaryText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors, shadows) {
  return StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    ...shadows.soft,
  },
  disabledButton: {
    opacity: 0.65,
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
  },
  primaryText: {
    color: colors.surfaceMuted,
  },
  });
}
