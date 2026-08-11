import { apiRequest } from "../../../services/apiClient";

export function authenticateUser({ username, password }) {
  return apiRequest("/auth/token/", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({
      username,
      password,
    }),
  });
}

export function authenticateWithGoogle(idToken) {
  return apiRequest("/auth/google/", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function logoutUser(refresh) {
  return apiRequest("/auth/logout/", {
    method: "POST",
    body: JSON.stringify(refresh ? { refresh } : {}),
  });
}
