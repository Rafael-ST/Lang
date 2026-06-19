import { apiRequest } from "../../../services/apiClient";

export function authenticateUser({ username, password }) {
  return apiRequest("/auth/token/", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
    }),
  });
}
