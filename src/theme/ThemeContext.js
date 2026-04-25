import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { darkColors, lightColors } from "./colors";

const THEME_STORAGE_KEY = "@lang/theme";
const ThemeContext = createContext(null);

function createShadows(colors) {
  return {
    soft: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  };
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    async function restoreTheme() {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (storedTheme === "dark" || storedTheme === "light") {
        setTheme(storedTheme);
      }
    }

    restoreTheme();
  }, []);

  async function setDarkMode(isDark) {
    const nextTheme = isDark ? "dark" : "light";
    setTheme(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const value = useMemo(() => {
    const activeColors = theme === "dark" ? darkColors : lightColors;

    return {
      colors: activeColors,
      isDarkMode: theme === "dark",
      setDarkMode,
      shadows: createShadows(activeColors),
      theme,
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }

  return context;
}
