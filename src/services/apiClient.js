import { API_BASE_URL } from "../config/api";
import { loadStoredUser } from "../features/auth/services/authStorage";

export async function apiRequest(path, options = {}) {
  const authorizationHeader = await getAuthorizationHeader(options);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeader,
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data;
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
