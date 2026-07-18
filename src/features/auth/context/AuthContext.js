import { createContext, useContext, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";

import {
  getRefreshToken,
  hasRefreshToken,
  setApiAuthHandlers,
} from "../../../services/apiClient";
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
} from "../constants/googleAuthConfig";
import {
  authenticateUser,
  authenticateWithGoogle,
} from "../services/authApi";
import {
  clearStoredUser,
  loadStoredUser,
  storeUser,
} from "../services/authStorage";
import {
  cancelLoginReminder,
  scheduleLoginReminder,
} from "../services/loginReminder";

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
    setApiAuthHandlers({
      onSessionExpired: () => {
        setUser(null);
        setAuthError("Sua sessão expirou. Entre novamente.");
        clearStoredUser().catch(() => null);
      },
      onUserChange: setUser,
    });

    return () => {
      setApiAuthHandlers();
    };
  }, []);

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
        const idToken =
          response.authentication?.idToken || response.params?.id_token;

        if (!idToken) {
          throw new Error("Token de acesso não retornado pelo Google.");
        }

        const tokenData = await authenticateWithGoogle(idToken);
        const profile = {
          ...(tokenData.usuario || {}),
          token: tokenData,
        };
        const googleRefreshToken = getRefreshToken(tokenData);

        console.info(
          "[auth] Login Google - JSON de retorno:",
          JSON.stringify(profile, null, 2)
        );
        console.info(
          "[auth] Login Google - refresh token:",
          googleRefreshToken || "(nao retornado)"
        );

        if (!hasRefreshToken(tokenData)) {
          throw new Error(
            "Login Google nao retornou token da API. Use login por senha ou implemente a troca do token Google no backend."
          );
        }

        setUser(profile);
        await storeUser(profile);
        await scheduleLoginReminder().catch(() => false);
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
      setAuthError("O login Google ainda está carregando.");
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

  async function signInWithCredentials({ username, password }) {
    setAuthError("");
    setIsSigningIn(true);

    try {
      const tokenData = await authenticateUser({ username, password });
      const refreshToken = getRefreshToken(tokenData);

      console.info(
        "[auth] Login por senha - JSON de retorno:",
        JSON.stringify(tokenData, null, 2)
      );
      console.info(
        "[auth] Login por senha - refresh token:",
        refreshToken || "(cookie HttpOnly; nao legivel pelo app)"
      );

      if (!hasRefreshToken(tokenData)) {
        console.info(
          "[auth] Login por senha nao retornou refresh token no JSON. Usando cookie HttpOnly para renovar a sessao."
        );
      }

      const authenticatedUser = {
        username,
        token: tokenData,
      };

      setUser(authenticatedUser);
      await storeUser(authenticatedUser);
      await scheduleLoginReminder().catch(() => false);
    } catch (error) {
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    setUser(null);
    await clearStoredUser();
    await cancelLoginReminder().catch(() => null);
  }

  async function updateAuthenticatedUser(changes) {
    const nextUser = { ...user, ...changes };
    setUser(nextUser);
    await storeUser(nextUser);
  }

  const value = {
    authError,
    isConfigured,
    isLoading,
    isSigningIn,
    signInWithCredentials,
    signInWithGoogle,
    signOut,
    updateAuthenticatedUser,
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
