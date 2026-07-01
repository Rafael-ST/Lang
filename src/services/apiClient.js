import { API_BASE_URL } from "../config/api";
import {
  clearStoredUser,
  loadStoredUser,
  storeUser,
} from "../features/auth/services/authStorage";

const TOKEN_REFRESH_PATH = "/auth/token/refresh/";
const TOKEN_REFRESH_WINDOW_MS = 30 * 1000;

let refreshTokenPromise = null;
let authUserChangeHandler = null;
let sessionExpiredHandler = null;

export function setApiAuthHandlers({ onSessionExpired, onUserChange } = {}) {
  sessionExpiredHandler =
    typeof onSessionExpired === "function" ? onSessionExpired : null;
  authUserChangeHandler =
    typeof onUserChange === "function" ? onUserChange : null;
}

export function hasRefreshToken(tokenData) {
  return Boolean(getRefreshToken(tokenData));
}

export async function apiRequest(path, options = {}) {
  if (shouldAttemptTokenRefresh(options)) {
    await refreshExpiredAccessToken(path);
  }

  let response = await fetchWithAuth(path, options);

  if (response.status === 401 && shouldAttemptTokenRefresh(options)) {
    logAuthDebug(`401 em ${path}. Tentando renovar o token.`);
    const refreshedUser = await refreshStoredToken("response-401");

    if (refreshedUser) {
      logAuthDebug(`Token renovado. Repetindo ${path}.`);
      response = await fetchWithAuth(path, options);
    } else {
      logAuthDebug(`Nao foi possivel renovar o token para ${path}.`);
    }
  }

  const data = await response.json().catch(() => null);

  if (path === "/auth/token/" || path === TOKEN_REFRESH_PATH) {
    logAuthCookieDebug(path, response);
  }

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
    credentials: fetchOptions.credentials || "include",
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

async function refreshStoredToken(reason = "unknown") {
  if (!refreshTokenPromise) {
    refreshTokenPromise = refreshStoredTokenOnce(reason).finally(() => {
      refreshTokenPromise = null;
    });
  } else {
    logAuthDebug(`Aguardando refresh ja em andamento. Motivo: ${reason}.`);
  }

  return refreshTokenPromise;
}

async function refreshStoredTokenOnce(reason) {
  const storedUser = await loadStoredUser().catch(() => null);
  const refreshToken = getRefreshToken(storedUser?.token);

  if (!storedUser) {
    logAuthDebug(`Refresh ignorado: nao ha usuario salvo. Motivo: ${reason}.`);
    return null;
  }

  if (!refreshToken) {
    logAuthDebug(
      `Refresh token nao esta no JSON local. Tentando renovar via cookie HttpOnly. Motivo: ${reason}.`
    );
  }

  logAuthDebug(`Chamando ${TOKEN_REFRESH_PATH}. Motivo: ${reason}.`);

  const refreshOptions = {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (refreshToken) {
    refreshOptions.body = JSON.stringify({
      refresh: refreshToken,
    });
  }

  const response = await fetch(`${API_BASE_URL}${TOKEN_REFRESH_PATH}`, refreshOptions);

  const data = await response.json().catch(() => null);
  logAuthCookieDebug(TOKEN_REFRESH_PATH, response);

  if (!response.ok) {
    logAuthDebug(`Refresh retornou HTTP ${response.status}. Limpando sessao.`);
    await clearStoredUser();
    notifySessionExpired();
    return null;
  }

  const refreshedUser = {
    ...storedUser,
    token: mergeTokenData(storedUser.token, data),
  };

  await storeUser(refreshedUser);
  notifyUserChange(refreshedUser);
  logAuthDebug("Refresh concluido com sucesso.");

  return refreshedUser;
}

async function refreshExpiredAccessToken(path) {
  const storedUser = await loadStoredUser().catch(() => null);
  const tokenData = storedUser?.token;

  if (!tokenData || !shouldRefreshAccessToken(tokenData)) {
    return;
  }

  logAuthDebug(`Access token expirado ou perto de expirar antes de ${path}.`);
  await refreshStoredToken("access-expiring");
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

  const nestedAccessToken = getAccessToken(getNestedTokenData(tokenData));

  if (nestedAccessToken) {
    return nestedAccessToken;
  }

  return (
    tokenData.access ||
    tokenData.accessToken ||
    tokenData.access_token ||
    (typeof tokenData.token === "string" ? tokenData.token : "") ||
    tokenData.key ||
    ""
  );
}

export function getRefreshToken(tokenData) {
  if (!tokenData || typeof tokenData === "string") {
    return "";
  }

  const nestedRefreshToken = getRefreshToken(getNestedTokenData(tokenData));

  if (nestedRefreshToken) {
    return nestedRefreshToken;
  }

  return (
    tokenData.refresh ||
    tokenData.refreshToken ||
    tokenData.refresh_token ||
    ""
  );
}

function mergeTokenData(currentTokenData, refreshedTokenData) {
  if (!refreshedTokenData) {
    return currentTokenData;
  }

  if (typeof currentTokenData === "string") {
    return (
      refreshedTokenData.access ||
      refreshedTokenData.access_token ||
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
    access:
      refreshedTokenData.access ||
      refreshedTokenData.access_token ||
      currentTokenData?.access,
    refresh:
      refreshedTokenData.refresh ||
      refreshedTokenData.refresh_token ||
      currentTokenData?.refresh,
  };
}

function getNestedTokenData(tokenData) {
  if (!tokenData || typeof tokenData !== "object") {
    return null;
  }

  return (
    (tokenData.token && typeof tokenData.token === "object"
      ? tokenData.token
      : null) ||
    tokenData.tokens ||
    tokenData.token_data ||
    tokenData.tokenData ||
    tokenData.auth ||
    tokenData.data ||
    null
  );
}

function shouldRefreshAccessToken(tokenData) {
  const accessToken = getAccessToken(tokenData);

  if (!accessToken) {
    return Boolean(getRefreshToken(tokenData));
  }

  const expiresAt = getJwtExpirationDate(accessToken);

  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
}

function getJwtExpirationDate(token) {
  const payload = decodeJwtPayload(token);
  const expiresAtSeconds = Number(payload?.exp);

  if (!expiresAtSeconds) {
    return null;
  }

  return new Date(expiresAtSeconds * 1000);
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(paddedBase64);
  }

  return decodeBase64(paddedBase64);
}

function decodeBase64(value) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const character of value.replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);

    if (index === -1) {
      throw new Error("Invalid base64 input.");
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function notifyUserChange(user) {
  authUserChangeHandler?.(user);
}

function notifySessionExpired() {
  sessionExpiredHandler?.();
}

function logAuthDebug(message) {
  console.info(`[auth] ${message}`);
}

function logAuthCookieDebug(path, response) {
  let setCookieHeader = "";

  try {
    setCookieHeader =
      response.headers?.get?.("set-cookie") ||
      response.headers?.get?.("Set-Cookie") ||
      "";
  } catch {
    setCookieHeader = "";
  }

  console.info(
    `[auth] ${path} - Set-Cookie:`,
    setCookieHeader || "(nao legivel pelo fetch; cookie HttpOnly fica fora do JS)"
  );
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
