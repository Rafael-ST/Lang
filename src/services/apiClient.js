import { API_BASE_URL } from "../config/api";
import {
  clearStoredUser,
  loadStoredUser,
  storeUser,
} from "../features/auth/services/authStorage";

const TOKEN_REFRESH_PATH = "/auth/token/refresh/";

let refreshTokenPromise = null;

export async function apiRequest(path, options = {}) {
  let response = await fetchWithAuth(path, options);

  if (response.status === 401 && shouldAttemptTokenRefresh(options)) {
    const refreshedUser = await refreshStoredToken();

    if (refreshedUser) {
      response = await fetchWithAuth(path, options);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data;
}

async function fetchWithAuth(path, options) {
  const fetchOptions = { ...options };
  delete fetchOptions.skipAuth;
  const authorizationHeader = await getAuthorizationHeader(options);

  return fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeader,
      ...(options.headers || {}),
    },
  });
}

function shouldAttemptTokenRefresh(options) {
  return !options.skipAuth && !options.headers?.Authorization;
}

async function refreshStoredToken() {
  if (!refreshTokenPromise) {
    refreshTokenPromise = refreshStoredTokenOnce().finally(() => {
      refreshTokenPromise = null;
    });
  }

  return refreshTokenPromise;
}

async function refreshStoredTokenOnce() {
  const storedUser = await loadStoredUser().catch(() => null);
  const refreshToken = getRefreshToken(storedUser?.token);

  if (!storedUser || !refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${TOKEN_REFRESH_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    await clearStoredUser();
    return null;
  }

  const refreshedUser = {
    ...storedUser,
    token: mergeTokenData(storedUser.token, data),
  };

  await storeUser(refreshedUser);

  return refreshedUser;
}

async function getAuthorizationHeader(options) {
  if (options.skipAuth || options.headers?.Authorization) {
    return {};
  }

  const storedUser = await loadStoredUser().catch(() => null);
  const accessToken = getAccessToken(storedUser?.token);

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function getAccessToken(tokenData) {
  if (!tokenData) {
    return "";
  }

  if (typeof tokenData === "string") {
    return tokenData;
  }

  return (
    tokenData.access ||
    tokenData.accessToken ||
    tokenData.token ||
    tokenData.key ||
    ""
  );
}

function getRefreshToken(tokenData) {
  if (!tokenData || typeof tokenData === "string") {
    return "";
  }

  return tokenData.refresh || tokenData.refreshToken || "";
}

function mergeTokenData(currentTokenData, refreshedTokenData) {
  if (!refreshedTokenData) {
    return currentTokenData;
  }

  if (typeof currentTokenData === "string") {
    return (
      refreshedTokenData.access ||
      refreshedTokenData.token ||
      currentTokenData
    );
  }

  if (typeof refreshedTokenData === "string") {
    return {
      ...(currentTokenData || {}),
      access: refreshedTokenData,
    };
  }

  return {
    ...(currentTokenData || {}),
    ...refreshedTokenData,
  };
}

function getApiErrorMessage(data) {
  if (!data) {
    return "Erro ao acessar a API.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail || data.message) {
    return data.detail || data.message;
  }

  const fieldMessages = Object.entries(data)
    .map(([field, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : value;

      return `${field}: ${message}`;
    })
    .join("\n");

  return fieldMessages || "Erro ao acessar a API.";
}
