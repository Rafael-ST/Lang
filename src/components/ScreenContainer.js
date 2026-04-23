import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

import { colors } from "../theme";

export default function ScreenContainer({ children, keyboard = false, contentStyle }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.container, contentStyle]}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.container, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
