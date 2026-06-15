import { createContext, useContext, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";

import {
  googleAuthConfig,
  isGoogleAuthConfigured,
} from "../constants/googleAuthConfig";
import { fetchGoogleUser } from "../services/googleAuthService";
import {
  clearStoredUser,
  loadStoredUser,
  storeUser,
} from "../services/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const isConfigured = isGoogleAuthConfigured();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleAuthConfig.webClientId,
    androidClientId: googleAuthConfig.androidClientId,
    iosClientId: googleAuthConfig.iosClientId,
    webClientId: googleAuthConfig.webClientId,
    scopes: ["profile", "email"],
    selectAccount: true,
  });

  useEffect(() => {
    async function restoreUser() {
      try {
        const storedUser = await loadStoredUser();
        setUser(storedUser);
      } catch {
        setAuthError("Não foi possível restaurar a sessão local.");
      } finally {
        setIsLoading(false);
      }
    }

    restoreUser();
  }, []);

  useEffect(() => {
    async function handleAuthResponse() {
      if (!response) {
        return;
      }

      if (response.type === "dismiss" || response.type === "cancel") {
        setIsSigningIn(false);
        return;
      }

      if (response.type !== "success") {
        setAuthError("Falha ao autenticar com o Google.");
        setIsSigningIn(false);
        return;
      }

      try {
        const accessToken = response.authentication?.accessToken;

        if (!accessToken) {
          throw new Error("Token de acesso nao retornado pelo Google.");
        }

        const profile = await fetchGoogleUser(accessToken);

        setUser(profile);
        await storeUser(profile);
        setAuthError("");
      } catch (error) {
        setAuthError(error.message);
      } finally {
        setIsSigningIn(false);
      }
    }

    handleAuthResponse();
  }, [response]);

  async function signInWithGoogle() {
    if (!isConfigured) {
      setAuthError("Configure os client IDs do Google no app.json.");
      return;
    }

    if (!request) {
      setAuthError("O login Google ainda esta carregando.");
      return;
    }

    setAuthError("");
    setIsSigningIn(true);

    try {
      await promptAsync();
    } catch {
      setAuthError("Não foi possível abrir o login Google.");
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    setUser(null);
    await clearStoredUser();
  }

  const value = {
    authError,
    isConfigured,
    isLoading,
    isSigningIn,
    signInWithGoogle,
    signOut,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
