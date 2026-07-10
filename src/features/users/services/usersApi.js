import { apiRequest } from "../../../services/apiClient";

export function createUser({ email, firstName, lastName, password }) {
  return apiRequest("/usuarios/", {
    method: "POST",
    body: JSON.stringify({
      username: email,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
    }),
  });
}

export function fetchCurrentUser() {
  return apiRequest("/usuarios/me/");
}

export function updateCurrentUser({ firstName, lastName }) {
  return apiRequest("/usuarios/me/", {
    method: "PATCH",
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
    }),
  });
}
