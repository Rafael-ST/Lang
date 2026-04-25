import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "../theme";

export default function AppTextField({
  label,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "sentences",
  value,
  onChangeText,
}) {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecureField = Boolean(secureTextEntry);
  const styles = createStyles(colors);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecureField && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, isSecureField && styles.inputWithAction]}
        />

        {isSecureField ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => setIsPasswordVisible((current) => !current)}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.link}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputWithAction: {
    paddingRight: 56,
  },
  actionButton: {
    position: "absolute",
    right: 16,
    width: 24,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  });
}
