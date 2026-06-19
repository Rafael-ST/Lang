import { API_BASE_URL } from "../config/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
